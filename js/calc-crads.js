/* =========================================================================
   KlugRads — C-RADS 2023 (CT colonografia)
   ---------------------------------------------------------------------------
   Método: TC · Subespecialidade: Medicina Interna.
   Dois eixos independentes: colorretal (C0–C4, com C2a/C2b) e extracolônico
   (E0, E1/E2, E3, E4). Atualização 2023 (Yee et al., Radiology): nova
   subcategoria C2b (estenose diverticular tipo massa benigna) e fusão E1/E2.
   Seleção do achado → categoria + conduta. Layout TI-RADS/O-RADS (classes ti-*).
   Ferramenta educacional.
   ========================================================================= */

const CRADS_TONE = {
  neutral:{c:'#8b98a5', bg:'#8b98a522'},
  low:    {c:'#1f9d55', bg:'#1f9d5522'},
  amber:  {c:'#d9a520', bg:'#d9a52022'},
  orange: {c:'#e07a1f', bg:'#e07a1f22'},
  high:   {c:'#cf2020', bg:'#cf202022'},
};

const CRADS_C = [
  {val:'C0',  name:'Exame inadequado',              crit:'Preparo/insuflação inadequados ou aguardando comparação', mgmt:'Repetir ou complementar o exame.', tone:'neutral'},
  {val:'C1',  name:'Normal ou lesão benigna',       crit:'Sem pólipo ≥ 6 mm; divertículos, lipoma, divertículo invertido', mgmt:'Rastreamento de rotina.', tone:'low'},
  {val:'C2a', name:'Pólipo intermediário / indeterminado', crit:'1–2 pólipos de 6–9 mm; áreas tipo massa (miocose, estenose)', mgmt:'Vigilância por CTC (~3 anos) ou colonoscopia.', tone:'amber'},
  {val:'C2b', name:'Diverticular tipo massa (benigno)', crit:'Estenose diverticular tipo massa, provavelmente benigna (novo em 2023)', mgmt:'Provavelmente benigno; correlacionar.', tone:'amber'},
  {val:'C3',  name:'Provável adenoma avançado',     crit:'≥ 3 pólipos de 6–9 mm, ou pólipo/lesão ≥ 10 mm', mgmt:'Colonoscopia (polipectomia).', tone:'orange'},
  {val:'C4',  name:'Provável massa maligna',        crit:'Massa ≥ 30 mm / aspecto maligno / invasão / compromete a luz', mgmt:'Encaminhar: colonoscopia + estadiamento/cirurgia.', tone:'high'},
];
const CRADS_E = [
  {val:'E0',    name:'Exame limitado',              crit:'Inadequado para avaliação extracolônica', mgmt:'Sem recomendação (limitado).', tone:'neutral'},
  {val:'E1/E2', name:'Normal / sem importância',    crit:'Sem achados ou variante anatômica; cistos simples, colelitíase, hemangioma vertebral', mgmt:'Sem investigação adicional.', tone:'low'},
  {val:'E3',    name:'Provavelmente sem importância', crit:'Cisto minimamente complexo / hiperatenuante homogêneo; caracterização incompleta', mgmt:'Investigar conforme a prática local.', tone:'amber'},
  {val:'E4',    name:'Potencialmente importante',   crit:'Massa renal sólida, linfonodomegalia, aneurisma de aorta, nódulo ≥ 1 cm', mgmt:'Investigação adicional indicada.', tone:'high'},
];

const CRADS_REFS = [
  'Yee J, Kim DH, Pickhardt PJ, et al. CT Colonography Reporting and Data System (C-RADS): Version 2023 Update. Radiology. 2024. doi:10.1148/radiol.232007.',
  'Zalis ME, et al. CT Colonography Reporting and Data System: A Consensus Proposal. Radiology. 2005;236(1):3–9.',
];

function cradsState(){ if(!state.crads) state.crads={c:null, e:null}; return state.crads; }

/* ---- UI ---- */
function cradsOpt(axis, o){
  const on = String(cradsState()[axis])===o.val;
  const t = CRADS_TONE[o.tone];
  return `<div class="ti-ftog ${on?'on':''}" style="width:100%;justify-content:flex-start;text-align:left;align-items:flex-start;gap:9px;line-height:1.35;padding:9px 11px" onclick="cradsSet('${axis}','${esc(o.val)}')">
    <span style="font-weight:800;min-width:38px;${on?'':'color:'+t.c}">${esc(o.val)}</span>
    <span style="font-weight:500">${esc(o.crit)}</span>
  </div>`;
}
function cradsResBox(o){
  const t = CRADS_TONE[o.tone];
  return `<div class="ti-res" style="background:${t.bg};margin-top:10px">
    <div class="lv" style="color:${t.c};font-size:17px;min-width:56px">${esc(o.val)}</div>
    <div class="meta"><div class="a">${esc(o.name)}</div><div class="b">${esc(o.mgmt)}</div></div>
  </div>`;
}
function cradsAxisHTML(axis, list){
  const s = cradsState();
  const sel = list.find(o=>o.val===s[axis]);
  return `<div class="ti-foci" style="flex-direction:column">${list.map(o=>cradsOpt(axis,o)).join('')}</div>${sel?cradsResBox(sel):''}`;
}

function calcCradsHTML(){
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Colorretal (C) — achado dominante</div>
      ${cradsAxisHTML('c', CRADS_C)}
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Extracolônico (E)</div>
      ${cradsAxisHTML('e', CRADS_E)}
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Novidades da versão 2023</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item"><b>C2b</b> — nova subcategoria para estenose diverticular tipo massa, provavelmente benigna.</div>
        <div class="tfg-ref-item"><b>E1/E2 unificadas</b> — nenhuma exige investigação/seguimento adicional.</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${CRADS_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional. C-RADS classifica separadamente os achados colorretais (C) e extracolônicos (E) na CT colonografia; a conduta segue o laudo estruturado e a prática local. Não substitui o julgamento clínico.</b></div>
  </div>`;
}

/* Seleção = re-render (destaca a opção e mostra a conduta). */
function cradsSet(axis, val){
  const s = cradsState();
  s[axis] = (s[axis]===val) ? null : val;   // clicar de novo desmarca
  render(true);
}

/* registra no catálogo (CALCS de app.js) — método TC, subespecialidade Medicina Interna */
CALCS.push({id:'crads', modality:'tc', subspec:'medint', badge:'CR',
  title:'C-RADS 2023',
  desc:'CT colonografia — categorias colorretal (C) e extracolônica (E)'});
