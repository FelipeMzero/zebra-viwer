/**
 * Zebra Studio - ZPL II Templates Registry & Loader
 * Links to templates/zpl/*.zpl with offline fallback for file:// protocol.
 */
(function (global) {
  'use strict';

  const ZPL_TEMPLATES = [
    {
      id: 'zpl-produto',
      name: 'Etiqueta de Produto e Preço',
      language: 'zpl',
      sizeMm: '100 x 50 mm',
      widthMm: 100,
      heightMm: 50,
      dpmm: 8,
      filePath: 'templates/zpl/etiqueta-produto.zpl',
      code: `^XA
^FX Template ZPL II - Etiqueta de Produto e Preco (100x50mm @ 203dpi)
^PW800
^LL400
^LH0,0
^CI28

^FX Moldura Externa e Cabecalho Invertido
^FO16,16^GB768,368,3^FS
^FO16,16^GB768,54,54^FS
^FO34,28^FR^A0N,30,30^FDATACADO & VAREJO BRASIL^FS
^FO570,32^FR^A0N,22,22^FDLOJA #042^FS

^FX Descricao do Produto
^FO34,88^A0N,34,34^FDFONE DE OUVIDO BLUETOOTH PRO ANC^FS
^FO34,132^A0N,22,22^FDREF: FB-900X   |   COR: PRETO FOSCO   |   GARANTIA: 12M^FS
^FO34,162^A0N,20,20^FDIMPORTADO POR: ELETRONICOS S.A. - CNPJ 10.222.333/0001-44^FS

^FX Linha Horizontal Divisoria
^FO34,192^GB732,3,3^FS

^FX Codigo de Barras EAN-13
^FO44,216^BY3,2,110
^BEN,110,Y,N^FD789654321098^FS

^FX Caixa de Preco
^FO450,208^GB316,158,3^FS
^FO450,208^GB316,38,38^FS
^FO470,217^FR^A0N,24,24^FDPRECO A VISTA^FS
^FO468,266^A0N,32,32^FDR$^FS
^FO518,256^A0N,68,64^FD249,90^FS
^FO468,334^A0N,20,20^FDOU 6X DE R$ 41,65 SEM JUROS^FS

^XZ`
    },
    {
      id: 'zpl-expedicao',
      name: 'Etiqueta de Expedição / Logística',
      language: 'zpl',
      sizeMm: '100 x 150 mm',
      widthMm: 100,
      heightMm: 150,
      dpmm: 8,
      filePath: 'templates/zpl/etiqueta-expedicao.zpl',
      code: `^XA
^FX Template ZPL II - Etiqueta de Expedicao / Logistica (100x150mm @ 203dpi)
^PW800
^LL1200
^LH0,0
^CI28

^FX Borda Principal e Cabecalho
^FO16,16^GB768,1168,4^FS
^FO16,16^GB768,90,90^FS
^FO36,36^FR^A0N,52,52^FDFAST CARGO EXPRESS^FS
^FO570,32^GB194,58,58,W,2^FS
^FO588,46^A0N,34,34^FDSEDEX / AR^FS

^FX Bloco Destinatario
^FO36,124^A0N,24,24^FDDESTINATARIO:^FS
^FO36,158^A0N,38,38^FDCARLOS EDUARDO MENDES^FS
^FO36,204^A0N,26,26^FDRUA XV DE NOVEMBRO, 1250 - APTO 82 - CENTRO^FS
^FO36,238^A0N,26,26^FDCURITIBA - PR^FS
^FO36,274^GB340,48,48^FS
^FO52,286^FR^A0N,30,30^FDCEP: 80020-310^FS

^FX Bloco Pedido / NF / Volume
^FO420,120^GB344,202,3^FS
^FO438,136^A0N,24,24^FDNOTA FISCAL: 000.892.104^FS
^FO438,168^A0N,24,24^FDPEDIDO: #PED-2026-8841^FS
^FO438,200^A0N,24,24^FDPESO BRUTO: 4,820 KG^FS
^FO438,242^GB308,64,64^FS
^FO460,260^FR^A0N,34,34^FDVOLUME: 01 / 02^FS

^FX Linha Divisoria e Codigo de Barras de CEP
^FO16,340^GB768,4,4^FS
^FO36,360^A0N,22,22^FDCODIGO POSTAL DE DESTINO (CEP):^FS
^FO80,396^BY4,2,120
^BCN,120,Y,N,N^FD80020310^FS

^FX QR Code de Roteirizacao
^FO550,364^BQN,2,5^FDQA,CEP:80020310|PED:2026-8841|VOL:1/2^FS

^FX Linha Divisoria e Rastreio Principal
^FO16,576^GB768,4,4^FS
^FO36,598^A0N,28,28^FDCODIGO DE RASTREAMENTO (TRACKING CODE):^FS
^FO56,644^BY3,2,180
^BCN,180,Y,N,N^FDJF884920194BR^FS

^FX Bloco Remetente e Comprovante de Entrega
^FO16,890^GB768,4,4^FS
^FO36,912^A0N,22,22^FDREMETENTE: INDUSTRIA E COMERCIO HORIZONTE LTDA^FS
^FO36,942^A0N,20,20^FDAV. BRASIL, 4500 - DISTRITO INDUSTRIAL - SAO PAULO / SP^FS
^FO36,970^A0N,20,20^FDCEP: 01430-000   |   CNPJ: 45.678.901/0001-23^FS

^FO16,1010^GB768,3,3^FS
^FO36,1028^A0N,20,20^FDRECEBI OS VOLUMES CONSTANTES NESTE DOCUMENTO EM PERFEITO ESTADO:^FS
^FO36,1096^A0N,22,22^FDNOME LEGIVEL: ___________________________  DOC: _______________^FS
^FO36,1142^A0N,22,22^FDASSINATURA: _____________________________  DATA: ___/___/2026^FS

^XZ`
    },
    {
      id: 'zpl-danfe',
      name: 'DANFE Simplificado - Etiqueta',
      language: 'zpl',
      sizeMm: '100 x 150 mm',
      widthMm: 100,
      heightMm: 150,
      dpmm: 8,
      filePath: 'templates/zpl/danfe-simplificada.zpl',
      code: `^XA
^FX Template ZPL II - DANFE Simplificado - Etiqueta (100x150mm @ 203dpi)
^PW800
^LL1200
^LH0,0
^CI28

^FX Moldura Externa
^FO16,16^GB768,1168,3^FS

^FX Titulo DANFE Simplificado
^FO16,16^GB768,64,64^FS
^FO32,34^FR^A0N,32,32^FDDANFE SIMPLIFICADO - ETIQUETA^FS

^FX Dados do Emitente
^FO32,96^A0N,20,20^FDEMITENTE: COMERCIO DIGITAL BRASILEIRO S.A.^FS
^FO32,122^A0N,20,20^FDCNPJ: 12.345.678/0001-90   |   IE: 110.220.330.440^FS
^FO32,148^A0N,20,20^FDENDERECO: RODOVIA ANHANGUERA, KM 32 - CAJAMAR / SP^FS

^FX Bloco Numero NF-e / Serie / Emissao
^FO16,180^GB768,90,3^FS
^FO280,180^GB3,90,3^FS
^FO540,180^GB3,90,3^FS

^FO32,194^A0N,18,18^FDNUMERO DA NF-e^FS
^FO32,220^A0N,36,36^FD000.512.840^FS

^FO300,194^A0N,18,18^FDSERIE / TIPO^FS
^FO300,220^A0N,34,34^FD001   |   1-SAIDA^FS

^FO560,194^A0N,18,18^FDDATA DE EMISSAO^FS
^FO560,220^A0N,32,32^FD19/10/2026^FS

^FX Chave de Acesso e Codigo de Barras 128C
^FO32,290^A0N,22,22^FDCHAVE DE ACESSO DA NF-e:^FS
^FO42,326^BY2,2,130
^BCN,130,N,N,N^FD35261012345678000190550010005128401009841205^FS
^FO32,474^A0N,21,21^FD3526 1012 3456 7800 0190 5500 1000 5128 4010 0984 1205^FS

^FX Protocolo de Autorizacao
^FO16,512^GB768,56,3^FS
^FO32,530^A0N,22,22^FDPROTOCOLO DE AUTORIZACAO: 135260098412055 - 19/10/2026 11:45:10^FS

^FX Destinatario
^FO32,588^A0N,22,22^FDDESTINATARIO / REMETENTE:^FS
^FO32,620^A0N,32,32^FDFERNANDA SOUZA LIMA^FS
^FO32,660^A0N,22,22^FDCNPJ/CPF: 321.654.987-00^FS
^FO32,690^A0N,22,22^FDAV. AFONSO PENA, 2400 - FUNCIONARIOS - BELO HORIZONTE / MG^FS
^FO32,720^A0N,26,26^FDCEP: 30130-007^FS

^FX Resumo de Valores e Impostos
^FO16,764^GB768,100,3^FS
^FO390,764^GB3,100,3^FS
^FO32,782^A0N,20,20^FDQUANTIDADE DE ITENS: 04 UN^FS
^FO32,818^A0N,20,20^FDPESO LIQUIDO: 1,850 KG^FS
^FO412,782^A0N,20,20^FDVALOR TOTAL DA NOTA FISCAL:^FS
^FO412,814^A0N,38,38^FDR$ 1.289,50^FS

^FX Consulta via QR Code SEFAZ
^FO32,894^A0N,22,22^FDCONSULTE PELA CHAVE DE ACESSO EM:^FS
^FO32,924^A0N,20,20^FDwww.nfe.fazenda.gov.br/portal^FS
^FO32,970^A0N,20,20^FDPEDIDO E-COMMERCE: #MKT-8839201^FS
^FO32,1000^A0N,20,20^FDTRANSPORTADORA: LOGGI TECNOLOGIA LTDA^FS
^FO540,890^BQN,2,5^FDQA,https://www.nfe.fazenda.gov.br/portal?chNFe=35261012345678000190550010005128401009841205^FS

^XZ`
    }
  ];

  const ZPL_SNIPPETS = [
    { label: 'Texto (^A0N)', cmd: '^FO40,40^A0N,32,32^FDTEXTO EXEMPLO^FS' },
    { label: 'Texto Reverso (^FR)', cmd: '^FO40,40^GB300,46,46^FS\n^FO52,50^FR^A0N,28,28^FDTITULO INVERTIDO^FS' },
    { label: 'Cód. Barras 128 (^BC)', cmd: '^FO40,100^BY3,2,100^BCN,100,Y,N,N^FD1234567890^FS' },
    { label: 'QR Code (^BQ)', cmd: '^FO40,100^BQN,2,5^FDQA,https://zebra.com^FS' },
    { label: 'Caixa / Borda (^GB)', cmd: '^FO20,20^GB400,200,3^FS' },
    { label: 'Linha Divisória', cmd: '^FO20,120^GB400,3,3^FS' }
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

  global.ZPLTemplates = {
    list: ZPL_TEMPLATES,
    snippets: ZPL_SNIPPETS,
    loadCode: loadTemplateCode
  };
})(window);
