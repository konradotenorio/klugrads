/* =========================================================================
   KlugRads — CAD-RADS 2.0 (angio-TC de coronárias)
   ---------------------------------------------------------------------------
   Método: TC · Subespecialidade: Tórax.
   Coronary Artery Disease – Reporting and Data System 2.0 (Cury RC, et al.
   SCCT/ACC/ACR/NASCI. JACC Cardiovasc Imaging / Radiology CTI 2022).
   Código: CAD-RADS [estenose]/[P carga de placa]/[modificadores].
   Estenose = maior grau de estreitamento luminal em vaso > 1,5 mm.
   Revelação progressiva. Ferramenta educacional.
   ========================================================================= */

const CAD_TONE = {
  gray:  {c:'#6b7480', bg:'#6b748022'},
  low:   {c:'#1f9d55', bg:'#1f9d5522'},
  amber: {c:'#d9a520', bg:'#d9a52022'},
  orange:{c:'#e07a1f', bg:'#e07a1f22'},
  high:  {c:'#cf2020', bg:'#cf202022'},
};
const CAD_INFO = {
  '0': {tone:'low',    d:'0% — sem DAC',                    mgmt:'Sem placa nem estenose. Investigar causas não coronarianas dos sintomas; sem propedêutica cardíaca adicional para DAC.'},
  '1': {tone:'low',    d:'1–24% — mínima',                  mgmt:'Modificação de fatores de risco e terapia preventiva; considerar causas não ateroscleróticas.'},
  '2': {tone:'amber',  d:'25–49% — leve',                   mgmt:'Terapia preventiva e controle de fatores de risco.'},
  '3': {tone:'amber',  d:'50–69% — moderada',               mgmt:'Considerar avaliação funcional (CT-FFR ou teste de isquemia); terapia preventiva ± anti-isquêmica.'},
  '4A':{tone:'orange', d:'70–99% — grave (1–2 vasos)',      mgmt:'Considerar cateterismo (CATE) ou teste funcional; terapia clínica otimizada.'},
  '4B':{tone:'high',   d:'TCE ≥ 50% ou triarterial obstrutiva', mgmt:'Cateterismo (CATE) recomendado; terapia clínica otimizada.'},
  '5': {tone:'high',   d:'100% — oclusão total',            mgmt:'Considerar CATE e/ou avaliação de viabilidade; terapia clínica otimizada.'},
  'N': {tone:'gray',   d:'Não diagnóstico',                 mgmt:'Estudo não avaliável (artefato/movimento). Avaliação adicional ou alternativa necessária.'},
};
const CAD_REFS = [
  'Cury RC, Leipsic J, Abbara S, et al. CAD-RADS 2.0 — 2022 Coronary Artery Disease Reporting and Data System (SCCT/ACC/ACR/NASCI). JACC Cardiovasc Imaging / Radiol Cardiothorac Imaging. 2022.',
];
const CAD_MODS = [['HRP','HRP (placa de alto risco)'],['I','Isquemia (I)'],['S','Stent (S)'],['G','Enxerto (G)'],['E','Exceção (E)']];

function cadradsState(){ if(!state.cadrads) state.cadrads={mods:[]}; if(!state.cadrads.mods) state.cadrads.mods=[]; return state.cadrads; }

function cadradsCat(s){
  if(!s.stenosis) return null;
  if(s.stenosis==='N')     return 'N';
  if(s.stenosis==='0')     return '0';
  if(s.stenosis==='1-24')  return '1';
  if(s.stenosis==='25-49') return '2';
  if(s.stenosis==='50-69' || s.stenosis==='70-99'){
    if(!s.extent) return null;
    if(s.extent==='tce' || s.extent==='tri') return '4B';
    return s.stenosis==='50-69' ? '3' : '4A';
  }
  if(s.stenosis==='100')   return '5';
  return null;
}
function cadradsCode(s){
  const cat=cadradsCat(s); if(cat==null) return null;
  let code='CAD-RADS '+cat;
  if(cat!=='0' && cat!=='N' && s.plaque && s.plaque!=='none') code += '/'+s.plaque.toUpperCase();
  ['HRP','I','S','G','E'].forEach(m=>{ if((s.mods||[]).indexOf(m)>=0) code += '/'+m; });
  return {cat, code};
}

/* ---- perguntas visíveis ---- */
function cadradsShown(s){
  const shown=['stenosis'];
  if(!s.stenosis) return shown;
  if(s.stenosis==='50-69' || s.stenosis==='70-99') shown.push('extent');
  if(s.stenosis!=='0' && s.stenosis!=='N') shown.push('plaque');
  shown.push('mods');
  return shown;
}

/* ---- UI ---- */
const CAD_Q = {
  stenosis:{label:'Estenose máxima (maior estreitamento)', opts:[
    ['0','0%'],['1-24','1–24%'],['25-49','25–49%'],['50-69','50–69%'],['70-99','70–99%'],['100','100%'],['N','Não avaliável'],
  ]},
  extent:{label:'Extensão (para estenose ≥ 50%)', opts:[
    ['12','1–2 vasos (sem TCE)'],['tce','TCE ≥ 50%'],['tri','Triarterial (≥ 70% em 3 vasos)'],
  ]},
  plaque:{label:'Carga de placa (opcional)', opts:[
    ['none','Não informar'],['p1','P1 leve'],['p2','P2 moderada'],['p3','P3 grave'],['p4','P4 extensa'],
  ]},
};
function cadradsChipRow(key){
  const q=CAD_Q[key], s=cadradsState();
  const chips=q.opts.map(o=>`<div class="ti-ftog ${String(s[key])===String(o[0])?'on':''}" onclick="cadradsSet('${key}','${o[0]}')">${esc(o[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>${esc(q.label)}</label><div class="ti-foci">${chips}</div></div>`;
}
function cadradsModsRow(){
  const s=cadradsState();
  const chips=CAD_MODS.map(m=>`<div class="ti-ftog ${(s.mods||[]).indexOf(m[0])>=0?'on':''}" onclick="cadradsToggleMod('${m[0]}')">${esc(m[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>Modificadores (marque os presentes)</label><div class="ti-foci">${chips}</div></div>`;
}
function cadradsResHTML(){
  const s=cadradsState(); const r=cadradsCode(s);
  if(!r) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Responda os itens acima para obter o CAD-RADS.</span></div>`;
  const info=CAD_INFO[r.cat], t=CAD_TONE[info.tone];
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px;align-items:flex-start">
    <div class="lv" style="color:${t.c};font-size:16px;min-width:136px">${esc(r.code)}</div>
    <div class="meta"><div class="a">${esc(info.d)}</div><div class="b">${esc(info.mgmt)}</div></div>
    <div class="pts" style="background:${t.c}">${r.cat}</div>
  </div>`;
}
function calcCadradsHTML(){
  const s=cadradsState(); const shown=cadradsShown(s);
  let rows='';
  shown.forEach(k=>{ rows += (k==='mods') ? cadradsModsRow() : cadradsChipRow(k); });
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Angio-TC de coronárias</div>
      ${rows}
      <div id="cadrads-res">${cadradsResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Carga de placa (P) e modificadores</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item"><b>P1</b> leve (CAC 1–100 / SIS ≤2) · <b>P2</b> moderada (101–300 / SIS 3–4) · <b>P3</b> grave (301–999 / SIS 5–7) · <b>P4</b> extensa (≥1000 / SIS ≥8).</div>
        <div class="tfg-ref-item"><b>HRP</b> = placa de alto risco (≥2 de: remodelamento positivo, baixa atenuação &lt; 30 UH, calcificação puntiforme, sinal do anel de guardanapo). <b>I</b> = isquemia (CT-FFR ≤ 0,80 ou perfusão anormal). <b>S</b> = stent · <b>G</b> = enxerto · <b>E</b> = achado não aterosclerótico.</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${CAD_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

function cadradsSet(field,val){ const s=cadradsState(); s[field]=(String(s[field])===String(val))?null:val; render(true); }
function cadradsToggleMod(m){
  const s=cadradsState(); const i=s.mods.indexOf(m);
  if(i>=0) s.mods.splice(i,1); else s.mods.push(m);
  const el=document.getElementById('cadrads-res'); if(el) el.innerHTML=translateHTML(cadradsResHTML());
  // reflete o estado "on" dos chips sem recriar tudo
  render(true);
}

/* registra no catálogo (CALCS de app.js) — método TC, subespecialidade Tórax */
CALCS.push({id:'cadrads', modality:'tc', subspec:'torax', badge:'CAD',
  title:'CAD-RADS 2.0',
  desc:'Angio-TC de coronárias — estenose, carga de placa e modificadores (SCCT 2022)'});
