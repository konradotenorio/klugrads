/* =========================================================================
   KlugRads — camada de UX. Carregado por ÚLTIMO (depois de app.js e de todas
   as calculadoras), porque lê CALCS/MODALITIES/DATA já completos.

   1) Rotas e histórico: cada tela tem um endereço (#/c/tirads, #/r/<id>…).
      O botão Voltar do Android/navegador volta uma tela e dá para enviar o
      link de uma calculadora. A pilha state.nav de app.js não é mais usada.
   2) Barra inferior (celular/tablet) e menu "Mais".
   3) Dock de resultado: cartão lateral no desktop largo, barra no rodapé no
      celular quando o resultado da calculadora sai da tela.
   4) Teclado e foco: Enter/Espaço em cartões e chips, Esc volta, "/" e
      Ctrl+K buscam.
   5) Referência fixada ao lado (desktop ≥ 1280 px).
   ========================================================================= */

/* ============================ 1. ROTAS / HISTÓRICO ============================ */
var _uxCur = null;          // {key, route} da última tela sincronizada
var _uxPopping = false;     // true enquanto aplica um popstate (não empilha)
var _uxReplaceNext = false; // próxima troca de tela substitui a entrada atual
var _uxPending = '';        // rota pedida na URL enquanto os termos não foram aceitos

function uxRoute(){
  const v = state.view, mid = state.modalityId;
  switch(v){
    case 'modality': return '#/';
    case 'home': case 'construction': return mid ? '#/m/'+mid : '#/';
    case 'refs': return '#/m/us/refs' + (state.specialty ? '/'+state.specialty : '');
    case 'detail': return state.item ? '#/r/'+state.item.id : '#/';
    case 'calc':
      if(state.calcId) return '#/c/'+state.calcId;
      if(mid) return '#/m/'+mid+'/'+(state.calcKind||'calc');
      return '#/calculadoras';
    case 'calcs': { const f = state.calcsFilter||'all'; return '#/calculadoras' + (f!=='all' ? '/'+f : ''); }
    case 'favoritos': return '#/favoritos';
    case 'novalista': return state.composingId ? '#/listas/'+state.composingId : '#/listas';
    case 'ferramentas': return '#/ferramentas';
    case 'contraste': return '#/contraste';
    case 'contrasteItem': return '#/contraste/'+(state.contrasteId||'');
    case 'config': return '#/config';
    case 'termsRead': return '#/termos';
    case 'busca': return '#/busca';
    default: return null;
  }
}
// O que define "uma tela nova" (empilha no histórico). Trocar faixa etária,
// especialidade ou filtro só atualiza o endereço (replace).
function uxKey(){
  return [state.view, state.modalityId, state.calcId, state.calcKind, state.item&&state.item.id, state.composingId, state.contrasteId].join('|');
}
function uxSnap(){
  return {view:state.view, modalityId:state.modalityId, calcId:state.calcId, calcKind:state.calcKind, calcSpec:state.calcSpec,
    itemId:state.item&&state.item.id, composingId:state.composingId, specialty:state.specialty, subBand:state.subBand,
    contrasteId:state.contrasteId, calcsFilter:state.calcsFilter, sub:state.sub};
}
function uxRestore(sn){
  ['view','modalityId','calcId','calcKind','calcSpec','composingId','specialty','subBand','contrasteId','calcsFilter','sub'].forEach(k=>{ state[k]=sn[k]; });
  if(sn.itemId){ const d = DATA.find(x=>x.id===sn.itemId); if(d) state.item = d; }
}
// Endereço → estado (link direto / atualizar a página). false = rota desconhecida.
function uxApplyRoute(hash){
  const parts = String(hash||'').replace(/^#\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);
  Object.assign(state, {view:'modality', calcId:null, calcKind:null, composingId:null});
  const a = parts[0];
  if(!a) return true;
  if(a==='m'){
    const m = MODALITIES.find(x=>x.id===parts[1]); if(!m) return false;
    state.modalityId = m.id;
    const b = parts[2];
    if(!m.active){ state.view='construction'; return true; }
    if(!b){ state.view='home'; return true; }
    if(b==='refs' && m.id==='us'){
      state.view='refs';
      const sp = SPECIALTIES.find(x=>x.id===parts[3]);
      if(sp){ state.specialty=sp.id; state.openSpec=sp.id; }
      return true;
    }
    if(b==='calc'){ state.calcsFilter=m.id; state.view='calcs'; return true; }
    if(b==='ref' || b==='proto'){ state.view='calc'; state.calcKind=b; return true; }
    return false;
  }
  if(a==='r'){ const d = DATA.find(x=>x.id===parts[1]); if(!d) return false; state.item=d; state.view='detail'; state.sub='tabela'; return true; }
  if(a==='c'){
    const c = findCalc(parts[1]); if(!c || c.href) return false;
    if(c.modality && c.modality!=='us'){ state.modalityId=c.modality; state.calcKind=c.kind||'calc'; }
    else if(c.spec){ state.modalityId='us'; state.calcSpec=c.spec; }
    else state.modalityId=null;
    state.calcId=c.id; state.view='calc'; return true;
  }
  if(a==='calculadoras'){
    const f = CALC_FILTERS.some(x=>x[0]===parts[1]) ? parts[1] : 'all';
    state.calcsFilter=f; state.calcsQ=''; state.modalityId=(f==='all'||f==='geral')?null:f; state.view='calcs'; return true;
  }
  if(a==='favoritos'){ state.view='favoritos'; return true; }
  if(a==='listas'){ state.view='novalista'; if(parts[1] && state.lists.some(l=>l.id===parts[1])) state.composingId=parts[1]; return true; }
  if(a==='ferramentas'){ state.view='ferramentas'; return true; }
  if(a==='contraste'){
    if(parts[1] && typeof contrasteTopic==='function' && contrasteTopic(parts[1])){ state.contrasteId=parts[1]; state.view='contrasteItem'; }
    else state.view='contraste';
    return true;
  }
  if(a==='config'){ state.view='config'; return true; }
  if(a==='termos'){ state.view='termsRead'; return true; }
  if(a==='busca'){ state.view='busca'; return true; }
  return false;
}
function uxSyncHistory(){
  if(!state.termsAccepted || state.view==='terms') return;
  const route = uxRoute(); if(!route) return;
  const key = uxKey();
  const d0 = (history.state && history.state.d) || 0;
  if(_uxPopping){ _uxPopping = false; _uxCur = {key, route}; return; }
  try{
    if(!_uxCur || _uxReplaceNext){
      history.replaceState({ux:1, d:_uxCur?d0:0, snap:uxSnap()}, '', route);
    } else if(key !== _uxCur.key){
      history.pushState({ux:1, d:d0+1, snap:uxSnap()}, '', route);
    } else if(route !== _uxCur.route){
      history.replaceState({ux:1, d:d0, snap:uxSnap()}, '', route);
    }
  }catch(_){}
  _uxReplaceNext = false;
  _uxCur = {key, route};
}
// Voltar de dentro do app: usa o histórico do navegador; sem histórico (link
// direto), vai ao início substituindo a entrada atual.
function uxBack(){
  if(_uxSheetOpen){ uxCloseSheet(); return true; }
  const d = history.state && history.state.d;
  if(d > 0){ history.back(); return true; }
  _uxReplaceNext = true;
  return false;
}
window.addEventListener('popstate', function(e){
  if(_uxSheetOpen){ _uxSheetEntry=false; uxHideSheet(); return; }
  if(e.state && e.state.sheet){ history.back(); return; }
  _uxPopping = true;
  if(e.state && e.state.snap) uxRestore(e.state.snap);
  else if(!uxApplyRoute(location.hash)) state.view = 'modality';
  render();
});
// Termos aceitos: abre a rota pedida na URL (se houver) em vez do início.
function uxApplyPending(){
  const h = _uxPending; _uxPending = '';
  if(h && h!=='#' && h!=='#/' && uxApplyRoute(h)){ _uxCur = null; render(); return true; }
  return false;
}

/* ============================ título da aba ============================ */
function uxTitle(){
  try{
    const t = viewTitle().title;
    document.title = t ? t+' · KlugRads' : 'KlugRads — Sua referência em Radiologia';
  }catch(_){}
}

/* ============================ 2. BARRA INFERIOR + MAIS ============================ */
var _uxSheetOpen = false, _uxSheetEntry = false;
function uxTabs(){
  return [
    ['home','Início','home',"goInicio()"],
    ['busca','Buscar','search',"setView('busca')"],
    ['calc','Calcular','calc',"openCalcsView('all')"],
    ['fav','Favoritos','star',"setView('favoritos')"],
    ['more','Mais','more',"uxOpenSheet()"],
  ];
}
function uxTabActive(){
  const v = state.view;
  if(_uxSheetOpen) return 'more';
  if(v==='busca') return 'busca';
  if(v==='calcs' || v==='calc') return 'calc';
  if(v==='favoritos' || v==='novalista') return 'fav';
  if(v==='config' || v==='termsRead' || v==='ferramentas' || v==='contraste' || v==='contrasteItem') return 'more';
  return 'home';
}
function uxRenderTabbar(){
  const el = $('tabbar'); if(!el) return;
  if(!state.termsAccepted || state.view==='terms'){ el.hidden = true; return; }
  el.hidden = false;
  const act = uxTabActive();
  el.innerHTML = uxTabs().map(t=>`<button type="button" class="${act===t[0]?'on':''}" onclick="${t[3]}" ${act===t[0]?'aria-current="page"':''}>${svgIcon(P[t[2]],23,{sw:1.8,fill:(t[2]==='star'&&act===t[0])?'currentColor':'none'})}<span>${t[1]}</span></button>`).join('');
}
function uxSheetHTML(){
  const light = state.theme==='light', pct = Math.round(state.fontScale*100);
  const i = FONT_STEPS.indexOf(state.fontScale);
  const row = (icon,t,sub,act,end)=>`<button type="button" class="sheet-row" onclick="${act}"><span class="si">${icon}</span><span class="tx">${t}${sub?`<div class="sub">${sub}</div>`:''}</span><span class="end">${end||svgIcon(P.chev,16,{sw:2})}</span></button>`;
  return `<div class="sheet-bg" onclick="uxCloseSheet()"></div>
  <div class="sheet-card">
    <div class="sheet-grab"></div>
    <div class="sheet-ctl"><div class="lbl">Tema<div class="sub">Dia ou noite</div></div>
      <div class="set-seg">
        <button type="button" class="${light?'on':''}" onclick="setTheme('light')">${svgIcon(P.sun,16,{sw:2})} Dia</button>
        <button type="button" class="${!light?'on':''}" onclick="setTheme('dark')">${svgIcon(P.moon,16,{sw:2})} Noite</button>
      </div></div>
    <div class="sheet-ctl"><div class="lbl">Tamanho da fonte<div class="sub">Aumenta ou diminui todo o app</div></div>
      <div class="set-step">
        <button type="button" onclick="stepFont(-1)" ${i<=0?'disabled':''} aria-label="Diminuir fonte">−</button>
        <div class="val">${pct}%</div>
        <button type="button" onclick="stepFont(1)" ${i>=FONT_STEPS.length-1?'disabled':''} aria-label="Aumentar fonte">+</button>
      </div></div>
    ${row(svgIcon(P.listplus,19),'Listas','Pacotes para o plantão',"uxGo('novalista')")}
    ${row(svgIcon(P.tools,19),'Outras Ferramentas','Meios de contraste, TFG e mais',"uxGo('ferramentas')")}
    ${row(svgIcon(P.dicom,19),'Visualizador DICOM','Abre em uma nova aba','uxOpenViewer()',svgIcon(P.ext,16,{sw:2}))}
    ${row(svgIcon(P.link,19),'Copiar link desta tela','Para enviar a um colega','uxCopyLink()',svgIcon(P.copy,16,{sw:2}))}
    ${row(svgIcon(P.gear,19),'Configurações','Sugestões e termos de uso',"uxGo('config')")}
  </div>`;
}
function uxOpenSheet(){
  if(_uxSheetOpen) return;
  const el = $('sheet'); if(!el) return;
  _uxSheetOpen = true;
  el.innerHTML = uxSheetHTML(); el.hidden = false;
  try{ history.pushState({ux:1, d:((history.state&&history.state.d)||0)+1, sheet:1}, '', location.href); _uxSheetEntry = true; }catch(_){ _uxSheetEntry = false; }
  uxRenderTabbar();
  const card = el.querySelector('.sheet-card'); if(card){ card.tabIndex = -1; try{ card.focus({preventScroll:true}); }catch(_){} }
}
function uxHideSheet(){
  const el = $('sheet'); if(el){ el.hidden = true; el.innerHTML = ''; }
  _uxSheetOpen = false; uxRenderTabbar();
}
function uxCloseSheet(){
  if(!_uxSheetOpen) return;
  if(_uxSheetEntry){ _uxSheetEntry = false; history.back(); }   // o popstate esconde o menu
  else uxHideSheet();
}
function uxRefreshSheet(){ const el = $('sheet'); if(_uxSheetOpen && el) el.innerHTML = uxSheetHTML(); }
function uxGo(view){ _uxSheetEntry = false; uxHideSheet(); _uxReplaceNext = true; setView(view); }
function uxOpenViewer(){ openViewer(); }
function uxCopyLink(){
  _uxSheetEntry ? (_uxSheetEntry = false, history.back()) : uxHideSheet();
  setTimeout(function(){ klugCopy(location.href.split('#')[0] + (uxRoute()||''), 'Link copiado'); }, 60);
}

/* ============================ 3. DOCK DE RESULTADO ============================ */
function uxResultEls(){ return Array.prototype.slice.call(document.querySelectorAll('#scroll .ti-res, #scroll .tfg-result, #scroll #fm-out')); }
var _uxDockTimer = null, _uxDockRaf = 0;
function uxSetDock(dock, html){ if(dock._h !== html){ dock.innerHTML = html; dock._h = html; } }
function uxScheduleDock(){ clearTimeout(_uxDockTimer); _uxDockTimer = setTimeout(uxUpdateDock, 110); }
function uxUpdateDock(){
  const dock = $('resdock'); if(!dock) return;
  const on = state.view==='calc' && state.calcId && !_uxSheetOpen;
  const parts = on ? collectResultParts() : [];
  if(!parts.length){ dock.hidden = true; dock.className = 'resdock'; return; }
  // Cartão lateral só quando sobra espaço ao lado do conteúdo da calculadora (senão, dock no rodapé)
  let wide = false;
  try{
    const app = $('app'), c = $('scroll').firstElementChild;
    if(c && window.matchMedia('(min-width:900px)').matches){
      const ar = app.getBoundingClientRect(), cr = c.getBoundingClientRect();
      wide = (ar.right - cr.right) >= 340;
    }
  }catch(_){}
  if(wide){
    dock.className = 'resdock rail show';
    uxSetDock(dock, `<div class="rd-h">Resultado</div>` + parts.map(p=>`<div class="rd-part">${esc(p)}</div>`).join('')
      + `<button type="button" class="rd-btn" onclick="copyCalcResult()">${svgIcon(P.copy,15,{sw:2})} Copiar resultado</button>`);
    dock.hidden = false; return;
  }
  const sc = $('scroll'), sr = sc.getBoundingClientRect();
  const visible = uxResultEls().some(el=>{ const r = el.getBoundingClientRect(); return r.height>0 && r.bottom>sr.top+8 && r.top<sr.bottom-8; });
  if(visible){ dock.hidden = true; dock.className = 'resdock'; return; }
  dock.className = 'resdock show';
  uxSetDock(dock, `<div class="rd-tx">${esc(parts.join(' · '))}</div>`
    + `<button type="button" class="rd-up" aria-label="Ir ao resultado" onclick="uxToResult()">${svgIcon(P.chevd,18,{sw:2.4})}</button>`
    + `<button type="button" class="rd-btn" onclick="copyCalcResult()">${svgIcon(P.copy,15,{sw:2})} Copiar</button>`);
  dock.hidden = false;
}
function uxToResult(){ const els = uxResultEls(); if(els[0]) els[0].scrollIntoView({behavior:'smooth', block:'center'}); }

/* ============================ 4. TECLADO E FOCO ============================ */
var UX_NATIVE = {BUTTON:1, A:1, INPUT:1, SELECT:1, TEXTAREA:1, LABEL:1, SUMMARY:1};
// <a onclick> sem href não é focável nem ativa com Enter: trata como botão
function uxIsNative(el){ return !!UX_NATIVE[el.tagName] && !(el.tagName==='A' && !el.hasAttribute('href')); }
function uxEnhance(root){
  (root || document).querySelectorAll('[onclick]').forEach(function(el){
    if(uxIsNative(el)) return;
    if(!el.hasAttribute('role')) el.setAttribute('role','button');
    if(!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if(el.classList.contains('ti-ftog') || el.classList.contains('tfg-opt') || el.classList.contains('chip') || el.classList.contains('pick-box'))
      el.setAttribute('aria-pressed', el.classList.contains('on') ? 'true' : 'false');
  });
}
function uxTyping(t){ return t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.tagName==='SELECT' || t.isContentEditable); }
document.addEventListener('keydown', function(e){
  const t = e.target;
  // Enter / Espaço ativam cartões, linhas e chips (elementos com role=button que não são <button>)
  if((e.key==='Enter' || e.key===' ') && t && t.getAttribute && t.getAttribute('role')==='button' && !uxIsNative(t)){
    e.preventDefault(); t.click(); return;
  }
  if(e.key==='Escape'){
    if(_uxSheetOpen){ uxCloseSheet(); return; }
    if(uxTyping(t)){ t.blur(); return; }
    if(state.termsAccepted && state.view!=='modality' && state.view!=='terms'){ goBack(); }
    return;
  }
  // "/" ou Ctrl/Cmd+K: busca
  if((e.key==='/' && !uxTyping(t) && !e.ctrlKey && !e.metaKey && !e.altKey) || ((e.ctrlKey||e.metaKey) && (e.key==='k' || e.key==='K'))){
    if(!state.termsAccepted) return;
    e.preventDefault();
    const side = $('side-q'), home = $('home-q');
    if(side && side.offsetParent) side.focus();
    else if(home && home.offsetParent) home.focus();
    else setView('busca');
  }
});
// Teclado virtual aberto no celular: esconde a barra inferior (não fica sobre o teclado)
document.addEventListener('focusin', function(e){
  if(uxTyping(e.target) && e.target.type!=='checkbox' && window.matchMedia && window.matchMedia('(max-width:899px)').matches) document.body.classList.add('kbd');
});
document.addEventListener('focusout', function(){ setTimeout(function(){ if(!uxTyping(document.activeElement)) document.body.classList.remove('kbd'); }, 60); });

/* ============================ 5. REFERÊNCIA FIXADA ============================ */
var _uxPin = null;
function uxLoadPin(){ try{ _uxPin = sessionStorage.getItem('radref_pin') || null; }catch(_){ _uxPin = null; } }
function uxPin(id){
  if(_uxPin===id){ uxUnpin(); return; }
  _uxPin = id; try{ sessionStorage.setItem('radref_pin', id); }catch(_){}
  render(true);
}
function uxUnpin(){ _uxPin = null; try{ sessionStorage.removeItem('radref_pin'); }catch(_){} render(true); }
function uxPinned(){ return _uxPin; }
function uxRenderPin(){
  const el = $('pinpanel'); if(!el) return;
  const d = _uxPin ? DATA.find(x=>x.id===_uxPin) : null;
  if(!d){ el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const tables = (d.tables||[]).map((t,i)=>tableHTML(t,'pin-'+d.id+'-'+i)).join('');
  const notes = (d.footnotes&&d.footnotes.length) ? `<div class="note">${d.footnotes.map(f=>nl2br(f)).join('<br>')}</div>` : '';
  el.innerHTML = `<div class="pin-head"><div class="t"><div class="k">${ic('pin',11,{sw:2.2})} Fixado</div>${esc(d.name)}</div>
      <button type="button" onclick="openItem('${esc(d.id)}')" aria-label="Abrir ${esc(d.name)}" title="Abrir">${svgIcon(P.ext,17,{sw:2})}</button>
      <button type="button" onclick="uxUnpin()" aria-label="Desafixar" title="Desafixar">${svgIcon(P.close,18,{sw:2.2})}</button></div>
    <div class="pin-body">${tables}${notes}</div>`;
  uxEnhance(el);
}

/* ============================ gancho chamado por render() ============================ */
function uxAfterRender(keep){
  uxSyncHistory();
  uxTitle();
  uxRenderTabbar();
  uxRenderPin();
  uxEnhance($('app')); uxEnhance($('side'));
  uxScheduleDock();
}
var _uxObsTimer = null;
(function(){
  const sc = $('scroll');
  if(sc){
    sc.addEventListener('scroll', function(){ if(_uxDockRaf) return; _uxDockRaf = requestAnimationFrame(function(){ _uxDockRaf = 0; uxUpdateDock(); }); }, {passive:true});
    if(window.MutationObserver){
      new MutationObserver(function(){ uxScheduleDock(); clearTimeout(_uxObsTimer); _uxObsTimer = setTimeout(function(){ uxEnhance($('scroll')); }, 30); })
        .observe(sc, {childList:true, subtree:true, characterData:true});
    }
  }
  window.addEventListener('resize', uxScheduleDock);
})();

/* ============================ boot ============================ */
(function(){
  uxLoadPin();
  const h = location.hash;
  if(!state.termsAccepted){ _uxPending = h; }
  else if(h && h!=='#' && h!=='#/'){ if(!uxApplyRoute(h)) Object.assign(state,{view:'modality'}); }
  render();
})();
