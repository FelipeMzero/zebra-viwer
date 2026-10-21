/**
 * Zebra Studio - TSPL / TSPL2 (Elgin L42 Pro, Bematech LB-1000, TSC) Templates
 */
(function (global) {
  'use strict';

  const TSPL_TEMPLATES = [
    {
      id: 'tspl-envios',
      name: 'Etiqueta de Envio / Logística',
      language: 'tspl',
      sizeMm: '100 x 150 mm',
      widthMm: 100,
      heightMm: 150,
      dpmm: 8,
      filePath: 'templates/tspl/etiqueta-envios.tspl',
      code: `; Template TSPL / TSPL2 - Etiqueta de Envio / Logistica (100x150mm @ 203dpi)
; Compativel com Elgin L42 Pro, Bematech LB-1000, TSC TE200/TTP-244
SIZE 100 mm, 150 mm
GAP 3 mm, 0 mm
DIRECTION 1
CLS

; Borda externa e cabecalho
BOX 16,16,784,1184,4
BAR 16,16,768,88
TEXT 36,36,"4",0,1,1,"EXPRESSO BRASIL LOGISTICA"

; Destinatario
TEXT 36,124,"3",0,1,1,"DESTINATARIO:"
TEXT 36,158,"4",0,1,1,"RODRIGO ALBUQUERQUE LIMA"
TEXT 36,204,"3",0,1,1,"AV. BRIGADEIRO FARIA LIMA, 3477 - 14 ANDAR"
TEXT 36,238,"3",0,1,1,"ITAIM BIBI - SAO PAULO / SP"
BAR 36,274,340,46
TEXT 52,286,"3",0,1,1,"CEP: 04538-133"

; Bloco Nota Fiscal e Volume
BOX 420,120,764,322,3
TEXT 438,136,"2",0,1,1,"NOTA FISCAL: 000.781.902"
TEXT 438,168,"2",0,1,1,"PEDIDO: #ECOM-2026-9910"
TEXT 438,200,"2",0,1,1,"PESO: 3,250 KG"
BAR 438,242,308,62
TEXT 460,258,"3",0,1,1,"VOLUME: 01 / 01"

; Divisoria e CEP
BAR 16,340,768,4
TEXT 36,360,"2",0,1,1,"CODIGO DE ENDERECAMENTO POSTAL (CEP):"
BARCODE 80,396,"128",120,1,0,3,3,"04538133"
QRCODE 550,364,L,5,A,0,"CEP:04538133|NF:781902|VOL:1/1"

; Divisoria e Codigo de Rastreamento Principal
BAR 16,576,768,4
TEXT 36,600,"3",0,1,1,"CODIGO DE RASTREAMENTO (TRACKING):"
BARCODE 56,646,"128",170,1,0,3,3,"BR884920194SP"

; Remetente e Assinatura
BAR 16,880,768,4
TEXT 36,904,"2",0,1,1,"REMETENTE: DISTRIBUIDORA NACIONAL S.A."
TEXT 36,934,"2",0,1,1,"RUA DAS INDUSTRIAS, 1200 - CURITIBA / PR"
TEXT 36,964,"2",0,1,1,"CNPJ: 10.987.654/0001-32   CEP: 80000-000"

BAR 16,1010,768,3
TEXT 36,1030,"2",0,1,1,"RECEBI OS VOLUMES EM PERFEITAS CONDICOES:"
TEXT 36,1096,"2",0,1,1,"NOME: ___________________________ DOC: _______________"
TEXT 36,1142,"2",0,1,1,"ASSINATURA: _____________________ DATA: ___/___/2026"

PRINT 1,1`
    },
    {
      id: 'tspl-produto',
      name: 'Etiqueta de Produto / Preço',
      language: 'tspl',
      sizeMm: '100 x 50 mm',
      widthMm: 100,
      heightMm: 50,
      dpmm: 8,
      filePath: 'templates/tspl/etiqueta-produto.tspl',
      code: `; Template TSPL / TSPL2 - Etiqueta de Produto e Preco (100x50mm @ 203dpi)
; Compativel com Elgin L42 Pro, Bematech LB-1000, TSC
SIZE 100 mm, 50 mm
GAP 3 mm, 0 mm
DIRECTION 1
CLS

; Moldura e Cabecalho
BOX 16,16,784,384,3
BAR 16,16,768,54
TEXT 36,28,"3",0,1,1,"SUPERMERCADO & ATACADO CENTRAL"
TEXT 580,32,"2",0,1,1,"LOJA #012"

; Descricao
TEXT 36,88,"4",0,1,1,"AZEITE DE OLIVA EXTRA VIRGEM 500ML"
TEXT 36,130,"2",0,1,1,"MARCA: BORGES   |   ACIDEZ MAX: 0,5%   |   ORIGEM: ESPANHA"
TEXT 36,158,"2",0,1,1,"LOTE: L2026-X89 | VALIDADE: 15/12/2027"

; Linha divisoria
BAR 36,188,732,3

; Codigo EAN-13
BARCODE 44,212,"EAN13",110,1,0,3,3,"789123456789"

; Bloco de Preco
BOX 450,204,766,366,3
BAR 450,204,316,36
TEXT 468,212,"2",0,1,1,"PRECO PROMOCIONAL"
TEXT 468,260,"3",0,1,1,"R$"
TEXT 520,248,"5",0,1,2,"39,90"
TEXT 468,336,"1",0,1,1,"R$ 79,80 / LITRO"

PRINT 1,1`
    }
  ];

  const TSPL_SNIPPETS = [
    { label: 'Texto (TEXT)', cmd: 'TEXT 40,40,"3",0,1,1,"TEXTO TSPL"' },
    { label: 'Cód. Barras 128', cmd: 'BARCODE 40,100,"128",80,1,0,2,2,"1234567890"' },
    { label: 'Cód. Barras EAN13', cmd: 'BARCODE 40,100,"EAN13",80,1,0,2,2,"789123456789"' },
    { label: 'QR Code (QRCODE)', cmd: 'QRCODE 40,100,L,5,A,0,"https://elgin.com.br"' },
    { label: 'Caixa (BOX)', cmd: 'BOX 20,20,400,200,3' },
    { label: 'Linha/Bloco (BAR)', cmd: 'BAR 20,100,400,4' }
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

  global.TSPLTemplates = {
    list: TSPL_TEMPLATES,
    snippets: TSPL_SNIPPETS,
    loadCode: loadTemplateCode
  };
})(window);
