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
     • Também: testículos (volume reduzido), tireoide (volume total aumentado),
       ovários, útero e endométrio (opcionais), resíduo pós-miccional (graduado),
       veia porta, colédoco e aorta (ectasia ≥ limite → aneurisma).
     • Conclusão: campos da conclusão normal ("massa estimada em XXX gramas",
       "resíduo … XXX mL") são preenchidos com o valor do mesmo campo no laudo.
   Carregar depois de laudos.js.
   ========================================================================= */

const LAU_AUTO_PADRAO = {on:true, rimMin:9, rimMax:13, bacoMax:13, prostMax:30, concLink:true,
  testMin:9, tireoMin:4, tireoMax:25, ovMax:10.4, ovMaxMeno:5.4, uteroMax:120, endoMenac:1.5, endoMeno:0.5,
  residMin:30, portaMax:1.3, colMax:7, aortaEct:2.5, aortaAn:3};
/* limites: padrão global (Configurações) + ajustes feitos só neste laudo (state.lau.auto) */
function lauAutoCfgG(){ const c=lauCfgAll(); return Object.assign({}, LAU_AUTO_PADRAO, c.auto||{}); }
function lauAutoLocal(){ const L=state.lau; if(!L) return {lim:{}, off:{}, fase:'menac'}; if(!L.auto) L.auto={lim:{}, off:{}, fase:'menac'}; return L.auto; }
function lauAutoCfg(){ const a=lauAutoLocal(); return Object.assign(lauAutoCfgG(), a.lim, {fase:a.fase, off:a.off}); }
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
      // contexto longo: volta pelas palavras (pulando campos) até o fim da frase anterior
      const cw=[]; for(let x=j-1; x>=0 && cw.length<14; x--){ const k=toks[x]; if(k.t!=='w') continue; if(x<j-1 && /[.;]$/.test(k.s)) break; cw.unshift(k.s); }
      const lim=v=>lauNorm(v).replace(/[():;,.]/g,'').replace(/\s+/g,' ').trim();
      out.push({i:t.i, antes:lim(txt), ctx:lim(cw.join(' '))});
    });
  });
  return {tpl, campos:out};
}
/* valor (número) do campo cujo texto anterior casa com o regex */
function lauAutoValor(str, vals, re, ctx){
  const {tpl, campos}=lauAutoCampos(str);
  const c=campos.find(x=>ctx ? ctx.test(x.ctx) : re.test(x.antes)); if(!c) return null;
  const r=lauVal(tpl, vals||[], c.i); return r.ok ? lauF(r.v) : null;
}

/* ---- itens estruturados: estado "efetivo" com as dimensões ajustadas ---- */
function lauAutoEstado(m, it, s){
  const A=lauAutoCfg(); if(!A.on || A.off[it.sk]) return s;
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
  if(it.sk==='vias'){   // colédoco acima do limite com "dilatação ausente" → colédoco dilatado
    const v=lauF(s.col);
    if(v!=null && A.colMax && s.dil==='n' && v > A.colMax) return Object.assign({}, s, {dil:'e', __auto:true});
  }
  if(it.sk==='aorta'){  // ectasia × aneurisma pelo diâmetro
    const v=lauF(s.diam);
    if(v!=null && (s.est==='ect'||s.est==='an')){
      if(A.aortaAn && s.est==='ect' && v > A.aortaAn) return Object.assign({}, s, {est:'an', seg:s.seg||'infrarrenal', __auto:true});
      if(A.aortaAn && A.aortaEct && s.est==='an' && v >= A.aortaEct && v <= A.aortaAn) return Object.assign({}, s, {est:'ect', __auto:true});
    }
  }
  return s;
}

/* ---- itens de texto (máscara) ----
   item: rótulo do item; campo: palavras imediatamente antes do campo; ctx: frase até o campo
   (para itens com mais de um campo igual, ex.: volume do testículo direito/esquerdo);
   conc(v, rótulo): linha da conclusão; concRep: troca uma linha da conclusão normal */
const LAU_N = v=>lauN(String(v));
function lauResidGrau(v){ return v>300?'muito acentuado':v>150?'acentuado':v>80?'moderado':'pequeno'; }
const LAU_AUTO_TXT = [
  {id:'prostata', item:/^prostata/, campo:/massa estimada em$/,
   cond:(v,A)=> v > A.prostMax,
   txt:[[/com forma habitual/, 'com forma habitual e dimensões aumentadas']],
   conc:v=>`Próstata com dimensões aumentadas (massa estimada em ${LAU_N(v)} gramas).`,
   concRep:[/^Próstata com massa estimada em/, 'Próstata com dimensões aumentadas, com massa estimada em']},
  {id:'testD', item:/^testiculos?/, ctx:/testiculo direito medindo.* volume estimado em$/,
   cond:(v,A)=> A.testMin && v < A.testMin,
   conc:v=>`Testículo direito com volume reduzido (${LAU_N(v)} cm³).`},
  {id:'testE', item:/^testiculos?/, ctx:/testiculo esquerdo medindo.* volume estimado em$/,
   cond:(v,A)=> A.testMin && v < A.testMin,
   conc:v=>`Testículo esquerdo com volume reduzido (${LAU_N(v)} cm³).`},
  {id:'tireoide', item:/^(tireoide|volumes estimados)/, campo:/volume glandular total$/, txtEm:/^tireoide$/,
   cond:(v,A)=> A.tireoMax && v > A.tireoMax,
   txt:[[/dimensões normais/, 'dimensões aumentadas']],
   conc:v=>`Tireoide com dimensões aumentadas (volume glandular total de ${LAU_N(v)} cm³).`},
  {id:'tireoideRed', item:/^(tireoide|volumes estimados)/, campo:/volume glandular total$/, txtEm:/^tireoide$/,
   cond:(v,A)=> A.tireoMin && v < A.tireoMin,
   txt:[[/dimensões normais/, 'dimensões reduzidas']],
   conc:v=>`Tireoide com dimensões reduzidas (volume glandular total de ${LAU_N(v)} cm³).`},
  {id:'ovario', item:/^ovario (direito|esquerdo)/, campo:/volume estimado em$/,
   cond:(v,A)=>{ const l=A.fase==='meno'?A.ovMaxMeno:A.ovMax; return l && v > l; },
   conc:(v,l)=>`${l} com volume aumentado (${LAU_N(v)} cm³).`},
  {id:'utero', item:/^utero/, campo:/volume estimado em$/,
   cond:(v,A)=> A.uteroMax && v > A.uteroMax,
   txt:[[/de contornos regulares/, 'com dimensões aumentadas e contornos regulares']],
   conc:v=>`Útero com dimensões aumentadas (volume estimado em ${LAU_N(v)} cm³).`},
  {id:'endometrio', item:/^endometrio/, campo:/espessura bilaminar de$/,
   cond:(v,A)=>{ const l=A.fase==='meno'?A.endoMeno:A.endoMenac; return l && v > l; },
   conc:v=>`Endométrio espessado (${LAU_N(v)} cm).`},
  {id:'endoHet', item:/^endometrio/, escolha:'heterogêneo',
   conc:()=>'Endométrio heterogêneo.'},
  {id:'residuo', item:/^residuo/, campo:/estimado em$/,
   cond:(v,A)=> A.residMin && v >= A.residMin,
   conc:v=>`Resíduo pós-miccional ${lauResidGrau(v)} (estimado em ${LAU_N(v)} mL).`,
   concRep:[/^Resíduo pós-miccional estimado em/, v=>`Resíduo pós-miccional ${lauResidGrau(v)}, estimado em`]},
  {id:'porta', item:/^veia porta$/, campo:/calibre de$/,
   cond:(v,A)=> A.portaMax && v > A.portaMax,
   txt:[[/com calibre de/, 'com calibre aumentado, de']],
   conc:v=>`Veia porta com calibre aumentado (${LAU_N(v)} cm).`},
];
/* regras de texto que valem para o item agora: [{regra, v}] */
function lauAutoAtivas(m, it){
  const A=lauAutoCfg(); if(!A.on || !it.generic) return [];
  if(!state.lau.v[it.k]) return [];
  const s=state.lau.v[it.k]; if(lauHas(s.alt)) return [];
  const lbl=lauNorm(lauItemLabel(m,it));
  return LAU_AUTO_TXT.filter(r=>r.item.test(lbl) && !A.off[r.id]).map(r=>{
    if(r.escolha){   // regra de escolha (ex.: endométrio heterogêneo)
      const tpl=lauTpl(lauItemNormal(m,it)); const tk=tpl.lines.flat().find(t=>t.t==='c' && t.o.indexOf(r.escolha)>=0);
      if(!tk) return null; const val=lauVal(tpl, (s.__v||{}).n||[], tk.i);
      return val.ok && val.v===r.escolha ? {r, v:val.v, lbl:lauItemLabel(m,it)} : null;
    }
    const v=lauAutoValor(lauItemNormal(m,it), (s.__v||{}).n, r.campo, r.ctx);
    return v!=null && r.cond(v,A) ? {r, v, lbl:lauItemLabel(m,it)} : null;
  }).filter(Boolean);
}
/* o item editado tem regra que muda o texto de outro item? (o editor precisa redesenhar os vizinhos) */
function lauAutoAfetaOutros(m, it){
  if(!it.generic) return false; const lbl=lauNorm(lauItemLabel(m,it));
  return LAU_AUTO_TXT.some(r=>r.txtEm && r.item.test(lbl) && !r.txtEm.test(lbl));
}
function lauAutoTxt(m, it, html){
  // regras do próprio item + regras de outro item que mudam o texto deste (txtEm), ex.: volume da tireoide
  const lbl=lauNorm(lauItemLabel(m,it));
  let rs = lauAutoAtivas(m,it).filter(({r})=>!r.txtEm || r.txtEm.test(lbl));
  m.items.forEach(o=>{ if(o!==it) lauAutoAtivas(m,o).forEach(x=>{ if(x.r.txtEm && x.r.txtEm.test(lbl)) rs.push(x); }); });
  rs.forEach(({r})=>{ (r.txt||[]).forEach(([a,b])=>{ html=html.replace(a,b); }); });
  return html;
}
/* conclusões das regras: as que alteram uma linha da conclusão normal entram como substituição */
function lauAutoConcs(m){
  const out=[], reps=[];
  m.items.forEach(it=>{ if(lauItemOutroLado(m,it)) return;
    lauAutoAtivas(m,it).forEach(({r,v,lbl})=>{
      const temLinha = r.concRep && lauConcNormalLines(m).some(c=>r.concRep[0].test(c.text));
      if(temLinha) reps.push([r.concRep[0], typeof r.concRep[1]==='function' ? r.concRep[1](v) : r.concRep[1]]);
      else out.push(r.conc(v, lbl));
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
  const A=lauAutoCfgG();
  const num=(k,lbl,unit)=>`<div class="lau-row" style="display:flex;align-items:center;gap:10px"><div class="lau-rl" style="flex:1;margin:0">${lbl}</div><div class="lau-num"><input type="text" inputmode="decimal" placeholder="desligado" value="${A[k]==null?'':esc(String(A[k]).replace('.',','))}" onchange="lauAutoSetNum('${k}',this.value)"><span>${unit}</span></div></div>`;
  const sub=t=>`<div class="ti-legend-row" style="margin:10px 0 2px"><span class="lt" style="font-weight:600">${t}</span></div>`;
  return `<div class="ti-card">
    <div class="tfg-sec-lbl">Regras automáticas pelas medidas</div>
    <label class="lau-chk"><input type="checkbox" ${A.on?'checked':''} onchange="lauAutoSet('on',this.checked)"><span>Ajustar o texto e a conclusão conforme as medidas digitadas</span></label>
    ${sub('Abdome e vias urinárias')}
    ${num('rimMin','Rim com dimensões reduzidas abaixo de','cm')}
    ${num('rimMax','Rim com dimensões aumentadas acima de','cm')}
    ${num('bacoMax','Baço aumentado (esplenomegalia) acima de','cm')}
    ${num('colMax','Colédoco dilatado acima de','mm')}
    ${num('portaMax','Veia porta com calibre aumentado acima de','cm')}
    ${num('aortaEct','Aorta: ectasia a partir de','cm')}
    ${num('aortaAn','Aorta: aneurisma acima de','cm')}
    ${num('residMin','Resíduo pós-miccional significativo a partir de','mL')}
    ${sub('Próstata e bolsa testicular')}
    ${num('prostMax','Próstata aumentada acima de','g')}
    ${num('testMin','Testículo com volume reduzido abaixo de','cm³')}
    ${sub('Tireoide')}
    ${num('tireoMin','Tireoide reduzida (volume total) abaixo de','cm³')}
    ${num('tireoMax','Tireoide aumentada (volume total) acima de','cm³')}
    ${sub('Pelve feminina')}
    ${num('ovMax','Ovário aumentado acima de (menacme)','cm³')}
    ${num('ovMaxMeno','Ovário aumentado acima de (pós-menopausa)','cm³')}
    ${num('uteroMax','Útero com volume aumentado acima de','cm³')}
    ${num('endoMenac','Endométrio espessado acima de (menacme)','cm')}
    ${num('endoMeno','Endométrio espessado acima de (pós-menopausa)','cm')}
    <label class="lau-chk"><input type="checkbox" ${A.concLink?'checked':''} onchange="lauAutoSet('concLink',this.checked)"><span>Preencher os campos da conclusão com o valor do mesmo campo do laudo (ex.: massa da próstata, resíduo pós-miccional)</span></label>
    <div class="ti-legend-row" style="margin-top:6px"><span class="lt">Os limites valem para adultos; ajuste conforme a referência do seu serviço. Campo vazio = regra desligada. Dentro de cada laudo dá para mudar o limite só daquele exame (ex.: criança) no item correspondente.</span></div>
  </div>`;
}
function lauAutoSetNum(k, v){ if(!String(v).trim()){ lauAutoSet(k, null); return; } const n=lauF(v); if(n!=null) lauAutoSet(k, n); }

/* ---- caixa "Regra automática" no painel do item: muda o limite só neste laudo ---- */
const LAU_AUTO_LIMS = {
  prostata:[['prostMax','Aumentada acima de','g']],
  testD:[['testMin','Volume reduzido abaixo de','cm³']], testE:[['testMin','Volume reduzido abaixo de','cm³']],
  tireoide:[['tireoMin','Reduzida abaixo de','cm³'],['tireoMax','Aumentada acima de','cm³']], tireoideRed:[],
  ovario:[['ovMax','Aumentado acima de','cm³', 'menac'],['ovMaxMeno','Aumentado acima de','cm³','meno']],
  utero:[['uteroMax','Aumentado acima de','cm³']],
  endometrio:[['endoMenac','Espessado acima de','cm','menac'],['endoMeno','Espessado acima de','cm','meno']],
  residuo:[['residMin','Significativo a partir de','mL']],
  porta:[['portaMax','Aumentada acima de','cm']],
  rins:[['rimMin','Reduzido abaixo de','cm'],['rimMax','Aumentado acima de','cm']],
  baco:[['bacoMax','Aumentado acima de','cm']],
  vias:[['colMax','Colédoco dilatado acima de','mm']],
  aorta:[['aortaEct','Ectasia a partir de','cm'],['aortaAn','Aneurisma acima de','cm']],
};
const LAU_AUTO_FASE = ['ovario','endometrio'];
/* regras que se aplicam ao item (mesmo que não estejam disparadas) */
function lauAutoRegrasItem(m, it){
  if(!it.generic) return LAU_AUTO_LIMS[it.sk] ? [it.sk] : [];
  const lbl=lauNorm(lauItemLabel(m,it)), nrm=lauItemNormal(m,it);
  return LAU_AUTO_TXT.filter(r=>r.item.test(lbl) && (r.ctx||r.campo) && lauAutoCampos(nrm).campos.some(c=>r.ctx?r.ctx.test(c.ctx):r.campo.test(c.antes))).map(r=>r.id);
}
function lauAutoBoxHTML(m, it){
  const G=lauAutoCfgG(); if(!G.on || m.oct) return '';
  const ids=lauAutoRegrasItem(m,it); if(!ids.length) return '';
  const A=lauAutoCfg(), loc=lauAutoLocal();
  const ativa = lauAutoAtivaItem(m,it);
  const off = ids.every(id=>A.off[id]);
  const fase = ids.some(id=>LAU_AUTO_FASE.indexOf(id)>=0);
  const keys=[]; ids.forEach(id=>(LAU_AUTO_LIMS[id]||[]).forEach(x=>{ if(keys.some(y=>y[0]===x[0])) return; if(x[3] && x[3]!==A.fase) return; keys.push(x); }));
  const mudou = keys.some(x=>loc.lim[x[0]]!==undefined);
  const inp = x=>`<div class="lau-row" style="display:flex;align-items:center;gap:10px;margin:4px 0"><div class="lau-rl" style="flex:1;margin:0">${x[1]}${loc.lim[x[0]]!==undefined?` <small style="opacity:.7">(padrão ${esc(G[x[0]]==null?'desligado':String(G[x[0]]).replace('.',','))})</small>`:''}</div><div class="lau-num"><input type="text" inputmode="decimal" placeholder="desligado" value="${A[x[0]]==null?'':esc(String(A[x[0]]).replace('.',','))}" ${off?'disabled':''} onchange="lauAutoLim('${x[0]}',this.value)"><span>${x[2]}</span></div></div>`;
  return `<div class="lau-row lau-autobox" style="border:1px dashed var(--line,#ccc);border-radius:10px;padding:8px 10px;margin:8px 0">
    <div class="lau-rl" style="display:flex;justify-content:space-between;gap:8px;margin:0 0 4px"><span>Regra automática pela medida</span>${lauAutoStHTML(ativa, off, it.k)}</div>
    ${fase?`<div class="lau-chips" style="margin:4px 0">${[['menac','Menacme'],['meno','Pós-menopausa']].map(o=>`<button type="button" class="ti-ftog ${A.fase===o[0]?'on':''}" onclick="lauAutoFase('${o[0]}')">${o[1]}</button>`).join('')}</div>`:''}
    ${keys.map(inp).join('')}
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:4px">
      <label class="lau-chk" style="margin:0"><input type="checkbox" ${off?'checked':''} onchange="lauAutoOff('${ids.join(',')}',this.checked)"><span>Desligar neste laudo</span></label>
      ${mudou?`<button type="button" class="ti-ftog" onclick="lauAutoLimReset('${keys.map(x=>x[0]).join(',')}')">Voltar ao padrão</button>`:''}
    </div>
    <div class="ti-legend-row" style="margin-top:4px"><span class="lt">Mude o limite só para este exame (ex.: criança, outra referência). O padrão fica em Configurações → Padrões dos laudos.</span></div>
  </div>`;
}
function lauAutoStHTML(ativa, off, k){ return `<span id="lau-autost-${k}" style="font-weight:600;${ativa&&!off?'color:var(--acc,#c25)':'opacity:.7'}">${off?'desligada':ativa?'aplicada':'dentro do limite'}</span>`; }
function lauAutoAtivaItem(m, it){ if(it.generic) return lauAutoAtivas(m,it).length>0; const s=state.lau.v[it.k]; return lauAutoEstado(m,it,s)!==s; }
/* atualiza só o selo "aplicada / dentro do limite" enquanto o usuário digita as medidas */
function lauAutoStUpd(m, it){
  const el=document.getElementById('lau-autost-'+it.k); if(!el) return;
  const ids=lauAutoRegrasItem(m,it), A=lauAutoCfg(); const off=ids.every(id=>A.off[id]);
  el.outerHTML = lauAutoStHTML(lauAutoAtivaItem(m,it), off, it.k);
}
function lauAutoRefresh(){
  const L=lauCur(); if(!L) return; const m=lauModelo(L.model), ed=lauEd();
  if(ed) m.items.forEach(o=>{ const q=ed.querySelector(`[data-k="${o.k}"]`); if(!q) return; const h=lauItemHTML(m,o); if(q.innerHTML!==h){ q.innerHTML=h; q.hidden=!h; lauFlash(q); } });
  lauPatchConc(); lauSaveEd(); lauRenderLeft();
}
function lauAutoLim(k, v){ const a=lauAutoLocal(); if(!String(v).trim()) a.lim[k]=null; else { const n=lauF(v); if(n==null) return; a.lim[k]=n; } lauAutoRefresh(); }
function lauAutoLimReset(ks){ const a=lauAutoLocal(); ks.split(',').forEach(k=>delete a.lim[k]); lauAutoRefresh(); }
function lauAutoOff(ids, on){ const a=lauAutoLocal(); ids.split(',').forEach(id=>{ if(on) a.off[id]=true; else delete a.off[id]; }); lauAutoRefresh(); }
function lauAutoFase(f){ lauAutoLocal().fase=f; lauAutoRefresh(); }

/* ---- Ecocardio: FEVE (Teichholz) e Delta D calculados a partir do DDVE e DSVE ----
   Teichholz: V = 7·D³ / (2,4 + D), D em cm. FEVE = (VDF − VSF)/VDF; Delta D = (DDVE − DSVE)/DDVE.
   Só preenche se o campo estiver vazio ou tiver sido preenchido por este cálculo. */
function lauEcoCalc(m){
  if(!m || m.id!=='us-ecocardio') return;
  const L=state.lau, it=lbl=>m.items.find(i=>i.label===lbl);
  const v=lbl=>{ const i=it(lbl); return i ? lauF(((L.v[i.k].__v||{}).n||[])[0]) : null; };
  const dd=v('DDVE'), ds=v('DSVE');
  const put=(lbl, val)=>{ const i=it(lbl); if(!i) return; const s=L.v[i.k]; const cur=((s.__v.n||[])[0]);
    if(lauHas(cur) && !s.__ecoAuto) return;
    const a=(s.__v.n||[]).slice(); a[0]= val==null ? '' : String(val); s.__v.n=a; s.__ecoAuto = val!=null;
    lauPatch(i.k); lauUpdSum(i.k); };
  if(dd && ds && dd>ds){
    const V=D=>7*Math.pow(D/10,3)/(2.4+D/10);
    put('FEVE (Teichholz)', Math.round((V(dd)-V(ds))/V(dd)*100));
    put('Delta D', Math.round((dd-ds)/dd*100));
  } else { put('FEVE (Teichholz)', null); put('Delta D', null); }
}
