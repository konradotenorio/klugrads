/* =========================================================================
   KlugRads — Coleções pancreáticas na pancreatite (Atlanta revisada)
   ---------------------------------------------------------------------------
   Método: TC · Subespecialidade: Medicina Interna.
   Nomenclatura das coleções (Classificação de Atlanta revisada, 2012) por
   necrose × tempo/encapsulamento:
     Sem necrose (edematosa) · < 4 sem, sem parede      → APFC
     Sem necrose (edematosa) · ≥ 4 sem, encapsulada     → Pseudocisto
     Com necrose (necrotizante) · < 4 sem, sem parede   → ANC
     Com necrose (necrotizante) · ≥ 4 sem, encapsulada  → WON
   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const PANCR_TONE = {
  low:    {c:'#1f9d55', bg:'#1f9d5522'},   // sem necrose (APFC, pseudocisto)
  orange: {c:'#e07a1f', bg:'#e07a1f22'},   // com necrose (ANC, WON)
};
const PANCR_OUT = {
  apfc:   {sigla:'APFC',        nome:'Coleção fluida peripancreática aguda', def:'Fluido homogêneo, sem parede definida, < 4 semanas, pancreatite edematosa intersticial. Maioria resolve espontaneamente.', tone:'low'},
  pseudo: {sigla:'Pseudocisto', nome:'Pseudocisto pancreático',              def:'Coleção fluida encapsulada (parede bem definida), ≥ 4 semanas, sem necrose sólida. Raro após pancreatite necrotizante.', tone:'low'},
  anc:    {sigla:'ANC',         nome:'Coleção necrótica aguda',             def:'Fluido + tecido necrótico (heterogênea), sem parede, < 4 semanas, pancreatite necrotizante.', tone:'orange'},
  won:    {sigla:'WON',         nome:'Necrose organizada (walled-off)',      def:'Coleção encapsulada de material necrótico, ≥ 4 semanas.', tone:'orange'},
};
const PANCR_REFS = [
  'Banks PA, Bollen TL, Dervenis C, et al. Classification of acute pancreatitis — 2012: revision of the Atlanta classification and definitions by international consensus. Gut. 2013;62(1):102–111.',
  'Foster BR, et al. Revised Atlanta Classification for Acute Pancreatitis: A Pictorial Essay. RadioGraphics. 2016;36(3):675–687.',
];

function pancrState(){ if(!state.pancr) state.pancr={nec:null, tempo:null}; return state.pancr; }

function pancrResult(s){
  if(!s.nec || !s.tempo) return null;
  if(s.nec==='sem') return s.tempo==='ag' ? PANCR_OUT.apfc : PANCR_OUT.pseudo;
  return s.tempo==='ag' ? PANCR_OUT.anc : PANCR_OUT.won;
}

/* ---- UI ---- */
function pancrChip(field, val, txt){
  const on = String(pancrState()[field])===String(val);
  return `<div class="ti-ftog ${on?'on':''}" onclick="pancrSet('${field}','${val}')">${esc(txt)}</div>`;
}
function pancrRow(label, field, opts){
  return `<div class="ti-field ti-field-foci"><label>${esc(label)}</label><div class="ti-foci">${opts.map(o=>pancrChip(field,o[0],o[1])).join('')}</div></div>`;
}
function pancrResHTML(){
  const o = pancrResult(pancrState());
  if(!o) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Selecione a <b>necrose</b> e o <b>tempo/encapsulamento</b> para nomear a coleção.</span></div>`;
  const t = PANCR_TONE[o.tone];
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px;align-items:flex-start">
    <div class="lv" style="color:${t.c};font-size:17px;min-width:74px">${esc(o.sigla)}</div>
    <div class="meta"><div class="a">${esc(o.nome)}</div><div class="b">${esc(o.def)}</div></div>
  </div>`;
}

function calcPancreatiteHTML(){
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Coleção pancreática — Atlanta revisada</div>
      ${pancrRow('Conteúdo / necrose','nec',[['sem','Sem necrose (fluido homogêneo)'],['com','Com necrose (heterogêneo)']])}
      ${pancrRow('Tempo / parede','tempo',[['ag','< 4 semanas · sem cápsula'],['org','≥ 4 semanas · encapsulada']])}
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt"><b>Sem necrose</b> = pancreatite edematosa intersticial; <b>com necrose</b> = pancreatite necrotizante (parênquima e/ou peripancreática).</span></div>
      <div id="pancr-res">${pancrResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">As quatro coleções</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">APFC</span><span class="lt">Sem necrose · < 4 sem, sem parede</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">PSC</span><span class="lt">Pseudocisto — sem necrose · ≥ 4 sem, encapsulada</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f">ANC</span><span class="lt">Com necrose · < 4 sem, sem parede</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f">WON</span><span class="lt">Com necrose · ≥ 4 sem, encapsulada</span></div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${PANCR_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional. Nomenclatura das coleções pancreáticas pela Classificação de Atlanta revisada; a infecção (gás/clínica) é avaliada à parte. Não substitui o julgamento clínico.</b></div>
  </div>`;
}

/* Seleção de chip = re-render (atualiza a nomenclatura). */
function pancrSet(field, val){
  const s = pancrState();
  s[field] = (String(s[field])===String(val)) ? null : val;   // clicar de novo desmarca
  render(true);
}

/* registra no catálogo (CALCS de app.js) — método TC, subespecialidade Medicina Interna */
CALCS.push({id:'pancr', modality:'tc', subspec:'medint', badge:'PA',
  title:'Coleções Pancreáticas',
  desc:'Nomenclatura na pancreatite (Atlanta revisada)'});
