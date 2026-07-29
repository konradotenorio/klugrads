/* =========================================================================
   RadRef — Risco de Pré-eclâmpsia (modelo de riscos competitivos da FMF)
   ---------------------------------------------------------------------------
   Fontes (parâmetros extraídos das tabelas originais):
   • Prior por fatores maternos: Wright D, Syngelaki A, Akolekar R, Poon LC,
     Nicolaides KH. Competing risks model in screening for preeclampsia by
     maternal characteristics and medical history. Am J Obstet Gynecol
     2015;213:62.e1-10. (Tabela 2 — média da IG no parto com PE; SD 6,8833)
   • Biomarcadores (PAM, IP art. uterinas, PAPP-A, PLGF): O'Gorman N, Wright D,
     Syngelaki A, et al. Competing risks model in screening for preeclampsia
     by maternal factors and biomarkers at 11-13 weeks. Am J Obstet Gynecol
     2016;214:103.e1-12. (Tabelas 2 e 3 — regressão do log10 MoM e covariância)
   Modelo: a IG no parto com PE ~ Gaussiana(μ, σ). Os fatores maternos definem
   μ (Wright); os biomarcadores em MoM deslocam a distribuição via Bayes
   (O'Gorman). Risco de PE antes de um limiar = área da gaussiana posterior.
   ATENÇÃO: ferramenta educacional. Rastreio, não diagnóstico. Validar antes
   do uso clínico.
   ========================================================================= */

const PE_REFS = [
  'Wright D, Syngelaki A, Akolekar R, Poon LC, Nicolaides KH. Competing risks model in screening for preeclampsia by maternal characteristics and medical history. Am J Obstet Gynecol 2015;213:62.e1-10.',
  "O'Gorman N, Wright D, Syngelaki A, Akolekar R, Wright A, Poon LC, Nicolaides KH. Competing risks model in screening for preeclampsia by maternal factors and biomarkers at 11-13 weeks gestation. Am J Obstet Gynecol 2016;214:103.e1-12.",
];

/* ---- Prior: média da IG (semanas) no parto com PE — Wright 2015, Tabela 2 ---- */
const PE_SD = 6.8833;
function peMu(inp){
  let mu = 54.3637;
  if(inp.age>=35) mu += -0.206886*(inp.age-35);           // idade (broken stick em 35)
  mu += 0.117110*(inp.height-164);                         // altura (cm)
  if(inp.race==='afro') mu += -2.6786;                     // afro-caribenha
  else if(inp.race==='sasian') mu += -1.1290;              // sul-asiática
  if(inp.chtn) mu += -7.2897;                              // hipertensão crônica
  if(inp.sle) mu += -3.0519;                               // LES / SAF
  if(inp.conception==='ivf') mu += -1.6327;                // FIV
  if(inp.parity==='parous'){
    if(inp.prevpe){ mu += -8.1667 + 0.0271988*Math.pow(inp.prevga-24,2); }
    else {
      const iv=Math.max(inp.interval, 0.25);
      mu += -4.3350 - 4.15137651*Math.pow(iv,-1) + 9.21473572*Math.pow(iv,-0.5)
            + 0.01549673*Math.pow(inp.prevga-24,2);
    }
  }
  if(!inp.chtn){                                           // só sem hipertensão crônica:
    mu += -0.0694096*(inp.weight-69);                      // peso (kg)
    if(inp.fhpe) mu += -1.7154;                            // história familiar de PE
    if(inp.diabetes) mu += -3.3899;                        // diabetes tipo 1/2
  }
  return mu;
}

/* ---- Biomarcadores — O'Gorman 2016 (Tabela 2: log10 MoM = a + b·IGparto) ---- */
const PE_BIO = {
  uta: {a:0.54453,  b:-0.013143,  sd:0.14234},  // IP artérias uterinas
  map: {a:0.095640, b:-0.0018240, sd:0.03873},  // pressão arterial média
  papp:{a:-0.62165, b:0.014692,   sd:0.26108},  // PAPP-A
  plgf:{a:-0.93687, b:0.021930,   sd:0.20141},  // PLGF
};
const PE_ORDER = ['uta','map','papp','plgf'];
/* correlações do grupo PE (O'Gorman 2016, Tabela 3) */
const PE_CORR = {
  'uta_map':-0.05229, 'uta_papp':-0.14735, 'uta_plgf':-0.18512,
  'map_papp':0.01349, 'map_plgf':0.02101,  'papp_plgf':0.34729,
};
function peCorr(i,j){ if(i===j) return 1; return PE_CORR[i+'_'+j] ?? PE_CORR[j+'_'+i] ?? 0; }

/* Solve linear Ax=v (eliminação gaussiana com pivô) — n arbitrário. */
function peSolve(A, v){
  const n=v.length, M=A.map((r,i)=>r.concat(v[i]));
  for(let c=0;c<n;c++){
    let p=c; for(let r=c+1;r<n;r++) if(Math.abs(M[r][c])>Math.abs(M[p][c])) p=r;
    [M[c],M[p]]=[M[p],M[c]];
    const piv=M[c][c];
    for(let k=c;k<=n;k++) M[c][k]/=piv;
    for(let r=0;r<n;r++){ if(r!==c){ const f=M[r][c]; for(let k=c;k<=n;k++) M[r][k]-=f*M[c][k]; } }
  }
  return M.map(r=>r[n]);
}
function peDot(a,b){ let s=0; for(let i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }

/* ---- cálculo ---- */
function peCompute(inp){
  const muP = peMu(inp);                 // média do prior
  const varP = PE_SD*PE_SD;
  // biomarcadores presentes
  const keys = PE_ORDER.filter(k=>inp[k]!=null);
  let precL=0, numL=0;                    // 1/σ_L² e b'Σ⁻¹(y−a)
  if(keys.length){
    const a=keys.map(k=>PE_BIO[k].a);
    const b=keys.map(k=>PE_BIO[k].b);
    const y=keys.map(k=>Math.log10(inp[k]));
    const Sig=keys.map((ki,i)=>keys.map((kj,j)=>peCorr(ki,kj)*PE_BIO[ki].sd*PE_BIO[kj].sd));
    const SinvB=peSolve(Sig,b);
    const ya=y.map((yy,i)=>yy-a[i]);
    const SinvYa=peSolve(Sig,ya);
    precL=peDot(b,SinvB);
    numL=peDot(b,SinvYa);
  }
  const precPost = 1/varP + precL;
  const varPost = 1/precPost;
  const muPost = varPost*(muP/varP + numL);
  const sdPost = Math.sqrt(varPost);
  const riskBefore = w => fmPhi((w - muPost)/sdPost);   // P(IGparto com PE < w)
  return {
    muPrior:muP, muPost, sdPost,
    preterm: riskBefore(37),   // PE pré-termo (<37 sem)
    early:   riskBefore(34),   // PE precoce (<34 sem)
    biomarkers:keys.length,
  };
}

/* ---- UI ---- */
function peSeg(label, group, opts){ // opts: [[val,texto],...]
  const cur=(state.pe&&state.pe[group])||opts[0][0];
  const btns=opts.map(o=>`<button class="${cur===o[0]?'on':''}" onclick="peSet('${group}','${o[0]}')">${o[1]}</button>`).join('');
  return `<div class="pe-row"><div class="pe-lbl">${label}</div><div class="set-seg pe-seg" id="pe-seg-${group}">${btns}</div></div>`;
}
function calcPreeclampsiaHTML(){
  return `<div class="ti-wrap">
    <div class="ti-card2"><div class="ti-stripe" style="background:var(--accent)"></div>
      <div style="padding:12px 16px 6px">
        <div class="sec-label" style="text-align:left;padding-left:0">Fatores maternos</div>
        <div class="calc-label">Idade (anos)</div>
        <div class="calc-in"><input id="pe-age" type="text" inputmode="decimal" placeholder="ex.: 32"></div>
        <div class="calc-label">Peso (kg)</div>
        <div class="calc-in"><input id="pe-weight" type="text" inputmode="decimal" placeholder="ex.: 68"></div>
        <div class="calc-label">Altura (cm)</div>
        <div class="calc-in"><input id="pe-height" type="text" inputmode="decimal" placeholder="ex.: 165"></div>
        ${peSeg('Origem étnica','race',[['white','Branca'],['afro','Afro-caribenha'],['sasian','Sul-asiática'],['other','Outra']])}
        ${peSeg('Concepção','conception',[['spont','Espontânea'],['ivf','FIV']])}
        ${peSeg('Hipertensão crônica','chtn',[['no','Não'],['yes','Sim']])}
        ${peSeg('Diabetes (tipo 1/2)','diabetes',[['no','Não'],['yes','Sim']])}
        ${peSeg('LES / SAF','sle',[['no','Não'],['yes','Sim']])}
        ${peSeg('História familiar de PE','fhpe',[['no','Não'],['yes','Sim']])}
        ${peSeg('Paridade','parity',[['nulli','Nulípara'],['parous','Multípara']])}
        <div id="pe-parous">${pePartoAnteriorHTML()}</div>

        <div class="sec-label" style="text-align:left;padding-left:0;margin-top:12px">Biomarcadores (MoM) — opcionais</div>
        <div class="calc-label">IP médio das artérias uterinas (MoM)</div>
        <div class="calc-in"><input id="pe-uta" type="text" inputmode="decimal" placeholder="ex.: 1.0"></div>
        <div class="calc-label">Pressão arterial média (MoM)</div>
        <div class="calc-in"><input id="pe-map" type="text" inputmode="decimal" placeholder="ex.: 1.0"></div>
        <div class="calc-label">PAPP-A (MoM)</div>
        <div class="calc-in"><input id="pe-papp" type="text" inputmode="decimal" placeholder="ex.: 1.0"></div>
        <div class="calc-label">PLGF (MoM)</div>
        <div class="calc-in"><input id="pe-plgf" type="text" inputmode="decimal" placeholder="ex.: 1.0"></div>

        <div class="calc-in" style="margin-top:10px"><button class="calc-btn" onclick="peRun()">Calcular</button></div>
      </div>
      <div id="pe-out"></div>
    </div>
    <div class="note" style="margin:0 2px 12px">⚠️ <span>Rastreio do 1º trimestre — não é diagnóstico. Estima o risco de pré-eclâmpsia pré-termo (parto < 37 semanas). Resultado a validar contra a fonte antes do uso clínico.</span></div>
    <div class="ti-card"><div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${PE_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional baseada no modelo de riscos competitivos publicado da Fetal Medicine Foundation. Rastreio, não diagnóstico. Não substitui o julgamento clínico.</b></div>
  </div>`;
}
function pePartoAnteriorHTML(){
  if(!state.pe || state.pe.parity!=='parous') return '';
  return `${peSeg('PE em gestação anterior','prevpe',[['no','Não'],['yes','Sim']])}
    <div class="calc-label">IG do parto anterior (semanas)</div>
    <div class="calc-in"><input id="pe-prevga" type="text" inputmode="decimal" placeholder="ex.: 39"></div>
    <div class="calc-label">Intervalo entre gestações (anos)</div>
    <div class="calc-in"><input id="pe-interval" type="text" inputmode="decimal" placeholder="ex.: 3"></div>`;
}
function peSet(group, val){
  if(!state.pe) state.pe={};
  state.pe[group]=val;
  // atualiza só os botões do grupo (sem re-render, para não apagar os campos)
  const seg=document.getElementById('pe-seg-'+group);
  if(seg) Array.prototype.forEach.call(seg.children, b=>{
    b.classList.toggle('on', b.getAttribute('onclick').endsWith("'"+val+"')"));
  });
  if(group==='parity'){ const el=document.getElementById('pe-parous'); if(el) el.innerHTML=translateHTML(pePartoAnteriorHTML()); }
}
function peNum(id){ const el=document.getElementById(id); if(!el||el.value==='') return null;
  const v=parseFloat(String(el.value).replace(',','.')); return isNaN(v)?null:v; }
function peRun(){
  const out=document.getElementById('pe-out'); if(!out) return;
  const p=state.pe||{};
  const age=peNum('pe-age'), weight=peNum('pe-weight'), height=peNum('pe-height');
  if(age==null||weight==null||height==null){
    out.innerHTML=translateHTML(`<div class="note" style="margin:0 16px 14px">Informe idade, peso e altura.</div>`); return; }
  const inp={
    age, weight, height,
    race:p.race||'white', conception:p.conception||'spont',
    chtn:p.chtn==='yes', diabetes:p.diabetes==='yes', sle:p.sle==='yes', fhpe:p.fhpe==='yes',
    parity:p.parity||'nulli', prevpe:p.prevpe==='yes',
    prevga:peNum('pe-prevga')||39, interval:peNum('pe-interval')||3,
    uta:peNum('pe-uta'), map:peNum('pe-map'), papp:peNum('pe-papp'), plgf:peNum('pe-plgf'),
  };
  const r=peCompute(inp);
  const nPre=Math.round(1/r.preterm), nEar=Math.round(1/r.early);
  const alto=r.preterm>=1/100;
  out.innerHTML=`<div style="padding:2px 16px 16px">
    ${fmBadge(`${t('PE pré-termo (<37 sem):')} 1 ${t('em')} ${nPre}`, alto?'bad':'ok')}
    <div class="prose" style="margin-top:8px">${t('PE precoce (<34 sem):')} 1 ${t('em')} ${nEar}</div>
    <div class="note" style="margin-top:10px">${alto?t('Risco aumentado'):t('Risco reduzido')} — ${t('limiar ilustrativo de 1:100 (o ponto de corte é definição de cada serviço).')}</div>
  </div>`;
}

/* registro no catálogo (Obstétrico e Fetal) */
(function(){
  if(typeof CALCS==='undefined') return;
  CALCS.push({id:'pe', spec:'obstetrico', badge:'PE',
    title:'Risco de Pré-eclâmpsia', desc:'Modelo de riscos competitivos do 1º trimestre (FMF)'});
})();
