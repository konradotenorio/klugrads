/* =========================================================================
   KlugRads — Risco de Parto Prematuro espontâneo — história materna + colo (FMF)
   ---------------------------------------------------------------------------
   Fonte: To MS, Skentou CA, Royston P, Yu CK, Nicolaides KH. Prediction of
   patient-specific risk of early preterm delivery using maternal history and
   sonographic measurement of cervical length. Ultrasound Obstet Gynecol
   2006;27:362-367. (Tabelas 2 e 4 + exemplo do apêndice)
   Modelo: risco de parto espontâneo antes de X semanas = P(X) × Q, onde
   Q = prob. de parto (qualquer causa) < 37 sem (Tab.2, logística) e
   P(X) = prob. de parto espontâneo < X sem dado que houve parto pré-termo,
   com coeficientes β_i(X) que variam com X (Tab.4). ln = log natural.
   ATENÇÃO: ferramenta educacional. Rastreio, não diagnóstico. Validar antes
   do uso clínico.
   ========================================================================= */

const PTB_REFS = [
  'To MS, Skentou CA, Royston P, Yu CK, Nicolaides KH. Prediction of patient-specific risk of early preterm delivery using maternal history and sonographic measurement of cervical length. Ultrasound Obstet Gynecol 2006;27:362-367.',
];

/* Q — prob. de parto (qualquer causa) < 37 sem (To 2006, Tabela 2) */
function ptbLogitQ(inp){
  const bmi=inp.bmi, cl=inp.cl;
  let L = -1.031;
  L += 0.0096*inp.age;
  if(inp.eth==='afro'||inp.eth==='asian') L += 0.219;
  L += 200.6/bmi - 87.5/bmi*Math.log(bmi);
  if(inp.smoker) L += 0.371;
  L += {none:0, d16:0.796, d24:1.296, d33:0.919, term:-0.344}[inp.obs] || 0;
  if(inp.cone) L += 0.332;
  L += 5.00*Math.exp(-0.05*cl);
  return L;
}
/* β_i(X) da Tabela 4: constante + linear·(X−32) + quadrático·(X−32)² */
const PTB_B = {
  b0:[-4.5572,0.476371,0.059861],
  b1:[0.5254,-0.007444,-0.014886],   // (age/30)^-2
  b2:[0.5544,-0.026112,-0.030793],   // parto 16-23
  b3:[1.5015,-0.044014,-0.039841],   // parto 24-32
  b4:[0.1770,0.133579,-0.017738],    // parto 33-36
  b5:[0.2490,0.02056,-0.026021],     // parto >=37 (termo)
  b6:[5.0147,-0.281457,-0.010549],   // exp(-0.05*CL)
};
function ptbBeta(key,X){ const b=PTB_B[key], d=X-32; return b[0]+b[1]*d+b[2]*d*d; }
/* P(X) — prob. de parto espontâneo < X sem, dado parto pré-termo (Tab.4) */
function ptbLogitP(inp,X){
  let L = ptbBeta('b0',X);
  L += ptbBeta('b1',X)*Math.pow(inp.age/30,-2);
  L += ptbBeta('b2',X)*(inp.obs==='d16'?1:0);
  L += ptbBeta('b3',X)*(inp.obs==='d24'?1:0);
  L += ptbBeta('b4',X)*(inp.obs==='d33'?1:0);
  L += ptbBeta('b5',X)*(inp.obs==='term'?1:0);
  L += ptbBeta('b6',X)*Math.exp(-0.05*inp.cl);
  return L;
}
function ptbSig(L){ return 1/(1+Math.exp(-L)); }
/* risco de parto espontâneo < X semanas = P(X) × Q */
function ptbRisk(inp,X){ return ptbSig(ptbLogitP(inp,X))*ptbSig(ptbLogitQ(inp)); }
function ptbCompute(inp){
  return { r34:ptbRisk(inp,34), r32:ptbRisk(inp,32), r30:ptbRisk(inp,30), r28:ptbRisk(inp,28),
           Q:ptbSig(ptbLogitQ(inp)) };
}

/* ---- UI ---- */
function ptbSeg(label, group, opts){
  const cur=(state.ptb&&state.ptb[group])||opts[0][0];
  const btns=opts.map(o=>`<button class="${cur===o[0]?'on':''}" onclick="ptbSet('${group}','${o[0]}')">${o[1]}</button>`).join('');
  return `<div class="pe-row"><div class="pe-lbl">${label}</div><div class="set-seg pe-seg" id="ptb-seg-${group}">${btns}</div></div>`;
}
function calcPtbHTML(){
  return `<div class="ti-wrap">
    <div class="ti-card2"><div class="ti-stripe" style="background:var(--accent)"></div>
      <div style="padding:12px 16px 6px">
        <div class="sec-label" style="text-align:left;padding-left:0">Fatores maternos</div>
        <div class="calc-label">Idade (anos)</div>
        <div class="calc-in"><input id="ptb-age" type="text" inputmode="decimal" placeholder="ex.: 30"></div>
        <div class="calc-label">Peso (kg)</div>
        <div class="calc-in"><input id="ptb-weight" type="text" inputmode="decimal" placeholder="ex.: 68"></div>
        <div class="calc-label">Altura (cm)</div>
        <div class="calc-in"><input id="ptb-height" type="text" inputmode="decimal" placeholder="ex.: 165"></div>
        ${ptbSeg('Origem étnica','eth',[['cauc','Branca'],['afro','Afro-caribenha'],['asian','Asiática / outra']])}
        ${ptbSeg('Tabagismo','smoker',[['no','Não'],['yes','Sim']])}
        ${ptbSeg('Cirurgia cervical prévia','cone',[['no','Não'],['yes','Cone / LEEP']])}
        <div class="calc-label">História obstétrica (parto anterior)</div>
        <div style="padding:0 0 6px"><div class="set-seg pe-seg" id="ptb-seg-obs" style="flex-wrap:wrap;justify-content:flex-start">
          ${['none','Nulípara','d16','16–23 sem','d24','24–32 sem','d33','33–36 sem','term','≥37 sem'].reduce((a,_,i,A)=>i%2?a:a+`<button class="${((state.ptb&&state.ptb.obs)||'none')===A[i]?'on':''}" onclick="ptbSet('obs','${A[i]}')">${A[i+1]}</button>`,'')}
        </div></div>
        <div class="sec-label" style="text-align:left;padding-left:0;margin-top:8px">Ultrassonografia</div>
        <div class="calc-label">Comprimento do colo uterino (mm)</div>
        <div class="calc-in"><input id="ptb-cl" type="text" inputmode="decimal" placeholder="ex.: 35"></div>
        <div class="calc-in" style="margin-top:10px"><button class="calc-btn" onclick="ptbRun()">Calcular</button></div>
      </div>
      <div id="ptb-out"></div>
    </div>
    <div class="note" style="margin:0 2px 12px">⚠️ <span>Rastreio do 2º trimestre — não é diagnóstico. Estima o risco de parto prematuro espontâneo a partir da história materna e do comprimento do colo. Resultado a validar contra a fonte antes do uso clínico.</span></div>
    <div class="ti-card"><div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${PTB_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional baseada no modelo publicado da Fetal Medicine Foundation. Rastreio, não diagnóstico. Não substitui o julgamento clínico.</b></div>
  </div>`;
}
function ptbSet(group, val){
  if(!state.ptb) state.ptb={};
  state.ptb[group]=val;
  const seg=document.getElementById('ptb-seg-'+group);
  if(seg) Array.prototype.forEach.call(seg.children, b=>{
    b.classList.toggle('on', b.getAttribute('onclick').endsWith("'"+val+"')"));
  });
}
function ptbNum(id){ const el=document.getElementById(id); if(!el||el.value==='') return null;
  const v=parseFloat(String(el.value).replace(',','.')); return isNaN(v)?null:v; }
function ptbRun(){
  const out=document.getElementById('ptb-out'); if(!out) return;
  const p=state.ptb||{};
  const age=ptbNum('ptb-age'), weight=ptbNum('ptb-weight'), height=ptbNum('ptb-height'), cl=ptbNum('ptb-cl');
  if(age==null||weight==null||height==null||cl==null){
    out.innerHTML=translateHTML(`<div class="note" style="margin:0 16px 14px">Informe idade, peso, altura e comprimento do colo.</div>`); return; }
  const bmi=weight/Math.pow(height/100,2);
  const inp={ age, bmi, cl, eth:p.eth||'cauc', smoker:p.smoker==='yes', cone:p.cone==='yes', obs:p.obs||'none' };
  const r=ptbCompute(inp);
  const line=(risk,label)=>`<div class="prose" style="margin-top:4px">${esc(label)} 1 ${t('em')} ${Math.round(1/risk)}</div>`;
  const alto=r.r34>=1/20;
  out.innerHTML=`<div style="padding:2px 16px 16px">
    ${fmBadge(esc(`${t('Parto espontâneo <34 sem:')} 1 ${t('em')} ${Math.round(1/r.r34)}`), alto?'bad':'ok')}
    ${line(r.r32, t('Parto espontâneo <32 sem:'))}
    ${line(r.r30, t('Parto espontâneo <30 sem:'))}
    ${line(r.r28, t('Parto espontâneo <28 sem:'))}
    <div class="note" style="margin-top:10px">${t('limiar ilustrativo de 1:20 (o ponto de corte é definição de cada serviço).')}</div>
  </div>`;
}

/* registro no catálogo (Obstétrico e Fetal) */
(function(){
  if(typeof CALCS==='undefined') return;
  CALCS.push({id:'ptb', spec:'obstetrico', badge:'PP',
    title:'Risco de Parto Prematuro', desc:'História materna + comprimento cervical (FMF)'});
})();
