/* =========================================================================
   KlugRads — ccLS (clear cell Likelihood Score) por RM
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Medicina Interna.
   Algoritmo do escore de probabilidade de carcinoma de células claras (ccRCC)
   em massa renal sólida na RM (Pedrosa & Cadeddu, Radiology 2022). Árvore de
   decisão com revelação progressiva (só aparece a próxima pergunta relevante).
   Terminais especiais: realce ≤ 25% → massa cística (Bosniak); gordura
   macroscópica → AML. Fórmula/lógica replicadas do site do Dr. Ricardo Romano.
   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const CCLS_TONE = {
  low:  {c:'#1f9d55', bg:'#1f9d5522'},   // ccLS 1–2
  eq:   {c:'#e07a1f', bg:'#e07a1f22'},   // ccLS 3
  high: {c:'#cf2020', bg:'#cf202022'},   // ccLS 4–5
};
const CCLS_DESC = {1:'Muito improvável ccRCC', 2:'Improvável ccRCC', 3:'Equívoco (indeterminado)', 4:'Provável ccRCC', 5:'Muito provável ccRCC'};
const CCLS_REF  = 'Pedrosa I, Cadeddu JA. How We Do It: Managing the Indeterminate Renal Mass with the MRI Clear Cell Likelihood Score. Radiology. 2022;302(2):256–269.';

const CCLS_Q = {
  enhancing:  {label:'Componente sólido com realce > 25%?', opts:[['0','Não'],['1','Sim']]},
  macrofat:   {label:'Gordura macroscópica?',               opts:[['0','Não'],['1','Sim']]},
  t2w:        {label:'Sinal em T2 (vs córtex)',             opts:[['hyper','Hiperintenso'],['iso','Isointenso'],['hypo','Hipointenso']]},
  enhancement:{label:'Realce corticomedular',              opts:[['intense','Intenso > 75%'],['moderate','Moderado 40–75%'],['mild','Discreto < 40%']]},
  microfat:   {label:'Gordura microscópica?',              opts:[['0','Não'],['1','Sim']]},
  sei:        {label:'Inversão do realce segmentar (SEI)?', opts:[['0','Não'],['1','Sim']]},
  ader:       {label:'ADER (arterial/tardio)',            opts:[['gt','> 1,5'],['lte','≤ 1,5']]},
  dwi:        {label:'Restrição à difusão (DWI)?',        opts:[['0','Não'],['1','Sim']]},
  umf:        {label:'Gordura microscópica inequívoca?',   opts:[['0','Não'],['1','Sim']]},
};

function cclsState(){ if(!state.ccls) state.ccls={}; return state.ccls; }

/* ---- árvore de decisão (replicada do site) ---- */
function cclsWalk(s){
  const shown = ['enhancing'];
  if(!s.enhancing) return {shown};
  if(s.enhancing==='0') return {shown, special:{tag:'Cisto', text:'Massa cística', sub:'componente com realce ≤ 25% → caracterizar pela escala de Bosniak', c:'#17a2b8'}};
  shown.push('macrofat');
  if(!s.macrofat) return {shown};
  if(s.macrofat==='1') return {shown, special:{tag:'AML', text:'Angiomiolipoma (AML)', sub:'gordura macroscópica → lesão benigna típica', c:'#e07a1f'}};
  shown.push('t2w','enhancement');
  if(!s.t2w || !s.enhancement) return {shown};
  const t2=s.t2w, e=s.enhancement;

  if(t2==='hyper' || t2==='iso'){
    if(e==='intense'){
      shown.push('microfat');
      if(!s.microfat) return {shown};
      if(s.microfat==='1') return {shown, score:5, label:'ccRCC'};
      shown.push('sei');
      if(!s.sei) return {shown};
      return {shown, score: s.sei==='1'?3:4, label:'ccRCC'};
    } else if(e==='moderate'){
      shown.push('sei');
      if(!s.sei) return {shown};
      if(s.sei==='0') return {shown, score:3, label:'Oncocitoma / Cromófobo RCC'};
      shown.push('umf');
      if(!s.umf) return {shown};
      return s.umf==='1' ? {shown, score:3, label:'ccRCC'} : {shown, score:2, label:'Oncocitoma / Cromófobo RCC'};
    } else { // mild
      if(t2==='hyper') return {shown, score:3, label:''};
      shown.push('dwi','umf');
      if(!s.dwi || !s.umf) return {shown};
      if(s.umf==='1') return {shown, score:3, label:''};
      return {shown, score: s.dwi==='1'?1:2, label:'Carcinoma Papilar'};
    }
  } else { // hypo
    if(e==='intense'){
      shown.push('ader','dwi');
      if(!s.ader || !s.dwi) return {shown};
      const score = s.ader==='gt' ? (s.dwi==='1'?2:3) : (s.dwi==='1'?3:4);
      return {shown, score, label:'ccRCC'};
    } else if(e==='moderate'){
      return {shown, score:3, label:'Carcinoma Papilar / AML'};
    } else { // mild
      shown.push('umf');
      if(!s.umf) return {shown};
      return s.umf==='1' ? {shown, score:3, label:''} : {shown, score:1, label:'AML'};
    }
  }
}

/* ---- UI ---- */
function cclsRow(key){
  const q = CCLS_Q[key], s = cclsState();
  const chips = q.opts.map(o=>`<div class="ti-ftog ${String(s[key])===String(o[0])?'on':''}" onclick="cclsSet('${key}','${o[0]}')">${esc(o[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>${esc(q.label)}</label><div class="ti-foci">${chips}</div></div>`;
}
function cclsResHTML(w){
  if(w.special){
    const c=w.special;
    return `<div class="ti-res" style="background:${c.c}22;margin-top:12px">
      <div class="lv" style="color:${c.c};font-size:15px;min-width:56px;font-weight:800">${esc(c.tag)}</div>
      <div class="meta"><div class="a">${esc(c.text)}</div><div class="b">${esc(c.sub)}</div></div>
    </div>`;
  }
  if(w.score!=null){
    const t = w.score<=2 ? CCLS_TONE.low : (w.score===3 ? CCLS_TONE.eq : CCLS_TONE.high);
    return `<div class="ti-res" style="background:${t.bg};margin-top:12px">
      <div class="lv" style="color:${t.c}">ccLS ${w.score}</div>
      <div class="meta"><div class="a">${esc(CCLS_DESC[w.score])}</div><div class="b">${w.label ? 'Provável: '+esc(w.label) : 'Correlacionar com o contexto clínico'}</div></div>
      <div class="pts" style="background:${t.c}">${w.score}</div>
    </div>`;
  }
  return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Responda os itens acima para obter o escore.</span></div>`;
}

function calcCclsHTML(){
  const w = cclsWalk(cclsState());
  const rows = w.shown.map(cclsRow).join('');
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Massa renal sólida — RM</div>
      ${rows}
      <div id="ccls-res">${cclsResHTML(w)}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Escala ccLS</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">1</span><span class="lt">Muito improvável ccRCC</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">2</span><span class="lt">Improvável ccRCC</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f">3</span><span class="lt">Equívoco (indeterminado)</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">4</span><span class="lt">Provável ccRCC</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">5</span><span class="lt">Muito provável ccRCC</span></div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Definições</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item"><b>Realce corticomedular</b> — razão tumor/córtex: intenso > 75%, moderado 40–75%, discreto < 40%.</div>
        <div class="tfg-ref-item"><b>Gordura microscópica</b> — queda de sinal na fase oposta maior que a soma dos desvios-padrão das duas fases.</div>
        <div class="tfg-ref-item"><b>SEI</b> — áreas hiper/hiporrealçadas na fase corticomedular que se invertem nas fases seguintes.</div>
        <div class="tfg-ref-item"><b>ADER</b> — razão de realce arterial/tardio (SI nas fases corticomedular e nefrográfica).</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referência</div>
      <div class="tfg-ref-list"><div class="tfg-ref-item">${esc(CCLS_REF)}</div></div>
    </div>
    <div class="disc"><b>Ferramenta educacional. O ccLS estima a probabilidade de carcinoma de células claras em massas renais sólidas indeterminadas na RM (não se aplica a massas císticas). Não substitui o julgamento clínico.</b></div>
  </div>`;
}

/* Seleção de chip = re-render (revela a próxima pergunta / atualiza o escore). */
function cclsSet(field, val){
  const s = cclsState();
  s[field] = (String(s[field])===String(val)) ? null : val;   // clicar de novo desmarca
  render(true);
}

/* registra no catálogo (CALCS de app.js) — método RM, subespecialidade Medicina Interna */
CALCS.push({id:'ccls', modality:'rm', subspec:'medint', badge:'cc',
  title:'ccLS',
  desc:'Clear cell Likelihood Score — massa renal na RM'});
