/* =========================================================================
   KlugRads — Nódulo/Lesão Adrenal por TC (caracterização)
   ---------------------------------------------------------------------------
   Método: TC · Subespecialidade: Medicina Interna.
   Baseado no Radiology Assistant (adrenals — lesion characterization) e nas
   diretrizes atuais (ESE 2023; revisão 2025). Dois modos:

   1) DENSIDADE + TAMANHO (abordagem atual):
      - ncCT < 0 UH (gordura macroscópica) → mielolipoma (benigno)
      - baixa densidade SEM realce → cisto
      - ≤ 10 UH → adenoma rico em lipídios (benigno, qualquer tamanho)
      - 10–20 UH e ≤ 4 cm → benigno (adenoma pobre em lipídios)
      - 10–20 UH e > 4 cm → provavelmente benigno, seguimento 6–12 meses
      - 21–30 UH → indeterminado (considerar RM chemical shift)
      - > 30 UH → maior risco (seguimento/investigação; > 4 cm → MDT/cirurgia)
      Toda incidentaloma exige avaliação clínica/hormonal.

   2) WASHOUT (uso restrito — legado):
      APW = 100 × (portal − tardia) / (portal − pré) ; RPW = 100 × (portal − tardia) / portal
      APW ≥ 60% ou RPW ≥ 40% → adenoma. NÃO é mais recomendado para
      incidentalomas (Seow 2025); papel restrito a lesões não-incidentais
      após avaliação hormonal.

   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const ADR_TONE = {
  benign: {c:'#1f9d55', bg:'#1f9d5522', tag:'Benigno'},
  likely: {c:'#3d9970', bg:'#3d997022', tag:'Prov. benigno'},
  indet:  {c:'#e07a1f', bg:'#e07a1f22', tag:'Indeterminado'},
  risk:   {c:'#cf2020', bg:'#cf202022', tag:'Maior risco'},
};

const ADR_REFS = [
  'Fassnacht M, et al. European Society of Endocrinology clinical practice guidelines on the management of adrenal incidentalomas (ESE/ENSAT). Eur J Endocrinol. 2023;189(1):G1–G42.',
  'Seow JH, Stella DL, Welman CJ, et al. Washed up: the end of an era for adrenal incidentaloma CT. Insights Imaging. 2025;16:136.',
  'Corwin MT, et al. Prevalence of Malignancy Among Incidental Indeterminate Adrenal Nodules on Contrast-Enhanced CT in Patients Without Known Cancer. AJR Am J Roentgenol. 2026;226(3):e2533559.',
  'Chung R, et al. Adrenal Neoplasms: Lessons from Adrenal Multidisciplinary Tumor Boards. RadioGraphics. 2023;43(7):e220191.',
  'Song JH, et al. The Incidental Adrenal Mass on CT: Prevalence of Adrenal Disease in 1049 Consecutive Adrenal Masses. AJR Am J Roentgenol. 2008;190:1163–1168.',
  'Nandra G, et al. Technical and Interpretive Pitfalls in Adrenal Imaging. RadioGraphics. 2020;40(4):1041–1060. (washout)',
];

function adrenalState(){
  if(!state.adrenalTc) state.adrenalTc={mode:'dens', hu:'', size:'', pos:'nao', realce:'sim', sc:'', portal:'', tardia:''};
  if(!state.adrenalTc.mode) state.adrenalTc.mode='dens';
  if(!state.adrenalTc.pos) state.adrenalTc.pos='nao';
  if(!state.adrenalTc.realce) state.adrenalTc.realce='sim';
  return state.adrenalTc;
}
function adrNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }
function adrR(x){ return Math.round(x*10)/10; }
function adrFmt(x){ return String(x).replace('.', ','); }

/* ---- classificação por densidade + tamanho (abordagem atual) ---- */
function adrenalClassify(s){
  const hu=adrNum(s.hu), size=adrNum(s.size);
  if(hu==null) return null;
  const naoRealca = (s.pos==='sim' && s.realce==='nao');
  if(hu < 0) return {cat:'Mielolipoma', tone:'benign', mgmt:'Gordura macroscópica (< 0 UH) — benigno. Sem seguimento (±calcificação).'};
  if(naoRealca && hu <= 20) return {cat:'Cisto', tone:'benign', mgmt:'Baixa densidade SEM realce após contraste = cisto. Sem seguimento.'};
  if(hu <= 10) return {cat:'Provável adenoma rico em lipídios', tone:'benign', mgmt:'≤ 10 UH (qualquer tamanho) — benigno. Sem seguimento.'};
  if(hu <= 20){
    if(size==null) return {cat:'Provável adenoma pobre em lipídios', tone:'likely', mgmt:'10–20 UH — informe o tamanho: ≤ 4 cm → benigno; > 4 cm → indeterminado (seguimento 6–12 meses).'};
    if(size <= 4)  return {cat:'Provável adenoma pobre em lipídios', tone:'benign', mgmt:'10–20 UH e ≤ 4 cm — benigno.'};
    return {cat:'Indeterminado', tone:'indet', mgmt:'10–20 UH e > 4 cm — seguimento em 6–12 meses.'};
  }
  if(hu <= 30) return {cat:'Indeterminado', tone:'indet', mgmt:'21–30 UH — correlacionar com RM (out phase).'};
  if(size!=null && size > 4) return {cat:'Maior risco', tone:'risk', mgmt:'> 30 UH e > 4 cm — discussão multidisciplinar / cirurgia.'};
  return {cat:'Maior risco', tone:'risk', mgmt:'> 30 UH — maior risco; investigar (> 4 cm: MDT/cirurgia).'};
}

/* ---- washout (legado) ---- */
function adrenalWashout(s){
  const sc=adrNum(s.sc), portal=adrNum(s.portal), tardia=adrNum(s.tardia);
  let apw=null, rpw=null;
  if(portal!=null && tardia!=null){
    if(portal!==0) rpw=adrR(100*(portal-tardia)/portal);
    if(sc!=null && (portal-sc)!==0) apw=adrR(100*(portal-tardia)/(portal-sc));
  }
  return {apw, rpw};
}

/* ---- UI helpers ---- */
function adrField(k, label, ph, val, unit){
  return `<div class="ti-field">
    <label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf">
      <input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(val)}" oninput="adrenalSet('${k}',this.value)">
      <span>${esc(unit)}</span>
    </div></div>
  </div>`;
}

function adrenalDensResHTML(){
  const r = adrenalClassify(adrenalState());
  if(!r) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Informe a densidade pré-contraste. O tamanho refina a conduta em 10–20 UH e > 30 UH.</span></div>`;
  const t = ADR_TONE[r.tone];
  const hu = adrFmt(adrR(adrNum(adrenalState().hu)));
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px;align-items:flex-start">
    <div class="lv" style="color:${t.c};font-size:20px;min-width:64px">${hu} UH</div>
    <div class="meta"><div class="a">${esc(r.cat)}</div><div class="b">${esc(r.mgmt)}</div></div>
    <div class="pts" style="background:${t.c}">${t.tag}</div>
  </div>`;
}

function adrenalWashoutResHTML(){
  const c = adrenalWashout(adrenalState());
  const box=(titulo,val,thr)=>{
    const t = val>=thr ? ADR_TONE.benign : ADR_TONE.indet;
    const lab = val>=thr ? 'Adenoma' : 'Indeterminado';
    return `<div class="ti-res" style="background:${t.bg};margin-top:10px">
      <div class="lv" style="color:${t.c}">${adrFmt(val)}%</div>
      <div class="meta"><div class="a">${esc(titulo)} · ${lab}</div><div class="b">limiar para adenoma: ≥ ${thr}%</div></div>
      <div class="pts" style="background:${t.c}">WO</div></div>`;
  };
  const parts=[];
  if(c.apw!=null) parts.push(box('Washout absoluto (APW)', c.apw, 60));
  if(c.rpw!=null) parts.push(box('Washout relativo (RPW)', c.rpw, 40));
  if(!parts.length) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Informe as densidades (portal e tardia obrigatórias; pré-contraste para o washout absoluto).</span></div>`;
  return `<div style="margin-top:12px">${parts.join('')}</div>`;
}

function calcAdrenalTcHTML(){
  const s = adrenalState();
  const modeChip=(id,txt)=>`<div class="ti-ftog ${s.mode===id?'on':''}" onclick="adrenalSetMode('${id}')">${esc(txt)}</div>`;
  const posChip=(id,txt)=>`<div class="ti-ftog ${s.pos===id?'on':''}" onclick="adrenalSetPos('${id}')">${esc(txt)}</div>`;
  const realceChip=(id,txt)=>`<div class="ti-ftog ${s.realce===id?'on':''}" onclick="adrenalSetRealce('${id}')">${esc(txt)}</div>`;

  let bloco;
  if(s.mode==='washout'){
    bloco = `<div class="ti-card">
      <div class="ti-legend-row"><span class="lt"><b>Uso restrito.</b> O washout <b>não é mais recomendado</b> para incidentalomas (ESE 2023; Seow 2025). Papel limitado a lesões não-incidentais, após avaliação hormonal.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Densidades do nódulo (UH)</div>
      <div class="ti-fields">
        ${adrField('sc','Pré-contraste','ex.: 25', s.sc, 'UH')}
        ${adrField('portal','Fase portal','ex.: 90', s.portal, 'UH')}
        ${adrField('tardia','Fase tardia','ex.: 45', s.tardia, 'UH')}
      </div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt"><b>Informe as densidades:</b><br>· Portal e Tardia são obrigatórias<br>· Pré-contraste para o cálculo do washout absoluto</span></div>
      <div id="adrenal-res">${adrenalWashoutResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fórmulas do washout</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">APW = 100 × (portal − tardia) ÷ (portal − pré-contraste) · adenoma se ≥ 60%</div>
        <div class="tfg-ref-item">RPW = 100 × (portal − tardia) ÷ portal · adenoma se ≥ 40%</div>
      </div>
    </div>`;
  } else {
    bloco = `<div class="ti-card">
      <div class="tfg-sec-lbl">Fase pós-contraste?</div>
      <div class="ti-foci" style="margin-top:8px">${posChip('nao','Não')}${posChip('sim','Sim')}</div>
      ${s.pos==='sim' ? `<div class="ti-foci" style="margin-top:8px">${realceChip('sim','Realça')}${realceChip('nao','Não realça')}</div>` : ''}
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">O realce distingue <b>adenoma</b> (realça) de <b>cisto</b> (não realça) nas lesões de baixa densidade.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Densidade (pré-contraste) e tamanho</div>
      <div class="ti-fields">
        ${adrField('hu','Densidade pré-contraste','ex.: 8', s.hu, 'UH')}
        ${adrField('size','Maior diâmetro','ex.: 2,5', s.size, 'cm')}
      </div>
      <div id="adrenal-res">${adrenalDensResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Regra (Pré-contraste + tamanho)</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55"> </span><span class="lt"><b>< 0 UH</b> (gordura) → mielolipoma</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55"> </span><span class="lt"><b>≤ 10 UH</b> (qualquer tamanho) → provável adenoma rico em lipídios · benigno</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55"> </span><span class="lt"><b>10–20 UH</b> e ≤ 4 cm → benigno (provável adenoma pobre em lipídios)</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f"> </span><span class="lt"><b>10–20 UH</b> e > 4 cm → indeterminado (seguimento 6–12 meses)</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f"> </span><span class="lt"><b>21–30 UH</b> → indeterminado (correlacionar com RM "out phase")</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020"> </span><span class="lt"><b>> 30 UH</b> → maior risco (> 4 cm: MDT/cirurgia)</span></div>
      </div>
    </div>`;
  }

  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Abordagem</div>
      <div class="ti-foci" style="margin-top:8px">${modeChip('dens','Incidentaloma 2025')}${modeChip('washout','Washout')}</div>
    </div>
    ${bloco}
    <div class="ti-card">
      <div class="ti-legend-row"><span class="lt"><b>Todo incidentaloma</b> (≥ 1 cm, sem malignidade conhecida) exige avaliação clínica/hormonal.</span></div>
      <div class="ti-legend-row"><span class="lt">Crescimento significativo = ≥ 5 mm em 6–12 meses ou > 20% do maior diâmetro em 12 meses.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Categorias de lesão adrenal</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item"><b>Mielolipoma</b> — gordura macroscópica (< 0 UH), ± calcificação.</div>
        <div class="tfg-ref-item"><b>Cisto</b> — CT pré-contraste ≤ 10 UH + ausência de realce após contraste.</div>
        <div class="tfg-ref-item"><b>Adenoma rico em lipídios</b> — CT pré-contraste ≤ 10 UH + realce após contraste (~70% dos adenomas).</div>
        <div class="tfg-ref-item"><b>Adenoma pobre em lipídios</b> — CT pré-contraste 10–20 UH; c/ queda de sinal na RM "out phase".</div>
        <div class="tfg-ref-item"><b>Feocromocitoma</b> — hipervascular (realce intenso), hiperssinal T2; dosar metanefrinas.</div>
        <div class="tfg-ref-item"><b>Carcinoma adrenocortical</b> — geralmente CT pré-contraste > 30 UH, lesões grandes (> 4–6 cm), heterogênea (necrose/calcificação).</div>
        <div class="tfg-ref-item"><b>Metástase / hemorragia</b> — contexto clínico (neoplasia conhecida; trauma/anticoagulação).</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${ADR_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional. Caracterização de lesão adrenal segundo diretrizes atuais (ESE 2023 / revisão 2025). O washout perdeu papel nos incidentalomas. Não substitui a avaliação hormonal nem o julgamento clínico.</b></div>
  </div>`;
}

/* ---- ações ---- */
function adrenalSetMode(m){ adrenalState().mode=m; render(true); }
function adrenalSetPos(p){ adrenalState().pos=p; if(p==='nao') adrenalState().realce='sim'; render(true); }
function adrenalSetRealce(r){ adrenalState().realce=r; render(true); }
function adrenalSet(k, v){ adrenalState()[k]=v; adrenalRefresh(); }
function adrenalRefresh(){
  const el=document.getElementById('adrenal-res');
  if(el) el.innerHTML = translateHTML(adrenalState().mode==='washout' ? adrenalWashoutResHTML() : adrenalDensResHTML());
}

/* registra no catálogo (CALCS de app.js) — método TC, subespecialidade Medicina Interna */
CALCS.push({id:'adrenal-tc', modality:'tc', subspec:'medint', badge:'AD',
  title:'Lesão Adrenal (TC)',
  desc:'Caracterização por densidade + tamanho (ESE 2023) e washout (legado)'});
