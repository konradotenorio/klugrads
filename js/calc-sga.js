/* =========================================================================
   RadRef — Risco de PIG (pequeno para a idade gestacional) — modelo de
   riscos competitivos da FMF (por fatores maternos).
   ---------------------------------------------------------------------------
   Fonte: Papastefanou I, Wright D, Nicolaides KH. Competing-risks model for
   prediction of small-for-gestational-age neonate from maternal characteristics
   and medical history. Ultrasound Obstet Gynecol 2020;56:196-205. (Tabela 2)
   Modelo: distribuição conjunta (gaussiana bivariada) do Z-score do peso ao
   nascer e da IG no parto. Os fatores maternos definem as médias μ_Z e μ_GA;
   o risco de PIG é o volume da gaussiana abaixo dos limiares escolhidos
   (percentil de peso + IG no parto).
   Biomarcadores (Papastefanou 2021) ainda não incluídos.
   ATENÇÃO: ferramenta educacional. Rastreio, não diagnóstico. Validar antes
   do uso clínico.
   ========================================================================= */

const SGA_REFS = [
  'Papastefanou I, Wright D, Nicolaides KH. Competing-risks model for prediction of small-for-gestational-age neonate from maternal characteristics and medical history. Ultrasound Obstet Gynecol 2020;56:196-205.',
];

/* Parâmetros — Papastefanou 2020, Tabela 2 */
const SGA_SD_Z = 1.3850, SGA_SD_GA = 6.1865, SGA_RHO = 0.3761;
/* Z-scores dos percentis de peso ao nascer */
const SGA_PCTZ = { p10:-1.2816, p5:-1.6449, p3:-1.8808 };

/* média do Z-score do peso ao nascer */
function sgaMuZ(inp){
  let z = 0.4358;
  const race={black:-0.5436, eastasian:-0.0468, southasian:-0.4902, mixed:-0.2533}[inp.race]||0;
  z += race;
  z += 0.02789*(inp.height-165);
  z += 0.01138*(inp.weight-69) - 0.0002005*Math.pow(inp.weight-69,2);
  if(inp.ivf) z += -0.1838;
  if(inp.smoker) z += -0.6602;
  if(inp.chtn) z += -0.6267;
  if(inp.sle) z += -0.3309;
  if(inp.parity==='parous'){
    z += 0.05933;
    z += 0.06155*(inp.lastga-40);
    z += 0.3665*inp.prevz;
    const iv=Math.max(inp.interval,0.25);
    z += -0.6062*Math.pow(iv,-1) + 1.2990*Math.pow(iv,-0.5);
    if(inp.prevpe) z += -0.1499;
    if(inp.previud) z += -0.1589;
  }
  return z;
}
/* média da IG no parto (usa μ_Z como covariável) */
function sgaMuGA(inp, muZ){
  let g = 46.790 + 1.680*muZ;
  if(inp.ivf) g += -1.469;
  if(inp.chtn) g += -1.827;
  if(inp.sle) g += -1.929;
  if(inp.diabetes) g += -4.744;
  if(inp.parity==='parous'){
    g += 0.339;
    if(inp.previud) g += -1.604;
    g += 0.538*(inp.lastga-40);
  }
  return g;
}

/* CDF normal bivariada padrão: P(X<=h, Y<=k), correlação rho (Simpson). */
function sgaBvn(h,k,rho){
  if(rho===0) return fmPhi(h)*fmPhi(k);
  const n=128, dt=rho/n; let sum=0;
  for(let i=0;i<=n;i++){
    const t=i*dt, w=(i===0||i===n)?1:(i%2?4:2), d=1-t*t;
    sum += w*Math.exp(-(h*h-2*t*h*k+k*k)/(2*d))/(2*Math.PI*Math.sqrt(d));
  }
  return fmPhi(h)*fmPhi(k) + sum*dt/3;
}

function sgaCompute(inp){
  const muZ=sgaMuZ(inp), muGA=sgaMuGA(inp,muZ);
  const zk = p => (SGA_PCTZ[p]-muZ)/SGA_SD_Z;
  const marginal = p => fmPhi(zk(p));                       // PIG <pP em qualquer IG
  const preterm = (p,wk) => sgaBvn((wk-muGA)/SGA_SD_GA, zk(p), SGA_RHO); // PIG <pP e parto <wk
  return {
    muZ, muGA,
    p10any:marginal('p10'), p3any:marginal('p3'),
    p10pre:preterm('p10',37), p10e:preterm('p10',34),
  };
}

/* ---- UI ---- */
function sgaSeg(label, group, opts){
  const cur=(state.sga&&state.sga[group])||opts[0][0];
  const btns=opts.map(o=>`<button class="${cur===o[0]?'on':''}" onclick="sgaSet('${group}','${o[0]}')">${o[1]}</button>`).join('');
  return `<div class="pe-row"><div class="pe-lbl">${label}</div><div class="set-seg pe-seg" id="sga-seg-${group}">${btns}</div></div>`;
}
function calcSgaHTML(){
  return `<div class="ti-wrap">
    <div class="ti-card2"><div class="ti-stripe" style="background:var(--accent)"></div>
      <div style="padding:12px 16px 6px">
        <div class="sec-label" style="text-align:left;padding-left:0">Fatores maternos</div>
        <div class="calc-label">Peso (kg)</div>
        <div class="calc-in"><input id="sga-weight" type="text" inputmode="decimal" placeholder="ex.: 68"></div>
        <div class="calc-label">Altura (cm)</div>
        <div class="calc-in"><input id="sga-height" type="text" inputmode="decimal" placeholder="ex.: 165"></div>
        ${sgaSeg('Origem étnica','race',[['white','Branca'],['black','Negra'],['eastasian','Leste-asiática'],['southasian','Sul-asiática'],['mixed','Mista']])}
        ${sgaSeg('Tabagismo','smoker',[['no','Não'],['yes','Sim']])}
        ${sgaSeg('Concepção','ivf',[['no','Espontânea'],['yes','FIV']])}
        ${sgaSeg('Hipertensão crônica','chtn',[['no','Não'],['yes','Sim']])}
        ${sgaSeg('LES / SAF','sle',[['no','Não'],['yes','Sim']])}
        ${sgaSeg('Diabetes mellitus','diabetes',[['no','Não'],['yes','Sim']])}
        ${sgaSeg('Paridade','parity',[['nulli','Nulípara'],['parous','Multípara']])}
        <div id="sga-parous">${sgaParousHTML()}</div>
        <div class="calc-in" style="margin-top:10px"><button class="calc-btn" onclick="sgaRun()">Calcular</button></div>
      </div>
      <div id="sga-out"></div>
    </div>
    <div class="note" style="margin:0 2px 12px">⚠️ <span>Rastreio do 1º trimestre — não é diagnóstico. Estima o risco de recém-nascido PIG (peso < percentil). Modelo por fatores maternos; biomarcadores ainda não incluídos. Resultado a validar contra a fonte antes do uso clínico.</span></div>
    <div class="ti-card"><div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${SGA_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional baseada no modelo de riscos competitivos publicado da Fetal Medicine Foundation. Rastreio, não diagnóstico. Não substitui o julgamento clínico.</b></div>
  </div>`;
}
function sgaParousHTML(){
  if(!state.sga || state.sga.parity!=='parous') return '';
  return `<div class="calc-label">IG do parto anterior (semanas)</div>
    <div class="calc-in"><input id="sga-lastga" type="text" inputmode="decimal" placeholder="ex.: 39"></div>
    <div class="calc-label">Z-score do peso ao nascer anterior</div>
    <div class="calc-in"><input id="sga-prevz" type="text" inputmode="decimal" placeholder="ex.: 0"></div>
    <div class="calc-label">Intervalo entre gestações (anos)</div>
    <div class="calc-in"><input id="sga-interval" type="text" inputmode="decimal" placeholder="ex.: 3"></div>
    ${sgaSeg('PE em gestação anterior','prevpe',[['no','Não'],['yes','Sim']])}
    ${sgaSeg('Óbito fetal anterior','previud',[['no','Não'],['yes','Sim']])}`;
}
function sgaSet(group, val){
  if(!state.sga) state.sga={};
  state.sga[group]=val;
  const seg=document.getElementById('sga-seg-'+group);
  if(seg) Array.prototype.forEach.call(seg.children, b=>{
    b.classList.toggle('on', b.getAttribute('onclick').endsWith("'"+val+"')"));
  });
  if(group==='parity'){ const el=document.getElementById('sga-parous'); if(el) el.innerHTML=translateHTML(sgaParousHTML()); }
}
function sgaNum(id){ const el=document.getElementById(id); if(!el||el.value==='') return null;
  const v=parseFloat(String(el.value).replace(',','.')); return isNaN(v)?null:v; }
function sgaRun(){
  const out=document.getElementById('sga-out'); if(!out) return;
  const s=state.sga||{};
  const weight=sgaNum('sga-weight'), height=sgaNum('sga-height');
  if(weight==null||height==null){ out.innerHTML=translateHTML(`<div class="note" style="margin:0 16px 14px">Informe peso e altura.</div>`); return; }
  const inp={
    weight, height,
    race:s.race||'white', smoker:s.smoker==='yes', ivf:s.ivf==='yes',
    chtn:s.chtn==='yes', sle:s.sle==='yes', diabetes:s.diabetes==='yes',
    parity:s.parity||'nulli',
    lastga:sgaNum('sga-lastga')||39, prevz:sgaNum('sga-prevz')||0,
    interval:sgaNum('sga-interval')||3, prevpe:s.prevpe==='yes', previud:s.previud==='yes',
  };
  const r=sgaCompute(inp);
  const nA=Math.round(1/r.p10any), n3=Math.round(1/r.p3any), nP=Math.round(1/r.p10pre);
  const alto=r.p10pre>=1/100;
  out.innerHTML=`<div style="padding:2px 16px 16px">
    ${fmBadge(esc(`${t('PIG <p10 (parto <37 sem):')} 1 ${t('em')} ${nP}`), alto?'bad':'ok')}
    <div class="prose" style="margin-top:8px">${esc(`${t('PIG <p10 (qualquer IG):')} 1 ${t('em')} ${nA}`)}</div>
    <div class="prose" style="margin-top:2px">${esc(`${t('PIG <p3 (qualquer IG):')} 1 ${t('em')} ${n3}`)}</div>
    <div class="note" style="margin-top:10px">${t('limiar ilustrativo de 1:100 (o ponto de corte é definição de cada serviço).')}</div>
  </div>`;
}

/* registro no catálogo (Obstétrico e Fetal) */
(function(){
  if(typeof CALCS==='undefined') return;
  CALCS.push({id:'sga', spec:'obstetrico', badge:'PIG',
    title:'Risco de PIG', desc:'Modelo de riscos competitivos do 1º trimestre (FMF)'});
})();
