/* =========================================================================
   RadRef — app de referência em ultrassonografia (PT-BR).
   Conteúdo reconstruído a partir do app MedUltra (propriedade do usuário).
   FERRAMENTA EDUCACIONAL — não substitui o julgamento clínico.
   Modelo de item: {id,group,region,name,abbr,iconKey,tables[],footnotes[],
   chart{header,rows},exam{prep,position,points,technique},refs[]}.
   ========================================================================= */

const ICONS = {
  organ:'<svg viewBox="0 0 24 24"><path d="M6 9c-2 2-2 7 2 9 3 1 5-1 6-3 1 2 4 3 6 0 2-3 0-9-4-9-2 0-3 1-4 2-1-2-3-3-6-1z"/></svg>',
  drop:'<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
  baby:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 21c0-4 3-6 6-6s6 2 6 6"/></svg>',
  ruler:'<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/></svg>',
};

const ESC_MAP = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>ESC_MAP[c]); }
function nl2br(s){ return esc(s).replace(/\r?\n/g,'<br>'); }

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
  if(cfg.USE_SUPABASE === false) return null;            // desligado na branch completo
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
  render();
}

/* ---- ESTADO ---- */
let state = {tab:'Fetal', view:'home', item:null, sub:'tabela', query:''};
const AGES = ['Fetal','Pediatria','Adultos'];
const $ = id=>document.getElementById(id);

/* ---- RENDER ---- */
function render(){
  document.getElementById('app').classList.toggle('has-subtabs', state.view==='detail');
  renderHeader(); renderSeg(); renderSearch(); renderBody(); renderSubtabs(); renderFooter();
}
function renderHeader(){
  if(state.view==='detail'){
    $('hdr').innerHTML =
      `<div class="back" onclick="goHome()">‹ Voltar</div>
       <div class="brand">${esc(state.item.name)}${state.item.abbr?` <span style="color:var(--txt-dim)">(${esc(state.item.abbr)})</span>`:''}</div>`;
  }else{
    $('hdr').innerHTML =
      `<div class="brand">Rad<b>Ref</b></div>
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
    `<div class="search"><input id="q" placeholder="Pesquisar órgão ou medida…" value="${esc(state.query)}" oninput="onSearch(this.value)"></div>`;
}

function renderBody(){
  const s=$('scroll'); s.scrollTop=0;
  if(state.view==='detail'){ s.innerHTML=detailHTML(); s.className='scroll fade'; return; }
  const q=state.query.trim().toLowerCase();
  let items = DATA.filter(d=>d.group===state.tab);
  if(q) items = items.filter(d=>(d.name+' '+(d.abbr||'')+' '+d.region).toLowerCase().includes(q));
  if(!items.length){ s.innerHTML=`<div class="empty">Nenhum resultado para “${esc(state.query)}”.</div>`; s.className='scroll'; return; }
  let html=''; let lastRegion=null;
  items.forEach(d=>{
    if(d.region!==lastRegion){ html+=`<div class="group-title">${esc(d.region)}</div>`; lastRegion=d.region; }
    html+=
      `<div class="row" onclick="openItem('${esc(d.id)}')">
         <div class="ic">${d.icon||ICONS.organ}</div>
         <div class="txt"><div class="nm">${esc(d.name)}</div>${d.abbr?`<div class="ab">${esc(d.abbr)}</div>`:''}</div>
         <div class="chev">›</div>
       </div>`;
  });
  html+=`<div class="disc" style="margin:20px 16px 8px">⚠️ Ferramenta <b>educacional</b>. Os valores são referências da literatura e <b>não substituem o julgamento clínico</b>. Confirme sempre na fonte primária.</div>`;
  s.innerHTML=html; s.className='scroll fade';
}

/* ---- helpers de tabela ---- */
function tableHTML(t){
  const rows=t.rows||[]; if(!rows.length) return '';
  const ncols=Math.max.apply(null, rows.map(r=>r.length));
  let h='';
  if(t.title) h+=`<div class="d-section-label">${esc(t.title)}</div>`;
  h+=`<table class="meas-table"><tbody>`;
  rows.forEach((r,ri)=>{
    h+=`<tr>`;
    for(let c=0;c<ncols;c++){
      const cell=r[c]==null?'':r[c];
      const isHeadRow = ri===0 && rows.length>1;
      const tag = isHeadRow ? 'th' : 'td';
      const cls = (!isHeadRow && c===0) ? ' class="lbl"' : '';
      h+=`<${tag}${cls}>${nl2br(cell)}</${tag}>`;
    }
    h+=`</tr>`;
  });
  h+=`</tbody></table>`;
  return h;
}
function refsHTML(d){
  if(!d.refs||!d.refs.length) return '';
  return `<div class="refs-head" onclick="toggleRefs()"><span>Referências</span><span id="refchev">⌄</span></div>
          <div class="refs-body" id="refsbody">`+
          d.refs.map(r=>`<div class="ref">${nl2br(r)}</div>`).join('')+`</div>`;
}

function detailHTML(){
  const d=state.item;
  let h=`<div class="d-section-label">Faixa Etária</div><div class="d-age">${esc(d.group)} — ${esc(d.region)}</div>`;
  if(state.sub==='tabela'){
    if(d.tables&&d.tables.length){ d.tables.forEach(t=>{ h+=tableHTML(t); }); }
    else { h+=`<div class="empty">Sem tabela de medidas para este item.</div>`; }
    if(d.footnotes&&d.footnotes.length){ h+=`<div class="note">`+d.footnotes.map(f=>nl2br(f)).join('<br>')+`</div>`; }
    h+=refsHTML(d);
  }
  else if(state.sub==='calc'){ h+=calcHTML(d); }
  else if(state.sub==='exame'){
    const e=d.exam||{};
    if(e.prep) h+=`<div class="d-section-label">Preparo</div><div class="note">${nl2br(e.prep)}</div>`;
    if(e.position) h+=`<div class="d-section-label">Posicionamento</div><div class="note">${nl2br(e.position)}</div>`;
    if(e.points&&e.points.length) h+=`<div class="d-section-label">Pontos-chave</div><ul class="pts">`+e.points.map(p=>`<li>${nl2br(p)}</li>`).join('')+`</ul>`;
    if(!e.prep&&!e.position&&!(e.points&&e.points.length)) h+=`<div class="empty">Sem dados de exame para este item.</div>`;
  }
  else if(state.sub==='tecnica'){
    const e=d.exam||{};
    if(e.technique) h+=`<div class="d-section-label">Técnica</div><div class="note">${nl2br(e.technique)}</div>`;
    else h+=`<div class="empty">Sem dados de técnica para este item.</div>`;
  }
  return h;
}

function calcHTML(d){
  const ch=d.chart; if(!ch||!ch.rows||!ch.rows.length) return `<div class="empty">Este item não possui calculadora.</div>`;
  const inLabel=(ch.header&&ch.header[0])||'Valor';
  let h=`<div class="d-section-label">Cálculo</div><div class="calc-box">
     <div class="calc-row"><label style="min-width:auto">${esc(inLabel)}</label>
       <input id="ci1" type="number" inputmode="decimal"></div>
     <button class="calc-btn" onclick="doCalc()">CONSULTAR</button>
     <div class="calc-out" id="calcout"></div></div>`;
  h+=`<div class="refs-head" onclick="toggleChart()"><span>Tabela completa</span><span id="chartchev">⌄</span></div>
      <div class="refs-body" id="chartbody">`+tableHTML({rows:[ch.header].concat(ch.rows)})+`</div>`;
  return h;
}
function doCalc(){
  const ch=state.item.chart, out=$('calcout');
  const v=parseFloat(($('ci1').value||'').replace(',','.'));
  if(isNaN(v)){ out.innerHTML=`<div class="lab">Informe um valor.</div>`; out.classList.add('show'); return; }
  let best=null,bd=Infinity;
  ch.rows.forEach(r=>{ const x=parseFloat(String(r[0]).replace(',','.')); if(!isNaN(x)){ const dd=Math.abs(x-v); if(dd<bd){bd=dd;best=r;} } });
  if(!best){ out.innerHTML=`<div class="lab">Sem correspondência.</div>`; out.classList.add('show'); return; }
  let h='';
  for(let i=1;i<ch.header.length;i++){ if(best[i]!=null&&best[i]!=='') h+=`<div class="kv"><span class="k">${esc(ch.header[i])}</span><span class="v">${esc(best[i])}</span></div>`; }
  const exact = parseFloat(String(best[0]).replace(',','.'))===v;
  out.innerHTML=`<div class="lab" style="margin-bottom:6px">${esc(ch.header[0])}: <b style="color:var(--txt)">${esc(best[0])}</b>${exact?'':' (mais próximo)'}</div>`+h;
  out.classList.add('show');
}

function renderSubtabs(){
  if(state.view!=='detail'){ $('subtabs').innerHTML=''; return; }
  const d=state.item, e=d.exam||{};
  const tabs=[['tabela','Tabela',ICONS.ruler]];
  if(d.chart) tabs.push(['calc','Cálculo','<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M8 15h2M14 11h2M14 15h2"/></svg>']);
  if(e.prep||e.position||(e.points&&e.points.length)) tabs.push(['exame','Exame','<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></svg>']);
  if(e.technique) tabs.push(['tecnica','Técnica','<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>']);
  $('subtabs').className='subtabs';
  $('subtabs').innerHTML = tabs.map(t=>
    `<button class="${state.sub===t[0]?'on':''}" onclick="setSub('${t[0]}')">${t[2]}<span>${t[1]}</span></button>`).join('');
}
function renderFooter(){
  $('botnav').className='botnav';
  $('botnav').innerHTML = `<div style="flex:1;text-align:center;font-size:.62rem;color:var(--txt-dim);padding:0 16px;line-height:1.3">Ferramenta educacional · não substitui o julgamento clínico</div>`;
}

/* ---- AÇÕES ---- */
function setTab(t){ state.tab=t; render(); }
function onSearch(v){ state.query=v; renderBody(); }
function openItem(id){
  state.item = DATA.find(d=>d.id===id); if(!state.item) return;
  state.view='detail'; state.sub='tabela'; render();
}
function goHome(){ state.view='home'; state.item=null; render(); }
function setSub(s){ state.sub=s; renderBody(); renderSubtabs(); }
function toggleRefs(){ $('refsbody').classList.toggle('open'); $('refchev').textContent=$('refsbody').classList.contains('open')?'⌃':'⌄'; }
function toggleChart(){ $('chartbody').classList.toggle('open'); $('chartchev').textContent=$('chartbody').classList.contains('open')?'⌃':'⌄'; }

/* ---- BOOT ---- */
render();
syncData();
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{})); }
