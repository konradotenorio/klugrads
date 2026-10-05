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
  residMin:30, portaMax:1.3, colMax:7, aortaEct:2.5, aortaAn:3, nervMed:10, nervUln:9};
/* limites: padrão global (Configurações) + ajustes feitos só neste laudo (state.lau.auto) */
function lauAutoCfgG(){ const c=lauCfgAll(); return Object.assign({}, LAU_AUTO_PADRAO, c.auto||{}); }
function lauAutoLocal(){ const L=state.lau; if(!L) return {lim:{}, off:{}, fase:'menac'}; if(!L.auto) L.auto={lim:{}, off:{}, fase:'menac'}; return L.auto; }
function lauAutoCfg(){ const a=lauAutoLocal(); return Object.assign(lauAutoCfgG(), a.lim, {fase:a.fase, off:a.off}); }
function lauAutoSet(k, v){ const c=lauCfgAll(); c.auto=Object.assign({}, c.auto||{}, {[k]:v}); lauCfgSave(); }

/* palavras antes de cada campo do template (até 4): [{i, antes:'massa estimada em'}];
   pre = palavras a acrescentar no início (ex.: rótulo do item) */
function lauAutoCampos(str, pre){
  const tpl=lauTpl(str), out=[];
  const raw = tpl.mm ? lauTplRaw(String(str)) : null;   // preferência em mm: campo que era "cm" na máscara
  tpl.lines.forEach((toks,li)=>{
    toks.forEach((t,j)=>{
      if(t.t!=='p') return;
      const cm2mm = !!(raw && raw.lines[li] && raw.lines[li][j+1] && /^cm[.,;:)]*$/.test(raw.lines[li][j+1].s||''));
      const ws=[]; for(let x=j-1; x>=0 && ws.length<4; x--){ if(toks[x].t==='w') ws.unshift(toks[x].s); else break; }
      let txt=ws.join(' ');
      if(pre && li===0 && ws.length===j) txt = pre+' '+txt;   // campo no começo do texto: usa o rótulo
      // contexto longo: volta pelas palavras (pulando campos) até o fim da frase anterior
      const cw=[]; for(let x=j-1; x>=0 && cw.length<14; x--){ const k=toks[x]; if(k.t!=='w') continue; if(x<j-1 && /[.;]$/.test(k.s)) break; cw.unshift(k.s); }
      const lim=v=>lauNorm(v).replace(/[():;,.]/g,'').replace(/\s+/g,' ').trim();
      const mmNat = !cm2mm && /^mm[.,;:)]*$/.test((toks[j+1]&&toks[j+1].s)||'') && !(raw && raw.lines[li] && raw.lines[li][j+1] && /^cm/.test(raw.lines[li][j+1].s||''));   // campo já em mm na máscara (ex.: endométrio)
      out.push({i:t.i, antes:lim(txt), ctx:lim(cw.join(' ')), cm2mm: cm2mm || mmNat});
    });
  });
  return {tpl, campos:out};
}
/* valor (número) do campo cujo texto anterior casa com o regex */
function lauAutoValor(str, vals, re, ctx){
  const {tpl, campos}=lauAutoCampos(str);
  const c=campos.find(x=>ctx ? ctx.test(x.ctx) : re.test(x.antes)); if(!c) return null;
  const r=lauVal(tpl, vals||[], c.i); if(!r.ok) return null;
  const v=lauF(r.v); return v!=null && c.cm2mm ? v/10 : v;   // regras trabalham em cm
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
/* comprimento (em cm) escrito na unidade escolhida em Padrões dos laudos */
const LAU_LEN = v=> lauUnMM() ? LAU_N(Math.round(v*100)/10)+' mm' : LAU_N(v)+' cm';
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
   conc:v=>`Endométrio espessado (${LAU_N(Math.round(v*100)/10)} mm).`},   // endométrio sempre em mm
  /* nervos (área seccional em mm²): mediano na entrada do túnel do carpo ≥ 10 mm²; ulnar no epicôndilo medial ≥ 9 mm² */
  {id:'nervMed', item:/^nervo mediano/, campo:/area seccional de$/,
   cond:(v,A)=> A.nervMed && v >= A.nervMed,
   txt:[[/com trajeto preservado, contornos lisos e textura homogênea/, 'espessado e hipoecogênico, com trajeto preservado']],
   conc:v=>`Espessamento do nervo mediano na entrada do túnel do carpo (área seccional de ${LAU_N(v)} mm²), compatível com neuropatia compressiva (síndrome do túnel do carpo), a correlacionar com dados clínicos e eletroneuromiografia.`},
  {id:'nervUln', item:/^nervo ulnar/, campo:/area seccional de$/,
   cond:(v,A)=> A.nervUln && v >= A.nervUln,
   txt:[[/com espessura, contornos e ecotextura normais/, 'espessado e hipoecogênico']],
   conc:v=>`Espessamento do nervo ulnar no cotovelo (área seccional de ${LAU_N(v)} mm²), compatível com neuropatia ulnar, a correlacionar com dados clínicos e eletroneuromiografia.`},
  {id:'endoHet', item:/^endometrio/, escolha:'heterogêneo',
   conc:()=>'Endométrio heterogêneo.'},
  {id:'residuo', item:/^residuo/, campo:/estimado em$/,
   cond:(v,A)=> A.residMin && v >= A.residMin,
   conc:v=>`Resíduo pós-miccional ${lauResidGrau(v)} (estimado em ${LAU_N(v)} mL).`,
   concRep:[/^Resíduo pós-miccional estimado em/, v=>`Resíduo pós-miccional ${lauResidGrau(v)}, estimado em`]},
  {id:'porta', item:/^veia porta$/, campo:/calibre de$/,
   cond:(v,A)=> A.portaMax && v > A.portaMax,
   txt:[[/com calibre de/, 'com calibre aumentado, de']],
   conc:v=>`Veia porta com calibre aumentado (${LAU_LEN(v)}).`},
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
  // obstetrícia: "embrião vivo" só com CCN e BCF; sem embrião medido, a IG é pelo DMSG
  if(m && /obstetric/.test(m.id) && lauAutoCfg().on){
    const ig=lauObsIG(m), bcf=lauObsCampo(m, /\bbcf$/);
    // opção "BCF não caracterizado" marcada no embrião: tira o "vivo" e acrescenta a frase de controle
    const semBcf = m.items.some(it=>{ const v=state.lau.v[it.k]; return it.alts && v && v.__alt>0 && /BCF não caracterizado/.test(it.alts[v.__alt]||''); });
    if(semBcf){
      reps.push([/com embrião vivo e de idade gestacional/, 'com embrião de idade gestacional']);
      reps.push([/,? com embrião vivo(?= e|\.|,)/, ', com embrião']);
      out.push('Batimentos cardíacos embrionários não caracterizados ao estudo atual. Sugere-se controle ultrassonográfico evolutivo.');
    }
    const igx=lauObsIGBox();
    if(igx){
      // IG do quadro (DUM / exame prévio / informada): a conclusão diz de onde veio
      reps.push([/ pela biometria atual/, ' '+igx.fonte]);
      reps.push([/(estimada em \d+ semanas? e \d+ dias?)(?![a-zà-ú])(?! (pela|pelo|segundo))/, '$1 '+igx.fonte]);
    } else if(ig && ig.fonte==='dmsg'){
      reps.push([/,? com embrião vivo e de idade gestacional/, ', de idade gestacional']);
      reps.push([/pela biometria atual/, 'pelo diâmetro médio do saco gestacional']);
    } else if(lauObsCampo(m, /\bccn =?$/)!=null && !bcf){
      reps.push([/com embrião vivo e de idade gestacional/, 'com embrião de idade gestacional']);
    }
    reps.push([/ e 0 dias(?![a-zà-ú])/, ''], [/ e 1 dias(?![a-zà-ú])/, ' e 1 dia']);   // "30 semanas e 1 dia", "30 semanas"
    out.push(...lauObsBcfConc(m));
  }
  if(lauCarAtivo(m)) out.push(...lauCarConc(m));
  { const R=lauRetos(m); if(R && R.dia) out.push(`Diástase da musculatura reto-abdominal (${R.txt}).`); }
  const keep=[];
  // obstétricos 2º/3º tri: peso (AIG/PIG/GIG) e Doppler; só quando há o que dizer além do texto padrão
  if(lauObsDopAtivo(m) && lauAutoCfg().on){
    const d=lauObsDopConc(m), dopN=(lauConcNormalLines(m).find(c=>/^Estudo Doppler/.test(c.text))||{}).text;
    if(out.length || d.out.some(t=>t!==dopN)) out.push(...d.out); else if(dopN) keep.push(/^Estudo Doppler/);
  }
  m.items.forEach(it=>{ if(lauItemOutroLado(m,it)) return;
    lauAutoAtivas(m,it).forEach(({r,v,lbl})=>{
      const temLinha = r.concRep && lauConcNormalLines(m).some(c=>r.concRep[0].test(c.text));
      if(temLinha) reps.push([r.concRep[0], typeof r.concRep[1]==='function' ? r.concRep[1](v) : r.concRep[1]]);
      else out.push(r.conc(v, lbl));
    }); });
  return {out, reps, keep};
}

/* ---- campos da conclusão preenchidos com o mesmo campo do laudo ---- */
function lauAutoConcVals(m, text, user){
  const A=lauAutoCfg(); if(!A.on || !A.concLink) return user;
  const vals=(user||[]).slice(); const {campos}=lauAutoCampos(text);
  // obstetrícia: idade gestacional pela biometria (CCN; sem embrião, DMSG) nas tabelas de referência
  if(/idade gestacional (\(IG\) )?estimada em/i.test(text)){
    const ig=lauObsIGBox() || lauObsIG(m);
    if(ig) campos.forEach(c=>{
      if(lauHas(vals[c.i])) return;
      if(/estimada em$/.test(c.antes)) vals[c.i]=String(ig.sem);
      else if(/semanas e$/.test(c.antes)) vals[c.i]=String(ig.dias);
    });
  }
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
    ${sub('Nervos (musculoesquelético)')}
    ${num('nervMed','Nervo mediano espessado a partir de (área seccional)','mm²')}
    ${num('nervUln','Nervo ulnar espessado a partir de (área seccional)','mm²')}
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
  nervMed:[['nervMed','Espessado a partir de','mm²']], nervUln:[['nervUln','Espessado a partir de','mm²']],
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
  const L=state.lau;
  // acha o campo pelo texto logo antes dele (ex.: "DDVE:") em qualquer item do laudo
  const campo=re=>{ for(const it of m.items){ const c=lauAutoCampos(lauItemNormal(m,it)).campos.find(x=>re.test(x.antes)); if(c) return {it, i:c.i}; } return null; };
  const val=c=>c ? lauF(((L.v[c.it.k].__v||{}).n||[])[c.i]) : null;
  const dd=val(campo(/\bddve$/)), ds=val(campo(/\bdsve$/));
  const put=(c, v)=>{ if(!c) return; const s=L.v[c.it.k]; s.__ecoAuto=s.__ecoAuto||{};
    const cur=((s.__v.n||[])[c.i]); if(lauHas(cur) && !s.__ecoAuto[c.i]) return;
    const a=(s.__v.n||[]).slice(); a[c.i]= v==null ? '' : String(v); s.__v.n=a; s.__ecoAuto[c.i] = v!=null;
    lauPatch(c.it.k); lauUpdSum(c.it.k);
    if(state.lau.open===c.it.k) lauRenderLeft(); };
  const fe=campo(/feve teichholz$/), dl=campo(/\bdelta d$/);
  if(dd && ds && dd>ds){
    const V=D=>7*Math.pow(D/10,3)/(2.4+D/10);
    put(fe, Math.round((V(dd)-V(ds))/V(dd)*100));
    put(dl, Math.round((dd-ds)/dd*100));
  } else { put(fe, null); put(dl, null); }
}

/* ---- Obstetrícia 2º/3º tri e Doppler: PFE (Hadlock) e percentis pelas calculadoras de Medicina Fetal
   (js/calc-fetal.js: hadlockEFW, efwPercentile, FM_UA_PI, FM_MCA_PI, FM_DV_PIV, VPS-ACM de Mari).
   IG: quadro de idade gestacional (DUM / exame anterior / digitada); senão, a IG digitada na conclusão.
   Só preenche campo vazio ou preenchido por este cálculo (o médico pode sobrescrever). */
function lauObsDopAtivo(m){ return !!(m && /^us-obstetrico-(2-e-3-trimestre|doppler|gemelar|gemelar-com-doppler)$/.test(m.id)); }
function lauObsGA(m){
  if(typeof lauIgCalc==='function'){ const r=lauIgCalc(); if(r && !r.erro && r.dias!=null) return r.dias/7; }
  const L=state.lau; let ga=null;
  lauConcNormalLines(m).forEach((c,i)=>{
    if(ga!=null || !/idade gestacional (\(IG\) )?estimada em/i.test(c.text)) return;
    const vals=lauAutoConcVals(m, c.text, L.conc.v['n'+i]); const {tpl, campos}=lauAutoCampos(c.text);
    const g=re=>{ const x=campos.find(y=>re.test(y.antes)); if(!x) return null; const r=lauVal(tpl, vals||[], x.i); return r.ok ? lauF(r.v) : null; };
    const sem=g(/estimada em$/), d=g(/semanas e$/);
    if(sem!=null) ga=sem+(d||0)/7;
  });
  return ga;
}
/* campos por linha: {it, s, tpl, i, linha (texto normalizado), antes, ord, on} */
function lauObsDopCampos(m){
  const out=[], nz=v=>lauNorm(v).replace(/[():;,.]/g,'').replace(/\s+/g,' ').trim();
  let fet=0;   // gemelar: itens depois de "Feto 1" / "Feto 2" pertencem a esse feto
  m.items.forEach(it=>{
    if(!it.generic) return; const s=state.lau.v[it.k]; const lbl=nz(lauItemLabel(m,it)||'');
    const mf=/^feto (\d)/.exec(lbl); if(mf) fet=+mf[1];
    const add=(str, tpl, on)=>{
      lauTpl(str).lines.forEach(toks=>{
        const linha=nz(toks.filter(t=>t.t==='w').map(t=>t.s).join(' ')); let ord=0;
        toks.forEach((t,j)=>{ if(t.t!=='p') return;
          const ws=[]; for(let x=j-1; x>=0 && ws.length<3; x--){ if(toks[x].t==='w') ws.unshift(toks[x].s); else break; }
          out.push({it, s, tpl, i:t.i, lbl, linha, antes:nz(ws.join(' ')), ord:ord++, on, fet});
        });
      });
    };
    add(lauItemNormal(m,it), 'n', true);
    (it.opts||[]).forEach((o,j)=>add(o, 'o'+j, !!(s.__o||[])[j]));
  });
  return out;
}
function lauObsPctTab(tbl, ga, x){   // percentil aproximado a partir de P5/P50/P95 da tabela
  const p5=fmInterp(tbl,ga,1), p50=fmInterp(tbl,ga,2), p95=fmInterp(tbl,ga,3);
  const z = x>=p50 ? (x-p50)/((p95-p50)/1.645) : (x-p50)/((p50-p5)/1.645);
  return fmPct(z);
}
/* RCP: mediana = P50 ACM / P50 AU; dispersão log ≈ 0,26 (REVISAR — derivada das tabelas da calculadora) */
function lauObsPctRcp(ga, r){ const p50=fmInterp(FM_MCA_PI,ga,2)/fmInterp(FM_UA_PI,ga,2); return fmPct(Math.log(r/p50)/0.26); }
function lauObsPctTxt(p){ return p<1 ? '< 1' : p>99 ? '> 99' : String(Math.round(p)); }
function lauObsNum(v, d){ return v.toFixed(d).replace('.',','); }
/* lê as medidas e calcula tudo; devolve {campos, alvo, val, res} */
function lauObsFetos(m){ const f=[...new Set(lauObsDopCampos(m).map(c=>c.fet))].filter(x=>x>0); return f.length ? f : [0]; }
function lauObsDopDados(m, fet){
  const T=lauObsDopCampos(m), C=fet ? T.filter(c=>c.fet===fet) : T;
  const ach=(linha, antes, ord)=>C.find(c=>c.on && (!linha || linha.test(c.linha) || linha.test(c.lbl)) && (antes ? antes.test(c.antes) : c.ord===(ord||0)));
  const val=c=>{ if(!c) return null; const r=lauVal(lauTpl(c.tpl==='n'?lauItemNormal(m,c.it):c.it.opts[+c.tpl.slice(1)]), (c.s.__v||{})[c.tpl]||[], c.i); return r.ok ? lauF(r.v) : null; };
  const alvo={
    pc:ach(null,/\bpc =$/), ca:ach(null,/\bca =$/), cf:ach(null,/\bcf =$/),
    pfe:C.find(c=>c.on && (/^peso fetal estimado/.test(c.lbl) || /^peso fetal estimado/.test(c.linha)) && c.ord===0 && c.tpl==='n'),
    pfeP:C.find(c=>c.on && (/^peso fetal estimado/.test(c.lbl) || /^peso fetal estimado/.test(c.linha)) && /percentil$/.test(c.antes)),
    au:ach(/^arteria umbilical/,/\bip =$/), auP:ach(/^arteria umbilical/,/percentil$/),
    acm:ach(/^arteria cerebral media/,/\bip =$/), acmP:ach(/^arteria cerebral media/,/percentil$/),
    rcp:ach(/^relacao cerebro-?placentaria/,null,0), rcpP:ach(/^relacao cerebro-?placentaria/,/percentil$/),
    vps:ach(/^pico de velocidade sistolica/,null,0), vpsM:ach(/^pico de velocidade sistolica/,null,1),
    dv:ach(/^ducto venoso/,/\bip =$/), dvP:ach(/^ducto venoso/,/percentil$/),
  };
  alvo.disc=T.find(c=>c.on && /^discordancia de peso/.test(c.lbl) && c.ord===0);
  return {C, alvo, val, ga:lauObsGA(m)};
}
function lauObsDopCalc(m){
  if(!lauObsDopAtivo(m) || !lauAutoCfg().on) return;
  const mud={}, pesos=[]; let D0=null;
  const auto=c=>{ const s=c.s; s.__obsAuto=s.__obsAuto||{}; return s.__obsAuto; };
  const put=(c, x)=>{ if(!c) return;
    const key=c.tpl+':'+c.i, arr=(c.s.__v[c.tpl]||[]), cur=arr[c.i];
    if(lauHas(cur) && !auto(c)[key]) return;          // valor digitado pelo médico: não mexe
    const nv = x==null ? '' : String(x); if((cur||'')===nv) return;
    const a=arr.slice(); a[c.i]=nv; c.s.__v[c.tpl]=a;
    if(x!=null) auto(c)[key]=1; else delete auto(c)[key];
    mud[c.it.k]=1;
  };
  lauObsFetos(m).forEach(fet=>{
  const D=lauObsDopDados(m, fet), A=D.alvo, v=k=>D.val(A[k]), ga=D.ga; D0=D0||D;
  // PFE (Hadlock CC/CA/CF) e percentil (Hadlock 1991)
  const pc=v('pc'), ca=v('ca'), cf=v('cf');
  put(A.pfe, pc&&ca&&cf ? Math.round(hadlockEFW(pc/10, ca/10, cf/10)) : null);
  const pfe=v('pfe');
  put(A.pfeP, pfe && ga!=null && ga>=14 && ga<=42 ? lauObsPctTxt(efwPercentile(pfe, ga).pct) : null);
  // Doppler: IP AU / ACM / DV (percentis das tabelas) e RCP
  const okD = ga!=null && ga>=20 && ga<=41;
  const au=v('au'), acm=v('acm'), dv=v('dv');
  put(A.auP, au && okD ? lauObsPctTxt(lauObsPctTab(FM_UA_PI, ga, au)) : null);
  put(A.acmP, acm && okD ? lauObsPctTxt(lauObsPctTab(FM_MCA_PI, ga, acm)) : null);
  put(A.dvP, dv && okD ? lauObsPctTxt(lauObsPctTab(FM_DV_PIV, ga, dv)) : null);
  put(A.rcp, au && acm ? lauObsNum(acm/au, 2) : null);
  const rcp=v('rcp');
  put(A.rcpP, rcp && okD ? lauObsPctTxt(lauObsPctRcp(ga, rcp)) : null);
  // VPS da ACM em MoM (Mari 2000)
  const vps=v('vps');
  put(A.vpsM, vps && ga!=null && ga>=18 && ga<=41 ? lauObsNum(vps/Math.exp(2.31+0.046*ga), 2) : null);
  if(fet) pesos.push(v('pfe'));
  });
  // gemelar: discordância de peso = (maior − menor) / maior
  if(D0 && D0.alvo.disc){ const D=D0, A=D.alvo; const ok=pesos.length>=2 && pesos.every(x=>x);
    put(A.disc, ok ? Math.round((Math.max(...pesos)-Math.min(...pesos))/Math.max(...pesos)*100) : null); }
  const C0=lauObsDopCampos(m);
  Object.keys(mud).forEach(k=>{
    lauPatch(k); lauUpdSum(k);
    const s=state.lau.v[k];
    // atualiza os campos abertos no painel sem redesenhar (não perde o foco)
    C0.filter(c=>c.it.k===k).forEach(c=>{ const el=document.getElementById(`ph-${k}-${c.tpl}-${c.i}`);
      if(el && el!==document.activeElement){ const x=((s.__v[c.tpl]||[])[c.i])||''; if(el.value!==x) el.value=x; } });
  });
  if(typeof lauPatchConc==='function') lauPatchConc();
}
/* ---- Carótidas: relação VPS ACI/ACC calculada; linhas de velocidade vazias não aparecem ---- */
function lauCarAtivo(m){ return !!(m && m.id==='us-arterias-carotidas'); }
function lauCarCalc(m){
  if(!lauCarAtivo(m)) return;
  const C=lauObsDopCampos(m).filter(c=>c.tpl==='n' && c.it.k==='velocidades'); if(!C.length) return;
  const it=C[0].it, s=state.lau.v[it.k], nrm=lauItemNormal(m,it), T=lauTpl(nrm);
  const val=c=>{ if(!c) return null; const r=lauVal(T, (s.__v||{}).n||[], c.i); return r.ok ? lauF(r.v) : null; };
  let mud=false;
  ['d','e'].forEach(L=>{   // ACCD/ACID e ACCE/ACIE
    const acc=val(C.find(c=>new RegExp('^acc'+L+' ').test(c.linha) && /\bvps =$/.test(c.antes)));
    const aci=val(C.find(c=>new RegExp('^aci'+L+' ').test(c.linha) && /\bvps =$/.test(c.antes)));
    const alvo=C.find(c=>new RegExp('^relacao vps aci'+L+'/acc'+L).test(c.linha)); if(!alvo) return;
    s.__carAuto=s.__carAuto||{}; const arr=(s.__v.n||[]), cur=arr[alvo.i];
    if(lauHas(cur) && !s.__carAuto[alvo.i]) return;          // valor digitado pelo médico
    const nv = acc && aci ? lauObsNum(aci/acc, 1) : '';
    if((cur||'')===nv) return;
    const a=arr.slice(); a[alvo.i]=nv; s.__v.n=a; if(nv) s.__carAuto[alvo.i]=1; else delete s.__carAuto[alvo.i]; mud=true;
    const el=document.getElementById(`ph-${it.k}-n-${alvo.i}`); if(el && el!==document.activeElement) el.value=nv;
  });
  if(mud){ lauPatch(it.k); lauUpdSum(it.k); }
  // estenose pelas velocidades: atualiza o texto das carótidas e a conclusão
  m.items.filter(x=>/^(arterias-carotidas-comuns|complexos-medio-intimais)/.test(x.k)).forEach(x=>lauPatch(x.k));
  if(typeof lauPatchConc==='function'){ lauPatchConc(); lauSaveEd(); }
}
/* grau de estenose da ACI pelas velocidades — mesma regra da calculadora da aba Referências
   (Doppler de Carótidas e Vertebrais, DIC/CBR/SABCV 2023). Sem VD ou com critérios discordantes: faixa pelo VPS. */
function lauCarGrau(psv, edv, ratio){
  if(psv==null) return null;
  if(edv!=null){
    if(psv>400 && (ratio==null || ratio>5)) return '> 90%';
    if(psv>230 && edv>140) return '80–89%';
    if(psv>230 && edv>100) return '70–79%';
    if(psv>=140 && psv<=230 && edv>=70 && edv<=100) return '60–69%';
    if(psv>=140 && psv<=230 && edv>=40 && edv<70) return '50–59%';
    if(psv<140 && edv<40) return null;
  }
  if(psv>400 && ratio!=null && ratio>5) return '> 90%';
  if(psv>230) return '≥ 70%';
  if(psv>=140) return '50–69%';
  return null;
}
function lauCarDe(g){ return /^[<>≥]/.test(g) ? g : 'de '+g; }   // "estenose de 50–59%", "estenose ≥ 70%"
function lauCarDados(m){
  if(!lauCarAtivo(m) || !state.lau || !state.lau.v.velocidades) return [];
  const C=lauObsDopCampos(m).filter(c=>c.tpl==='n' && c.it.k==='velocidades'); if(!C.length) return [];
  const it=C[0].it, s=state.lau.v[it.k], T=lauTpl(lauItemNormal(m,it));
  const val=c=>{ if(!c) return null; const r=lauVal(T, (s.__v||{}).n||[], c.i); return r.ok ? lauF(r.v) : null; };
  const out=[];
  [['d','direita','ACID'],['e','esquerda','ACIE']].forEach(([L,lado,ab])=>{
    const psv=val(C.find(c=>new RegExp('^aci'+L+' ').test(c.linha) && /\bvps =$/.test(c.antes)));
    const edv=val(C.find(c=>new RegExp('^aci'+L+' ').test(c.linha) && /\bvd =$/.test(c.antes)));
    const acc=val(C.find(c=>new RegExp('^acc'+L+' ').test(c.linha) && /\bvps =$/.test(c.antes)));
    const ratio = psv && acc ? psv/acc : null;
    const g=lauCarGrau(psv, edv, ratio);
    if(g) out.push({lado, ab, psv, g});
  });
  return out;
}
/* EMI (cm; preferência em mm: mm). Espessado acima de 0,1 cm. */
function lauCarEmi(m){
  if(!lauCarAtivo(m) || !state.lau || !state.lau.v.velocidades) return [];
  const C=lauObsDopCampos(m).filter(c=>c.tpl==='n' && c.it.k==='velocidades'); if(!C.length) return [];
  const it=C[0].it, s=state.lau.v[it.k], T=lauTpl(lauItemNormal(m,it)), mm=lauUnMM();
  const out=[];
  [['direita','d'],['esquerda','e']].forEach(([lado,L])=>{
    const c=C.find(c=>new RegExp('^emi a '+lado).test(c.linha)); if(!c) return;
    const r=lauVal(T, (s.__v||{}).n||[], c.i); if(!r.ok) return; const v=lauF(r.v); if(v==null) return;
    const cm = mm ? v/10 : v;
    out.push({lado, txt:lauN(r.v)+(mm?' mm':' cm'), esp: cm>0.1});
  });
  return out;
}
function lauCarConc(m){
  if(!lauAutoCfg().on) return [];
  const D=lauCarDados(m), out=[];
  // ateromatose marcada (linha opcional): o exame deixa de ser normal
  let ate=null;
  m.items.filter(x=>/^arterias-carotidas-comuns/.test(x.k)).forEach(x=>{ const sv=state.lau.v[x.k];
    (x.opts||[]).forEach((o,j)=>{ if(/^Ateromatose/.test(o) && (sv.__o||[])[j]){ const r=lauVal(lauTpl(o), sv.__v['o'+j]||[], 0); ate = r.ok ? ' '+r.v : ''; } }); });
  let est='';
  if(D.length===2) est = D[0].g===D[1].g ? `estenose ${lauCarDe(D[0].g)} das artérias carótidas internas`
                                         : `estenose ${lauCarDe(D[0].g)} da artéria carótida interna direita e ${lauCarDe(D[1].g)} da esquerda`;
  else if(D.length) est = `estenose ${lauCarDe(D[0].g)} da artéria carótida interna ${D[0].lado}`;
  if(ate!=null) out.push(`Ateromatose carotídea${ate}, ${est ? 'determinando '+est : 'sem estenoses hemodinamicamente significativas'}.`);
  else if(est) out.push(est.charAt(0).toUpperCase()+est.slice(1)+'.');
  const esp=lauCarEmi(m).filter(x=>x.esp);
  if(esp.length===2) out.push('Espessamento do complexo médio-intimal das artérias carótidas comuns.');
  else if(esp.length) out.push(`Espessamento do complexo médio-intimal da artéria carótida comum ${esp[0].lado}.`);
  return out;
}
/* item das carótidas: com estenose, o texto padrão deixa de dizer "velocidades preservadas" e "sem espessamentos" */
function lauCarItemTxt(m, it, txt){
  if(/^complexos-medio-intimais/.test(it.k)){
    // EMI medido: o item descreve a medida de cada lado (espessado acima de 0,1 cm)
    const E=lauCarEmi(m); if(!E.length) return txt;
    const p=E.map(x=>`${x.esp?'espessado':'de espessura normal'} à ${x.lado}, medindo ${x.txt}`).join('; ');
    return txt.replace(/menores do que 0,1 cm\.?/, p+'.');
  }
  if(!lauAutoCfg().on || !/^arterias-carotidas-comuns/.test(it.k)) return txt;
  const D=lauCarDados(m); if(!D.length) return txt;
  const lst = D.length===1
    ? `na ${D[0].ab} (VPS de ${lauN(D[0].psv)} cm/s), compatível com estenose ${lauCarDe(D[0].g)}`
    : `na ${D[0].ab} e na ${D[1].ab} (VPS de ${lauN(D[0].psv)} cm/s e ${lauN(D[1].psv)} cm/s, respectivamente), compatível com estenoses `
      + (D[0].g===D[1].g ? lauCarDe(D[0].g) : `${lauCarDe(D[0].g)} e ${lauCarDe(D[1].g)}, respectivamente`);
  // linha opcional de ateromatose: com estenose, deixa de dizer "sem determinar estenoses significativas"
  const det = D.length===1 ? `determinando estenose ${lauCarDe(D[0].g)} na ${D[0].ab}`
    : (D[0].g===D[1].g ? `determinando estenoses ${lauCarDe(D[0].g)} na ${D[0].ab} e na ${D[1].ab}`
                       : `determinando estenoses ${lauCarDe(D[0].g)} na ${D[0].ab} e ${lauCarDe(D[1].g)} na ${D[1].ab}`);
  txt = txt.replace(/sem determinar estenoses hemodinamicamente significativas/, det);
  return txt.replace(/,? sem dilatações, espessamentos ou calcificações parietais/, ', sem dilatações')
            .replace(/os padrões espectrais e as velocidades encontram-se preservados/, `observa-se aumento das velocidades ${lst}; demais padrões espectrais preservados`);
}
/* texto do bloco "Velocidades": tira campos e linhas vazias; nada preenchido → bloco some */
function lauCarTxt(m, it, txt){
  if(!lauCarAtivo(m) || it.k!=='velocidades') return txt;
  const PH='<mark class="lau-ph">XXX</mark>';
  const linhas = txt.split('<br>').map(l=>l
      .replace(new RegExp(';? ?VD = '+PH+' cm/s','g'), '')
      .replace(new RegExp('VPS = '+PH+' cm/s;? ?','g'), '')
      .replace(/: ;/,':'))
    .filter(l=>!/^EMI à /.test(l.replace(/<[^>]+>/g,'').trim()))
    .filter(l=>l.trim() && l.indexOf(PH)<0 && !/:\s*\.?\s*$/.test(l.replace(/<[^>]+>/g,'')));
  return linhas.length ? '<br>'+linhas.join('<br>') : '';
}

/* ---- Parede abdominal: distância inter-retos; acima de 2,0 cm = diástase ---- */
function lauRetos(m){
  if(!m || m.id!=='us-parede-abdominal' || !state.lau) return null;
  const it=m.items.find(i=>/^planos musculares/i.test(lauItemLabel(m,i)||'')); if(!it) return null;
  const s=state.lau.v[it.k]; const id=(s.__f||[]).find(x=>{ const f=lauFI(x); return f && f.retos; }); if(id==null) return null;
  const f=lauFI(id); const r=lauVal(lauTpl(f.t), (s.__v||{})['f'+id]||[], 0); if(!r.ok) return null;
  const v=lauF(r.v); if(v==null) return null;
  const cm = lauUnMM() ? v/10 : v;
  return {it, cm, txt: lauN(r.v)+(lauUnMM()?' mm':' cm'), dia: cm>2.0};
}
function lauRetosTxt(m, it, txt){
  const R=lauRetos(m); if(!R || R.it.k!==it.k || !R.dia) return txt;
  return txt.replace(/com arquitetura preservada; distância entre os músculos retos abdominais de [^.]+\./, `com diástase da musculatura reto-abdominal, com distância entre os músculos retos abdominais de ${R.txt}.`);
}

/* ---- tabelas da aba Referências: [[x, p50, p5, p95]] (fetal-ila, fetal-fce) ---- */
function lauObsRef(id){
  const r=(window.SEED||[]).find(x=>x.id===id); const t=r && r.tables && r.tables[r.tables.length-1]; if(!t) return null;
  const rows=t.rows.slice(1).map(x=>x.slice(0,4).map(y=>parseFloat(String(y).replace(',','.')))).filter(x=>x.every(y=>!isNaN(y)));
  return rows.length ? rows.sort((a,b)=>a[0]-b[0]) : null;
}
function lauObsRefAt(tab, x){   // {p50, p5, p95} interpolado; null fora da tabela
  if(!tab || x==null || x<tab[0][0] || x>tab[tab.length-1][0]) return null;
  for(let i=0;i<tab.length-1;i++){ const a=tab[i], b=tab[i+1]; if(x>=a[0] && x<=b[0]){ const f=b[0]===a[0]?0:(x-a[0])/(b[0]-a[0]); const g=k=>a[k]+f*(b[k]-a[k]); return {p50:g(1), p5:g(2), p95:g(3)}; } }
  return null;
}
/* ---- Líquido amniótico: MBV (< 2 cm reduzido, ≥ 8 cm aumentado) e ILA (P5/P95 de Moore & Cayle pela IG;
   sem IG: ≤ 5 cm / ≥ 25 cm). Gemelar com dois MBV: um por feto. ---- */
function lauObsLiq(m){
  const C=lauObsDopCampos(m).filter(c=>c.on && c.tpl==='n' && /^liquido amniotico/.test(c.lbl)); if(!C.length) return [];
  const it=C[0].it, nrm=lauItemNormal(m,it), vals=(state.lau.v[it.k].__v||{}).n||[], T=lauTpl(nrm);
  const ila=/\(ILA\)/.test(nrm), ga=lauObsGA(m), dois=C.length>1;
  const out=[];
  C.forEach(c=>{
    const r=lauVal(T, vals, c.i); if(!r.ok) return; let v=lauF(r.v); if(v==null) return;
    let est='nl', pct=null;
    if(ila){
      if(!lauUnMM()) v*=10;                       // ILA da máscara em cm (preferência em mm: já em mm)
      const ref = ga!=null ? lauObsRefAt(lauObsRef('fetal-ila'), Math.min(42, ga)) : null;
      if(ref){ if(v<ref.p5) est='red'; else if(v>ref.p95) est='aum'; pct=true; }
      else { if(v<=50) est='red'; else if(v>=250) est='aum'; }
    } else { if(v<20) est='red'; else if(v>=80) est='aum'; }
    out.push({fet: dois ? c.ord+1 : 0, tipo: ila?'ila':'mbv', v, est, pct});
  });
  return out;
}
function lauObsLiqFrase(x){
  const P = x.fet ? (t=>`Feto ${x.fet}: ${t.charAt(0).toLowerCase()+t.slice(1)}`) : (t=>t);
  const med = x.tipo==='ila' ? `ILA de ${lauUnMM() ? Math.round(x.v)+' mm' : lauObsNum(x.v/10,1)+' cm'}` : `maior bolsão vertical de ${Math.round(x.v)} mm`;
  if(x.est==='red') return P(x.pct ? `Líquido amniótico reduzido para a idade gestacional (${med}, abaixo do percentil 5).` : `Líquido amniótico reduzido – oligoâmnio (${med}).`);
  if(x.est==='aum') return P(x.pct ? `Líquido amniótico aumentado para a idade gestacional (${med}, acima do percentil 95).` : `Líquido amniótico aumentado – polidrâmnio (${med}).`);
  return null;
}
/* texto do item "Líquido amniótico": "em quantidade normal" acompanha a medida */
function lauObsLiqTxt(m, it, txt){
  if(!/^liquido-amniotico/.test(it.k)) return txt;
  const L=lauObsLiq(m); const alt=L.filter(x=>x.est!=='nl'); if(!alt.length) return txt;
  if(L.length>1 || /nas duas cavidades/.test(txt)) return txt.replace(/em quantidade (aparentemente )?normal nas duas cavidades, com /, 'com ');
  const q = alt[0].est==='red' ? 'reduzida' : 'aumentada';
  return txt.replace(/em quantidade (aparentemente )?normal/, 'em quantidade '+q);
}
/* ---- BCF: 2º/3º tri 110–160 bpm; 1º tri pela tabela de FCE por CCN (P5–P95), CCN > 40 mm: 110–180 bpm ---- */
function lauObsBcfConc(m){
  const out=[]; const C=lauObsDopCampos(m).filter(c=>c.on && /\bbcf$/.test(c.antes));
  const tri1=/1-trimestre/.test(m.id), ccn=tri1 ? lauObsCampo(m, /\bccn =?$/) : null;
  C.forEach(c=>{
    const r=lauVal(lauTpl(c.tpl==='n'?lauItemNormal(m,c.it):c.it.opts[+c.tpl.slice(1)]), (c.s.__v||{})[c.tpl]||[], c.i); if(!r.ok) return;
    const b=lauF(r.v); if(b==null) return;
    const pre = c.fet ? `Feto ${c.fet}: ` : '', P=t=>pre ? pre+t.charAt(0).toLowerCase()+t.slice(1) : t;
    if(tri1){
      const ref=ccn!=null ? lauObsRefAt(lauObsRef('fetal-fce'), ccn) : null;
      if(ref){ if(b<ref.p5) out.push(`Frequência cardíaca embrionária abaixo do percentil 5 para o comprimento cabeça-nádega (BCF de ${b} bpm).`);
               else if(b>ref.p95) out.push(`Frequência cardíaca embrionária acima do percentil 95 para o comprimento cabeça-nádega (BCF de ${b} bpm).`); }
      else if(ccn!=null){ if(b<110) out.push(`Bradicardia embrionária (BCF de ${b} bpm).`); else if(b>180) out.push(`Taquicardia embrionária (BCF de ${b} bpm).`); }
    } else {
      if(b<110) out.push(P(`Bradicardia fetal (BCF de ${b} bpm).`));
      else if(b>160) out.push(P(`Taquicardia fetal (BCF de ${b} bpm).`));
    }
  });
  return out;
}

/* frases da conclusão: peso (AIG / PIG / GIG) e Doppler (normal ou alterado), por feto no gemelar.
   O pico de velocidade sistólica da ACM não entra na conclusão. */
function lauObsDopConc(m){
  const out=[];
  if(!lauObsDopAtivo(m)) return {out};
  const fetos=lauObsFetos(m), pesos=[], dops=[];
  const dopNormal=(lauConcNormalLines(m).find(c=>/^Estudo Doppler/.test(c.text))||{}).text || null;   // só nos modelos com Doppler
  lauObsLiq(m).forEach(x=>{ const t=lauObsLiqFrase(x); if(t) out.push(t); });
  const pctFrase=p=> p<1 ? 'abaixo do percentil 1' : p>99 ? 'acima do percentil 99' : 'no percentil '+Math.round(p);
  fetos.forEach(fet=>{
    const pre = fet ? `Feto ${fet}: ` : '', P=t=>pre ? pre+t.charAt(0).toLowerCase()+t.slice(1) : t;
    const D=lauObsDopDados(m, fet), v=k=>D.val(D.alvo[k]), ga=D.ga;
    const pfe=v('pfe'); if(fet) pesos.push(pfe);
    if(pfe && ga!=null && ga>=14 && ga<=42){ const p=efwPercentile(pfe, ga).pct;
      const cls = p<10 ? 'pequeno para a idade gestacional (PIG)' : p>90 ? 'grande para a idade gestacional (GIG)' : 'adequado para a idade gestacional (AIG)';
      out.push(P(`Peso fetal estimado ${pctFrase(p)}, ${cls}.`)); }
    const alt=[];
    if(ga!=null && ga>=20 && ga<=41){
      const au=v('au'), acm=v('acm'), dv=v('dv'), rcp=v('rcp');
      if(au && au>fmInterp(FM_UA_PI,ga,3)) alt.push('índice de pulsatilidade da artéria umbilical acima do percentil 95');
      if(acm && acm<fmInterp(FM_MCA_PI,ga,1)) alt.push('índice de pulsatilidade da artéria cerebral média abaixo do percentil 5');
      if(rcp && lauObsPctRcp(ga, rcp)<5) alt.push('relação cérebro-placentária abaixo do percentil 5');
      if(dv && dv>fmInterp(FM_DV_PIV,ga,3)) alt.push('índice de pulsatilidade do ducto venoso acima do percentil 95');
    }
    dops.push({P, alt});
  });
  if(dopNormal){
    if(dops.every(d=>!d.alt.length)) out.push(dopNormal);
    else dops.forEach(d=>out.push(d.alt.length
      ? d.P(`Estudo Doppler da circulação fetoplacentária alterado: ${lauJuntaE(d.alt)} para a idade gestacional.`)
      : d.P('Estudo Doppler da circulação fetoplacentária dentro dos limites da normalidade.')));
  }
  // gemelar: discordância de peso estimado ≥ 25%
  if(pesos.length>=2 && pesos.every(x=>x)){ const d=(Math.max(...pesos)-Math.min(...pesos))/Math.max(...pesos)*100;
    if(d>=25) out.push(`Discordância de peso estimado entre os fetos de ${Math.round(d)}%.`); }
  return {out};
}

/* ---- Obstetrícia: IG pelo CCN (Hadlock) ou pelo DMSG (Hellman), tabelas da aba Referências ---- */
function lauObsTab(id){
  const r=(window.SEED||[]).find(x=>x.id===id); if(!r || !r.tables || !r.tables[0]) return null;
  return r.tables[0].rows.slice(1).map(x=>[parseFloat(String(x[0]).replace(',','.')), (+x[1])*7+(+x[2])]).filter(x=>!isNaN(x[0])).sort((a,b)=>a[0]-b[0]);
}
function lauObsLookup(tab, v){
  if(!tab || v==null || v<tab[0][0] || v>tab[tab.length-1][0]) return null;
  for(let i=0;i<tab.length-1;i++){ const [x0,d0]=tab[i], [x1,d1]=tab[i+1];
    if(v>=x0 && v<=x1){ const d = x1===x0 ? d0 : d0+(d1-d0)*(v-x0)/(x1-x0); return Math.round(d); } }
  return tab[tab.length-1][0]===v ? tab[tab.length-1][1] : null;
}
/* procura o campo do laudo pelo texto que vem antes dele ("CCN =", "DMSG =") */
function lauObsCampo(m, re){
  for(const it of m.items){
    if(!it.generic) continue; const s=state.lau.v[it.k]; const nrm=lauItemNormal(m,it);
    const x=lauAutoCampos(nrm).campos.find(c=>re.test(c.antes)); if(!x) continue;
    const r=lauVal(lauTpl(nrm), (s.__v||{}).n||[], x.i); if(r.ok) return lauF(r.v);
  }
  return null;
}
/* IG do quadro de idade gestacional (laudos-ig.js): {sem, dias, fonte} */
const LAU_IG_FONTE = {dum:'segundo a data da última menstruação (DUM)', exame:'segundo exame ultrassonográfico prévio', manual:'segundo a idade gestacional informada'};
function lauObsIGBox(){
  if(typeof lauIgCalc!=='function' || !state.lau || !state.lau.ig) return null;
  const r=lauIgCalc(); if(!r || r.erro || r.dias==null) return null;
  return {sem:Math.floor(r.dias/7), dias:r.dias%7, fonte:LAU_IG_FONTE[state.lau.ig.modo]||''};
}
function lauObsIG(m){
  if(!m || !/obstetric/.test(m.id)) return null;
  const mmF = v=> v;   // CCN e DMSG das máscaras já são em mm
  const ccn=lauObsCampo(m, /\bccn =?$/);
  let d = ccn!=null ? lauObsLookup(lauObsTab('fetal-ccn'), mmF(ccn)) : null, fonte='ccn';
  // DMSG só quando não há CCN (CCN > 84 mm: datar pelo DBP)
  if(d==null && ccn==null){ const sg=lauObsCampo(m, /\bdmsg =?$/); if(sg!=null){ d=lauObsLookup(lauObsTab('fetal-sg'), mmF(sg)); fonte='dmsg'; } }
  return d==null ? null : {sem:Math.floor(d/7), dias:d%7, fonte};
}
