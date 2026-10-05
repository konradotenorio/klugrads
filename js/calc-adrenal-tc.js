/* =========================================================================
   KlugRads — Lesão Adrenal por TC: duas calculadoras (grupo ADRENAL)
   ---------------------------------------------------------------------------
   Método: TC · Subespecialidade: Adrenal (Medicina Interna).
   Baseado no Radiology Assistant (adrenals — lesion characterization), nas
   diretrizes ESE/ENSAT 2023 e em Seow et al., Insights Imaging 2025.

   1) INCIDENTALOMA (id 'adrenal-tc') — DENSIDADE PRÉ-CONTRASTE + TAMANHO:
      - ncCT < 0 UH (gordura macroscópica) → mielolipoma (benigno)
      - ≤ 10 UH → adenoma rico em lipídios (benigno, qualquer tamanho)
      - 10–20 UH e ≤ 4 cm → benigno (adenoma pobre em lipídios)
      - 10–20 UH e > 4 cm → indeterminado, seguimento 6–12 meses
      - 21–30 UH → indeterminado (considerar RM chemical shift)
      - > 30 UH → maior risco (seguimento/investigação; > 4 cm → MDT/cirurgia)
      Toda incidentaloma exige avaliação clínica/hormonal.
      Sem entrada de fase pós-contraste: o estudo contrastado só distingue cisto
      (não realça) de lesão que realça — informação textual, não entra no cálculo.

   2) WASHOUT (id 'adrenal-washout') — uso restrito:
      APW = 100 × (portal − tardia) / (portal − pré) ; RPW = 100 × (portal − tardia) / portal
      APW ≥ 60% ou RPW ≥ 40% → adenoma. NÃO é mais recomendado para
      incidentalomas verdadeiros (Seow 2025); papel restrito a lesões não-incidentais
      após avaliação hormonal. (A ESE 2023 ainda lista o washout entre as opções
      de imagem adicional.)

   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const ADR_TONE = {
  benign: {c:'#1f9d55', bg:'#1f9d5522', tag:'Benigno'},
  likely: {c:'#3d9970', bg:'#3d997022', tag:'Prov. benigno'},
  indet:  {c:'#e07a1f', bg:'#e07a1f22', tag:'Indeterminado'},
  risk:   {c:'#cf2020', bg:'#cf202022', tag:'Maior risco'},
};

/* Referências conferidas na fonte em 05/out/2026 (PubMed/Europe PMC/editoras). */
const ADR_REF_ESE    = 'Fassnacht M, Tsagarakis S, Terzolo M, et al. European Society of Endocrinology clinical practice guidelines on the management of adrenal incidentalomas, in collaboration with the European Network for the Study of Adrenal Tumors. Eur J Endocrinol. 2023;189(1):G1–G42.';
const ADR_REF_SEOW   = 'Seow JH, Stella DL, Welman CJ, Somasundaram AJ, Gerstenmaier JF. Washed up: the end of an era for adrenal incidentaloma CT. Insights Imaging. 2025;16(1):136. doi:10.1186/s13244-025-02015-4.';
const ADR_REF_CORWIN = 'Corwin MT, Getz MLD, Branson CM, et al. Prevalence of Malignancy Among Incidental Indeterminate Adrenal Nodules on Contrast-Enhanced CT in Patients Without Known Cancer: A Multiinstitutional Study. AJR Am J Roentgenol. 2026;226(3):e2533559. doi:10.2214/AJR.25.33559.';
const ADR_REF_CHUNG  = 'Chung R, Garratt J, Remer EM, et al. Adrenal Neoplasms: Lessons from Adrenal Multidisciplinary Tumor Boards. RadioGraphics. 2023;43(7):e220191.';
const ADR_REF_SONG   = 'Song JH, Chaudhry FS, Mayo-Smith WW. The Incidental Adrenal Mass on CT: Prevalence of Adrenal Disease in 1,049 Consecutive Adrenal Masses in Patients with No Known Malignancy. AJR Am J Roentgenol. 2008;190(5):1163–1168.';
const ADR_REF_NANDRA = 'Nandra G, Duxbury O, Patel P, Patel JH, Patel N, Vlahos I. Technical and Interpretive Pitfalls in Adrenal Imaging. RadioGraphics. 2020;40(4):1041–1060. doi:10.1148/rg.2020190080.';
const ADR_REFS    = [ADR_REF_ESE, ADR_REF_SEOW, ADR_REF_CORWIN, ADR_REF_CHUNG, ADR_REF_SONG];   // Incidentaloma
const ADR_REFS_WO = [ADR_REF_SEOW, ADR_REF_NANDRA, ADR_REF_ESE];                                // Washout

function adrenalState(){ if(!state.adrenalTc) state.adrenalTc={hu:'', size:''}; return state.adrenalTc; }
function adrenalWoState(){ if(!state.adrenalWo) state.adrenalWo={sc:'', portal:'', tardia:''}; return state.adrenalWo; }
function adrNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }
function adrR(x){ return Math.round(x*10)/10; }
function adrFmt(x){ return String(x).replace('.', ','); }

/* ---- classificação por densidade + tamanho ---- */
function adrenalClassify(s){
  const hu=adrNum(s.hu), size=adrNum(s.size);
  if(hu==null) return null;
  if(hu < 0) return {cat:'Mielolipoma', tone:'benign', mgmt:'Gordura macroscópica (< 0 UH) — benigno. Sem seguimento (±calcificação).'};
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

/* ---- washout ---- */
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
function adrField(fn, k, label, ph, val, unit){
  return `<div class="ti-field">
    <label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf">
      <input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(val)}" oninput="${fn}('${k}',this.value)">
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
  const c = adrenalWashout(adrenalWoState());
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

/* ---- 1) Incidentaloma ---- */
function calcAdrenalTcHTML(){
  const s = adrenalState();
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="ti-legend-row"><span class="lt">O estudo contrastado distingue lesões císticas de lesões que apresentam realce após administração de contraste.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Densidade (pré-contraste) e tamanho</div>
      <div class="ti-fields">
        ${adrField('adrenalSet','hu','Densidade pré-contraste','ex.: 8', s.hu, 'UH')}
        ${adrField('adrenalSet','size','Maior diâmetro','ex.: 2,5', s.size, 'cm')}
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
    </div>
    <div class="ti-card">
      <div class="ti-legend-row"><span class="lt"><b>Todo incidentaloma</b> (≥ 1 cm, sem malignidade conhecida) exige avaliação clínica/hormonal.</span></div>
      <div class="ti-legend-row"><span class="lt">Crescimento significativo = aumento de mais de 20% no maior diâmetro e de pelo menos 5 mm em 6–12 meses (ESE 2023).</span></div>
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
      <div class="tfg-sec-lbl">Infográfico — ESR / Insights into Imaging (2025)</div>
      <img src="/img/adrenal-incidentaloma-esr2025.webp" width="891" height="502"
           alt="Infográfico ESR (Seow et al., Insights into Imaging 2025): categorias 1 a 3 do incidentaloma adrenal pela atenuação na TC sem contraste (< 10, 10–20 e > 20 UH) e pelo tamanho (1–4 cm e > 4 cm)"
           style="display:block;width:100%;height:auto;margin-top:8px;border-radius:10px">
      <div class="ti-legend-row" style="margin-top:6px"><span class="lt">Fonte: Seow JH, Stella DL, Welman CJ, Somasundaram AJ, Gerstenmaier JF. Insights Imaging 2025;16:136 (licença CC BY 4.0).</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${ADR_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* ---- 2) Washout ---- */
function calcAdrenalWashoutHTML(){
  const s = adrenalWoState();
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="ti-legend-row"><span class="lt"><b>Uso restrito.</b> O washout <b>não é mais recomendado</b> para incidentalomas verdadeiros (Seow 2025). Papel limitado a lesões não-incidentais, após avaliação hormonal. A ESE 2023 ainda o inclui entre as opções de imagem adicional.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Densidades do nódulo (UH)</div>
      <div class="ti-fields">
        ${adrField('adrenalWoSet','sc','Pré-contraste','ex.: 25', s.sc, 'UH')}
        ${adrField('adrenalWoSet','portal','Fase portal','ex.: 90', s.portal, 'UH')}
        ${adrField('adrenalWoSet','tardia','Fase tardia','ex.: 45', s.tardia, 'UH')}
      </div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt"><b>Informe as densidades:</b><br>· Portal e Tardia são obrigatórias<br>· Pré-contraste para o cálculo do washout absoluto</span></div>
      <div id="adrenal-wo-res">${adrenalWashoutResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fórmulas do washout</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">APW = 100 × (portal − tardia) ÷ (portal − pré-contraste) · adenoma se ≥ 60%</div>
        <div class="tfg-ref-item">RPW = 100 × (portal − tardia) ÷ portal · adenoma se ≥ 40%</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${ADR_REFS_WO.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* ---- ações (atualizam só o resultado, sem recriar os campos) ---- */
function adrenalSet(k, v){ adrenalState()[k]=v; adrenalRefresh(); }
function adrenalRefresh(){ const el=document.getElementById('adrenal-res'); if(el) el.innerHTML = translateHTML(adrenalDensResHTML()); }
function adrenalWoSet(k, v){ adrenalWoState()[k]=v; adrenalWoRefresh(); }
function adrenalWoRefresh(){ const el=document.getElementById('adrenal-wo-res'); if(el) el.innerHTML = translateHTML(adrenalWashoutResHTML()); }

/* registra no catálogo (CALCS de app.js) — método TC, subgrupo ADRENAL */
CALCS.push({id:'adrenal-tc', modality:'tc', subspec:'adrenal', badge:'IN',
  title:'Incidentaloma',
  desc:'Avaliação de incidentalomas de adrenais conforme protocolo ESR 2025'});
CALCS.push({id:'adrenal-washout', modality:'tc', subspec:'adrenal', badge:'WO',
  title:'Washout',
  desc:'Avaliação de lesões adrenais conforme protocolo de Washout absoluto e relativo'});
