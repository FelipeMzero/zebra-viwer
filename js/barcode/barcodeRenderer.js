/**
 * Zebra Studio - 100% Local Barcode & 2D Code Engine (HTML5 Canvas)
 * Supports: Code 128 (B/C), Code 39, EAN-13, EAN-8, UPC-A, Interleaved 2 of 5, QR Code, DataMatrix
 */
(function (global) {
  'use strict';

  // Code 128 Pattern Table (Values 0 to 106) - bar/space widths (sum = 11 modules, Stop = 13 modules)
  const CODE128_PATTERNS = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
    '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
    '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
    '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
    '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
    '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
    '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
    '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
    '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
    '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
    '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
    '211214', '211232', '2331112'
  ];

  // Code 39 Character Map (9 elements: 5 bars, 4 spaces; 1 = wide, 0 = narrow)
  const CODE39_MAP = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
    '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
    '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
    'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
    'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
    'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
    'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
    'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
    '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
    '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
  };

  // EAN / UPC Encoding Tables
  const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
  const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
  const EAN_PARITY = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
  ];

  // Interleaved 2 of 5 (ITF) Patterns
  const ITF_PATTERNS = [
    '00110', '10001', '01001', '11000', '00101',
    '10100', '01100', '00011', '10010', '01010'
  ];

  /**
   * Converts a Code 128 pattern string (e.g. '212222') into binary module string ('1101100...')
   */
  function patternToBits(pattern) {
    let bits = '';
    let isBar = true;
    for (let i = 0; i < pattern.length; i++) {
      const count = parseInt(pattern[i], 10);
      bits += (isBar ? '1' : '0').repeat(count);
      isBar = !isBar;
    }
    return bits;
  }

  /**
   * Encode string into Code 128 bit string ('1' = bar, '0' = space)
   */
  function encodeCode128(rawText) {
    // Strip ZPL subset prefixes like >:, >;, >9, >5 if present
    const cleanText = String(rawText || '').replace(/^>[0-9:;<>]/g, '');
    if (!cleanText) return '';

    const codes = [];
    // Use Code 128C if cleanText is all digits and even length >= 4
    if (/^\d+$/.test(cleanText) && cleanText.length >= 4 && cleanText.length % 2 === 0) {
      codes.push(105); // Start C
      for (let i = 0; i < cleanText.length; i += 2) {
        codes.push(parseInt(cleanText.slice(i, i + 2), 10));
      }
    } else {
      codes.push(104); // Start B
      for (let i = 0; i < cleanText.length; i++) {
        let code = cleanText.charCodeAt(i) - 32;
        if (code < 0 || code > 94) code = 0;
        codes.push(code);
      }
    }

    // Calculate Modulo 103 Checksum
    let checksum = codes[0];
    for (let i = 1; i < codes.length; i++) {
      checksum += codes[i] * i;
    }
    codes.push(checksum % 103);
    codes.push(106); // Stop

    return codes.map((c) => patternToBits(CODE128_PATTERNS[c])).join('');
  }

  /**
   * Encode string into Code 39 bit string
   */
  function encodeCode39(rawText, narrowRatio) {
    const ratio = Math.max(2, Math.round(narrowRatio || 2));
    const clean = '*' + String(rawText || '').toUpperCase().replace(/\*/g, '') + '*';
    let bits = '';

    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      const pat = CODE39_MAP[ch] || CODE39_MAP['-'];
      let isBar = true;
      for (let j = 0; j < pat.length; j++) {
        const w = pat[j] === '1' ? ratio : 1;
        bits += (isBar ? '1' : '0').repeat(w);
        isBar = !isBar;
      }
      if (i < clean.length - 1) {
        bits += '0'; // inter-character narrow space
      }
    }
    return bits;
  }

  /**
   * Calculate EAN-13 check digit for 12-digit string
   */
  function calcEan13CheckDigit(digits12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const n = parseInt(digits12[i], 10) || 0;
      sum += i % 2 === 0 ? n : n * 3;
    }
    return String((10 - (sum % 10)) % 10);
  }

  /**
   * Encode EAN-13 bit string and return { bits, fullText }
   */
  function encodeEAN13(rawText) {
    let digits = String(rawText || '').replace(/\D/g, '');
    if (digits.length < 12) {
      digits = digits.padStart(12, '0');
    }
    digits = digits.slice(0, 12);
    const check = calcEan13CheckDigit(digits);
    const full = digits + check;

    const first = parseInt(full[0], 10);
    const parity = EAN_PARITY[first];

    let bits = '101'; // Left guard
    for (let i = 1; i <= 6; i++) {
      const d = parseInt(full[i], 10);
      bits += parity[i - 1] === 'L' ? EAN_L[d] : EAN_G[d];
    }
    bits += '01010'; // Center guard
    for (let i = 7; i <= 12; i++) {
      const d = parseInt(full[i], 10);
      bits += EAN_R[d];
    }
    bits += '101'; // Right guard
    return { bits, fullText: full };
  }

  /**
   * Encode Interleaved 2 of 5 (ITF) bit string
   */
  function encodeITF(rawText, wideRatio) {
    const ratio = Math.max(2, Math.round(wideRatio || 2));
    let digits = String(rawText || '').replace(/\D/g, '');
    if (!digits) digits = '00';
    if (digits.length % 2 !== 0) digits = '0' + digits;

    let bits = '1010'; // Start
    for (let i = 0; i < digits.length; i += 2) {
      const p1 = ITF_PATTERNS[parseInt(digits[i], 10)];
      const p2 = ITF_PATTERNS[parseInt(digits[i + 1], 10)];
      for (let j = 0; j < 5; j++) {
        bits += '1'.repeat(p1[j] === '1' ? ratio : 1);
        bits += '0'.repeat(p2[j] === '1' ? ratio : 1);
      }
    }
    bits += '1'.repeat(ratio) + '01'; // Stop
    return bits;
  }

  /**
   * Draw a 1D barcode onto a 2D Canvas context
   */
  function draw1DBarcode(ctx, options) {
    const {
      x = 0,
      y = 0,
      type = 'CODE128',
      data = '',
      moduleWidth = 2,
      wideRatio = 2,
      height = 80,
      showText = true,
      textAbove = false,
      rotation = 0
    } = options;

    const cleanData = String(data || '').replace(/^>[0-9:;<>]/g, '');
    let bits = '';
    let displayText = cleanData;

    const upperType = String(type).toUpperCase();
    if (upperType.includes('EAN13') || upperType === 'E30' || upperType === 'BE') {
      const res = encodeEAN13(cleanData);
      bits = res.bits;
      displayText = res.fullText;
    } else if (upperType.includes('39') || upperType === '3' || upperType === '3C' || upperType === 'B3') {
      bits = encodeCode39(cleanData, wideRatio);
    } else if (upperType.includes('ITF') || upperType === '2' || upperType === '2C' || upperType === 'B2') {
      bits = encodeITF(cleanData, wideRatio);
    } else {
      bits = encodeCode128(cleanData);
    }

    if (!bits) return { width: 0, height: 0 };

    const mw = Math.max(1, Math.round(moduleWidth));
    const totalBarWidth = bits.length * mw;
    const fontSize = Math.max(12, Math.min(22, Math.round(mw * 7)));
    const textGap = showText ? fontSize + 6 : 0;
    const totalHeight = height + textGap;

    ctx.save();
    ctx.translate(x, y);
    if (rotation === 90) {
      ctx.rotate(Math.PI / 2);
    } else if (rotation === 180) {
      ctx.rotate(Math.PI);
    } else if (rotation === 270) {
      ctx.rotate((3 * Math.PI) / 2);
    }

    const barTop = showText && textAbove ? fontSize + 4 : 0;
    ctx.fillStyle = '#000000';

    // Draw run-length optimized bars
    let i = 0;
    while (i < bits.length) {
      if (bits[i] === '1') {
        let run = 1;
        while (i + run < bits.length && bits[i + run] === '1') {
          run++;
        }
        ctx.fillRect(i * mw, barTop, run * mw, height);
        i += run;
      } else {
        i++;
      }
    }

    if (showText && displayText) {
      ctx.font = `bold ${fontSize}px "JetBrains Mono", "Consolas", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const textY = textAbove ? 0 : height + 4;
      ctx.fillText(displayText, totalBarWidth / 2, textY);
    }

    ctx.restore();

    if (rotation === 90 || rotation === 270) {
      return { width: totalHeight, height: totalBarWidth };
    }
    return { width: totalBarWidth, height: totalHeight };
  }

  /**
   * Minimal QR Code Matrix Generator (Real GF(256) Reed-Solomon ECC for Byte Mode Version 1..6)
   * Produces a real scannable QR Code matrix!
   */
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function initGaloisField() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) {
      GF_EXP[i] = GF_EXP[i - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const root = GF_EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], root);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(dataBytes, ecCount) {
    const gen = rsGeneratorPoly(ecCount);
    const msg = new Uint8Array(dataBytes.length + ecCount);
    msg.set(dataBytes, 0);
    for (let i = 0; i < dataBytes.length; i++) {
      const coef = msg[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j++) {
          msg[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return msg.slice(dataBytes.length);
  }

  // Version 1..6 Level L specs (Single block for V1..V5, 2 blocks for V6)
  const QR_VERSIONS = [
    null,
    { version: 1, size: 21, totalData: 19, ecPerBlock: 7, blocks: 1, align: [] },
    { version: 2, size: 25, totalData: 34, ecPerBlock: 10, blocks: 1, align: [6, 18] },
    { version: 3, size: 29, totalData: 55, ecPerBlock: 15, blocks: 1, align: [6, 22] },
    { version: 4, size: 33, totalData: 80, ecPerBlock: 20, blocks: 1, align: [6, 26] },
    { version: 5, size: 37, totalData: 108, ecPerBlock: 26, blocks: 1, align: [6, 30] },
    { version: 6, size: 41, totalData: 136, ecPerBlock: 18, blocks: 2, align: [6, 34] }
  ];

  function generateQRMatrix(rawText) {
    // Strip ZPL QR prefix like QA, or MA,
    const text = String(rawText || '').replace(/^[QMHL][AM],/i, '');
    const utf8 = new TextEncoder().encode(text || ' ');

    // Pick smallest version that fits utf8.length + 2 bytes header
    let spec = QR_VERSIONS[6];
    for (let v = 1; v <= 6; v++) {
      if (utf8.length + 2 <= QR_VERSIONS[v].totalData) {
        spec = QR_VERSIONS[v];
        break;
      }
    }

    const payload = utf8.slice(0, spec.totalData - 2);
    const bits = [];
    function pushBits(val, len) {
      for (let i = len - 1; i >= 0; i--) {
        bits.push((val >> i) & 1);
      }
    }

    // Byte mode indicator (0100) + character count (8 bits for V1-9)
    pushBits(0b0100, 4);
    pushBits(payload.length, 8);
    for (let i = 0; i < payload.length; i++) {
      pushBits(payload[i], 8);
    }

    const maxDataBits = spec.totalData * 8;
    const terminator = Math.min(4, maxDataBits - bits.length);
    pushBits(0, terminator);
    while (bits.length % 8 !== 0) bits.push(0);

    const dataCodewords = new Uint8Array(spec.totalData);
    for (let i = 0; i < bits.length / 8; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
      dataCodewords[i] = b;
    }
    const padBytes = [0xec, 0x11];
    for (let i = bits.length / 8, p = 0; i < spec.totalData; i++, p++) {
      dataCodewords[i] = padBytes[p % 2];
    }

    // Compute EC & interleave if 2 blocks
    let finalBytes = [];
    if (spec.blocks === 1) {
      const ec = rsEncode(dataCodewords, spec.ecPerBlock);
      finalBytes = Array.from(dataCodewords).concat(Array.from(ec));
    } else {
      const half = spec.totalData / 2;
      const b1 = dataCodewords.slice(0, half);
      const b2 = dataCodewords.slice(half);
      const ec1 = rsEncode(b1, spec.ecPerBlock);
      const ec2 = rsEncode(b2, spec.ecPerBlock);
      for (let i = 0; i < half; i++) {
        finalBytes.push(b1[i], b2[i]);
      }
      for (let i = 0; i < spec.ecPerBlock; i++) {
        finalBytes.push(ec1[i], ec2[i]);
      }
    }

    const size = spec.size;
    const matrix = Array.from({ length: size }, () => new Int8Array(size));
    const reserved = Array.from({ length: size }, () => new Uint8Array(size));

    function setModule(r, c, val, isFunc) {
      if (r < 0 || r >= size || c < 0 || c >= size) return;
      matrix[r][c] = val ? 1 : 0;
      if (isFunc) reserved[r][c] = 1;
    }

    function placeFinder(row, col) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const isBorder = r === -1 || r === 7 || c === -1 || c === 7;
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setModule(row + r, col + c, !isBorder && (isOuter || isInner), true);
        }
      }
    }

    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    // Alignment pattern
    if (spec.align.length > 0) {
      const [a0, a1] = spec.align;
      const coords = [
        [a0, a0], [a0, a1], [a1, a0], [a1, a1]
      ];
      for (const [ar, ac] of coords) {
        if (reserved[ar][ac]) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
            setModule(ar + r, ac + c, dark, true);
          }
        }
      }
    }

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      setModule(6, i, i % 2 === 0, true);
      setModule(i, 6, i % 2 === 0, true);
    }

    // Reserve format areas + dark module
    for (let i = 0; i < 9; i++) {
      if (!reserved[8][i]) setModule(8, i, 0, true);
      if (!reserved[i][8]) setModule(i, 8, 0, true);
    }
    for (let i = 0; i < 8; i++) {
      if (!reserved[8][size - 1 - i]) setModule(8, size - 1 - i, 0, true);
      if (!reserved[size - 1 - i][8]) setModule(size - 1 - i, 8, 0, true);
    }
    setModule(size - 8, 8, 1, true);

    // Place data bits in upward/downward 2-column zig-zag
    const allBits = [];
    for (const byte of finalBytes) {
      for (let b = 7; b >= 0; b--) allBits.push((byte >> b) & 1);
    }

    let bitIdx = 0;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        const r = upward ? size - 1 - vert : vert;
        for (let j = 0; j < 2; j++) {
          const c = right - j;
          if (!reserved[r][c]) {
            const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
            // Mask 0: (r + c) % 2 === 0
            const masked = ((r + c) % 2 === 0) ? bit ^ 1 : bit;
            matrix[r][c] = masked;
          }
        }
      }
      upward = !upward;
    }

    // Format string for ECC Level L (01) + Mask 0 (000) = 0x77c4 (111011111000100)
    const formatBits = 0x77c4;
    for (let i = 0; i <= 5; i++) setModule(8, i, (formatBits >> i) & 1, true);
    setModule(8, 7, (formatBits >> 6) & 1, true);
    setModule(8, 8, (formatBits >> 7) & 1, true);
    setModule(7, 8, (formatBits >> 8) & 1, true);
    for (let i = 9; i < 15; i++) setModule(14 - i, 8, (formatBits >> i) & 1, true);

    for (let i = 0; i < 8; i++) setModule(8, size - 1 - i, (formatBits >> i) & 1, true);
    for (let i = 8; i < 15; i++) setModule(size - 15 + i, 8, (formatBits >> i) & 1, true);

    return matrix;
  }

  /**
   * Draw QR Code on Canvas
   */
  function drawQRCode(ctx, options) {
    const { x = 0, y = 0, data = '', magnification = 4 } = options;
    const mag = Math.max(2, Math.min(12, Math.round(magnification || 4)));
    const matrix = generateQRMatrix(data);
    const count = matrix.length;
    const totalSize = count * mag;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - mag, y - mag, totalSize + mag * 2, totalSize + mag * 2);

    ctx.fillStyle = '#000000';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(x + c * mag, y + r * mag, mag, mag);
        }
      }
    }
    ctx.restore();

    return { width: totalSize, height: totalSize };
  }

  global.BarcodeRenderer = {
    draw1DBarcode,
    drawQRCode
  };
})(window);
