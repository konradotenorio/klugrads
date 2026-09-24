/* =========================================================================
   KlugRads — O-RADS MRI (lesão anexial na RM)
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Medicina Interna.
   Sistema O-RADS MRI 2022 (ACR; Sadowski/Thomassin-Naggara). Árvore com
   revelação progressiva. NÃO confundir com o O-RADS US (calc 'orads').
     Implantes peritoneais → 5 · sem lesão → 1 · trompa dilatada/paraovariano → 2
     Cístico sem sólido: líquido simples ≤3 cm pré-menopausa → 1; senão → 2
     Tecido sólido: escuro em T2 e DWI (fibroso) → 2; lipídio volumoso realçante → 4;
       DCE curva tipo 1 → 3, tipo 2 → 4, tipo 3 → 5;
       sem DCE: realce ≤ miométrio (30–40s) → 4, > miométrio → 5.
   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const ORMR_TONE = {
  low:   {c:'#1f9d55', bg:'#1f9d5522'},   // 1–2
  amber: {c:'#d9a520', bg:'#d9a52022'},   // 3
  orange:{c:'#e07a1f', bg:'#e07a1f22'},   // 4
  high:  {c:'#cf2020', bg:'#cf202022'},   // 5
};
const ORMR_DESC = {
  1:{d:'Ovário normal',              risk:'—',       tone:'low'},
  2:{d:'Quase certamente benigno',   risk:'< 0,5%',  tone:'low'},
  3:{d:'Baixo risco',                risk:'~5%',     tone:'amber'},
  4:{d:'Risco intermediário',        risk:'~50%',    tone:'orange'},
  5:{d:'Alto risco',                 risk:'~90%',    tone:'high'},
};
const ORMR_REFS = [
  'Sadowski EA, Thomassin-Naggara I, Rockall A, et al. O-RADS MRI Risk Stratification System: Guide for Assessing Adnexal Lesions from the ACR O-RADS Committee. Radiology. 2022;303(1):35–47.',
  'Reinhold C, et al. Ovarian-Adnexal Reporting Lexicon for MRI: A White Paper of the ACR O-RADS MRI Committee. J Am Coll Radiol. 2021;18(5):713–729.',
];

const ORMR_Q = {
  implants:{label:'Implantes peritoneais / nodularidade?', opts:[['nao','Não'],['sim','Sim']]},
  type:{label:'Tipo de lesão', opts:[['none','Ovário normal / sem lesão'],['cystic','Cística sem tecido sólido'],['solid','Contém tecido sólido'],['benign','Trompa dilatada / cisto paraovariano']]},
  cyst:{label:'Conteúdo do cisto', opts:[['phys','Líquido simples, ≤ 3 cm (pré-menopausa)'],['other','Outro (hemorrágico, endometrioma, gordura, multiloc.)']]},
  darkT2:{label:'Tecido sólido escuro em T2 e DWI?', opts:[['nao','Não'],['sim','Sim']]},
  lipid:{label:'Grande volume sólido realçante com lipídio?', opts:[['nao','Não'],['sim','Sim']]},
  enh:{label:'Realce do tecido sólido', opts:[['tic1','DCE tipo 1 (baixo)'],['tic2','DCE tipo 2 (interm.)'],['tic3','DCE tipo 3 (alto)'],['le','Sem DCE: ≤ miométrio'],['gt','Sem DCE: > miométrio']]},
};

function oradsMriState(){ if(!state.oradsMri) state.oradsMri={}; return state.oradsMri; }

/* ---- árvore O-RADS MRI ---- */
function oradsMriWalk(s){
  const shown=['implants'];
  if(!s.implants) return {shown};
  if(s.implants==='sim') return {shown, score:5, note:'Implantes peritoneais / nodularidade'};
  shown.push('type');
  if(!s.type) return {shown};
  if(s.type==='none')   return {shown, score:1, note:'Ovários normais / sem lesão'};
  if(s.type==='benign') return {shown, score:2, note:'Trompa dilatada / cisto paraovariano'};
  if(s.type==='cystic'){
    shown.push('cyst');
    if(!s.cyst) return {shown};
    return s.cyst==='phys'
      ? {shown, score:1, note:'Cisto fisiológico (≤ 3 cm, líquido simples, pré-menopausa)'}
      : {shown, score:2, note:'Cisto sem tecido sólido'};
  }
  // tecido sólido
  shown.push('darkT2');
  if(!s.darkT2) return {shown};
  if(s.darkT2==='sim') return {shown, score:2, note:'Tecido sólido escuro em T2 e DWI (fibroso)'};
  shown.push('lipid');
  if(!s.lipid) return {shown};
  if(s.lipid==='sim') return {shown, score:4, note:'Grande volume de tecido sólido realçante com lipídio'};
  shown.push('enh');
  if(!s.enh) return {shown};
  const MAP = {tic1:3, tic2:4, tic3:5, le:4, gt:5};
  const NOTE = {tic1:'DCE — curva tipo 1 (baixo risco)', tic2:'DCE — curva tipo 2 (intermediário)', tic3:'DCE — curva tipo 3 (alto risco)', le:'Sem DCE — realce ≤ miométrio (30–40s)', gt:'Sem DCE — realce > miométrio (30–40s)'};
  return {shown, score:MAP[s.enh], note:NOTE[s.enh]};
}

/* ---- UI ---- */
function oradsMriRow(key){
  const q = ORMR_Q[key], s = oradsMriState();
  const chips = q.opts.map(o=>`<div class="ti-ftog ${String(s[key])===String(o[0])?'on':''}" onclick="oradsMriSet('${key}','${o[0]}')">${esc(o[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>${esc(q.label)}</label><div class="ti-foci">${chips}</div></div>`;
}
function oradsMriResHTML(w){
  if(w.score==null) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Responda os itens acima para obter a categoria O-RADS MRI.</span></div>`;
  const info = ORMR_DESC[w.score], t = ORMR_TONE[info.tone];
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px;align-items:flex-start">
    <div class="lv" style="color:${t.c};font-size:19px;min-width:110px">O-RADS ${w.score}</div>
    <div class="meta"><div class="a">${esc(info.d)}${info.risk!=='—'?' · malignidade '+info.risk:''}</div><div class="b">${esc(w.note||'')}</div></div>
    <div class="pts" style="background:${t.c}">${w.score}</div>
  </div>`;
}

function calcOradsMriHTML(){
  const w = oradsMriWalk(oradsMriState());
  const rows = w.shown.map(oradsMriRow).join('');
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Lesão anexial — RM</div>
      ${rows}
      <div id="orads-mri-res">${oradsMriResHTML(w)}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Categorias O-RADS MRI (risco de malignidade)</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">1</span><span class="lt">Ovário normal</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">2</span><span class="lt">Quase certamente benigno · < 0,5%</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#d9a520">3</span><span class="lt">Baixo risco · ~5%</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f">4</span><span class="lt">Risco intermediário · ~50%</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">5</span><span class="lt">Alto risco · ~90%</span></div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Curva tempo-intensidade (TIC)</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item"><b>Tipo 1</b> — realce progressivo, mais fraco que o miométrio, sem ombro/platô.</div>
        <div class="tfg-ref-item"><b>Tipo 2</b> — platô; inclinação inicial ≤ miométrio.</div>
        <div class="tfg-ref-item"><b>Tipo 3</b> — realce precoce/íngreme, maior que o miométrio.</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${ORMR_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional. O-RADS MRI estratifica o risco de malignidade de lesões anexiais; requer RM adequada (idealmente com DCE). Não substitui o laudo estruturado nem o julgamento clínico.</b></div>
  </div>`;
}

/* Seleção de chip = re-render (revela a próxima pergunta / atualiza a categoria). */
function oradsMriSet(field, val){
  const s = oradsMriState();
  s[field] = (String(s[field])===String(val)) ? null : val;
  render(true);
}

/* registra no catálogo (CALCS de app.js) — método RM, subespecialidade Medicina Interna */
CALCS.push({id:'orads-mri', modality:'rm', subspec:'medint', badge:'OM',
  title:'O-RADS MRI',
  desc:'Lesão anexial na RM (ADNEX MR / curva tempo-intensidade)'});
