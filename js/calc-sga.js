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
  'Papastefanou I, Wright D, Syngelaki A, Souretis K, Chrysanthopoulou E, Nicolaides KH. Competing-risks model for prediction of small-for-gestational-age neonate from biophysical and biochemical markers at 11-13 weeks. Ultrasound Obstet Gynecol 2021;57:52-61.',
  'Papastefanou I, Wright D, Lolos M, Anampousi K, Mamalis M, Nicolaides KH. Competing-risks model for prediction of small-for-gestational-age neonates from maternal characteristics, serum PAPP-A and PlGF at 11-13 weeks. Ultrasound Obstet Gynecol 2021. DOI:10.1002/uog.23118.',
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

/* ---- Biomarcadores — verossimilhança folded-plane (Papastefanou 2021 / ref.20) ----
   Média do log10 MoM = superfície quadrática em (Z, IG-40), "dobrada" em 0 (1 MoM):
   UtA-PI e MAP elevam-se no PIG (max(sup,0)); PAPP-A e PLGF caem (min(sup,0)). */
const SGA_BIO = {
  uta: {i:-0.056310714, z:-0.039447609, g:-0.015560167, g2:-0.000833378, sd:0.128688076, fold:'max'},
  map: {i:-0.000239856, z:-0.001752502, g:-0.001512578, g2:-0.000076992, sd:0.035903306, fold:'max'},
  papp:{i:0.0167065204, z:0.0415211600, g:0.0129835876, g2:0.0008288029, sd:0.2376927440, fold:'min'},
  plgf:{i:0.0396191116, z:0.0353880640, g:0.0175942812, g2:0.0009299725, sd:0.1703244200, fold:'min'},
};
const SGA_BIO_ORDER = ['uta','map','papp','plgf'];
const SGA_BIO_CORR = {
  'uta_map':-0.03833283, 'uta_papp':-0.1604627, 'uta_plgf':-0.1605271,
  'map_papp':-0.008953812, 'map_plgf':-0.04538137, 'papp_plgf':0.3279437,
};
function sgaBioCorr(i,j){ if(i===j) return 1; return SGA_BIO_CORR[i+'_'+j] ?? SGA_BIO_CORR[j+'_'+i] ?? 0; }
function sgaFoldedMean(key, GA, Z){
  const b=SGA_BIO[key];
  const s=b.i + b.z*Z + b.g*(GA-40) + b.g2*(GA-40)*(GA-40);
  return b.fold==='max' ? Math.max(s,0) : Math.min(s,0);
}
/* inverte matriz n×n (via peSolve, de calc-preeclampsia.js) */
function sgaInv(A){
  const n=A.length, I=A.map((_,i)=>A.map((_,j)=>i===j?1:0));
  const cols=[]; for(let j=0;j<n;j++) cols.push(peSolve(A, I.map(r=>r[j])));
  return A.map((_,i)=>cols.map(c=>c[i]));
}

/* Cálculo com biomarcadores: integração 2D da posterior (prior × verossimilhança). */
function sgaComputeBio(inp, keys){
  const muZ=sgaMuZ(inp), muGA=sgaMuGA(inp,muZ);
  const y=keys.map(k=>Math.log10(inp[k]));
  const Sig=keys.map(ki=>keys.map(kj=>sgaBioCorr(ki,kj)*SGA_BIO[ki].sd*SGA_BIO[kj].sd));
  const Sinv=sgaInv(Sig);
  const rho=SGA_RHO, sZ=SGA_SD_Z, sGA=SGA_SD_GA, om=1-rho*rho;
  const z10=SGA_PCTZ.p10, z3=SGA_PCTZ.p3;
  // grade
  const gaA=20, gaB=70, dGA=0.5, zA=-6, zB=5, dZ=0.1;
  let tot=0, s10any=0, s3any=0, s10pre=0, s10e=0;
  const acc=[];
  let maxlp=-Infinity;
  for(let GA=gaA; GA<=gaB; GA+=dGA){
    const a=(GA-muGA)/sGA;
    for(let Z=zA; Z<=zB; Z+=dZ){
      const b=(Z-muZ)/sZ;
      const qp=(a*a - 2*rho*a*b + b*b)/om;         // forma quadrática do prior
      // verossimilhança dos biomarcadores
      const d=keys.map((k,i)=>y[i]-sgaFoldedMean(k,GA,Z));
      let qb=0; for(let i=0;i<d.length;i++) for(let j=0;j<d.length;j++) qb+=d[i]*Sinv[i][j]*d[j];
      const lp=-0.5*(qp+qb);
      acc.push([GA,Z,lp]); if(lp>maxlp) maxlp=lp;
    }
  }
  for(const [GA,Z,lp] of acc){
    const w=Math.exp(lp-maxlp);
    tot+=w;
    if(Z<z10){ s10any+=w; if(GA<37) s10pre+=w; if(GA<34) s10e+=w; }
    if(Z<z3) s3any+=w;
  }
  return { muZ, muGA,
    p10any:s10any/tot, p3any:s3any/tot, p10pre:s10pre/tot, p10e:s10e/tot };
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

        <div class="sec-label" style="text-align:left;padding-left:0;margin-top:12px">Biomarcadores (MoM) — opcionais</div>
        <div class="calc-label">IP médio das artérias uterinas (MoM)</div>
        <div class="calc-in"><input id="sga-uta" type="text" inputmode="decimal" placeholder="ex.: 1.0"></div>
        <div class="calc-label">Pressão arterial média (MoM)</div>
        <div class="calc-in"><input id="sga-map" type="text" inputmode="decimal" placeholder="ex.: 1.0"></div>
        <div class="calc-label">PAPP-A (MoM)</div>
        <div class="calc-in"><input id="sga-papp" type="text" inputmode="decimal" placeholder="ex.: 1.0"></div>
        <div class="calc-label">PLGF (MoM)</div>
        <div class="calc-in"><input id="sga-plgf" type="text" inputmode="decimal" placeholder="ex.: 1.0"></div>

        <div class="calc-in" style="margin-top:10px"><button class="calc-btn" onclick="sgaRun()">Calcular</button></div>
      </div>
      <div id="sga-out"></div>
    </div>
    <div class="note" style="margin:0 2px 12px">⚠️ <span>Rastreio do 1º trimestre — não é diagnóstico. Estima o risco de recém-nascido PIG (peso abaixo do percentil). Os biomarcadores entram como MoM (calculados no seu serviço) e o resultado pode variar levemente em relação à calculadora online da FMF. Validar contra a fonte antes do uso clínico.</span></div>
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
    uta:sgaNum('sga-uta'), map:sgaNum('sga-map'), papp:sgaNum('sga-papp'), plgf:sgaNum('sga-plgf'),
  };
  const keys=SGA_BIO_ORDER.filter(k=>inp[k]!=null);
  const r = keys.length ? sgaComputeBio(inp, keys) : sgaCompute(inp);
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
