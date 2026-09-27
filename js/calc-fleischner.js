/* =========================================================================
   KlugRads — Critérios de Fleischner 2017 (nódulo pulmonar INCIDENTAL)
   ---------------------------------------------------------------------------
   Método: TC · Subespecialidade: Tórax.
   Conduta para nódulos pulmonares INCIDENTAIS em adultos ≥ 35 anos
   (MacMahon H, et al. Radiology 2017 — Fleischner Society).
   NÃO se aplica a: rastreamento de câncer de pulmão (usar Lung-RADS),
   pacientes com câncer conhecido ou imunossuprimidos. Usa o DIÂMETRO MÉDIO.
   Para nódulos subsólidos a conduta independe do risco. Múltiplos: guiar pela
   lesão mais suspeita. Revelação progressiva. Ferramenta educacional.
   ========================================================================= */

const FL_TONE = {
  low:   {c:'#1f9d55', bg:'#1f9d5522', tag:'Sem seguimento'},
  amber: {c:'#d9a520', bg:'#d9a52022', tag:'Seguimento'},
  orange:{c:'#e07a1f', bg:'#e07a1f22', tag:'Seguimento'},
  high:  {c:'#cf2020', bg:'#cf202022', tag:'Investigar'},
};
const FL_REFS = [
  'MacMahon H, Naidich DP, Goo JM, et al. Guidelines for Management of Incidental Pulmonary Nodules Detected on CT Images: From the Fleischner Society 2017. Radiology. 2017;284(1):228–243.',
];
const FL_Q = {
  comp:{label:'Composição', opts:[['solid','Sólido'],['ggn','Vidro fosco (puro)'],['partsolid','Parte-sólido']]},
  count:{label:'Número de nódulos', opts:[['unico','Único'],['multi','Múltiplos']]},
  risk:{label:'Risco do paciente', opts:[['baixo','Baixo'],['alto','Alto']]},
};

function fleischnerState(){ if(!state.fleischner) state.fleischner={}; return state.fleischner; }
function flNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }

/* ---- conduta a partir dos parâmetros ---- */
function fleischnerRec(s){
  if(!s.comp || !s.count) return null;
  const multi = s.count==='multi';
  if(s.comp==='solid'){
    const d=flNum(s.size); if(d==null || !s.risk) return null;
    const high = s.risk==='alto';
    let sum = `Nódulo sólido ${multi?'múltiplo':'único'}, ${String(d).replace('.',',')} mm, risco ${high?'alto':'baixo'}`;
    if(d<6) return high
      ? {tone:'amber', txt:'TC opcional em 12 meses (se morfologia suspeita ou lobo superior).', sum}
      : {tone:'low',   txt:'Sem seguimento de rotina.', sum};
    if(multi) return high
      ? {tone:'amber', txt:'TC em 3–6 meses e, depois, TC em 18–24 meses.', sum}
      : {tone:'amber', txt:'TC em 3–6 meses; depois, considerar TC em 18–24 meses.', sum};
    if(d>8) return {tone:'high', txt:'Considerar TC em 3 meses, PET/TC ou amostragem tecidual.', sum};
    return high
      ? {tone:'amber', txt:'TC em 6–12 meses e, depois, TC em 18–24 meses.', sum}
      : {tone:'amber', txt:'TC em 6–12 meses; depois, considerar TC em 18–24 meses.', sum};
  }
  if(s.comp==='ggn'){
    const d=flNum(s.size); if(d==null) return null;
    let sum = `Nódulo em vidro fosco ${multi?'múltiplo':'único'}, ${String(d).replace('.',',')} mm`;
    if(multi) return d<6
      ? {tone:'amber', txt:'TC em 3–6 meses; se estável, considerar TC em 2 e 4 anos.', sum}
      : {tone:'amber', txt:'TC em 3–6 meses; conduta subsequente pela lesão mais suspeita.', sum};
    return d<6
      ? {tone:'low',   txt:'Sem seguimento de rotina.', sum}
      : {tone:'amber', txt:'TC em 6–12 meses para confirmar persistência; depois, TC a cada 2 anos até 5 anos.', sum};
  }
  if(s.comp==='partsolid'){
    const t=flNum(s.sizeTotal); if(t==null) return null;
    const c=flNum(s.sizeComp);
    let sum = `Nódulo parte-sólido ${multi?'múltiplo':'único'}, ${String(t).replace('.',',')} mm total${c!=null?' · sólido '+String(c).replace('.',',')+' mm':''}`;
    if(multi) return t<6
      ? {tone:'amber', txt:'TC em 3–6 meses; se estável, considerar TC em 2 e 4 anos.', sum}
      : {tone:'amber', txt:'TC em 3–6 meses; conduta subsequente pela lesão mais suspeita.', sum};
    if(t<6) return {tone:'low', txt:'Sem seguimento de rotina.', sum};
    if(c!=null && c>=6) return {tone:'high', txt:'Componente sólido ≥ 6 mm — altamente suspeito; considerar PET/TC, biópsia ou ressecção.', sum};
    return {tone:'amber', txt:'TC em 3–6 meses para confirmar persistência. Se persistir e componente sólido < 6 mm, TC anual por 5 anos.', sum};
  }
  return null;
}

/* ---- perguntas visíveis (revelação progressiva) ---- */
function fleischnerShown(s){
  const shown=['comp'];
  if(!s.comp) return shown;
  shown.push('count');
  if(!s.count) return shown;
  shown.push('__size');
  if(s.comp==='solid') shown.push('risk');   // risco só importa para nódulo sólido
  return shown;
}

/* ---- UI ---- */
function fleischnerChipRow(key){
  const q=FL_Q[key], s=fleischnerState();
  const chips=q.opts.map(o=>`<div class="ti-ftog ${String(s[key])===String(o[0])?'on':''}" onclick="fleischnerSet('${key}','${o[0]}')">${esc(o[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>${esc(q.label)}</label><div class="ti-foci">${chips}</div></div>`;
}
function flSizeField(k,label,ph,val){
  return `<div class="ti-field"><label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf"><input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(val==null?'':val)}" oninput="fleischnerSetSize('${k}',this.value)"><span>mm</span></div></div></div>`;
}
function fleischnerSizeHTML(){
  const s=fleischnerState();
  if(s.comp==='partsolid') return flSizeField('sizeTotal','Diâmetro médio total','ex.: 8', s.sizeTotal)+flSizeField('sizeComp','Componente sólido (diâm. médio)','ex.: 4', s.sizeComp);
  return flSizeField('size','Diâmetro médio','ex.: 7', s.size);
}
function fleischnerResHTML(){
  const r = fleischnerRec(fleischnerState());
  if(!r) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Responda os itens acima para obter a conduta de Fleischner.</span></div>`;
  const t=FL_TONE[r.tone];
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px;align-items:flex-start">
    <div class="lv" style="color:${t.c};font-size:15px;min-width:104px">${esc(t.tag)}</div>
    <div class="meta"><div class="a">${esc(r.txt)}</div><div class="b">${esc(r.sum)}</div></div>
  </div>`;
}
function calcFleischnerHTML(){
  const s=fleischnerState(); const shown=fleischnerShown(s);
  let rows='';
  shown.forEach(k=>{ rows += (k==='__size') ? fleischnerSizeHTML() : fleischnerChipRow(k); });
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Nódulo pulmonar incidental (TC) · diâmetro médio</div>
      ${rows}
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">• Aplica-se a nódulos <b>incidentais</b> em adultos ≥ 35 anos.<br>• Não usar em rastreamento (use o Lung-RADS), câncer conhecido ou imunossuprimidos.</span></div>
      <div id="fleischner-res">${fleischnerResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fatores de maior risco</div>
      <div class="tfg-ref-list"><div class="tfg-ref-item">Tabagismo/carcinógenos, idade avançada, história familiar, localização em lobo superior, enfisema e fibrose pulmonar, morfologia espiculada.</div></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${FL_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

function fleischnerSet(field,val){ const s=fleischnerState(); s[field]=(String(s[field])===String(val))?null:val; render(true); }
function fleischnerSetSize(field,val){ fleischnerState()[field]=val; const el=document.getElementById('fleischner-res'); if(el) el.innerHTML=translateHTML(fleischnerResHTML()); }

/* registra no catálogo (CALCS de app.js) — método TC, subespecialidade Tórax */
CALCS.push({id:'fleischner', modality:'tc', subspec:'torax', badge:'FL',
  title:'Critérios de Fleischner 2017',
  desc:'Conduta de nódulo pulmonar incidental na TC (Fleischner Society 2017)'});
