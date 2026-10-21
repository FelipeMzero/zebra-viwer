/**
 * Zebra Studio - ESC/POS (COM/POS Impressoras Fiscais & Não Fiscais) Parser
 * Interpreta comandos ESC/POS (Epson, Bematech, Elgin, Daruma, Sweda)
 * em modo mnemônico (ESC @, ESC a, ESC E, GS !, GS V, BARCODE, QRCODE)
 * e sequências de escape hexadecimais (\x1B, \x1D) para renderização em bobina térmica.
 */
(function (global) {
  'use strict';

  /**
   * Normalizes raw \x1B / \x1D escape sequences into readable lines if pasted as a dump
   */
  function normalizeEscPosInput(code) {
    let src = String(code || '');
    // Convert literal \x1B or \x1b and \x1D or \x1d sequences if present
    if (/\\x1[bBdD]/i.test(src)) {
      src = src
        .replace(/\\x1[bB]@|\x1B@/g, '\nESC @\n')
        .replace(/\\x1[bB]a\\x0?([012])|\\x1[bB]a([012])/gi, (_, a, b) => `\nESC a ${a || b}\n`)
        .replace(/\\x1[bB]E\\x0?([01])|\\x1[bB]E([01])/gi, (_, a, b) => `\nESC E ${a || b}\n`)
        .replace(/\\x1[bB]-\\x0?([012])|\\x1[bB]-([012])/gi, (_, a, b) => `\nESC - ${a || b}\n`)
        .replace(/\\x1[bB]M\\x0?([01])|\\x1[bB]M([01])/gi, (_, a, b) => `\nESC M ${a || b}\n`)
        .replace(/\\x1[dD]!\\x([0-9a-fA-F]{2})/g, (_, hex) => `\nGS ! ${parseInt(hex, 16)}\n`)
        .replace(/\\x1[dD]B\\x0?([01])/gi, (_, a) => `\nGS B ${a}\n`)
        .replace(/\\x1[dD]V(?:\\x[0-9a-fA-F]{2}|\d+)?/g, '\nGS V 66\n')
        .replace(/\\n/g, '\n');
    }
    return src;
  }

  function parseESCPOS(code) {
    const normalized = normalizeEscPosInput(code);
    const lines = normalized.split(/\r?\n/);
    const elements = [];
    const warnings = [];

    // Default 80mm thermal roll @ 8 dpmm (203 DPI) = 640 dots width
    let rollWidthMm = 80;
    let labelWidth = 640;
    const marginX = 24;
    let cursorY = 24;

    // Printer state machine
    let state = createDefaultState();

    function createDefaultState() {
      return {
        align: 'left', // 'left' | 'center' | 'right'
        bold: false,
        underline: false,
        reverse: false,
        fontB: false, // Font A (normal) vs Font B (condensed)
        scaleW: 1,
        scaleH: 1,
        barcodeHeight: 68,
        barcodeModuleWidth: 2,
        barcodeHriPos: 2 // 0=none, 1=above, 2=below, 3=both
      };
    }

    function getContentWidth() {
      return labelWidth - marginX * 2;
    }

    function getFontMetrics() {
      const baseH = state.fontB ? 16 : 20;
      const baseW = state.fontB ? 9 : 12;
      return {
        fontHeight: baseH * state.scaleH,
        fontWidth: baseW * state.scaleW,
        lineGap: state.fontB ? 5 : 7
      };
    }

    for (let idx = 0; idx < lines.length; idx++) {
      const lineNum = idx + 1;
      const rawLine = lines[idx];
      const trimmed = rawLine.trim();

      // Comments
      if (trimmed.startsWith(';') || trimmed.startsWith('//')) {
        continue;
      }

      // Blank line -> small paper feed
      if (!trimmed) {
        cursorY += 10;
        continue;
      }

      const upper = trimmed.toUpperCase();

      // WIDTH <58|80> (Roll width configuration)
      if (/^WIDTH\s+\d+/i.test(trimmed)) {
        const mm = parseInt(trimmed.split(/\s+/)[1], 10);
        if (mm >= 40 && mm <= 120) {
          rollWidthMm = mm;
          labelWidth = mm * 8;
        }
        continue;
      }

      // ESC @ - Initialize / Reset Printer
      if (/^(ESC\s*@|<ESC>@)$/i.test(trimmed)) {
        state = createDefaultState();
        continue;
      }

      // ESC a <n> - Justification (0=Left, 1=Center, 2=Right, or 48/49/50)
      if (/^ESC\s+a\s+\d+/i.test(trimmed) || /^<(LEFT|CENTER|RIGHT)>$/i.test(trimmed)) {
        if (upper === '<LEFT>') state.align = 'left';
        else if (upper === '<CENTER>') state.align = 'center';
        else if (upper === '<RIGHT>') state.align = 'right';
        else {
          const n = parseInt(trimmed.split(/\s+/)[2], 10) || 0;
          if (n === 1 || n === 49) state.align = 'center';
          else if (n === 2 || n === 50) state.align = 'right';
          else state.align = 'left';
        }
        continue;
      }

      // ESC E <n> - Bold / Emphasized mode
      if (/^ESC\s+E\s+\d+/i.test(trimmed) || /^<\/?BOLD>$/i.test(trimmed)) {
        if (upper === '<BOLD>') state.bold = true;
        else if (upper === '</BOLD>') state.bold = false;
        else {
          const n = parseInt(trimmed.split(/\s+/)[2], 10) || 0;
          state.bold = (n & 1) === 1;
        }
        continue;
      }

      // ESC - <n> - Underline mode
      if (/^ESC\s+-\s+\d+/i.test(trimmed) || /^<\/?UNDERLINE>$/i.test(trimmed)) {
        if (upper === '<UNDERLINE>') state.underline = true;
        else if (upper === '</UNDERLINE>') state.underline = false;
        else {
          const n = parseInt(trimmed.split(/\s+/)[2], 10) || 0;
          state.underline = n > 0;
        }
        continue;
      }

      // ESC M <n> - Select Character Font (0 = Font A normal, 1 = Font B condensed)
      if (/^ESC\s+M\s+\d+/i.test(trimmed) || /^<\/?SMALL>$/i.test(trimmed)) {
        if (upper === '<SMALL>') state.fontB = true;
        else if (upper === '</SMALL>') state.fontB = false;
        else {
          const n = parseInt(trimmed.split(/\s+/)[2], 10) || 0;
          state.fontB = n === 1 || n === 49;
        }
        continue;
      }

      // GS ! <n> or ESC ! <n> - Character Size (Height / Width multiplier)
      if (/^(GS|ESC)\s+!\s+(0x[0-9a-f]+|\d+)/i.test(trimmed)) {
        const parts = trimmed.split(/\s+/);
        const cmdType = parts[0].toUpperCase();
        const rawVal = parts[2];
        const n = rawVal.toLowerCase().startsWith('0x') ? parseInt(rawVal, 16) : parseInt(rawVal, 10) || 0;

        if (cmdType === 'GS') {
          // In GS ! n: bits 0..2 = height (1..8), bits 4..6 = width (1..8)
          // Common shorthand: GS ! 16 (double height), GS ! 17 (double width + double height), GS ! 1 (double height)
          if (n === 0) {
            state.scaleW = 1;
            state.scaleH = 1;
          } else if (n === 16) {
            state.scaleW = 1;
            state.scaleH = 1.65;
          } else if (n === 17) {
            state.scaleW = 1.5;
            state.scaleH = 1.75;
          } else {
            const wMult = ((n >> 4) & 0x07) + 1;
            const hMult = (n & 0x07) + 1;
            state.scaleW = Math.min(2.5, wMult > 1 ? 1.5 : 1);
            state.scaleH = Math.min(2.5, hMult > 1 ? 1.7 : 1);
          }
        } else {
          // ESC ! n master select
          state.fontB = (n & 1) === 1;
          state.bold = (n & 8) !== 0;
          state.scaleH = (n & 16) !== 0 ? 1.7 : 1;
          state.scaleW = (n & 32) !== 0 ? 1.5 : 1;
          state.underline = (n & 128) !== 0;
        }
        continue;
      }

      // GS B <n> - White/Black Reverse Printing
      if (/^GS\s+B\s+\d+/i.test(trimmed) || /^<\/?REVERSE>$/i.test(trimmed)) {
        if (upper === '<REVERSE>') state.reverse = true;
        else if (upper === '</REVERSE>') state.reverse = false;
        else {
          const n = parseInt(trimmed.split(/\s+/)[2], 10) || 0;
          state.reverse = (n & 1) === 1;
        }
        continue;
      }

      // ESC d <n> or LF - Print and feed n lines
      if (/^ESC\s+d\s+\d+/i.test(trimmed) || upper === 'LF' || upper === '<LF>') {
        const n = upper.startsWith('ESC') ? Math.max(1, parseInt(trimmed.split(/\s+/)[2], 10) || 1) : 1;
        cursorY += n * 22;
        continue;
      }

      // GS h <n> - Barcode height
      if (/^GS\s+h\s+\d+/i.test(trimmed)) {
        state.barcodeHeight = Math.max(24, Math.min(200, parseInt(trimmed.split(/\s+/)[2], 10) || 68));
        continue;
      }

      // GS w <n> - Barcode module width
      if (/^GS\s+w\s+\d+/i.test(trimmed)) {
        state.barcodeModuleWidth = Math.max(1, Math.min(5, parseInt(trimmed.split(/\s+/)[2], 10) || 2));
        continue;
      }

      // GS H <n> - HRI text position (0=none, 1=above, 2=below, 3=both)
      if (/^GS\s+H\s+\d+/i.test(trimmed)) {
        state.barcodeHriPos = parseInt(trimmed.split(/\s+/)[2], 10) || 0;
        continue;
      }

      // BARCODE <TYPE> "<DATA>" or GS k <m> <data>
      if (/^(BARCODE|GS\s+k)\s+/i.test(trimmed)) {
        let bType = 'CODE128';
        let data = '';

        if (/^BARCODE\s+/i.test(trimmed)) {
          const m = trimmed.match(/^BARCODE\s+(\S+)\s+"?([^"]*)"?$/i);
          if (m) {
            bType = m[1].toUpperCase();
            data = m[2];
          }
        } else {
          const m = trimmed.match(/^GS\s+k\s+(\S+)\s+"?([^"]*)"?$/i);
          if (m) {
            const code = parseInt(m[1], 10);
            if (code === 2 || code === 67) bType = 'EAN13';
            else if (code === 4 || code === 69) bType = 'CODE39';
            else if (code === 5 || code === 70) bType = 'ITF';
            else bType = 'CODE128';
            data = m[2];
          }
        }

        if (data) {
          cursorY += 6;
          elements.push({
            type: 'barcode',
            x: marginX,
            y: cursorY,
            align: state.align,
            containerWidth: getContentWidth(),
            barcodeType: bType,
            moduleWidth: state.barcodeModuleWidth,
            wideRatio: 2,
            height: state.barcodeHeight,
            showText: state.barcodeHriPos > 0,
            textAbove: state.barcodeHriPos === 1,
            rotation: 0,
            data,
            line: lineNum,
            rawCmd: trimmed,
            cmdName: `ESC/POS Barcode (${bType})`
          });
          cursorY += state.barcodeHeight + (state.barcodeHriPos > 0 ? 28 : 10);
        }
        continue;
      }

      // QRCODE <MAG> "<DATA>"
      if (/^QRCODE\s+/i.test(trimmed)) {
        const m = trimmed.match(/^QRCODE\s+(\d+)\s+"?([^"]*)"?$/i);
        const mag = m ? Math.max(3, Math.min(8, parseInt(m[1], 10) || 5)) : 5;
        const data = m ? m[2] : trimmed.replace(/^QRCODE\s+/i, '').replace(/^"|"$/g, '');
        const approxSize = 33 * mag;

        cursorY += 8;
        elements.push({
          type: 'qrcode',
          x: marginX,
          y: cursorY,
          align: state.align,
          containerWidth: getContentWidth(),
          magnification: mag,
          data,
          line: lineNum,
          rawCmd: trimmed,
          cmdName: 'GS ( k (QR Code Fiscal)'
        });
        cursorY += approxSize + 14;
        continue;
      }

      // GS V <m> or <CUT> - Guillotine Paper Cut
      if (/^(GS\s+V\b|<CUT>|CUT\b)/i.test(trimmed)) {
        cursorY += 12;
        elements.push({
          type: 'cut',
          x: 0,
          y: cursorY,
          width: labelWidth,
          height: 24,
          line: lineNum,
          rawCmd: trimmed,
          cmdName: 'GS V (Corte de Guilhotina)'
        });
        cursorY += 32;
        continue;
      }

      // Separator lines: --- or ===
      if (/^[-=]{6,}$/.test(trimmed)) {
        const isDouble = trimmed[0] === '=';
        cursorY += 6;
        elements.push({
          type: 'sep_line',
          x: marginX,
          y: cursorY,
          width: getContentWidth(),
          height: isDouble ? 6 : 2,
          double: isDouble,
          line: lineNum,
          rawCmd: trimmed,
          cmdName: isDouble ? 'Separador Duplo (===)' : 'Separador Tracejado (---)'
        });
        cursorY += isDouble ? 14 : 10;
        continue;
      }

      // Two-column Left|Right helper: <LR>Left Text|Right Text
      if (/^<LR>/i.test(trimmed)) {
        const content = trimmed.slice(4);
        const [leftPart, rightPart] = content.split('|');
        const metrics = getFontMetrics();

        elements.push({
          type: 'text_lr',
          x: marginX,
          y: cursorY,
          width: getContentWidth(),
          leftText: (leftPart || '').trim(),
          rightText: (rightPart || '').trim(),
          fontHeight: metrics.fontHeight,
          fontWidth: metrics.fontWidth,
          bold: state.bold,
          underline: state.underline,
          reverse: state.reverse,
          line: lineNum,
          rawCmd: trimmed,
          cmdName: 'Colunas Esq/Dir (<LR>)'
        });

        cursorY += metrics.fontHeight + metrics.lineGap;
        continue;
      }

      // Regular Receipt Text Line
      const metrics = getFontMetrics();
      const textContent = rawLine.replace(/^\s+/, (spaces) => (state.align === 'left' ? spaces : ''));

      elements.push({
        type: 'text',
        x: marginX,
        y: cursorY,
        text: textContent,
        fontId: state.fontB ? 'B' : 'A',
        fontHeight: metrics.fontHeight,
        fontWidth: metrics.fontWidth,
        rotation: 0,
        align: state.align,
        containerWidth: getContentWidth(),
        bold: state.bold,
        underline: state.underline,
        reverse: state.reverse,
        eplStyle: true,
        escposStyle: true,
        line: lineNum,
        rawCmd: trimmed,
        cmdName: `Texto ESC/POS (${state.align.toUpperCase()}${state.bold ? ', BOLD' : ''})`
      });

      cursorY += metrics.fontHeight + metrics.lineGap + (state.reverse ? 6 : 0);
    }

    const totalHeight = Math.max(320, cursorY + 24);

    return {
      language: 'escpos',
      width: labelWidth,
      height: totalHeight,
      rollWidthMm,
      elements,
      warnings
    };
  }

  global.ESCPOSParser = {
    parse: parseESCPOS
  };
})(window);
