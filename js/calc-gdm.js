/* =========================================================================
   KlugRads — Risco de Diabetes Gestacional (DMG) — 1º trimestre (FMF)
   ---------------------------------------------------------------------------
   Fonte: Syngelaki A, Pastides A, Kotecha R, Wright A, Akolekar R, Nicolaides
   KH. First-trimester screening for gestational diabetes mellitus based on
   maternal characteristics and history. Fetal Diagn Ther 2015;38:14-21. (Tab.3)
   Regressão logística: risco = 1/(1+exp(−logit)). Dois braços — mulheres com
   DMG anterior (só o peso contribui) e as demais (idade, peso, altura, etnia,
   história familiar, indução de ovulação, paridade e z-score do peso anterior).
   ATENÇÃO: ferramenta educacional. Rastreio, não diagnóstico. Validar antes
   do uso clínico.
   ========================================================================= */

const GDM_REFS = [
  'Syngelaki A, Pastides A, Kotecha R, Wright A, Akolekar R, Nicolaides KH. First-trimester screening for gestational diabetes mellitus based on maternal characteristics and history. Fetal Diagn Ther 2015;38:14-21.',
];

/* logit do risco de DMG — Syngelaki 2015, Tabela 3 */
function gdmLogit(inp){
  if(inp.parity==='prevgdm'){                    // parous com DMG anterior (só peso)
    return -4.0050 + 3.9209 + 0.0206*(inp.weight-69);
  }
  let L = -4.0050;
  if(inp.parity==='parous') L += -0.7885;        // parous sem DMG anterior
  L += 0.0807*(inp.age-35);
  L += 0.0381*(inp.weight-69);
  L += -0.0591*(inp.height-164);
  if(inp.fh==='first') L += 0.9332; else if(inp.fh==='second') L += 0.5869;
  if(inp.ovul) L += 0.4712;
  if(inp.race==='afro') L += 0.4562;
  else if(inp.race==='eastasian') L += 1.0727;
  else if(inp.race==='southasian') L += 0.8401;
  if(inp.parity==='parous') L += 0.2247*inp.prevbwz;   // z-score do peso ao nascer anterior
  return L;
}
function gdmCompute(inp){
  const L=gdmLogit(inp);
  return { risk: 1/(1+Math.exp(-L)) };
}

/* ---- UI ---- */
function gdmSeg(label, group, opts){
  const cur=(state.gdm&&state.gdm[group])||opts[0][0];
  const btns=opts.map(o=>`<button class="${cur===o[0]?'on':''}" onclick="gdmSet('${group}','${o[0]}')">${o[1]}</button>`).join('');
  return `<div class="pe-row"><div class="pe-lbl">${label}</div><div class="set-seg pe-seg" id="gdm-seg-${group}">${btns}</div></div>`;
}
function calcGdmHTML(){
  return `<div class="ti-wrap">
    <div class="ti-card2"><div class="ti-stripe" style="background:var(--accent)"></div>
      <div style="padding:12px 16px 6px">
        <div class="sec-label" style="text-align:left;padding-left:0">Fatores maternos</div>
        <div class="calc-label">Idade (anos)</div>
        <div class="calc-in"><input id="gdm-age" type="text" inputmode="decimal" placeholder="ex.: 32"></div>
        <div class="calc-label">Peso (kg)</div>
        <div class="calc-in"><input id="gdm-weight" type="text" inputmode="decimal" placeholder="ex.: 70"></div>
        <div class="calc-label">Altura (cm)</div>
        <div class="calc-in"><input id="gdm-height" type="text" inputmode="decimal" placeholder="ex.: 165"></div>
        ${gdmSeg('Origem étnica','race',[['white','Branca'],['afro','Afro-caribenha'],['eastasian','Leste-asiática'],['southasian','Sul-asiática'],['mixed','Mista']])}
        ${gdmSeg('História familiar de diabetes','fh',[['none','Não'],['first','1º grau'],['second','2º grau']])}
        ${gdmSeg('Concepção','ovul',[['no','Espontânea'],['yes','Indução de ovulação']])}
        ${gdmSeg('Paridade','parity',[['nulli','Nulípara'],['parous','Multípara (sem DMG)'],['prevgdm','Multípara (DMG anterior)']])}
        <div id="gdm-parous">${gdmParousHTML()}</div>
        <div class="calc-in" style="margin-top:10px"><button class="calc-btn" onclick="gdmRun()">Calcular</button></div>
      </div>
      <div id="gdm-out"></div>
    </div>
    <div class="note" style="margin:0 2px 12px">⚠️ <span>Rastreio do 1º trimestre — não é diagnóstico. Estima o risco de diabetes gestacional; o diagnóstico é pelo teste oral de tolerância à glicose. Resultado a validar contra a fonte antes do uso clínico.</span></div>
    <div class="ti-card"><div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${GDM_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional baseada no modelo publicado da Fetal Medicine Foundation. Rastreio, não diagnóstico. Não substitui o julgamento clínico.</b></div>
  </div>`;
}
function gdmParousHTML(){
  if(!state.gdm || state.gdm.parity!=='parous') return '';
  return `<div class="calc-label">Z-score do peso ao nascer anterior</div>
    <div class="calc-in"><input id="gdm-prevbwz" type="text" inputmode="decimal" placeholder="ex.: 0"></div>`;
}
function gdmSet(group, val){
  if(!state.gdm) state.gdm={};
  state.gdm[group]=val;
  const seg=document.getElementById('gdm-seg-'+group);
  if(seg) Array.prototype.forEach.call(seg.children, b=>{
    b.classList.toggle('on', b.getAttribute('onclick').endsWith("'"+val+"')"));
  });
  if(group==='parity'){ const el=document.getElementById('gdm-parous'); if(el) el.innerHTML=translateHTML(gdmParousHTML()); }
}
function gdmNum(id){ const el=document.getElementById(id); if(!el||el.value==='') return null;
  const v=parseFloat(String(el.value).replace(',','.')); return isNaN(v)?null:v; }
function gdmRun(){
  const out=document.getElementById('gdm-out'); if(!out) return;
  const g=state.gdm||{};
  const age=gdmNum('gdm-age'), weight=gdmNum('gdm-weight'), height=gdmNum('gdm-height');
  const parity=g.parity||'nulli';
  const needs = parity==='prevgdm' ? (weight==null) : (age==null||weight==null||height==null);
  if(needs){ out.innerHTML=translateHTML(`<div class="note" style="margin:0 16px 14px">Informe idade, peso e altura.</div>`); return; }
  const inp={
    age:age||35, weight, height:height||164,
    race:g.race||'white', fh:g.fh||'none', ovul:g.ovul==='yes',
    parity, prevbwz:gdmNum('gdm-prevbwz')||0,
  };
  const r=gdmCompute(inp);
  const n=Math.round(1/r.risk), pct=(r.risk*100);
  const alto=r.risk>=1/20;
  out.innerHTML=`<div style="padding:2px 16px 16px">
    ${fmBadge(`${t('Risco de DMG:')} 1 ${t('em')} ${n}`, alto?'bad':'ok')}
    <div class="prose" style="margin-top:8px">${t('Probabilidade:')} ${pct.toFixed(pct<1?2:1)}%</div>
    <div class="note" style="margin-top:10px">${alto?t('Risco aumentado'):t('Risco reduzido')} — ${t('limiar ilustrativo de 1:20 (o ponto de corte é definição de cada serviço).')}</div>
  </div>`;
}

/* registro no catálogo (Obstétrico e Fetal) */
(function(){
  if(typeof CALCS==='undefined') return;
  CALCS.push({id:'gdm', spec:'obstetrico', badge:'DMG',
    title:'Risco de Diabetes Gestacional', desc:'Rastreio do 1º trimestre por fatores maternos (FMF)'});
})();
