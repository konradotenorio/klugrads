/* =========================================================================
   KlugRads — Miomas uterinos: classificação FIGO (US e RM)
   ---------------------------------------------------------------------------
   Fonte principal: Lakabi R, et al. Int J Gynecol Obstet. 2025;171:566-573
   (e Munro 2011 / 2018). Regras:
     0 intracavitário pediculado (pedículo <= 10% do diâmetro médio)
     1 submucoso, < 50% do diâmetro médio no miométrio
     2 submucoso, >= 50% (e < 100%) no miométrio
     3 100% intramural, toca o endométrio sem deformar a cavidade
     4 intramural, sem contato com endométrio ou serosa
     5 subseroso, >= 50% no miométrio · 6 subseroso, < 50% · 7 subseroso pediculado
     8 cervical, ligamentos, "parasita"
     Híbrido X–Y: toca endométrio e serosa (X submucoso, Y subseroso).
   Três entradas no catálogo:
     figo-us     (Calculadoras US > Abdome)
     figo-rm     (RM > Medicina Interna) — calculadora
     figo-rm-ref (RM > Medicina Interna) — página de referência
   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const FIGO_REFS = [
  'Lakabi R, Harth S, Meinhold-Heerlein I, Olsthoorn AV, Munro MG, Murji A. Diagnosis and classification of uterine fibroids. Int J Gynecol Obstet. 2025;171:566-573. doi:10.1002/ijgo.70538.',
  'Munro MG, Critchley HO, Broder MS, Fraser IS. FIGO classification system (PALM-COEIN) for causes of abnormal uterine bleeding in nongravid women of reproductive age. Int J Gynaecol Obstet. 2011;113:3-13. doi:10.1016/j.ijgo.2010.11.011.',
  'Munro MG, Critchley HOD, Fraser IS; FIGO Menstrual Disorders Committee. The two FIGO systems for normal and abnormal uterine bleeding symptoms and classification of causes of abnormal uterine bleeding in the reproductive years: 2018 revisions. Int J Gynecol Obstet. 2018;143:393-408.',
];
const FIGO_REFS_RM = [
  'Kubik-Huch RA, Weston M, Nougaret S, et al. European Society of Urogenital Radiology (ESUR) guidelines: MR imaging of leiomyomas. Eur Radiol. 2018;28:3125-3137.',
  'Gomez E, Nguyen MT, Fursevich D, Macura K, Gupta A. MRI-based pictorial review of the FIGO classification system for uterine fibroids. Abdom Radiol (NY). 2021;46:2146-2155.',
];
const FIGO_REFS_US = [
  'Van den Bosch T, Dueholm M, Leone FP, et al. Terms, definitions and measurements to describe sonographic features of myometrium and uterine masses: a consensus opinion from the MUSA group. Ultrasound Obstet Gynecol. 2015;46:284-298.',
];
const FIGO_TYPE = {
  0:'intracavitário pediculado', 1:'submucoso, < 50% intramural', 2:'submucoso, ≥ 50% intramural',
  3:'intramural, em contato com o endométrio', 4:'intramural', 5:'subseroso, ≥ 50% intramural',
  6:'subseroso, < 50% intramural', 7:'subseroso pediculado', 8:'localização atípica (cervical, ligamentar ou parasita)',
};
const FIGO_SUB = [['s0','Intracavitário pediculado',0],['s1','Submucoso, < 50% intramural',1],['s2','Submucoso, ≥ 50% intramural',2],['s3','Toca o endométrio sem deformar a cavidade',3],['sn','Sem contato com o endométrio',null]];
const FIGO_SER = [['r5','Subseroso, ≥ 50% intramural',5],['r6','Subseroso, < 50% intramural',6],['r7','Subseroso pediculado',7],['rn','Sem contato com a serosa',null]];
const FIGO_WALL = [['anterior','Anterior'],['posterior','Posterior'],['lateral direita','Lateral D'],['lateral esquerda','Lateral E'],['central','Central']];
const FIGO_VERT = [['na metade superior do útero','Metade superior'],['na metade inferior do útero','Metade inferior'],['nas metades superior e inferior do útero','Ambas']];

function figoState(mod){
  if(!state.figo) state.figo={};
  if(!state.figo[mod]) state.figo[mod]={atip:false, sub:null, ser:null, wall:null, vert:null, d1:'', d2:'', d3:'', im:'', ped:''};
  return state.figo[mod];
}
function figoNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return (isNaN(n)||n<0)?null:n; }
function figoFmt(n,d){ return Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}); }

/* Cálculo puro. */
function figoClassify(s){
  if(s.atip) return {type:'8', desc:FIGO_TYPE[8], tone:'info'};
  const subE=FIGO_SUB.find(o=>o[0]===s.sub), serE=FIGO_SER.find(o=>o[0]===s.ser);
  if(!subE||!serE) return null;
  const x=subE[2], y=serE[2];
  if(x===null&&y===null) return {type:'4', desc:FIGO_TYPE[4], tone:'info'};
  if(y===null) return {type:String(x), desc:FIGO_TYPE[x], tone:x<=2?'sub':'info'};
  if(x===null) return {type:String(y), desc:FIGO_TYPE[y], tone:'info'};
  const t=x+'–'+y;
  let aviso=null;
  if(x===0||y===7) aviso='Mioma pediculado não é classificado como híbrido: revise a relação com o endométrio e a serosa.';
  else if(!(t==='2–5'||t==='3–5')) aviso = (t==='2–6'||t==='3–6'||t==='1–5') ? 'Híbrido possível, mas incomum.' : 'Combinação pouco provável: revise as proporções.';
  return {type:t, desc:'híbrido transmural — '+FIGO_TYPE[x]+' e '+FIGO_TYPE[y], parts:FIGO_TYPE[x]+' e '+FIGO_TYPE[y], tone:x<=2?'sub':'info', hybrid:true, aviso};
}
function figoMeasures(s){
  const d=[figoNum(s.d1),figoNum(s.d2),figoNum(s.d3)];
  if(d.some(v=>v===null||v===0)) return null;
  const mean=(d[0]+d[1]+d[2])/3;
  const vol=d[0]*d[1]*d[2]*0.5236/1000;   // mm³ -> cm³ (elipsoide)
  const im=figoNum(s.im), ped=figoNum(s.ped);
  return {d, mean, vol, imPct: im!==null?im/mean*100:null, pedPct: ped!==null?ped/mean*100:null};
}

/* ---- UI ---- */
function figoChips(mod, field, opts){
  const s=figoState(mod);
  return opts.map(o=>`<div class="ti-ftog ${s[field]===o[0]?'on':''}" onclick="figoSet('${mod}','${field}','${o[0]}')">${esc(o[1])}</div>`).join('');
}
function figoField(mod,k,label,ph,unit){
  const s=figoState(mod);
  return `<div class="ti-field"><label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf"><input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(s[k])}" oninput="figoInput('${mod}','${k}',this.value)"><span>${unit}</span></div></div></div>`;
}
function figoResHTML(mod){
  const s=figoState(mod), r=figoClassify(s), m=figoMeasures(s);
  let h='';
  if(!r){
    h+=`<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Marque a relação com o <b>endométrio</b> e com a <b>serosa</b> (ou a localização atípica) para obter o tipo FIGO.</span></div>`;
  } else {
    const c = r.tone==='sub' ? {c:'#e07a1f',bg:'#e07a1f22'} : {c:'#2a8fb0',bg:'#2a8fb022'};
    h+=`<div class="ti-res" style="background:${c.bg};margin-top:12px">
      <div class="lv" style="color:${c.c}">${esc(r.type)}</div>
      <div class="meta"><div class="a">FIGO tipo ${esc(r.type)}</div><div class="b">${esc(r.desc)}</div></div>
      <div class="pts" style="background:${c.c}">FIGO</div>
    </div>`;
    const notas=[];
    if(r.aviso) notas.push('⚠️ '+r.aviso);
    if(mod==='rm'){
      const t=r.type;
      if(/^(4|5)$/.test(t)||/–5$/.test(t)) notas.push('Informe a <b>margem livre interna</b> (IFM, distância ao endométrio) — recomendada para os tipos 4 e 5.');
      if(/^(2|3|4)$/.test(t)||/^(2|3)–/.test(t)) notas.push('Informe a <b>margem livre externa</b> (OFM, distância à serosa) — recomendada para os tipos 2, 3 e 4.');
    } else {
      if(r.tone==='sub') notas.push('Componente submucoso: a sonohisterografia (2D ou 3D) aumenta a acurácia (98–100%).');
      if(r.type==='3'||r.type==='2') notas.push('Tipo 2 × 3: pela FIGO 2018 a distinção final é histeroscópica; a RM ajuda nos casos duvidosos.');
    }
    if(notas.length) h+=`<div class="ti-legend-row" style="margin-top:8px"><span class="lt">${notas.join('<br>')}</span></div>`;
  }
  if(m){
    const mt=[`Diâmetro médio ${figoFmt(m.mean,1)} mm`, `Volume ≈ ${figoFmt(m.vol,1)} cm³`];
    if(m.imPct!==null) mt.push(`Porção intramural ${figoFmt(m.imPct,0)}% (${m.imPct>=50?'≥':'<'} 50%)`);
    if(m.pedPct!==null) mt.push(`Pedículo ${figoFmt(m.pedPct,0)}% (${m.pedPct<=10?'pediculado':'não pediculado'})`);
    h+=`<div class="ti-legend-row" style="margin-top:8px"><span class="lt">📏 ${mt.join(' · ')}</span></div>`;
  }
  return h+figoFraseHTML(mod);
}
function figoFrase(mod){
  const s=figoState(mod), r=figoClassify(s); if(!r) return '';
  const m=figoMeasures(s);
  let f='Nódulo miomatoso';
  if(s.wall) f+=' na parede '+s.wall;
  if(s.vert) f+=(s.wall?', ':' ')+s.vert;
  if(m) f+=', medindo '+m.d.map(v=>figoFmt(v,0)).join(' × ')+' mm (volume estimado de '+figoFmt(m.vol,1)+' cm³)';
  f+=', classificado como FIGO tipo '+r.type+(r.hybrid?', híbrido transmural ('+r.parts+').':' ('+r.desc+').');
  return f;
}
function figoFraseHTML(mod){
  const f=figoFrase(mod); if(!f) return '';
  return `<div class="lau-frase">
    <div class="lau-frase-lbl">Frase para o laudo</div>
    <div class="lau-frase-tx">${esc(f)}</div>
    <button type="button" class="lau-frase-btn" onclick="figoCopy('${mod}')">${svgIcon(P.copy,16,{sw:2})} Copiar frase</button>
  </div>`;
}
function figoLegendHTML(){
  return `<div class="ti-legend">${[0,1,2,3,4,5,6,7,8].map(t=>`<div class="ti-legend-row"><span class="lk" style="background:${t<=2?'#e07a1f':'#2a8fb0'}">${t}</span><span class="lt">${esc(FIGO_TYPE[t].charAt(0).toUpperCase()+FIGO_TYPE[t].slice(1))}</span></div>`).join('')}
    <div class="ti-legend-row"><span class="lk" style="background:#7b4bd6">X–Y</span><span class="lt">Híbrido (transmural): toca endométrio e serosa. Frequentes: 2–5 e 3–5</span></div></div>`;
}
function figoCalcHTML(mod){
  const s=figoState(mod);
  const dica = mod==='rm'
    ? 'Avalie em T2 sagital e axial. A RM é a melhor para diferenciar tipo 3 de 4 e tipo 2 profundo de 2–5.'
    : 'US transvaginal é a primeira linha. Para componente submucoso, a sonohisterografia aumenta a acurácia.';
  const refs = FIGO_REFS.concat(mod==='rm'?FIGO_REFS_RM:FIGO_REFS_US);
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Classificação</div>
      <div class="ti-field ti-field-foci"><label>Localização atípica</label><div class="ti-foci"><div class="ti-ftog ${s.atip?'on':''}" onclick="figoToggleAtip('${mod}')">Colo / ligamento / parasita (tipo 8)</div></div></div>
      <div class="ti-field ti-field-foci"><label>Relação com o endométrio</label><div class="ti-foci">${figoChips(mod,'sub',FIGO_SUB)}</div></div>
      <div class="ti-field ti-field-foci"><label>Relação com a serosa</label><div class="ti-foci">${figoChips(mod,'ser',FIGO_SER)}</div></div>
      <div class="ti-legend-row" style="margin-top:6px"><span class="lt">• ${esc(dica)}<br>• A proporção intramural é medida em relação ao <b>diâmetro médio</b> do mioma; pediculado = pedículo ≤ 10% do diâmetro médio.</span></div>
      <div id="figo-res-${mod}">${figoResHTML(mod)}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Medidas e localização (opcional)</div>
      <div class="ti-fields">
        ${figoField(mod,'d1','Diâmetro 1','ex.: 42','mm')}
        ${figoField(mod,'d2','Diâmetro 2','ex.: 38','mm')}
        ${figoField(mod,'d3','Diâmetro 3','ex.: 35','mm')}
        ${mod==='rm' ? figoField(mod,'im','Porção intramural (espessura)','ex.: 22','mm')+figoField(mod,'ped','Largura do pedículo','ex.: 3','mm') : ''}
      </div>
      <div class="ti-field ti-field-foci"><label>Parede</label><div class="ti-foci">${figoChips(mod,'wall',FIGO_WALL)}</div></div>
      ${mod==='rm' ? `<div class="ti-field ti-field-foci"><label>Posição vertical</label><div class="ti-foci">${figoChips(mod,'vert',FIGO_VERT)}</div></div>` : ''}
      <div class="ti-legend-row" style="margin-top:6px"><span class="lt">${mod==='rm' ? 'Com os três diâmetros, a calculadora mostra o diâmetro médio, o volume (elipsoide) e a proporção intramural e do pedículo, para ajudar a escolher o tipo.' : 'Com os três diâmetros, a calculadora mostra o diâmetro médio e o volume (elipsoide).'}</span></div>
    </div>
    <div class="ti-card"><div class="tfg-sec-lbl">Tipos FIGO</div>${figoLegendHTML()}</div>
    <div class="ti-card"><div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${refs.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div></div>
  </div>`;
}

/* ---- página de referência da RM ---- */
function figoRmRefHTML(){
  const T=(title,rows)=>`<div class="ti-card">${tableHTML({title,rows},'figo-'+title)}</div>`;
  return `<div class="ti-wrap">
    ${T('Classificação FIGO dos Leiomiomas',[
      ['Tipo','Definição'],
      ['0','Intracavitário pediculado (pedículo ≤ 10% do diâmetro médio)'],
      ['1','Submucoso, < 50% do diâmetro médio no miométrio'],
      ['2','Submucoso, ≥ 50% (e < 100%) do diâmetro médio no miométrio'],
      ['3','100% intramural, toca o endométrio sem deformar a cavidade'],
      ['4','Intramural, sem contato com endométrio ou serosa'],
      ['5','Subseroso, ≥ 50% do diâmetro médio no miométrio'],
      ['6','Subseroso, < 50% do diâmetro médio no miométrio'],
      ['7','Subseroso pediculado (pedículo ≤ 10% do diâmetro médio)'],
      ['8','Cervical, ligamento redondo ou largo sem fixação direta, "parasita"'],
      ['Híbrido X–Y','Toca endométrio e serosa. Frequentes: 2–5 e 3–5; possíveis, mas incomuns: 2–6, 3–6 e 1–5'],
    ])}
    ${T('Papel da RM',[
      ['Aspecto','Detalhe'],
      ['Acurácia','Método mais acurado para detectar miomas (sensibilidade de 99%), com grande campo de visão'],
      ['Quando usar','Casos complexos e planejamento cirúrgico ou de tratamentos minimamente invasivos (embolização, MRgHIFU)'],
      ['Onde ajuda na FIGO','Diferenciar tipo 3 de 4 e tipo 2 profundo de 2–5'],
      ['Leiomiossarcoma','Achados suspeitos com sensibilidade combinada de 90% e especificidade de 96%'],
    ])}
    ${T('Protocolo (ESUR)',[
      ['Situação','Sequências'],
      ['Básico','T2 axial e sagital; T1 axial'],
      ['Massa anexial indeterminada','Acrescentar DCE'],
      ['Crescimento rápido ou sinal T2 intermediário/alto','DCE e, opcionalmente, DWI'],
      ['Antes e depois de embolização','Angio-RM/DCE e DWI'],
    ])}
    ${T('Aspecto na RM',[
      ['Achado','Descrição'],
      ['Mioma típico','Margens circunscritas; hipointenso homogêneo em T2; iso ou hipointenso ao miométrio em T1'],
      ['Mioma celular','Hiperintenso em T2'],
      ['Degenerações','Hialina, cística/hidrópica, vermelha (hemorrágica/carnosa), apoplética, mixoide e gordurosa: sinal variável conforme o tipo'],
      ['Adenomiose','Zona juncional irregular, cistos miometriais e adenomiomas (mal definidos, com pequenos cistos ou focos hemorrágicos)'],
      ['Leiomiossarcoma','Margens irregulares, sinal T2 moderado a alto, T1 variável, restrição à difusão e áreas centrais sem realce'],
    ])}
    ${T('O Que Informar no Laudo',[
      ['Item','Detalhe'],
      ['Útero','Volume uterino e número de miomas'],
      ['Cada mioma relevante','Tipo FIGO, três diâmetros, parede (anterior, posterior, lateral ou central) e posição vertical (metade superior, inferior ou ambas)'],
      ['Margem livre interna (IFM)','Distância ao endométrio: tipos 4 e 5'],
      ['Margem livre externa (OFM)','Distância à serosa: tipos 2, 3 e 4'],
    ])}
    <div class="ti-card"><div class="ti-legend-row"><span class="lt">Risco de malignidade baixo (0,05–0,81%), maior em pós-menopausa. Nenhum método de imagem ou marcador distingue com segurança mioma de leiomiossarcoma; STUMP não é diagnosticado por imagem.</span></div>
      <div class="calc-wrap" style="padding:10px 0 0"><button class="calc-btn refcalc-btn" onclick="openFavCalc('figo-rm')">${svgIcon(P.calc,16)} Abrir calculadora FIGO (RM)</button></div></div>
    <div class="ti-card"><div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${FIGO_REFS.concat(FIGO_REFS_RM).map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div></div>
  </div>`;
}

/* ---- ações ---- */
function figoSet(mod,field,val){ const s=figoState(mod); s[field]=(s[field]===val?null:val); if(field!=='wall'&&field!=='vert') s.atip=false; render(true); }
function figoToggleAtip(mod){ const s=figoState(mod); s.atip=!s.atip; if(s.atip){ s.sub=null; s.ser=null; } render(true); }
function figoInput(mod,k,v){
  figoState(mod)[k]=v;
  const el=document.getElementById('figo-res-'+mod); if(el) el.innerHTML=translateHTML(figoResHTML(mod));
}
function figoCopy(mod){ const f=figoFrase(mod); if(f) klugCopy(f,'Frase copiada ✓'); }

/* registra no catálogo (CALCS de app.js) */
CALCS.push({id:'figo-us', spec:'abdome', badge:'FIGO',
  title:'Miomas — FIGO (US)',
  desc:'Classificação FIGO dos leiomiomas (0–8 e híbridos) no ultrassom'});
CALCS.push({id:'figo-rm', modality:'rm', subspec:'medint', badge:'FIGO',
  title:'Miomas — FIGO (RM)',
  desc:'Classificação FIGO dos leiomiomas na RM, com IFM/OFM'});
CALCS.push({id:'figo-rm-ref', modality:'rm', subspec:'medint', badge:'REF', kind:'ref',
  title:'Miomas — Referência RM',
  desc:'FIGO, protocolo ESUR, aspecto na RM e o que informar no laudo'});
