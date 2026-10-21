/**
 * Zebra Studio - TSPL / TSPL2 (TSC, Elgin L42 Pro, Bematech LB-1000) Parser
 * Interpreta comandos TSPL em elementos normalizados para renderização em Canvas.
 */
(function (global) {
  'use strict';

  const TSPL_FONTS = {
    '1': { w: 8, h: 12 },
    '2': { w: 12, h: 20 },
    '3': { w: 16, h: 24 },
    '4': { w: 24, h: 32 },
    '5': { w: 32, h: 48 },
    '6': { w: 14, h: 19 },
    '7': { w: 14, h: 19 },
    '8': { w: 14, h: 19 },
    '0': { w: 20, h: 28 }
  };

  function parseCSVParams(str) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  function parseTSPL(code) {
    const lines = String(code || '').split(/\r?\n/);
    const elements = [];
    const warnings = [];

    let labelWidth = null;
    let labelHeight = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const lineNum = idx + 1;
      const rawLine = lines[idx].trim();
      if (!rawLine || rawLine.startsWith(';') || rawLine.startsWith('//') || rawLine.startsWith('REM')) {
        continue;
      }

      const match = rawLine.match(/^([A-Z0-9_\-]+)\s*(.*)$/i);
      if (!match) continue;

      const cmd = match[1].toUpperCase();
      const rest = match[2];
      const p = parseCSVParams(rest);

      // SIZE <w> mm, <h> mm or SIZE <w> dot, <h> dot or SIZE <w>, <h>
      if (cmd === 'SIZE') {
        const wStr = p[0] || '';
        const hStr = p[1] || '';
        const wVal = parseFloat(wStr);
        const hVal = parseFloat(hStr);

        if (wStr.toLowerCase().includes('mm')) {
          labelWidth = Math.round(wVal * 8);
        } else if (wVal > 0) {
          labelWidth = wVal > 200 ? Math.round(wVal) : Math.round(wVal * 8);
        }

        if (hStr.toLowerCase().includes('mm')) {
          labelHeight = Math.round(hVal * 8);
        } else if (hVal > 0) {
          labelHeight = hVal > 200 ? Math.round(hVal) : Math.round(hVal * 8);
        }
        continue;
      }

      // CLS, GAP, DIRECTION, OFFSET, SPEED, DENSITY, PRINT
      if (cmd === 'CLS' || cmd === 'GAP' || cmd === 'DIRECTION' || cmd === 'OFFSET' || cmd === 'SPEED' || cmd === 'DENSITY' || cmd === 'PRINT' || cmd === 'HOME' || cmd === 'CODEPAGE') {
        continue;
      }

      // BAR x, y, width, height (Solid black bar or reverse background bar)
      if (cmd === 'BAR') {
        const x = parseInt(p[0], 10) || 0;
        const y = parseInt(p[1], 10) || 0;
        const w = Math.max(1, parseInt(p[2], 10) || 1);
        const h = Math.max(1, parseInt(p[3], 10) || 1);

        elements.push({
          type: 'rect',
          x,
          y,
          width: w,
          height: h,
          thickness: h,
          filled: true,
          color: 'B',
          line: lineNum,
          rawCmd: rawLine,
          cmdName: 'BAR (Linha/Bloco Sólido)'
        });
        continue;
      }

      // BOX x_start, y_start, x_end, y_end, line_thickness
      if (cmd === 'BOX') {
        const x1 = parseInt(p[0], 10) || 0;
        const y1 = parseInt(p[1], 10) || 0;
        const x2 = parseInt(p[2], 10) || 0;
        const y2 = parseInt(p[3], 10) || 0;
        const t = Math.max(1, parseInt(p[4], 10) || 2);

        const bx = Math.min(x1, x2);
        const by = Math.min(y1, y2);
        const bw = Math.max(1, Math.abs(x2 - x1));
        const bh = Math.max(1, Math.abs(y2 - y1));

        elements.push({
          type: 'box',
          x: bx,
          y: by,
          width: bw,
          height: bh,
          thickness: t,
          color: 'B',
          rounding: 0,
          line: lineNum,
          rawCmd: rawLine,
          cmdName: 'BOX (Caixa Gráfica)'
        });
        continue;
      }

      // TEXT x, y, "font", rotation, x_mult, y_mult, [alignment], "content"
      if (cmd === 'TEXT') {
        if (p.length >= 7) {
          const x = parseInt(p[0], 10) || 0;
          const y = parseInt(p[1], 10) || 0;
          const fontId = String(p[2] || '3').replace(/"/g, '');
          const rotCode = parseInt(p[3], 10) || 0;
          const xMult = Math.max(1, parseInt(p[4], 10) || 1);
          const yMult = Math.max(1, parseInt(p[5], 10) || 1);
          const text = p[p.length - 1];

          let rotation = 0;
          if (rotCode === 90) rotation = 90;
          else if (rotCode === 180) rotation = 180;
          else if (rotCode === 270) rotation = 270;

          const base = TSPL_FONTS[fontId] || TSPL_FONTS['3'];
          const fontHeight = base.h * yMult;
          const fontWidth = base.w * xMult;

          elements.push({
            type: 'text',
            x,
            y,
            text,
            fontId,
            fontHeight,
            fontWidth,
            rotation,
            reverse: false,
            eplStyle: true,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: `TEXT (Fonte ${fontId})`
          });
        }
        continue;
      }

      // BARCODE x, y, "code_type", height, human_readable, rotation, narrow, wide, "content"
      if (cmd === 'BARCODE') {
        if (p.length >= 9) {
          const x = parseInt(p[0], 10) || 0;
          const y = parseInt(p[1], 10) || 0;
          const bType = String(p[2] || '128').replace(/"/g, '').toUpperCase();
          const height = Math.max(16, parseInt(p[3], 10) || 80);
          const showText = parseInt(p[4], 10) !== 0;
          const rotCode = parseInt(p[5], 10) || 0;
          const narrow = Math.max(1, parseInt(p[6], 10) || 2);
          const wide = Math.max(narrow + 1, parseInt(p[7], 10) || narrow * 2);
          const data = p[p.length - 1];

          let rotation = 0;
          if (rotCode === 90) rotation = 90;
          else if (rotCode === 180) rotation = 180;
          else if (rotCode === 270) rotation = 270;

          elements.push({
            type: 'barcode',
            x,
            y,
            barcodeType: bType,
            moduleWidth: narrow,
            wideRatio: Math.round(wide / narrow),
            height,
            showText,
            textAbove: false,
            rotation,
            data,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: `BARCODE (${bType})`
          });
        }
        continue;
      }

      // QRCODE x, y, ECC, cell_width, mode, rotation, "content"
      if (cmd === 'QRCODE') {
        if (p.length >= 7) {
          const x = parseInt(p[0], 10) || 0;
          const y = parseInt(p[1], 10) || 0;
          const cellWidth = Math.max(2, Math.min(10, parseInt(p[3], 10) || 5));
          const data = p[p.length - 1];

          elements.push({
            type: 'qrcode',
            x,
            y,
            magnification: cellWidth,
            data,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: 'QRCODE 2D'
          });
        }
        continue;
      }
    }

    return {
      language: 'tspl',
      width: labelWidth,
      height: labelHeight,
      elements,
      warnings
    };
  }

  global.TSPLParser = {
    parse: parseTSPL
  };
})(window);
