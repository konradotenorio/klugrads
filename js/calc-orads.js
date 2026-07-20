/* =========================================================================
   RadRef — O-RADS US v2022 (ACR Ovarian-Adnexal Reporting and Data System)
   ---------------------------------------------------------------------------
   Fonte: O-RADS US v2022 Assessment Categories (ACR, nov/2022) e
   Andreotti RF et al. O-RADS US Risk Stratification and Management System.
   Radiology. 2020;294(1):168–185.
   Segue o layout do TI-RADS (cartão por lesão + trilha de lesões).
   ATENÇÃO: ferramenta educacional — validar antes do uso clínico.
   ========================================================================= */

const ORADS_C = {
  0:{c:'#8b98a5',bg:'#8b98a522',name:'Avaliação incompleta',    risk:'—'},
  1:{c:'#1f9d55',bg:'#1f9d5522',name:'Ovário normal',            risk:'—'},
  2:{c:'#3d9970',bg:'#3d997022',name:'Quase certamente benigno', risk:'<1%'},
  3:{c:'#d9a520',bg:'#d9a52022',name:'Risco baixo',              risk:'1 – <10%'},
  4:{c:'#e07a1f',bg:'#e07a1f22',name:'Risco intermediário',      risk:'10 – <50%'},
  5:{c:'#cf2020',bg:'#cf202022',name:'Risco alto',               risk:'≥50%'},
};

const ORADS_REFS = [
  'ACR. O-RADS™ US v2022 — Assessment Categories. American College of Radiology, novembro de 2022.',
  'Andreotti RF, Timmerman D, Strachowski LM, et al. O-RADS US Risk Stratification and Management System: A Consensus Guideline from the ACR Ovarian-Adnexal Reporting and Data System Committee. Radiology. 2020;294(1):168–185.',
];

/* ---- opções do léxico ---- */
const ORADS_MENO = [
  ['pre','Pré-menopausa'],
  ['post_early','Pós-menopausa inicial (<5 anos)'],
  ['post_late','Pós-menopausa tardia (≥5 anos)'],
];
const ORADS_TIPO = [
  ['normal',   'Ovário normal / cisto fisiológico'],
  ['uni',      'Cisto unilocular'],
  ['bi',       'Cisto bilocular (2 lóculos)'],
  ['multi',    'Cisto multilocular (≥3 lóculos)'],
  ['solido',   'Lesão sólida (≥80% sólida)'],
  ['classico', 'Lesão benigna clássica'],
  ['incompleto','Avaliação incompleta (técnica)'],
];
const ORADS_CONTORNO = [['smooth','Liso'],['irregular','Irregular']];
const ORADS_CS = [
  [1,'1 — ausente'],[2,'2 — mínimo'],[3,'3 — moderado'],[4,'4 — intenso'],
];
const ORADS_SOLIDO_COMP = [
  ['none','Ausente'],
  ['pp_lt4','Projeções papilares (<4)'],
  ['pp_ge4','Projeções papilares (≥4)'],
  ['outro','Componente sólido (não-PP)'],
];
const ORADS_CLASSICAS = [
  ['hemorragico','Cisto hemorrágico típico'],
  ['dermoide','Cisto dermoide típico'],
  ['endometrioma','Endometrioma típico'],
  ['paraovariano','Cisto paraovariano típico'],
  ['inclusao','Cisto de inclusão peritoneal típico'],
  ['hidrossalpinge','Hidrossalpinge típica'],
];

function oradsNewLesion(){
  return {name:'', tipo:null, simples:null, contorno:null, cs:null,
          solido:'none', shadow:null, size:'', classica:null, ascite:false};
}
function oradsState(){
  if(!state.orads) state.orads={lesions:[oradsNewLesion()], meno:'pre'};
  return state.orads;
}
function oradsNum(v){ const n=parseFloat(String(v).replace(',','.')); return isNaN(n)?null:n; }

/* ---- classificação (O-RADS US v2022) ---- */
function oradsEval(L){
  const s = oradsNum(L.size);
  const cs = L.cs;
  const irr = L.contorno==='irregular';
  const smooth = L.contorno==='smooth';

  if(L.ascite) return {cat:5, why:'Ascite e/ou nódulos peritoneais', complete:true};
  if(L.tipo==='incompleto') return {cat:0, why:'Características não avaliáveis por fatores técnicos', complete:true};
  if(L.tipo==='normal')     return {cat:1, why:'Ovário normal ou cisto fisiológico (folículo ≤3 cm / corpo lúteo)', complete:true};
  if(L.tipo==='classico'){
    if(!L.classica) return {cat:null, complete:false};
    if(s!=null && s>=10) return {cat:3, why:'Lesão benigna clássica ≥10 cm', complete:true};
    return {cat:2, why:'Lesão benigna clássica típica', complete:true, classica:L.classica};
  }

  /* --- lesão sólida --- */
  if(L.tipo==='solido'){
    if(!L.contorno || !cs || L.shadow==null) return {cat:null, complete:false};
    if(irr) return {cat:5, why:'Lesão sólida de contorno irregular', complete:true};
    if(cs===4) return {cat:5, why:'Lesão sólida lisa com CS 4', complete:true};
    if(cs===1) return {cat:3, why:'Lesão sólida lisa com CS 1', complete:true};
    return L.shadow
      ? {cat:3, why:`Lesão sólida lisa, com sombra acústica, CS ${cs}`, complete:true}
      : {cat:4, why:`Lesão sólida lisa, sem sombra acústica, CS ${cs}`, complete:true};
  }

  /* --- cistos --- */
  const temSolido = L.solido && L.solido!=='none';
  if(!L.tipo || !L.contorno || (s==null) || (temSolido && !cs)) return {cat:null, complete:false};

  if(L.tipo==='uni'){
    if(L.solido==='pp_ge4') return {cat:5, why:'Cisto unilocular com ≥4 projeções papilares', complete:true};
    if(temSolido) return {cat:4, why:'Cisto unilocular com componente sólido (<4 PP ou não-PP)', complete:true};
    if(irr) return {cat:3, why:'Cisto unilocular de parede irregular', complete:true};
    if(s>=10) return {cat:3, why:'Cisto unilocular liso ≥10 cm', complete:true};
    if(L.simples==null) return {cat:null, complete:false};
    return {cat:2, complete:true,
      why: L.simples ? `Cisto simples ${s} cm` : `Cisto unilocular liso não-simples ${s} cm`};
  }

  if(L.tipo==='bi'){
    if(temSolido){
      if(!cs) return {cat:null, complete:false};
      return cs>=3
        ? {cat:5, why:`Cisto bilocular com componente sólido, CS ${cs}`, complete:true}
        : {cat:4, why:`Cisto bilocular com componente sólido, CS ${cs}`, complete:true};
    }
    if(irr) return {cat:4, why:'Cisto bilocular de contorno irregular', complete:true};
    if(s>=10) return {cat:3, why:'Cisto bilocular liso ≥10 cm', complete:true};
    return {cat:2, why:`Cisto bilocular liso ${s} cm, sem componente sólido`, complete:true};
  }

  if(L.tipo==='multi'){
    if(temSolido){
      if(!cs) return {cat:null, complete:false};
      return cs>=3
        ? {cat:5, why:`Cisto multilocular com componente sólido, CS ${cs}`, complete:true}
        : {cat:4, why:`Cisto multilocular com componente sólido, CS ${cs}`, complete:true};
    }
    if(!cs) return {cat:null, complete:false};
    if(irr) return {cat:4, why:'Cisto multilocular de contorno irregular', complete:true};
    if(cs===4) return {cat:4, why:'Cisto multilocular liso com CS 4', complete:true};
    if(s>=10) return {cat:4, why:'Cisto multilocular liso ≥10 cm', complete:true};
    return {cat:3, why:`Cisto multilocular liso ${s} cm, CS ${cs}`, complete:true};
  }
  return {cat:null, complete:false};
}

/* ---- conduta ---- */
function oradsMgmt(L, ev, meno){
  const post = meno!=='pre';
  const s = oradsNum(L.size);
  if(ev.cat===0) return {a:'Repetir US ou complementar com RM', b:'Avaliação incompleta por fatores técnicos'};
  if(ev.cat===1) return {a:'Nenhuma conduta', b:'Achado fisiológico'};

  if(ev.cat===2){
    if(L.tipo==='classico') return oradsClassicaMgmt(L.classica, meno, s);
    if(L.tipo==='uni' && L.simples){
      if(s<=3)  return {a:'Nenhuma conduta', b:post?'Cisto simples ≤3 cm':'Equivalente a folículo'};
      if(s<=5)  return post?{a:'US de controle em 12 meses',b:'Cisto simples >3–5 cm'}:{a:'Nenhuma conduta',b:'Cisto simples >3–5 cm'};
      return {a:'US de controle em 12 meses', b:'Cisto simples >5 e <10 cm'};
    }
    // unilocular liso não-simples ou bilocular liso
    if(s<=3) return post?{a:'US de controle em 12 meses',b:'≤3 cm'}:{a:'Nenhuma conduta',b:'≤3 cm'};
    return {a:'US de controle em 6 meses', b:'>3 e <10 cm'};
  }
  if(ev.cat===3) return {
    a:'US de controle em até 6 meses (se não ressecada)',
    b:'Se sólida: considerar US especializado ou RM (com escore O-RADS RM) · Clínico: ginecologista'};
  if(ev.cat===4) return {
    a:'US especializado, RM (escore O-RADS RM) ou protocolo do gineco-oncologista',
    b:'Clínico: ginecologista com consulta ao gineco-oncologista, ou diretamente gineco-oncologista'};
  if(ev.cat===5) return {
    a:'Conduta conforme protocolo do gineco-oncologista',
    b:'Clínico: gineco-oncologista'};
  return {a:'—', b:''};
}
function oradsClassicaMgmt(tipo, meno, s){
  const pre = meno==='pre', early = meno==='post_early', late = meno==='post_late';
  if(tipo==='hemorragico'){
    if(pre) return s!=null&&s<=5
      ? {a:'Nenhuma conduta', b:'Cisto hemorrágico típico ≤5 cm (pré-menopausa)'}
      : {a:'US de controle em 2–3 meses', b:'Cisto hemorrágico >5 e <10 cm (pré-menopausa)'};
    if(early) return {a:'US em 2–3 meses, US especializado ou RM', b:'Confirmar o diagnóstico (pós-menopausa inicial)'};
    return {a:'Não deveria ocorrer — recategorizar', b:'Usar os demais descritores do léxico (pós-menopausa tardia)'};
  }
  if(tipo==='dermoide'){
    return (s!=null && s<=3)
      ? {a:'Pode considerar US de controle em 12 meses', b:'Dermoide típico ≤3 cm'}
      : {a:'US de controle em 12 meses (se não ressecado)', b:'Dermoide típico >3 e <10 cm'};
  }
  if(tipo==='endometrioma'){
    if(pre) return {a:'US de controle em 12 meses (se não ressecado)', b:'Endometrioma típico <10 cm'};
    return {a:'US em 2–3 meses, US especializado ou RM; depois US anual', b:'Endometrioma na pós-menopausa — risco aumentado de malignização'};
  }
  if(tipo==='paraovariano')   return {a:'Nenhuma conduta', b:'Cisto paraovariano típico · Clínico: ginecologista se necessário'};
  if(tipo==='inclusao')       return {a:'Nenhuma conduta', b:'Cisto de inclusão peritoneal típico · Clínico: ginecologista se necessário'};
  if(tipo==='hidrossalpinge') return {a:'Nenhuma conduta', b:'Hidrossalpinge típica · Clínico: ginecologista se necessário'};
  return {a:'Ver tabela de lesões benignas clássicas', b:''};
}

/* ---- UI ---- */
function calcOradsHTML(){
  const os = oradsState(); const ls = os.lesions;
  let rail = `<div class="ti-rail">`;
  ls.forEach((L,i)=>{ const ev=oradsEval(L); const c=ORADS_C[ev.cat];
    rail += `<div class="ti-rchip" onclick="oradsScrollTo(${i})">`
      + `<span class="rn">${esc(L.name||('L'+(i+1)))}</span>`
      + (ev.complete&&c ? `<span class="rt" style="background:${c.c}">O${ev.cat}</span>` : `<span class="rt off">—</span>`)
      + `</div>`;
  });
  rail += `<div class="ti-rchip radd" onclick="oradsAdd()" aria-label="Adicionar lesão">＋</div></div>`;

  const menoChips = ORADS_MENO.map(([id,nome])=>
    `<div class="ti-ftog ${os.meno===id?'on':''}" onclick="oradsSetMeno('${id}')">${esc(nome)}</div>`
  ).join('');

  const legend = [1,2,3,4,5].map(k=>{
    const c=ORADS_C[k];
    return `<div class="ti-legend-row"><span class="lk" style="background:${c.c}">O${k}</span><span class="lt">${esc(c.name)} — risco ${esc(c.risk)}</span></div>`;
  }).join('');

  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Estado menopausal</div>
      <div class="ti-foci" style="margin-top:8px">${menoChips}</div>
      <div class="ti-legend-row" style="margin-top:10px"><span class="lt">Pós-menopausa = ≥1 ano de amenorreia. Se incerto ou útero ausente, usar idade &gt;50 anos.</span></div>
    </div>
    ${rail}
    <div id="orads-list">${ls.map((L,i)=>oradsCardHTML(L,i)).join('')}</div>
    <button class="ti-add" onclick="oradsAdd()">＋ Adicionar lesão</button>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Categorias e risco de malignidade</div>
      <div class="ti-legend">${legend}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${ORADS_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc">Ferramenta <b>educacional</b> baseada no ACR O-RADS US v2022.
      Sólido = ≥80% sólido; componente sólido = projeção ≥3 mm para a luz; PP = projeção papilar.
      Contorno irregular da parede interna = &lt;3 mm de altura. Não substitui o julgamento clínico.</div>
  </div>`;
}

function oradsSel(i, campo, opts, label, cur, extra){
  const os = oradsState();
  const openDD = os.open===(i+':'+campo);
  const opt = opts.find(o=>String(o[0])===String(cur));
  const valTxt = opt ? opt[1] : 'Selecionar…';
  let menu='';
  if(openDD){
    let rows = `<div class="ti-dd-opt clear" onclick="oradsPick(${i},'${campo}','')">Selecionar…</div>`;
    opts.forEach(o=>{ rows += `<div class="ti-dd-opt ${String(cur)===String(o[0])?'on':''}" onclick="oradsPick(${i},'${campo}','${o[0]}')"><span class="ol">${esc(o[1])}</span></div>`; });
    menu = `<div class="ti-dd-menu">${rows}</div>`;
  }
  return `<div class="ti-field ti-field-dd">
    <label>${esc(label)}</label>
    <div class="ti-dd">
      <div class="ti-dd-trigger ${openDD?'open':''} ${cur==null||cur===''?'empty':''}" onclick="oradsToggleDD(${i},'${campo}')"><span class="ddv">${esc(valTxt)}</span><span class="ddc">⌄</span></div>
      ${menu}
    </div>
  </div>`;
}

function oradsCardHTML(L,i){
  const os=oradsState(); const ev=oradsEval(L); const c=ORADS_C[ev.cat];
  const show=ev.complete && c;
  let fields = oradsSel(i,'tipo',ORADS_TIPO,'Tipo de lesão',L.tipo);

  if(L.tipo==='classico'){
    fields += oradsSel(i,'classica',ORADS_CLASSICAS,'Lesão clássica',L.classica);
  }
  if(L.tipo==='uni'||L.tipo==='bi'||L.tipo==='multi'){
    fields += oradsSel(i,'contorno',ORADS_CONTORNO,'Parede / septos',L.contorno);
    fields += oradsSel(i,'solido',ORADS_SOLIDO_COMP,'Componente sólido',L.solido);
    if(L.tipo==='uni' && L.solido==='none' && L.contorno==='smooth'){
      fields += oradsSel(i,'simples',[['1','Cisto simples (anecoico, parede fina)'],['0','Não-simples (ecos internos / septo incompleto)']],'Conteúdo', L.simples==null?null:(L.simples?'1':'0'));
    }
    if(L.tipo==='multi' || (L.solido&&L.solido!=='none')){
      fields += oradsSel(i,'cs',ORADS_CS,'Color score',L.cs);
    }
  }
  if(L.tipo==='solido'){
    fields += oradsSel(i,'contorno',ORADS_CONTORNO,'Contorno externo',L.contorno);
    fields += oradsSel(i,'shadow',[['1','Com sombra acústica'],['0','Sem sombra acústica']],'Sombra', L.shadow==null?null:(L.shadow?'1':'0'));
    fields += oradsSel(i,'cs',ORADS_CS,'Color score',L.cs);
  }
  const precisaTamanho = L.tipo && L.tipo!=='normal' && L.tipo!=='incompleto';
  const sizeField = precisaTamanho ? `<div class="ti-field">
    <label>Maior eixo</label>
    <div class="ti-szwrap"><div class="ti-szf"><input type="text" inputmode="decimal" placeholder="0.0" value="${esc(L.size)}" oninput="oradsSetSize(${i},this.value)"><span>cm</span></div></div>
  </div>` : '';

  const asciteField = `<div class="ti-field ti-field-foci">
    <label>Achados<br>associados</label>
    <div class="ti-foci"><div class="ti-ftog ${L.ascite?'on':''}" onclick="oradsToggleAscite(${i})">Ascite e/ou nódulos peritoneais</div></div>
  </div>`;

  let result='';
  if(show){
    const m = oradsMgmt(L, ev, os.meno);
    result = `<div class="ti-res" style="background:${c.bg};align-items:flex-start">
      <div class="lv" style="color:${c.c}">O${ev.cat}</div>
      <div class="meta"><div class="a">${esc(m.a)}</div><div class="b">${esc(m.b)}</div>
        ${ev.why?`<div class="b" style="margin-top:4px;opacity:.85">${esc(ev.why)}</div>`:''}</div>
      <div class="pts" style="background:${c.c}">${esc(c.risk)}</div>
    </div>`;
  }
  return `<div class="ti-card2" id="orads-card-${i}">
    <div class="ti-stripe" style="background:${show?c.c:'var(--line)'}"></div>
    <div class="ti-chead">
      <div class="ti-dot">${i+1}</div>
      <input class="ti-nname" value="${esc(L.name||('Lesão '+(i+1)))}" oninput="oradsSetName(${i},this.value)">
      ${os.lesions.length>1?`<div class="ti-del" onclick="oradsDel(${i})">${svgIcon(P.trash,17,{sw:1.8})}</div>`:''}
    </div>
    <div class="ti-fields">${fields}${sizeField}${asciteField}</div>
    ${result}
  </div>`;
}

/* ---- ações ---- */
function oradsSetMeno(id){ oradsState().meno=id; render(true); }
function oradsAdd(){ oradsState().lesions.push(oradsNewLesion()); render(true); }
function oradsDel(i){ const os=oradsState(); os.lesions.splice(i,1); if(!os.lesions.length) os.lesions=[oradsNewLesion()]; render(true); }
function oradsSetName(i,v){ oradsState().lesions[i].name=v; }
function oradsSetSize(i,v){ oradsState().lesions[i].size=v; render(true); }
function oradsToggleAscite(i){ const L=oradsState().lesions[i]; L.ascite=!L.ascite; render(true); }
function oradsToggleDD(i,campo){ const os=oradsState(); const k=i+':'+campo; os.open = os.open===k?null:k; render(true); }
function oradsPick(i,campo,val){
  const os=oradsState(); const L=os.lesions[i];
  if(val===''){ L[campo]=null; }
  else if(campo==='cs'){ L.cs=parseInt(val,10); }
  else if(campo==='simples'||campo==='shadow'){ L[campo]=(val==='1'); }
  else {
    L[campo]=val;
    if(campo==='tipo'){ // troca de tipo limpa os campos dependentes
      L.contorno=null; L.cs=null; L.solido='none'; L.simples=null; L.shadow=null; L.classica=null;
    }
    if(campo==='solido' && val==='none'){ L.cs=null; }
  }
  os.open=null; render(true);
}
function oradsScrollTo(i){
  const el=document.getElementById('orads-card-'+i);
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}

/* registra no catálogo (CALCS de app.js) */
CALCS.push({id:'orads', spec:'abdome', badge:'OR',
  title:'O-RADS US — Anexos',
  desc:'Estratificação de risco de lesões ovarianas/anexiais (ACR v2022)'});
