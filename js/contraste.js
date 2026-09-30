/* =========================================================================
   KlugRads — Meios de Contraste (Outras Ferramentas)
   ---------------------------------------------------------------------------
   Tópicos de referência em tabelas: classificação de reações, tratamento
   (adulto e pediátrico), fatores de risco e contraindicações, extravasamento
   e fibrose sistêmica nefrogênica.
   Fonte principal: CBR 2024 — Diretrizes para o uso de meios de contraste
   intravenosos. Ferramenta educacional: sempre seguir o protocolo local.
   ========================================================================= */

const CONTRASTE_REFS = {
  cbr: 'Colégio Brasileiro de Radiologia (CBR) — Curso AVR. Diretrizes para o uso de meios de contraste intravenosos. 2024.',
};

const CONTRASTE_TOPICS = [
 {
  id:'classificacao', title:'Classificação de reações adversas', desc:'Gravidade, mecanismo e tempo de início',
  sections:[
   {title:'Por gravidade', rows:[
    ['Gravidade','Sinais e sintomas'],
    ['Leve','Rinorreia, rouquidão; prurido, flushing, urticária limitada; taquicardia (> 20 bpm); náuseas, cólica, calor, cefaleia discreta, tontura'],
    ['Moderada','Dispneia; vômitos intensos'],
    ['Grave','Edema de laringe, broncoespasmo, cianose, parada respiratória; choque, parada cardíaca; dor torácica e abdominal, cefaleia intensa'],
   ], note:'Tabela resumida com os itens de classificação inequívoca. Angioedema, urticária extensa, edema facial, alterações da PA e da frequência cardíaca e arritmias serão incluídos após conferência com os manuais do ACR e da SPR.'},
   {title:'Por mecanismo', rows:[
    ['Tipo','Características'],
    ['Hipersensibilidade (alérgica-like / anafilactoide)','Imprevisível: reação prévia e recorrência não são consistentes. Independe da dose e da concentração. Liberação de histamina por basófilos e mastócitos.'],
    ['Quimiotóxica (fisiológica)','Relacionada à dose e à concentração do contraste (volume > 100 mL), à velocidade de injeção (> 5 mL/s) e ao local da injeção.'],
   ]},
   {title:'Por tempo de início', rows:[
    ['Tipo','Descrição'],
    ['Aguda','Surge logo após a injeção'],
    ['Tardia','Surge após a fase aguda'],
    ['Muito tardia','Surge tardiamente, após a fase tardia'],
   ], note:'O CBR classifica as reações em agudas, tardias e muito tardias; os intervalos de tempo serão acrescentados após conferência com o ACR e a SPR.'},
   {title:'Depois de reação moderada ou grave', rows:[
    ['Conduta','Detalhe'],
    ['Exames','Dosar histamina e triptase 1 e 2 horas após a injeção, se possível, e em 24 horas se o paciente estiver internado'],
    ['Encaminhamento','Alergologista 1 a 6 meses após a reação, para confirmar a alergia ao contraste, avaliar tolerância e um contraste alternativo seguro'],
   ]},
  ],
  refs:['cbr'],
 },
 {
  id:'tratamento-adulto', title:'Tratamento de reações — adulto', desc:'Conduta e doses por tipo de reação',
  alert:'Em qualquer reação moderada ou grave: acionar a equipe de emergência, manter acesso venoso e monitorizar sinais vitais. Adrenalina 1:1.000 = 1 mg/mL.',
  sections:[
   {title:'Reações cutâneas e respiratórias', rows:[
    ['Reação','Conduta'],
    ['Urticária / prurido escassos e transitórios','Tratamento de suporte, observação frequente e acesso venoso'],
    ['Urticária mais extensa','Anti-histamínico H1 oral (loratadina, fexofenadina) ou difenidramina 50 mg IM ou IV'],
    ['Urticária generalizada (grave)','Adrenalina 1 mg/mL: 0,1–0,3 mL (0,1–0,3 mg) IM'],
    ['Broncoespasmo','Assegurar vias aéreas. O₂ por máscara 6–10 L/min. β2-agonista inalatório (ex.: salbutamol, 2–3 inalações). Adrenalina 1 mg/mL: 0,1–0,3 mL (0,1–0,3 mg) IM. Se hipotenso, acionar a equipe de emergência'],
    ['Edema de glote / laringe','Acesso venoso, monitorização, O₂ 6–10 L/min. Adrenalina 1 mg/mL: 0,3–0,5 mL (0,3–0,5 mg) IM, repetir se necessário até dose total de 1 mg. Acionar a equipe de emergência'],
   ]},
   {title:'Reações cardiovasculares', rows:[
    ['Reação','Conduta'],
    ['Hipotensão isolada (PAS < 90 mmHg) ou com taquicardia (FC > 100 bpm)','Elevar os membros inferiores. O₂ 6–10 L/min. Fluidos IV rápidos: SF 0,9% ou Ringer lactato (até 1–2 L). Sem resposta: adrenalina 1 mg/mL 0,3–0,5 mL (0,3–0,5 mg) IM. Acionar a equipe de emergência'],
    ['Reação vagal (PAS < 90 mmHg e FC < 60 bpm)','Elevar os membros inferiores. O₂ 6–10 L/min. Atropina 0,6–1,0 mg IV, repetir após 3–5 min se necessário, até 3 mg no total. Fluidos IV rápidos (SF 0,9% ou Ringer lactato, até 1–2 L). Acionar a equipe de emergência'],
    ['Hipertensão','Manter acesso venoso. Captopril 25 mg VO; repetir em 1 hora se necessário'],
    ['Edema pulmonar','Acesso venoso, monitorização, vias aéreas, O₂ 6–10 L/min, decúbito elevado. Furosemida 20–40 mg IV lenta (ou 0,5–1,0 mg/kg em 2 min, máximo 40 mg). Se associado a pico hipertensivo, considerar nitrato sublingual. Acionar a equipe de emergência'],
   ]},
   {title:'Reações graves e neurológicas', rows:[
    ['Reação','Conduta'],
    ['Reação anafilactoide generalizada','Acionar a equipe de RCP. Aspirar vias aéreas se necessário. Elevar os membros inferiores se hipotenso. O₂ 6–10 L/min. Adrenalina 1 mg/mL 0,5 mL (0,5 mg) IM, repetir se necessário. Fluidos IV (SF 0,9% ou Ringer lactato). Anti-H1: difenidramina 25–50 mg IV'],
    ['Convulsão','Observar e proteger o paciente, decúbito lateral para evitar aspiração, assegurar vias aéreas (aspirar se necessário). Diazepam 5 mg IV/IM ou midazolam 0,5–1 mg IV. Acionar a equipe de emergência'],
   ]},
  ],
  refs:['cbr'],
 },
 {
  id:'tratamento-pediatrico', title:'Tratamento de reações — pediátrico', desc:'Conduta e doses por peso',
  pending:true,
  alert:'Doses pediátricas em conferência. A tabela de doses por peso da diretriz está sendo verificada contra o manual do ACR 2026 e o da SPR antes de ser publicada. Até lá, siga o protocolo do serviço.',
  sections:[
   {title:'Medidas gerais (todas as reações)', rows:[
    ['Medida','Detalhe'],
    ['Suporte','Manter acesso venoso, monitorizar continuamente e oferecer O₂ por máscara não reinalante (10–12 L/min)'],
    ['Ajuda','Chamar ajuda / equipe de emergência em qualquer reação moderada ou grave'],
    ['Extravasamento','Elevar o membro acima do nível do coração, compressa fria, remover anéis e observar. Consulta cirúrgica se houver redução da perfusão, da sensibilidade, da força ou da mobilidade articular, ou aumento progressivo da dor'],
   ]},
  ],
  refs:['cbr'],
 },
 {
  id:'risco', title:'Fatores de risco e contraindicações', desc:'Reações, função renal, metformina, pré-medicação e situações especiais',
  sections:[
   {title:'Fatores de risco para reações adversas', rows:[
    ['Grupo','Fatores'],
    ['Alergia','Reação prévia a meio de contraste; asma (risco 5 a 8 vezes maior de reação grave); atopias (medicamentos, alimentos)'],
    ['Rim e metabolismo','Doença renal; diabetes; uso de metformina; desidratação'],
    ['Endócrino','Hipertireoidismo; hiperparatireoidismo; feocromocitoma'],
    ['Hematológico e outros','Mieloma múltiplo; anemia falciforme; doença cardiovascular; doenças autoimunes'],
    ['Medicamentos','Nefrotóxicos; interleucina-2; betabloqueadores'],
   ]},
   {title:'Função renal e contraste iodado', rows:[
    ['Situação','Recomendação'],
    ['TFGe ≥ 30 mL/min/1,73 m²','Função normal a moderadamente reduzida'],
    ['TFGe < 30 mL/min/1,73 m²','Insuficiência renal grave: indicação de profilaxia'],
    ['Profilaxia (ESUR 10.0)','SF 0,9% 1 mL/kg/h por 3–4 h antes e 4–6 h depois do contraste; ou bicarbonato de sódio 1,4% 3 mL/kg/h IV 1 hora antes'],
    ['Validade da creatinina','Paciente estável: 3 meses. Internado, com lesão renal aguda ou agudização de doença renal crônica: 7 dias'],
   ]},
   {title:'Metformina', rows:[
    ['Situação','Conduta'],
    ['TFGe ≥ 30','Manter a metformina'],
    ['TFGe < 30','Suspender no dia do exame até 48 h depois; só reintroduzir se não houver alteração da função renal'],
    ['Gadolínio','Não é necessário suspender a metformina'],
   ]},
   {title:'Pré-medicação', rows:[
    ['Esquema','Detalhe'],
    ['ESUR 10.0','Não recomenda mais pré-medicação, por falta de comprovação de eficácia'],
    ['Oral — adulto (ACR, se o serviço optar)','Prednisona 50 mg VO 13, 7 e 1 hora antes + difenidramina 50 mg VO 1 hora antes'],
    ['Oral — pediátrico (ACR, se o serviço optar)','Prednisona 0,5–0,7 mg/kg VO (até 50 mg) 13, 7 e 1 hora antes + difenidramina 1,25 mg/kg VO (até 50 mg) 1 hora antes'],
    ['Injetável — adulto, urgência','Metilprednisolona 40 mg IV ou hidrocortisona 200 mg IV 1 hora antes + difenidramina 50 mg IV 1 hora antes'],
    ['No Brasil','Metilprednisolona oral e difenidramina oral não estão disponíveis. Como anti-H1 oral, usar fexofenadina ou loratadina'],
   ]},
   {title:'Situações especiais e contraindicações', rows:[
    ['Situação','Recomendação'],
    ['Gestação — iodado','Pode ser administrado quando o exame for essencial'],
    ['Gestação — gadolínio','Não recomendado em nenhuma fase da gravidez'],
    ['Lactação — gadolínio','Se usado agente de alto ou médio risco, suspender a amamentação por 24 h (armazenar o leite antes)'],
    ['Terapia com iodo radioativo','Não usar contraste iodado nos 2 meses anteriores à terapia'],
    ['FSN já diagnosticada','Não injetar gadolínio'],
    ['Acesso venoso central','Reduzir o fluxo para no máximo 2 mL/s e a concentração do contraste iodado'],
   ]},
   {title:'Intervalo entre injeções no mesmo paciente', rows:[
    ['Combinação','TFGe > 30','TFGe < 30 ou diálise'],
    ['Iodado + iodado','≥ 4 horas','≥ 48 horas'],
    ['Gadolínio + gadolínio','≥ 4 horas','≥ 7 dias'],
    ['Gadolínio + iodado','≥ 4 horas','≥ 7 dias'],
   ]},
  ],
  refs:['cbr'],
 },
 {
  id:'extravasamento', title:'Extravasamento do meio de contraste', desc:'Fatores de risco, conduta e quando chamar o cirurgião',
  sections:[
   {title:'Fatores de risco', rows:[
    ['Grupo','Fatores'],
    ['Técnica','Bomba injetora; grande volume de contraste; contraste de alta viscosidade'],
    ['Local','Membros inferiores e pequenas veias distais'],
    ['Paciente','Fragilidade venosa ou veias danificadas; insuficiência arterial; drenagem venosa ou linfática comprometida; obesidade'],
   ]},
   {title:'Conduta', rows:[
    ['Etapa','Como fazer'],
    ['Imediato','Elevar o membro afetado acima do nível do coração'],
    ['Crioterapia','Compressa fria local por 15–20 minutos. Manter após a alta: 3 vezes ao dia por cerca de 3 dias'],
    ['Observação','Observar a evolução por 2–4 horas no serviço antes da liberação'],
    ['Documentação','Considerar documentar com radiografia, TC ou RM da região afetada'],
   ]},
   {title:'Quando chamar o cirurgião', rows:[
    ['Critério','Detalhe'],
    ['Volume','Extravasamento > 100 mL'],
    ['Pele','Bolhas'],
    ['Perfusão e sensibilidade','Alteração da perfusão ou da sensibilidade'],
    ['Dor','Aumento da dor no local'],
   ]},
  ],
  refs:['cbr'],
 },
 {
  id:'fsn', title:'Fibrose sistêmica nefrogênica', desc:'Fatores de risco, quadro clínico e prevenção',
  sections:[
   {title:'Fatores de risco', rows:[
    ['Grupo','Fatores'],
    ['Paciente','Doença renal estágios 4 e 5 (TFGe < 30 mL/min/1,73 m²); pacientes em diálise'],
    ['Agente','Gadodiamida; outros lineares (gadoversetamida, gadopentetato de dimeglumina); múltiplas doses'],
   ]},
   {title:'Quadro clínico', rows:[
    ['Aspecto','Detalhe'],
    ['Manifestações','Dor, prurido, edema e eritema, seguidos de espessamento da pele e do subcutâneo, com fibrose em vários órgãos (músculos, diafragma, coração, fígado, pulmões)'],
    ['Início','Do dia da exposição até 2–3 meses ou anos depois'],
   ]},
   {title:'Prevenção', rows:[
    ['Medida','Detalhe'],
    ['Função renal','Comprovar a ausência de doença renal'],
    ['Alternativas','Discutir outros métodos de imagem'],
    ['Dose','Usar a menor dose diagnóstica possível'],
    ['Agente','Preferir macrocíclicos: gadobutrol, gadoteridol, ácido gadotérico'],
    ['Hemodiálise','Iniciar em até 3 horas após o gadolínio e repetir por 3 dias consecutivos (sessões extras)'],
    ['FSN já diagnosticada','Não injetar gadolínio'],
   ]},
   {title:'Deposição de gadolínio (à parte da FSN)', rows:[
    ['Achado','Detalhe'],
    ['Hipersinal em T1 nos globos pálidos e núcleos denteados','Ocorre com todos os agentes lineares; não observado com os macrocíclicos'],
   ]},
  ],
  refs:['cbr'],
 },
];

function contrasteTopic(id){ return CONTRASTE_TOPICS.find(t=>t.id===id); }

/* ---- lista ---- */
function contrasteListHTML(){
  const cards = CONTRASTE_TOPICS.map(t=>`<div class="lc-short" onclick="openContraste('${t.id}')">
      <div class="si acc">${svgIcon(P.book,22)}</div>
      <div class="st"><div class="t">${esc(t.title)}</div><div class="d">${esc(t.desc)}${t.pending?' · em conferência':''}</div></div>
      <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
    </div>`).join('');
  return `<div class="calc-list-wrap">
    <div class="calc-intro-lbl">Tópicos</div>
    ${cards}
    <div class="disc"><b>Ferramenta educacional. Sempre siga o protocolo de emergência do seu serviço.</b></div>
  </div>`;
}

/* ---- tópico ---- */
function contrasteItemHTML(){
  const t = contrasteTopic(state.contrasteId); if(!t) return contrasteListHTML();
  const alert = t.alert ? `<div class="ti-card" style="border-color:${t.pending?'#c68432':'var(--accent)'}"><div class="ti-legend-row"><span class="lt"><b>${t.pending?'⚠️ ':''}${esc(t.alert)}</b></span></div></div>` : '';
  const secs = t.sections.map((s,i)=>`<div class="ti-card">${tableHTML({title:s.title, rows:s.rows}, 'ctr-'+t.id+'-'+i)}${s.note?`<div class="ti-legend-row" style="margin-top:8px"><span class="lt">${esc(s.note)}</span></div>`:''}</div>`).join('');
  const refs = (t.refs||[]).map(k=>`<div class="tfg-ref-item">${esc(CONTRASTE_REFS[k])}</div>`).join('');
  return `<div class="ti-wrap">
    ${alert}${secs}
    <div class="ti-card"><div class="tfg-sec-lbl">Referências</div><div class="tfg-ref-list">${refs}</div></div>
    <div class="disc"><b>Ferramenta educacional. Sempre siga o protocolo de emergência do seu serviço.</b></div>
  </div>`;
}

function openContrasteList(){ navPush(); state.view='contraste'; render(); }
function openContraste(id){ navPush(); state.contrasteId=id; state.view='contrasteItem'; render(); }
