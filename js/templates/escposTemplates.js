/**
 * Zebra Studio - ESC/POS (COM/POS Fiscal / Bobina Térmica) Templates Registry & Loader
 * Links to templates/escpos/*.pos with offline fallback for file:// protocol.
 */
(function (global) {
  'use strict';

  const ESCPOS_TEMPLATES = [
    {
      id: 'escpos-nfce',
      name: 'DANFE NFC-e — Cupom Fiscal',
      language: 'escpos',
      sizeMm: '80 x 210 mm',
      widthMm: 80,
      heightMm: 210,
      dpmm: 8,
      filePath: 'templates/escpos/danfe-nfce.pos',
      code: `; Template ESC/POS (COM/POS) - DANFE NFC-e Cupom Fiscal (Bobina 80mm)
ESC @
WIDTH 80

; Cabecalho do Emitente
ESC a 1
ESC E 1
GS ! 17
SUPERMERCADO CENTRAL LTDA
GS ! 0
ESC E 0
CNPJ: 12.345.678/0001-90   IE: 110.220.330.440
AV. PAULISTA, 1500 - BELA VISTA - SAO PAULO/SP
================================================
ESC E 1
DANFE NFC-e - Documento Auxiliar da Nota Fiscal
de Consumidor Eletronica
ESC E 0
Nao permite aproveitamento de credito de ICMS
================================================

; Cabecalho da Tabela de Itens
ESC a 0
ESC E 1
#  CODIGO      DESCRICAO             QTD UN   VL.UNIT   VL.TOTAL
ESC E 0
------------------------------------------------
01 7891000105  CAFE TORRADO 500G     2 UN     18,90      37,80
02 7894900011  LEITE INTEGRAL 1L     6 UN      5,49      32,94
03 7891910000  ARROZ TIPO 1 5KG      1 UN     29,90      29,90
04 7896005800  AZEITE EXTRA VIRGEM   1 UN     44,50      44,50
------------------------------------------------

; Totais do Cupom
<LR>QTD. TOTAL DE ITENS|04
<LR>SUBTOTAL R$|145,14
<LR>DESCONTO R$|5,14
ESC E 1
GS ! 16
<LR>VALOR A PAGAR R$|140,00
GS ! 0
ESC E 0
------------------------------------------------
<LR>FORMA DE PAGAMENTO|VALOR PAGO R$
<LR>PIX / QR CODE INSTANTANEO|140,00
<LR>TROCO R$|0,00
------------------------------------------------

; Informacoes da Chave de Acesso e Consumidor
ESC a 1
ESC E 1
Consulte pela Chave de Acesso em:
ESC E 0
https://www.nfce.fazenda.sp.gov.br/consulta
3526 1012 3456 7800 0190 6500 1000 0482 9110 0849 2018

; Codigo de Barras da Série/Número NFC-e
GS h 64
GS w 2
GS H 0
BARCODE CODE128 "3526101234567800019065001000048291"

------------------------------------------------
CONSUMIDOR CPF: 123.456.789-00 - CLIENTE IDENTIFICADO
NFC-e nº 000.048.291   Série 001   21/10/2026 10:42:18
Protocolo de Autorização: 135260948291042
------------------------------------------------
ESC E 1
Consulta via leitor de QR Code
ESC E 0
QRCODE 5 "https://www.nfce.fazenda.sp.gov.br/qrcode?p=35261012345678000190650010000482911008492018|2|1|1|A8F9B2"

ESC M 1
Tributos Totais Incidentes (Lei Federal 12.741/2012): R$ 24,85 (17,75%)
Fed: R$ 11,20 (8,00%) | Est: R$ 13,65 (9,75%) | Fonte: IBPT
ESC M 0
ESC d 1
GS V 66`
    },
    {
      id: 'escpos-sat',
      name: 'Extrato CF-e SAT Fiscal',
      language: 'escpos',
      sizeMm: '80 x 195 mm',
      widthMm: 80,
      heightMm: 195,
      dpmm: 8,
      filePath: 'templates/escpos/extrato-sat.pos',
      code: `; Template ESC/POS (COM/POS) - Extrato CF-e SAT Fiscal (Bobina 80mm)
ESC @
WIDTH 80

ESC a 1
ESC E 1
DROGARIA & FARMACIA SAUDE TOTAL S.A.
ESC E 0
RUA XV DE NOVEMBRO, 890 - CENTRO - CAMPINAS/SP
CNPJ: 45.678.901/0001-23   IE: 244.556.778.110
================================================
ESC E 1
EXTRATO No. 084920
CUPOM FISCAL ELETRONICO - SAT
ESC E 0
================================================
ESC a 0
CPF/CNPJ do Consumidor: 321.654.987-00
------------------------------------------------
# | COD | DESC | QTD | UN | VL UNIT R$ | (VL TR R$) | VL ITEM R$
------------------------------------------------
001 7896523201 VITAMINA C 1G EFERV 30CP 1 UN X 34,90 (4,20)   34,90
002 7891058004 PROTETOR SOLAR FPS60 200M 1 UN X 69,90 (9,10)  69,90
003 7898142900 SORO FISIOLOGICO 500ML   2 UN X  8,50 (1,90)   17,00
------------------------------------------------
<LR>Subtotal bruto de itens|121,80
<LR>Total de descontos/acrescimos|-1,80
ESC E 1
GS ! 16
<LR>TOTAL R$|120,00
GS ! 0
ESC E 0
<LR>Cartao de Credito (Mastercard)|120,00
------------------------------------------------
OBSERVACOES DO CONTRIBUINTE
 Trib aprox R$ 15,20 Federal e R$ 11,40 Estadual (Fonte: IBPT)
 Caixa: PDV-03   Operador: MARCOS SILVA
================================================
ESC a 1
ESC E 1
SAT No. 000.912.485
ESC E 0
21/10/2026 - 10:44:05
3526 1045 6789 0100 0123 5900 0912 4850 8492 0991 2834

GS h 70
GS w 2
GS H 0
BARCODE CODE128 "35261045678901000123590009124850849209912834"

QRCODE 5 "35261045678901000123590009124850849209912834|20261021104405|120.00|32165498700|ASSINATURA_SAT_QRCODE"

ESC M 1
Consulte o QR Code pelo aplicativo De Olho na Nota (SEFAZ)
ESC M 0
GS V 66`
    },
    {
      id: 'escpos-tef',
      name: 'Comprovante TEF & Pedido (58mm)',
      language: 'escpos',
      sizeMm: '58 x 150 mm',
      widthMm: 58,
      heightMm: 150,
      dpmm: 8,
      filePath: 'templates/escpos/comprovante-tef-pedido.pos',
      code: `; Template ESC/POS (COM/POS) - Comprovante TEF & Pedido (Bobina 58mm)
ESC @
WIDTH 58

ESC a 1
GS B 1
GS ! 17
 EXPRESSO CAFE & BISTRO 
GS ! 0
GS B 0
CNPJ: 22.333.444/0001-55
--------------------------------
ESC E 1
COMPROVANTE DE CARTAO - TEF
VIA DO CLIENTE
ESC E 0
--------------------------------
ESC a 0
<LR>TERMINAL: POS-0942|DOC: 849201
<LR>DATA: 21/10/2026|HORA: 10:45
<LR>BANDEIRA: VISA|CREDITO A VISTA
<LR>CARTAO:|**** **** **** 4092
<LR>AUT: 994821|NSU: 00482910
--------------------------------
ESC E 1
GS ! 16
<LR>VALOR APROVADO|R$ 48,50
GS ! 0
ESC E 0
================================
ESC a 1
ESC E 1
GS ! 17
SENHA DE RETIRADA: #084
GS ! 0
ESC E 0
--------------------------------
ESC a 0
2x CAPPUCCINO ITALIANO G
1x PAO DE QUEIJO RECHEADO
1x TORTA HOLANDESA FATIA
--------------------------------
ESC a 1
GS h 64
GS w 2
GS H 2
BARCODE CODE128 "PED-084-2026"
ESC M 1
Obrigado pela preferencia! Volte sempre.
ESC M 0
GS V 66`
    }
  ];

  const ESCPOS_SNIPPETS = [
    { label: 'Centralizar (ESC a)', cmd: 'ESC a 1\nTEXTO CENTRALIZADO\nESC a 0' },
    { label: 'Negrito (ESC E)', cmd: 'ESC E 1\nTEXTO EM NEGRITO\nESC E 0' },
    { label: 'Dupla Altura (GS !)', cmd: 'GS ! 17\nTITULO EXPANDIDO\nGS ! 0' },
    { label: 'Colunas Esq|Dir', cmd: '<LR>DESCRICAO DO ITEM|R$ 29,90' },
    { label: 'Cód. Barras 128', cmd: 'GS h 64\nGS w 2\nBARCODE CODE128 "789123456789"' },
    { label: 'QR Code Fiscal', cmd: 'QRCODE 5 "https://www.nfce.fazenda.sp.gov.br"' },
    { label: 'Fundo Reverso (GS B)', cmd: 'GS B 1\n DESTAQUE INVERTIDO \nGS B 0' },
    { label: 'Corte Papel (GS V)', cmd: 'GS V 66' }
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

  global.ESCPOSTemplates = {
    list: ESCPOS_TEMPLATES,
    snippets: ESCPOS_SNIPPETS,
    loadCode: loadTemplateCode
  };
})(window);
