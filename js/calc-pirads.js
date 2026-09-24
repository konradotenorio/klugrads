/* =========================================================================
   KlugRads — PI-RADS v2.1 (RM multiparamétrica de próstata)
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Medicina Interna.
   Categoria PI-RADS por zona, com revelação progressiva:
     Zona PERIFÉRICA (DWI dominante):
       DWI 1→1 · 2→2 · 3→3 (DCE+ sobe para 4) · 4→4 · 5→5
     Zona de TRANSIÇÃO (T2 dominante):
       T2 1→1 · 2→2 (DWI≥4 sobe para 3, "2+1") · 3→3 (DWI=5 sobe para 4, "3+1") · 4→4 · 5→5
   Regras OFICIAIS do PI-RADS v2.1 (Turkbey 2019; Radiology Assistant/AJR).
   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const PIRADS_TONE = {
  low:  {c:'#1f9d55', bg:'#1f9d5522'},   // 1–2
  eq:   {c:'#e07a1f', bg:'#e07a1f22'},   // 3
  high: {c:'#cf2020', bg:'#cf202022'},   // 4–5
};
const PIRADS_DESC = {
  1:{d:'Muito improvável (câncer clinicamente significativo)', risk:'~2%',  tone:'low'},
  2:{d:'Improvável',                                          risk:'~4%',  tone:'low'},
  3:{d:'Equívoco (intermediário)',                           risk:'~20%', tone:'eq'},
  4:{d:'Provável',                                           risk:'~52%', tone:'high'},
  5:{d:'Muito provável',                                     risk:'~89%', tone:'high'},
};
const PIRADS_REFS = [
  'Turkbey B, Rosenkrantz AB, Haider MA, et al. Prostate Imaging Reporting and Data System Version 2.1: 2019 Update. Eur Urol. 2019;76(3):340–351.',
  'Oerther B, et al. Cancer detection rates of the PI-RADS v2.1 assessment categories: systematic review and meta-analysis. Prostate Cancer Prostatic Dis. 2022;25(2):256–263.',
];

const PIRADS_Q = {
  zone:{label:'Zona', opts:[['pz','Periférica (PZ)'],['tz','Transição (TZ)']]},
  dwi: {label:'DWI / ADC', opts:[['1','1'],['2','2'],['3','3'],['4','4'],['5','5']]},
  t2:  {label:'T2W',       opts:[['1','1'],['2','2'],['3','3'],['4','4'],['5','5']]},
  dce: {label:'DCE (realce dinâmico)', opts:[['neg','Negativo'],['pos','Positivo']]},
};

function piradsState(){ if(!state.pirads) state.pirads={}; return state.pirads; }

/* ---- árvore por zona (regras oficiais v2.1) ---- */
function piradsWalk(s){
  const shown = ['zone'];
  if(!s.zone) return {shown};
  if(s.zone==='pz'){
    shown.push('dwi');
    if(!s.dwi) return {shown};
    const d = +s.dwi;
    if(d===3){ shown.push('dce'); if(!s.dce) return {shown}; return {shown, score: s.dce==='pos'?4:3}; }
    return {shown, score:d};
  } else { // tz
    shown.push('t2');
    if(!s.t2) return {shown};
    const t = +s.t2;
    if(t===2){ shown.push('dwi'); if(!s.dwi) return {shown}; return {shown, score: (+s.dwi)>=4?3:2}; }
    if(t===3){ shown.push('dwi'); if(!s.dwi) return {shown}; return {shown, score: (+s.dwi)===5?4:3}; }
    return {shown, score:t};
  }
}

/* ---- UI ---- */
function piradsRow(key){
  const q = PIRADS_Q[key], s = piradsState();
  const chips = q.opts.map(o=>`<div class="ti-ftog ${String(s[key])===String(o[0])?'on':''}" onclick="piradsSet('${key}','${o[0]}')">${esc(o[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>${esc(q.label)}</label><div class="ti-foci">${chips}</div></div>`;
}
function piradsResHTML(w){
  if(w.score==null) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Responda os itens acima para obter a categoria PI-RADS.</span></div>`;
  const info = PIRADS_DESC[w.score], t = PIRADS_TONE[info.tone];
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px">
    <div class="lv" style="color:${t.c}">PI-RADS ${w.score}</div>
    <div class="meta"><div class="a">${esc(info.d)}</div><div class="b">câncer clinicamente significativo: ${info.risk}</div></div>
    <div class="pts" style="background:${t.c}">${w.score}</div>
  </div>`;
}

function calcPiradsHTML(){
  const w = piradsWalk(piradsState());
  const rows = w.shown.map(piradsRow).join('');
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">RM multiparamétrica de próstata</div>
      ${rows}
      <div id="pirads-res">${piradsResHTML(w)}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Categorias PI-RADS (câncer clin. significativo)</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">1</span><span class="lt">Muito improvável · ~2%</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">2</span><span class="lt">Improvável · ~4%</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f">3</span><span class="lt">Equívoco (intermediário) · ~20%</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">4</span><span class="lt">Provável · ~52%</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">5</span><span class="lt">Muito provável · ~89%</span></div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Regras de upgrade (v2.1)</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item"><b>Zona periférica</b> — DWI é dominante; DCE positivo sobe o DWI 3 para PI-RADS 4.</div>
        <div class="tfg-ref-item"><b>Zona de transição</b> — T2 é dominante; DWI ≥ 4 sobe o T2 2 para 3 ("2+1"); DWI = 5 sobe o T2 3 para 4 ("3+1").</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${PIRADS_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional. Categoria PI-RADS v2.1 por lesão dominante e zona; requer RM multiparamétrica adequada. Não substitui o laudo estruturado nem o julgamento clínico.</b></div>
  </div>`;
}

/* Seleção de chip = re-render (revela a próxima pergunta / atualiza a categoria). */
function piradsSet(field, val){
  const s = piradsState();
  s[field] = (String(s[field])===String(val)) ? null : val;   // clicar de novo desmarca
  render(true);
}

/* registra no catálogo (CALCS de app.js) — método RM, subespecialidade Medicina Interna */
CALCS.push({id:'pirads', modality:'rm', subspec:'medint', badge:'PI',
  title:'PI-RADS v2.1',
  desc:'Próstata (RM) — categoria por zona (PZ/TZ)'});
