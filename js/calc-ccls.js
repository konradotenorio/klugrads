/* =========================================================================
   KlugRads — ccLS (clear cell Likelihood Score) por RM
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Rim.
   Algoritmo do escore de probabilidade de carcinoma de células claras (ccRCC)
   em massa renal sólida na RM — ccLS v2.0 (Pedrosa & Cadeddu, Radiology 2022,
   Figura 1). Árvore de decisão com revelação progressiva (só aparece a próxima
   pergunta relevante). Terminais especiais: realce < 25% → massa cística
   (Bosniak); gordura macroscópica → AML.

   Conferido com a Figura 1 do artigo (06/out/2026):
   - ADER: ≥ 1,5 → AML (ccLS 2–3) · < 1,5 → ccRCC (ccLS 3–4).
   - Hipointenso + realce intenso, notas ᵉ/ᶠ da figura: "ccLS2/ccLS3 se homogêneo ou
     restrição marcada à DWI; ccLS4 se heterogêneo". O artigo não define "homogêneo";
     seguimos a calculadora do grupo (cclsrads.com, UT Southwestern): padrão do sinal
     em T2 E padrão do realce corticomedular ambos homogêneos ("levemente heterogêneo"
     conta como heterogêneo). Restrição marcada = DWI (b800) hiperintenso e ADC
     hipointenso em relação ao córtex (passo 6 do artigo).
   - Conflito entre achados → maior ccLS; impossível atribuir → ccLS 3.
   Informativo (fora do cálculo): % de ccRCC por categoria — Schieda 2022.
   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const CCLS_TONE = {
  low:  {c:'#1f9d55', bg:'#1f9d5522'},   // ccLS 1–2
  eq:   {c:'#e07a1f', bg:'#e07a1f22'},   // ccLS 3
  high: {c:'#cf2020', bg:'#cf202022'},   // ccLS 4–5
};
const CCLS_DESC = {1:'Muito improvável ccRCC', 2:'Improvável ccRCC', 3:'Equívoco (indeterminado)', 4:'Provável ccRCC', 5:'Muito provável ccRCC'};
const CCLS_REFS = [
  'Pedrosa I, Cadeddu JA. How We Do It: Managing the Indeterminate Renal Mass with the MRI Clear Cell Likelihood Score. Radiology. 2022;302(2):256–269.',
  'Schieda N, Davenport MS, Silverman SG, et al. Multicenter Evaluation of Multiparametric MRI Clear Cell Likelihood Scores in Solid Indeterminate Small Renal Masses. Radiology. 2022;303(3):590–599. (Erratum: Radiology. 2023;306(3):e239001.)',
];
/* % de ccRCC por categoria — Schieda 2022 (leituras agrupadas dos 10 radiologistas; n = leituras) */
const CCLS_PCT = [
  {s:1, pct:'6%',  n:'6/99',    c:'#1f9d55'},
  {s:2, pct:'38%', n:'8/21',    c:'#1f9d55'},
  {s:3, pct:'32%', n:'46/145',  c:'#e07a1f'},
  {s:4, pct:'72%', n:'88/124',  c:'#cf2020'},
  {s:5, pct:'81%', n:'90/111',  c:'#cf2020'},
];

const CCLS_Q = {
  enhancing:  {label:'Componente sólido com realce > 25%?', opts:[['0','Não'],['1','Sim']]},
  macrofat:   {label:'Gordura macroscópica?',               opts:[['0','Não'],['1','Sim']]},
  t2w:        {label:'Sinal em T2 (vs córtex)',             opts:[['hyper','Hiperintenso'],['iso','Isointenso'],['hypo','Hipointenso']]},
  enhancement:{label:'Realce corticomedular',              opts:[['intense','Intenso > 75%'],['moderate','Moderado 40–75%'],['mild','Discreto < 40%']]},
  microfat:   {label:'Gordura microscópica?',              opts:[['0','Não'],['1','Sim']]},
  sei:        {label:'Inversão do realce segmentar (SEI)?', opts:[['0','Não'],['1','Sim']]},
  ader:       {label:'ADER (arterial/tardio)',            opts:[['ge','≥ 1,5'],['lt','< 1,5']]},
  dwi:        {label:'Restrição marcada à difusão?',      opts:[['0','Não'],['1','Sim']]},
  t2pat:      {label:'Padrão do sinal em T2',             opts:[['homo','Homogêneo'],['slight','Levemente heterogêneo'],['het','Heterogêneo']]},
  cmpat:      {label:'Padrão do realce corticomedular',   opts:[['homo','Homogêneo'],['slight','Levemente heterogêneo'],['het','Heterogêneo']]},
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
      return s.umf==='1' ? {shown, score:3, label:''} : {shown, score:2, label:'Oncocitoma / Cromófobo RCC'};
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
      const ge = s.ader==='ge';                                  // ADER ≥ 1,5 → AML · < 1,5 → ccRCC
      const yes = ge?2:3, no = ge?3:4, label = ge?'AML':'ccRCC';
      if(s.dwi==='1') return {shown, score:yes, label};          // restrição marcada
      shown.push('t2pat','cmpat');                               // senão: homogêneo (T2 e realce) ou heterogêneo
      if(!s.t2pat || !s.cmpat) return {shown};
      return {shown, score:(s.t2pat==='homo' && s.cmpat==='homo')?yes:no, label};
    } else if(e==='moderate'){
      return {shown, score:3, label:''};
    } else { // mild
      shown.push('umf');
      if(!s.umf) return {shown};
      return s.umf==='1' ? {shown, score:3, label:''} : {shown, score:1, label:'AML (raro) / Carcinoma Papilar'};
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
      <div class="tfg-sec-lbl">Probabilidade de ccRCC por categoria (informativo)</div>
      <div class="ti-legend">${CCLS_PCT.map(r=>`<div class="ti-legend-row"><span class="lk" style="background:${r.c}">${r.s}</span><span class="lt"><b>ccLS ${r.s}</b> — ${r.pct} eram ccRCC (${r.n} leituras)</span></div>`).join('')}</div>
      <div class="ti-legend-row" style="margin-top:6px"><span class="lt">Percentual de carcinoma de células claras na histologia, por categoria atribuída. Fonte: Schieda et al., Radiology 2022 — estudo retrospectivo multicêntrico (5 centros, 10 radiologistas): 250 massas renais sólidas ≤ 4 cm com confirmação histológica (48% ccRCC), sem gordura macroscópica. Com ccLS ≥ 4: sensibilidade 75%, especificidade 78% e VPP 76%; com ccLS ≤ 2: VPN 88%. Concordância interobservador moderada (κ = 0,58). A variação entre leitores foi grande, e o ccLS 2 teve poucos casos. Dado populacional: não é calculado pela ferramenta acima e não substitui o julgamento clínico.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Definições</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item"><b>Realce corticomedular</b> — razão tumor/córtex: intenso > 75%, moderado 40–75%, discreto < 40%.</div>
        <div class="tfg-ref-item"><b>Gordura microscópica</b> — queda de sinal na fase oposta maior que a soma dos desvios-padrão das duas fases.</div>
        <div class="tfg-ref-item"><b>SEI</b> — áreas hiper/hiporrealçadas na fase corticomedular que se invertem nas fases seguintes.</div>
        <div class="tfg-ref-item"><b>ADER</b> — razão de realce arterial/tardio (SI nas fases corticomedular e nefrográfica). ≥ 1,5 sugere AML pobre em gordura; < 1,5 sugere ccRCC.</div>
        <div class="tfg-ref-item"><b>Restrição marcada à difusão</b> — sinal predominante mais alto na imagem de b = 800 s/mm² e mais baixo no mapa ADC que o do córtex renal.</div>
        <div class="tfg-ref-item"><b>Homogêneo</b> (desempate do ramo hipointenso com realce intenso) — padrão do sinal em T2 e padrão do realce corticomedular ambos homogêneos; “levemente heterogêneo” conta como heterogêneo. Restrição marcada à difusão dispensa essa avaliação. Critério da calculadora do grupo que criou o ccLS (cclsrads.com, UT Southwestern); o artigo não o define.</div>
        <div class="tfg-ref-item"><b>Regras gerais</b> — em caso de conflito entre achados, vale o maior ccLS; se não for possível atribuir um ccLS pelo algoritmo, usar ccLS 3.</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Algoritmo ccLS v2.0</div>
      <a href="/img/ccls-v2.webp" target="_blank" rel="noopener" aria-label="Abrir o algoritmo ccLS v2.0 em tamanho maior">
        <img src="/img/ccls-v2.webp" width="1122" height="757"
             alt="Algoritmo ccLS v2.0: fluxograma por sinal em T2 (hiper, iso, hipointenso), realce corticomedular (intenso, moderado, discreto), gordura microscópica, SEI, ADER e DWI, com as regras de desempate"
             style="display:block;width:100%;height:auto;margin-top:8px;border-radius:10px;background:#fff">
      </a>
      <div class="ti-legend-row" style="margin-top:6px"><span class="lt">Toque na imagem para ampliar. Fonte: Pedrosa I, Cadeddu JA. Radiology 2022;302(2):256–269 (algoritmo ccLS v2.0).</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referência</div>
      <div class="tfg-ref-list">${CCLS_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* Seleção de chip = re-render (revela a próxima pergunta / atualiza o escore). */
function cclsSet(field, val){
  const s = cclsState();
  s[field] = (String(s[field])===String(val)) ? null : val;   // clicar de novo desmarca
  render(true);
}

/* registra no catálogo (CALCS de app.js) — método RM, subespecialidade Medicina Interna */
CALCS.push({id:'ccls', modality:'rm', subspec:'rim', badge:'cc',
  title:'Clear cell Likelihood Score (ccLS)',
  desc:'Avaliação de lesão renal sólida na RM - ccLS v2.0'});
