/**
 * Zebra Studio - CPCL (Zebra Mobile QLn, ZQ520, ZQ630) Templates
 */
(function (global) {
  'use strict';

  const CPCL_TEMPLATES = [
    {
      id: 'cpcl-entrega',
      name: 'Comprovante Entrega Mobile',
      language: 'cpcl',
      sizeMm: '80 x 100 mm',
      widthMm: 80,
      heightMm: 100,
      dpmm: 8,
      filePath: 'templates/cpcl/etiqueta-entrega.cpcl',
      code: `! 0 200 200 800 1
PAGE-WIDTH 576
; Template CPCL - Comprovante de Entrega Mobile (Bobina 80mm @ 203dpi)
; Compativel com Zebra QLn420, ZQ520, ZQ630, RW420

TEXT 4 0 30 30 EXPRESSO MOBILE - LOGISTICA
TEXT 7 0 30 75 COMPROVANTE DE ENTREGA EM CAMPO
LINE 20 110 556 110 2

TEXT 7 0 30 130 CLIENTE: DROGARIA E FARMACIA NOVA
TEXT 7 0 30 160 PEDIDO: #MOB-84920   DATA: 21/10/2026
TEXT 7 0 30 190 ENDERECO: RUA DAS FLORES, 150 - CENTRO
LINE 20 225 556 225 2

TEXT 7 0 30 245 QTD  DESCRICAO DO ITEM           TOTAL
LINE 20 270 556 270 1
TEXT 7 0 30 285 02   DIPIRONA SODICA 500MG 20ML   12,00
TEXT 7 0 30 315 01   SORO FISIOLOGICO 0,9% 500ML   8,50
TEXT 7 0 30 345 03   GAZE ESTERIL 7.5X7.5CM       15,00
LINE 20 380 556 380 2

TEXT 4 0 30 400 TOTAL RECEBIDO: R$ 35,50
TEXT 7 0 30 445 FORMA: PIX CHAVE CNPJ (CONFIRMADO)
LINE 20 480 556 480 2

BARCODE 128 2 1 70 60 500 MOB-84920-2026
BARCODE-TEXT 7 0 5

TEXT 7 0 30 630 RECEBIDO POR: _________________________
TEXT 7 0 30 670 DOCUMENTO / RG: _______________________
TEXT 7 0 30 710 ASSINATURA: ___________________________
PRINT`
    }
  ];

  const CPCL_SNIPPETS = [
    { label: 'Texto CPCL', cmd: 'TEXT 4 0 30 30 "TEXTO EXEMPLO"' },
    { label: 'Cód. Barras 128', cmd: 'BARCODE 128 2 1 70 30 100 1234567890\nBARCODE-TEXT 7 0 5' },
    { label: 'Linha (LINE)', cmd: 'LINE 20 100 500 100 2' },
    { label: 'Caixa (BOX)', cmd: 'BOX 20 20 500 200 2' }
  ];

  async function loadTemplateCode(template) {
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(template.filePath);
        if (res.ok) return await res.text();
      } catch (e) {}
    }
    return template.code;
  }

  global.CPCLTemplates = {
    list: CPCL_TEMPLATES,
    snippets: CPCL_SNIPPETS,
    loadCode: loadTemplateCode
  };
})(window);
