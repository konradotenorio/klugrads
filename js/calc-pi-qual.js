/* =========================================================================
   KlugRads — PI-QUAL v2 (qualidade de imagem da RM de próstata)
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Medicina Interna.
   Prostate Imaging Quality v2 (Giganti F, et al. 2024). Avalia a QUALIDADE
   diagnóstica do exame — não o câncer. T2 e DWI pontuam 0–4 (4 critérios cada);
   DCE tem 2 critérios (0–2). Escore final 1–3.
     1 Inadequado: T2 e/ou DWI ≤ 2/4
     2 Aceitável:  T2 e DWI ambos ≥ 3/4
     3 Ótimo:      T2 e DWI ambos 4/4 (e, no mpMRI, os 2 critérios de DCE)
   Se a qualidade for inadequada (1), NÃO atribuir PI-RADS/Likert.
   Ferramenta educacional. Revelação progressiva.
   ========================================================================= */

const PIQ_TONE = { high:{c:'#cf2020',bg:'#cf202022'}, amber:{c:'#d9a520',bg:'#d9a52022'}, low:{c:'#1f9d55',bg:'#1f9d5522'} };
const PIQ_INFO = {
  1:{tone:'high',  d:'Inadequado', mgmt:'Qualidade insuficiente. NÃO atribuir PI-RADS/Likert; considerar repetir o exame.'},
  2:{tone:'amber', d:'Aceitável',  mgmt:'Qualidade adequada para o diagnóstico.'},
  3:{tone:'low',   d:'Ótimo',      mgmt:'Qualidade ideal do exame.'},
};
const PIQ_REFS = ['Giganti F, Cardoso Franco P, Campos Carrasco A, et al. PI-QUAL version 2: an updated standardised scoring system for the assessment of image quality of prostate MRI. Eur Radiol / 2024.'];
const PIQ_Q = {
  type:{label:'Tipo de exame', opts:[['bp','Sem contraste (bpMRI)'],['mp','Com contraste (mpMRI)']]},
  t2:{label:'T2 — critérios atendidos (0–4)', opts:[['0','0'],['1','1'],['2','2'],['3','3'],['4','4']]},
  dwi:{label:'DWI — critérios atendidos (0–4)', opts:[['0','0'],['1','1'],['2','2'],['3','3'],['4','4']]},
  dce:{label:'DCE — critérios atendidos (0–2)', opts:[['0','0'],['1','1'],['2','2']]},
};

function piqualState(){ if(!state.piqual) state.piqual={}; return state.piqual; }
function piqualScore(s){
  if(!s.type || s.t2==null || s.dwi==null) return null;
  const t2=+s.t2, dwi=+s.dwi, minTD=Math.min(t2,dwi);
  let sc = (minTD<=2) ? 1 : ((t2===4 && dwi===4) ? 3 : 2);
  if(s.type==='mp'){
    if(s.dce==null) return null;
    const dce=+s.dce;
    if(sc===3 && dce<2) sc=2;                                   // ótimo exige os 2 critérios de DCE
    if(sc===1 && dce===2 && (t2===4||dwi===4)) sc=2;           // exceção de upgrade
  }
  return sc;
}
function piqualShown(s){
  const shown=['type']; if(!s.type) return shown;
  shown.push('t2','dwi'); if(s.type==='mp') shown.push('dce');
  return shown;
}
function piqualRow(key){
  const q=PIQ_Q[key], s=piqualState();
  const chips=q.opts.map(o=>`<div class="ti-ftog ${String(s[key])===String(o[0])?'on':''}" onclick="piqualSet('${key}','${o[0]}')">${esc(o[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>${esc(q.label)}</label><div class="ti-foci">${chips}</div></div>`;
}
function piqualResHTML(){
  const sc=piqualScore(piqualState());
  if(sc==null) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Responda os itens acima para obter o PI-QUAL.</span></div>`;
  const info=PIQ_INFO[sc], t=PIQ_TONE[info.tone];
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px;align-items:flex-start">
    <div class="lv" style="color:${t.c};font-size:18px;min-width:110px">PI-QUAL ${sc}</div>
    <div class="meta"><div class="a">${esc(info.d)}</div><div class="b">${esc(info.mgmt)}</div></div>
    <div class="pts" style="background:${t.c}">${sc}</div>
  </div>`;
}
function calcPiQualHTML(){
  const s=piqualState(); const rows=piqualShown(s).map(piqualRow).join('');
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Qualidade da RM de próstata (PI-QUAL v2)</div>
      ${rows}
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Cada critério atendido de T2/DWI vale 1 ponto (0–4). No mpMRI, o DCE tem 2 critérios (0–2).</span></div>
      <div id="pi-qual-res">${piqualResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Escores</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">1</span><span class="lt">Inadequado — T2 e/ou DWI ≤ 2/4</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#d9a520">2</span><span class="lt">Aceitável — T2 e DWI ≥ 3/4</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">3</span><span class="lt">Ótimo — T2 e DWI 4/4 (+ 2 critérios de DCE no mpMRI)</span></div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referência</div>
      <div class="tfg-ref-list">${PIQ_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}
function piqualSet(field,val){ const s=piqualState(); s[field]=(String(s[field])===String(val))?null:val; render(true); }

CALCS.push({id:'pi-qual', modality:'rm', subspec:'medint', badge:'PQ',
  title:'PI-QUAL v2',
  desc:'Qualidade de imagem da RM de próstata (Prostate Imaging Quality v2)'});
