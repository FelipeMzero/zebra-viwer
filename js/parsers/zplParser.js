/**
 * Zebra Studio - ZPL II (Zebra Programming Language) Parser
 * Tokenizes and parses ZPL II commands into normalized renderable elements.
 */
(function (global) {
  'use strict';

  const ZPL_BITMAP_FONTS = {
    'A': { h: 9, w: 5 },
    'B': { h: 11, w: 7 },
    'C': { h: 18, w: 10 },
    'D': { h: 18, w: 10 },
    'E': { h: 28, w: 15 },
    'F': { h: 26, w: 13 },
    'G': { h: 60, w: 40 },
    'H': { h: 21, w: 13 },
    '0': { h: 28, w: 24 }
  };

  function mapZplOrientation(orientChar) {
    const c = String(orientChar || 'N').toUpperCase();
    if (c === 'R') return 90;
    if (c === 'I') return 180;
    if (c === 'B') return 270;
    return 0;
  }

  /**
   * Decodes ZPL ^FH hexadecimal escapes (e.g. _C3_A3 -> ã)
   */
  function decodeHexEscapes(text, indicator) {
    const ind = indicator || '_';
    const escapedInd = ind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:${escapedInd}[0-9A-Fa-f]{2})+`, 'g');

    return text.replace(regex, (match) => {
      const hexPairs = match.split(ind).filter(Boolean);
      const bytes = new Uint8Array(hexPairs.map((h) => parseInt(h, 16)));
      try {
        return new TextDecoder('utf-8').decode(bytes);
      } catch (e) {
        return String.fromCharCode(...bytes);
      }
    });
  }

  /**
   * Tokenize ZPL into { cmd, args, line, raw }
   */
  function tokenizeZPL(code) {
    const tokens = [];
    const src = String(code || '');
    let i = 0;
    let line = 1;

    while (i < src.length) {
      const ch = src[i];
      if (ch === '\n') {
        line++;
        i++;
        continue;
      }

      if (ch !== '^' && ch !== '~') {
        i++;
        continue;
      }

      const startLine = line;
      const prefix = ch;
      i++;
      if (i >= src.length) break;

      // Read command code (1 or 2 letters, Special case ^A font+orientation)
      const c1 = src[i] || '';
      const c2 = src[i + 1] || '';
      let cmd = '';

      if (c1.toUpperCase() === 'A' && c2 !== '@') {
        // ^A<font><orientation> or ^A<font>,
        cmd = prefix + 'A';
        i += 1;
      } else {
        cmd = (prefix + c1 + c2).toUpperCase();
        i += 2;
      }

      // Read arguments until next '^' or '~'
      let args = '';
      while (i < src.length && src[i] !== '^' && src[i] !== '~') {
        if (src[i] === '\n') line++;
        args += src[i];
        i++;
      }

      // For comments ^FX, strip after newline if another command isn't immediately there
      tokens.push({
        cmd,
        args: args.replace(/\r?\n/g, ' ').trim(),
        rawArgs: args,
        line: startLine,
        raw: cmd + args.trim()
      });
    }

    return tokens;
  }

  function parseZPL(code) {
    const tokens = tokenizeZPL(code);
    const elements = [];
    const warnings = [];

    let labelWidth = null;
    let labelHeight = null;
    let homeX = 0;
    let homeY = 0;

    // Default Font (^CF)
    let defaultFont = '0';
    let defaultFontH = 28;
    let defaultFontW = 24;

    // Default Barcode (^BY)
    let byModuleWidth = 2;
    let byWideRatio = 3;
    let byHeight = 80;

    let labelReverse = false;

    // Current Field State (between ^FO/^FT and ^FS)
    let field = resetField();

    function resetField() {
      return {
        active: false,
        x: 0,
        y: 0,
        isTypeset: false,
        reverse: false,
        hexEscape: null,
        fontId: null,
        fontH: null,
        fontW: null,
        rotation: 0,
        fb: null,
        pendingBarcode: null,
        line: 1,
        rawParts: []
      };
    }

    for (let t = 0; t < tokens.length; t++) {
      const tk = tokens[t];
      const { cmd, args, line } = tk;
      const p = args.split(',').map((s) => s.trim());

      if (cmd === '^XA' || cmd === '^XZ' || cmd === '^CI' || cmd === '^PO' || cmd === '^PQ' || cmd === '^MD' || cmd === '^PR' || cmd === '^MM' || cmd === '^MN' || cmd === '^MT') {
        continue;
      }

      if (cmd === '^FX') {
        continue;
      }

      // ^PW - Print Width
      if (cmd === '^PW') {
        const w = parseInt(p[0], 10);
        if (w > 0) labelWidth = w;
        continue;
      }

      // ^LL - Label Length
      if (cmd === '^LL') {
        const h = parseInt(p[0], 10);
        if (h > 0) labelHeight = h;
        continue;
      }

      // ^LH - Label Home
      if (cmd === '^LH') {
        homeX = parseInt(p[0], 10) || 0;
        homeY = parseInt(p[1], 10) || 0;
        continue;
      }

      // ^LR - Label Reverse
      if (cmd === '^LR') {
        labelReverse = String(p[0] || 'N').toUpperCase() === 'Y';
        continue;
      }

      // ^CF - Change Alphanumeric Default Font
      if (cmd === '^CF') {
        defaultFont = p[0] || '0';
        const base = ZPL_BITMAP_FONTS[defaultFont.toUpperCase()] || ZPL_BITMAP_FONTS['0'];
        defaultFontH = parseInt(p[1], 10) || base.h;
        defaultFontW = parseInt(p[2], 10) || parseInt(p[1], 10) || base.w;
        continue;
      }

      // ^BY - Barcode Field Default
      if (cmd === '^BY') {
        if (p[0]) byModuleWidth = Math.max(1, parseInt(p[0], 10) || 2);
        if (p[1]) byWideRatio = Math.max(2, parseFloat(p[1]) || 3);
        if (p[2]) byHeight = Math.max(10, parseInt(p[2], 10) || 80);
        continue;
      }

      // ^FO / ^FT - Field Origin / Field Typeset
      if (cmd === '^FO' || cmd === '^FT') {
        field = resetField();
        field.active = true;
        field.x = homeX + (parseInt(p[0], 10) || 0);
        field.y = homeY + (parseInt(p[1], 10) || 0);
        field.isTypeset = cmd === '^FT';
        field.line = line;
        field.rawParts.push(tk.raw);
        continue;
      }

      // ^FR - Field Reverse Print
      if (cmd === '^FR') {
        field.reverse = true;
        field.rawParts.push(tk.raw);
        continue;
      }

      // ^FH - Field Hexadecimal Indicator
      if (cmd === '^FH') {
        field.hexEscape = p[0] || '_';
        field.rawParts.push(tk.raw);
        continue;
      }

      // ^A - Scalable / Bitmapped Font (^A0N,30,30 or ^AN,30,30 or ^A0,30,30)
      if (cmd === '^A' || cmd === '^A@') {
        field.rawParts.push(tk.raw);
        const firstToken = p[0] || '0N';
        let fId = defaultFont;
        let orient = 'N';

        if (cmd === '^A@') {
          orient = firstToken[0] || 'N';
        } else if (firstToken.length >= 2) {
          fId = firstToken[0];
          orient = firstToken[1];
        } else if (firstToken.length === 1) {
          if (/[NRIB]/i.test(firstToken)) {
            orient = firstToken;
          } else {
            fId = firstToken;
          }
        }

        const base = ZPL_BITMAP_FONTS[fId.toUpperCase()] || ZPL_BITMAP_FONTS['0'];
        field.fontId = fId;
        field.rotation = mapZplOrientation(orient);
        field.fontH = parseInt(p[1], 10) || base.h;
        field.fontW = parseInt(p[2], 10) || field.fontH;
        continue;
      }

      // ^FB - Field Block (multi-line text formatting)
      if (cmd === '^FB') {
        field.rawParts.push(tk.raw);
        field.fb = {
          width: parseInt(p[0], 10) || 200,
          maxLines: parseInt(p[1], 10) || 1,
          lineSpacing: parseInt(p[2], 10) || 0,
          align: String(p[3] || 'L').toUpperCase(),
          hangingIndent: parseInt(p[4], 10) || 0
        };
        continue;
      }

      // ^GB - Graphic Box
      if (cmd === '^GB') {
        field.rawParts.push(tk.raw);
        const w = Math.max(1, parseInt(p[0], 10) || 1);
        const h = Math.max(1, parseInt(p[1], 10) || 1);
        const thick = Math.max(1, parseInt(p[2], 10) || 1);
        const color = String(p[3] || 'B').toUpperCase() === 'W' ? 'W' : 'B';
        const rounding = Math.min(8, Math.max(0, parseInt(p[4], 10) || 0));

        const isFilled = thick >= Math.min(w, h) / 2;
        elements.push({
          type: isFilled ? 'rect' : 'box',
          x: field.x,
          y: field.y,
          width: w,
          height: h,
          thickness: thick,
          filled: isFilled,
          color,
          rounding,
          reverse: field.reverse || labelReverse,
          line: field.line || line,
          rawCmd: field.rawParts.join(''),
          cmdName: isFilled ? '^GB (Bloco Preenchido)' : '^GB (Caixa Gráfica)'
        });
        continue;
      }

      // ^GC - Graphic Circle
      if (cmd === '^GC') {
        field.rawParts.push(tk.raw);
        const diameter = Math.max(2, parseInt(p[0], 10) || 40);
        const thick = Math.max(1, parseInt(p[1], 10) || 2);
        const color = String(p[2] || 'B').toUpperCase() === 'W' ? 'W' : 'B';

        elements.push({
          type: 'circle',
          x: field.x,
          y: field.y,
          width: diameter,
          height: diameter,
          diameter,
          thickness: thick,
          color,
          reverse: field.reverse || labelReverse,
          line: field.line || line,
          rawCmd: field.rawParts.join(''),
          cmdName: '^GC (Círculo Gráfico)'
        });
        continue;
      }

      // ^GE - Graphic Ellipse
      if (cmd === '^GE') {
        field.rawParts.push(tk.raw);
        const w = Math.max(2, parseInt(p[0], 10) || 60);
        const h = Math.max(2, parseInt(p[1], 10) || 40);
        const thick = Math.max(1, parseInt(p[2], 10) || 2);
        const color = String(p[3] || 'B').toUpperCase() === 'W' ? 'W' : 'B';

        elements.push({
          type: 'ellipse',
          x: field.x,
          y: field.y,
          width: w,
          height: h,
          thickness: thick,
          color,
          reverse: field.reverse || labelReverse,
          line: field.line || line,
          rawCmd: field.rawParts.join(''),
          cmdName: '^GE (Elipse Gráfica)'
        });
        continue;
      }

      // ^GD - Graphic Diagonal Line
      if (cmd === '^GD') {
        field.rawParts.push(tk.raw);
        const w = Math.max(2, parseInt(p[0], 10) || 40);
        const h = Math.max(2, parseInt(p[1], 10) || 40);
        const thick = Math.max(1, parseInt(p[2], 10) || 2);
        const orient = String(p[4] || 'R').toUpperCase();
        const isRightLeaning = orient === 'R' || orient === '/';

        elements.push({
          type: 'line',
          x: field.x,
          y: isRightLeaning ? field.y + h : field.y,
          x2: field.x + w,
          y2: isRightLeaning ? field.y : field.y + h,
          width: w,
          height: h,
          thickness: thick,
          line: field.line || line,
          rawCmd: field.rawParts.join(''),
          cmdName: '^GD (Linha Diagonal)'
        });
        continue;
      }

      // ^GF - Graphic Field (Hex Bitmap)
      if (cmd === '^GF') {
        field.rawParts.push(tk.raw);
        const compression = String(p[0] || 'A').toUpperCase();
        const bytesPerRow = parseInt(p[3], 10) || 0;
        const hexData = p.slice(4).join(',').replace(/\s+/g, '');
        if (compression === 'A' && bytesPerRow > 0 && hexData) {
          const totalBytes = Math.floor(hexData.length / 2);
          const rows = Math.floor(totalBytes / bytesPerRow);
          elements.push({
            type: 'gf',
            x: field.x,
            y: field.y,
            width: bytesPerRow * 8,
            height: rows,
            bytesPerRow,
            rows,
            hexData,
            line: field.line || line,
            rawCmd: '^GFA,...',
            cmdName: '^GF (Imagem Gráfica Hex)'
          });
        }
        continue;
      }

      // 1D Barcodes: ^BC (Code 128), ^B3 (Code 39), ^BE (EAN-13), ^B8 (EAN-8), ^B2 (ITF), ^BU (UPC-A)
      if (cmd === '^BC' || cmd === '^B3' || cmd === '^BE' || cmd === '^B8' || cmd === '^B2' || cmd === '^BU') {
        field.rawParts.push(tk.raw);
        const orient = mapZplOrientation(p[0]);
        let h = byHeight;
        let showInterp = true;
        let interpAbove = false;

        if (cmd === '^B3') {
          // ^B3o,e,h,f,g
          h = parseInt(p[2], 10) || byHeight;
          showInterp = String(p[3] || 'Y').toUpperCase() !== 'N';
          interpAbove = String(p[4] || 'N').toUpperCase() === 'Y';
        } else {
          // ^BCo,h,f,g,e,m / ^BEo,h,f,g / ^B2o,h,f,g,e
          h = parseInt(p[1], 10) || byHeight;
          showInterp = String(p[2] || 'Y').toUpperCase() !== 'N';
          interpAbove = String(p[3] || 'N').toUpperCase() === 'Y';
        }

        field.pendingBarcode = {
          kind: '1D',
          barcodeType: cmd.slice(1), // BC, B3, BE, etc.
          rotation: orient,
          height: h,
          showText: showInterp,
          textAbove: interpAbove,
          moduleWidth: byModuleWidth,
          wideRatio: byWideRatio,
          cmd
        };
        continue;
      }

      // 2D Barcodes: ^BQ (QR Code), ^BX (DataMatrix)
      if (cmd === '^BQ' || cmd === '^BX') {
        field.rawParts.push(tk.raw);
        const mag = parseInt(p[2], 10) || parseInt(p[1], 10) || 5;
        field.pendingBarcode = {
          kind: '2D',
          barcodeType: cmd.slice(1),
          magnification: Math.max(2, Math.min(12, mag)),
          cmd
        };
        continue;
      }

      // ^FD / ^FV / ^SN - Field Data
      if (cmd === '^FD' || cmd === '^FV' || cmd === '^SN') {
        field.rawParts.push(tk.raw);
        let dataStr = tk.rawArgs.replace(/\r?\n/g, '');
        if (field.hexEscape) {
          dataStr = decodeHexEscapes(dataStr, field.hexEscape);
        }

        if (field.pendingBarcode) {
          const pb = field.pendingBarcode;
          if (pb.kind === '2D') {
            elements.push({
              type: 'qrcode',
              x: field.x,
              y: field.y,
              magnification: pb.magnification,
              data: dataStr.trim(),
              line: field.line || line,
              rawCmd: field.rawParts.join(''),
              cmdName: `${pb.cmd} (QR Code 2D)`
            });
          } else {
            elements.push({
              type: 'barcode',
              x: field.x,
              y: field.y,
              barcodeType: pb.barcodeType,
              moduleWidth: pb.moduleWidth,
              wideRatio: pb.wideRatio,
              height: pb.height,
              showText: pb.showText,
              textAbove: pb.textAbove,
              rotation: pb.rotation,
              data: dataStr.trim(),
              line: field.line || line,
              rawCmd: field.rawParts.join(''),
              cmdName: `${pb.cmd} (Código de Barras)`
            });
          }
        } else {
          const fH = field.fontH || defaultFontH;
          const fW = field.fontW || defaultFontW;
          const fId = field.fontId || defaultFont;
          const drawY = field.isTypeset ? Math.max(0, field.y - fH * 0.82) : field.y;

          elements.push({
            type: 'text',
            x: field.x,
            y: drawY,
            text: dataStr,
            fontId: fId,
            fontHeight: fH,
            fontWidth: fW,
            rotation: field.rotation,
            reverse: field.reverse || labelReverse,
            fb: field.fb,
            eplStyle: false,
            line: field.line || line,
            rawCmd: field.rawParts.join(''),
            cmdName: `^FD (Texto Fonte ${fId})`
          });
        }
        continue;
      }

      // ^FS - Field Separator
      if (cmd === '^FS') {
        field = resetField();
        continue;
      }
    }

    return {
      language: 'zpl',
      width: labelWidth,
      height: labelHeight,
      elements,
      warnings
    };
  }

  global.ZPLParser = {
    parse: parseZPL
  };
})(window);
