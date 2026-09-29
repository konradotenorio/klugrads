// Every user-facing string. The page ships in Portuguese and switches to
// English from the browser language or the header selector.
// Values marked "html" keep the exact markup of the element they replace.
export type Lang = "pt" | "en";
export const LANGUAGES: Lang[] = ["pt", "en"];
export const LANG_STORAGE = "radref_lang";  // mesma chave do app KlugRads

const pt = {
  "app.title": "Idade óssea (IA) — KlugRads",
  "app.description":
    "Estimativa experimental de idade óssea com processamento local no navegador. Suas radiografias permanecem no seu dispositivo.",
  "app.htmlLang": "pt-BR",
  "app.locale": "pt-BR",

  "nav.brand": "KlugRads, voltar ao app",
  "nav.label": "Navegação",
  "nav.how": "Como funciona",
  "nav.source": 'Código aberto <span aria-hidden="true">↗</span>',
  "nav.language": "Idioma",
  "nav.langPt": "Português",
  "nav.langEn": "English",

  "hero.eyebrow": "INTELIGÊNCIA ARTIFICIAL · PROCESSAMENTO LOCAL",
  "hero.title": "Idade óssea. <br /><span>No seu navegador.</span>",
  "hero.description":
    "Da radiografia à estimativa de maturação óssea. <br />Seus arquivos ficam com você, do início ao fim.",
  "hero.localTitle": "Seu dispositivo. Seus dados.",
  "hero.localText":
    "Sem upload para servidores. <br />Sem rastreamento das suas imagens.",

  "workspace.title": "Nova análise",
  "workspace.badge": "USO EXPERIMENTAL",
  "workspace.label": "Radiografia e dados do exame",
  "steps.label": "Etapas da análise",
  "steps.one": "<span>01</span> Abrir radiografia",
  "steps.two": "<span>02</span> Preparar imagem",
  "steps.three": "<span>03</span> Calcular idade óssea",

  "image.title": "Radiografia da mão esquerda",
  "image.localFile": "ARQUIVO LOCAL",
  "image.select": "Selecionar radiografia",
  "image.dropzone": "Selecionar ou arrastar radiografia",
  "image.canvas":
    "Radiografia. Arraste para selecionar a mão esquerda ou use os campos de recorte abaixo.",
  "image.footer":
    '<span class="tiny-lock" aria-hidden="true">◈</span> A imagem é aberta localmente e não sai deste navegador.',

  "dropzone.title": "Arraste sua radiografia até aqui",
  "dropzone.subtitle": "ou <u>selecione um arquivo</u> no dispositivo",
  "dropzone.others": "+ outros",
  "dropzone.limit": "Arquivo original recomendado · até 100 MB",

  "viewer.rotate": "Girar imagem 90 graus",
  "viewer.rotateLabel": "Girar",
  "viewer.fullCrop": "Imagem inteira",
  "viewer.replace": "Trocar",
  "viewer.instruction":
    "Arraste sobre a imagem para recortar <strong>apenas a mão esquerda</strong>. Inclua os cinco dedos e o punho; retire o excesso de antebraço.",
  "viewer.cropDetails": "Ajustar recorte por coordenadas",
  "viewer.x0": "X inicial",
  "viewer.y0": "Y inicial",
  "viewer.x1": "X final",
  "viewer.y1": "Y final",

  "form.title": "Dados do exame",
  "form.sex": "Sexo biológico <span>obrigatório</span>",
  "form.sexPlaceholder": "Selecione",
  "form.male": "Masculino",
  "form.female": "Feminino",
  "form.sexHelp": "Usado pelo modelo para estimar a maturação óssea.",
  "form.dob": "Data de nascimento <span>opcional</span>",
  "form.examDate": "Data do exame",
  "form.chrono": "Idade na data do exame",
  "form.confirm":
    "Conferi que o recorte contém a <strong>mão esquerda em PA</strong>, com os cinco dedos completos apontando para cima e o punho visível.",
  "form.submit": 'Calcular idade óssea <span aria-hidden="true">→</span>',
  "form.cancel": "Cancelar processamento",
  "form.clinicalNote":
    "Estimativa experimental. Não é um laudo e não deve orientar decisões médicas sem avaliação profissional.",

  "progress.preparing": "Preparando…",
  "progress.local": "O processamento ocorre neste dispositivo.",
  "progress.opening": "Abrindo radiografia localmente…",
  "progress.model": "Preparando modelo local…",
  "progress.infer":
    "Três redes são executadas em sequência. Isso pode levar alguns minutos.",
  "progress.prepare": "Somente arquivos públicos do modelo serão baixados.",
  "progress.cache": "Lendo cache",
  "progress.download": "Baixando pesos",
  "progress.compute": "Calculando",
  "progress.done": "Rede concluída",
  "progress.fold": "{stage} · rede {fold}/3",

  "model.label": "Modelo local",
  "model.networks": "3 redes · WebAssembly",
  "model.initial":
    "Primeiro uso: download de ~340 MB. Depois, reutilize os pesos em cache.",
  "model.download": "Baixar modelo",
  "model.clearCache": "Limpar cache",
  "model.clearCacheTitle":
    "Apagar somente os pesos públicos salvos no navegador",
  "model.ready":
    "Download concluído. Pesos disponíveis para cálculo local; cache sujeito ao espaço do navegador.",
  "model.executed":
    "Modelo executado neste navegador. Os pesos baixados são reutilizados quando o cache está disponível.",
  "model.cleared":
    "Cache de pesos removido. O próximo cálculo precisará baixar ~340 MB.",

  "result.eyebrow": "PROCESSAMENTO CONCLUÍDO NESTE DISPOSITIVO",
  "result.title": "Resultado da estimativa",
  "result.save": "Salvar relatório ↓",
  "result.estimated": "Idade óssea estimada",
  "result.chrono": "Idade cronológica",
  "result.difference": "Diferença estimada",
  "result.differenceNote":
    "Comparação descritiva, sem classificação diagnóstica.",
  "result.note":
    "O resultado depende da qualidade, orientação e recorte da imagem. A diferença entre idades, isoladamente, não define atraso ou avanço anormal de maturação.",
  "result.details": "Detalhes da execução local",
  "review.open": "Ampliar e conferir",
  "review.title": "Confira a imagem",
  "review.close": "Fechar",
  "review.help": "Confira a mão esquerda em PA, os cinco dedos completos e o punho. Verifique se os dedos apontam para cima e se o recorte não exclui estruturas. A conferência é sua; o aplicativo não valida a anatomia.",
  "review.crop": "Recorte selecionado",
  "review.full": "Imagem inteira",
  "review.zoom": "Ampliação",
  "review.fit": "Ajustar à tela",
  "review.pan": "Imagem ampliada. Role para explorar.",
  "review.footnote": "Para girar ou ajustar o recorte, feche esta janela e use os controles da imagem. A ampliação não modifica os dados da análise.",
  "professional.entry": "Adicionar ou editar avaliação profissional · opcional",
  "professional.heading": "Comparação com avaliação profissional informada",
  "professional.help": "Se você já tem uma avaliação desta radiografia, transcreva a idade óssea e identifique sua origem. Os dados ficam apenas nesta sessão e entram no PDF depois de salvar.",
  "professional.ageLabel": "Idade óssea informada",
  "professional.differenceLabel": "Diferença: IA − avaliação informada",
  "professional.years": "Anos completos",
  "professional.months": "Meses adicionais",
  "professional.method": "Método informado",
  "professional.methodHelp": "Ex.: Greulich–Pyle, TW3 ou nome do sistema. Se ausente, escreva “não informado”.",
  "professional.source": "Profissional ou serviço de origem",
  "professional.date": "Data da avaliação",
  "professional.sameExam": "Confirmo que esta avaliação se refere à mesma radiografia e à mesma data de exame exibidas acima.",
  "professional.save": "Salvar comparação",
  "professional.remove": "Remover comparação",
  "professional.notice": "Valores transcritos pelo usuário, referentes ao mesmo exame e não autenticados pelo aplicativo. A diferença não determina qual avaliação está correta e não altera a estimativa da IA.",
  "professional.sameExamError": "Confirme que a avaliação se refere à mesma radiografia e à mesma data de exame.",
  "professional.ageError": "Informe anos completos de 0 a 20 e meses adicionais de 0 a 11, com total de até 20 anos. Use zero quando necessário.",
  "professional.fieldsError": "Informe o método (até 80 caracteres) e o profissional ou serviço de origem (até 120 caracteres).",
  "professional.dateError": "Informe uma data de avaliação válida, entre a data do exame e hoje.",
  "result.scaleNote": "Escala descritiva das idades, sem faixa de normalidade.",
  "result.networkNote":
    "A concordância entre as redes não mede a precisão individual.",
  "result.months": "{months} meses · média das três redes",
  "result.noChrono": "Não informada",
  "result.examOn": "Exame em {date}",
  "result.differenceMonths": "{sign}{months} meses",
  "result.execution":
    "{model} · revisão {revision} · ONNX FP32 · WebAssembly/CPU · {seconds} s · redes: {folds} meses · recorte: {crop} · sexo: {sex}.",

  "about.eyebrow": "TRANSPARÊNCIA POR PRINCÍPIO",
  "about.title": "O que acontece <br />com a sua imagem?",
  "about.text":
    "Ela permanece na memória desta página. <br />Ao recarregar ou fechar a aba, os dados da análise são descartados.",
  "about.reset": "Descartar análise atual ↗",
  "faq.q1": "Como a estimativa é calculada?",
  "faq.a1":
    'Três redes ConvNeXtV2 do modelo <a href="https://huggingface.co/ianpan/bone-age" target="_blank" rel="noreferrer">ianpan/bone-age</a> analisam a mão esquerda e o sexo informado. O resultado é a média das três previsões, em meses. O site aplica ajuste de histograma e dimensiona a imagem para 512 × 512 pixels.',
  "faq.q2": "Quais imagens posso abrir?",
  "faq.a2":
    "DICOM Part 10, com ou sem extensão, monocromático de 8/16 bits sem compressão ou JPEG baseline; JPEG, PNG, TIFF de uma página, WebP, BMP e AVIF. DICOM JPEG lossless, JPEG-LS, JPEG 2000 e multiframe ainda exigem exportação para um formato aceito. Prefira a radiografia original da mão esquerda em PA.",
  "faq.q3": "Funciona sem internet?",
  "faq.a3":
    "Sim, após abrir o site e concluir o download do modelo com cache disponível. A internet é usada para baixar o site e, do servidor de arquivos públicos do KlugRads, os pesos do modelo. Nenhuma imagem, data ou resultado é enviado. O navegador pode remover o cache se faltar espaço. A primeira execução pode demorar; computadores com navegador atualizado e memória disponível são mais adequados.",
  "faq.q4": "Qual é a limitação clínica?",
  "faq.a4":
    "Esta ferramenta é experimental e o modelo não é aprovado para uso clínico. O erro médio publicado no conjunto de teste não representa a margem de erro para uma pessoa. A validação técnica da conversão para ONNX não equivale a validação clínica.",

  "credits.eyebrow": "CRÉDITO DO MODELO",
  "credits.title": "O modelo de IA é de Ian Pan.",
  "credits.text":
    'A estimativa vem do modelo <a href="https://huggingface.co/ianpan/bone-age" target="_blank" rel="noreferrer">ianpan/bone-age</a>, criado e treinado por <a href="https://huggingface.co/ianpan" target="_blank" rel="noreferrer">Ian Pan</a> sobre 14.036 radiografias do <a href="https://www.rsna.org/rsnai/ai-image-challenge/rsna-pediatric-bone-age-challenge-2017" target="_blank" rel="noreferrer">RSNA Pediatric Bone Age Challenge 2017</a>, com backbone ConvNeXtV2 e licença Apache-2.0.',
  "credits.role":
    "Este site não treinou nem ajustou nada: ele converte os pesos públicos para ONNX e os executa no seu navegador. O mérito da estimativa é do autor do modelo.",

  "footer.tagline": "Ferramenta educacional — não substitui o julgamento clínico",
  "footer.by": "por",
  "footer.license": "Modelo Apache-2.0 · Código MIT",
  "klug.back": "← KlugRads",
  "klug.brandAria": "KlugRads — voltar ao app",
  "klug.crumb.rx": "Radiografia",
  "klug.crumb.calc": "Calculadoras",
  "klug.crumb.tool": "Idade óssea (IA)",
  "klug.theme": "Alternar tema claro/escuro",
  "klug.notice": "<b>Uso educativo e de teste.</b> Sem validação clínica e sem vínculo com qualquer plano pago do KlugRads. Sua imagem não sai do navegador.",
  "klug.mobile.title": "Disponível apenas em computador",
  "klug.mobile.p1": "Esta ferramenta usa <b>inteligência artificial que roda dentro do seu próprio navegador</b>. É assim que a sua imagem nunca sai do seu aparelho: não existe servidor que a receba.",
  "klug.mobile.p2": "Para isso, o navegador precisa <b>baixar os modelos de IA (mais de 300 MB)</b> e processar a radiografia localmente, o que exige bastante memória e processamento. No celular isso consumiria muitos dados móveis e bateria, e o cálculo poderia travar ou falhar.",
  "klug.mobile.p3": "Por esse motivo, por enquanto o cálculo de idade óssea só está disponível em <b>computador (desktop ou notebook)</b>. Abra esta mesma página no computador para usar.",
  "klug.mobile.back": "Voltar ao KlugRads",
  "klug.credit": "Créditos: modelo <a href=\"https://huggingface.co/ianpan/bone-age\" target=\"_blank\" rel=\"noreferrer\">ianpan/bone-age</a>, de <a href=\"https://huggingface.co/ianpan\" target=\"_blank\" rel=\"noreferrer\">Ian Pan</a> (Apache-2.0) · aplicativo de <a href=\"https://github.com/feliperun/bone-age\" target=\"_blank\" rel=\"noreferrer\">@feliperun</a> (MIT) · <a href=\"/licencas/ianpan-bone-age-Apache-2.0.txt\">licença do modelo</a> · <a href=\"/licencas/feliperun-bone-age-MIT.txt\">licença do aplicativo</a>",
  "date.format": "{day}/{month}/{year}",

  "age.years": "{years} {yearWord} e {months} {monthWord}",
  "age.year": "ano",
  "age.yearPlural": "anos",
  "age.month": "mês",
  "age.monthPlural": "meses",
  "sex.male": "masculino",
  "sex.female": "feminino",

  "msg.checkDates": "Verifique as datas",
  "msg.dicomFilled":
    "Os campos disponíveis foram preenchidos pelo DICOM. Confira os dados e selecione a mão esquerda antes de calcular.",
  "msg.fieldsCleared":
    "Os dados do exame foram limpos para a nova imagem. Informe sexo e data de nascimento novamente.",
  "msg.openFailed": "Não foi possível abrir este arquivo.",
  "msg.oneFile": "Selecione uma radiografia por vez.",
  "msg.workerStopped":
    "O worker foi interrompido. Feche outras abas para liberar memória e tente novamente.",
  "msg.readyNotice":
    "Download concluído. Você já pode abrir uma radiografia e executar o modelo.",
  "msg.cancelled":
    "Processamento cancelado. Nenhum resultado parcial foi apresentado.",
  "msg.cacheCleared":
    "Os pesos do modelo foram removidos do cache deste navegador.",
  "msg.cacheBlocked": "O navegador não permite acessar o cache neste modo.",
  "msg.updateAvailable": "Uma nova versão do site está disponível.",
  "msg.updateNow": "Atualizar agora",
  "msg.noOffline":
    "O navegador não habilitou o modo offline. A execução local continua disponível com conexão.",

  "worker.noCache":
    "Cache indisponível neste navegador. O cálculo continua localmente, mas o uso offline não estará disponível.",
  "worker.noSpace":
    "Sem espaço para cache. O cálculo continua; os pesos precisarão ser baixados no próximo uso.",
  "worker.downloadFailed":
    "Falha ao baixar rede {fold} ({status}). Verifique a conexão e tente novamente.",
  "worker.badSize": "Arquivo do modelo tem tamanho inesperado.",
  "worker.unavailable": "O modelo não está disponível nesta instalação.",
  "worker.badManifest": "Manifesto do modelo inválido.",
  "worker.noReference": "Referência de pré-processamento indisponível.",
  "worker.noContrast":
    "O recorte não tem contraste. Selecione a mão na radiografia.",

  "worker.integrity":
    "Verificação de integridade do modelo falhou. Tente baixar novamente.",
  "worker.badOutput": "A rede retornou um resultado inválido.",
  "worker.failed":
    "Não foi possível executar o modelo. O navegador pode estar sem memória. Feche outras abas e tente novamente.",
  "decode.noPixels": "DICOM sem dados de imagem.",
  "decode.truncated": "Dados DICOM truncados.",
  "decode.tiffEmpty": "TIFF sem imagem.",
  "processing.emptyHistogram": "Histograma vazio.",
  "decode.badSize": "Dimensões inválidas ou imagem maior que 24 megapixels.",
  "decode.dicomUnreadable":
    "Não foi possível ler o DICOM. Use um arquivo DICOM Part 10 original, PNG ou TIFF.",
  "decode.dicomMultiframe":
    "DICOM multiframe: exporte uma única radiografia para analisar.",
  "decode.dicomMonochrome": "Use um DICOM monocromático de radiografia da mão.",
  "decode.dicomChannels": "DICOM com múltiplos canais não suportado.",
  "decode.dicomJpegSize": "Dimensões DICOM e JPEG incompatíveis.",
  "decode.dicomBits":
    "DICOM precisa ter pixels inteiros de 8 ou 16 bits com alinhamento padrão.",
  "decode.dicomCompression":
    "Compressão DICOM não suportada ({transfer}). Exporte sem compressão, ou use PNG/TIFF. JPEG lossless, JPEG-LS e JPEG 2000 ainda não são aceitos.",
  "decode.unknownTransfer": "desconhecida",
  "decode.dicomLut": "VOI LUT com profundidade não suportada.",
  "decode.dicomWindow": "Janela DICOM inválida.",
  "decode.empty": "A radiografia está vazia ou tem contraste constante.",
  "decode.tooLarge": "O limite por imagem é 100 MB.",
  "decode.emptyFile": "O arquivo está vazio.",
  "decode.tiffPages":
    "TIFF com múltiplas páginas: exporte apenas a radiografia desejada.",
  "decode.unknownFormat":
    "Formato não reconhecido. Use DICOM, PNG, JPEG, TIFF, WebP, BMP ou AVIF.",
  "decode.failed":
    "Não foi possível decodificar a imagem. Confira o formato e o tamanho.",

  "processing.cropTooSmall":
    "Selecione uma região de pelo menos 32 × 32 pixels, dentro da imagem.",
  "processing.badReference": "Referência de histograma inválida.",
  "processing.badDates": "Informe datas válidas.",
  "processing.birthAfterExam": "O nascimento não pode ser posterior ao exame.",
  "processing.tooOld":
    "O modelo é pediátrico. Verifique as datas (idade até 20 anos).",

  "pdf.productName": "KlugRads · idade óssea",
  "pdf.title": "Relatório de idade óssea",
  "pdf.subtitle":
    "Estimativa gerada localmente no navegador, a partir de uma radiografia de mão esquerda.",
  "pdf.generatedOn": "Gerado em {datetime}",
  "pdf.ensembleCaption": "média das três redes",
  "pdf.sexLabel": "Sexo biológico",
  "pdf.dobLabel": "Data de nascimento",
  "pdf.fileLabel": "Arquivo de origem",
  "pdf.imageSizeLabel": "Imagem analisada",
  "pdf.radiograph": "Radiografia analisada",
  "pdf.radiographCaption":
    "Recorte orientado, antes do ajuste de histograma e do redimensionamento. A imagem não foi enviada a nenhum servidor.",
  "pdf.technical": "Execução",
  "pdf.ensembleMean": "Média do ensemble",
  "pdf.networkOutput": "Rede {index}",
  "pdf.runtime": "Tempo total",
  "pdf.cropLabel": "Recorte [x0, y0, x1, y1]",
  "pdf.modelLabel": "Modelo",
  "pdf.revisionLabel": "Revisão",
  "pdf.environmentLabel": "Ambiente",
  "pdf.environmentValue": "ONNX FP32 · WebAssembly/CPU · navegador",
  "pdf.preprocessingLabel": "Pré-processamento",
  "pdf.preprocessingValue":
    "Decodificação local, recorte manual, ajuste de histograma, interpolação bilinear, padding 512×512.",
  "pdf.references": "Referências e créditos",
  "pdf.refModel":
    "Modelo ianpan/bone-age, de Ian Pan — huggingface.co/ianpan/bone-age. Estimativa por IA a partir da imagem e do sexo informado; não é uma leitura manual pelos métodos Greulich–Pyle ou Tanner–Whitehouse.",
  "pdf.refArchitecture":
    "Arquitetura ConvNeXtV2-tiny, ensemble de três redes, 84,1 M de parâmetros.",
  "pdf.refDataset":
    "Treinado em 14.036 radiografias de mão do RSNA Pediatric Bone Age Challenge 2017; erro médio publicado de 4,16 meses no conjunto de teste.",
  "pdf.refLicense":
    "Pesos redistribuídos sob a Apache License 2.0, com aviso de modificação: conversão para ONNX, sem retreinamento.",
  "pdf.refApplication":
    "Código do aplicativo: feliperun/bone-age, licença MIT — github.com/feliperun/bone-age",
  "pdf.disclaimerHeading": "Aviso",
  "pdf.pageNumber": "{page}/{total}",
  "pdf.secondsValue": "{seconds} s",
  "pdf.cropValue": "{x0}, {y0}, {x1}, {y1}",
  "pdf.imageSizeValue": "{width} × {height} px",
  "pdf.siteName": "klugrads.com",
  "pdf.siteUrl": "https://klugrads.com/idade-ossea",
  "pdf.promoEyebrow": "USO EDUCATIVO · PROCESSAMENTO LOCAL",
  "pdf.promoHeading": "Calcule a idade óssea de outra radiografia",
  "pdf.promoText":
    "Abra a imagem no navegador, recorte a mão esquerda e receba a estimativa em minutos. Nenhum arquivo sai do seu dispositivo.",
  "pdf.promoQr": "Aponte a câmera",
  "msg.reportFailed":
    "Não foi possível gerar o PDF. Tente novamente ou use outra aba do navegador.",

  "report.filename": "klugrads-idade-ossea",
  "report.notComputed": "não calculada",
  "report.monthsValue": "{months} meses",
  "report.disclaimer":
    "Resultado experimental. Não é um laudo nem estabelece diagnóstico. O erro médio publicado e a concordância entre redes não são um intervalo de confiança individual. A interpretação clínica depende de referências por sexo e idade, crescimento, puberdade e histórico do paciente; esses dados clínicos não são avaliados pelo modelo.",
  "report.privacy": "Nenhuma imagem ou dado do exame foi enviado a servidores.",
} as const;

export type Key = keyof typeof pt;

const en: Record<Key, string> = {
  "app.title": "Bone age (AI) — KlugRads",
  "app.description":
    "Experimental bone age estimation processed locally in the browser. Your radiographs stay on your device.",
  "app.htmlLang": "en",
  "app.locale": "en-US",

  "nav.brand": "KlugRads, back to the app",
  "nav.label": "Navigation",
  "nav.how": "How it works",
  "nav.source": 'Open source <span aria-hidden="true">↗</span>',
  "nav.language": "Language",
  "nav.langPt": "Português",
  "nav.langEn": "English",

  "hero.eyebrow": "ARTIFICIAL INTELLIGENCE · LOCAL PROCESSING",
  "hero.title": "Bone age. <br /><span>In your browser.</span>",
  "hero.description":
    "From the radiograph to a bone maturation estimate. <br />Your files stay with you, start to finish.",
  "hero.localTitle": "Your device. Your data.",
  "hero.localText": "No server uploads. <br />No tracking of your images.",

  "workspace.title": "New analysis",
  "workspace.badge": "EXPERIMENTAL USE",
  "workspace.label": "Radiograph and examination data",
  "steps.label": "Analysis steps",
  "steps.one": "<span>01</span> Open radiograph",
  "steps.two": "<span>02</span> Prepare image",
  "steps.three": "<span>03</span> Estimate bone age",

  "image.title": "Left hand radiograph",
  "image.localFile": "LOCAL FILE",
  "image.select": "Select radiograph",
  "image.dropzone": "Select or drag a radiograph",
  "image.canvas":
    "Radiograph. Drag to select the left hand, or use the crop fields below.",
  "image.footer":
    '<span class="tiny-lock" aria-hidden="true">◈</span> The image is opened locally and never leaves this browser.',

  "dropzone.title": "Drag your radiograph here",
  "dropzone.subtitle": "or <u>choose a file</u> from your device",
  "dropzone.others": "+ others",
  "dropzone.limit": "Original file recommended · up to 100 MB",

  "viewer.rotate": "Rotate image 90 degrees",
  "viewer.rotateLabel": "Rotate",
  "viewer.fullCrop": "Whole image",
  "viewer.replace": "Replace",
  "viewer.instruction":
    "Drag over the image to crop <strong>the left hand only</strong>. Include all five fingers and the wrist; leave out the excess forearm.",
  "viewer.cropDetails": "Adjust the crop by coordinates",
  "viewer.x0": "Start X",
  "viewer.y0": "Start Y",
  "viewer.x1": "End X",
  "viewer.y1": "End Y",

  "form.title": "Examination data",
  "form.sex": "Biological sex <span>required</span>",
  "form.sexPlaceholder": "Select",
  "form.male": "Male",
  "form.female": "Female",
  "form.sexHelp": "Used by the model to estimate bone maturation.",
  "form.dob": "Date of birth <span>optional</span>",
  "form.examDate": "Examination date",
  "form.chrono": "Age on the examination date",
  "form.confirm":
    "I confirm the crop contains the <strong>left hand in PA view</strong>, all five complete fingers pointing upward and the wrist visible.",
  "form.submit": 'Estimate bone age <span aria-hidden="true">→</span>',
  "form.cancel": "Cancel processing",
  "form.clinicalNote":
    "Experimental estimate. It is not a report and must not guide medical decisions without professional assessment.",

  "progress.preparing": "Preparing…",
  "progress.local": "Processing happens on this device.",
  "progress.opening": "Opening the radiograph locally…",
  "progress.model": "Preparing the local model…",
  "progress.infer":
    "Three networks run in sequence. This can take a few minutes.",
  "progress.prepare": "Only public model files will be downloaded.",
  "progress.cache": "Reading cache",
  "progress.download": "Downloading weights",
  "progress.compute": "Computing",
  "progress.done": "Network finished",
  "progress.fold": "{stage} · network {fold}/3",

  "model.label": "Local model",
  "model.networks": "3 networks · WebAssembly",
  "model.initial":
    "First use downloads about 340 MB. After that, the cached weights are reused.",
  "model.download": "Download model",
  "model.clearCache": "Clear cache",
  "model.clearCacheTitle":
    "Delete only the public weights stored in this browser",
  "model.ready":
    "Download complete. Weights ready for local computation; caching depends on browser storage.",
  "model.executed":
    "Model executed in this browser. Downloaded weights are reused whenever the cache is available.",
  "model.cleared":
    "Weight cache removed. The next run will need to download about 340 MB again.",

  "result.eyebrow": "PROCESSING COMPLETED ON THIS DEVICE",
  "result.title": "Estimate result",
  "result.save": "Save report ↓",
  "result.estimated": "Estimated bone age",
  "result.chrono": "Chronological age",
  "result.difference": "Estimated difference",
  "result.differenceNote":
    "Descriptive comparison, not a diagnostic classification.",
  "result.note":
    "The result depends on image quality, orientation and crop. The difference between ages, on its own, does not establish abnormally delayed or advanced maturation.",
  "result.details": "Local execution details",
  "review.open": "Enlarge and inspect",
  "review.title": "Inspect the image",
  "review.close": "Close",
  "review.help": "Check the left hand in PA, all five complete fingers and the wrist. Check that the fingers point upward and the crop excludes no structures. This is your visual check; the app does not validate anatomy.",
  "review.crop": "Selected crop",
  "review.full": "Full image",
  "review.zoom": "Zoom",
  "review.fit": "Fit to screen",
  "review.pan": "Enlarged image. Scroll to explore.",
  "review.footnote": "To rotate or adjust the crop, close this window and use the image controls. Zooming does not change the analysis data.",
  "professional.entry": "Add or edit a professional assessment · optional",
  "professional.heading": "Comparison with supplied professional assessment",
  "professional.help": "If you have an assessment of this radiograph, enter its bone age and identify its source. These data stay in this session and are included in the PDF after saving.",
  "professional.ageLabel": "Supplied bone age",
  "professional.differenceLabel": "Difference: AI − supplied assessment",
  "professional.years": "Whole years",
  "professional.months": "Additional months",
  "professional.method": "Reported method",
  "professional.methodHelp": "E.g. Greulich–Pyle, TW3 or the system name. If absent, enter “not provided”.",
  "professional.source": "Source professional or service",
  "professional.date": "Assessment date",
  "professional.sameExam": "I confirm this assessment refers to the same radiograph and examination date shown above.",
  "professional.save": "Save comparison",
  "professional.remove": "Remove comparison",
  "professional.notice": "User-transcribed values for the same examination, not authenticated by the app. The difference does not establish which assessment is correct and does not change the AI estimate.",
  "professional.sameExamError": "Confirm the assessment refers to the same radiograph and examination date.",
  "professional.ageError": "Enter whole years from 0 to 20 and additional months from 0 to 11, totalling no more than 20 years. Enter zero where needed.",
  "professional.fieldsError": "Enter the method (up to 80 characters) and source professional or service (up to 120 characters).",
  "professional.dateError": "Enter a valid assessment date between the examination date and today.",
  "result.scaleNote":
    "Descriptive age scale, without a normal reference range.",
  "result.networkNote":
    "Agreement between networks does not measure individual accuracy.",
  "result.months": "{months} months · mean of the three networks",
  "result.noChrono": "Not provided",
  "result.examOn": "Examined on {date}",
  "result.differenceMonths": "{sign}{months} months",
  "result.execution":
    "{model} · revision {revision} · ONNX FP32 · WebAssembly/CPU · {seconds} s · networks: {folds} months · crop: {crop} · sex: {sex}.",

  "about.eyebrow": "TRANSPARENCY BY PRINCIPLE",
  "about.title": "What happens <br />to your image?",
  "about.text":
    "It stays in this page's memory. <br />Reloading or closing the tab discards the analysis data.",
  "about.reset": "Discard current analysis ↗",
  "faq.q1": "How is the estimate computed?",
  "faq.a1":
    'Three ConvNeXtV2 networks from the <a href="https://huggingface.co/ianpan/bone-age" target="_blank" rel="noreferrer">ianpan/bone-age</a> model analyse the left hand and the sex you provide. The result is the mean of the three predictions, in months. The site applies histogram matching and resizes the image to 512 × 512 pixels.',
  "faq.q2": "Which images can I open?",
  "faq.a2":
    "DICOM Part 10, with or without an extension, monochrome 8/16-bit uncompressed or baseline JPEG; JPEG, PNG, single-page TIFF, WebP, BMP and AVIF. DICOM JPEG lossless, JPEG-LS, JPEG 2000 and multiframe still require exporting to a supported format. Prefer the original left-hand PA radiograph.",
  "faq.q3": "Does it work without internet?",
  "faq.a3":
    "Yes, once the site is open and the model download has finished with caching available. The internet is used to download the site and, from KlugRads's public file server, the model weights. No image, date or result is ever sent. The browser may drop the cache when storage runs low. The first run can be slow; an up-to-date desktop browser with free memory works best.",
  "faq.q4": "What is the clinical limitation?",
  "faq.a4":
    "This tool is experimental and the model is not approved for clinical use. The published mean error on the test set is not the margin of error for an individual. Technical validation of the ONNX conversion is not clinical validation.",

  "credits.eyebrow": "MODEL CREDIT",
  "credits.title": "The AI model is Ian Pan's.",
  "credits.text":
    'The estimate comes from the <a href="https://huggingface.co/ianpan/bone-age" target="_blank" rel="noreferrer">ianpan/bone-age</a> model, created and trained by <a href="https://huggingface.co/ianpan" target="_blank" rel="noreferrer">Ian Pan</a> on 14,036 radiographs from the <a href="https://www.rsna.org/rsnai/ai-image-challenge/rsna-pediatric-bone-age-challenge-2017" target="_blank" rel="noreferrer">RSNA Pediatric Bone Age Challenge 2017</a>, with a ConvNeXtV2 backbone and the Apache-2.0 licence.',
  "credits.role":
    "This site trained and tuned nothing: it converts the public weights to ONNX and runs them in your browser. Credit for the estimate belongs to the model's author.",

  "footer.tagline": "Educational tool — does not replace clinical judgment",
  "footer.by": "by",
  "footer.license": "Model Apache-2.0 · Code MIT",
  "klug.back": "← KlugRads",
  "klug.brandAria": "KlugRads — back to the app",
  "klug.crumb.rx": "Radiography",
  "klug.crumb.calc": "Calculators",
  "klug.crumb.tool": "Bone age (AI)",
  "klug.theme": "Toggle light/dark theme",
  "klug.notice": "<b>Educational and testing use.</b> Not clinically validated and not tied to any paid KlugRads plan. Your image never leaves the browser.",
  "klug.mobile.title": "Available on computers only",
  "klug.mobile.p1": "This tool uses <b>artificial intelligence that runs inside your own browser</b>. That is how your image never leaves your device: there is no server that receives it.",
  "klug.mobile.p2": "To do that, the browser must <b>download the AI models (over 300 MB)</b> and process the radiograph locally, which takes a lot of memory and processing power. On a phone this would use a lot of mobile data and battery, and the calculation could freeze or fail.",
  "klug.mobile.p3": "For this reason, bone age estimation is currently available only on a <b>computer (desktop or laptop)</b>. Open this same page on a computer to use it.",
  "klug.mobile.back": "Back to KlugRads",
  "klug.credit": "Credits: model <a href=\"https://huggingface.co/ianpan/bone-age\" target=\"_blank\" rel=\"noreferrer\">ianpan/bone-age</a> by <a href=\"https://huggingface.co/ianpan\" target=\"_blank\" rel=\"noreferrer\">Ian Pan</a> (Apache-2.0) · application by <a href=\"https://github.com/feliperun/bone-age\" target=\"_blank\" rel=\"noreferrer\">@feliperun</a> (MIT) · <a href=\"/licencas/ianpan-bone-age-Apache-2.0.txt\">model licence</a> · <a href=\"/licencas/feliperun-bone-age-MIT.txt\">application licence</a>",
  "date.format": "{month}/{day}/{year}",

  "age.years": "{years} {yearWord} and {months} {monthWord}",
  "age.year": "year",
  "age.yearPlural": "years",
  "age.month": "month",
  "age.monthPlural": "months",
  "sex.male": "male",
  "sex.female": "female",

  "msg.checkDates": "Check the dates",
  "msg.dicomFilled":
    "The available fields were filled in from the DICOM. Check the data and select the left hand before estimating.",
  "msg.fieldsCleared":
    "The examination data was cleared for the new image. Enter sex and date of birth again.",
  "msg.openFailed": "This file could not be opened.",
  "msg.oneFile": "Select one radiograph at a time.",
  "msg.workerStopped":
    "The worker stopped. Close other tabs to free memory and try again.",
  "msg.readyNotice":
    "Download complete. You can now open a radiograph and run the model.",
  "msg.cancelled": "Processing cancelled. No partial result was presented.",
  "msg.cacheCleared":
    "The model weights were removed from this browser's cache.",
  "msg.cacheBlocked": "The browser does not allow cache access in this mode.",
  "msg.updateAvailable": "A new version of the site is available.",
  "msg.updateNow": "Update now",
  "msg.noOffline":
    "The browser did not enable offline mode. Local execution still works while online.",

  "worker.noCache":
    "Cache unavailable in this browser. Computation continues locally, but offline use will not be available.",
  "worker.noSpace":
    "No space for the cache. Computation continues; the weights will have to be downloaded again next time.",
  "worker.downloadFailed":
    "Failed to download network {fold} ({status}). Check your connection and try again.",
  "worker.badSize": "The model file has an unexpected size.",
  "worker.unavailable": "The model is not available in this installation.",
  "worker.badManifest": "Invalid model manifest.",
  "worker.noReference": "Preprocessing reference unavailable.",
  "worker.noContrast":
    "The crop has no contrast. Select the hand in the radiograph.",

  "worker.integrity":
    "The model integrity check failed. Try downloading it again.",
  "worker.badOutput": "The network returned an invalid result.",
  "worker.failed":
    "The model could not be run. The browser may be out of memory. Close other tabs and try again.",
  "decode.noPixels": "DICOM without image data.",
  "decode.truncated": "Truncated DICOM data.",
  "decode.tiffEmpty": "TIFF without an image.",
  "processing.emptyHistogram": "Empty histogram.",
  "decode.badSize": "Invalid dimensions, or image larger than 24 megapixels.",
  "decode.dicomUnreadable":
    "The DICOM could not be read. Use an original DICOM Part 10 file, PNG or TIFF.",
  "decode.dicomMultiframe":
    "Multiframe DICOM: export a single radiograph to analyse.",
  "decode.dicomMonochrome": "Use a monochrome DICOM of a hand radiograph.",
  "decode.dicomChannels": "Multi-channel DICOM is not supported.",
  "decode.dicomJpegSize": "DICOM and JPEG dimensions do not match.",
  "decode.dicomBits":
    "DICOM must have 8- or 16-bit integer pixels with standard alignment.",
  "decode.dicomCompression":
    "Unsupported DICOM compression ({transfer}). Export it uncompressed, or use PNG/TIFF. JPEG lossless, JPEG-LS and JPEG 2000 are not accepted yet.",
  "decode.unknownTransfer": "unknown",
  "decode.dicomLut": "VOI LUT with unsupported depth.",
  "decode.dicomWindow": "Invalid DICOM window.",
  "decode.empty": "The radiograph is empty or has constant contrast.",
  "decode.tooLarge": "The limit is 100 MB per image.",
  "decode.emptyFile": "The file is empty.",
  "decode.tiffPages":
    "Multi-page TIFF: export only the radiograph you want to analyse.",
  "decode.unknownFormat":
    "Format not recognised. Use DICOM, PNG, JPEG, TIFF, WebP, BMP or AVIF.",
  "decode.failed":
    "The image could not be decoded. Check the format and the size.",

  "processing.cropTooSmall":
    "Select a region of at least 32 × 32 pixels, inside the image.",
  "processing.badReference": "Invalid histogram reference.",
  "processing.badDates": "Enter valid dates.",
  "processing.birthAfterExam": "Birth cannot be later than the examination.",
  "processing.tooOld":
    "The model is paediatric. Check the dates (age up to 20 years).",

  "pdf.productName": "KlugRads · bone age",
  "pdf.title": "Bone age report",
  "pdf.subtitle":
    "Estimate produced locally in the browser, from a left-hand radiograph.",
  "pdf.generatedOn": "Generated on {datetime}",
  "pdf.ensembleCaption": "mean of the three networks",
  "pdf.sexLabel": "Biological sex",
  "pdf.dobLabel": "Date of birth",
  "pdf.fileLabel": "Source file",
  "pdf.imageSizeLabel": "Analysed image",
  "pdf.radiograph": "Analysed radiograph",
  "pdf.radiographCaption":
    "Oriented crop, before histogram matching and resizing. The image was never sent to a server.",
  "pdf.technical": "Execution",
  "pdf.ensembleMean": "Ensemble mean",
  "pdf.networkOutput": "Network {index}",
  "pdf.runtime": "Total time",
  "pdf.cropLabel": "Crop [x0, y0, x1, y1]",
  "pdf.modelLabel": "Model",
  "pdf.revisionLabel": "Revision",
  "pdf.environmentLabel": "Environment",
  "pdf.environmentValue": "ONNX FP32 · WebAssembly/CPU · browser",
  "pdf.preprocessingLabel": "Preprocessing",
  "pdf.preprocessingValue":
    "Local decoding, manual crop, histogram matching, bilinear interpolation, 512×512 padding.",
  "pdf.references": "References and credits",
  "pdf.refModel":
    "Model ianpan/bone-age, by Ian Pan — huggingface.co/ianpan/bone-age. AI estimate from the image and the supplied sex; not a manual Greulich–Pyle or Tanner–Whitehouse assessment.",
  "pdf.refArchitecture":
    "ConvNeXtV2-tiny architecture, three-network ensemble, 84.1M parameters.",
  "pdf.refDataset":
    "Trained on 14,036 hand radiographs from the RSNA Pediatric Bone Age Challenge 2017; published mean absolute error of 4.16 months on the test set.",
  "pdf.refLicense":
    "Weights redistributed under the Apache License 2.0, with a modification notice: converted to ONNX, not retrained.",
  "pdf.refApplication":
    "Application code: feliperun/bone-age, MIT licence — github.com/feliperun/bone-age",
  "pdf.disclaimerHeading": "Notice",
  "pdf.pageNumber": "{page}/{total}",
  "pdf.secondsValue": "{seconds} s",
  "pdf.cropValue": "{x0}, {y0}, {x1}, {y1}",
  "pdf.imageSizeValue": "{width} × {height} px",
  "pdf.siteName": "klugrads.com",
  "pdf.siteUrl": "https://klugrads.com/idade-ossea",
  "pdf.promoEyebrow": "EDUCATIONAL USE · LOCAL PROCESSING",
  "pdf.promoHeading": "Estimate bone age from another radiograph",
  "pdf.promoText":
    "Open the image in the browser, crop the left hand and get the estimate in minutes. No file ever leaves your device.",
  "pdf.promoQr": "Point your camera",
  "msg.reportFailed":
    "The PDF could not be generated. Try again, or use another browser tab.",

  "report.filename": "klugrads-bone-age",
  "report.notComputed": "not computed",
  "report.monthsValue": "{months} months",
  "report.disclaimer":
    "Experimental result. It is not a medical report and establishes no diagnosis. The published mean error and agreement between networks are not an individual confidence interval. Clinical interpretation depends on sex- and age-specific references, growth, puberty and patient history; the model does not assess this clinical context.",
  "report.privacy": "No image or examination datum was sent to any server.",
};

export const dictionaries: Record<Lang, Record<Key, string>> = { pt, en };

const isLang = (value: unknown): value is Lang =>
  LANGUAGES.includes(value as Lang);

/** Stored choice first, then the browser's languages; Portuguese only on a pt match. */
export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE);
    if (isLang(stored)) return stored;
  } catch {
    /* Storage can be blocked; fall through to the browser languages. */
  }
  for (const tag of navigator.languages?.length
    ? navigator.languages
    : [navigator.language]) {
    const code = tag?.toLowerCase().split("-")[0];
    if (isLang(code)) return code;
  }
  return "en";
}

let current: Lang = "pt";
export const lang = () => current;
export function setLang(value: Lang) {
  current = value;
}
export function t(key: Key, vars?: Record<string, string | number>): string {
  const text = dictionaries[current][key];
  return vars
    ? text.replace(/\{(\w+)\}/g, (match, name) =>
        name in vars ? String(vars[name]) : match,
      )
    : text;
}
