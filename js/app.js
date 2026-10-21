/**
 * Zebra Studio - Main Application Controller
 * Coordinates Editor, EPL/ZPL Parsers, Canvas Renderer, Templates, and Inspector.
 */
(function () {
  'use strict';

  const state = {
    language: 'zpl', // 'zpl' | 'epl'
    activeTemplateId: 'zpl-produto',
    widthMm: 100,
    heightMm: 50,
    dpmm: 8, // 8 = 203dpi, 12 = 300dpi, 24 = 600dpi
    autoSizeFromCode: true,
    zoom: 0.75,
    rotation: 0,
    showGrid: false,
    parsed: null,
    hoveredElement: null
  };

  // DOM Elements
  const els = {
    langTabs: document.querySelectorAll('.lang-tab'),
    templateList: document.getElementById('templateList'),
    snippetGrid: document.getElementById('snippetGrid'),
    presetSelect: document.getElementById('presetSelect'),
    widthMmInput: document.getElementById('widthMmInput'),
    heightMmInput: document.getElementById('heightMmInput'),
    dpiSelect: document.getElementById('dpiSelect'),
    autoSizeCheck: document.getElementById('autoSizeCheck'),
    codeEditor: document.getElementById('codeEditor'),
    lineNumbers: document.getElementById('lineNumbers'),
    editorLangBadge: document.getElementById('editorLangBadge'),
    diagnosticsBar: document.getElementById('diagnosticsBar'),
    diagnosticsText: document.getElementById('diagnosticsText'),
    labelCanvas: document.getElementById('labelCanvas'),
    canvasStageWrapper: document.getElementById('canvasStageWrapper'),
    previewViewport: document.getElementById('previewViewport'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomFitBtn: document.getElementById('zoomFitBtn'),
    zoomLabel: document.getElementById('zoomLabel'),
    rotateBtn: document.getElementById('rotateBtn'),
    gridToggleBtn: document.getElementById('gridToggleBtn'),
    exportPngBtn: document.getElementById('exportPngBtn'),
    printLabelBtn: document.getElementById('printLabelBtn'),
    downloadCodeBtn: document.getElementById('downloadCodeBtn'),
    uploadFileBtn: document.getElementById('uploadFileBtn'),
    fileInput: document.getElementById('fileInput'),
    clearCodeBtn: document.getElementById('clearCodeBtn'),
    openRefModalBtn: document.getElementById('openRefModalBtn'),
    closeRefModalBtn: document.getElementById('closeRefModalBtn'),
    refModal: document.getElementById('refModal'),
    inspectorBar: document.getElementById('inspectorBar'),
    inspectorCmd: document.getElementById('inspectorCmd'),
    inspectorDesc: document.getElementById('inspectorDesc'),
    inspectorCoords: document.getElementById('inspectorCoords'),
    statusLang: document.getElementById('statusLang'),
    statusDimensions: document.getElementById('statusDimensions'),
    statusElements: document.getElementById('statusElements'),
    statusCursor: document.getElementById('statusCursor'),
    workspace: document.querySelector('.workspace'),
    mobileNavBtns: document.querySelectorAll('.mobile-nav-btn')
  };

  function getRegistry(lang) {
    if (lang === 'epl') return window.EPLTemplates;
    if (lang === 'escpos') return window.ESCPOSTemplates;
    return window.ZPLTemplates;
  }

  function getLangBadgeText(lang) {
    if (lang === 'epl') return 'EPL2 (.epl)';
    if (lang === 'escpos') return 'ESC/POS (.pos)';
    return 'ZPL II (.zpl)';
  }

  /**
   * Auto-detect whether pasted/typed code is ZPL, EPL, or ESC/POS
   */
  function detectLanguage(code) {
    const src = String(code || '').trim();
    if (!src) return state.language;
    if (/\^(XA|FO|FT|FD|GB|BC|BY|PW|LL)/i.test(src)) {
      return 'zpl';
    }
    if (/^(ESC\s+[@aEMd\-!]|GS\s+[!BVhwHk]|WIDTH\s+\d+|<LR>|BARCODE\s+|QRCODE\s+)/im.test(src) || /\\x1[bBdD]/.test(src)) {
      return 'escpos';
    }
    if (/^(N|q\d+|Q\d+|A\d+,\d+|B\d+,\d+|LO\d+|X\d+)/m.test(src)) {
      return 'epl';
    }
    return state.language;
  }

  /**
   * Switch active language ('zpl' | 'epl' | 'escpos')
   */
  function setLanguage(lang, loadDefaultTemplate = false) {
    state.language = lang;
    els.langTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.lang === lang);
    });

    els.editorLangBadge.textContent = getLangBadgeText(lang);
    els.editorLangBadge.className = `template-badge ${lang}`;
    els.statusLang.textContent = `Linguagem: ${lang === 'escpos' ? 'ESC/POS' : lang.toUpperCase()}`;

    renderSidebarTemplates();
    renderSidebarSnippets();

    if (window.innerWidth <= 960 && els.workspace) {
      els.workspace.setAttribute('data-active-view', 'preview');
      els.mobileNavBtns.forEach((b) => b.classList.toggle('active', b.dataset.target === 'preview'));
    }

    if (loadDefaultTemplate) {
      const registry = getRegistry(lang);
      if (registry && registry.list.length > 0) {
        selectTemplate(registry.list[0]);
      }
    } else {
      parseAndRender();
    }
  }

  /**
   * Populate Sidebar Templates for current language
   */
  function renderSidebarTemplates() {
    const registry = getRegistry(state.language);
    els.templateList.innerHTML = '';

    registry.list.forEach((tpl) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `template-card ${state.activeTemplateId === tpl.id ? 'active' : ''}`;
      card.innerHTML = `
        <div class="template-card-header">
          <span class="template-card-title">
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span>${tpl.name}</span>
          </span>
          <span class="template-badge ${tpl.language}">${tpl.language === 'escpos' ? 'ESC/POS' : tpl.language.toUpperCase()}</span>
        </div>
        <div class="template-card-meta">
          <span>${tpl.sizeMm}</span>
          <span class="template-card-path">${tpl.filePath}</span>
        </div>
      `;
      card.addEventListener('click', () => selectTemplate(tpl));
      els.templateList.appendChild(card);
    });
  }

  /**
   * Populate Quick Command Snippets for current language
   */
  function renderSidebarSnippets() {
    const registry = getRegistry(state.language);
    els.snippetGrid.innerHTML = '';

    registry.snippets.forEach((snip) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'snippet-btn';
      btn.title = `Inserir: ${snip.cmd}`;
      btn.innerHTML = `
        <span class="snippet-label-row">
          <svg class="icon icon-sm" style="color: var(--accent-primary);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>${snip.label}</span>
        </span>
        <span class="snippet-cmd">${snip.cmd.replace(/\n/g, ' ').slice(0, 18)}...</span>
      `;
      btn.addEventListener('click', () => insertSnippetAtCursor(snip.cmd));
      els.snippetGrid.appendChild(btn);
    });
  }

  /**
   * Load a template into the editor and render
   */
  async function selectTemplate(tpl) {
    state.activeTemplateId = tpl.id;
    state.widthMm = tpl.widthMm;
    state.heightMm = tpl.heightMm;
    state.dpmm = tpl.dpmm || 8;

    els.widthMmInput.value = state.widthMm;
    els.heightMmInput.value = state.heightMm;
    els.dpiSelect.value = String(state.dpmm);
    syncPresetDropdown();

    const registry = getRegistry(tpl.language);
    const code = await registry.loadCode(tpl);
    els.codeEditor.value = code;

    renderSidebarTemplates();
    updateLineNumbers();
    parseAndRender();
    fitCanvasToViewport();
  }

  /**
   * Insert a command snippet into the code editor
   */
  function insertSnippetAtCursor(snippetText) {
    const textarea = els.codeEditor;
    const start = textarea.selectionStart || textarea.value.length;
    const end = textarea.selectionEnd || textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    const insertion = `${prefix}${snippetText}\n`;

    textarea.value = before + insertion + after;
    textarea.focus();
    const newPos = start + insertion.length;
    textarea.setSelectionRange(newPos, newPos);

    updateLineNumbers();
    parseAndRender();
  }

  /**
   * Update editor line numbers and optional highlighted line
   */
  function updateLineNumbers(highlightLine = null) {
    const linesCount = (els.codeEditor.value.match(/\n/g) || []).length + 1;
    let html = '';
    for (let i = 1; i <= linesCount; i++) {
      const cls = highlightLine === i ? ' class="active-line"' : '';
      html += `<div${cls}>${i}</div>`;
    }
    els.lineNumbers.innerHTML = html;
  }

  /**
   * Parse the editor code and render on HTML5 Canvas
   */
  function parseAndRender() {
    const code = els.codeEditor.value;
    const detected = detectLanguage(code);
    if (detected !== state.language) {
      state.language = detected;
      els.langTabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.lang === detected);
      });
      els.editorLangBadge.textContent = getLangBadgeText(detected);
      els.editorLangBadge.className = `template-badge ${detected}`;
      els.statusLang.textContent = `Linguagem: ${detected === 'escpos' ? 'ESC/POS' : detected.toUpperCase()}`;
      renderSidebarTemplates();
      renderSidebarSnippets();
    }

    let parsed;
    if (state.language === 'zpl') {
      parsed = window.ZPLParser.parse(code);
    } else if (state.language === 'escpos') {
      parsed = window.ESCPOSParser.parse(code);
    } else {
      parsed = window.EPLParser.parse(code);
    }

    state.parsed = parsed;

    // Auto-update dimensions if enabled and specified in code (^PW / ^LL or q / Q)
    if (state.autoSizeFromCode) {
      if (parsed.width && parsed.width >= 80) {
        state.widthMm = Math.round(parsed.width / state.dpmm);
        els.widthMmInput.value = state.widthMm;
      }
      if (parsed.height && parsed.height >= 80) {
        state.heightMm = Math.round(parsed.height / state.dpmm);
        els.heightMmInput.value = state.heightMm;
      }
      syncPresetDropdown();
    }

    const widthDots = Math.round(state.widthMm * state.dpmm);
    const heightDots = Math.round(state.heightMm * state.dpmm);

    window.CanvasRenderer.render(els.labelCanvas, parsed, {
      widthDots,
      heightDots,
      dpmm: state.dpmm,
      showGrid: state.showGrid,
      hoveredElement: state.hoveredElement
    });

    applyViewportTransform();

    // Update diagnostics & status bar
    if (parsed.warnings && parsed.warnings.length > 0) {
      els.diagnosticsBar.classList.add('visible');
      els.diagnosticsText.textContent = parsed.warnings[0];
    } else {
      els.diagnosticsBar.classList.remove('visible');
    }

    els.statusDimensions.textContent = `${state.widthMm}x${state.heightMm} mm (${widthDots}x${heightDots} dots @ ${state.dpmm} dpmm)`;
    els.statusElements.textContent = `Elementos: ${parsed.elements.length}`;
  }

  function syncPresetDropdown() {
    const key = `${state.widthMm}x${state.heightMm}`;
    const options = Array.from(els.presetSelect.options).map((o) => o.value);
    els.presetSelect.value = options.includes(key) ? key : 'custom';
  }

  function applyViewportTransform() {
    els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    els.canvasStageWrapper.style.transform = `scale(${state.zoom}) rotate(${state.rotation}deg)`;
  }

  function fitCanvasToViewport() {
    const rect = els.previewViewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const availW = Math.max(100, rect.width - 36);
    const availH = Math.max(100, rect.height - 56);
    const cw = els.labelCanvas.width || 800;
    const ch = els.labelCanvas.height || 600;
    const fitScale = Math.min(availW / cw, availH / ch, 1.2);
    state.zoom = Math.max(0.15, Math.min(1.5, Math.round(fitScale * 20) / 20));
    applyViewportTransform();
  }

  /**
   * Hit-test canvas coordinates to find hovered element for Inspector
   */
  function handleCanvasMouseMove(e) {
    if (!state.parsed || !state.parsed.elements) return;
    const rect = els.labelCanvas.getBoundingClientRect();
    const scaleX = els.labelCanvas.width / rect.width;
    const scaleY = els.labelCanvas.height / rect.height;

    const dotX = Math.round((e.clientX - rect.left) * scaleX);
    const dotY = Math.round((e.clientY - rect.top) * scaleY);
    const mmX = (dotX / state.dpmm).toFixed(1);
    const mmY = (dotY / state.dpmm).toFixed(1);

    els.statusCursor.textContent = `Cursor: X=${dotX}d (${mmX}mm), Y=${dotY}d (${mmY}mm)`;

    // Find topmost element (prefer smaller specific elements over full-label border boxes)
    let hit = null;
    let bestArea = Infinity;
    for (let i = state.parsed.elements.length - 1; i >= 0; i--) {
      const el = state.parsed.elements[i];
      if (!el.bbox) continue;
      const b = el.bbox;
      if (dotX >= b.x && dotX <= b.x + b.width && dotY >= b.y && dotY <= b.y + b.height) {
        const area = b.width * b.height;
        if (area < bestArea) {
          bestArea = area;
          hit = el;
        }
      }
    }

    if (hit !== state.hoveredElement) {
      state.hoveredElement = hit;
      const widthDots = Math.round(state.widthMm * state.dpmm);
      const heightDots = Math.round(state.heightMm * state.dpmm);

      window.CanvasRenderer.render(els.labelCanvas, state.parsed, {
        widthDots,
        heightDots,
        dpmm: state.dpmm,
        showGrid: state.showGrid,
        hoveredElement: state.hoveredElement
      });

      if (hit) {
        els.inspectorCmd.textContent = hit.cmdName || hit.type.toUpperCase();
        els.inspectorDesc.textContent = hit.rawCmd.length > 58 ? hit.rawCmd.slice(0, 58) + '...' : hit.rawCmd;
        els.inspectorCoords.textContent = `Linha ${hit.line} | X:${hit.x} Y:${hit.y}`;
        updateLineNumbers(hit.line);
      } else {
        els.inspectorCmd.textContent = 'Inspecionar';
        els.inspectorDesc.textContent = 'Passe o mouse ou clique sobre qualquer elemento da etiqueta';
        els.inspectorCoords.textContent = `X:${dotX} Y:${dotY}`;
        updateLineNumbers(null);
      }
    }
  }

  function handleCanvasClick() {
    if (!state.hoveredElement) return;
    const targetLine = state.hoveredElement.line;
    const lines = els.codeEditor.value.split('\n');
    let charPos = 0;
    for (let i = 0; i < targetLine - 1 && i < lines.length; i++) {
      charPos += lines[i].length + 1;
    }
    const lineLen = (lines[targetLine - 1] || '').length;
    els.codeEditor.focus();
    els.codeEditor.setSelectionRange(charPos, charPos + lineLen);
    const scrollTarget = Math.max(0, (targetLine - 5) * 20);
    els.codeEditor.scrollTop = scrollTarget;
    els.lineNumbers.scrollTop = scrollTarget;
  }

  /**
   * Bind Event Listeners
   */
  function initEvents() {
    // Mobile View Switcher (<= 960px)
    if (els.workspace) {
      els.workspace.setAttribute('data-active-view', 'preview');
    }
    els.mobileNavBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        els.mobileNavBtns.forEach((b) => b.classList.toggle('active', b === btn));
        if (els.workspace) {
          els.workspace.setAttribute('data-active-view', target);
        }
        if (target === 'preview') {
          requestAnimationFrame(() => fitCanvasToViewport());
        }
      });
    });

    // Auto-fit canvas on window resize or viewport container resize
    window.addEventListener('resize', () => {
      fitCanvasToViewport();
    });

    if (window.ResizeObserver && els.previewViewport) {
      const ro = new ResizeObserver(() => {
        fitCanvasToViewport();
      });
      ro.observe(els.previewViewport);
    }

    // Language switcher tabs
    els.langTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const lang = tab.dataset.lang;
        if (lang !== state.language) {
          setLanguage(lang, true);
        }
      });
    });

    // Editor input & scroll sync
    els.codeEditor.addEventListener('input', () => {
      state.activeTemplateId = null;
      renderSidebarTemplates();
      updateLineNumbers();
      parseAndRender();
    });

    els.codeEditor.addEventListener('scroll', () => {
      els.lineNumbers.scrollTop = els.codeEditor.scrollTop;
    });

    // Preset size selector
    els.presetSelect.addEventListener('change', () => {
      const val = els.presetSelect.value;
      if (val !== 'custom') {
        const [w, h] = val.split('x').map(Number);
        state.widthMm = w;
        state.heightMm = h;
        els.widthMmInput.value = w;
        els.heightMmInput.value = h;
        state.autoSizeFromCode = false;
        els.autoSizeCheck.checked = false;
        parseAndRender();
        fitCanvasToViewport();
      }
    });

    // Manual width / height / DPI inputs
    els.widthMmInput.addEventListener('input', () => {
      state.widthMm = Math.max(20, Math.min(300, Number(els.widthMmInput.value) || 100));
      syncPresetDropdown();
      parseAndRender();
    });

    els.heightMmInput.addEventListener('input', () => {
      state.heightMm = Math.max(15, Math.min(400, Number(els.heightMmInput.value) || 50));
      syncPresetDropdown();
      parseAndRender();
    });

    els.dpiSelect.addEventListener('change', () => {
      state.dpmm = Number(els.dpiSelect.value) || 8;
      parseAndRender();
      fitCanvasToViewport();
    });

    els.autoSizeCheck.addEventListener('change', () => {
      state.autoSizeFromCode = els.autoSizeCheck.checked;
      parseAndRender();
    });

    // Zoom / Rotate / Grid controls
    els.zoomInBtn.addEventListener('click', () => {
      state.zoom = Math.min(2.0, +(state.zoom + 0.1).toFixed(2));
      applyViewportTransform();
    });

    els.zoomOutBtn.addEventListener('click', () => {
      state.zoom = Math.max(0.2, +(state.zoom - 0.1).toFixed(2));
      applyViewportTransform();
    });

    els.zoomFitBtn.addEventListener('click', fitCanvasToViewport);

    els.rotateBtn.addEventListener('click', () => {
      state.rotation = (state.rotation + 90) % 360;
      applyViewportTransform();
    });

    els.gridToggleBtn.addEventListener('click', () => {
      state.showGrid = !state.showGrid;
      els.gridToggleBtn.classList.toggle('active', state.showGrid);
      parseAndRender();
    });

    // Canvas hover & click inspector
    els.labelCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    els.labelCanvas.addEventListener('mouseleave', () => {
      state.hoveredElement = null;
      updateLineNumbers(null);
      parseAndRender();
    });
    els.labelCanvas.addEventListener('click', handleCanvasClick);

    // Export PNG
    els.exportPngBtn.addEventListener('click', () => {
      // Render cleanly without hover highlight before exporting
      const prevHover = state.hoveredElement;
      state.hoveredElement = null;
      parseAndRender();

      const link = document.createElement('a');
      link.download = `etiqueta-${state.language}-${Date.now()}.png`;
      link.href = els.labelCanvas.toDataURL('image/png');
      link.click();

      state.hoveredElement = prevHover;
      parseAndRender();
    });

    // Print Label (via hidden iframe with fallback to window.open)
    els.printLabelBtn.addEventListener('click', () => {
      const dataUrl = els.labelCanvas.toDataURL('image/png');
      const wMm = state.widthMm;
      const hMm = state.heightMm;

      try {
        let printFrame = document.getElementById('printFrame');
        if (!printFrame) {
          printFrame = document.createElement('iframe');
          printFrame.id = 'printFrame';
          printFrame.style.position = 'fixed';
          printFrame.style.right = '0';
          printFrame.style.bottom = '0';
          printFrame.style.width = '0';
          printFrame.style.height = '0';
          printFrame.style.border = '0';
          document.body.appendChild(printFrame);
        }

        const doc = printFrame.contentWindow.document;
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Imprimir — ${state.language.toUpperCase()} (${wMm}x${hMm}mm)</title>
            <style>
              @page { size: ${wMm}mm ${hMm}mm; margin: 0; }
              html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #fff; }
              body { display: flex; justify-content: center; align-items: center; }
              img { width: ${wMm}mm; max-height: ${hMm}mm; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" onload="setTimeout(() => { try { window.focus(); window.print(); } catch(e){} }, 80);" />
          </body>
          </html>
        `);
        doc.close();
      } catch (err) {
        // Fallback popup if iframe is restricted
        const win = window.open('', '_blank', 'width=800,height=600');
        if (!win) return;
        win.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Imprimir — ${state.language.toUpperCase()} (${wMm}x${hMm}mm)</title>
            <style>
              @page { size: ${wMm}mm ${hMm}mm; margin: 0; }
              body { margin: 0; display: flex; justify-content: center; align-items: center; }
              img { width: ${wMm}mm; height: ${hMm}mm; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" onload="window.print();window.close();" />
          </body>
          </html>
        `);
        win.document.close();
      }
    });

    // Download source file (.zpl, .epl or .pos)
    els.downloadCodeBtn.addEventListener('click', () => {
      const ext = state.language === 'escpos' ? 'pos' : state.language;
      const blob = new Blob([els.codeEditor.value], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.download = `template.${ext}`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    });

    // Upload file (.zpl, .epl, .pos, .prn, .txt)
    els.uploadFileBtn.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        els.codeEditor.value = String(reader.result || '');
        state.activeTemplateId = null;
        updateLineNumbers();
        parseAndRender();
        fitCanvasToViewport();
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Clear editor
    els.clearCodeBtn.addEventListener('click', () => {
      if (state.language === 'zpl') {
        els.codeEditor.value = `^XA\n^PW${state.widthMm * state.dpmm}\n^LL${state.heightMm * state.dpmm}\n^FO40,40^A0N,36,36^FDNOVA ETIQUETA ZPL^FS\n^XZ`;
      } else if (state.language === 'escpos') {
        els.codeEditor.value = `ESC @\nWIDTH 80\nESC a 1\nESC E 1\nGS ! 17\nNOVO CUPOM FISCAL\nGS ! 0\nESC E 0\n------------------------------------------------\nESC a 0\n<LR>01 PRODUTO EXEMPLO|R$ 10,00\n------------------------------------------------\nESC a 1\nQRCODE 5 "https://www.nfce.fazenda.sp.gov.br"\nGS V 66`;
      } else {
        els.codeEditor.value = `N\nq${state.widthMm * state.dpmm}\nQ${state.heightMm * state.dpmm},24\nA40,40,0,4,1,1,N,"NOVA ETIQUETA EPL"\nP1`;
      }
      state.activeTemplateId = null;
      renderSidebarTemplates();
      updateLineNumbers();
      parseAndRender();
    });

    // Reference Modal
    els.openRefModalBtn.addEventListener('click', () => els.refModal.classList.add('open'));
    els.closeRefModalBtn.addEventListener('click', () => els.refModal.classList.remove('open'));
    els.refModal.addEventListener('click', (e) => {
      if (e.target === els.refModal) els.refModal.classList.remove('open');
    });
  }

  // Initialize application
  function init() {
    initEvents();
    setLanguage('zpl', true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
