/**
 * Zebra Studio - HTML5 Canvas Label & Receipt Renderer
 * Renders normalized EPL2 / ZPL II / ESC/POS elements with pixel/dot accuracy,
 * bounding-box calculation for interactive inspection, and grid overlay.
 */
(function (global) {
  'use strict';

  function drawRoundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    if (radius === 0) {
      ctx.rect(x, y, w, h);
    } else {
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    ctx.closePath();
  }

  /**
   * Wrap text for ZPL ^FB (Field Block)
   */
  function wrapTextLines(ctx, rawText, maxWidth, maxLines) {
    // ZPL uses \& for explicit line breaks inside ^FB
    const paragraphs = String(rawText || '').split(/\\&|\r?\n/);
    const lines = [];

    for (const para of paragraphs) {
      const words = para.split(' ');
      let current = '';
      for (let i = 0; i < words.length; i++) {
        const candidate = current ? current + ' ' + words[i] : words[i];
        if (ctx.measureText(candidate).width <= maxWidth || !current) {
          current = candidate;
        } else {
          lines.push(current);
          current = words[i];
          if (lines.length >= maxLines) break;
        }
      }
      if (lines.length >= maxLines) break;
      if (current || para === '') lines.push(current);
    }
    return lines.slice(0, maxLines);
  }

  function renderLabel(canvas, parsed, config) {
    const {
      widthDots = 800,
      heightDots = 600,
      dpmm = 8,
      showGrid = false,
      hoveredElement = null,
      selectedElement = null
    } = config;

    const w = Math.max(100, Math.round(widthDots));
    const h = Math.max(100, Math.round(heightDots));

    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.save();

    // 1. Clean White Thermal Paper Background (subtle warm receipt tint for ESC/POS)
    const isEscPos = parsed && parsed.language === 'escpos';
    ctx.fillStyle = isEscPos ? '#fffef9' : '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // 2. Render each element in sequence and compute its bounding box
    const elements = (parsed && parsed.elements) || [];

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      ctx.save();

      if (el.type === 'rect') {
        if (el.reverse) {
          ctx.globalCompositeOperation = 'difference';
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = el.color === 'W' ? '#ffffff' : '#000000';
        }
        const radius = el.rounding ? (el.rounding / 8) * (Math.min(el.width, el.height) / 2) : 0;
        drawRoundedRectPath(ctx, el.x, el.y, el.width, el.height, radius);
        ctx.fill();
        el.bbox = { x: el.x, y: el.y, width: el.width, height: el.height };
      } else if (el.type === 'box') {
        const t = Math.min(el.thickness || 2, el.width / 2, el.height / 2);
        const radius = el.rounding ? (el.rounding / 8) * (Math.min(el.width, el.height) / 2) : 0;
        if (el.reverse) {
          ctx.globalCompositeOperation = 'difference';
          ctx.strokeStyle = '#ffffff';
        } else {
          ctx.strokeStyle = el.color === 'W' ? '#ffffff' : '#000000';
        }
        ctx.lineWidth = t;
        drawRoundedRectPath(
          ctx,
          el.x + t / 2,
          el.y + t / 2,
          Math.max(1, el.width - t),
          Math.max(1, el.height - t),
          radius
        );
        ctx.stroke();
        el.bbox = { x: el.x, y: el.y, width: el.width, height: el.height };
      } else if (el.type === 'circle') {
        const r = el.diameter / 2;
        const t = Math.min(el.thickness || 2, r);
        ctx.beginPath();
        ctx.arc(el.x + r, el.y + r, Math.max(1, r - t / 2), 0, Math.PI * 2);
        ctx.lineWidth = t;
        ctx.strokeStyle = el.color === 'W' ? '#ffffff' : '#000000';
        ctx.stroke();
        el.bbox = { x: el.x, y: el.y, width: el.diameter, height: el.diameter };
      } else if (el.type === 'ellipse') {
        const rx = el.width / 2;
        const ry = el.height / 2;
        const t = Math.min(el.thickness || 2, rx, ry);
        ctx.beginPath();
        ctx.ellipse(el.x + rx, el.y + ry, Math.max(1, rx - t / 2), Math.max(1, ry - t / 2), 0, 0, Math.PI * 2);
        ctx.lineWidth = t;
        ctx.strokeStyle = el.color === 'W' ? '#ffffff' : '#000000';
        ctx.stroke();
        el.bbox = { x: el.x, y: el.y, width: el.width, height: el.height };
      } else if (el.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x2, el.y2);
        ctx.lineWidth = el.thickness || 2;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
        el.bbox = {
          x: Math.min(el.x, el.x2),
          y: Math.min(el.y, el.y2),
          width: Math.max(8, Math.abs(el.x2 - el.x)),
          height: Math.max(8, Math.abs(el.y2 - el.y))
        };
      } else if (el.type === 'sep_line') {
        // ESC/POS Dashed or Double Separator Line
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(el.x, el.y + 1);
        ctx.lineTo(el.x + el.width, el.y + 1);
        ctx.stroke();
        if (el.double) {
          ctx.beginPath();
          ctx.moveTo(el.x, el.y + 5);
          ctx.lineTo(el.x + el.width, el.y + 5);
          ctx.stroke();
        }
        el.bbox = { x: el.x, y: el.y - 2, width: el.width, height: (el.double ? 8 : 6) };
      } else if (el.type === 'cut') {
        // ESC/POS Guillotine Paper Cut Indicator
        const midY = el.y + 10;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(w, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        const badgeText = '✂ CORTE DE PAPEL (GS V)';
        ctx.font = 'bold 11px "JetBrains Mono", "Consolas", monospace';
        const tw = ctx.measureText(badgeText).width + 16;
        const bx = (w - tw) / 2;
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(bx, midY - 9, tw, 18);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(bx, midY - 9, tw, 18);
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, w / 2, midY);
        el.bbox = { x: 0, y: el.y, width: w, height: 22 };
      } else if (el.type === 'text_lr') {
        // ESC/POS Left | Right aligned columns
        const fH = Math.max(8, el.fontHeight || 20);
        const weight = el.bold ? '700' : '500';
        ctx.font = `${weight} ${fH}px "JetBrains Mono", "Consolas", "Courier New", monospace`;
        ctx.textBaseline = 'top';

        if (el.reverse) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(el.x - 4, el.y - 2, el.width + 8, fH + 4);
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = '#000000';
        }

        ctx.textAlign = 'left';
        ctx.fillText(el.leftText || '', el.x, el.y);
        ctx.textAlign = 'right';
        ctx.fillText(el.rightText || '', el.x + el.width, el.y);

        // Draw subtle leader dots between left and right if space permits
        const lw = ctx.measureText(el.leftText || '').width;
        const rw = ctx.measureText(el.rightText || '').width;
        const dotStart = el.x + lw + 8;
        const dotEnd = el.x + el.width - rw - 8;
        if (dotEnd - dotStart > 24 && !el.reverse) {
          ctx.save();
          ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(dotStart, el.y + fH - 4);
          ctx.lineTo(dotEnd, el.y + fH - 4);
          ctx.stroke();
          ctx.restore();
        }

        el.bbox = { x: el.x, y: el.y, width: el.width, height: fH };
      } else if (el.type === 'gf') {
        ctx.fillStyle = '#000000';
        let hexIdx = 0;
        for (let r = 0; r < el.rows; r++) {
          for (let b = 0; b < el.bytesPerRow; b++) {
            const byteVal = parseInt(el.hexData.slice(hexIdx, hexIdx + 2), 16) || 0;
            hexIdx += 2;
            for (let bit = 0; bit < 8; bit++) {
              if ((byteVal >> (7 - bit)) & 1) {
                ctx.fillRect(el.x + b * 8 + bit, el.y + r, 1, 1);
              }
            }
          }
        }
        el.bbox = { x: el.x, y: el.y, width: el.width, height: el.height };
      } else if (el.type === 'text') {
        const fH = Math.max(8, el.fontHeight || 24);
        const fW = Math.max(6, el.fontWidth || fH);
        const isMono = el.eplStyle || el.escposStyle || (el.fontId && el.fontId !== '0');
        const fontFamily = isMono
          ? '"JetBrains Mono", "Consolas", "Courier New", monospace'
          : '"Arial Narrow", "Roboto Condensed", "Inter", "Arial", sans-serif';

        const fontWeight = el.escposStyle ? (el.bold ? '800' : '500') : 'bold';
        ctx.font = `${fontWeight} ${fH}px ${fontFamily}`;
        ctx.textBaseline = 'top';

        // Horizontal stretch ratio
        const naturalCharW = fH * (isMono ? 0.6 : 0.55);
        const targetCharW = el.eplStyle ? fW : fW * 0.62;
        const scaleX = el.escposStyle
          ? Math.max(0.75, Math.min(2.2, fW / (fH * 0.6)))
          : Math.max(0.45, Math.min(3.0, targetCharW / naturalCharW));

        const measuredRaw = ctx.measureText(el.text || '').width;
        const totalW = measuredRaw * scaleX;
        let totalH = fH;

        let drawOriginX = el.x;
        if (el.containerWidth && el.align) {
          if (el.align === 'center') {
            drawOriginX = el.x + Math.max(0, (el.containerWidth - totalW) / 2);
          } else if (el.align === 'right') {
            drawOriginX = el.x + Math.max(0, el.containerWidth - totalW);
          }
        }

        ctx.translate(drawOriginX, el.y);
        if (el.rotation === 90) ctx.rotate(Math.PI / 2);
        else if (el.rotation === 180) ctx.rotate(Math.PI);
        else if (el.rotation === 270) ctx.rotate((3 * Math.PI) / 2);

        if ((el.eplStyle || el.escposStyle) && el.reverse) {
          // EPL / ESC/POS Reverse: black background bar with white text
          ctx.fillStyle = '#000000';
          if (el.escposStyle && el.containerWidth && el.align === 'center') {
            ctx.fillRect(-(drawOriginX - el.x), -3, el.containerWidth, fH + 6);
          } else {
            ctx.fillRect(-4, -3, totalW + 8, fH + 6);
          }
          ctx.fillStyle = '#ffffff';
        } else if (el.reverse) {
          // ZPL ^FR: invert pixels against underlying canvas
          ctx.globalCompositeOperation = 'difference';
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = '#000000';
        }

        if (el.fb && el.fb.width > 0) {
          const effWidth = el.fb.width / scaleX;
          const lines = wrapTextLines(ctx, el.text, effWidth, el.fb.maxLines || 1);
          const lineStep = fH + (el.fb.lineSpacing || 2);
          totalH = lines.length * lineStep;

          ctx.scale(scaleX, 1);
          for (let l = 0; l < lines.length; l++) {
            const lineStr = lines[l];
            const lw = ctx.measureText(lineStr).width;
            let drawX = 0;
            if (el.fb.align === 'C') drawX = (effWidth - lw) / 2;
            else if (el.fb.align === 'R') drawX = effWidth - lw;
            ctx.fillText(lineStr, drawX, l * lineStep);
          }
          el.bbox = { x: el.x, y: el.y, width: el.fb.width, height: totalH };
        } else {
          ctx.scale(scaleX, 1);
          ctx.fillText(el.text || '', 0, 0);

          if (el.underline) {
            ctx.fillRect(0, fH - 2, measuredRaw, 2);
          }

          if (el.rotation === 90 || el.rotation === 270) {
            el.bbox = { x: drawOriginX - totalH, y: el.y, width: totalH, height: totalW };
          } else {
            el.bbox = { x: drawOriginX, y: el.y, width: Math.max(20, totalW), height: totalH };
          }
        }
      } else if (el.type === 'barcode') {
        const dim = global.BarcodeRenderer.draw1DBarcode(ctx, {
          x: el.x,
          y: el.y,
          align: el.align,
          containerWidth: el.containerWidth,
          type: el.barcodeType,
          data: el.data,
          moduleWidth: el.moduleWidth,
          wideRatio: el.wideRatio,
          height: el.height,
          showText: el.showText,
          textAbove: el.textAbove,
          rotation: el.rotation
        });
        el.bbox = {
          x: dim.x !== undefined ? dim.x : el.x,
          y: el.y,
          width: dim.width || 120,
          height: dim.height || el.height
        };
      } else if (el.type === 'qrcode') {
        const dim = global.BarcodeRenderer.drawQRCode(ctx, {
          x: el.x,
          y: el.y,
          align: el.align,
          containerWidth: el.containerWidth,
          data: el.data,
          magnification: el.magnification
        });
        el.bbox = {
          x: dim.x !== undefined ? dim.x : el.x,
          y: el.y,
          width: dim.width,
          height: dim.height
        };
      }

      ctx.restore();
    }

    // 3. Optional Dot / Millimeter Grid Overlay
    if (showGrid) {
      ctx.save();
      const step5mm = dpmm * 5;
      const step10mm = dpmm * 10;

      for (let x = step5mm; x < w; x += step5mm) {
        const isMajor = Math.round(x % step10mm) === 0;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.strokeStyle = isMajor ? 'rgba(2, 132, 199, 0.28)' : 'rgba(148, 163, 184, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let y = step5mm; y < h; y += step5mm) {
        const isMajor = Math.round(y % step10mm) === 0;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.strokeStyle = isMajor ? 'rgba(2, 132, 199, 0.28)' : 'rgba(148, 163, 184, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Highlight Hovered or Selected Element (Interactive Inspector)
    const activeTarget = hoveredElement || selectedElement;
    if (activeTarget && activeTarget.bbox) {
      const b = activeTarget.bbox;
      ctx.save();
      ctx.fillStyle = 'rgba(234, 88, 12, 0.14)';
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.fillRect(b.x - 3, b.y - 3, b.width + 6, b.height + 6);
      ctx.strokeRect(b.x - 3, b.y - 3, b.width + 6, b.height + 6);
      ctx.restore();
    }

    ctx.restore();
  }

  global.CanvasRenderer = {
    render: renderLabel
  };
})(window);
