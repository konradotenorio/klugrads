/* =========================================================================
   UltraRef — app de referência em ultrassonografia (uso pessoal / educacional)
   Conteúdo embasado em literatura publicada; referências citadas em cada item.
   FERRAMENTA EDUCACIONAL — não substitui julgamento clínico.
   ---------------------------------------------------------------------------
   Dados: window.SEED_DATA (seed.js) + sincronização com Supabase (referencias).
   Config: window.CONFIG (config.js).
   ========================================================================= */

/* ---- ícones (SVG inline, traço) ---- */
const ICONS = {
  organ:'<svg viewBox="0 0 24 24"><path d="M6 9c-2 2-2 7 2 9 3 1 5-1 6-3 1 2 4 3 6 0 2-3 0-9-4-9-2 0-3 1-4 2-1-2-3-3-6-1z"/></svg>',
  ruler:'<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/></svg>',
  drop:'<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
  baby:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 21c0-4 3-6 6-6s6 2 6 6"/></svg>',
  kidney:'<svg viewBox="0 0 24 24"><path d="M9 5c-3 0-5 3-5 7s2 7 5 7c2 0 3-2 3-4 0-3 0-6 0-7 0-2-1-3-3-3z"/></svg>',
  head:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M9 10h.01M15 10h.01M9 15c1 1 5 1 6 0"/></svg>',
  bone:'<svg viewBox="0 0 24 24"><path d="M7 7a2 2 0 1 0-2 2l8 8a2 2 0 1 0 2-2z"/><path d="M7 7a2 2 0 1 1-2-2M17 17a2 2 0 1 0 2 2"/></svg>',
};

/* ---- calculadoras (lógica — ligadas a cada item pelo id) ---- */
const CALC_FNS = {
  'fetal-ccn': (ccn)=>{
    if(ccn<2||ccn>84) return null;
    const days = 8.052*Math.sqrt(ccn*1.037)+23.73; // Robinson & Fleming
    const w=Math.floor(days/7), d=Math.round(days%7);
    return {big:`${w}s ${d}d`, lab:`Idade gestacional estimada (Robinson)`};
  },
  'adulto-prostata': (v)=>{ if(!v) return null; return {big:`${v.toFixed(1)} cm³`, lab:`Volume (elipsoide: L × A × T × 0,52) ≈ ${v.toFixed(1)} g`}; },
  'adulto-testiculos': (v)=>{ if(!v) return null; return {big:`${v.toFixed(1)} cm³`, lab:`Volume (L × A × T × 0,52)`}; },
  'adulto-tireoide': (v)=>{ if(!v) return null; return {big:`${v.toFixed(1)} cm³`, lab:`Volume do lobo (L × A × T × 0,52)`}; },
};

/* ---- hidratação: anexa ícone (iconKey) e função de cálculo (id) ---- */
function hydrate(items){
  return (items||[]).map(src=>{
    let d;
    try { d = JSON.parse(JSON.stringify(src)); } catch(_) { d = Object.assign({}, src); }
    d.icon = ICONS[d.iconKey] || ICONS.organ;
    if(d.calc && CALC_FNS[d.id]) d.calc = Object.assign({}, d.calc, { fn: CALC_FNS[d.id] });
    return d;
  });
}

/* ---- tabela de TN (CCN 45–84 mm) — curvas aproximadas da literatura ---- */
function tnRows(){
  const rows=[];
  for(let ccn=45;ccn<=84;ccn++){
    const p50 = 0.0266*ccn - 0.055;
    const p5  = 0.0205*ccn - 0.135;
    const p95 = 0.0407*ccn - 0.18;
    rows.push([ccn, p50.toFixed(2), p5.toFixed(2), p95.toFixed(2)]);
  }
  return rows;
}
function tnLookup(ccn){
  if(ccn<45||ccn>84) return null;
  const p50 = 0.0266*ccn - 0.055;
  const p5  = 0.0205*ccn - 0.135;
  const p95 = 0.0407*ccn - 0.18;
  return {p5:p5.toFixed(2),p50:p50.toFixed(2),p95:p95.toFixed(2)};
}

/* ---- DADOS (seed offline -> sincroniza com Supabase) ---- */
function initialData(){
  try{
    const cached = localStorage.getItem('ultraref_data');
    if(cached){ const a = JSON.parse(cached); if(Array.isArray(a) && a.length) return a; }
  }catch(_){}
  return window.SEED_DATA || [];
}
let DATA = hydrate(initialData());

async function loadFromSupabase(){
  const cfg = window.CONFIG || {};
  if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
  const table = cfg.TABLE || 'referencias';
  const url = `${cfg.SUPABASE_URL}/rest/v1/${table}?select=conteudo&order=sort_order.asc`;
  try{
    const res = await fetch(url, { headers:{ apikey: cfg.SUPABASE_ANON_KEY, Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}` }});
    if(!res.ok) return null;
    const rows = await res.json();
    if(!Array.isArray(rows) || !rows.length) return null;
    const items = rows.map(r=>r && r.conteudo).filter(Boolean);
    return items.length ? items : null;
  }catch(_){ return null; }
}
async function syncData(){
  const remote = await loadFromSupabase();
  if(!remote) return;                       // offline ou vazio: mantém o que já está
  DATA = hydrate(remote);
  try{ localStorage.setItem('ultraref_data', JSON.stringify(remote)); }catch(_){}
  render();                                 // re-render com dados frescos do banco
}

/* ---- ESTADO ---- */
let state = {tab:'Fetal', view:'home', item:null, sub:'tabela', query:''};
const AGES = ['Fetal','Pediatria','Adultos'];

/* ---- RENDER ---- */
const $ = id=>document.getElementById(id);

function render(){
  document.getElementById('app').classList.toggle('has-subtabs', state.view==='detail');
  renderHeader(); renderSeg(); renderSearch(); renderBody(); renderSubtabs(); renderBotnav();
}

function renderHeader(){
  if(state.view==='detail'){
    $('hdr').innerHTML =
      `<div class="back" onclick="goHome()">‹ Voltar</div>
       <div class="brand">${state.item.name}${state.item.abbr?` <span style="color:var(--txt-dim)">(${state.item.abbr})</span>`:''}</div>
       <div class="home" onclick="goHome()">⌂</div>`;
  }else{
    $('hdr').innerHTML =
      `<div class="brand">Ultra<b>Ref</b></div>
       <div class="subtitle">Referências em Ultrassonografia</div>`;
  }
}
function renderSeg(){
  if(state.view!=='home'){ $('seg').innerHTML=''; return; }
  $('seg').innerHTML =
    `<div class="seg-wrap"><div class="seg-label">Faixa Etária</div><div class="seg">`+
    AGES.map(a=>`<button class="${state.tab===a?'on':''}" onclick="setTab('${a}')">${a}</button>`).join('')+
    `</div></div>`;
}
function renderSearch(){
  if(state.view!=='home'){ $('search').innerHTML=''; return; }
  $('search').innerHTML =
    `<div class="search"><input id="q" placeholder="Pesquisar órgão ou medida…" value="${state.query}" oninput="onSearch(this.value)"></div>`;
}

function renderBody(){
  const s=$('scroll'); s.scrollTop=0;
  if(state.view==='social'){ s.innerHTML=socialHTML(); s.className='scroll fade'; return; }
  if(state.view==='settings'){ s.innerHTML=settingsHTML(); s.className='scroll fade'; return; }
  if(state.view==='detail'){ s.innerHTML=detailHTML(); s.className='scroll fade'; return; }

  // home list
  const q=state.query.trim().toLowerCase();
  let items = DATA.filter(d=>d.group===state.tab);
  if(q) items = items.filter(d=>(d.name+' '+(d.abbr||'')+' '+d.region).toLowerCase().includes(q));
  if(!items.length){ s.innerHTML=`<div class="empty">Nenhum resultado para “${state.query}”.</div>`; s.className='scroll'; return; }
  let html=''; let lastRegion=null;
  items.forEach(d=>{
    if(d.region!==lastRegion){ html+=`<div class="group-title">${d.region}</div>`; lastRegion=d.region; }
    html+=
      `<div class="row" onclick="openItem('${d.id}')">
         <div class="ic">${d.icon||ICONS.organ}</div>
         <div class="txt"><div class="nm">${d.name}</div>${d.abbr?`<div class="ab">${d.abbr}</div>`:''}</div>
         <div class="chev">›</div>
       </div>`;
  });
  s.innerHTML=html; s.className='scroll fade';
}

function detailHTML(){
  const d=state.item;
  let h=`<div class="d-section-label">Faixa Etária</div><div class="d-age">${d.age}</div>`;
  if(state.sub==='tabela'){
    h+=`<div class="d-section-label">Medidas</div>`;
    if(d.tnTable){
      h+=`<table class="meas-table"><thead><tr><th>CCN (mm)</th><th>TN p50</th><th>TN p5</th><th>TN p95</th></tr></thead><tbody>`;
      tnRows().forEach(r=>{ h+=`<tr><td class="lbl" style="text-align:center">${r[0]}</td><td class="hl">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`; });
      h+=`</tbody></table>`;
    } else if(d.table){
      h+=`<table class="meas-table"><thead><tr>`+d.table.cols.map(c=>`<th>${c}</th>`).join('')+`</tr></thead><tbody>`;
      d.table.rows.forEach(r=>{ h+=`<tr>`+r.map((c,i)=>`<td class="${i===0?'lbl':''}">${c}</td>`).join('')+`</tr>`; });
      h+=`</tbody></table>`;
    } else if(d.meas){
      d.meas.forEach(m=>{ h+=`<div class="kv"><span class="k">${m[0]}</span><span class="v">${m[1]}</span></div>`; });
    }
    if(d.note) h+=`<div class="note">${d.note}</div>`;
    h+=refsHTML(d);
  }
  else if(state.sub==='calc'){
    h+=calcHTML(d);
  }
  else if(state.sub==='exame'){
    if(d.exam){
      if(d.exam.prep&&d.exam.prep!=='—'){h+=`<div class="d-section-label">Preparo</div><div class="note">${d.exam.prep}</div>`;}
      if(d.exam.position&&d.exam.position!=='—'){h+=`<div class="d-section-label">Posicionamento</div><div class="note">${d.exam.position}</div>`;}
      if(d.exam.points){h+=`<div class="d-section-label">Pontos-chave</div><ul class="pts">`+d.exam.points.map(p=>`<li>${p}</li>`).join('')+`</ul>`;}
    } else { h+=`<div class="empty">Sem dados de exame para este item.</div>`; }
  }
  else if(state.sub==='tecnica'){
    if(d.exam&&d.exam.technique){
      h+=`<div class="d-section-label">Técnica</div><div class="note">${d.exam.technique}</div>`;
      h+=`<div class="tech-fig">${probeFig()}<div class="tech-cap">Posicionamento do transdutor (esquemático)</div></div>`;
      h+=`<div class="d-section-label">Ultrassom</div><div class="us-img">${usFig()}</div>`;
    } else { h+=`<div class="empty">Sem dados de técnica para este item.</div>`; }
  }
  return h;
}

function calcHTML(d){
  if(!d.calc){
    if(d.tnTable){} // TN tem calc
    else return `<div class="empty">Este item não possui calculadora.</div>`;
  }
  const c=d.calc;
  let h=`<div class="d-section-label">Cálculo</div><div class="calc-box">`;
  if(c&&c.three){
    h+=`<div class="calc-row"><label>Compr.</label><input id="ci1" type="number" inputmode="decimal"><span class="unit">cm</span></div>
        <div class="calc-row"><label>Altura</label><input id="ci2" type="number" inputmode="decimal"><span class="unit">cm</span></div>
        <div class="calc-row"><label>Transv.</label><input id="ci3" type="number" inputmode="decimal"><span class="unit">cm</span></div>`;
  } else {
    h+=`<div class="calc-row"><label>${c?c.label:'CCN'}</label><input id="ci1" type="number" inputmode="decimal"><span class="unit">${c?c.unit:'mm'}</span></div>`;
  }
  h+=`<button class="calc-btn" onclick="doCalc()">CALCULAR</button>
      <div class="calc-out" id="calcout"></div></div>`;
  return h;
}

function refsHTML(d){
  if(!d.refs||!d.refs.length) return '';
  return `<div class="refs-head" onclick="toggleRefs()"><span>Referências</span><span id="refchev">⌄</span></div>
          <div class="refs-body" id="refsbody">`+
          d.refs.map(r=>`<div class="ref">${r}</div>`).join('')+`</div>`;
}

function renderSubtabs(){
  if(state.view!=='detail'){ $('subtabs').innerHTML=''; return; }
  const d=state.item;
  const hasCalc = d.calc || d.tnTable;
  const tabs=[['tabela','Tabela',ICONS.ruler]];
  if(hasCalc) tabs.push(['calc','Cálculo','<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M8 15h2M14 11h2M14 15h2"/></svg>']);
  tabs.push(['exame','Exame','<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></svg>']);
  tabs.push(['tecnica','Técnica','<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>']);
  $('subtabs').className='subtabs';
  $('subtabs').innerHTML = tabs.map(t=>
    `<button class="${state.sub===t[0]?'on':''}" onclick="setSub('${t[0]}')">${t[2]}<span>${t[1]}</span></button>`).join('');
}

function renderBotnav(){
  const nav=[['home','Home','<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7M6 10v9h12v-9"/></svg>'],
             ['social','Social','<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M15 20c0-2 1-3.5 3-3.5"/></svg>'],
             ['settings','Ajustes','<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>']];
  const cur = (state.view==='detail')?'home':state.view;
  $('botnav').innerHTML = nav.map(n=>
    `<button class="${cur===n[0]?'on':''}" onclick="setView('${n[0]}')">${n[2]}<span>${n[1]}</span></button>`).join('');
}

/* ---- páginas social/ajustes ---- */
function socialHTML(){
  return `<div class="group-title">Aplicativo</div>
    <div class="row"><div class="ic">${ICONS.heart}</div><div class="txt"><div class="nm">Avaliar aplicativo</div></div><div class="chev">›</div></div>
    <div class="row"><div class="ic"><svg viewBox="0 0 24 24" style="width:30px;height:30px;stroke:currentColor;fill:none;stroke-width:1.4"><path d="M4 12v7h16v-7M12 3v12M8 7l4-4 4 4"/></svg></div><div class="txt"><div class="nm">Compartilhar</div></div><div class="chev">›</div></div>
    <div class="row"><div class="ic"><svg viewBox="0 0 24 24" style="width:30px;height:30px;stroke:currentColor;fill:none;stroke-width:1.4"><path d="M4 5h16v11H8l-4 4z"/></svg></div><div class="txt"><div class="nm">Enviar feedback</div></div><div class="chev">›</div></div>
    <div class="group-title">Sobre</div>
    <div class="disc">Projeto pessoal de referência rápida, inspirado na organização de apps do gênero, com conteúdo redigido de forma independente e <b>referências bibliográficas próprias</b>.</div>`;
}
function settingsHTML(){
  return `<div class="group-title">Idioma</div>
    <div class="kv"><span class="k">Idioma do aplicativo</span><span class="v">Português (BR)</span></div>
    <div class="group-title">Termos e Condições</div>
    <div class="disc"><b>Aviso legal.</b> Este aplicativo é uma <b>ferramenta educacional e de apoio</b>. Os valores apresentados são referências da literatura e <b>não substituem o julgamento clínico</b> nem a correlação individualizada. Sempre confirme com a fonte primária citada em cada item.</div>
    <div class="about">
      <div class="logo">${appLogo()}</div>
      <div style="font-weight:700">UltraRef</div>
      <div style="font-size:.8rem;margin-top:4px">Versão 0.2 — protótipo PWA</div>
      <div style="font-size:.75rem;margin-top:2px">Uso pessoal · 2026</div>
    </div>`;
}

/* ---- figuras SVG ---- */
function probeFig(){
  return `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
    <radialGradient id="gl" cx="50%" cy="55%" r="40%"><stop offset="0%" stop-color="#2a3340"/><stop offset="100%" stop-color="#0d1014"/></radialGradient>
    <rect width="240" height="200" fill="url(#gl)" rx="10"/>
    <g stroke="#cfd8e3" fill="none" stroke-width="1.6" stroke-linecap="round">
      <path d="M120 25 C90 30 80 55 82 80 C84 120 100 160 120 175 C140 160 156 120 158 80 C160 55 150 30 120 25z"/>
      <path d="M120 25 L120 175 M95 60 C105 70 135 70 145 60"/>
    </g>
    <g transform="translate(120,92)">
      <rect x="-9" y="-26" width="18" height="34" rx="5" fill="#e8edf3" stroke="#9aa7b5"/>
      <rect x="-11" y="6" width="22" height="6" rx="2" fill="#33b3a6"/>
    </g>
  </svg>`;
}
function usFig(){
  return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="us" cx="50%" cy="15%" r="90%">
      <stop offset="0%" stop-color="#3a3a3a"/><stop offset="45%" stop-color="#1c1c1c"/><stop offset="100%" stop-color="#000"/></radialGradient></defs>
    <rect width="320" height="200" fill="#000"/>
    <path d="M160 8 L300 195 L20 195 Z" fill="url(#us)"/>
    <g opacity=".55" fill="#bbb">
      <ellipse cx="150" cy="95" rx="70" ry="34" opacity=".25"/>
      <ellipse cx="150" cy="95" rx="46" ry="22" opacity=".3"/>
      <circle cx="120" cy="110" r="2"/><circle cx="170" cy="100" r="1.5"/><circle cx="145" cy="130" r="2"/>
      <circle cx="190" cy="125" r="1.5"/><circle cx="110" cy="85" r="1.5"/>
    </g>
    <g stroke="#ff5b5b" stroke-width="2">
      <path d="M95 95 l8 0 M99 91 l0 8"/><path d="M205 95 l8 0 M209 91 l0 8"/>
    </g>
    <text x="160" y="190" fill="#888" font-size="9" text-anchor="middle" font-family="monospace">imagem ilustrativa · calipers (+)</text>
  </svg>`;
}
function appLogo(){
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#33b3a6"/><stop offset="1" stop-color="#5aa9e6"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#lg)"/><path d="M16 40 C20 24 28 22 32 36 C35 46 40 30 48 30" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>`;
}

/* ---- AÇÕES ---- */
function setTab(t){ state.tab=t; render(); }
function onSearch(v){ state.query=v; renderBody(); }
function openItem(id){
  state.item = DATA.find(d=>d.id===id);
  if(!state.item) return;
  state.view='detail'; state.sub='tabela'; render();
}
function goHome(){ state.view='home'; state.item=null; render(); }
function setView(v){ state.view=v; state.item=null; render(); }
function setSub(s){ state.sub=s; renderBody(); renderSubtabs(); }
function toggleRefs(){
  $('refsbody').classList.toggle('open');
  $('refchev').textContent = $('refsbody').classList.contains('open')?'⌃':'⌄';
}
function doCalc(){
  const d=state.item, out=$('calcout');
  let res=null;
  if(d.tnTable){
    const ccn=parseFloat($('ci1').value);
    const t=tnLookup(ccn);
    if(t){ out.innerHTML=
      `<table class="meas-table"><thead><tr><th>CCN</th><th>p50</th><th>p5</th><th>p95</th></tr></thead>
       <tbody><tr><td>${ccn} mm</td><td class="hl">${t.p50}</td><td>${t.p5}</td><td>${t.p95}</td></tr></tbody></table>
       <div class="calc-out lab" style="display:block;margin-top:10px">Valores de TN (mm) para o CCN informado</div>`;
      out.classList.add('show'); return; }
    out.innerHTML=`<div class="lab">Informe um CCN entre 45 e 84 mm.</div>`; out.classList.add('show'); return;
  }
  const c=d.calc;
  if(!c || typeof c.fn!=='function'){ out.innerHTML=`<div class="lab">Calculadora indisponível para este item.</div>`; out.classList.add('show'); return; }
  if(c.three){
    const a=parseFloat($('ci1').value),b=parseFloat($('ci2').value),cc=parseFloat($('ci3').value);
    if(a&&b&&cc) res=c.fn(a*b*cc*0.52);
  } else {
    res=c.fn(parseFloat($('ci1').value));
  }
  if(res){ out.innerHTML=`<div class="big">${res.big}</div><div class="lab">${res.lab}</div>`; out.classList.add('show'); }
  else { out.innerHTML=`<div class="lab">Valor fora do intervalo válido.</div>`; out.classList.add('show'); }
}

/* ---- BOOT ---- */
render();        // mostra imediatamente (cache/seed) — funciona offline
syncData();      // busca dados frescos do Supabase em segundo plano

/* ---- Service Worker (PWA) ---- */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}
