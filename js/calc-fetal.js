/* =========================================================================
   RadRef — Calculadoras de Medicina Fetal (especialidade Obstétrico e Fetal)
   ---------------------------------------------------------------------------
   Fórmulas de artigos publicados (referência em cada calculadora).
   ATENÇÃO: curvas marcadas com REVISAR usam valores aproximados de tabelas
   publicadas e devem ser validadas clinicamente antes do uso.
   As calculadoras de risco (trissomias, pré-eclâmpsia etc.) usam algoritmos
   proprietários da FMF — estão como "Em construção".
   ========================================================================= */

/* ---- utilidades estatísticas ---- */
function fmErf(x){
  const s = x<0?-1:1; x=Math.abs(x);
  const t = 1/(1+0.3275911*x);
  const y = 1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);
  return s*y;
}
function fmPhi(z){ return 0.5*(1+fmErf(z/Math.SQRT2)); }
function fmPct(z){ return Math.min(99.9, Math.max(0.1, fmPhi(z)*100)); }
function fmNum(id){
  const raw = String((document.getElementById(id)||{}).value||'').trim().replace(',','.');
  const v = parseFloat(raw); return isNaN(v)?null:v;
}
function fmGA(){ const s=fmNum('fm-gs'), d=fmNum('fm-gd')||0; return s==null?null:s+d/7; }
function fmGAStr(days){
  const n=Math.round(days);             // arredonda os dias antes de dividir,
  const w=(state&&state.lang==='pt')?'s':'w'; // senão 20,99 sem vira "20s 7d"
  return `${Math.floor(n/7)}${w} ${n%7}d`;
}
/* Rótulos que carregam valor: traduzidos aqui, pois não casam por texto exato. */
function fmIG(){ return state&&state.lang==='pt'?'IG':(state.lang==='es'?'EG':'GA'); }
function fmDPP(){ return state&&state.lang==='pt'?'DPP':(state.lang==='es'?'FPP':'EDD'); }
function fmInterp(tbl, ga, col){ // tbl: [[semana, ...cols]]
  if(ga<=tbl[0][0]) return tbl[0][col];
  for(let i=1;i<tbl.length;i++){
    if(ga<=tbl[i][0]){
      const [a,b]=[tbl[i-1],tbl[i]], f=(ga-a[0])/(b[0]-a[0]);
      return a[col]+f*(b[col]-a[col]);
    }
  }
  return tbl[tbl.length-1][col];
}
function fmBadge(txt, tone){ // tone: ok|warn|bad
  const c = tone==='ok'?'#16a34a':tone==='warn'?'#d97706':'#dc2626';
  return `<div style="display:inline-block;padding:6px 14px;border-radius:999px;font-weight:700;font-size:14px;color:${c};background:${c}22;border:1px solid ${c}55">${txt}</div>`;
}
function fmOut(html){ return `<div style="margin-top:14px">${html}</div>`; }
function fmRefs(refs){
  return `<div class="prose-label" style="margin-top:18px">Referências</div>`
    + refs.map(r=>`<div class="ref">${r}</div>`).join('');
}
function fmReview(){
  return `<div class="note" style="margin-top:12px">⚠️ Curva de referência aproximada de tabela publicada — <b>validar antes do uso clínico</b>.</div>`;
}

/* ---- Datação da gestação (fórmulas da FMF) ---- */
function fmHoje(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
/* Robinson & Fleming: IG(dias) a partir do CCN (mm), 30–84 mm. */
function gaFromCrl(crl){ return 23.53 + 8.052*Math.sqrt(1.037*crl); }
/* Snijders & Nicolaides: IG(dias) a partir da CC (mm), 100–280 mm. */
function gaFromHc(hc){
  const a=-0.0596493, b=0.0029976, c=-0.0014988;
  return 7*(a + Math.sqrt(a*a + b*(1.3369692 - Math.log10(hc+1)))) / c;
}
/* Bloco de resultado: IG + DPP correspondente. */
function fmDatingBloco(titulo, gaDays){
  const dpp = new Date(fmHoje().getTime() + (280-gaDays)*864e5);
  return `<div style="margin-top:14px">
    <div class="prose-label">${esc(titulo)}</div>
    <div style="margin-top:6px">${fmBadge(fmIG()+': '+fmGAStr(gaDays),'ok')}</div>
    <div class="prose" style="margin-top:8px">${fmDPP()}: <b>${dpp.toLocaleDateString(state.lang==='pt'?'pt-BR':(state.lang==='es'?'es-ES':'en-GB'))}</b></div>
  </div>`;
}

/* ---- Hadlock ---- */
function hadlockEFW(hc, ac, fl){ // cm → g
  return Math.pow(10, 1.326 - 0.00326*ac*fl + 0.0107*hc + 0.0438*ac + 0.158*fl);
}
function hadlockMedianLn(ga){ return 0.578 + 0.332*ga - 0.00354*ga*ga; } // ln(g), Hadlock 1991
function efwPercentile(efw, ga){
  const z = (Math.log(efw) - hadlockMedianLn(ga)) / 0.127;
  return {z, pct: fmPct(z)};
}

/* ---- gráfico de crescimento (SVG) ---- */
function growthChartSVG(gaPt, wPt){
  const W=560, H=300, x0=44, y0=H-30, xw=W-x0-12, yh=y0-14;
  const gx = ga => x0 + (ga-14)/(42-14)*xw;
  const gy = w  => y0 - Math.min(w,4600)/4600*yh;
  const line = mult => {
    let p='';
    for(let ga=14; ga<=42; ga+=0.5){
      const w = Math.exp(hadlockMedianLn(ga))*mult;
      p += (p?' L':'M')+gx(ga).toFixed(1)+' '+gy(w).toFixed(1);
    }
    return p;
  };
  const p10 = Math.exp(-1.282*0.127), p90 = Math.exp(1.282*0.127);
  let grid='';
  for(let ga=16; ga<=40; ga+=4) grid+=`<line x1="${gx(ga)}" y1="${y0}" x2="${gx(ga)}" y2="14" stroke="currentColor" opacity=".08"/><text x="${gx(ga)}" y="${y0+18}" font-size="10" fill="currentColor" opacity=".6" text-anchor="middle">${ga}s</text>`;
  for(let w=1000; w<=4000; w+=1000) grid+=`<line x1="${x0}" y1="${gy(w)}" x2="${W-12}" y2="${gy(w)}" stroke="currentColor" opacity=".08"/><text x="${x0-6}" y="${gy(w)+3}" font-size="10" fill="currentColor" opacity=".6" text-anchor="end">${w}g</text>`;
  const pt = (gaPt&&wPt) ? `<circle cx="${gx(gaPt)}" cy="${gy(wPt)}" r="5" fill="#dc2626" stroke="#fff" stroke-width="1.5"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:560px;margin-top:10px">
    ${grid}
    <path d="${line(p10)}" fill="none" stroke="#d97706" stroke-width="1.4" stroke-dasharray="4 3"/>
    <path d="${line(1)}"   fill="none" stroke="#0891b2" stroke-width="2"/>
    <path d="${line(p90)}" fill="none" stroke="#d97706" stroke-width="1.4" stroke-dasharray="4 3"/>
    ${pt}
    <text x="${W-16}" y="24" font-size="10" fill="#d97706" text-anchor="end">P90</text>
    <text x="${W-16}" y="40" font-size="10" fill="#0891b2" text-anchor="end">P50</text>
    <text x="${W-16}" y="56" font-size="10" fill="#d97706" text-anchor="end">P10</text>
  </svg>`;
}

/* ---- gráfico genérico de percentis (curvas de tabela + ponto do paciente) ---- */
function fmCurveSVG(tbl, opts){
  // tbl: [[x, ...cols]]; opts: {title, cols:[{c,color,dash,label}], xmin,xmax, xunit, pt:{x,y}}
  const W=560, H=280, x0=46, y0=H-30, xw=W-x0-14, yh=y0-16;
  const xmin=opts.xmin, xmax=opts.xmax;
  let ymin=Infinity, ymax=-Infinity;
  tbl.forEach(r=>opts.cols.forEach(c=>{ ymin=Math.min(ymin,r[c.c]); ymax=Math.max(ymax,r[c.c]); }));
  if(opts.pt){ ymin=Math.min(ymin,opts.pt.y); ymax=Math.max(ymax,opts.pt.y); }
  const pad=(ymax-ymin)*0.12||0.2; ymin=Math.max(0,ymin-pad); ymax+=pad;
  const gx = x => x0 + (x-xmin)/(xmax-xmin)*xw;
  const gy = y => y0 - (y-ymin)/(ymax-ymin)*yh;
  let grid='';
  const xstep = (xmax-xmin)>40?10:(xmax-xmin)>20?4:2;
  for(let x=Math.ceil(xmin/xstep)*xstep; x<=xmax; x+=xstep)
    grid+=`<line x1="${gx(x)}" y1="${y0}" x2="${gx(x)}" y2="16" stroke="currentColor" opacity=".08"/><text x="${gx(x)}" y="${y0+18}" font-size="10" fill="currentColor" opacity=".6" text-anchor="middle">${x}${opts.xunit||'s'}</text>`;
  const ystep = (ymax-ymin)/4;
  for(let i=1;i<=4;i++){ const y=ymin+i*ystep;
    grid+=`<line x1="${x0}" y1="${gy(y)}" x2="${W-14}" y2="${gy(y)}" stroke="currentColor" opacity=".08"/><text x="${x0-6}" y="${gy(y)+3}" font-size="10" fill="currentColor" opacity=".6" text-anchor="end">${y.toFixed(ymax<10?1:0)}</text>`; }
  const paths = opts.cols.map(c=>{
    let p='';
    tbl.forEach(r=>{ if(r[0]>=xmin&&r[0]<=xmax) p+=(p?' L':'M')+gx(r[0]).toFixed(1)+' '+gy(r[c.c]).toFixed(1); });
    return `<path d="${p}" fill="none" stroke="${c.color}" stroke-width="${c.dash?1.4:2}" ${c.dash?'stroke-dasharray="4 3"':''}/>`;
  }).join('');
  const legend = opts.cols.map((c,i)=>`<text x="${W-18}" y="${24+i*15}" font-size="10" fill="${c.color}" text-anchor="end">${c.label}</text>`).join('');
  const pt = opts.pt ? `<circle cx="${gx(opts.pt.x)}" cy="${gy(opts.pt.y)}" r="5" fill="#dc2626" stroke="#fff" stroke-width="1.5"/>` : '';
  const title = opts.title?`<div class="prose-label" style="margin-top:14px">${opts.title}</div>`:'';
  return `${title}<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:560px;margin-top:8px">${grid}${paths}${pt}${legend}</svg>`;
}

/* ---- tabelas de referência (REVISAR — aproximadas de artigos publicados) ---- */
const FM_UA_PI = [ // Doppler art. umbilical IP [sem, p5, p50, p95]
  [20,0.90,1.19,1.55],[24,0.82,1.09,1.44],[28,0.75,1.00,1.33],
  [32,0.68,0.92,1.24],[36,0.61,0.85,1.16],[40,0.55,0.78,1.09]
];
const FM_MCA_PI = [ // Doppler ACM IP [sem, p5, p50, p95]
  [20,1.12,1.56,2.10],[24,1.24,1.72,2.28],[28,1.36,1.88,2.46],
  [30,1.40,1.92,2.52],[32,1.36,1.88,2.46],[36,1.20,1.68,2.24],[40,0.98,1.36,1.86]
];
const FM_DV_PIV = [ // Ducto venoso IPV [sem, p5, p50, p95] — aproximado (Kessler 2006)
  [20,0.40,0.58,0.85],[24,0.39,0.57,0.84],[28,0.38,0.56,0.82],
  [32,0.36,0.54,0.80],[36,0.34,0.52,0.77],[40,0.32,0.49,0.74]
];
const FM_AOI_PI = [ // Istmo aórtico IP [sem, p5, p50, p95] — aproximado (Del Río 2006)
  [20,1.90,2.40,3.10],[24,1.95,2.50,3.20],[28,2.00,2.60,3.35],
  [32,2.05,2.70,3.50],[36,2.10,2.80,3.65],[40,2.15,2.90,3.80]
];
const FM_UT_PI = [ // IP médio artérias uterinas [sem, p50, p95] — Gómez 2008
  [11,1.79,2.70],[14,1.43,2.14],[16,1.28,1.90],[18,1.15,1.72],[20,1.04,1.54],
  [22,0.98,1.47],[24,0.91,1.36],[26,0.87,1.31],[28,0.83,1.24],[30,0.79,1.20],
  [32,0.77,1.17],[34,0.74,1.15],[36,0.73,1.13],[38,0.71,1.10],[40,0.70,1.08]
];
const FM_NT = [ // TN por CCN [crl mm, p50, p95] — aproximado (Nicolaides)
  [45,1.2,2.1],[55,1.4,2.2],[65,1.5,2.4],[75,1.7,2.5],[84,1.9,2.7]
];

/* ---- definição das calculadoras ---- */
const FETAL_CALCS = [

{id:'fm-dating', title:'Datação da Gestação', badge:'IG',
 desc:'Idade gestacional pelo CCN, pela circunferência cefálica ou pela DUM',
 inputs:`<div class="calc-label">CCN — comprimento cabeça-nádega (mm)</div>
   <div class="calc-in"><input id="fm-crl" type="text" inputmode="decimal" placeholder="30–84"></div>
   <div class="calc-hint">Corresponde a 9s5d – 14s1d</div>
   <div class="calc-label">CC — circunferência cefálica (mm)</div>
   <div class="calc-in"><input id="fm-hc" type="text" inputmode="decimal" placeholder="100–280"></div>
   <div class="calc-hint">Corresponde a 13s3d – 29s5d</div>
   <div class="calc-label">DUM — 1º dia da última menstruação</div>
   <div class="calc-in"><input id="fm-lmp" type="date"></div>
   <div class="calc-hint">Para ciclos regulares de 26–30 dias</div>`,
 compute(){
   const crl=fmNum('fm-crl'), hc=fmNum('fm-hc');
   const lmpRaw=(document.getElementById('fm-lmp')||{}).value;
   let h='', algum=false;

   if(crl!=null){
     if(crl<30||crl>84) h += fmOut(`<div class="note">CCN fora da faixa aplicável (30–84 mm).</div>`);
     else { algum=true; h += fmDatingBloco('Pelo CCN', gaFromCrl(crl)); }
   }
   if(hc!=null){
     if(hc<100||hc>280) h += fmOut(`<div class="note">CC fora da faixa aplicável (100–280 mm).</div>`);
     else { algum=true; h += fmDatingBloco('Pela circunferência cefálica', gaFromHc(hc)); }
   }
   if(lmpRaw){
     const lmp=new Date(lmpRaw+'T00:00:00');
     const dias=(fmHoje()-lmp)/864e5;
     if(isNaN(dias)||dias<0) h += fmOut(`<div class="note">Data da DUM inválida.</div>`);
     else if(dias>300) h += fmOut(`<div class="note">DUM há mais de 300 dias — verifique a data.</div>`);
     else { algum=true; h += fmDatingBloco('Pela DUM', dias); }
   }
   if(!algum && !h) return fmOut(`<div class="note">Informe o CCN, a CC ou a DUM.</div>`);

   if(crl!=null && crl>=30 && crl<=84){
     const tbl=[]; for(let c=30;c<=84;c+=3) tbl.push([c, gaFromCrl(c)/7]);
     h += fmCurveSVG(tbl,{title:'IG pelo CCN — Robinson & Fleming', xmin:30, xmax:84, xunit:'mm',
       pt:{x:crl,y:gaFromCrl(crl)/7}, cols:[{c:1,color:'#0891b2',label:'IG (sem)'}]});
   }
   if(hc!=null && hc>=100 && hc<=280){
     const tbl=[]; for(let c=100;c<=280;c+=10) tbl.push([c, gaFromHc(c)/7]);
     h += fmCurveSVG(tbl,{title:'IG pela CC — Snijders & Nicolaides', xmin:100, xmax:280, xunit:'mm',
       pt:{x:hc,y:gaFromHc(hc)/7}, cols:[{c:1,color:'#0891b2',label:'IG (sem)'}]});
   }
   return h;
 },
 refs:['Robinson HP, Fleming JE. A critical evaluation of sonar "crown-rump length" measurements. Br J Obstet Gynaecol. 1975;82(9):702–10.',
       'Snijders RJ, Nicolaides KH. Fetal biometry at 14–40 weeks\' gestation. Ultrasound Obstet Gynecol. 1994;4(1):34–48.']},

{id:'fm-nt', title:'Translucência Nucal', badge:'TN',
 desc:'Avaliação da TN pelo CCN (11–13+6 semanas)',
 review:true,
 inputs:`<div class="calc-label">CCN (mm)</div>
   <div class="calc-in"><input id="fm-crl" type="text" inputmode="decimal" placeholder="45–84"></div>
   <div class="calc-label">TN (mm)</div>
   <div class="calc-in"><input id="fm-nt" type="text" inputmode="decimal" placeholder="ex.: 1.8"></div>`,
 compute(){
   const crl=fmNum('fm-crl'), nt=fmNum('fm-nt');
   if(crl==null||crl<45||crl>84||nt==null) return fmOut(`<div class="note">Informe CCN (45–84 mm) e TN.</div>`);
   const p50=fmInterp(FM_NT,crl,1), p95=fmInterp(FM_NT,crl,2);
   let b;
   if(nt>=3.5) b=fmBadge(`TN ${nt.toFixed(1)} mm — ≥ 3.5 mm (aumentada)`,'bad');
   else if(nt>p95) b=fmBadge(`TN ${nt.toFixed(1)} mm — acima do P95 (${p95.toFixed(1)} mm)`,'warn');
   else b=fmBadge(`TN ${nt.toFixed(1)} mm — dentro da normalidade (P95: ${p95.toFixed(1)} mm)`,'ok');
   return fmOut(b+`<div class="prose" style="margin-top:10px">Mediana esperada para CCN ${crl} mm: <b>${p50.toFixed(1)} mm</b></div>`
     + fmCurveSVG(FM_NT,{title:'TN (mm) pelo CCN', xmin:45, xmax:84, xunit:'mm', pt:{x:crl,y:nt},
       cols:[{c:2,color:'#d97706',dash:1,label:'P95'},{c:1,color:'#0891b2',label:'P50'}]}));
 },
 refs:['Nicolaides KH. Nuchal translucency and other first-trimester sonographic markers of chromosomal abnormalities. Am J Obstet Gynecol. 2004;191(1):45–67.',
       'Wright D, et al. A mixture model of nuchal translucency thickness in screening for chromosomal defects. Ultrasound Obstet Gynecol. 2008;31(4):376–83.']},

{id:'fm-growth', title:'Crescimento Fetal (PFE + percentil)', badge:'CF',
 desc:'Peso fetal estimado (Hadlock) com percentil e curva de crescimento',
 inputs:`<div class="calc-label">Idade gestacional</div>
   <div class="calc-in"><input id="fm-gs" type="number" placeholder="semanas"><input id="fm-gd" type="number" placeholder="dias"></div>
   <div class="calc-label">CC — circunferência cefálica (mm)</div>
   <div class="calc-in"><input id="fm-hc" type="text" inputmode="decimal" placeholder="ex.: 280"></div>
   <div class="calc-label">CA — circunferência abdominal (mm)</div>
   <div class="calc-in"><input id="fm-ac" type="text" inputmode="decimal" placeholder="ex.: 260"></div>
   <div class="calc-label">CF — comprimento do fêmur (mm)</div>
   <div class="calc-in"><input id="fm-fl" type="text" inputmode="decimal" placeholder="ex.: 55"></div>`,
 compute(){
   const ga=fmGA(), hc=fmNum('fm-hc'), ac=fmNum('fm-ac'), fl=fmNum('fm-fl');
   if(ga==null||ga<14||ga>42||!hc||!ac||!fl) return fmOut(`<div class="note">Informe IG (14–42 sem), CC, CA e CF.</div>`);
   const efw = hadlockEFW(hc/10, ac/10, fl/10);
   const {pct} = efwPercentile(efw, ga);
   const tone = pct<3?'bad':pct<10?'warn':pct>97?'warn':'ok';
   const cls = pct<3?'PIG grave (<P3)':pct<10?'Pequeno para IG (<P10)':pct>90?'Grande para IG (>P90)':'Adequado para IG';
   return fmOut(`${fmBadge(`PFE: ${Math.round(efw)} g — P${pct.toFixed(0)}`,tone)}
     <div class="prose" style="margin-top:10px">${cls}</div>`
     + growthChartSVG(ga, efw));
 },
 refs:['Hadlock FP, et al. Estimation of fetal weight with the use of head, body, and femur measurements. Am J Obstet Gynecol. 1985;151(3):333–7.',
       'Hadlock FP, Harrist RB, Martinez-Poyer J. In utero analysis of fetal growth: a sonographic weight standard. Radiology. 1991;181(1):129–33.']},

{id:'fm-bw', title:'Peso ao Nascer (percentil)', badge:'PN',
 desc:'Percentil do peso ao nascimento pela idade gestacional',
 review:true,
 inputs:`<div class="calc-label">Idade gestacional ao nascer</div>
   <div class="calc-in"><input id="fm-gs" type="number" placeholder="semanas"><input id="fm-gd" type="number" placeholder="dias"></div>
   <div class="calc-label">Peso ao nascer (g)</div>
   <div class="calc-in"><input id="fm-w" type="number" placeholder="ex.: 3200"></div>`,
 compute(){
   const ga=fmGA(), w=fmNum('fm-w');
   if(ga==null||ga<24||ga>43||!w) return fmOut(`<div class="note">Informe IG (24–43 sem) e o peso.</div>`);
   const {pct}=efwPercentile(w, Math.min(ga,42));
   const tone = pct<3?'bad':pct<10?'warn':pct>97?'warn':'ok';
   const cls = pct<10?'Pequeno para a idade gestacional (PIG)':pct>90?'Grande para a idade gestacional (GIG)':'Adequado para a idade gestacional (AIG)';
   return fmOut(`${fmBadge(`P${pct.toFixed(0)}`,tone)}<div class="prose" style="margin-top:10px">${cls}</div>`
     + growthChartSVG(Math.min(ga,42), w));
 },
 refs:['Hadlock FP, Harrist RB, Martinez-Poyer J. In utero analysis of fetal growth: a sonographic weight standard. Radiology. 1991;181(1):129–33.']},

{id:'fm-doppler', title:'Doppler Fetal (AU, ACM e RCP)', badge:'DP',
 desc:'Percentis do IP da art. umbilical e ACM + razão cerebroplacentária',
 review:true,
 inputs:`<div class="calc-label">Idade gestacional</div>
   <div class="calc-in"><input id="fm-gs" type="number" placeholder="semanas"><input id="fm-gd" type="number" placeholder="dias"></div>
   <div class="calc-label">IP — artéria umbilical</div>
   <div class="calc-in"><input id="fm-ua" type="text" inputmode="decimal" placeholder="ex.: 0.95"></div>
   <div class="calc-label">IP — artéria cerebral média (opcional)</div>
   <div class="calc-in"><input id="fm-mca" type="text" inputmode="decimal" placeholder="ex.: 1.80"></div>`,
 compute(){
   const ga=fmGA(), ua=fmNum('fm-ua'), mca=fmNum('fm-mca');
   if(ga==null||ga<20||ga>41||!ua) return fmOut(`<div class="note">Informe IG (20–41 sem) e IP da art. umbilical.</div>`);
   const ua95=fmInterp(FM_UA_PI,ga,3), ua50=fmInterp(FM_UA_PI,ga,2);
   let h = ua>ua95
     ? fmBadge(`AU IP ${ua.toFixed(2)} — acima do P95 (${ua95.toFixed(2)})`,'bad')
     : fmBadge(`AU IP ${ua.toFixed(2)} — normal (P95: ${ua95.toFixed(2)})`,'ok');
   h += `<div class="prose" style="margin-top:8px">AU mediana esperada: ${ua50.toFixed(2)}</div>`;
   if(mca){
     const m5=fmInterp(FM_MCA_PI,ga,1);
     h += `<div style="margin-top:10px">${mca<m5
       ? fmBadge(`ACM IP ${mca.toFixed(2)} — abaixo do P5 (${m5.toFixed(2)}) — vasodilatação`,'warn')
       : fmBadge(`ACM IP ${mca.toFixed(2)} — normal (P5: ${m5.toFixed(2)})`,'ok')}</div>`;
     const rcp = mca/ua;
     h += `<div style="margin-top:10px">${rcp<1
       ? fmBadge(`RCP ${rcp.toFixed(2)} — < 1.0 (alterada)`,'bad')
       : fmBadge(`RCP ${rcp.toFixed(2)} — normal`,'ok')}</div>`;
   }
   h += fmCurveSVG(FM_UA_PI, {title:'Artéria umbilical — IP por IG', xmin:20, xmax:40, pt:{x:ga,y:ua},
     cols:[{c:3,color:'#d97706',dash:1,label:'P95'},{c:2,color:'#0891b2',label:'P50'},{c:1,color:'#d97706',dash:1,label:'P5'}]});
   if(mca) h += fmCurveSVG(FM_MCA_PI, {title:'Artéria cerebral média — IP por IG', xmin:20, xmax:40, pt:{x:ga,y:mca},
     cols:[{c:3,color:'#d97706',dash:1,label:'P95'},{c:2,color:'#0891b2',label:'P50'},{c:1,color:'#d97706',dash:1,label:'P5'}]});
   return fmOut(h);
 },
 refs:['Ciobanu A, et al. Fetal Medicine Foundation reference ranges for umbilical artery and middle cerebral artery pulsatility index and cerebroplacental ratio. Ultrasound Obstet Gynecol. 2019;53(4):465–72.',
       'Arduini D, Rizzo G. Normal values of Pulsatility Index from fetal vessels: a cross-sectional study on 1556 healthy fetuses. J Perinat Med. 1990;18(3):165–72.']},

{id:'fm-dv', title:'Ducto Venoso (IPV)', badge:'DV',
 desc:'Percentil do índice de pulsatilidade venosa do ducto venoso por IG',
 review:true,
 inputs:`<div class="calc-label">Idade gestacional</div>
   <div class="calc-in"><input id="fm-gs" type="number" placeholder="semanas"><input id="fm-gd" type="number" placeholder="dias"></div>
   <div class="calc-label">IPV — ducto venoso</div>
   <div class="calc-in"><input id="fm-dv" type="text" inputmode="decimal" placeholder="ex.: 0.55"></div>`,
 compute(){
   const ga=fmGA(), dv=fmNum('fm-dv');
   if(ga==null||ga<20||ga>40||!dv) return fmOut(`<div class="note">Informe IG (20–40 sem) e o IPV.</div>`);
   const d95=fmInterp(FM_DV_PIV,ga,3), d50=fmInterp(FM_DV_PIV,ga,2);
   return fmOut((dv>d95
     ? fmBadge(`IPV ${dv.toFixed(2)} — acima do P95 (${d95.toFixed(2)})`,'bad')
     : fmBadge(`IPV ${dv.toFixed(2)} — normal (P95: ${d95.toFixed(2)})`,'ok'))
     + `<div class="prose" style="margin-top:8px">Mediana esperada: ${d50.toFixed(2)}</div>`
     + fmCurveSVG(FM_DV_PIV,{title:'Ducto venoso — IPV por IG', xmin:20, xmax:40, pt:{x:ga,y:dv},
       cols:[{c:3,color:'#d97706',dash:1,label:'P95'},{c:2,color:'#0891b2',label:'P50'},{c:1,color:'#d97706',dash:1,label:'P5'}]}));
 },
 refs:['Kessler J, et al. Longitudinal reference ranges for ductus venosus flow velocities and waveform indices. Ultrasound Obstet Gynecol. 2006;28(7):890–8.']},

{id:'fm-aoi', title:'Istmo Aórtico (IP)', badge:'IA',
 desc:'Percentil do índice de pulsatilidade do istmo aórtico por IG',
 review:true,
 inputs:`<div class="calc-label">Idade gestacional</div>
   <div class="calc-in"><input id="fm-gs" type="number" placeholder="semanas"><input id="fm-gd" type="number" placeholder="dias"></div>
   <div class="calc-label">IP — istmo aórtico</div>
   <div class="calc-in"><input id="fm-aoi" type="text" inputmode="decimal" placeholder="ex.: 2.60"></div>`,
 compute(){
   const ga=fmGA(), aoi=fmNum('fm-aoi');
   if(ga==null||ga<20||ga>40||!aoi) return fmOut(`<div class="note">Informe IG (20–40 sem) e o IP.</div>`);
   const a95=fmInterp(FM_AOI_PI,ga,3), a5=fmInterp(FM_AOI_PI,ga,1), a50=fmInterp(FM_AOI_PI,ga,2);
   return fmOut((aoi>a95
     ? fmBadge(`IP ${aoi.toFixed(2)} — acima do P95 (${a95.toFixed(2)})`,'warn')
     : aoi<a5
     ? fmBadge(`IP ${aoi.toFixed(2)} — abaixo do P5 (${a5.toFixed(2)})`,'warn')
     : fmBadge(`IP ${aoi.toFixed(2)} — normal (P5–P95: ${a5.toFixed(2)}–${a95.toFixed(2)})`,'ok'))
     + `<div class="prose" style="margin-top:8px">Mediana esperada: ${a50.toFixed(2)}</div>`
     + fmCurveSVG(FM_AOI_PI,{title:'Istmo aórtico — IP por IG', xmin:20, xmax:40, pt:{x:ga,y:aoi},
       cols:[{c:3,color:'#d97706',dash:1,label:'P95'},{c:2,color:'#0891b2',label:'P50'},{c:1,color:'#d97706',dash:1,label:'P5'}]}));
 },
 refs:['Del Río M, et al. Reference ranges for Doppler parameters of the fetal aortic isthmus during the second half of pregnancy. Ultrasound Obstet Gynecol. 2006;28(1):71–6.']},

{id:'fm-utpi', title:'IP das Artérias Uterinas', badge:'AU',
 desc:'Percentil do IP médio das artérias uterinas por IG',
 review:true,
 inputs:`<div class="calc-label">Idade gestacional</div>
   <div class="calc-in"><input id="fm-gs" type="number" placeholder="semanas"><input id="fm-gd" type="number" placeholder="dias"></div>
   <div class="calc-label">IP médio (média direita/esquerda)</div>
   <div class="calc-in"><input id="fm-ut" type="text" inputmode="decimal" placeholder="ex.: 1.10"></div>`,
 compute(){
   const ga=fmGA(), pi=fmNum('fm-ut');
   if(ga==null||ga<11||ga>41||!pi) return fmOut(`<div class="note">Informe IG (11–41 sem) e o IP médio.</div>`);
   const p50=fmInterp(FM_UT_PI,ga,1), p95=fmInterp(FM_UT_PI,ga,2);
   return fmOut((pi>p95
     ? fmBadge(`IP ${pi.toFixed(2)} — acima do P95 (${p95.toFixed(2)})`,'bad')
     : fmBadge(`IP ${pi.toFixed(2)} — normal (P95: ${p95.toFixed(2)})`,'ok'))
     + `<div class="prose" style="margin-top:8px">Mediana esperada: ${p50.toFixed(2)}</div>`
     + fmCurveSVG(FM_UT_PI,{title:'IP médio das artérias uterinas por IG', xmin:11, xmax:40, pt:{x:ga,y:pi},
       cols:[{c:2,color:'#d97706',dash:1,label:'P95'},{c:1,color:'#0891b2',label:'P50'}]}));
 },
 refs:['Gómez O, et al. Reference ranges for uterine artery mean pulsatility index at 11–41 weeks of gestation. Ultrasound Obstet Gynecol. 2008;32(2):128–32.']},

{id:'fm-anemia', title:'Anemia Fetal (PSV-ACM)', badge:'AN',
 desc:'Pico de velocidade sistólica da ACM em múltiplos da mediana — Mari',
 inputs:`<div class="calc-label">Idade gestacional</div>
   <div class="calc-in"><input id="fm-gs" type="number" placeholder="semanas"><input id="fm-gd" type="number" placeholder="dias"></div>
   <div class="calc-label">PSV da ACM (cm/s)</div>
   <div class="calc-in"><input id="fm-psv" type="text" inputmode="decimal" placeholder="ex.: 42"></div>`,
 compute(){
   const ga=fmGA(), psv=fmNum('fm-psv');
   if(ga==null||ga<18||ga>40||!psv) return fmOut(`<div class="note">Informe IG (18–40 sem) e PSV.</div>`);
   const med = Math.exp(2.31 + 0.046*ga);
   const mom = psv/med;
   const b = mom>=1.5 ? fmBadge(`${mom.toFixed(2)} MoM — sugere anemia moderada/grave`,'bad')
     : mom>=1.29 ? fmBadge(`${mom.toFixed(2)} MoM — sugere anemia leve`,'warn')
     : fmBadge(`${mom.toFixed(2)} MoM — dentro da normalidade`,'ok');
   const tbl=[]; for(let g=18;g<=40;g+=1){ const m=Math.exp(2.31+0.046*g); tbl.push([g,m,m*1.29,m*1.5]); }
   return fmOut(b+`<div class="prose" style="margin-top:8px">Mediana esperada para ${fmGAStr(ga*7)}: <b>${med.toFixed(1)} cm/s</b> · limiar 1.5 MoM: ${(med*1.5).toFixed(1)} cm/s</div>`
     + fmCurveSVG(tbl,{title:'PSV da ACM (cm/s) por IG — Mari', xmin:18, xmax:40, pt:{x:ga,y:psv},
       cols:[{c:3,color:'#dc2626',dash:1,label:'1.5 MoM'},{c:2,color:'#d97706',dash:1,label:'1.29 MoM'},{c:1,color:'#0891b2',label:'Mediana'}]}));
 },
 refs:['Mari G, et al. Noninvasive diagnosis by Doppler ultrasonography of fetal anemia due to maternal red-cell alloimmunization. N Engl J Med. 2000;342(1):9–14.']},

/* ---- Em construção (algoritmos proprietários FMF) ---- */
{id:'fm-dmg',  title:'Risco de Diabetes Gestacional',  badge:'DMG', wip:true, desc:'Rastreio de diabetes gestacional'},
{id:'fm-ptb1', title:'Parto Prematuro — História',     badge:'PP',  wip:true, desc:'Risco por história obstétrica'},
{id:'fm-ptb2', title:'Parto Prematuro — Colo',         badge:'PP',  wip:true, desc:'Risco pelo comprimento cervical'},
];

const FETAL_CALC_MAP = {};
FETAL_CALCS.forEach(c=>{ FETAL_CALC_MAP[c.id]=c; });

/* registra no catálogo geral (CALCS definido em app.js) */
FETAL_CALCS.forEach(c=>CALCS.push({
  id:c.id, spec:'obstetrico', title:c.title, badge:c.badge,
  desc:(c.wip?'🚧 Em construção — ':'')+c.desc
}));

/* ---- página da calculadora ---- */
function fetalCalcHTML(id){
  const c = FETAL_CALC_MAP[id];
  if(c.wip){
    return `<div class="calc-wrap">
      <div class="prose-label">${c.title}</div>
      <div class="note" style="margin-top:10px">🚧 <b>Em construção.</b> Esta calculadora usa algoritmo de risco proprietário da Fetal Medicine Foundation
      (não publicado na íntegra) e será ajustada e validada antes de ser liberada.</div>
      <div class="prose" style="margin-top:10px">Enquanto isso, o cálculo pode ser feito diretamente no site da FMF:</div>
      <div style="margin-top:8px"><a href="https://fetalmedicine.org/research/assess" target="_blank" rel="noopener" style="color:#0891b2">fetalmedicine.org → Calculators</a></div>
    </div>`;
  }
  return `<div class="calc-wrap">
    <div class="prose-label">${c.title}</div>
    ${c.inputs}
    <div class="calc-in" style="margin-top:6px"><button class="calc-btn" onclick="fetalCalcRun('${c.id}')">Calcular</button></div>
    <div id="fm-out"></div>
    ${c.review?fmReview():''}
    ${fmRefs(c.refs)}
  </div>`;
}
function fetalCalcRun(id){
  const c = FETAL_CALC_MAP[id];
  document.getElementById('fm-out').innerHTML = translateHTML(c.compute());
}
