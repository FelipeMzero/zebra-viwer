/**
 * Zebra Studio - CPCL (Comtec / Zebra Mobile QLn, ZQ520, ZQ630) Parser
 * Interpreta comandos CPCL em elementos normalizados para renderização em Canvas.
 */
(function (global) {
  'use strict';

  const CPCL_FONTS = {
    '0': { w: 9, h: 12 },
    '1': { w: 12, h: 24 },
    '2': { w: 16, h: 32 },
    '4': { w: 22, h: 32 },
    '5': { w: 28, h: 44 },
    '6': { w: 14, h: 20 },
    '7': { w: 12, h: 18 }
  };

  function parseCPCL(code) {
    const lines = String(code || '').split(/\r?\n/);
    const elements = [];
    const warnings = [];

    let labelWidth = 640;
    let labelHeight = 800;
    let barcodeShowText = true;

    for (let idx = 0; idx < lines.length; idx++) {
      const lineNum = idx + 1;
      const rawLine = lines[idx].trim();
      if (!rawLine || rawLine.startsWith(';')) continue;

      // Header: ! <offset> <resX> <resY> <height> <qty>
      if (rawLine.startsWith('!')) {
        const p = rawLine.slice(1).trim().split(/\s+/);
        if (p.length >= 4) {
          const h = parseInt(p[3], 10);
          if (h > 0) labelHeight = h;
        }
        continue;
      }

      const upper = rawLine.toUpperCase();

      // PAGE-WIDTH <width>
      if (upper.startsWith('PAGE-WIDTH')) {
        const w = parseInt(rawLine.split(/\s+/)[1], 10);
        if (w > 0) labelWidth = w;
        continue;
      }

      // PRINT, FORM, END
      if (upper === 'PRINT' || upper === 'FORM' || upper === 'END') {
        continue;
      }

      // BARCODE-TEXT <font> <size> <offset> or BARCODE-TEXT OFF
      if (upper.startsWith('BARCODE-TEXT')) {
        barcodeShowText = !upper.includes('OFF');
        continue;
      }

      // TEXT <font> <size> <x> <y> <data>
      if (upper.startsWith('TEXT ') || upper.startsWith('T ')) {
        const p = rawLine.split(/\s+/);
        if (p.length >= 6) {
          const fontId = p[1];
          const x = parseInt(p[3], 10) || 0;
          const y = parseInt(p[4], 10) || 0;
          const text = p.slice(5).join(' ');

          const base = CPCL_FONTS[fontId] || CPCL_FONTS['7'];

          elements.push({
            type: 'text',
            x,
            y,
            text,
            fontId,
            fontHeight: base.h,
            fontWidth: base.w,
            rotation: 0,
            reverse: false,
            eplStyle: true,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: `TEXT (Fonte CPCL ${fontId})`
          });
        }
        continue;
      }

      // LINE <x0> <y0> <x1> <y1> <width>
      if (upper.startsWith('LINE ')) {
        const p = rawLine.split(/\s+/);
        if (p.length >= 6) {
          const x0 = parseInt(p[1], 10) || 0;
          const y0 = parseInt(p[2], 10) || 0;
          const x1 = parseInt(p[3], 10) || 0;
          const y1 = parseInt(p[4], 10) || 0;
          const w = Math.max(1, parseInt(p[5], 10) || 1);

          elements.push({
            type: 'line',
            x: x0,
            y: y0,
            x2: x1,
            y2: y1,
            thickness: w,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: 'LINE (Linha CPCL)'
          });
        }
        continue;
      }

      // BOX <x0> <y0> <x1> <y1> <thickness>
      if (upper.startsWith('BOX ')) {
        const p = rawLine.split(/\s+/);
        if (p.length >= 6) {
          const x0 = parseInt(p[1], 10) || 0;
          const y0 = parseInt(p[2], 10) || 0;
          const x1 = parseInt(p[3], 10) || 0;
          const y1 = parseInt(p[4], 10) || 0;
          const t = Math.max(1, parseInt(p[5], 10) || 2);

          elements.push({
            type: 'box',
            x: Math.min(x0, x1),
            y: Math.min(y0, y1),
            width: Math.abs(x1 - x0),
            height: Math.abs(y1 - y0),
            thickness: t,
            color: 'B',
            rounding: 0,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: 'BOX (Caixa CPCL)'
          });
        }
        continue;
      }

      // BARCODE <type> <width> <ratio> <height> <x> <y> <data>
      if (upper.startsWith('BARCODE ')) {
        const p = rawLine.split(/\s+/);
        if (p.length >= 8) {
          const bType = p[1].toUpperCase();
          const modWidth = Math.max(1, parseInt(p[2], 10) || 2);
          const ratio = Math.max(2, parseInt(p[3], 10) || 2);
          const height = Math.max(16, parseInt(p[4], 10) || 70);
          const x = parseInt(p[5], 10) || 0;
          const y = parseInt(p[6], 10) || 0;
          const data = p.slice(7).join(' ');

          elements.push({
            type: 'barcode',
            x,
            y,
            barcodeType: bType === '128' ? 'CODE128' : bType,
            moduleWidth: modWidth,
            wideRatio: ratio,
            height,
            showText: barcodeShowText,
            textAbove: false,
            rotation: 0,
            data,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: `BARCODE (${bType})`
          });
        }
        continue;
      }
    }

    return {
      language: 'cpcl',
      width: labelWidth,
      height: labelHeight,
      elements,
      warnings
    };
  }

  global.CPCLParser = {
    parse: parseCPCL
  };
})(window);
