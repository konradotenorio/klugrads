/* =========================================================================
   KlugRads — Laudos estruturados: regras automáticas pelas medidas
   ---------------------------------------------------------------------------
   As medidas digitadas no laudo passam a mudar o texto e a conclusão
   sozinhas, com limites ajustáveis em Configurações → Padrões dos laudos:
     • Rins: comprimento abaixo do limite → "dimensões reduzidas"; acima do
       limite superior → "dimensões aumentadas" (vale para os campos RD/RE
       da máscara e para o campo "Comprimento" do item estruturado).
     • Baço: maior eixo acima do limite → esplenomegalia.
     • Próstata: massa (calculada pelas 3 medidas) acima do limite →
       "dimensões aumentadas" no texto e na conclusão.
     • Conclusão: campos da conclusão normal ("massa estimada em XXX gramas",
       "resíduo … XXX mL") são preenchidos com o valor do mesmo campo no laudo.
   Carregar depois de laudos.js.
   ========================================================================= */

const LAU_AUTO_PADRAO = {on:true, rimMin:9, rimMax:13, bacoMax:13, prostMax:30, concLink:true};
function lauAutoCfg(){ const c=lauCfgAll(); return Object.assign({}, LAU_AUTO_PADRAO, c.auto||{}); }
function lauAutoSet(k, v){ const c=lauCfgAll(); c.auto=Object.assign({}, c.auto||{}, {[k]:v}); lauCfgSave(); }

/* palavras antes de cada campo do template (até 4): [{i, antes:'massa estimada em'}];
   pre = palavras a acrescentar no início (ex.: rótulo do item) */
function lauAutoCampos(str, pre){
  const tpl=lauTpl(str), out=[];
  tpl.lines.forEach((toks,li)=>{
    toks.forEach((t,j)=>{
      if(t.t!=='p') return;
      const ws=[]; for(let x=j-1; x>=0 && ws.length<4; x--){ if(toks[x].t==='w') ws.unshift(toks[x].s); else break; }
      let txt=ws.join(' ');
      if(pre && li===0 && ws.length===j) txt = pre+' '+txt;   // campo no começo do texto: usa o rótulo
      out.push({i:t.i, antes:lauNorm(txt).replace(/[():;,]/g,'').replace(/\s+/g,' ').trim()});
    });
  });
  return {tpl, campos:out};
}
/* valor (número) do campo cujo texto anterior casa com o regex */
function lauAutoValor(str, vals, re){
  const {tpl, campos}=lauAutoCampos(str);
  const c=campos.find(x=>re.test(x.antes)); if(!c) return null;
  const r=lauVal(tpl, vals||[], c.i); return r.ok ? lauF(r.v) : null;
}

/* ---- itens estruturados: estado "efetivo" com as dimensões ajustadas ---- */
function lauAutoEstado(m, it, s){
  const A=lauAutoCfg(); if(!A.on) return s;
  if(it.sk==='rins'){
    const nrm=lauItemNormal(m,it), vals=(s.__v||{}).n;
    const de = {D: lauAutoValor(nrm, vals, /\brd =?$/), E: lauAutoValor(nrm, vals, /\bre =?$/)};
    let e=null;
    ['D','E'].forEach(L=>{
      const v = lauF(s['comp'+L]) ?? de[L];
      if(v==null || s['dim'+L]!=='n' || s['est'+L]==='cx') return;
      const dim = v < A.rimMin ? 'red' : v > A.rimMax ? 'aum' : null;
      if(!dim) return;
      e = e || Object.assign({}, s);
      e['dim'+L]=dim; e.__auto=true;
    });
    // ao ajustar um lado, os comprimentos digitados na máscara viram os do item
    if(e) ['D','E'].forEach(L=>{ if(!lauHas(e['comp'+L]) && de[L]!=null) e['comp'+L]=String(de[L]).replace('.',','); });
    return e || s;
  }
  if(it.sk==='baco'){
    const v=lauF(s.comp);
    if(v!=null && s.dim==='n' && v > A.bacoMax) return Object.assign({}, s, {dim:'aum', __auto:true});
  }
  return s;
}

/* ---- itens de texto (máscara): próstata ---- */
const LAU_AUTO_TXT = [
  {id:'prostata', item:/^prostata/, campo:/massa estimada em$/, lim:'prostMax',
   cond:(v,A)=> v > A.prostMax,
   txt:[[/com forma habitual/, 'com forma habitual e dimensões aumentadas']],
   conc:v=>`Próstata com dimensões aumentadas (massa estimada em ${lauN(String(v))} gramas).`,
   concRep:[/^Próstata com massa estimada em/, 'Próstata com dimensões aumentadas, com massa estimada em']},
];
/* regras de texto que valem para o item agora: [{regra, v}] */
function lauAutoAtivas(m, it){
  const A=lauAutoCfg(); if(!A.on || !it.generic) return [];
  const s=state.lau.v[it.k]; if(lauHas(s.alt)) return [];
  const lbl=lauNorm(lauItemLabel(m,it));
  return LAU_AUTO_TXT.filter(r=>r.item.test(lbl)).map(r=>{
    const v=lauAutoValor(lauItemNormal(m,it), s.__v.n, r.campo);
    return v!=null && r.cond(v,A) ? {r, v} : null;
  }).filter(Boolean);
}
function lauAutoTxt(m, it, html){
  lauAutoAtivas(m,it).forEach(({r})=>{ (r.txt||[]).forEach(([a,b])=>{ html=html.replace(a,b); }); });
  return html;
}
/* conclusões das regras: as que alteram uma linha da conclusão normal entram como substituição */
function lauAutoConcs(m){
  const out=[], reps=[];
  m.items.forEach(it=>{ if(lauItemOutroLado(m,it)) return;
    lauAutoAtivas(m,it).forEach(({r,v})=>{
      const temLinha = r.concRep && lauConcNormalLines(m).some(c=>r.concRep[0].test(c.text));
      if(temLinha) reps.push(r.concRep); else out.push(r.conc(v));
    }); });
  return {out, reps};
}

/* ---- campos da conclusão preenchidos com o mesmo campo do laudo ---- */
function lauAutoConcVals(m, text, user){
  const A=lauAutoCfg(); if(!A.on || !A.concLink) return user;
  const vals=(user||[]).slice(); const {campos}=lauAutoCampos(text);
  campos.forEach(c=>{
    if(lauHas(vals[c.i]) || !c.antes) return;
    // escolhe o campo do laudo com mais palavras em comum (a palavra imediatamente anterior tem de coincidir)
    const cw=c.antes.split(' '), ult=cw[cw.length-1];
    let best=null, bs=1;
    for(const it of m.items){
      if(lauItemOutroLado(m,it)) continue;
      const nrm=lauItemNormal(m,it), s=state.lau.v[it.k]; if(!lauHasPh(nrm)) continue;
      const x=lauAutoCampos(nrm, lauItemLabel(m,it));
      x.campos.forEach(y=>{
        const yw=y.antes.split(' '); if(yw[yw.length-1]!==ult) return;
        const sc=cw.filter(w=>yw.indexOf(w)>=0).length;
        if(sc>bs){ const r=lauVal(x.tpl, (s.__v||{}).n||[], y.i); if(r.ok){ bs=sc; best=r.v; } }
      });
    }
    if(best!=null) vals[c.i]=best;
  });
  return vals;
}

/* ---- Configurações → Padrões dos laudos ---- */
function lauAutoCfgHTML(){
  const A=lauAutoCfg();
  const num=(k,lbl,unit)=>`<div class="lau-row" style="display:flex;align-items:center;gap:10px"><div class="lau-rl" style="flex:1;margin:0">${lbl}</div><div class="lau-num"><input type="text" inputmode="decimal" value="${esc(String(A[k]).replace('.',','))}" onchange="lauAutoSetNum('${k}',this.value)"><span>${unit}</span></div></div>`;
  return `<div class="ti-card">
    <div class="tfg-sec-lbl">Regras automáticas pelas medidas</div>
    <label class="lau-chk"><input type="checkbox" ${A.on?'checked':''} onchange="lauAutoSet('on',this.checked)"><span>Ajustar o texto e a conclusão conforme as medidas digitadas</span></label>
    ${num('rimMin','Rim com dimensões reduzidas abaixo de','cm')}
    ${num('rimMax','Rim com dimensões aumentadas acima de','cm')}
    ${num('bacoMax','Baço aumentado (esplenomegalia) acima de','cm')}
    ${num('prostMax','Próstata aumentada acima de','g')}
    <label class="lau-chk"><input type="checkbox" ${A.concLink?'checked':''} onchange="lauAutoSet('concLink',this.checked)"><span>Preencher os campos da conclusão com o valor do mesmo campo do laudo (ex.: massa da próstata, resíduo pós-miccional)</span></label>
    <div class="ti-legend-row" style="margin-top:6px"><span class="lt">Os limites valem para adultos; ajuste conforme a referência do seu serviço.</span></div>
  </div>`;
}
function lauAutoSetNum(k, v){ const n=lauF(v); if(n!=null) lauAutoSet(k, n); }
