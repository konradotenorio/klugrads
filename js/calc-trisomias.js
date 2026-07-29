/* =========================================================================
   KlugRads — Risco de Trissomias (teste combinado do 1º trimestre)
   ---------------------------------------------------------------------------
   Fontes (parâmetros extraídos das tabelas originais):
   • Risco de base (idade materna + IG): Snijders RJM, Sundberg K, Holzgreve W,
     Henry G, Nicolaides KH. Maternal age- and gestation-specific risk for
     trisomy 21. Ultrasound Obstet Gynecol 1999;13:167-170. (Tabela 4 + fórmula)
   • Razão de verossimilhança da TN (modelo de mistura): Wright D, Kagan KO,
     Molina FS, Gazzoni A, Nicolaides KH. UOG 2008;31:376-383. (Tabela 2)
   • Bioquímica (β-hCG livre, PAPP-A) e FHR: Kagan KO, Wright D, Valencia C,
     Maiz N, Nicolaides KH. Hum Reprod 2008;23:1968-1975. (Tabelas III e IV)
   ATENÇÃO: ferramenta educacional. Rastreio, não diagnóstico. Validar antes
   do uso clínico. T18/T13 dependem do risco de base de Snijders 1995 (pendente).
   ========================================================================= */

const TRI_REFS = [
  'Snijders RJM, Sundberg K, Holzgreve W, Henry G, Nicolaides KH. Maternal age- and gestation-specific risk for trisomy 21. Ultrasound Obstet Gynecol 1999;13:167-170.',
  'Wright D, Kagan KO, Molina FS, Gazzoni A, Nicolaides KH. A mixture model of nuchal translucency thickness in screening for chromosomal defects. Ultrasound Obstet Gynecol 2008;31:376-383.',
  'Kagan KO, Wright D, Valencia C, Maiz N, Nicolaides KH. Screening for trisomies 21, 18 and 13 by maternal age, fetal nuchal translucency, fetal heart rate, free beta-hCG and PAPP-A. Hum Reprod 2008;23:1968-1975.',
  'Snijders RJM, Sebire NJ, Nicolaides KH. Maternal age and gestational age-specific risk for chromosomal defects. Fetal Diagn Ther 1995;10:356-367.',
];

/* ---- Risco de base T21 (Snijders 1999) ---- */
/* Tabela 4 — risco a termo (40 sem), 1 em X, por idade materna. */
const TRI_AGE_TERM = [
  [20,1527],[25,1352],[30,895],[31,776],[32,659],[33,547],[34,446],[35,356],
  [36,280],[37,218],[38,167],[39,128],[40,97],[41,73],[42,55],[43,41],[44,30],[45,23],
];
/* Risco a termo (probabilidade) interpolado em log10(1/x) pela idade. */
function triTermRiskP(age){
  const T=TRI_AGE_TERM;
  if(age<=T[0][0]) return 1/T[0][1];
  if(age>=T[T.length-1][0]){ // extrapola log-linear pelo último par
    const a=T[T.length-2], b=T[T.length-1];
    const slope=(Math.log10(b[1])-Math.log10(a[1]))/(b[0]-a[0]);
    return 1/Math.pow(10, Math.log10(b[1])+slope*(age-b[0]));
  }
  for(let i=1;i<T.length;i++){
    if(age<=T[i][0]){
      const a=T[i-1], b=T[i], f=(age-a[0])/(b[0]-a[0]);
      const lx=Math.log10(a[1])+f*(Math.log10(b[1])-Math.log10(a[1]));
      return 1/Math.pow(10, lx);
    }
  }
  return 1/T[T.length-1][1];
}
/* Prevalência relativa por IG (semanas) vs 40 sem (=1). Snijders 1999. */
function triRelPrev(gaWeeks){
  const L=Math.log10(gaWeeks);
  return Math.pow(10, 0.2718*L*L - 1.023*L + 0.9425);
}
/* Risco de base T21 (probabilidade) na IG do exame. */
function triAprioriT21(age, gaWeeks){ return triTermRiskP(age)*triRelPrev(gaWeeks); }

/* Prevalências relativas por IG vs T21 a termo (Snijders 1995, Tabela 1).
   [semanas, T21, T18, T13]. Usadas só para a razão T18:T21 e T13:T21. */
const TRI_TBL1 = [
  [10,1.90,0.77,0.24],[12,1.70,0.62,0.20],[14,1.56,0.51,0.16],[16,1.45,0.43,0.14],
  [18,1.37,0.36,0.12],[20,1.30,0.31,0.10],[25,1.18,0.22,0.08],[30,1.10,0.16,0.06],
  [35,1.04,0.12,0.05],[40,1.00,0.09,0.04],
];
function triTbl1Col(gaWeeks, col){ // col: 1=T21,2=T18,3=T13
  const T=TRI_TBL1;
  if(gaWeeks<=T[0][0]) return T[0][col];
  if(gaWeeks>=T[T.length-1][0]) return T[T.length-1][col];
  for(let i=1;i<T.length;i++){ if(gaWeeks<=T[i][0]){
    const a=T[i-1],b=T[i],f=(gaWeeks-a[0])/(b[0]-a[0]); return a[col]+f*(b[col]-a[col]);
  }}
  return T[T.length-1][col];
}
/* Razão da prevalência de T18/T13 sobre T21 na IG (Snijders 1995). */
function triRatio(key, gaWeeks){
  const col = key==='t18'?2:3;
  return triTbl1Col(gaWeeks,col)/triTbl1Col(gaWeeks,1);
}
/* Risco de base por trissomia: T21 validado × razão da Tabela 1. */
function triApriori(key, age, gaWeeks){
  const a21=triAprioriT21(age,gaWeeks);
  return key==='t21' ? a21 : a21*triRatio(key,gaWeeks);
}

/* ---- normal ---- */
function triNpdf(x,mu,sd){ const z=(x-mu)/sd; return Math.exp(-0.5*z*z)/(sd*Math.sqrt(2*Math.PI)); }

/* ---- TN: modelo de mistura (Wright 2008, Tabela 2 + apêndice) ---- */
const TRI_NT = {
  b0:-0.8951, b1:0.02940, b2:-0.0001812, sd0:0.07900, // CRL-dependente
  a0:-0.3319, a1:-0.03790,                              // logit proporção (normal)
  mu1:0.3019, sd1:0.1945,                               // CRL-independente (normal)
  op:0.02890,                                           // DP operador
  t21:{p:0.9406, mu:0.5330, sd:0.2093},
  t18:{p:0.7096, mu:0.7439, sd:0.1658},
  t13:{p:0.8376, mu:0.6018, sd:0.2032},
};
/* LR da TN para uma trissomia. crl e nt em mm. */
function triNtLR(crl, nt, key){
  const P=TRI_NT;
  const x=Math.log10(nt);
  const sdDep=Math.sqrt(P.sd0*P.sd0+P.op*P.op);
  const muDep=P.b0+P.b1*crl+P.b2*crl*crl;
  const depN=triNpdf(x,muDep,sdDep);
  // normal: proporção CRL-independente
  const pN=1/(1+Math.exp(-(P.a0+P.a1*crl)));
  const sdIndN=Math.sqrt(P.sd1*P.sd1+P.op*P.op);
  const fNorm=(1-pN)*depN + pN*triNpdf(x,P.mu1,sdIndN);
  // afetado
  const a=P[key];
  const sdIndA=Math.sqrt(a.sd*a.sd+P.op*P.op);
  const fAff=(1-a.p)*depN + a.p*triNpdf(x,a.mu,sdIndA);
  return fAff/fNorm;
}

/* ---- Bioquímica (β-hCG livre, PAPP-A) + FHR: gaussiana trivariada ----
   Vetor v = [deltaFHR, log10 MoM βhCG, log10 MoM PAPP-A] (na ordem F,B,P).
   Kagan 2008: Tabela III (bioquímica) e Tabela IV (FHR). */
const TRI_MVN = {
  normal:{ mF:0, mB:0, mP:0, sF:5.8727, sB:0.2544, sP:0.2203, cFB:0.0203, cFP:-0.0571, cBP:0.2143 },
  t21:{ mF:1.3836, sF:7.2323, sB:0.2699, sP:0.2359, cFB:0.0248, cFP:-0.0975, cBP:0.0821,
        // médias log MoM dependentes da semana (11/12/13):
        mB:[[11,0.2596],[12,0.2895],[13,0.3193]], mP:[[11,-0.4667],[12,-0.3026],[13,-0.1385]] },
  t18:{ mF:-2.8089, mB:-0.6668, mP:-0.7149, sF:8.2202, sB:0.3723, sP:0.3307, cFB:0.1901, cFP:0.0624, cBP:0.3860 },
  t13:{ mF:null, mB:-0.3128, mP:-0.5248, sF:8.1444, sB:0.2416, sP:0.2362, cFB:-0.0617, cFP:-0.2378, cBP:0.2393 },
};
/* FHR esperada (bpm) por IG em dias (Kagan 2008). */
function triExpFHR(gaDays){ return 265.98 - 1.7631*gaDays + 0.0064445*gaDays*gaDays; }
/* Média delta-FHR do T13 depende da IG (Kagan 2008). */
function triT13FHRmean(gaDays){ return 52.43 - 0.40476*gaDays; }
/* interpola média log MoM por semana */
function triWeekMean(tbl, gaWeeks){
  if(gaWeeks<=tbl[0][0]) return tbl[0][1];
  if(gaWeeks>=tbl[tbl.length-1][0]) return tbl[tbl.length-1][1];
  for(let i=1;i<tbl.length;i++){ if(gaWeeks<=tbl[i][0]){
    const a=tbl[i-1],b=tbl[i],f=(gaWeeks-a[0])/(b[0]-a[0]); return a[1]+f*(b[1]-a[1]);
  }}
  return tbl[tbl.length-1][1];
}

/* Álgebra de matrizes pequenas (n≤3) */
function triDet(m){ const n=m.length;
  if(n===1) return m[0][0];
  if(n===2) return m[0][0]*m[1][1]-m[0][1]*m[1][0];
  return m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])
       - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])
       + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
}
function triInv(m){ const n=m.length, d=triDet(m);
  if(n===1) return [[1/m[0][0]]];
  if(n===2) return [[m[1][1]/d,-m[0][1]/d],[-m[1][0]/d,m[0][0]/d]];
  const c=[
    [ (m[1][1]*m[2][2]-m[1][2]*m[2][1]), -(m[0][1]*m[2][2]-m[0][2]*m[2][1]),  (m[0][1]*m[1][2]-m[0][2]*m[1][1]) ],
    [-(m[1][0]*m[2][2]-m[1][2]*m[2][0]),  (m[0][0]*m[2][2]-m[0][2]*m[2][0]), -(m[0][0]*m[1][2]-m[0][2]*m[1][0]) ],
    [ (m[1][0]*m[2][1]-m[1][1]*m[2][0]), -(m[0][0]*m[2][1]-m[0][1]*m[2][0]),  (m[0][0]*m[1][1]-m[0][1]*m[1][0]) ],
  ];
  return c.map(row=>row.map(v=>v/d));
}
function triQuad(v,inv){ // v' inv v
  let s=0; for(let i=0;i<v.length;i++) for(let j=0;j<v.length;j++) s+=v[i]*inv[i][j]*v[j];
  return s;
}
/* Constrói covariância na ordem/entradas presentes (idx: 0=F,1=B,2=P). */
function triCov(par, idx){
  const sd=[par.sF,par.sB,par.sP];
  const corr=[[1,par.cFB,par.cFP],[par.cFB,1,par.cBP],[par.cFP,par.cBP,1]];
  return idx.map(i=>idx.map(j=>corr[i][j]*sd[i]*sd[j]));
}
/* LR da gaussiana (bioquímica ± FHR) para uma trissomia. present: {F,B,P} valores ou null. */
function triMvnLR(key, present, gaWeeks, gaDays){
  const idx=[]; const v=[]; const mAff=[]; const mNorm=[];
  const N=TRI_MVN.normal, A=TRI_MVN[key];
  if(present.F!=null){ idx.push(0); v.push(present.F);
    mNorm.push(N.mF);
    mAff.push(key==='t13'?triT13FHRmean(gaDays):A.mF);
  }
  if(present.B!=null){ idx.push(1); v.push(present.B);
    mNorm.push(N.mB);
    mAff.push(Array.isArray(A.mB)?triWeekMean(A.mB,gaWeeks):A.mB);
  }
  if(present.P!=null){ idx.push(2); v.push(present.P);
    mNorm.push(N.mP);
    mAff.push(Array.isArray(A.mP)?triWeekMean(A.mP,gaWeeks):A.mP);
  }
  if(!idx.length) return 1;
  const Sa=triCov(A,idx), Sn=triCov(N,idx);
  const ia=triInv(Sa), ineg=triInv(Sn);
  const da=v.map((x,k)=>x-mAff[k]), dn=v.map((x,k)=>x-mNorm[k]);
  const qa=triQuad(da,ia), qn=triQuad(dn,ineg);
  return Math.sqrt(triDet(Sn)/triDet(Sa))*Math.exp(-0.5*(qa-qn));
}

/* ---- cálculo (T21, T18, T13) ---- */
function triComputeOne(key, inp, gaDays, gaWeeks){
  const a0=triApriori(key, inp.age, gaWeeks);         // probabilidade
  let odds=a0/(1-a0);
  const lrs={};
  if(inp.nt){ lrs.nt=triNtLR(inp.crl, inp.nt, key); odds*=lrs.nt; }
  const present={ F:null, B:null, P:null };
  if(inp.fhr){ present.F=inp.fhr-triExpFHR(gaDays); }
  if(inp.bhcg){ present.B=Math.log10(inp.bhcg); }
  if(inp.pappa){ present.P=Math.log10(inp.pappa); }
  if(present.F!=null||present.B!=null||present.P!=null){
    lrs.bio=triMvnLR(key, present, gaWeeks, gaDays); odds*=lrs.bio;
  }
  const p=odds/(1+odds);
  return { aprioriN:Math.round(1/a0), lrs, finalP:p, finalN:Math.round(1/p) };
}
function triCompute(inp){
  // inp: age, crl, nt, bhcg(MoM), pappa(MoM), fhr(bpm)
  const gaDays=gaFromCrl(inp.crl), gaWeeks=gaDays/7;
  return { gaDays, gaWeeks,
    t21:triComputeOne('t21',inp,gaDays,gaWeeks),
    t18:triComputeOne('t18',inp,gaDays,gaWeeks),
    t13:triComputeOne('t13',inp,gaDays,gaWeeks) };
}

/* ---- UI ---- */
function calcTrisomiasHTML(){
  return `<div class="ti-wrap">
    <div class="ti-card2"><div class="ti-stripe" style="background:var(--accent)"></div>
      <div class="calc-wrap" style="padding:14px 16px 8px">
        <div class="calc-label">Idade materna (anos)</div>
        <div class="calc-in"><input id="tri-age" type="text" inputmode="decimal" placeholder="ex.: 34" oninput="triRun()"></div>
        <div class="calc-label">CCN — comprimento cabeça-nádega (mm)</div>
        <div class="calc-in"><input id="tri-crl" type="text" inputmode="decimal" placeholder="45–84" oninput="triRun()"></div>
        <div class="calc-hint">Define a IG e é usado no cálculo da TN (válido 11–13+6 sem)</div>
        <div class="calc-label">TN — translucência nucal (mm)</div>
        <div class="calc-in"><input id="tri-nt" type="text" inputmode="decimal" placeholder="ex.: 1.8" oninput="triRun()"></div>
        <div class="calc-label">β-hCG livre (MoM) — opcional</div>
        <div class="calc-in"><input id="tri-bhcg" type="text" inputmode="decimal" placeholder="ex.: 1.0" oninput="triRun()"></div>
        <div class="calc-label">PAPP-A (MoM) — opcional</div>
        <div class="calc-in"><input id="tri-pappa" type="text" inputmode="decimal" placeholder="ex.: 1.0" oninput="triRun()"></div>
        <div class="calc-label">Frequência cardíaca fetal (bpm) — opcional</div>
        <div class="calc-in"><input id="tri-fhr" type="text" inputmode="decimal" placeholder="ex.: 160" oninput="triRun()"></div>
      </div>
      <div id="tri-out"></div>
    </div>
    <div class="note" style="margin:0 2px 12px">⚠️ <span>Rastreio do 1º trimestre — não é diagnóstico. Calcula o risco para Trissomias 21, 18 e 13. Resultado a validar contra a fonte antes do uso clínico.</span></div>
    <div class="ti-card"><div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${TRI_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional baseada nos algoritmos publicados da Fetal Medicine Foundation. Rastreio, não diagnóstico. Não substitui o julgamento clínico.</b></div>
  </div>`;
}
function triNumVal(id){ const el=document.getElementById(id); if(!el) return null;
  const v=parseFloat(String(el.value).replace(',','.')); return isNaN(v)?null:v; }
function triRun(){
  const out=document.getElementById('tri-out'); if(!out) return;
  const age=triNumVal('tri-age'), crl=triNumVal('tri-crl'), nt=triNumVal('tri-nt');
  if(age==null||crl==null){ out.innerHTML=translateHTML(`<div class="note" style="margin:0 16px 14px">Informe ao menos a idade materna e o CCN.</div>`); return; }
  if(crl<45||crl>84){ out.innerHTML=translateHTML(`<div class="note" style="margin:0 16px 14px">CCN fora da faixa do teste combinado (45–84 mm).</div>`); return; }
  const r=triCompute({age, crl, nt, bhcg:triNumVal('tri-bhcg'), pappa:triNumVal('tri-pappa'), fhr:triNumVal('tri-fhr')});
  const linha=(key,label)=>{
    const o=r[key], alto=o.finalP>=1/100;
    return `<div style="margin-top:10px">
      ${fmBadge(`${label} — 1 ${t('em')} ${o.finalN}`, alto?'bad':'ok')}
      <div class="prose" style="margin-top:3px">${t('Risco de base (idade + IG):')} 1 ${t('em')} ${o.aprioriN}</div>
    </div>`;
  };
  out.innerHTML=`<div style="padding:2px 16px 16px">
    ${linha('t21',t('Trissomia 21'))}
    ${linha('t18',t('Trissomia 18'))}
    ${linha('t13',t('Trissomia 13'))}
    <div class="prose" style="margin-top:10px">${t('IG estimada pelo CCN:')} <b>${fmGAStr(r.gaDays)}</b></div>
    <div class="note" style="margin-top:10px">${t('limiar ilustrativo de 1:100 (o ponto de corte é definição de cada serviço).')}</div>
  </div>`;
}

/* registro no catálogo (Obstétrico e Fetal) — substitui o placeholder wip fm-tri */
(function(){
  if(typeof CALCS==='undefined') return;
  CALCS.push({id:'tri', spec:'obstetrico', badge:'T21',
    title:'Risco de Trissomias', desc:'Teste combinado do 1º trimestre (FMF) — T21, T18 e T13'});
})();
