/* =========================================================================
   KlugRads — Protocolos de Tomografia Computadorizada
   ---------------------------------------------------------------------------
   Conteúdo enviado pelo usuário (diretrizes do serviço), organizado e
   redigido no padrão KlugRads. Cada protocolo entra no catálogo CALCS com
   kind:'proto' (aparece em TC → Protocolos, na busca e nos favoritos).
   Campos: g grupo (subespecialidade) · t título · ind indicação ·
     fases [..] sequência de aquisição · tec [..] técnica/contraste ·
     pts [..] pontos-chave · arm [..] armadilhas · rel [[id,nome]] calculadoras
   Para acrescentar um protocolo: incluir um objeto em PROTO_TC.
   ========================================================================= */

const PROTO_TC_GRUPOS = [
  {id:'gu',   name:'Genitourinário',     badge:'GU'},
  {id:'gi',   name:'Gastrointestinal',   badge:'GI'},
  {id:'card', name:'Cardíaco e Tórax',   badge:'CT'},
  {id:'vasc', name:'Vascular',           badge:'VA'},
  {id:'msk',  name:'Musculoesquelético', badge:'ME'},
];

const PROTO_TC = [
  /* ===================== GENITOURINÁRIO ===================== */
  {id:'adrenal', g:'gu', t:'Adrenal',
   ind:'Lesão adrenal incidental (ex.: 3 cm) em paciente sem neoplasia conhecida e sem quadro clínico sugestivo de hiperfunção.',
   fases:['Sem contraste','Portal (60 s)','Tardia (15 min)'],
   tec:['Fase sem contraste primeiro: lesão bem definida com até 10 HU é adenoma e dispensa contraste.',
        'Se > 10 HU: contraste iodado IV (100 mL) com aquisições aos 60 segundos e aos 15 minutos.',
        'Calcular o washout: absoluto ≥ 60% caracteriza adenoma pobre em lipídios.'],
   pts:['Objetivo do estudo: confirmar ou afastar adenoma.',
        'Washout absoluto = (HU 60 s − HU 15 min) ÷ (HU 60 s − HU sem contraste) × 100.'],
   arm:['Realce acima de 120 HU aos 60 s: suspeitar de feocromocitoma, mesmo com washout favorável. Feocromocitomas podem realçar até 170–190 HU e ter washout > 60%.'],
   rel:[['adrenal-tc','Washout adrenal (TC)']]},

  {id:'fistula-colovesical', g:'gu', t:'Fístula colovesical',
   ind:'Pesquisa de fístula entre a bexiga e o cólon.',
   fases:['Sem contraste','Com contraste','Pós-drenagem'],
   tec:['Contraste retal ou instilação vesical: 30 mL de iodixanol diluídos em 500 mL de soro fisiológico.',
        'Cobertura: acima das cristas ilíacas até abaixo da bexiga.'],
   pts:['O contraste retal costuma ser a técnica mais bem-sucedida para mostrar o trajeto e ajudar no planejamento cirúrgico.',
        'A causa mais comum é a diverticulite.',
        'A fase sem contraste afasta corpos estranhos e materiais de alta densidade que simulam contraste.']},

  {id:'hematuria', g:'gu', t:'Hematúria',
   ind:'Investigação de hematúria.',
   fases:['Sem contraste','Arterial','Venosa','Tardia (excretora)'],
   tec:['Aquisição multifásica.','Reconstruções 3D / MIP para pelve renal e ureteres.'],
   pts:['Realce intenso na fase corticomedular (aproximadamente > 110 HU) sugere carcinoma de células claras; realce discreto (aproximadamente < 90 HU) sugere carcinoma papilífero — os limites variam entre os estudos.',
        'A fase tardia é essencial para o carcinoma urotelial (células transicionais).']},

  {id:'doador-renal', g:'gu', t:'Doador renal',
   ind:'Avaliação de potencial doador renal.',
   fases:['Sem contraste','Arterial','Venosa','Excretora'],
   tec:['Reconstruções 3D (VR e MIP).'],
   pts:['O mapeamento 3D é fundamental para contar artérias e veias renais e identificar artérias acessórias.']},

  {id:'renal-inflamatoria', g:'gu', t:'Doença inflamatória renal',
   ind:'Suspeita de inflamação ou infecção renal.',
   fases:['Sem contraste','Venosa (70–80 s)'],
   tec:['Cobertura do diafragma à sínfise púbica.'],
   pts:['A fase sem contraste pesquisa cálculos.',
        'Alterações inflamatórias podem ser confundidas com infartos ou tumores.']},

  {id:'massa-renal', g:'gu', t:'Massa renal',
   ind:'Avaliação de massa renal suspeita ou conhecida.',
   fases:['Sem contraste','Corticomedular / arterial (35 s)','Nefrográfica (80–100 s)','Tardia (4–5 min)'],
   tec:[],
   pts:['A fase nefrográfica (80–100 s) é a mais sensível para detectar e caracterizar massas renais.',
        'Lesões entre 20 e 70 HU na fase sem contraste são indeterminadas ("zona de perigo") e exigem o estudo contrastado.',
        'Massa sólida com realce acima de 100 HU sugere carcinoma de células claras.'],
   rel:[['bosniak-tc','Bosniak v2019 (TC)']]},

  {id:'calculo-renal', g:'gu', t:'Cálculo urinário',
   ind:'Pesquisa de litíase urinária.',
   fases:['Sem contraste'],
   tec:['Cobertura dos rins à bexiga.','Orientar o paciente a beber 500–1000 mL de água antes do exame.'],
   pts:['A água distende a bexiga.','Seguir o trajeto do ureter ajuda a diferenciar cálculo de flebólito.']},

  {id:'urotelial', g:'gu', t:'Carcinoma urotelial do trato superior (uro-TC)',
   ind:'Suspeita de carcinoma urotelial (células transicionais) do sistema coletor ou ureter.',
   fases:['Sem contraste','Corticomedular (30–35 s)','Nefrográfica (80–100 s)','Excretora (5–8 min)'],
   tec:['Hidratação oral para otimizar a distensão do sistema coletor.'],
   pts:['O sinal do "cálice amputado" reflete invasão tumoral.']},

  /* ===================== GASTROINTESTINAL ===================== */
  {id:'foi-dor', g:'gi', t:'Febre de origem indeterminada com dor abdominal',
   ind:'Febre de origem indeterminada associada a dor abdominal.',
   fases:['Venosa (70 s)'],
   tec:['Contraste oral positivo: 500–750 mL, 60 a 90 minutos antes.'],
   pts:['O objetivo é procurar foco infeccioso ou neoplásico em qualquer órgão.']},

  {id:'massa-gastrica', g:'gi', t:'Massa gástrica',
   ind:'Dor, anemia ou suspeita de sangramento digestivo alto.',
   fases:['Arterial','Venosa'],
   tec:['Distensão máxima do estômago com água (contraste neutro) ou contraste positivo.','Contraste IV: 100–110 mL.'],
   pts:['A água é a melhor opção para detectar úlceras e sangramento ativo.'],
   arm:['A distensão inadequada é a principal causa de erro.']},

  {id:'estadiamento-gastrico', g:'gi', t:'Estadiamento do adenocarcinoma gástrico',
   ind:'Estadiamento de adenocarcinoma gástrico.',
   fases:['Sem contraste (distensão)','Arterial tardia (40 s)','Portal (70 s)','Tardia (180 s)'],
   tec:[],
   pts:['A fase arterial tardia é a que define o estádio T.','A espessura normal da parede gástrica é de até 5 mm.']},

  {id:'massa-hepatica', g:'gi', t:'Massa hepática (incidental ou suspeita)',
   ind:'Caracterização de lesões hepáticas.',
   fases:['Arterial','Venosa','Tardia'],
   tec:['Contraste IV: 100–120 mL a 4–5 mL/s.'],
   pts:['Analisar o padrão de realce: hemangioma com preenchimento centrípeto tardio; HNF com realce arterial e cicatriz central; hepatocarcinoma com neovascularização arterial.']},

  {id:'sangramento-gi', g:'gi', t:'Sangramento digestivo (alto e baixo)',
   ind:'Suspeita de hemorragia digestiva.',
   fases:['Sem contraste','Arterial (25–35 s / bolus tracking)','Portal (60–70 s)'],
   tec:['Não usar contraste oral (positivo ou água): o contraste positivo simula extravasamento e a água dilui e pode mascarar o sangramento.',
        'Fase sem contraste para identificar material espontaneamente denso (sangue coagulado, comprimidos, clipes, contraste prévio) que simula extravasamento.'],
   pts:['O sangramento ativo aparece como contraste extravasado na fase arterial, que aumenta e muda de forma na fase portal.']},

  {id:'massa-pancreatica', g:'gi', t:'Massa pancreática',
   ind:'Suspeita de adenocarcinoma pancreático.',
   fases:['Arterial (30 s)','Venosa (70 s)'],
   tec:['Contraste oral neutro (água).','Dupla fase estrita.'],
   pts:['As fases sem contraste e tardia não acrescentam valor na detecção do adenocarcinoma.',
        'A fase venosa é crítica para avaliar o envolvimento das veias porta e mesentérica superior e pesquisar metástases hepáticas.']},

  {id:'linfoma-abdominal', g:'gi', t:'Linfoma abdominal',
   ind:'Diagnóstico ou estadiamento de linfoma.',
   fases:['Venosa (70 s)'],
   tec:['Contraste oral positivo ou água.'],
   pts:['Pode acometer vários órgãos.','O linfoma gástrico costuma ser mais volumoso que o adenocarcinoma.']},

  {id:'delgado', g:'gi', t:'Obstrução / tumor do intestino delgado',
   ind:'Identificar a causa de obstrução ou neoplasia do delgado.',
   fases:['Arterial (30 s)','Venosa (70 s)'],
   tec:['Água via oral: 750–1000 mL.'],
   pts:['Alças dilatadas (> 2,5 cm) ou com parede espessada (> 3 mm).','As reconstruções coronais são essenciais para achar o ponto de transição.']},

  {id:'trauma-abdominal', g:'gi', t:'Trauma abdominal',
   ind:'Trauma abdominal fechado ou penetrante.',
   fases:['Arterial','Venosa'],
   tec:['Avaliar também em janela óssea.'],
   pts:['A fase arterial mostra o extravasamento ativo nas vísceras maciças.','Revisar a janela óssea à procura de fraturas.']},

  {id:'colonoscopia-virtual', g:'gi', t:'Colonografia por TC (colonoscopia virtual)',
   ind:'Rastreamento de pólipos colorretais.',
   fases:['Decúbito dorsal','Decúbito ventral'],
   tec:['Preparo intestinal prévio.','Marcação das fezes com bário.','Insuflação do cólon com CO₂.'],
   pts:[]},

  /* ===================== CARDÍACO E TÓRAX ===================== */
  {id:'escore-calcio', g:'card', t:'Escore de cálcio coronariano (CAC)',
   ind:'Estratificação do risco cardiovascular em pacientes assintomáticos.',
   fases:['Sem contraste'],
   tec:['Baixa dose, com sincronização ao ECG.','Quantificação pelo método de Agatston.'],
   pts:['É a referência para predizer risco cardiovascular em assintomáticos.'],
   rel:[['mesa-cac','MESA — escore de cálcio']]},

  {id:'coronaria', g:'card', t:'Angio-TC de coronárias',
   ind:'Pesquisa de placas e estenoses coronarianas.',
   fases:['Angiográfica (bolus tracking na aorta)'],
   tec:['Controle da frequência cardíaca (cerca de 60 bpm).','Contraste IV: 60–80 mL a 5–6 mL/s.'],
   pts:[],
   rel:[['cadrads','CAD-RADS']]},

  {id:'aorta-tavr', g:'card', t:'Dissecção aórtica e planejamento de TAVR',
   ind:'Suspeita de dissecção aórtica e planejamento de implante valvar aórtico transcateter (TAVR).',
   fases:['Raiz aórtica sincronizada ao ECG','Extensão até a pelve'],
   tec:['Aquisição sincronizada (gated) da raiz da aorta.','Estender a varredura até a pelve para avaliar os acessos ilíacos e femorais.'],
   pts:[]},

  {id:'tep', g:'card', t:'Tromboembolismo pulmonar (TEP)',
   ind:'Pesquisa de trombos nas artérias pulmonares.',
   fases:['Arterial pulmonar (bolus tracking)'],
   tec:['Bolus tracking com ROI no tronco da artéria pulmonar; disparo ao atingir cerca de 100–150 HU (ajustar ao equipamento e ao protocolo do serviço).','Cortes finos de no máximo 1 mm (obrigatório).'],
   pts:['Cortes finos evitam laudos falso-negativos.']},

  {id:'nodulo-pulmonar', g:'card', t:'Nódulo pulmonar (fumantes)',
   ind:'Acompanhamento de nódulo pulmonar e rastreamento em fumantes.',
   fases:['Sem contraste'],
   tec:['Baixa dose, com cortes finos e sem contraste IV.'],
   pts:['As condutas seguem as diretrizes da Fleischner Society (nódulo incidental) e do Lung-RADS (rastreamento).'],
   rel:[['fleischner','Fleischner'],['lung-rads','Lung-RADS']]},

  {id:'massa-mediastinal', g:'card', t:'Massa mediastinal',
   ind:'Caracterização de massa mediastinal.',
   fases:['Com contraste'],
   tec:['Fase contrastada para definir o componente vascular, cístico, adiposo ou sólido.'],
   pts:[]},

  /* ===================== VASCULAR ===================== */
  {id:'aaa', g:'vasc', t:'Aneurisma da aorta abdominal (AAA)',
   ind:'Avaliação de aneurisma da aorta abdominal e planejamento cirúrgico/endovascular.',
   fases:['Arterial única (30–35 s)'],
   tec:['Cobertura do diafragma à sínfise púbica.','Reconstruções 3D.'],
   pts:['Avaliar com rigor as relações do aneurisma com as artérias viscerais e ilíacas.','O mapeamento 3D é essencial nos candidatos a tratamento.']},

  {id:'runoff', g:'vasc', t:'Angio-TC de membros inferiores (runoff)',
   ind:'Doença arterial dos membros inferiores.',
   fases:['Arterial'],
   tec:['Varredura da aorta e ilíacas até os pés.','Subtração óssea (dupla energia) é muito útil.'],
   pts:[]},

  {id:'may-thurner', g:'vasc', t:'Síndrome de May-Thurner',
   ind:'Compressão da veia ilíaca comum esquerda pela artéria ilíaca comum direita.',
   fases:['Venosa tardia (pelve)'],
   tec:['Varredura pélvica em fase venosa tardia.'],
   pts:[],
   arm:['A fase venosa precoce pode mostrar mistura de contraste que simula trombo (pseudotrombo).']},

  {id:'mals', g:'vasc', t:'Síndrome do ligamento arqueado mediano (MALS)',
   ind:'Suspeita de compressão do tronco celíaco pelo ligamento arqueado mediano.',
   fases:['Arterial em inspiração profunda'],
   tec:['Aquisição arterial obrigatoriamente em INSPIRAÇÃO PROFUNDA.'],
   pts:[],
   arm:['A aquisição em expiração acentua a compressão e pode gerar até 85% de falso-positivos.']},

  {id:'vasculites', g:'vasc', t:'Vasculites',
   ind:'Suspeita de vasculite de grandes e médios vasos.',
   fases:['Angio-TC estendida (pescoço à pelve)'],
   tec:['Cobertura do pescoço até a pelve.'],
   pts:['Procurar espessamento parietal, estenoses e aspecto em "contas de rosário".']},

  /* ===================== MUSCULOESQUELÉTICO ===================== */
  {id:'trauma-extremidades', g:'msk', t:'Trauma de extremidades',
   ind:'Suspeita de fratura articular ou complexa.',
   fases:['Sem contraste','Arterial (se suspeita de lesão vascular)'],
   tec:['Cortes finos (< 1 mm) e posicionamento rigoroso.','Contraste IV em fase arterial no trauma penetrante ou na suspeita de lesão vascular.'],
   pts:['Revisar em janela de partes moles e em algoritmo ósseo de alta resolução.','As reconstruções 3D ajudam nas fraturas complexas.']},
];

/* ---- página de um protocolo ---- */
function protoTcHTML(id){
  const p = PROTO_TC.find(x=>'tcp-'+x.id===id); if(!p) return calcListHTML();
  const gr = PROTO_TC_GRUPOS.find(g=>g.id===p.g)||{};
  const lista = a => `<ul class="ptc-ul">${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  const fases = (p.fases||[]).length
    ? `<div class="ptc-fases">${p.fases.map((f,i)=>`${i?'<span class="ptc-seta">→</span>':''}<span class="ptc-fase"><b>${i+1}</b>${esc(f)}</span>`).join('')}</div>` : '';
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">${esc(gr.name||'Protocolo')} · TC</div>
      <div class="ptc-ind"><b>Indicação:</b> ${esc(p.ind)}</div>
      ${fases ? `<div class="ptc-lbl">Aquisição</div>${fases}` : ''}
      ${(p.tec||[]).length ? `<div class="ptc-lbl">Técnica e contraste</div>${lista(p.tec)}` : ''}
    </div>
    ${(p.pts||[]).length ? `<div class="ti-card"><div class="tfg-sec-lbl">Pontos-chave</div>${lista(p.pts)}</div>` : ''}
    ${(p.arm||[]).length ? `<div class="ti-card ptc-arm"><div class="tfg-sec-lbl">Atenção</div>${lista(p.arm)}</div>` : ''}
    ${(p.rel||[]).filter(r=>findCalc(r[0])).length ? `<div class="ti-card"><div class="tfg-sec-lbl">Ferramentas relacionadas</div><div class="ti-foci" style="margin-top:8px">${p.rel.filter(r=>findCalc(r[0])).map(r=>`<div class="ti-ftog" onclick="openCalc('${r[0]}')">${esc(r[1])}</div>`).join('')}</div></div>` : ''}
    <div class="ti-legend-row" style="margin:4px 4px 0"><span class="lt">Protocolo de referência — ajuste os tempos, volumes e parâmetros ao equipamento, ao peso do paciente e às normas do seu serviço.</span></div>
  </div>`;
}

/* registra no catálogo: TC → Protocolos */
PROTO_TC.forEach(p=>{
  const gr = PROTO_TC_GRUPOS.find(g=>g.id===p.g)||{};
  CALCS.push({id:'tcp-'+p.id, modality:'tc', subspec:p.g, kind:'proto', badge:gr.badge,
    title:p.t, desc:(p.fases||[]).join(' · '), page:()=>protoTcHTML('tcp-'+p.id)});
});
