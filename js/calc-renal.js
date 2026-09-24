/* =========================================================================
   KlugRads — RENAL Score (nefrometria de massa renal)
   ---------------------------------------------------------------------------
   Método: TC · Subespecialidade: Medicina Interna.
   Escore R.E.N.A.L. (Kutikov & Uzzo) — complexidade de massa renal:
     R (raio) + E (exofítico/endofítico) + N (distância ao seio) + L (localização
     polar), cada um 1–3 → total 4–12. Sufixo A (anterior/posterior/x), opcional,
     não altera o número.
     Baixa 4–6 (~6,4%) · Moderada 7–9 (~11,1%) · Alta 10–12 (~21,9%).
   Fonte dos critérios: site do Dr. Ricardo Romano (ricardoromano.com).
   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const RENAL_TONE = {
  low:  {c:'#1f9d55', bg:'#1f9d5522', tag:'Baixa'},
  mod:  {c:'#e07a1f', bg:'#e07a1f22', tag:'Moderada'},
  high: {c:'#cf2020', bg:'#cf202022', tag:'Alta'},
};
const RENAL_REF = 'Kutikov A, Uzzo RG. The R.E.N.A.L. nephrometry score: a comprehensive standardized system for quantitating renal tumor size, location and depth. J Urol. 2009;182(3):844–853.';

function renalState(){ if(!state.renal) state.renal={r:null,e:null,n:null,a:null,l:null}; return state.renal; }

function renalResult(s){
  if(!s.r || !s.e || !s.n || !s.l) return null;
  const total = (+s.r) + (+s.e) + (+s.n) + (+s.l);
  const suffix = s.a || '';
  let comp, tone, risk;
  if(total >= 10){ comp='Alta complexidade';     tone='high'; risk='21,9%'; }
  else if(total >= 7){ comp='Moderada complexidade'; tone='mod';  risk='11,1%'; }
  else { comp='Baixa complexidade'; tone='low'; risk='6,4%'; }
  return {total, suffix, comp, tone, risk};
}

/* ---- UI ---- */
function renalChip(field, val, txt){
  const on = String(renalState()[field])===String(val);
  return `<div class="ti-ftog ${on?'on':''}" onclick="renalSet('${field}','${val}')">${esc(txt)}</div>`;
}
function renalRow(label, field, opts){
  return `<div class="ti-field ti-field-foci">
    <label>${esc(label)}</label>
    <div class="ti-foci">${opts.map(o=>renalChip(field,o[0],o[1])).join('')}</div>
  </div>`;
}
function renalResHTML(){
  const r = renalResult(renalState());
  if(!r) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Selecione <b>R</b>, <b>E</b>, <b>N</b> e <b>L</b> para o escore (A é sufixo opcional).</span></div>`;
  const t = RENAL_TONE[r.tone];
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px">
    <div class="lv" style="color:${t.c}">${r.total}${esc(r.suffix)}</div>
    <div class="meta"><div class="a">${r.comp}</div><div class="b">risco de complicações ~ ${r.risk} · escore R.E.N.A.L. ${r.total}${esc(r.suffix)}</div></div>
    <div class="pts" style="background:${t.c}">${t.tag}</div>
  </div>`;
}

function calcRenalHTML(){
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Componentes R.E.N.A.L.</div>
      ${renalRow('R — Raio (maior diâmetro)','r',[['1','⩽ 4 cm'],['2','4–7 cm'],['3','⩾ 7 cm']])}
      ${renalRow('E — Exo/endofítico','e',[['1','⩾ 50% exofítico'],['2','< 50% exofítico'],['3','Endofítico']])}
      ${renalRow('N — Distância ao seio','n',[['1','⩾ 7 mm'],['2','4–7 mm'],['3','⩽ 4 mm']])}
      ${renalRow('A — Axial (sufixo)','a',[['a','Anterior'],['p','Posterior'],['x','Polar (x)']])}
      ${renalRow('L — Localização polar','l',[['1','Acima/abaixo'],['2','Atravessa 1 linha'],['3','Cruza mais']])}
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt"><b>N</b>: menor distância entre a lesão e o seio renal / sistema coletor. <b>L3</b>: > 50% atravessa uma linha polar, atravessa ambas as linhas, fica entre elas ou cruza a linha média.</span></div>
      <div id="renal-res">${renalResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Complexidade (total 4–12)</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55"> </span><span class="lt"><b>Baixa</b> — 4–6 · complicações ~ 6,4%</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f"> </span><span class="lt"><b>Moderada</b> — 7–9 · complicações ~ 11,1%</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020"> </span><span class="lt"><b>Alta</b> — 10–12 · complicações ~ 21,9%</span></div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referência</div>
      <div class="tfg-ref-list"><div class="tfg-ref-item">${esc(RENAL_REF)}</div></div>
    </div>
    <div class="disc"><b>Ferramenta educacional. O escore R.E.N.A.L. quantifica a complexidade anatômica da massa renal; não define benignidade/malignidade nem substitui o julgamento clínico.</b></div>
  </div>`;
}

/* Seleção de chip = re-render (atualiza chips + resultado). Sem inputs de texto. */
function renalSet(field, val){
  const s = renalState();
  s[field] = (String(s[field])===String(val)) ? null : val;   // clicar de novo desmarca
  render(true);
}

/* registra no catálogo (CALCS de app.js) — método TC, subespecialidade Medicina Interna */
CALCS.push({id:'renal', modality:'tc', subspec:'medint', badge:'RN',
  title:'RENAL Score',
  desc:'Nefrometria de massa renal — complexidade (R.E.N.A.L.)'});
