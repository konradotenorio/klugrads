/* =========================================================================
   KlugRads — PRECISE v2 (RM seriada na vigilância ativa da próstata)
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Medicina Interna.
   Prostate Cancer Radiological Estimation of Change In Sequential Evaluation,
   versão 2 (Giganti F, et al. Eur Urol 2024). Classifica a MUDANÇA radiológica
   da RM atual em relação ao exame de base (baseline), escala 1–5:
     1 Regressão (resolução)     · 2 Regressão (redução)
     3 Estável (3-V visível / 3-NV não visível)
     4 Progressão DENTRO da próstata · 5 Progressão FORA (estádio)
   Também há "não diagnóstico" (qualidade inadequada). Ferramenta educacional.
   ========================================================================= */

const PRE_TONE = { low:{c:'#1f9d55',bg:'#1f9d5522'}, amber:{c:'#d9a520',bg:'#d9a52022'}, orange:{c:'#e07a1f',bg:'#e07a1f22'}, high:{c:'#cf2020',bg:'#cf202022'}, gray:{c:'#6b7480',bg:'#6b748022'} };
/* opção → {code, tone, desc, mgmt} */
const PRE_MAP = {
  resol:  {code:'1',    tone:'low',    d:'Regressão — resolução', mgmt:'Achados suspeitos prévios desapareceram. Manter vigilância ativa.'},
  reduc:  {code:'2',    tone:'low',    d:'Regressão — redução',   mgmt:'Redução do tamanho/conspicuidade das lesões. Manter vigilância ativa.'},
  estavV: {code:'3-V',  tone:'amber',  d:'Estável — lesão visível',     mgmt:'Sem mudança significativa (lesão visível estável). Manter vigilância ativa.'},
  estavN: {code:'3-NV', tone:'amber',  d:'Estável — sem lesão visível', mgmt:'Sem lesão visível, estável. Manter vigilância ativa.'},
  progIn: {code:'4',    tone:'orange', d:'Progressão dentro da próstata', mgmt:'Aumento significativo do tamanho/conspicuidade (confinado à próstata). Sugere progressão radiológica — reavaliar (biópsia/tratamento).'},
  progOut:{code:'5',    tone:'high',   d:'Progressão fora da próstata',   mgmt:'Progressão de estádio (extensão extraprostática, vesículas seminais, linfonodos ou metástases). Reavaliar/tratar; discussão multidisciplinar.'},
  nd:     {code:'ND',   tone:'gray',   d:'Não diagnóstico',        mgmt:'Qualidade inadequada (ver PI-QUAL). Não classificar a mudança; considerar repetir o exame.'},
};
const PRE_REFS = ['Giganti F, Moore CM, Punwani S, et al. PRECISE Version 2: Updated Recommendations for Reporting Prostate MRI in Patients on Active Surveillance. Eur Urol. 2024.'];
const PRE_Q = { change:{label:'Mudança em relação ao exame de base (baseline)', opts:[
  ['resol','Resolução das lesões prévias'],
  ['reduc','Redução do tamanho/conspicuidade'],
  ['estavV','Estável — com lesão visível'],
  ['estavN','Estável — sem lesão visível'],
  ['progIn','Aumento (progressão dentro da próstata)'],
  ['progOut','Progressão de estádio / extraprostática'],
  ['nd','Exame não diagnóstico (qualidade)'],
]}};

function preciseState(){ if(!state.precise) state.precise={}; return state.precise; }
function preciseRow(){
  const q=PRE_Q.change, s=preciseState();
  const chips=q.opts.map(o=>`<div class="ti-ftog ${String(s.change)===String(o[0])?'on':''}" onclick="preciseSet('${o[0]}')">${esc(o[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>${esc(q.label)}</label><div class="ti-foci">${chips}</div></div>`;
}
function preciseResHTML(){
  const s=preciseState(); const m=s.change?PRE_MAP[s.change]:null;
  if(!m) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Selecione a mudança para obter o PRECISE.</span></div>`;
  const t=PRE_TONE[m.tone];
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px;align-items:flex-start">
    <div class="lv" style="color:${t.c};font-size:17px;min-width:120px">PRECISE ${m.code}</div>
    <div class="meta"><div class="a">${esc(m.d)}</div><div class="b">${esc(m.mgmt)}</div></div>
  </div>`;
}
function calcPreciseHTML(){
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">RM seriada na vigilância ativa (PRECISE v2)</div>
      ${preciseRow()}
      <div id="precise-res">${preciseResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Escala PRECISE</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">1</span><span class="lt">Resolução</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">2</span><span class="lt">Redução</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#d9a520">3</span><span class="lt">Estável (3-V visível · 3-NV não visível)</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f">4</span><span class="lt">Progressão dentro da próstata</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">5</span><span class="lt">Progressão fora (estádio)</span></div>
      </div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">1–3 favorecem manter a vigilância ativa; 4–5 sugerem progressão radiológica.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referência</div>
      <div class="tfg-ref-list">${PRE_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}
function preciseSet(val){ const s=preciseState(); s.change=(String(s.change)===String(val))?null:val; render(true); }

CALCS.push({id:'precise', modality:'rm', subspec:'prostata', badge:'PR',
  title:'PRECISE v2',
  desc:'Mudança radiológica na vigilância ativa da próstata (PRECISE v2)'});
