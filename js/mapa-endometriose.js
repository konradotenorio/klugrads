/* =========================================================================
   KlugRads — Mapa Setorial Lesional · PELVE (Endometriose)
   ---------------------------------------------------------------------------
   Segundo órgão do Mapa Setorial Lesional (o primeiro é a PRÓSTATA / PI-RADS).
   O médico escolhe o corte (axial, sagital ou coronal), posiciona útero e ovários
   e marca os achados por cima da imagem, com o mesmo estilo de pintura do mapa da
   próstata: pincel, borracha, desfazer, zoom, legenda pequena dentro da imagem e
   exportação (copiar / baixar JPEG).

   Achados (3 cores): ENDOMETRIOSE (preto, pincel espiculado/irregular),
   ENDOMETRIOMA (vinho) e SANGUE (vermelho).

   As imagens (/img/endomap/) são do EndoMap (3Doctor) e são usadas na parceria
   3Doctor × KlugRads. Existe uma imagem por combinação de posicionamento:
     axial   (sup): útero × lateralização × ovário D × ovário E   (90)
     sagital (sag): útero × lateralização × ovário D              (30)
     coronal (abd): uma só                                         (1)
   O corte axial é mostrado como VISÃO VIDEOLAPAROSCÓPICA (a imagem original, sem
   espelhar): anterior no alto, posterior embaixo, esquerdo do paciente à esquerda da
   imagem e direito à direita. Título e as quatro orientações são desenhados na própria
   imagem (orientacao()), então vão junto na cópia/JPEG exportados.

   Estado em memória (state.msl.em), como o resto do Mapa Setorial Lesional.
   Tudo roda no navegador: nenhuma imagem ou desenho sai do aparelho.
   ========================================================================= */
(function(){
'use strict';

const BASE = '/img/endomap/';
const FLEX  = [['med','Mediofletido'],['ant','Antefletido'],['ret','Retrofletido'],['sem','Histerectomia']];
const LADO  = [['c','Centralizado'],['e','Lateralizado à Esquerda'],['d','Lateralizado à Direita']];
const OV    = [['p','Parauterino'],['r','Retrouterino'],['n','Não visibilizado']];
const CORTES= [['sup','Axial (Pelve)'],['sag','Sagital (Pelve)'],['abd','Coronal (Abdome Superior)']];
const LES = [
  {id:1, nome:'Endometriose', cor:'#111111', cn:'PRETO'},
  {id:2, nome:'Endometrioma', cor:'#7A1F3D', cn:'VINHO'},
  {id:3, nome:'Sangue',       cor:'#E11D2E', cn:'VERMELHO'},
];
const MARCA = 'Imagem ilustrada e editada em KlugRads';
const ALPHA = 0.72, ZMAX = 8;
const REFW = 1103;                      // largura (px) das imagens originais; as atuais são 2× maiores: pincel e cursor escalam com R.K

/* ---- estado (em memória) ---- */
function st(){
  const m = mslState();
  if(!m.em) m.em = {pos:{corte:'sup',flex:'med',lado:'c',ovD:'p',ovE:'p'}, cor:1, tool:'brush', w:18, legend:true,
                    strokes:{sup:[],sag:[],abd:[]}, redo:{sup:[],sag:[],abd:[]}, full:false};
  return m.em;
}
/* runtime (não vai para o state): canvases, imagem, gesto em curso */
const R = {view:null, IW:0, IH:0, K:1, fw:0, fh:0, k:1, tx:0, ty:0, W:0, H:0, img:null, ready:false,
           ptrs:new Map(), stroke:null, pan:null, pinch:null, used:[false,false,false], usedKey:'', scan:null,
           tok:0, bctx:null, pctx:null, rect:null, wired:false};
const g = id => document.getElementById(id);

/* ======================= tela ======================= */
function arquivo(){
  const p = st().pos, u = p.flex, l = u==='sem' ? 'c' : p.lado;
  if(p.corte==='sup') return `${BASE}sup/${u}_${l}_D${p.ovD}_E${p.ovE}.webp`;
  if(p.corte==='sag') return `${BASE}sag/${u}_${l}_D${p.ovD}.webp`;
  return BASE + 'abd/abd.webp';
}
function ctlHTML(){
  const s = st(), p = s.pos, sem = p.flex==='sem';
  const chips = (k,opts,dis) => opts.map(o=>`<button type="button" class="ti-ftog ${p[k]===o[0]?'on':''}" data-em="pos" data-k="${k}" data-v="${o[0]}"${dis?' disabled style="opacity:.4;cursor:default"':''}>${esc(o[1])}</button>`).join('');
  const row = (lbl,inner) => `<div class="em-rw"><div class="em-rl">${esc(lbl)}</div>${inner}</div>`;
  const cores = LES.map(c=>`<button type="button" class="msl-cor${s.cor===c.id&&s.tool==='brush'?' on':''}" data-em="cor" data-v="${c.id}" style="--c:${c.cor}" title="${esc(c.nome)} (${esc(c.cn)})"><span class="msl-dot"></span><span class="msl-cl">${esc(c.nome)}<span class="em-sub">${esc(c.cn)}</span></span></button>`).join('');
  return row('Corte',`<div class="em-chips">${chips('corte',CORTES)}</div>`)
       + row('Flexão do Útero',`<div class="em-chips">${chips('flex',FLEX)}</div>`)
       + row('Lateralização do Útero',`<div class="em-chips">${chips('lado',LADO,sem)}</div>`)
       + row('Ovário Direito',`<div class="em-chips">${chips('ovD',OV)}</div>`)
       + row('Ovário Esquerdo',`<div class="em-chips">${chips('ovE',OV)}</div>`)
       + row('LEGENDA',`<div class="msl-cores em-cores">${cores}</div>`);
}
function html(){
  const s = st();
  const tb = (id,ic,lbl,extra) => `<button type="button" class="msl-btn${extra||''}" id="${id}" title="${lbl}" aria-label="${lbl}">${mslIc(ic)}<span>${lbl}</span></button>`;
  return `<div id="em-root">
    <div class="ti-card em-ctl" id="em-ctl">${ctlHTML()}</div>
    <div class="ti-legend-row" style="margin:0 0 10px"><span class="lt">Posicione os órgãos antes de marcar: a marcação fica no mesmo lugar da tela e não acompanha uma mudança de posição. Cada corte guarda a sua marcação. O corte axial é a visão videolaparoscópica: as bordas indicam anterior, posterior, direito e esquerdo do paciente. Zoom: roda do mouse ou dois dedos; mover a imagem ampliada: botão direito do mouse ou dois dedos.</span></div>
    <div class="msl-ed${s.full?' full':''}" id="em-ed">
      <div class="msl-bar">
        <div class="msl-row">
          ${tb('em-b-brush','pen','Pincel',s.tool==='brush'?' on':'')}${tb('em-b-erase','eraser','Borracha',s.tool==='erase'?' on':'')}
          <label class="msl-size" title="Espessura do pincel"><span>Espessura</span><input type="range" id="em-w" min="4" max="70" step="1" value="${s.w}"></label>
        </div>
        <div class="msl-row">
          ${tb('em-b-undo','undo','Desfazer')}${tb('em-b-redo','redo','Refazer')}${tb('em-b-clear','eraser','Limpar tudo')}
          ${tb('em-b-leg','list','Legenda',s.legend?' on':'')}
          <span class="msl-sp"></span>
          ${tb('em-b-zout','zout','Zoom −')}${tb('em-b-zin','zin','Zoom +')}
          <button type="button" class="msl-btn" id="em-b-fit" title="Ajustar à tela"><span id="em-zoom">100%</span></button>
          <button type="button" class="msl-btn" id="em-b-full" title="Tela cheia">${mslIc(s.full?'exit':'full')}<span>${s.full?'Sair':'Tela cheia'}</span></button>
        </div>
      </div>
      <div class="msl-stage em-stage" id="em-stage">
        <div class="msl-world" id="em-world"><canvas id="em-base"></canvas><canvas id="em-paint"></canvas></div>
        <div class="msl-cur" id="em-cur"></div>
        <div class="msl-msg" id="em-msg">Carregando o mapa…</div>
      </div>
    </div>
    <div class="ti-card" style="margin-top:12px">
      <div class="tfg-sec-lbl">Para o laudo</div>
      <div class="pmap-acts">
        <button type="button" class="lau-frase-btn" id="em-b-copy">${svgIcon(P.copy,16,{sw:2})} Copiar imagem</button>
        <button type="button" class="lau-btn2" id="em-b-down">Baixar JPEG</button>
      </div>
    </div>
  </div>`;
}

/* ======================= inicialização (após cada render) ======================= */
function init(){
  const root = g('em-root'); if(!root) return;
  R.view = null; R.ready = false; R.ptrs.clear(); R.stroke = null; R.pan = null; R.pinch = null; R.usedKey = ''; R.k = 1;
  root.addEventListener('click', onClick);
  g('em-w').addEventListener('input', e=>{ st().w = +e.target.value; });
  const stg = g('em-stage');
  stg.addEventListener('pointerdown', onDown);
  stg.addEventListener('pointermove', onMove);
  stg.addEventListener('pointerup', onUp);
  stg.addEventListener('pointercancel', onUp);
  stg.addEventListener('pointerleave', ()=>{ const c=g('em-cur'); if(c) c.style.display='none'; });
  stg.addEventListener('wheel', e=>{ e.preventDefault(); const r=stg.getBoundingClientRect(); zoomAt(e.clientX-r.left, e.clientY-r.top, R.k*Math.exp(-e.deltaY*0.0016)); }, {passive:false});
  stg.addEventListener('contextmenu', e=>e.preventDefault());
  if(!R.wired){
    R.wired = true;
    window.addEventListener('resize', ()=>{ if(ativo()) fit(); });
    window.addEventListener('keydown', e=>{
      if(!ativo()) return;
      if(e.key==='Escape' && st().full){ toggleFull(); return; }
      const t = e.target && e.target.tagName; if(t==='INPUT'||t==='TEXTAREA') return;
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); }
    });
  }
  sync(); carregar();
}
function ativo(){ return state.view==='mapaLesional' && mslState().org==='endometriose' && !!g('em-root'); }

function onClick(e){
  const d = e.target.closest('[data-em]');
  if(d && !d.disabled){
    const s = st();
    if(d.dataset.em==='pos'){ s.pos[d.dataset.k] = d.dataset.v; g('em-ctl').innerHTML = ctlHTML(); carregar(); return; }
    if(d.dataset.em==='cor'){ s.cor = +d.dataset.v; s.tool = 'brush'; g('em-ctl').innerHTML = ctlHTML(); sync(); return; }
  }
  const b = e.target.closest('button[id^="em-b-"]'); if(!b) return;
  const s = st();
  switch(b.id){
    case 'em-b-brush': s.tool='brush'; g('em-ctl').innerHTML=ctlHTML(); sync(); break;
    case 'em-b-erase': s.tool='erase'; g('em-ctl').innerHTML=ctlHTML(); sync(); break;
    case 'em-b-undo': undo(); break;
    case 'em-b-redo': redo(); break;
    case 'em-b-clear': limpar(); break;
    case 'em-b-leg': s.legend=!s.legend; refreshLegend(true); sync(); klugToast(s.legend?'Legenda ligada (só os achados marcados)':'Legenda desligada'); break;
    case 'em-b-zout': zoomBy(1/1.4); break;
    case 'em-b-zin': zoomBy(1.4); break;
    case 'em-b-fit': fit(); break;
    case 'em-b-full': toggleFull(); break;
    case 'em-b-copy': copiar(); break;
    case 'em-b-down': baixar(); break;
  }
}

/* ======================= imagem base (esquema + legenda + marca) ======================= */
const CACHE = {};
function imagem(f){
  if(CACHE[f]) return CACHE[f];
  return CACHE[f] = new Promise((ok,no)=>{ const im=new Image(); im.onload=()=>ok(im); im.onerror=()=>{ delete CACHE[f]; no(new Error('falha: '+f)); }; im.src=f; });
}
async function carregar(){
  const tok = ++R.tok, s = st();
  let im; try{ im = await imagem(arquivo()); }
  catch(e){ const m=g('em-msg'); if(m){ m.style.display=''; m.textContent='Não foi possível carregar a imagem do mapa. Verifique a conexão e tente de novo.'; } return; }
  if(tok!==R.tok || !g('em-base')) return;                     // a tela já foi refeita enquanto a imagem carregava
  R.img = im;
  const corte = s.pos.corte;
  if(R.view!==corte){
    R.view = corte; R.IW = im.naturalWidth; R.IH = im.naturalHeight; R.K = R.IW/REFW;
    for(const id of ['em-base','em-paint']){ g(id).width = R.IW; g(id).height = R.IH; }
    R.bctx = g('em-base').getContext('2d'); R.pctx = g('em-paint').getContext('2d');
    g('em-paint').style.opacity = ALPHA;
    fit(); redrawAll(); R.usedKey = '';
  }
  R.ready = true; const m = g('em-msg'); if(m) m.style.display = 'none';
  refreshLegend(true); sync();
}
function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
/* legenda pequena e discreta, DENTRO da imagem, canto inferior direito (mesmo desenho da legenda da próstata) */
function legenda(ctx,rows){
  const k = R.IW/1890, padX = 22*k, titH = 52*k, rowH = 50*k, m = 24*k, F = (w,px)=>`${w} ${px}px "Segoe UI",Arial,Helvetica,sans-serif`;
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const texts = rows.map(c=>'- '+c.nome);
  ctx.font = F(600,31*k); const tw = Math.max(...texts.map(t=>ctx.measureText(t).width));
  ctx.font = F(700,27*k); const lw = ctx.measureText('Legenda:').width;
  const w = Math.max(170*k, padX*2+50*k+tw, padX*2+lw), h = titH+rows.length*rowH+14*k, x = R.IW-m-w, y = R.IH-m-h;
  ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.strokeStyle = 'rgba(60,60,70,.35)'; ctx.lineWidth = 2*k; roundRect(ctx,x,y,w,h,18*k); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#444'; ctx.font = F(700,27*k); ctx.fillText('Legenda:', x+padX, y+titH/2+2*k);
  rows.forEach((c,i)=>{
    const cy = y+titH+i*rowH+rowH/2-2*k;
    ctx.fillStyle = c.cor; ctx.beginPath(); ctx.arc(x+padX+15*k,cy,15*k,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1f2630'; ctx.font = F(600,31*k); ctx.fillText(texts[i], x+padX+40*k, cy+1*k);
  });
  ctx.restore();
}
/* marca pequena, em letras brancas, no canto inferior esquerdo */
function marca(ctx){
  const fs = Math.max(9,Math.round(R.IW*0.0105)), m = R.IW*0.014;
  ctx.save(); ctx.font = `600 ${fs}px "Segoe UI",Arial,sans-serif`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = fs*0.28; ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#ffffff'; ctx.fillText(MARCA, m, R.IH-m*0.9); ctx.restore();
}
/* corte axial (visão videolaparoscópica): título no alto e as orientações nas quatro bordas.
   Esquerdo/direito são do PACIENTE: a imagem original traz o lado esquerdo à esquerda da tela. */
function orientacao(ctx){
  const k = R.IW/1890, m = 26*k, F = (w,px)=>`${w} ${px}px "Segoe UI",Arial,Helvetica,sans-serif`;
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  /* título: faixa escura, centralizada, no alto da imagem */
  const tit = 'VISÃO ILUSTRATIVA VIDEOLAPAROSCÓPICA', th = 62*k, ty = m;
  ctx.font = F(700,32*k); const tw = ctx.measureText(tit).width + 64*k, tx = (R.IW-tw)/2;
  ctx.fillStyle = 'rgba(18,22,30,.80)'; roundRect(ctx,tx,ty,tw,th,th/2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(tit, R.IW/2, ty+th/2+1*k); ctx.textAlign = 'left';
  /* etiquetas das bordas: a seta aponta para fora da imagem (lado que o nome indica) */
  const bh = 52*k, ar = 11*k;
  const badge = (txt,dir,cx,cy)=>{
    ctx.font = F(700,27*k); const w = ctx.measureText(txt).width + 34*k + 2*ar + 12*k, x = cx-w/2, y = cy-bh/2;
    ctx.fillStyle = 'rgba(255,255,255,.90)'; ctx.strokeStyle = 'rgba(60,60,70,.45)'; ctx.lineWidth = 2*k; roundRect(ctx,x,y,w,bh,bh/2); ctx.fill(); ctx.stroke();
    const ax = x+17*k+ar, ay = cy;                                  // centro da seta (à esquerda do texto)
    const p = {up:[[0,-ar],[ar,ar*0.8],[-ar,ar*0.8]], down:[[0,ar],[ar,-ar*0.8],[-ar,-ar*0.8]],
               left:[[-ar,0],[ar*0.8,ar],[ar*0.8,-ar]], right:[[ar,0],[-ar*0.8,ar],[-ar*0.8,-ar]]}[dir];
    ctx.fillStyle = '#7A1F3D'; ctx.beginPath(); ctx.moveTo(ax+p[0][0],ay+p[0][1]); ctx.lineTo(ax+p[1][0],ay+p[1][1]); ctx.lineTo(ax+p[2][0],ay+p[2][1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1f2630'; ctx.fillText(txt, ax+ar+12*k, cy+1*k);
  };
  badge('ANTERIOR','up',R.IW/2,ty+th+14*k+bh/2);
  badge('POSTERIOR','down',R.IW/2,R.IH-m-bh/2);
  ctx.font = F(700,27*k);
  const bw = t => ctx.measureText(t).width + 34*k + 2*ar + 12*k;
  badge('ESQUERDO','left',m+bw('ESQUERDO')/2,R.IH/2);
  badge('DIREITO','right',R.IW-m-bw('DIREITO')/2,R.IH/2);
  ctx.restore();
}
function drawBase(){
  const ctx = R.bctx; if(!ctx || !R.img) return;
  ctx.clearRect(0,0,R.IW,R.IH);
  ctx.drawImage(R.img,0,0,R.IW,R.IH);
  if(R.view==='sup') orientacao(ctx);
  marca(ctx);
  const rows = LES.filter(c=>R.used[c.id-1]);
  if(st().legend && rows.length) legenda(ctx,rows);
}
/* quais achados têm pintura visível (lê a camada reduzida; borracha e desfazer também contam) */
function scanUsed(){
  const M = 640, h = Math.max(1,Math.round(M*R.IH/R.IW)), c = R.scan || (R.scan = document.createElement('canvas')); c.width = M; c.height = h;
  const x = c.getContext('2d',{willReadFrequently:true}); x.imageSmoothingQuality = 'high'; x.clearRect(0,0,M,h); x.drawImage(g('em-paint'),0,0,M,h);
  const d = x.getImageData(0,0,M,h).data, n = [0,0,0], rgb = LES.map(k=>[1,3,5].map(i=>parseInt(k.cor.substr(i,2),16)));
  for(let i=0;i<d.length;i+=4){ if(d[i+3]<30) continue;
    for(let k=0;k<3;k++){ const q=rgb[k], e=(d[i]-q[0])**2+(d[i+1]-q[1])**2+(d[i+2]-q[2])**2; if(e<1500){ n[k]++; break; } } }
  return n.map(v=>v>=2);
}
function refreshLegend(force){
  if(!R.ready) return;
  R.used = scanUsed();
  const key = R.used.join()+'|'+(st().legend?1:0);
  if(key===R.usedKey && !force) return;
  R.usedKey = key; drawBase();
}

/* ======================= vista (zoom / mover) ======================= */
function fit(){
  const stg = g('em-stage'), w = g('em-world'); if(!stg || !w || !R.IW) return;
  const ar = R.IW/R.IH;
  if(st().full){ stg.style.width = '100%'; stg.style.aspectRatio = 'auto'; }
  else{ const pw = stg.parentElement.clientWidth; stg.style.width = Math.min(pw, Math.max(280, innerHeight*0.74*ar))+'px'; stg.style.aspectRatio = R.IW+'/'+R.IH; }
  const W = stg.clientWidth, H = stg.clientHeight, s = Math.min(W/R.IW, H/R.IH);
  R.W = W; R.H = H; R.fw = R.IW*s; R.fh = R.IH*s; w.style.width = R.fw+'px'; w.style.height = R.fh+'px';
  R.k = 1; R.tx = (W-R.fw)/2; R.ty = (H-R.fh)/2; applyView();
}
function clampPan(){
  const sw = R.fw*R.k, sh = R.fh*R.k;
  R.tx = sw<=R.W ? (R.W-sw)/2 : Math.min(0,Math.max(R.W-sw,R.tx));
  R.ty = sh<=R.H ? (R.H-sh)/2 : Math.min(0,Math.max(R.H-sh,R.ty));
}
function applyView(){
  const w = g('em-world'); if(!w) return; clampPan();
  w.style.transform = `translate(${R.tx}px,${R.ty}px) scale(${R.k})`;
  const z = g('em-zoom'); if(z) z.textContent = Math.round(R.k*100)+'%';
}
function zoomAt(cx,cy,nk){ nk = Math.min(ZMAX,Math.max(1,nk)); const px=(cx-R.tx)/R.k, py=(cy-R.ty)/R.k; R.k=nk; R.tx=cx-px*nk; R.ty=cy-py*nk; applyView(); }
function zoomBy(f){ zoomAt(R.W/2,R.H/2,R.k*f); }
function toggleFull(){
  const s = st(); s.full = !s.full;
  const ed = g('em-ed'); if(ed) ed.classList.toggle('full',s.full);
  const b = g('em-b-full'); if(b) b.innerHTML = mslIc(s.full?'exit':'full')+`<span>${s.full?'Sair':'Tela cheia'}</span>`;
  requestAnimationFrame(fit);
}

/* ======================= ponteiro ======================= */
function ptr(e,r){ return [(e.clientX-r.left)/r.width*R.IW, (e.clientY-r.top)/r.height*R.IH]; }
function onDown(e){
  if(!R.ready) return;
  const stg = g('em-stage'); R.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{ stg.setPointerCapture(e.pointerId); }catch(_){}
  if(R.ptrs.size===2){ cancelStroke(); pinchStart(); return; }
  if(R.ptrs.size>2) return;
  if(e.pointerType==='mouse' && (e.button===1||e.button===2)){ R.pan = {x:e.clientX,y:e.clientY,tx:R.tx,ty:R.ty}; stg.classList.add('grabbing'); return; }
  if(e.pointerType==='mouse' && e.button!==0) return;
  strokeStart(e);
}
function onMove(e){
  if(R.ptrs.has(e.pointerId)) R.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  cursor(e);
  if(R.pinch && R.ptrs.size>=2){ pinchMove(); return; }
  if(R.pan){ R.tx = R.pan.tx+(e.clientX-R.pan.x); R.ty = R.pan.ty+(e.clientY-R.pan.y); applyView(); return; }
  if(R.stroke && R.ptrs.size===1){ const evs=(e.getCoalescedEvents&&e.getCoalescedEvents())||[e]; (evs.length?evs:[e]).forEach(strokeAdd); }
}
function onUp(e){
  R.ptrs.delete(e.pointerId);
  if(R.pinch && R.ptrs.size<2) R.pinch = null;
  if(R.pan){ R.pan = null; const stg=g('em-stage'); if(stg) stg.classList.remove('grabbing'); }
  if(R.stroke) strokeEnd();
  if(e.pointerType!=='mouse'){ const c=g('em-cur'); if(c) c.style.display='none'; }
}
function pinchStart(){
  const a=[...R.ptrs.values()], stg=g('em-stage'); if(!stg||a.length<2) return;
  const r = stg.getBoundingClientRect(); R.pan = null;
  R.pinch = {d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1, cx:(a[0].x+a[1].x)/2-r.left, cy:(a[0].y+a[1].y)/2-r.top, k:R.k, tx:R.tx, ty:R.ty};
}
function pinchMove(){
  const a=[...R.ptrs.values()], stg=g('em-stage'), p=R.pinch; if(!stg||!p||a.length<2) return;
  const r = stg.getBoundingClientRect(), d = Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1;
  const cx = (a[0].x+a[1].x)/2-r.left, cy = (a[0].y+a[1].y)/2-r.top, nk = Math.min(ZMAX,Math.max(1,p.k*d/p.d));
  const px = (p.cx-p.tx)/p.k, py = (p.cy-p.ty)/p.k; R.k = nk; R.tx = cx-px*nk; R.ty = cy-py*nk; applyView();
}
function cursor(e){
  const c = g('em-cur'), stg = g('em-stage'); if(!c||!stg) return;
  if(e.pointerType==='touch'){ c.style.display='none'; return; }
  const r = stg.getBoundingClientRect(), d = Math.max(4, st().w*R.K*R.fw*R.k/R.IW);
  c.style.display='block'; c.style.width = c.style.height = d+'px'; c.style.left = (e.clientX-r.left)+'px'; c.style.top = (e.clientY-r.top)+'px';
}

/* ======================= traços =======================
   ENDOMETRIOSE = pincel ESPICULADO (irregular, com projeções finas e curvas); ENDOMETRIOMA e SANGUE seguem redondos.
   Os traços são guardados como listas de pontos (vetorial): desfazer/refazer e re-render após qualquer
   render() do app são só "repintar os traços". A semente de cada traço fixa o desenho das projeções. */
const espic = s => s.c===1 && !s.e;
function rng(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function style(ctx,s){
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,R.IW,R.IH); ctx.clip();
  ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=s.w*R.K;
  const col = s.e ? '#000' : LES[s.c-1].cor; ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
}
function stamp(ctx,s,x,y){
  const r = rng((s.seed||1)+s._n*7919), w = s.w*R.K, n = 6+Math.floor(r()*4), r0 = w*0.26, off = r()*Math.PI*2;
  for(let k=0;k<n;k++){
    const a = off+(k+r()*0.8)*2*Math.PI/n, len = w*(0.55+r()*0.85), hw = w*(0.05+r()*0.05), bend = (r()-0.5)*w*0.34;
    const ca = Math.cos(a), sa = Math.sin(a);
    const tx = x+ca*(r0+len), ty = y+sa*(r0+len), mx = x+ca*(r0+len*0.55)-sa*bend, my = y+sa*(r0+len*0.55)+ca*bend;
    ctx.beginPath(); ctx.moveTo(x-sa*hw,y+ca*hw); ctx.quadraticCurveTo(mx,my,tx,ty); ctx.quadraticCurveTo(mx,my,x+sa*hw,y-ca*hw); ctx.closePath(); ctx.fill();
  }
  s._n++;
}
function spicRun(ctx,s){
  const q = s.pts, W = s.w*R.K, step = W*0.4;
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,R.IW,R.IH); ctx.clip();
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = ctx.strokeStyle = LES[0].cor; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth = W*0.6;
  if(s._i===0){ ctx.beginPath(); ctx.arc(q[0],q[1],W*0.3,0,Math.PI*2); ctx.fill(); stamp(ctx,s,q[0],q[1]); s._i=2; s._d=0; }
  while(s._i<q.length){
    const x0=q[s._i-2], y0=q[s._i-1], x1=q[s._i], y1=q[s._i+1], L=Math.hypot(x1-x0,y1-y0);
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();           // miolo do traço
    let t = step-s._d; while(t<=L){ const k=t/L; stamp(ctx,s,x0+(x1-x0)*k,y0+(y1-y0)*k); t+=step; }
    s._d = L-(t-step); s._i += 2;
  }
  ctx.restore();
}
function drawStroke(ctx,s){
  if(espic(s)){ s._i=0; s._n=0; s._d=0; spicRun(ctx,s); return; }
  const q = s.pts; style(ctx,s);
  if(q.length<4){ ctx.beginPath(); ctx.arc(q[0],q[1],s.w*R.K/2,0,Math.PI*2); ctx.fill(); }
  else{ ctx.beginPath(); ctx.moveTo(q[0],q[1]); ctx.lineTo((q[0]+q[2])/2,(q[1]+q[3])/2);
    for(let i=2;i<q.length-2;i+=2) ctx.quadraticCurveTo(q[i],q[i+1],(q[i]+q[i+2])/2,(q[i+1]+q[i+3])/2);
    ctx.lineTo(q[q.length-2],q[q.length-1]); ctx.stroke(); }
  ctx.restore();
}
function lista(){ return st().strokes[R.view] || (st().strokes[R.view]=[]); }
function listaRedo(){ return st().redo[R.view] || (st().redo[R.view]=[]); }
function redrawAll(){
  const ctx = R.pctx; if(!ctx) return; ctx.clearRect(0,0,R.IW,R.IH);
  lista().forEach(s=>{ if(s.clear) ctx.clearRect(0,0,R.IW,R.IH); else drawStroke(ctx,s); });
}
function strokeStart(e){
  const s = st(), w = g('em-world'); if(!w) return;
  R.rect = w.getBoundingClientRect(); const p = ptr(e,R.rect);
  R.stroke = {c:s.cor, w:s.w, e:s.tool==='erase', pts:[+p[0].toFixed(1),+p[1].toFixed(1)], seed:((Math.random()*2147483646)|0)+1, _i:0, _n:0, _d:0};
  drawStroke(R.pctx,R.stroke);
}
function strokeAdd(ev){
  const s = R.stroke; if(!s) return; const p = ptr(ev,R.rect), q = s.pts;
  if(Math.hypot(p[0]-q[q.length-2],p[1]-q[q.length-1]) < (espic(s)?2.5:1.2)) return;
  q.push(+p[0].toFixed(1),+p[1].toFixed(1));
  if(espic(s)){ spicRun(R.pctx,s); return; }
  const ctx = R.pctx; style(ctx,s); const m = q.length; ctx.beginPath();
  if(m===4){ ctx.moveTo(q[0],q[1]); ctx.lineTo((q[0]+q[2])/2,(q[1]+q[3])/2); }
  else{ const ax=(q[m-6]+q[m-4])/2, ay=(q[m-5]+q[m-3])/2, bx=(q[m-4]+q[m-2])/2, by=(q[m-3]+q[m-1])/2; ctx.moveTo(ax,ay); ctx.quadraticCurveTo(q[m-4],q[m-3],bx,by); }
  ctx.stroke(); ctx.restore();
}
function strokeEnd(){
  const s = R.stroke; R.stroke = null; if(!s) return;
  const q = s.pts, m = q.length;
  if(!espic(s) && m>=4){ const ctx=R.pctx; style(ctx,s); ctx.beginPath(); ctx.moveTo((q[m-4]+q[m-2])/2,(q[m-3]+q[m-1])/2); ctx.lineTo(q[m-2],q[m-1]); ctx.stroke(); ctx.restore(); }
  lista().push(s); st().redo[R.view] = []; refreshLegend(); sync();
}
function cancelStroke(){ if(!R.stroke) return; R.stroke = null; redrawAll(); }

/* ======================= ações ======================= */
function sync(){
  const s = st();
  const set = (id,on)=>{ const b=g(id); if(b) b.classList.toggle('on',on); };
  set('em-b-brush',s.tool==='brush'); set('em-b-erase',s.tool==='erase'); set('em-b-leg',s.legend);
  const dis = (id,d)=>{ const b=g(id); if(b) b.disabled=d; };
  dis('em-b-undo',!lista().length); dis('em-b-redo',!listaRedo().length); dis('em-b-clear',!lista().length);
}
function undo(){ const l=lista(); if(!l.length) return; listaRedo().push(l.pop()); redrawAll(); refreshLegend(); sync(); }
function redo(){ const r=listaRedo(); if(!r.length) return; lista().push(r.pop()); redrawAll(); refreshLegend(); sync(); }
function limpar(){ const l=lista(); if(!l.length) return; l.push({clear:true}); st().redo[R.view]=[]; redrawAll(); refreshLegend(); sync(); klugToast('Marcação apagada — use Desfazer para voltar'); }

/* ======================= exportação ======================= */
function exportCanvas(){
  const c = document.createElement('canvas'); c.width = R.IW; c.height = R.IH; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0,0,R.IW,R.IH); x.imageSmoothingQuality = 'high';
  x.drawImage(g('em-base'),0,0); x.globalAlpha = ALPHA; x.drawImage(g('em-paint'),0,0); x.globalAlpha = 1; return c;
}
const blob = (tipo,q) => new Promise((ok,no)=>{ try{ exportCanvas().toBlob(b=>b?ok(b):no(new Error('canvas')),tipo,q); }catch(e){ no(e); } });
function baixar(){
  if(!R.ready){ klugToast('Aguarde o mapa carregar.'); return; }
  const nome = 'mapa-pelve-endometriose-'+st().pos.corte+'-'+arquivo().split('/').pop().replace('.webp','')+'.jpg';
  blob('image/jpeg',0.93).then(b=>{
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000);
  }).catch(()=>klugToast('Não consegui gerar a imagem.'));
}
function copiar(){
  if(!R.ready){ klugToast('Aguarde o mapa carregar.'); return; }
  try{
    if(!(navigator.clipboard && window.ClipboardItem)) throw new Error('sem clipboard');
    navigator.clipboard.write([new ClipboardItem({'image/png': blob('image/png')})])
      .then(()=>klugToast('Imagem copiada ✓ — cole no laudo'))
      .catch(()=>{ klugToast('Não deu para copiar aqui — baixando o JPEG'); baixar(); });
  }catch(e){ klugToast('Não deu para copiar aqui — baixando o JPEG'); baixar(); }
}

/* ======================= registro no Mapa Setorial Lesional ======================= */
MSL_ORGAOS.endometriose = {id:'endometriose', nome:'PELVE (Endometriose)', custom:true, html:html, init:init};
})();
