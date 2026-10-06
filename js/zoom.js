/* =========================================================================
   KlugRads — Visualizador de imagens (ampliar sem sair da página)
   ---------------------------------------------------------------------------
   REGRA DO SITE: toda imagem hospedada no site (<img src="/img/…">) abre ampliada
   DENTRO do app, por cima da tela atual, e o usuário sempre consegue fechar e
   continuar de onde estava. Nunca usar <a target="_blank"> para ampliar imagem
   (no app instalado não há botão de voltar).

   Como fechar: botão "Fechar" (topo), tecla Esc, toque fora da imagem e o botão
   Voltar do aparelho/navegador (entra no histórico ao abrir e sai ao fechar).
   Como ampliar: pinça, roda do mouse, duplo toque/clique, botões + e −, "Ajustar".
   Arrastar para mover a imagem ampliada.

   Quem entra: <img> com src em /img/ (mesma origem) ou com data-zoom.
   Quem fica de fora: <img data-nozoom>; imagem dentro de <a href> ou <button>
   (já tem ação própria); imagens desenhadas em canvas (os mapas têm zoom próprio).
   Imagem nova no site = só usar <img src="/img/…">; nada mais a fazer.
   ========================================================================= */
(function(){
  'use strict';
  if(window.kzOpen) return;

  var css = [
    '#kz-ov{position:fixed;left:0;top:0;right:0;bottom:0;z-index:10000;background:rgba(5,8,12,.95);display:flex;flex-direction:column;touch-action:none;overscroll-behavior:contain;-webkit-tap-highlight-color:transparent}',
    '#kz-ov[hidden]{display:none}',
    '#kz-ov .kz-bar{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top) + 8px) calc(env(safe-area-inset-right) + 12px) 8px calc(env(safe-area-inset-left) + 12px)}',
    '#kz-ov .kz-sp{flex:1}',
    '#kz-ov .kz-btn{min-width:44px;height:44px;box-sizing:border-box;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;font:600 15px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}',
    '#kz-ov .kz-btn:active{transform:scale(.96)}',
    '#kz-ov .kz-btn:focus-visible{outline:2px solid #12a9c9;outline-offset:2px}',
    '#kz-ov .kz-close{background:#fff;color:#0b1218;border-color:#fff}',
    '#kz-ov .kz-stage{position:relative;flex:1 1 auto;overflow:hidden;touch-action:none;cursor:grab}',
    '#kz-ov .kz-stage.kz-grabbing{cursor:grabbing}',
    '#kz-ov .kz-img{position:absolute;left:0;top:0;max-width:none;transform-origin:0 0;background:#fff;user-select:none;-webkit-user-select:none;-webkit-user-drag:none;will-change:transform}',
    '#kz-ov .kz-hint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 18px);transform:translateX(-50%);max-width:92%;padding:8px 14px;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font:500 13px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;pointer-events:none;opacity:0;transition:opacity .25s}',
    '#kz-ov .kz-hint.kz-on{opacity:1}',
    'img[data-kz="1"]{cursor:zoom-in}',
    'img[data-kz="1"]:focus-visible{outline:2px solid #12a9c9;outline-offset:2px}'
  ].join('\n');

  var ov, stage, img, hint, btnClose, zoomLbl;
  var K = {open:false, s:1, fit:1, max:4, tx:0, ty:0, nw:0, nh:0, ptrs:{}, n:0, drag:null, last:0, lastX:0, lastY:0, lastDist:0, lx:0, ly:0, prevFocus:null, hintT:0, pinched:false};

  /* ---------- quais imagens entram ---------- */
  function eligible(el){
    if(!el || el.tagName!=='IMG') return false;
    if(el.closest('#kz-ov') || el.hasAttribute('data-nozoom')) return false;
    if(el.closest('a[href], button')) return false;
    if(el.hasAttribute('data-zoom')) return true;
    try{
      var u = new URL(el.currentSrc || el.src, location.href);
      return u.origin===location.origin && u.pathname.indexOf('/img/')===0;
    }catch(e){ return false; }
  }

  /* ---------- montagem (uma vez) ---------- */
  function build(){
    if(ov) return;
    var st = document.createElement('style'); st.id='kz-css'; st.textContent = css; document.head.appendChild(st);
    ov = document.createElement('div');
    ov.id = 'kz-ov'; ov.hidden = true;
    ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-label','Imagem ampliada');
    ov.innerHTML =
      '<div class="kz-bar">'+
        '<button type="button" class="kz-btn" data-a="out" aria-label="Diminuir a imagem">−</button>'+
        '<button type="button" class="kz-btn" data-a="fit" aria-label="Ajustar à tela"><span class="kz-lbl">100%</span></button>'+
        '<button type="button" class="kz-btn" data-a="in" aria-label="Ampliar a imagem">+</button>'+
        '<span class="kz-sp"></span>'+
        '<button type="button" class="kz-btn kz-close" data-a="close" aria-label="Fechar a imagem">'+
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>Fechar'+
        '</button>'+
      '</div>'+
      '<div class="kz-stage"><img class="kz-img" alt="" draggable="false"><div class="kz-hint" aria-hidden="true">Pince para ampliar · arraste para mover · toque fora para fechar</div></div>';
    document.body.appendChild(ov);
    stage = ov.querySelector('.kz-stage'); img = ov.querySelector('.kz-img'); hint = ov.querySelector('.kz-hint');
    btnClose = ov.querySelector('.kz-close'); zoomLbl = ov.querySelector('.kz-lbl');

    ov.querySelector('.kz-bar').addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b) return;
      var a = b.getAttribute('data-a');
      if(a==='close') close();
      else if(a==='in') zoomBy(1.5, cx(), cy());
      else if(a==='out') zoomBy(1/1.5, cx(), cy());
      else if(a==='fit') reset();
    });
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('wheel', function(e){
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      zoomBy(Math.exp(-e.deltaY*0.0016), e.clientX-r.left, e.clientY-r.top);
    }, {passive:false});
    stage.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    img.addEventListener('load', init);
    window.addEventListener('resize', function(){ if(K.open) init(true); });
  }
  function cx(){ return stage.clientWidth/2; }
  function cy(){ return stage.clientHeight/2; }

  /* ---------- geometria ---------- */
  /* s = zoom relativo ao "ajustar à tela" (1 = a imagem inteira cabe); k = escala real aplicada */
  function init(keepView){
    if(!img.naturalWidth) return;
    var W = stage.clientWidth, H = stage.clientHeight;
    K.nw = img.naturalWidth; K.nh = img.naturalHeight;
    K.fit = Math.min(Math.min((W-16)/K.nw, (H-16)/K.nh), 2);
    if(K.fit<=0) K.fit = 1;
    K.max = Math.min(8, Math.max(4, 2.5/K.fit));         // dá para ampliar até ~2,5× o tamanho original
    if(keepView!==true){ K.s = 1; K.tx = 0; K.ty = 0; }
    img.style.width = K.nw+'px'; img.style.height = K.nh+'px';
    layout();
  }
  function layout(){
    var W = stage.clientWidth, H = stage.clientHeight, k = K.fit*K.s, dw = K.nw*k, dh = K.nh*k;
    K.tx = dw<=W ? (W-dw)/2 : Math.min(0, Math.max(W-dw, K.tx));   // centraliza ou impede de sair da tela
    K.ty = dh<=H ? (H-dh)/2 : Math.min(0, Math.max(H-dh, K.ty));
    img.style.transform = 'translate('+K.tx+'px,'+K.ty+'px) scale('+k+')';
    zoomLbl.textContent = Math.round(K.s*100)+'%';
  }
  function zoomBy(f, px, py){
    var ns = Math.min(K.max, Math.max(1, K.s*f));
    if(ns===K.s) return;
    var k = K.fit*K.s, k2 = K.fit*ns;
    K.tx = px - (px-K.tx)/k*k2;                                      // mantém o ponto sob o dedo/cursor
    K.ty = py - (py-K.ty)/k*k2;
    K.s = ns; layout();
  }
  function reset(){ K.s = 1; K.tx = 0; K.ty = 0; layout(); }

  /* ---------- gestos ---------- */
  function dist(){ var a=[],i; for(i in K.ptrs) a.push(K.ptrs[i]); return Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y); }
  function mid(){ var a=[],i; for(i in K.ptrs) a.push(K.ptrs[i]); return {x:(a[0].x+a[1].x)/2, y:(a[0].y+a[1].y)/2}; }
  function local(e){ var r = stage.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; }
  function onDown(e){
    var p = local(e);
    K.ptrs[e.pointerId] = p; K.n = Object.keys(K.ptrs).length;
    try{ stage.setPointerCapture(e.pointerId); }catch(_){}
    if(K.n===1){ K.drag = {x:p.x, y:p.y, t:Date.now(), moved:false, onImg:e.target===img}; K.pinched = false; stage.classList.add('kz-grabbing'); }
    else if(K.n===2){ K.drag = null; K.pinched = true; K.lastDist = dist(); var m = mid(); K.lastX = m.x; K.lastY = m.y; }
  }
  function onMove(e){
    if(!K.ptrs[e.pointerId]) return;
    var p = local(e); K.ptrs[e.pointerId] = p;
    if(K.n===2){
      var d = dist(), m = mid();
      if(K.lastDist>0) zoomBy(d/K.lastDist, m.x, m.y);
      K.tx += m.x-K.lastX; K.ty += m.y-K.lastY; layout();
      K.lastDist = d; K.lastX = m.x; K.lastY = m.y;
    } else if(K.n===1 && K.drag){
      var dx = p.x-K.drag.x, dy = p.y-K.drag.y;
      if(!K.drag.moved && Math.hypot(dx,dy)>5) K.drag.moved = true;
      if(K.drag.moved){ K.tx += dx; K.ty += dy; K.drag.x = p.x; K.drag.y = p.y; layout(); }
    }
  }
  function onUp(e){
    var had = K.ptrs[e.pointerId]; if(!had) return;
    var p = local(e);
    delete K.ptrs[e.pointerId]; K.n = Object.keys(K.ptrs).length;
    if(K.n===0) stage.classList.remove('kz-grabbing');
    if(K.n===1){ var rest = K.ptrs[Object.keys(K.ptrs)[0]]; K.drag = {x:rest.x, y:rest.y, t:Date.now(), moved:true, onImg:true}; return; }
    var d = K.drag; K.drag = null;
    if(!d || d.moved || K.pinched || e.type==='pointercancel') return;
    // toque simples (sem arrastar)
    if(!d.onImg){ close(); return; }                                // toque fora da imagem fecha
    var now = Date.now();
    if(now-K.last<320 && Math.hypot(p.x-K.lx, p.y-K.ly)<30){        // duplo toque/clique: alterna zoom
      if(K.s>1.05) reset(); else zoomBy(Math.min(K.max, 2.5), p.x, p.y);
      K.last = 0;
    } else { K.last = now; K.lx = p.x; K.ly = p.y; }
  }

  /* ---------- abrir / fechar ---------- */
  function open(el){
    build();
    if(K.open) return;
    K.open = true; K.prevFocus = document.activeElement;
    K.ptrs = {}; K.n = 0; K.drag = null; K.last = 0;
    ov.hidden = false;
    document.body.style.overflow = 'hidden';
    try{ history.pushState({kz:1}, '', location.href); }catch(_){}    // o Voltar do aparelho fecha a imagem
    img.alt = el.getAttribute('alt') || '';
    var src = el.currentSrc || el.src;
    if(img.getAttribute('src')===src && img.complete) init(); else { img.removeAttribute('src'); img.src = src; }
    ov.querySelector('.kz-close').focus();
    hint.classList.add('kz-on'); clearTimeout(K.hintT); K.hintT = setTimeout(function(){ hint.classList.remove('kz-on'); }, 3500);
  }
  function close(viaPop){
    if(!K.open) return;
    K.open = false; ov.hidden = true; clearTimeout(K.hintT); hint.classList.remove('kz-on');
    document.body.style.overflow = '';
    img.removeAttribute('src');
    if(viaPop!==true && history.state && history.state.kz){ try{ history.back(); }catch(_){} }
    var pf = K.prevFocus; K.prevFocus = null;
    if(pf && pf.focus && document.contains(pf)){ try{ pf.focus({preventScroll:true}); }catch(_){} }
  }
  window.kzOpen = open; window.kzClose = close;

  window.addEventListener('popstate', function(){ if(K.open) close(true); });
  document.addEventListener('keydown', function(e){
    if(K.open){
      if(e.key==='Escape'){ e.preventDefault(); close(); }
      else if(e.key==='+' || e.key==='='){ e.preventDefault(); zoomBy(1.5, cx(), cy()); }
      else if(e.key==='-'){ e.preventDefault(); zoomBy(1/1.5, cx(), cy()); }
      else if(e.key==='0'){ e.preventDefault(); reset(); }
      else if(e.key==='Tab'){                                         // mantém o foco dentro do visualizador
        var f = ov.querySelectorAll('button'), first = f[0], last = f[f.length-1];
        if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
      }
      return;
    }
    if((e.key==='Enter' || e.key===' ') && eligible(e.target)){ e.preventDefault(); open(e.target); }
  });
  document.addEventListener('click', function(e){
    var t = e.target;
    if(t && t.tagName==='IMG' && eligible(t)){ e.preventDefault(); open(t); }
  });

  /* ---------- marca as imagens que abrem ampliadas (cursor, foco por teclado) ---------- */
  function decorate(){
    var list = document.querySelectorAll('img:not([data-kz])'), i, el;
    for(i=0; i<list.length; i++){
      el = list[i];
      if(eligible(el)){
        el.setAttribute('data-kz','1'); el.tabIndex = 0; el.setAttribute('role','button');
        if(!el.title) el.title = 'Toque para ampliar';
      } else el.setAttribute('data-kz','0');
    }
    if(!document.getElementById('kz-css-pre')){
      var st = document.createElement('style'); st.id='kz-css-pre';
      st.textContent = 'img[data-kz="1"]{cursor:zoom-in}img[data-kz="1"]:focus-visible{outline:2px solid #12a9c9;outline-offset:2px}';
      document.head.appendChild(st);
    }
  }
  var pend = false;
  function schedule(){ if(pend) return; pend = true; setTimeout(function(){ pend = false; decorate(); }, 40); }   // setTimeout: o rAF pára com a janela em segundo plano
  function start(){ decorate(); try{ new MutationObserver(schedule).observe(document.body, {childList:true, subtree:true}); }catch(_){} }
  if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
