/**
 * Zebra Studio - EPL2 Templates Registry & Loader
 * Links to templates/epl/*.epl with offline fallback for file:// protocol.
 */
(function (global) {
  'use strict';

  const EPL_TEMPLATES = [
    {
      id: 'epl-produto',
      name: 'Etiqueta de Produto / Varejo',
      language: 'epl',
      sizeMm: '100 x 50 mm',
      widthMm: 100,
      heightMm: 50,
      dpmm: 8,
      filePath: 'templates/epl/etiqueta-produto.epl',
      code: `; Template EPL2 - Etiqueta de Produto / Varejo (100x50mm @ 203dpi)
N
q800
Q400,24
ZT
; Moldura externa
X16,16,3,784,384
; Cabecalho invertido (fundo preto)
LO16,16,768,52
A36,28,0,4,1,1,R,"SUPERMERCADO & ATACADO CENTRAL"
; Dados do Produto
A32,86,0,4,1,1,N,"CAFE TORRADO E MOIDO EXTRA 500G"
A32,122,0,2,1,1,N,"MARCA: FAZENDA NOBRE   |   LOTE: L2026-09B"
A32,148,0,2,1,1,N,"VAL: 19/10/2027        |   COD INTERNO: 004892"
; Linha divisoria
LO32,178,736,2
; Bloco de Preco em destaque
X460,196,3,764,364
LO460,196,304,40
A480,206,0,3,1,1,R,"PRECO DE VENDA"
A478,252,0,4,1,1,N,"R$"
A530,248,0,5,1,2,N,"18,90"
A480,336,0,1,1,1,N,"R$ 37,80 / KG"
; Codigo de Barras EAN-13
A32,198,0,2,1,1,N,"EAN-13:"
B32,224,0,E30,3,6,105,B,"789123456789"
P1`
    },
    {
      id: 'epl-logistica',
      name: 'Etiqueta de Logística / Envio',
      language: 'epl',
      sizeMm: '100 x 150 mm',
      widthMm: 100,
      heightMm: 150,
      dpmm: 8,
      filePath: 'templates/epl/etiqueta-logistica.epl',
      code: `; Template EPL2 - Etiqueta de Logistica / Expedicao (100x150mm @ 203dpi)
N
q800
Q1200,24
ZT
; Moldura principal
X16,16,4,784,1184
; Faixa de cabecalho da transportadora
LO16,16,768,84
A36,34,0,4,2,2,R,"EXPRESSO LOG"
A530,42,0,3,1,2,R,"PRIORITARIO"
; Bloco Destinatario
A36,120,0,3,1,1,N,"DESTINATARIO:"
A36,154,0,4,1,2,N,"MARIA CLARA OLIVEIRA"
A36,214,0,3,1,1,N,"AV. PAULISTA, 1578 - CONJ 402 - BELA VISTA"
A36,246,0,3,1,1,N,"SAO PAULO - SP"
LO36,282,360,44
A50,294,0,4,1,1,R,"CEP: 01310-200"
; Bloco Nota Fiscal e Volume
X430,278,2,764,394
A448,292,0,2,1,1,N,"NF-e: 000.458.921"
A448,322,0,2,1,1,N,"PEDIDO: #BR-994812"
A448,354,0,3,1,1,N,"VOLUME: 01 / 03"
; Linha divisoria
LO16,412,768,4
; Codigo de Barras de CEP / Rota
A36,434,0,2,1,1,N,"ROTA: SP-CAP-SUL-04   |   PESO: 2,450 KG"
B80,474,0,1,3,6,130,B,"01310200"
; Linha divisoria
LO16,650,768,4
; Codigo de Rastreio Principal (Code 128)
A36,676,0,3,1,1,N,"CODIGO DE RASTREAMENTO (TRACKING ID):"
B56,718,0,1,3,6,180,B,"BR994812001SP"
; QR Code de Conferencia e Remetente
LO16,956,768,4
A36,980,0,2,1,1,N,"REMETENTE: TECH DISTRIBUIDORA S.A."
A36,1010,0,2,1,1,N,"RUA DAS INDUSTRIAS, 800 - CURITIBA / PR"
A36,1040,0,2,1,1,N,"CEP: 80000-000   |   CNPJ: 12.345.678/0001-99"
A36,1120,0,1,1,1,N,"ASSINATURA RECEBEDOR: ___________________________"
b590,978,Q,5,"https://rastreio.exemplo.com.br/BR994812001SP"
P1`
    },
    {
      id: 'epl-patrimonio',
      name: 'Etiqueta de Patrimônio / TI',
      language: 'epl',
      sizeMm: '60 x 40 mm',
      widthMm: 60,
      heightMm: 40,
      dpmm: 8,
      filePath: 'templates/epl/etiqueta-patrimonio.epl',
      code: `; Template EPL2 - Etiqueta de Patrimonio / Ativo TI (60x40mm @ 203dpi)
N
q480
Q320,24
ZT
X12,12,3,468,308
LO12,12,456,46
A28,24,0,3,1,1,R,"CONTROLE DE PATRIMONIO - TI"
A28,74,0,2,1,1,N,"EQUIPAMENTO: NOTEBOOK DELL LATITUDE"
A28,100,0,2,1,1,N,"SETOR: ENGENHARIA DE SOFTWARE"
A28,126,0,2,1,1,N,"SERIE: BR-DL99402-X"
LO24,154,432,2
B44,172,0,1,3,6,84,B,"PAT-008492"
P1`
    }
  ];

  const EPL_SNIPPETS = [
    { label: 'Texto (A)', cmd: 'A32,40,0,3,1,1,N,"TEXTO EXEMPLO"' },
    { label: 'Texto Invertido', cmd: 'A32,40,0,3,1,1,R,"TEXTO INVERTIDO"' },
    { label: 'Cód. Barras 128 (B)', cmd: 'B32,100,0,1,3,6,90,B,"1234567890"' },
    { label: 'QR Code (b)', cmd: 'b32,100,Q,5,"https://zebra.com"' },
    { label: 'Caixa / Borda (X)', cmd: 'X16,16,3,400,200' },
    { label: 'Linha Preta (LO)', cmd: 'LO16,80,400,4' }
  ];

  async function loadTemplateCode(template) {
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(template.filePath);
        if (res.ok) {
          return await res.text();
        }
      } catch (e) {
        // Fallback to embedded code
      }
    }
    return template.code;
  }

  global.EPLTemplates = {
    list: EPL_TEMPLATES,
    snippets: EPL_SNIPPETS,
    loadCode: loadTemplateCode
  };
})(window);
