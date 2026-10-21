/**
 * Zebra Studio - EPL2 (Eltron Programming Language) Parser
 * Parses EPL2 label commands into normalized renderable elements.
 */
(function (global) {
  'use strict';

  // EPL2 built-in bitmap font metrics in dots (203 DPI standard)
  const EPL_FONTS = {
    '1': { charW: 8, charH: 12 },
    '2': { charW: 10, charH: 16 },
    '3': { charW: 12, charH: 20 },
    '4': { charW: 14, charH: 24 },
    '5': { charW: 32, charH: 48 }
  };

  /**
   * Splits an EPL parameter string by comma while respecting double-quoted strings.
   */
  function splitEplParams(str) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '\\' && inQuotes && i + 1 < str.length) {
        current += str[i + 1];
        i++;
        continue;
      }
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

  function mapRotation(rotCode) {
    const r = parseInt(rotCode, 10) || 0;
    if (r === 1) return 90;
    if (r === 2) return 180;
    if (r === 3) return 270;
    return 0;
  }

  function parseEPL(code) {
    const lines = String(code || '').split(/\r?\n/);
    const elements = [];
    const warnings = [];

    let labelWidth = null;
    let labelHeight = null;
    let refX = 0;
    let refY = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const lineNum = idx + 1;
      const rawLine = lines[idx].trim();
      if (!rawLine || rawLine.startsWith(';')) continue;

      const cmdChar = rawLine[0];
      const cmdTwo = rawLine.slice(0, 2).toUpperCase();

      // Clear buffer / Print / Speed / Density / Direction / Charset commands
      if (
        rawLine === 'N' ||
        /^P\d+/i.test(rawLine) ||
        /^Z[TB]/i.test(rawLine) ||
        /^[SDI]\d+/i.test(rawLine) ||
        /^O[A-Z]?/i.test(rawLine)
      ) {
        continue;
      }

      // q<width> - Set label width in dots
      if (cmdChar === 'q' && /^q\d+/i.test(rawLine)) {
        const w = parseInt(rawLine.slice(1).trim(), 10);
        if (w > 0) labelWidth = w;
        continue;
      }

      // Q<length>,<gap> - Set form length in dots
      if (cmdChar === 'Q' && /^Q\d+/i.test(rawLine)) {
        const params = splitEplParams(rawLine.slice(1));
        const h = parseInt(params[0], 10);
        if (h > 0) labelHeight = h;
        continue;
      }

      // R<x>,<y> - Reference point origin
      if (cmdChar === 'R' && /^R\d+/i.test(rawLine)) {
        const params = splitEplParams(rawLine.slice(1));
        refX = parseInt(params[0], 10) || 0;
        refY = parseInt(params[1], 10) || 0;
        continue;
      }

      // LO<x>,<y>,<width>,<height> - Line Draw Black
      if (cmdTwo === 'LO') {
        const p = splitEplParams(rawLine.slice(2));
        if (p.length >= 4) {
          elements.push({
            type: 'rect',
            x: refX + (parseInt(p[0], 10) || 0),
            y: refY + (parseInt(p[1], 10) || 0),
            width: Math.max(1, parseInt(p[2], 10) || 1),
            height: Math.max(1, parseInt(p[3], 10) || 1),
            thickness: Math.max(parseInt(p[2], 10) || 1, parseInt(p[3], 10) || 1),
            filled: true,
            color: 'B',
            line: lineNum,
            rawCmd: rawLine,
            cmdName: 'LO (Linha/Bloco Preto)'
          });
        }
        continue;
      }

      // LW<x>,<y>,<width>,<height> - Line Draw White
      if (cmdTwo === 'LW') {
        const p = splitEplParams(rawLine.slice(2));
        if (p.length >= 4) {
          elements.push({
            type: 'rect',
            x: refX + (parseInt(p[0], 10) || 0),
            y: refY + (parseInt(p[1], 10) || 0),
            width: Math.max(1, parseInt(p[2], 10) || 1),
            height: Math.max(1, parseInt(p[3], 10) || 1),
            filled: true,
            color: 'W',
            line: lineNum,
            rawCmd: rawLine,
            cmdName: 'LW (Bloco Branco)'
          });
        }
        continue;
      }

      // LE<x>,<y>,<width>,<height> - Line Draw Exclusive OR (Invert)
      if (cmdTwo === 'LE') {
        const p = splitEplParams(rawLine.slice(2));
        if (p.length >= 4) {
          elements.push({
            type: 'rect',
            x: refX + (parseInt(p[0], 10) || 0),
            y: refY + (parseInt(p[1], 10) || 0),
            width: Math.max(1, parseInt(p[2], 10) || 1),
            height: Math.max(1, parseInt(p[3], 10) || 1),
            filled: true,
            reverse: true,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: 'LE (Bloco XOR Invertido)'
          });
        }
        continue;
      }

      // LS<x1>,<y1>,<thickness>,<x2>,<y2> - Diagonal Line
      if (cmdTwo === 'LS') {
        const p = splitEplParams(rawLine.slice(2));
        if (p.length >= 5) {
          const x1 = refX + (parseInt(p[0], 10) || 0);
          const y1 = refY + (parseInt(p[1], 10) || 0);
          const thick = Math.max(1, parseInt(p[2], 10) || 2);
          const x2 = refX + (parseInt(p[3], 10) || 0);
          const y2 = refY + (parseInt(p[4], 10) || 0);
          elements.push({
            type: 'line',
            x: x1,
            y: y1,
            x2: x2,
            y2: y2,
            thickness: thick,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: 'LS (Linha Diagonal)'
          });
        }
        continue;
      }

      // X<x1>,<y1>,<thickness>,<x2>,<y2> - Box Draw
      if (cmdChar.toUpperCase() === 'X') {
        const p = splitEplParams(rawLine.slice(1));
        if (p.length >= 5) {
          const x1 = refX + (parseInt(p[0], 10) || 0);
          const y1 = refY + (parseInt(p[1], 10) || 0);
          const thick = Math.max(1, parseInt(p[2], 10) || 1);
          const x2 = refX + (parseInt(p[3], 10) || 0);
          const y2 = refY + (parseInt(p[4], 10) || 0);
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
            thickness: thick,
            color: 'B',
            rounding: 0,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: 'X (Caixa / Moldura)'
          });
        }
        continue;
      }

      // A<x>,<y>,<rotation>,<font>,<h_mult>,<v_mult>,<reverse>,"<data>" - Text
      if (cmdChar === 'A') {
        const p = splitEplParams(rawLine.slice(1));
        if (p.length >= 8) {
          const x = refX + (parseInt(p[0], 10) || 0);
          const y = refY + (parseInt(p[1], 10) || 0);
          const rotation = mapRotation(p[2]);
          const fontId = String(p[3] || '3');
          const hMult = Math.max(1, parseInt(p[4], 10) || 1);
          const vMult = Math.max(1, parseInt(p[5], 10) || 1);
          const reverse = String(p[6] || 'N').toUpperCase() === 'R';
          const text = p.slice(7).join(',');

          const baseMetric = EPL_FONTS[fontId] || EPL_FONTS['3'];
          const fontHeight = baseMetric.charH * vMult;
          const fontWidth = baseMetric.charW * hMult;

          elements.push({
            type: 'text',
            x,
            y,
            text,
            fontId,
            fontHeight,
            fontWidth,
            rotation,
            reverse,
            eplStyle: true,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: `A (Texto Fonte ${fontId})`
          });
        } else {
          warnings.push(`Linha ${lineNum}: Comando A incompleto (${rawLine})`);
        }
        continue;
      }

      // B<x>,<y>,<rotation>,<type>,<narrow>,<wide>,<height>,<human_readable>,"<data>" - 1D Barcode
      if (cmdChar === 'B') {
        const p = splitEplParams(rawLine.slice(1));
        if (p.length >= 9) {
          const x = refX + (parseInt(p[0], 10) || 0);
          const y = refY + (parseInt(p[1], 10) || 0);
          const rotation = mapRotation(p[2]);
          const bType = String(p[3] || '1').toUpperCase();
          const narrow = Math.max(1, parseInt(p[4], 10) || 2);
          const wide = Math.max(narrow + 1, parseInt(p[5], 10) || narrow * 2);
          const height = Math.max(16, parseInt(p[6], 10) || 80);
          const showText = String(p[7] || 'B').toUpperCase() === 'B';
          const data = p.slice(8).join(',');

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
            cmdName: `B (Código de Barras ${bType})`
          });
        } else {
          warnings.push(`Linha ${lineNum}: Comando B incompleto (${rawLine})`);
        }
        continue;
      }

      // b<x>,<y>,<type>,...,"<data>" - 2D Barcode (QR Code / DataMatrix)
      if (cmdChar === 'b') {
        const p = splitEplParams(rawLine.slice(1));
        if (p.length >= 4) {
          const x = refX + (parseInt(p[0], 10) || 0);
          const y = refY + (parseInt(p[1], 10) || 0);
          let mag = 5;
          for (let i = 3; i < p.length - 1; i++) {
            const token = p[i];
            if (/^s?\d+$/i.test(token)) {
              mag = parseInt(token.replace(/\D/g, ''), 10) || 5;
            }
          }
          const data = p[p.length - 1];
          elements.push({
            type: 'qrcode',
            x,
            y,
            magnification: mag,
            data,
            line: lineNum,
            rawCmd: rawLine,
            cmdName: 'b (QR Code / 2D)'
          });
        }
        continue;
      }

      warnings.push(`Linha ${lineNum}: Comando EPL não reconhecido (${rawLine.slice(0, 24)})`);
    }

    return {
      language: 'epl',
      width: labelWidth,
      height: labelHeight,
      elements,
      warnings
    };
  }

  global.EPLParser = {
    parse: parseEPL
  };
})(window);
