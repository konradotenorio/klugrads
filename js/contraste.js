/* =========================================================================
   KlugRads — Meios de Contraste (Outras Ferramentas)
   ---------------------------------------------------------------------------
   Tópicos de referência em tabelas: classificação de reações, tratamento
   (adulto e pediátrico), fatores de risco e contraindicações, extravasamento
   e fibrose sistêmica nefrogênica.
   Fontes: CBR 2024 (diretrizes), ACR Manual on Contrast Media 2026 e SPR,
   Meios de Contraste 2ª ed. (2022). Doses pediátricas: ACR Tabela 2 + SPR
   Quadro 5. Ferramenta educacional: sempre seguir o protocolo local.
   ========================================================================= */

const CONTRASTE_REFS = {
  cbr: 'Colégio Brasileiro de Radiologia (CBR) — Curso AVR. Diretrizes para o uso de meios de contraste intravenosos. 2024.',
  acr: 'ACR Committee on Drugs and Contrast Media. ACR Manual on Contrast Media. American College of Radiology; 2026.',
  spr: 'Dutra BG, Bauab Jr T (eds.). Meios de contraste: conceitos e diretrizes. 2ª ed. São Paulo: Sociedade Paulista de Radiologia; 2022. doi:10.46664/meios-de-contraste-2aed.',
};

const CONTRASTE_TOPICS = [
 {
  id:'classificacao', title:'Classificação de reações adversas', desc:'Gravidade, mecanismo e tempo de início',
  sections:[
   {title:'Por gravidade (ACR)', rows:[
    ['Gravidade','Alérgica-like (hipersensibilidade)','Fisiológica'],
    ['Leve — autolimitada, sem progressão','Urticária/prurido limitados; edema cutâneo; "coceira" ou "arranhado" limitado na garganta; congestão nasal; espirros, conjuntivite, rinorreia','Náuseas/vômitos limitados; rubor, calor ou calafrios transitórios; cefaleia, tontura, ansiedade, alteração do paladar; hipertensão leve; reação vasovagal que se resolve sozinha'],
    ['Moderada — sintomas mais intensos, costuma exigir tratamento; pode evoluir para grave','Urticária/prurido difusos; eritema difuso com sinais vitais estáveis; edema facial sem dispneia; aperto na garganta ou rouquidão sem dispneia; sibilância/broncoespasmo com pouca ou nenhuma hipóxia','Náuseas/vômitos prolongados; urgência hipertensiva; dor torácica isolada; reação vasovagal que exige e responde ao tratamento'],
    ['Grave — risco de vida; pode deixar sequela ou levar à morte','Edema difuso ou edema facial com dispneia; eritema difuso com hipotensão; edema laríngeo com estridor e/ou hipóxia; sibilância/broncoespasmo com hipóxia significativa; choque anafilático (hipotensão + taquicardia)','Reação vasovagal resistente ao tratamento; arritmia; convulsões; emergência hipertensiva'],
   ], note:'A parada cardiorrespiratória e o edema pulmonar não cardiogênico são reações graves que podem ter causa alérgica-like ou fisiológica; se a causa não estiver clara, tratar como alérgica-like. Reação fisiológica prévia não indica pré-medicação.'},
   {title:'Por mecanismo (CBR / SPR)', rows:[
    ['Tipo','Características'],
    ['Hipersensibilidade (alérgica-like / anafilactoide)','Imprevisível: reação prévia e recorrência não são consistentes. Independe da dose e da concentração. Liberação de histamina por basófilos e mastócitos.'],
    ['Quimiotóxica (fisiológica)','Relacionada à dose e à concentração do contraste (volume > 100 mL), à velocidade de injeção (> 5 mL/s) e ao local da injeção.'],
   ]},
   {title:'Por tempo de início (SPR)', rows:[
    ['Tipo','Início','Observação'],
    ['Aguda','Até 1 hora após o contraste','As mais comuns; excepcionalmente até 6 horas'],
    ['Tardia','De 1 hora a 7 dias','A maioria entre 3 horas e 2 dias; em geral cutâneas e autolimitadas'],
    ['Muito tardia','Após 7 dias','Ex.: tireotoxicose (contraste iodado) e fibrose sistêmica nefrogênica (gadolínio)'],
   ]},
   {title:'Depois de reação moderada ou grave', rows:[
    ['Conduta','Detalhe'],
    ['Exames','Dosar histamina e triptase 1 e 2 horas após a injeção, se possível, e em 24 horas se o paciente estiver internado'],
    ['Encaminhamento','Alergologista 1 a 6 meses após a reação, para confirmar a alergia ao contraste, avaliar tolerância e um contraste alternativo seguro'],
   ]},
  ],
  refs:['acr','spr','cbr'],
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
    ['Hipertensão (CBR)','Manter acesso venoso. Captopril 25 mg VO; repetir em 1 hora se necessário'],
    ['Crise hipertensiva (ACR) — PAD > 120 ou PAS > 200 mmHg, ou sintomas de comprometimento de órgão-alvo','Labetalol 20 mg IV em 2 min, podendo dobrar a cada 10 min (40 mg, depois 80 mg); sem labetalol: nitroglicerina 0,4 mg SL a cada 5–10 min + furosemida 20–40 mg IV em 2 min. Acionar a equipe de emergência'],
    ['Edema pulmonar','Acesso venoso, monitorização, vias aéreas, O₂ 6–10 L/min, decúbito elevado. Furosemida 20–40 mg IV lenta (ou 0,5–1,0 mg/kg em 2 min, máximo 40 mg). Se associado a pico hipertensivo, considerar nitrato sublingual. Acionar a equipe de emergência'],
   ]},
   {title:'Reações graves e neurológicas', rows:[
    ['Reação','Conduta'],
    ['Adrenalina IV (ACR) — preferida se houver hipotensão','1 mL da solução 0,1 mg/mL (1:10.000) = 0,1 mg, lento em soro correndo; repetir a cada poucos minutos até 10 mL (1 mg) no total'],
    ['Reação anafilactoide generalizada','Acionar a equipe de RCP. Aspirar vias aéreas se necessário. Elevar os membros inferiores se hipotenso. O₂ 6–10 L/min. Adrenalina 1 mg/mL 0,5 mL (0,5 mg) IM, repetir se necessário. Fluidos IV (SF 0,9% ou Ringer lactato). Anti-H1: difenidramina 25–50 mg IV'],
    ['Convulsão','Observar e proteger o paciente, decúbito lateral para evitar aspiração, assegurar vias aéreas (aspirar se necessário). Diazepam 5 mg IV/IM ou midazolam 0,5–1 mg IV (CBR); se persistente, lorazepam 2–4 mg IV lento, máximo 4 mg (ACR). Acionar a equipe de emergência'],
    ['Hipoglicemia (ACR)','Consegue engolir: glicose oral 15 g (ou 2 sachês de açúcar ou ½ copo de suco). Não consegue e tem acesso IV: glicose 50% 1 ampola (25 g) IV em 2 min, seguida de SG 5% a 100 mL/h. Sem acesso IV: glucagon 1 mg IM'],
   ]},
  ],
  refs:['cbr','acr'],
 },
 {
  id:'tratamento-pediatrico', title:'Tratamento de reações — pediátrico', desc:'Conduta e doses por peso',
  alert:'Na maioria das reações: manter acesso venoso, monitorizar sinais vitais, O₂ por máscara 6–10 L/min e chamar a equipe de emergência se não houver resposta completa. Adrenalina IM = solução 1 mg/mL (1:1.000); adrenalina IV = solução 0,1 mg/mL (1:10.000). Doses difíceis de ajustar em neonatos e lactentes.',
  sections:[
   {title:'Doses por peso (resumo)', rows:[
    ['Droga','Dose','Máximo / repetição'],
    ['Adrenalina IM (1 mg/mL)','0,01 mL/kg = 0,01 mg/kg, face anterolateral da coxa','Máx. 0,3 mg por dose; repetir a cada 5–15 min até 1 mg no total'],
    ['Adrenalina — autoinjetor','< 30 kg: 0,15 mg (pediátrico) · ≥ 30 kg: 0,3 mg (adulto)','Bula do autoinjetor pediátrico não traz dose para < 15 kg'],
    ['Adrenalina IV (0,1 mg/mL)','0,1 mL/kg = 0,01 mg/kg, lento em soro correndo (na parada: rápido, com flush)','Máx. 1 mL (0,1 mg) por dose; repetir a cada 5–15 min até 1 mg no total. ACR: via preferida se hipotensão. SPR: reservar para choque iminente ou hipotensão grave sem resposta a volume e adrenalina IM'],
    ['Soro fisiológico ou Ringer lactato','10–20 mL/kg','Máx. 500–1.000 mL'],
    ['Difenidramina','1 mg/kg VO, IM ou IV (IV lento em 1–2 min)','Máx. 50 mg'],
    ['Atropina IV (0,1 mg/mL)','0,2 mL/kg = 0,02 mg/kg','Mínimo 0,1 mg; máx. 0,6–1,0 mg por dose; total 1 mg (crianças) ou 2 mg (adolescentes)'],
    ['Salbutamol inalatório','ACR: 2 jatos de 90 mcg (180 mcg), até 3 vezes · SPR: 1 jato de 100 mcg a cada 2 kg','SPR: máx. 10 jatos'],
    ['Furosemida IV','0,5–1,0 mg/kg em 2 min','Máx. 40 mg'],
    ['Hidrocortisona IV (prevenção de rebote)','5 mg/kg em 1–2 min','Máx. 200 mg'],
    ['Metilprednisolona IV (prevenção de rebote)','1 mg/kg em 1–2 min','Máx. 40 mg'],
   ]},
   {title:'Conduta por reação', rows:[
    ['Reação','Conduta'],
    ['Urticária','Leve: observar; se sintomática, considerar difenidramina 1 mg/kg (máx. 50 mg). Moderada ou grave: monitorizar, manter acesso venoso e considerar difenidramina'],
    ['Eritema difuso','Normotenso: sem outro tratamento. Hipotenso: SF ou Ringer 10–20 mL/kg (máx. 500–1.000 mL); se grave ou sem resposta, adrenalina IV (ou IM se sem acesso)'],
    ['Broncoespasmo','Leve: salbutamol. Moderado: considerar adrenalina IM ou IV. Grave: adrenalina IV ou IM + salbutamol e chamar a emergência'],
    ['Edema laríngeo','Adrenalina IV ou IM (ou autoinjetor) e chamar a emergência'],
    ['Hipotensão com bradicardia (vasovagal)','Elevar as pernas ≥ 60° e SF ou Ringer 10–20 mL/kg. Leve: sem outro tratamento. Grave: atropina IV 0,02 mg/kg'],
    ['Hipotensão com taquicardia (anafilactoide)','Elevar as pernas ≥ 60° e SF ou Ringer 10–20 mL/kg. Se persistir: adrenalina IV (ou IM / autoinjetor) e chamar a emergência'],
    ['Sem resposta e sem pulso','Acionar a emergência, iniciar RCP e usar o desfibrilador (DEA) assim que disponível. Adrenalina IV 0,01 mg/kg (0,1 mL/kg de 0,1 mg/mL), rápida com flush, entre os ciclos de 2 min, máx. 1 mg'],
    ['Edema pulmonar','Cabeceira elevada. Furosemida 0,5–1,0 mg/kg IV em 2 min (máx. 40 mg). Chamar a emergência'],
    ['Convulsão','Proteger a criança, decúbito lateral, aspirar vias aéreas se necessário. Se não cessar, chamar a emergência'],
    ['Hipoglicemia','Consegue engolir: glicose oral 15 g (ou ½ copo de suco). Não consegue, com acesso IV: glicose 25% 2 mL/kg IV em 2 min. Sem acesso: glucagon IM/SC 0,5 mg (< 20 kg) ou 1 mg (> 20 kg)'],
    ['Ansiedade (crise de pânico)','Diagnóstico de exclusão: afastar outra reação (oximetria normal, sem outros sinais) e tranquilizar'],
   ], note:'Corticoide IV não trata a reação aguda; pode ser considerado para prevenir recorrência precoce em reação alérgica-like grave, antes da transferência.'},
   {title:'Extravasamento em crianças', rows:[
    ['Medida','Detalhe'],
    ['Conduta','Elevar o membro acima do nível do coração, compressa fria, remover anéis e observar'],
    ['Cirurgia','Consulta cirúrgica se houver redução da perfusão, da sensibilidade, da força ou da mobilidade articular, ou aumento progressivo da dor'],
   ]},
  ],
  refs:['acr','spr','cbr'],
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
   {title:'Grupos de gadolínio quanto ao risco de FSN (ACR)', rows:[
    ['Grupo','Agentes'],
    ['Grupo I — maior número de casos de FSN','Gadodiamida, gadopentetato de dimeglumina, gadoversetamida'],
    ['Grupo II — poucos ou nenhum caso não confundido','Gadobenato de dimeglumina, gadobutrol, ácido gadotérico, gadoteridol, gadoxetato dissódico e gadopiclenol (provisório)'],
    ['Grupo III — dados limitados','Nenhum agente nesta categoria (abril de 2024)'],
   ], note:'O ACR prefere fortemente agentes do grupo II em pacientes com risco de FSN; os do grupo I são contraindicados nesse cenário.'},
   {title:'Deposição de gadolínio (à parte da FSN)', rows:[
    ['Achado','Detalhe'],
    ['Hipersinal em T1 nos globos pálidos e núcleos denteados','Ocorre com todos os agentes lineares; não observado com os macrocíclicos'],
   ]},
  ],
  refs:['cbr','acr'],
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
  const alert = t.alert ? `<div class="ti-card" style="border-color:${t.pending?'#c68432':'var(--accent)'}"><div class="ti-legend-row"><span class="lt"><b>${t.pending?ic('warn',15)+' ':''}${esc(t.alert)}</b></span></div></div>` : '';
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
