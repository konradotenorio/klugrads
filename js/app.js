/* =========================================================================
   RadRef — app de referência em ultrassonografia (PT-BR).
   Conteúdo reconstruído a partir do app MedUltra (propriedade do usuário).
   FERRAMENTA EDUCACIONAL — não substitui o julgamento clínico.

   Telas (state.view): home | refs | detail | calc | favoritos | novalista.
   Tema claro/escuro (CSS custom properties via [data-theme]).
   Persistência (localStorage): radref_theme, radref_favs, radref_favcalcs,
   radref_lists. (A chave `ultraref_data` é o cache dos dados — não é tocada
   por esta UI.)

   Modelo de item (inalterado, vem do seed completo / Supabase):
   {id,group,region,name,abbr,iconKey,tables[],footnotes[],
    chart{header,rows},exam{prep,position,points,technique},refs[]}.
   ========================================================================= */

/* ---- Ícones de órgão (chip da lista; via iconKey do item) ---- */
const ICONS = {
  organ:'<svg viewBox="0 0 24 24"><path d="M6 9c-2 2-2 7 2 9 3 1 5-1 6-3 1 2 4 3 6 0 2-3 0-9-4-9-2 0-3 1-4 2-1-2-3-3-6-1z"/></svg>',
  drop:'<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
  baby:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 21c0-4 3-6 6-6s6 2 6 6"/></svg>',
  ruler:'<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/></svg>',
};

/* ---- Ícones de UI (traço; stroke=currentColor) ---- */
const P = {
  back:'<polyline points="15 6 9 12 15 18"/>',
  chev:'<polyline points="9 6 15 12 9 18"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  sun:'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.5 12h2M19.5 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z"/>',
  star:'<path d="M12 3.4l2.6 5.27 5.82.85-4.21 4.1 1 5.8L12 17.7l-5.21 2.72 1-5.8-4.21-4.1 5.82-.85L12 3.4z"/>',
  book:'<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19a1 1 0 0 1 1 1v12"/><path d="M7.5 16H20v3a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 18.5v-13"/><path d="M9 7.5h7M9 10.5h5"/>',
  calc:'<rect x="5" y="3" width="14" height="18" rx="3"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11.5" x2="9.3" y2="11.5"/><line x1="12" y1="11.5" x2="12.3" y2="11.5"/><line x1="15" y1="11.5" x2="15.3" y2="11.5"/><line x1="9" y1="15" x2="9.3" y2="15"/><line x1="12" y1="15" x2="12.3" y2="15"/><line x1="15" y1="14.5" x2="15" y2="17.5"/><line x1="9" y1="17.5" x2="12.5" y2="17.5"/>',
  calcTab:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M8 15h2M14 11h2M14 15h2"/>',
  listplus:'<line x1="4" y1="7" x2="14" y2="7"/><line x1="4" y1="12" x2="11" y2="12"/><line x1="4" y1="17" x2="11" y2="17"/><line x1="17.5" y1="13.5" x2="17.5" y2="20.5"/><line x1="14" y1="17" x2="21" y2="17"/>',
  trash:'<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"/>',
  minus:'<line x1="6" y1="12" x2="18" y2="12"/>',
  table:'<rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  exam:'<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/>',
  tech:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
};
function svgIcon(inner, size, o){
  o = o || {};
  const fill = o.fill || 'none';
  const stroke = o.noStroke ? 'none' : 'currentColor';
  const sw = o.sw || 1.7;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" `
    + `stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

const ESC_MAP = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>ESC_MAP[c]); }
function nl2br(s){ return esc(s).replace(/\r?\n/g,'<br>'); }
const $ = id=>document.getElementById(id);

/* ---- Calculadoras (estrutura; cálculo real é passo futuro) ---- */
const CALCS = [
  {k:'tirads', tag:'TR', n:'ACR TI-RADS', d:'Estratificação de nódulos tireoidianos', org:'Tireoide',
    steps:['Pontue composição, ecogenicidade, forma, margens e focos ecogênicos','Some os pontos para obter o nível TR1–TR5','Receba a conduta: seguimento ou PAAF conforme tamanho']},
  {k:'birads', tag:'BR', n:'BI-RADS', d:'Categorização de achados mamários', org:'Mama',
    steps:['Selecione os descritores do achado','Defina a categoria 0–6','Veja a recomendação de conduta correspondente']},
  {k:'orads', tag:'OR', n:'O-RADS US', d:'Risco de malignidade de lesão ovariana', org:'Ovário',
    steps:['Classifique a lesão (cística, sólida, mista)','Some os descritores morfológicos','Obtenha a categoria O-RADS 1–5']},
  {k:'pirads', tag:'PR', n:'PI-RADS v2.1', d:'Lesões prostáticas na RM', org:'Próstata',
    steps:['Avalie T2 e difusão por zona','Defina o escore dominante','Calcule a categoria final 1–5']},
  {k:'fleischner', tag:'FL', n:'Fleischner 2017', d:'Seguimento de nódulo pulmonar incidental', org:'Pulmão',
    steps:['Informe tamanho e tipo do nódulo','Indique risco do paciente','Receba o intervalo de seguimento por TC']},
  {k:'bosniak', tag:'BK', n:'Bosniak 2019', d:'Classificação de cistos renais complexos', org:'Rim',
    steps:['Descreva septos, paredes e realce','Defina a categoria I–IV','Veja o risco de malignidade e a conduta']},
];

/* ---- DADOS (seed offline; sync opcional com Supabase) ---- */
function hydrate(items){
  return (items||[]).map(src=>{
    let d; try{ d=JSON.parse(JSON.stringify(src)); }catch(_){ d=Object.assign({},src); }
    d.icon = ICONS[d.iconKey] || ICONS.organ;
    return d;
  });
}
function initialData(){
  try{ const c=localStorage.getItem('ultraref_data'); if(c){ const a=JSON.parse(c); if(Array.isArray(a)&&a.length) return a; } }catch(_){}
  return window.SEED_DATA || [];
}
let DATA = hydrate(initialData());

async function loadFromSupabase(){
  const cfg = window.CONFIG || {};
  if(cfg.USE_SUPABASE === false) return null;
  if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
  const url = `${cfg.SUPABASE_URL}/rest/v1/${cfg.TABLE||'referencias'}?select=conteudo&order=sort_order.asc`;
  try{
    const res = await fetch(url, { headers:{ apikey:cfg.SUPABASE_ANON_KEY, Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}` }});
    if(!res.ok) return null;
    const rows = await res.json();
    const items = (Array.isArray(rows)?rows:[]).map(r=>r&&r.conteudo).filter(Boolean);
    return items.length ? items : null;
  }catch(_){ return null; }
}
async function syncData(){
  const remote = await loadFromSupabase();
  if(!remote) return;
  DATA = hydrate(remote);
  try{ localStorage.setItem('ultraref_data', JSON.stringify(remote)); }catch(_){}
  render(true);
}

/* ---- ESTADO ---- */
let state = {
  view:'home', theme:'dark', band:'Pediátrico', query:'',
  item:null, sub:'tabela',
  favs:[], favCalcs:[], lists:[],
  newName:'', composingId:null, calcStub:null,
};

function persist(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} }
function loadState(){
  try{ const t=localStorage.getItem('radref_theme'); if(t==='dark'||t==='light') state.theme=t; }catch(_){}
  try{ const f=JSON.parse(localStorage.getItem('radref_favs')||'[]'); if(Array.isArray(f)) state.favs=f; }catch(_){}
  try{ const c=JSON.parse(localStorage.getItem('radref_favcalcs')||'[]'); if(Array.isArray(c)) state.favCalcs=c; }catch(_){}
  try{ const l=JSON.parse(localStorage.getItem('radref_lists')||'[]'); if(Array.isArray(l)) state.lists=l; }catch(_){}
}

/* ---- HELPERS de dados ---- */
const BAND_GROUP = {'Obstétrico':'Fetal','Pediátrico':'Pediatria','Adulto':'Adultos'};
const GROUP_BAND = {'Fetal':'Obstétrico','Pediatria':'Pediátrico','Adultos':'Adulto'};
const BANDS = ['Obstétrico','Pediátrico','Adulto','Fertilidade','Doppler'];

function bandItems(band){
  if(band==='Doppler') return DATA.filter(d=>/Art[eé]ria/i.test(d.name));
  if(band==='Fertilidade') return [];
  return DATA.filter(d=>d.group===BAND_GROUP[band]);
}
function metaOf(d){ return [d.region, d.abbr].filter(Boolean).join(' · '); }

/* =========================================================================
   RENDER
   render(keep): keep=true preserva o scroll (atualizações in-place);
   sem keep, reinicia o scroll ao topo (navegação) com fade.
   ========================================================================= */
function render(keep){
  applyTheme();
  const v = state.view;
  // header
  const hdr = $('hdr');
  if(v==='home'){ hdr.className='hdr hide'; hdr.innerHTML=''; }
  else { hdr.className='hdr'; hdr.innerHTML = headerHTML(); }
  // corpo
  const s = $('scroll');
  const top = keep ? s.scrollTop : 0;
  s.innerHTML = viewHTML();
  s.className = keep ? 'scroll' : 'scroll fade';
  s.scrollTop = top;
  // sub-abas
  const sub = $('subtabs');
  if(v==='detail'){ sub.className='subtabs'; sub.innerHTML = subtabsHTML(); }
  else { sub.className='subtabs hide'; sub.innerHTML=''; }
}
function applyTheme(){
  document.documentElement.setAttribute('data-theme', state.theme==='light'?'light':'dark');
  const m = document.querySelector('meta[name=theme-color]');
  if(m) m.setAttribute('content', state.theme==='light'?'#eceff3':'#0e1216');
}
function renderHeader(){ $('hdr').innerHTML = headerHTML(); }
function themeIcon(){ return state.theme==='dark' ? svgIcon(P.sun,21,{sw:1.8}) : svgIcon(P.moon,21,{sw:1.8}); }

function headerHTML(){
  const v = state.view;
  let title='', sub='';
  if(v==='refs'){ title='Referências'; }
  else if(v==='detail'){ title=state.item?state.item.name:''; sub=(state.item&&state.item.abbr)?state.item.abbr:''; }
  else if(v==='calc'){ title=state.calcStub?state.calcStub.n:'Calculadoras'; sub=state.calcStub?state.calcStub.org:''; }
  else if(v==='favoritos'){ title='Favoritos'; }
  else if(v==='novalista'){ const cl=state.lists.find(x=>x.id===state.composingId); title=cl?cl.name:'Minhas listas'; sub=cl?'Lista personalizada':''; }

  let right='';
  if(v==='detail' && state.item){
    const isFav = state.favs.indexOf(state.item.id)>=0;
    right += `<button class="iconbtn" style="color:${isFav?'var(--star)':'var(--dim)'}" onclick="toggleFav('${esc(state.item.id)}')" aria-label="Favoritar">${svgIcon(P.star,22,{fill:isFav?'currentColor':'none'})}</button>`;
  }
  if(v==='calc' && state.calcStub){
    const isFav = state.favCalcs.indexOf(state.calcStub.k)>=0;
    right += `<button class="iconbtn" style="color:${isFav?'var(--star)':'var(--dim)'}" onclick="toggleFavCalc('${esc(state.calcStub.k)}')" aria-label="Favoritar">${svgIcon(P.star,22,{fill:isFav?'currentColor':'none'})}</button>`;
  }
  right += `<button class="iconbtn" onclick="toggleTheme()" aria-label="Alternar tema">${themeIcon()}</button>`;

  return `<button class="hbtn" onclick="goBack()" aria-label="Voltar">${svgIcon(P.back,22,{sw:2.2})}</button>
    <div class="htitle-wrap"><div class="htitle">${esc(title)}</div>${sub?`<div class="hsub">${esc(sub)}</div>`:''}</div>
    <div class="hact">${right}</div>`;
}

function viewHTML(){
  switch(state.view){
    case 'home': return homeHTML();
    case 'refs': return refsHTML();
    case 'detail': return detailHTML();
    case 'calc': return calcViewHTML();
    case 'favoritos': return favHTML();
    case 'novalista': return listsHTML();
    default: return homeHTML();
  }
}

/* ---- 1. LAUNCHER (home) ---- */
function homeHTML(){
  return `<div class="lc">
    <button class="iconbtn lc-toggle" id="lc-themebtn" onclick="toggleTheme()" aria-label="Alternar tema">${themeIcon()}</button>
    <div class="lc-head">
      <div class="lc-brand">RAD<span>REF</span></div>
      <div class="lc-greet">Bom plantão.</div>
      <div class="lc-sub">O que você precisa agora?</div>
    </div>
    <div class="lc-b">
      <div class="lc-top">
        <div class="lc-card" onclick="setView('calc')">
          <div class="lc-chip">${svgIcon(P.calc,26)}</div>
          <div><div class="t">Calculadoras</div><div class="d">TI-RADS, BI-RADS, escores e fórmulas</div></div>
        </div>
        <div class="lc-card fill" onclick="setView('refs')">
          <div class="lc-chip">${svgIcon(P.book,26)}</div>
          <div><div class="t">Referências</div><div class="d">Medidas normais por órgão e idade</div></div>
        </div>
      </div>
      <div class="lc-short" onclick="setView('favoritos')">
        <div class="si star">${svgIcon(P.star,23,{fill:'currentColor',noStroke:true})}</div>
        <div class="st"><div class="t">Favoritos</div><div class="d">Acesso rápido ao que você marcou</div></div>
        <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
      </div>
      <div class="lc-short" onclick="setView('novalista')">
        <div class="si acc">${svgIcon(P.listplus,23)}</div>
        <div class="st"><div class="t">Nova lista</div><div class="d">Monte um pacote para o plantão</div></div>
        <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
      </div>
    </div>
  </div>`;
}

/* ---- 2. REFERÊNCIAS (lista) ---- */
function refsHTML(){
  const chips = BANDS.map(b=>`<div class="chip ${state.band===b?'on':''}" onclick="setBand('${b}')">${esc(b)}</div>`).join('');
  return `<div class="rsearch"><div class="rsearch-box">
      <div class="rsearch-ic">${svgIcon(P.search,18,{sw:2})}</div>
      <input id="q" value="${esc(state.query)}" oninput="onSearch(this.value)" placeholder="Pesquisar órgão ou medida…">
    </div></div>
    <div class="sec-label">Faixa etária</div>
    <div class="bandzone">
      <div class="bandrow" id="bandrow">${chips}</div>
      <div class="band-fade"><div class="band-arrow" onclick="scrollBandMore()">»</div></div>
    </div>
    <div id="reflist">${refsListHTML()}</div>`;
}
function refsListHTML(){
  let items = bandItems(state.band);
  const q = state.query.trim().toLowerCase();
  if(q) items = items.filter(d=>(d.name+' '+(d.abbr||'')+' '+d.region).toLowerCase().includes(q));
  if(!items.length){
    let icon='○', msg='Sem itens nesta faixa por enquanto.';
    if(state.band==='Fertilidade'){ msg='Fertilidade chega em breve — útero, ovários e contagem de folículos antrais.'; }
    else if(q){ icon='⌕'; msg='Nenhum resultado para “'+state.query+'”.'; }
    return `<div class="empty"><div class="big">${icon}</div><div class="msg">${esc(msg)}</div></div>`;
  }
  let html='', last=null;
  items.forEach(d=>{
    if(d.region!==last){ html+=`<div class="grp">${esc(d.region)}</div>`; last=d.region; }
    html += rowHTML(d);
  });
  html += `<div class="disc">Ferramenta <b>educacional</b>. Os valores são referências da literatura e não substituem o julgamento clínico.</div>`;
  return html;
}
function rowHTML(d){
  const isFav = state.favs.indexOf(d.id)>=0;
  return `<div class="row" onclick="openItem('${esc(d.id)}')">
    <div class="ic">${d.icon||ICONS.organ}</div>
    <div class="tx"><div class="nm">${esc(d.name)}</div><div class="meta">${esc(metaOf(d))}</div></div>
    <div class="star-btn ${isFav?'on':''}" onclick="event.stopPropagation();toggleFav('${esc(d.id)}')">${svgIcon(P.star,20,{fill:isFav?'currentColor':'none'})}</div>
    <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
  </div>`;
}

/* ---- 3. DETALHE ---- */
function detailHTML(){
  const d = state.item; if(!d) return '';
  const e = d.exam||{};
  const faixa = (GROUP_BAND[d.group]||d.group)+' — '+d.region;
  let h = `<div class="sec-label">Faixa etária</div><div class="d-age">${esc(faixa)}</div>`;
  if(state.sub==='tabela'){
    if(d.tables&&d.tables.length){ d.tables.forEach(t=>{ h+=tableHTML(t); }); }
    else { h+=`<div class="empty"><div class="msg">Sem tabela de medidas para este item.</div></div>`; }
    if(d.footnotes&&d.footnotes.length){ h+=`<div class="note">`+d.footnotes.map(f=>nl2br(f)).join('<br>')+`</div>`; }
    h += refsAccHTML(d);
  }
  else if(state.sub==='calc'){ h += calcDetailHTML(d); }
  else if(state.sub==='exame'){
    if(e.prep) h+=`<div class="prose-label">Preparo</div><div class="prose">${nl2br(e.prep)}</div>`;
    if(e.position) h+=`<div class="prose-label">Posicionamento</div><div class="prose">${nl2br(e.position)}</div>`;
    if(e.points&&e.points.length) h+=`<div class="prose-label">Pontos-chave</div><ul class="pts">`+e.points.map(p=>`<li>${nl2br(p)}</li>`).join('')+`</ul>`;
    if(!e.prep&&!e.position&&!(e.points&&e.points.length)) h+=`<div class="empty"><div class="msg">Sem dados de exame para este item.</div></div>`;
  }
  else if(state.sub==='tecnica'){
    if(e.technique) h+=`<div class="prose-label">Técnica de medida</div><div class="tech-prose">${nl2br(e.technique)}</div>`;
    else h+=`<div class="empty"><div class="msg">Sem dados de técnica para este item.</div></div>`;
  }
  return h;
}
function tableHTML(t){
  const rows = t.rows||[]; if(!rows.length) return '';
  const ncols = Math.max.apply(null, rows.map(r=>r.length));
  let h='';
  if(t.title) h+=`<div class="tb-title">${esc(t.title)}</div>`;
  h+=`<table class="mtable"><tbody>`;
  rows.forEach((r,ri)=>{
    const head = ri===0 && rows.length>1;
    h+=`<tr>`;
    for(let c=0;c<ncols;c++){
      const cell = r[c]==null?'':r[c];
      const cls = head ? 'head' : (c===0 ? 'lbl' : '');
      h+=`<td class="${cls}">${nl2br(cell)}</td>`;
    }
    h+=`</tr>`;
  });
  h+=`</tbody></table>`;
  return h;
}
function refsAccHTML(d){
  if(!d.refs||!d.refs.length) return '';
  return `<div class="acc-head" onclick="toggleAcc('refsbody','refchev')"><span>Referências</span><span id="refchev">⌄</span></div>
    <div class="acc-body" id="refsbody">`+d.refs.map(r=>`<div class="ref">${nl2br(r)}</div>`).join('')+`</div>`;
}
function calcDetailHTML(d){
  const ch = d.chart;
  if(!ch||!ch.rows||!ch.rows.length) return `<div class="empty"><div class="msg">Este item não possui calculadora.</div></div>`;
  const label = 'Informe '+((ch.header&&ch.header[0])||'o valor');
  let h = `<div class="calc-wrap">
    <div class="calc-label">${esc(label)}</div>
    <div class="calc-in">
      <input id="ci1" type="number" inputmode="decimal" placeholder="0">
      <button class="calc-btn" onclick="doCalc()">Consultar</button>
    </div>
    <div id="calcout"></div>
  </div>`;
  h += `<div class="acc-head" onclick="toggleAcc('chartbody','chartchev')"><span>Tabela completa</span><span id="chartchev">⌄</span></div>
    <div class="acc-body" id="chartbody">`+tableHTML({rows:[ch.header].concat(ch.rows)})+`</div>`;
  return h;
}
function subtabsHTML(){
  const d = state.item, e = d.exam||{};
  const tabs = [['tabela','Tabela',P.table]];
  if(d.chart) tabs.push(['calc','Cálculo',P.calcTab]);
  if(e.prep||e.position||(e.points&&e.points.length)) tabs.push(['exame','Exame',P.exam]);
  if(e.technique) tabs.push(['tecnica','Técnica',P.tech]);
  return tabs.map(t=>`<button class="${state.sub===t[0]?'on':''}" onclick="setSub('${t[0]}')">${svgIcon(t[2],22)}<span>${t[1]}</span></button>`).join('');
}

/* ---- 4. CALCULADORAS (lista + stub) ---- */
function calcViewHTML(){
  if(state.calcStub){
    const c = state.calcStub;
    const steps = c.steps.map((t,i)=>`<div class="step"><div class="n">${i+1}</div><div class="t">${esc(t)}</div></div>`).join('');
    return `<div class="stub-head">
        <div class="stub-tag">${esc(c.tag)}</div>
        <div class="stub-name">${esc(c.n)}</div>
        <div class="stub-desc">${esc(c.d)}</div>
      </div>
      <div class="stub-card"><div class="lbl">Vai funcionar assim</div>${steps}</div>
      <div class="stub-foot">Em desenvolvimento</div>`;
  }
  const cards = CALCS.map(c=>`<div class="score-card" onclick="openCalc('${c.k}')">
    <div class="tag">${esc(c.tag)}</div>
    <div class="tx" style="flex:1;min-width:0"><div class="nm">${esc(c.n)}</div><div class="d">${esc(c.d)}</div></div>
    <div class="chev" style="color:var(--dim);display:flex">${svgIcon(P.chev,18,{sw:2})}</div>
  </div>`).join('');
  return `<div class="calc-intro">Escores e classificações para laudo estruturado.</div>
    <div class="calc-list">${cards}</div>
    <div class="disc">As calculadoras estão em construção — esta é a estrutura de navegação.</div>`;
}

/* ---- 5. FAVORITOS ---- */
function favHTML(){
  const refs = state.favs.map(id=>DATA.find(d=>d.id===id)).filter(Boolean);
  const calcs = state.favCalcs.map(k=>CALCS.find(c=>c.k===k)).filter(Boolean);
  if(!refs.length && !calcs.length){
    return `<div class="empty">
      <div class="ico" style="color:var(--star)">${svgIcon(P.star,46,{sw:1.4})}</div>
      <div class="msg" style="font-size:16px;font-weight:650;color:var(--tx)">Nada favoritado ainda</div>
      <div class="msg" style="margin-top:6px">Toque na estrela ★ de qualquer referência ou calculadora para guardá-la aqui.</div>
    </div>`;
  }
  let h='';
  if(refs.length){
    h += `<div class="grp">Referências</div>`;
    h += refs.map(d=>`<div class="row" onclick="openItem('${esc(d.id)}')">
      <div class="ic star">${svgIcon(P.star,19,{fill:'currentColor',noStroke:true})}</div>
      <div class="tx"><div class="nm">${esc(d.name)}</div><div class="meta">${esc(metaOf(d))}</div></div>
      <div class="star-btn on" onclick="event.stopPropagation();toggleFav('${esc(d.id)}')">${svgIcon(P.star,20,{fill:'currentColor'})}</div>
    </div>`).join('');
  }
  if(calcs.length){
    h += `<div class="grp">Calculadoras</div>`;
    h += calcs.map(c=>`<div class="row" onclick="openCalcFromFav('${c.k}')">
      <div class="ic tag"><span>${esc(c.tag)}</span></div>
      <div class="tx"><div class="nm">${esc(c.n)}</div><div class="meta">${esc(c.d)}</div></div>
      <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
    </div>`).join('');
  }
  return h;
}

/* ---- 6. NOVA LISTA ---- */
function listsHTML(){
  if(state.composingId){
    const cl = state.lists.find(x=>x.id===state.composingId) || {id:state.composingId, items:[]};
    const inIds = cl.items;
    const itemsIn = inIds.map(id=>DATA.find(d=>d.id===id)).filter(Boolean);
    let h='';
    if(itemsIn.length){
      h += itemsIn.map(d=>`<div class="row" onclick="openItem('${esc(d.id)}')">
        <div class="ic">${d.icon||ICONS.organ}</div>
        <div class="tx"><div class="nm">${esc(d.name)}</div><div class="meta">${esc(metaOf(d))}</div></div>
        <div class="star-btn" onclick="event.stopPropagation();toggleInList('${cl.id}','${esc(d.id)}')">${svgIcon(P.minus,18,{sw:2})}</div>
      </div>`).join('');
    } else {
      h += `<div class="compose-empty">Lista vazia. Adicione referências abaixo.</div>`;
    }
    h += `<div class="pick-label">Adicionar referências</div>`;
    h += DATA.map(d=>{
      const inside = inIds.indexOf(d.id)>=0;
      return `<div class="pick-row" onclick="toggleInList('${cl.id}','${esc(d.id)}')">
        <div class="pick-box ${inside?'on':''}">${inside?'✓':''}</div>
        <div class="tx" style="flex:1;min-width:0"><div class="nm">${esc(d.name)}</div><div class="meta">${esc(metaOf(d))}</div></div>
      </div>`;
    }).join('');
    h += `<div style="height:20px"></div>`;
    return h;
  }

  let h = `<div class="create">
    <div class="create-bar">
      <input id="newname" value="${esc(state.newName)}" oninput="onNewName(this.value)" placeholder="Nome da lista (ex.: Plantão tireoide)">
      <button onclick="createList()">Criar</button>
    </div>
    <div class="create-hint">Monte um pacote com as referências e calculadoras que você mais usa, como uma playlist.</div>
  </div>`;
  if(state.lists.length){
    h += `<div class="lists">`+state.lists.map(l=>`<div class="list-card" onclick="openCompose('${l.id}')">
      <div class="li">${svgIcon(P.listplus,22)}</div>
      <div class="tx" style="flex:1;min-width:0"><div class="nm">${esc(l.name)}</div><div class="cnt">${l.items.length} ${l.items.length===1?'item':'itens'}</div></div>
      <div class="del" onclick="event.stopPropagation();delList('${l.id}')">${svgIcon(P.trash,18,{sw:1.8})}</div>
    </div>`).join('')+`</div>`;
  } else {
    h += `<div class="empty"><div class="ico" style="color:var(--accent)">${svgIcon(P.listplus,44,{sw:1.4})}</div><div class="msg">Crie sua primeira lista acima.</div></div>`;
  }
  return h;
}

/* =========================================================================
   AÇÕES
   ========================================================================= */
function setView(v){ state.view=v; state.calcStub=null; state.composingId=null; render(); }
function goBack(){
  const v = state.view;
  if(v==='detail'){ state.view='refs'; render(); return; }
  if(v==='calc' && state.calcStub){ state.calcStub=null; render(); return; }
  if(v==='novalista' && state.composingId){ state.composingId=null; render(); return; }
  state.view='home'; render();
}
function toggleTheme(){
  state.theme = state.theme==='dark' ? 'light' : 'dark';
  try{ localStorage.setItem('radref_theme', state.theme); }catch(_){}
  applyTheme();
  // só o ícone sol/lua muda; preserva scroll/estado da tela atual
  if(state.view==='home'){ const b=$('lc-themebtn'); if(b) b.innerHTML = themeIcon(); }
  else renderHeader();
}

function setBand(b){ state.band=b; render(); }
function onSearch(v){ state.query=v; const el=$('reflist'); if(el) el.innerHTML=refsListHTML(); }
function scrollBandMore(){ const el=$('bandrow'); if(el) el.scrollBy({left:170, behavior:'smooth'}); }

function openItem(id){
  const d = DATA.find(x=>x.id===id); if(!d) return;
  state.item=d; state.view='detail'; state.sub='tabela'; render();
}
function setSub(s){ state.sub=s; render(); }
function toggleAcc(bodyId, chevId){
  const b = $(bodyId); if(!b) return;
  const open = b.classList.toggle('open');
  const c = $(chevId); if(c) c.textContent = open ? '⌃' : '⌄';
}
function doCalc(){
  const ch = state.item.chart, out = $('calcout');
  const v = parseFloat(($('ci1').value||'').replace(',','.'));
  if(isNaN(v)){ out.innerHTML=`<div class="calc-card"><div class="match">Informe um valor.</div></div>`; return; }
  let best=null, bd=Infinity;
  ch.rows.forEach(r=>{ const x=parseFloat(String(r[0]).replace(',','.')); if(!isNaN(x)){ const dd=Math.abs(x-v); if(dd<bd){bd=dd;best=r;} } });
  if(!best){ out.innerHTML=`<div class="calc-card"><div class="match">Sem correspondência.</div></div>`; return; }
  const exact = parseFloat(String(best[0]).replace(',','.'))===v;
  let rows='';
  for(let i=1;i<ch.header.length;i++){ if(best[i]!=null&&best[i]!=='') rows+=`<div class="kv"><span class="k">${esc(ch.header[i])}</span><span class="v">${esc(best[i])}</span></div>`; }
  out.innerHTML=`<div class="calc-card"><div class="match">${esc(ch.header[0])}: <b style="color:var(--tx)">${esc(best[0])}</b>${exact?'':' (mais próximo)'}</div>${rows}</div>`;
}

function openCalc(k){ state.calcStub = CALCS.find(c=>c.k===k)||null; render(); }
function openCalcFromFav(k){ state.view='calc'; state.calcStub=CALCS.find(c=>c.k===k)||null; render(); }

function toggleFav(id){
  const i = state.favs.indexOf(id);
  if(i<0) state.favs.push(id); else state.favs.splice(i,1);
  persist('radref_favs', state.favs);
  if(state.view==='refs'){ const el=$('reflist'); if(el) el.innerHTML=refsListHTML(); }
  else if(state.view==='detail'){ renderHeader(); }
  else render(true);   // favoritos: item entra/sai da lista
}
function toggleFavCalc(k){
  const i = state.favCalcs.indexOf(k);
  if(i<0) state.favCalcs.push(k); else state.favCalcs.splice(i,1);
  persist('radref_favcalcs', state.favCalcs);
  if(state.view==='calc'){ renderHeader(); }
  else render(true);
}

function onNewName(v){ state.newName=v; }   // sem render: preserva foco do input
function createList(){
  const n = (state.newName||'').trim(); if(!n) return;
  state.lists.push({id:'l'+Date.now(), name:n, items:[]});
  state.newName='';
  persist('radref_lists', state.lists);
  render(true);
}
function delList(id){
  state.lists = state.lists.filter(x=>x.id!==id);
  persist('radref_lists', state.lists);
  render(true);
}
function openCompose(id){ state.composingId=id; render(); }
function toggleInList(listId, itemId){
  const l = state.lists.find(x=>x.id===listId); if(!l) return;
  const i = l.items.indexOf(itemId);
  if(i<0) l.items.push(itemId); else l.items.splice(i,1);
  persist('radref_lists', state.lists);
  render(true);
}

/* ---- BOOT ---- */
loadState();
render();
syncData();
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{})); }
