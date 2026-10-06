/* =========================================================================
   KlugRads — Mapa Setorial Lesional
   ---------------------------------------------------------------------------
   Pintura livre de lesões sobre o mapa setorial de um órgão (hoje: PRÓSTATA).
   O médico escolhe uma de 4 cores (cada uma é uma lesão); a legenda, na própria
   imagem, lista só as lesões que estiverem pintadas, pinta com o pincel, apaga, desfaz, dá zoom e exporta a imagem
   (copiar / baixar) para colar no laudo.

   Como funciona
   - Duas camadas <canvas> do tamanho da imagem original: a BASE (esquema +
     legenda das cores) e a PINTURA (transparente). A pintura é guardada como
     lista de traços (vetorial): desfazer/refazer e re-render após qualquer
     render() do app (que recria o DOM) são só "repintar os traços".
   - Tudo roda no navegador: nenhuma imagem ou desenho sai do aparelho.
   - Gestos: 1 dedo/mouse = pincel (ou borracha, conforme a ferramenta);
     2 dedos = zoom e mover; roda do mouse = zoom; botão direito/do meio = mover.

   Para acrescentar outro órgão: incluir uma entrada em MSL_ORGAOS (imagem
   quadrada, retângulo livre para a legenda e a referência bibliográfica).
   ========================================================================= */

const MSL_ORGAOS = {
  prostata: {
    id:'prostata', nome:'PRÓSTATA (PI-RADS)',
    img:'/img/mapa-setorial-prostata.webp', size:1890,   // a imagem é desenhada em 1890 px (o canvas fica do mesmo tamanho para qualquer arte)
    // retângulo da imagem (px) sem desenho, onde a legenda das cores é escrita
    legenda:{x:845, y:355, w:290},
    ref:{
      intro:'A ilustração acima é uma releitura do mapa setorial do PI-RADS v2.1.',
      lista:[
        'Turkbey B, Rosenkrantz AB, Haider MA, et al. Prostate Imaging Reporting and Data System Version 2.1: 2019 Update of Prostate Imaging Reporting and Data System Version 2. Eur Urol. 2019;76(3):340–351. doi:10.1016/j.eururo.2019.02.033',
        'Weinreb JC, Barentsz JO, Choyke PL, et al. PI-RADS Prostate Imaging – Reporting and Data System: 2015, Version 2. Eur Urol. 2016;69(1):16–40.',
      ],
    },
  },
};
/* 4 cores fixas (cada cor = uma lesão): preto, vermelho, azul e roxo (mesmas cores do mapa do rim). */
const MSL_CORES = [
  {id:1, cor:'#111111', nome:'Preto'},
  {id:2, cor:'#E11D2E', nome:'Vermelho'},
  {id:3, cor:'#1D4ED8', nome:'Azul'},
  {id:4, cor:'#7E22CE', nome:'Roxo'},
];
/* MARCA PADRÃO de TODOS os mapas do Mapa Setorial Lesional (próstata, pelve, fístula, rim…).
   Um mapa novo deve chamar mslMarca() ao desenhar a base (e usar MSL_MARCA no texto), para a
   frase, o tamanho e a posição ficarem iguais em todos. POSIÇÃO PADRÃO: canto inferior ESQUERDO.
   Cada mapa escolhe só a cor conforme o fundo da sua imagem (preto/escuro em fundo claro, branco
   em fundo escuro). */
const MSL_MARCA = 'Imagem ilustrada e editada em KlugRads';
function mslMarca(ctx, W, H, o){
  o = o || {};
  const dir = o.canto==='dir', fs = Math.max(9,Math.round(W*0.0105)), m = W*0.014;
  ctx.save();
  ctx.font = `600 ${fs}px "Segoe UI",Arial,Helvetica,sans-serif`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = dir ? 'right' : 'left';
  if(o.sombra){ ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = fs*0.28; ctx.shadowOffsetY = 1; }
  ctx.fillStyle = o.cor || '#000000';
  ctx.fillText(MSL_MARCA, dir ? W-m : m, H-m*0.9);
  ctx.restore();
}
const MSL_ALPHA = 0.72;      // opacidade da pintura (deixa ver os setores por baixo)
const MSL_ZMAX = 8;          // zoom máximo

/* ícones (traço) */
const MSL_IC = {
  pen:'<path d="M16.5 3.5l4 4L8 20l-5 1 1-5z"/><path d="M14 6l4 4"/>',
  eraser:'<path d="M20 20H9.5L4 14.5a2 2 0 0 1 0-2.8l7.7-7.7a2 2 0 0 1 2.8 0l5.5 5.5a2 2 0 0 1 0 2.8L13 20"/><path d="M8.5 9.5l6 6"/>',
  arrow:'<path d="M5 19L19 5"/><path d="M9 5h10v10"/>',
  trash:'<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  zin:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>',
  zout:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/>',
  full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  exit:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  list:'<path d="M4 7h3M4 12h3M4 17h3M10 7h10M10 12h10M10 17h10"/>',
  img:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 9"/>',
};
const mslIc = (k,sz)=>svgIcon(MSL_IC[k], sz||18, {sw:2});

/* ---- estado (em memória, como as demais ferramentas) ---- */
function mslState(){
  if(!state.msl) state.msl = {
    org:'prostata', cor:1, tool:'brush', w:30,
    labels:['Lesão 1','Lesão 2','Lesão 3','Lesão 4'], legend:true,
    strokes:[], redo:[], full:false,
  };
  return state.msl;
}
/* runtime (não vai para o state): canvases, imagem, gesto em curso */
const MSL = {img:null, imgSrc:'', ready:false, N:1890, k:1, tx:0, ty:0, side:0, W:0, H:0,
             ptrs:new Map(), stroke:null, pan:null, pinch:null, wired:false,
             used:[false,false,false,false], usedKey:'', rgb:null, scan:null};

/* ======================= tela ======================= */
function mapaLesionalHTML(){
  const s=mslState(), o=MSL_ORGAOS[s.org];
  const cores = MSL_CORES.map(c=>`<button type="button" class="msl-cor${s.cor===c.id?' on':''}" data-c="${c.id}" style="--c:${c.cor}" onclick="mslSetCor(${c.id})" title="${esc(c.nome)}" aria-label="${esc(c.nome)}"><span class="msl-dot"></span><span class="msl-cl" id="msl-cl-${c.id}">${esc(s.labels[c.id-1])}</span></button>`).join('');
  const tbtn=(t,ic,lbl)=>`<button type="button" class="msl-btn${s.tool===t?' on':''}" data-t="${t}" onclick="mslSetTool('${t}')" title="${lbl}">${mslIc(ic)}<span>${lbl}</span></button>`;
  const abtn=(id,fn,ic,lbl,dis)=>`<button type="button" class="msl-btn" id="${id}" onclick="${fn}" title="${lbl}" aria-label="${lbl}"${dis?' disabled':''}>${mslIc(ic)}<span>${lbl}</span></button>`;
  /* órgãos separados no topo: concluídos (✅) e em construção (🚧); grupo vazio não aparece */
  const chip = k=>`<div class="ti-ftog ${s.org===k?'on':''}" onclick="mslSetOrg('${k}')">${stMark('mapa:'+k)}${esc(MSL_ORGAOS[k].nome)}</div>`;
  const grp = (lbl,ks)=> ks.length ? `<div class="msl-og"><div class="msl-og-lbl">${lbl}</div><div class="ti-foci">${ks.map(chip).join('')}</div></div>` : '';
  const ks = Object.keys(MSL_ORGAOS);
  const orgs = ks.length>1
    ? `<div class="msl-orgs">${grp('Concluídos',ks.filter(k=>stOk('mapa:'+k)))}${grp('Em construção',ks.filter(k=>!stOk('mapa:'+k)))}</div>`
    : '';
  /* órgão com tela própria (ex.: PELVE / Endometriose, em mapa-endometriose.js): o motor quadrado da próstata não é usado */
  if(o.custom) return `<div class="msl-wrap">${orgs}${o.html()}</div>`;
  const legInputs = MSL_CORES.map(c=>`<div class="msl-leg-row"><span class="msl-dot" style="--c:${c.cor}"></span><input type="text" class="msl-in" maxlength="30" placeholder="Lesão ${c.id}" value="${esc(s.labels[c.id-1])}" oninput="mslSetLabel(${c.id},this.value)" aria-label="Legenda da cor ${esc(c.nome)}"></div>`).join('');
  return `<div class="msl-wrap">
    ${orgs}
    <div class="ti-legend-row" style="margin:0 0 10px"><span class="lt">Escolha a cor (cada cor é uma lesão), pinte sobre o mapa e copie a imagem para o laudo. Zoom: roda do mouse ou dois dedos. Para mover a imagem ampliada: arraste com o botão direito do mouse ou com dois dedos.</span></div>
    <div class="msl-ed${s.full?' full':''}" id="msl-ed">
      <div class="msl-bar">
        <div class="msl-cores">${cores}</div>
        <div class="msl-row">
          ${tbtn('brush','pen','Pincel')}${tbtn('erase','eraser','Borracha')}
          <label class="msl-size" title="Espessura do pincel"><span>Espessura</span><input type="range" id="msl-w" min="6" max="90" step="1" value="${s.w}" oninput="mslSetW(this.value)"></label>
        </div>
        <div class="msl-row">
          ${abtn('msl-undo','mslUndo()','undo','Desfazer',!s.strokes.length)}${abtn('msl-redo','mslRedo()','redo','Refazer',!s.redo.length)}${abtn('msl-clear','mslClear()','eraser','Limpar tudo',!s.strokes.length)}
          <button type="button" class="msl-btn${s.legend?' on':''}" id="msl-legbtn" onclick="mslToggleLegend()" title="Mostrar a legenda na imagem (só as lesões pintadas)" aria-pressed="${s.legend}">${mslIc('list')}<span>Legenda</span></button>
          <span class="msl-sp"></span>
          ${abtn('msl-zout','mslZoomBy(1/1.4)','zout','Zoom −')}${abtn('msl-zin','mslZoomBy(1.4)','zin','Zoom +')}
          <button type="button" class="msl-btn" onclick="mslFit()" title="Ajustar à tela"><span id="msl-zoom">100%</span></button>
          <button type="button" class="msl-btn" id="msl-fullbtn" onclick="mslToggleFull()" title="Tela cheia">${mslIc(s.full?'exit':'full')}<span>${s.full?'Sair':'Tela cheia'}</span></button>
        </div>
      </div>
      <div class="msl-stage" id="msl-stage">
        <div class="msl-world" id="msl-world"><canvas id="msl-base"></canvas><canvas id="msl-paint"></canvas></div>
        <div class="msl-cur" id="msl-cur"></div>
        <div class="msl-msg" id="msl-msg">Carregando o mapa…</div>
      </div>
      <details class="msl-leg"><summary>Renomear as lesões (opcional)</summary>
        <div class="msl-leg-in">${legInputs}<div class="lt" style="font-size:11.5px;color:var(--dim);margin-top:6px">A legenda da imagem mostra só as lesões que estiverem pintadas, no formato “cor - nome”.</div></div>
      </details>
    </div>
    <div class="ti-card" style="margin-top:12px">
      <div class="tfg-sec-lbl">Para o laudo</div>
      <div class="pmap-acts">
        <button type="button" class="lau-frase-btn" onclick="mslCopyImg()">${svgIcon(P.copy,16,{sw:2})} Copiar imagem</button>
        <button type="button" class="lau-btn2" onclick="mslDownload()">Baixar JPEG</button>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referência</div>
      <div class="msl-refintro">${esc(o.ref.intro)}</div>
      <div class="tfg-ref-list">${o.ref.lista.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* ======================= inicialização (após cada render) ======================= */
function mslInit(){
  const oc=MSL_ORGAOS[mslState().org]; if(oc && oc.custom){ oc.init(); return; }
  const base=$('msl-base'), paint=$('msl-paint'), stage=$('msl-stage');
  if(!base||!paint||!stage) return;
  const o=MSL_ORGAOS[mslState().org];
  MSL.N=o.size; MSL.ready=false; MSL.stroke=null; MSL.pan=null; MSL.pinch=null; MSL.ptrs.clear();
  base.width=base.height=paint.width=paint.height=MSL.N;
  MSL.base=base; MSL.paint=paint; MSL.bctx=base.getContext('2d'); MSL.pctx=paint.getContext('2d');
  paint.style.opacity=MSL_ALPHA;
  mslWire(stage);
  mslFit();
  const done=()=>{ MSL.ready=true; const m=$('msl-msg'); if(m) m.style.display='none'; mslRedrawAll(); MSL.usedKey=''; mslRefreshLegend(); mslSyncUI(); };
  if(MSL.img && MSL.imgSrc===o.img && MSL.img.complete && MSL.img.naturalWidth){ done(); return; }
  const im=new Image();
  im.onload=()=>{ MSL.img=im; MSL.imgSrc=o.img; if($('msl-base')===base) done(); };
  im.onerror=()=>{ const m=$('msl-msg'); if(m) m.textContent='Não foi possível carregar a imagem do mapa. Verifique a conexão e tente de novo.'; };
  im.src=o.img;
}
/* ligações de eventos (uma vez por elemento da tela + globais uma vez só) */
function mslWire(stage){
  stage.addEventListener('pointerdown', mslDown);
  stage.addEventListener('pointermove', mslMove);
  stage.addEventListener('pointerup', mslUp);
  stage.addEventListener('pointercancel', mslUp);
  stage.addEventListener('pointerleave', ()=>{ const c=$('msl-cur'); if(c) c.style.display='none'; });
  stage.addEventListener('wheel', e=>{ e.preventDefault(); const r=stage.getBoundingClientRect(); mslZoomAt(e.clientX-r.left, e.clientY-r.top, MSL.k*Math.exp(-e.deltaY*0.0016)); }, {passive:false});
  stage.addEventListener('contextmenu', e=>e.preventDefault());
  if(!MSL.wired){
    MSL.wired=true;
    window.addEventListener('resize', ()=>{ if(state.view==='mapaLesional') mslFit(); });
    window.addEventListener('keydown', e=>{
      if(state.view!=='mapaLesional') return;
      if((MSL_ORGAOS[mslState().org]||{}).custom) return;          // órgão com tela própria cuida dos seus atalhos
      if(e.key==='Escape' && mslState().full){ mslToggleFull(); return; }
      const t=e.target&&e.target.tagName; if(t==='INPUT'||t==='TEXTAREA') return;
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey?mslRedo():mslUndo(); }
    });
  }
}

/* ======================= vista (zoom / mover) ======================= */
function mslFit(){
  const st=$('msl-stage'), w=$('msl-world'); if(!st||!w) return;
  const W=st.clientWidth, H=st.clientHeight, side=Math.max(50,Math.min(W,H));
  MSL.W=W; MSL.H=H; MSL.side=side;
  w.style.width=w.style.height=side+'px';
  MSL.k=1; MSL.tx=(W-side)/2; MSL.ty=(H-side)/2;
  mslApplyView();
}
function mslClampPan(){
  const sz=MSL.side*MSL.k;
  MSL.tx = sz<=MSL.W ? (MSL.W-sz)/2 : Math.min(0,Math.max(MSL.W-sz,MSL.tx));
  MSL.ty = sz<=MSL.H ? (MSL.H-sz)/2 : Math.min(0,Math.max(MSL.H-sz,MSL.ty));
}
function mslApplyView(){
  const w=$('msl-world'); if(!w) return;
  mslClampPan();
  w.style.transform=`translate(${MSL.tx}px,${MSL.ty}px) scale(${MSL.k})`;
  const z=$('msl-zoom'); if(z) z.textContent=Math.round(MSL.k*100)+'%';
}
function mslZoomAt(cx,cy,nk){
  nk=Math.min(MSL_ZMAX,Math.max(1,nk));
  const px=(cx-MSL.tx)/MSL.k, py=(cy-MSL.ty)/MSL.k;
  MSL.k=nk; MSL.tx=cx-px*nk; MSL.ty=cy-py*nk;
  mslApplyView();
}
function mslZoomBy(f){ mslZoomAt(MSL.W/2, MSL.H/2, MSL.k*f); }
function mslToggleFull(){
  const s=mslState(); s.full=!s.full;
  const ed=$('msl-ed'); if(ed) ed.classList.toggle('full', s.full);
  const b=$('msl-fullbtn'); if(b) b.innerHTML=mslIc(s.full?'exit':'full')+`<span>${s.full?'Sair':'Tela cheia'}</span>`;
  requestAnimationFrame(()=>mslFit());
}

/* ======================= ponteiro ======================= */
function mslPt(e, rect){   // coordenadas do ponteiro em px da imagem
  return [ (e.clientX-rect.left)/rect.width*MSL.N, (e.clientY-rect.top)/rect.height*MSL.N ];
}
function mslDown(e){
  if(!MSL.ready) return;
  const st=$('msl-stage'); if(!st) return;
  MSL.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{ st.setPointerCapture(e.pointerId); }catch(_){}
  if(MSL.ptrs.size===2){ mslCancelStroke(); mslPinchStart(); return; }
  if(MSL.ptrs.size>2) return;
  const s=mslState();
  const mover = e.pointerType==='mouse' && (e.button===1||e.button===2);   // botão do meio/direito arrasta a imagem
  if(mover){ MSL.pan={x:e.clientX,y:e.clientY,tx:MSL.tx,ty:MSL.ty}; st.classList.add('grabbing'); return; }
  if(e.pointerType==='mouse' && e.button!==0) return;
  mslStrokeStart(e);
}
function mslMove(e){
  const st=$('msl-stage'); if(!st) return;
  if(MSL.ptrs.has(e.pointerId)) MSL.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  mslCursor(e);
  if(MSL.pinch && MSL.ptrs.size>=2){ mslPinchMove(); return; }
  if(MSL.pan){ MSL.tx=MSL.pan.tx+(e.clientX-MSL.pan.x); MSL.ty=MSL.pan.ty+(e.clientY-MSL.pan.y); mslApplyView(); return; }
  if(MSL.stroke && MSL.ptrs.size===1){
    const evs=(e.getCoalescedEvents&&e.getCoalescedEvents())||[e];
    (evs.length?evs:[e]).forEach(ev=>mslStrokeAdd(ev));
  }
}
function mslUp(e){
  MSL.ptrs.delete(e.pointerId);
  const st=$('msl-stage');
  if(MSL.pinch && MSL.ptrs.size<2) MSL.pinch=null;
  if(MSL.pan){ MSL.pan=null; if(st) st.classList.remove('grabbing'); }
  if(MSL.stroke) mslStrokeEnd();
  if(e.pointerType!=='mouse'){ const c=$('msl-cur'); if(c) c.style.display='none'; }
}
function mslPinchStart(){
  const a=[...MSL.ptrs.values()], st=$('msl-stage'); if(!st||a.length<2) return;
  const r=st.getBoundingClientRect();
  MSL.pan=null;
  MSL.pinch={ d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1, cx:(a[0].x+a[1].x)/2-r.left, cy:(a[0].y+a[1].y)/2-r.top, k:MSL.k, tx:MSL.tx, ty:MSL.ty };
}
function mslPinchMove(){
  const a=[...MSL.ptrs.values()], st=$('msl-stage'), p=MSL.pinch; if(!st||!p||a.length<2) return;
  const r=st.getBoundingClientRect();
  const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1;
  const cx=(a[0].x+a[1].x)/2-r.left, cy=(a[0].y+a[1].y)/2-r.top;
  const nk=Math.min(MSL_ZMAX,Math.max(1,p.k*d/p.d));
  const px=(p.cx-p.tx)/p.k, py=(p.cy-p.ty)/p.k;       // ponto da imagem sob o centro inicial
  MSL.k=nk; MSL.tx=cx-px*nk; MSL.ty=cy-py*nk;
  mslApplyView();
}
/* círculo que mostra o tamanho do pincel (mouse/caneta) */
function mslCursor(e){
  const c=$('msl-cur'), st=$('msl-stage'), s=mslState(); if(!c||!st) return;
  if(e.pointerType==='touch'){ c.style.display='none'; return; }
  const r=st.getBoundingClientRect(), d=Math.max(4, s.w*MSL.side*MSL.k/MSL.N);
  c.style.display='block'; c.style.width=c.style.height=d+'px';
  c.style.left=(e.clientX-r.left)+'px'; c.style.top=(e.clientY-r.top)+'px';
}

/* ======================= traços ======================= */
function mslStrokeStart(e){
  const s=mslState(), w=$('msl-world'); if(!w) return;
  MSL.rect=w.getBoundingClientRect();
  const p=mslPt(e,MSL.rect);
  MSL.stroke={ c:s.cor, w:s.w, e:s.tool==='erase', pts:[+p[0].toFixed(1),+p[1].toFixed(1)] };
  MSL.last=null;
  mslDrawStroke(MSL.pctx, MSL.stroke);     // ponto inicial
}
function mslStrokeAdd(ev){
  const S=MSL.stroke; if(!S) return;
  const p=mslPt(ev,MSL.rect), q=S.pts, n=q.length;
  if(Math.hypot(p[0]-q[n-2],p[1]-q[n-1])<1.5) return;
  q.push(+p[0].toFixed(1),+p[1].toFixed(1));
  // desenho incremental: curva quadrática pelos pontos médios
  const ctx=MSL.pctx; mslStyle(ctx,S);
  const m=q.length;
  ctx.beginPath();
  if(m===4){ ctx.moveTo(q[0],q[1]); ctx.lineTo((q[0]+q[2])/2,(q[1]+q[3])/2); }
  else{
    const ax=(q[m-6]+q[m-4])/2, ay=(q[m-5]+q[m-3])/2, bx=(q[m-4]+q[m-2])/2, by=(q[m-3]+q[m-1])/2;
    ctx.moveTo(ax,ay); ctx.quadraticCurveTo(q[m-4],q[m-3],bx,by);
  }
  ctx.stroke(); ctx.restore();
}
function mslStrokeEnd(){
  const S=MSL.stroke; MSL.stroke=null; if(!S) return;
  const q=S.pts, m=q.length;
  if(m>=4){ const ctx=MSL.pctx; mslStyle(ctx,S); ctx.beginPath(); ctx.moveTo((q[m-4]+q[m-2])/2,(q[m-3]+q[m-1])/2); ctx.lineTo(q[m-2],q[m-1]); ctx.stroke(); ctx.restore(); }
  const s=mslState(); s.strokes.push(S); s.redo=[];
  mslRefreshLegend(); mslSyncUI();
}
function mslCancelStroke(){ if(!MSL.stroke) return; MSL.stroke=null; mslRedrawAll(); }
function mslStyle(ctx,S){
  ctx.save();
  ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=S.w;
  const col = S.e ? '#000' : MSL_CORES[S.c-1].cor;
  ctx.strokeStyle=col; ctx.fillStyle=col;
  ctx.globalCompositeOperation = S.e ? 'destination-out' : 'source-over';
}
function mslDrawStroke(ctx,S){
  const q=S.pts; mslStyle(ctx,S);
  if(q.length<4){ ctx.beginPath(); ctx.arc(q[0],q[1],S.w/2,0,Math.PI*2); ctx.fill(); }
  else{
    ctx.beginPath(); ctx.moveTo(q[0],q[1]); ctx.lineTo((q[0]+q[2])/2,(q[1]+q[3])/2);
    for(let i=2;i<q.length-2;i+=2) ctx.quadraticCurveTo(q[i],q[i+1],(q[i]+q[i+2])/2,(q[i+1]+q[i+3])/2);
    ctx.lineTo(q[q.length-2],q[q.length-1]); ctx.stroke();
  }
  ctx.restore();
}
function mslRedrawAll(){
  const ctx=MSL.pctx; if(!ctx) return;
  ctx.clearRect(0,0,MSL.N,MSL.N);
  mslState().strokes.forEach(S=>{ if(S.clear) ctx.clearRect(0,0,MSL.N,MSL.N); else mslDrawStroke(ctx,S); });
}

/* ======================= base (esquema + legenda) ======================= */
function mslRoundRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
/* Quais cores têm pintura visível (lê a camada de pintura reduzida; assim a borracha e o
   desfazer também contam). Só pixels de cor "pura" entram, para não confundir as bordas
   onde duas cores se encontram. */
function mslScanUsed(){
  const M=384, c=MSL.scan||(MSL.scan=document.createElement('canvas')); c.width=c.height=M;
  const x=c.getContext('2d',{willReadFrequently:true}); x.imageSmoothingQuality='high'; x.drawImage(MSL.paint,0,0,M,M);
  const d=x.getImageData(0,0,M,M).data, n=[0,0,0,0];
  if(!MSL.rgb) MSL.rgb=MSL_CORES.map(k=>[1,3,5].map(i=>parseInt(k.cor.substr(i,2),16)));
  for(let i=0;i<d.length;i+=4){
    if(d[i+3]<48) continue;
    for(let k=0;k<4;k++){ const q=MSL.rgb[k], e=(d[i]-q[0])**2+(d[i+1]-q[1])**2+(d[i+2]-q[2])**2; if(e<1500){ n[k]++; break; } }
  }
  return n.map(v=>v>=2);
}
function mslRefreshLegend(){
  if(!MSL.ready) return;
  MSL.used=mslScanUsed();
  const key=MSL.used.join()+'|'+(mslState().legend?1:0);
  if(key===MSL.usedKey) return;
  MSL.usedKey=key; mslDrawBase();
}
function mslToggleLegend(){
  const s=mslState(); s.legend=!s.legend; mslSyncUI(); mslRefreshLegend();
  klugToast(s.legend?'Legenda ligada (só as lesões pintadas)':'Legenda desligada');
}
function mslDrawBase(){
  const ctx=MSL.bctx; if(!ctx||!MSL.img) return;
  const s=mslState(), o=MSL_ORGAOS[s.org], N=MSL.N;
  ctx.clearRect(0,0,N,N); ctx.imageSmoothingQuality='high'; ctx.drawImage(MSL.img,0,0,N,N);
  // marca padrão (próstata: preto, canto inferior esquerdo)
  mslMarca(ctx, N, N, {cor:'#000000', canto:'esq'});
  // legenda na imagem: "Legenda:" e uma linha "(cor) - Lesão N" para cada lesão pintada
  const rows=MSL_CORES.filter(c=>MSL.used[c.id-1]);
  if(!s.legend || !rows.length) return;
  const L=o.legenda, padX=22, titH=52, rowH=50, F=(w,px)=>`${w} ${px}px "Segoe UI",Arial,Helvetica,sans-serif`;
  ctx.save(); ctx.textBaseline='middle'; ctx.textAlign='left';
  const maxW=L.w-padX*2-50;
  const texts=rows.map(c=>{
    let t='- '+((s.labels[c.id-1]||'').trim()||('Lesão '+c.id));
    ctx.font=F(600,31); while(t.length>4 && ctx.measureText(t).width>maxW) t=t.slice(0,-2).trimEnd()+'…';
    return t;
  });
  ctx.font=F(600,31); const tw=Math.max(...texts.map(t=>ctx.measureText(t).width));
  ctx.font=F(700,27); const lw=ctx.measureText('Legenda:').width;
  const w=Math.min(L.w, Math.max(170, padX*2+50+tw, padX*2+lw)), h=titH+rows.length*rowH+14;
  ctx.fillStyle='rgba(255,255,255,.93)'; ctx.strokeStyle='rgba(60,60,70,.35)'; ctx.lineWidth=2;
  mslRoundRect(ctx,L.x,L.y,w,h,18); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#444'; ctx.font=F(700,27); ctx.fillText('Legenda:', L.x+padX, L.y+titH/2+2);
  rows.forEach((c,i)=>{
    const cy=L.y+titH+i*rowH+rowH/2-2;
    ctx.fillStyle=c.cor; ctx.beginPath(); ctx.arc(L.x+padX+15,cy,15,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1f2630'; ctx.font=F(600,31); ctx.fillText(texts[i], L.x+padX+40, cy+1);
  });
  ctx.restore();
}

/* ======================= ações ======================= */
function mslSyncUI(){
  const s=mslState();
  document.querySelectorAll('.msl-cor').forEach(b=>b.classList.toggle('on', +b.dataset.c===s.cor && s.tool!=='erase'));
  document.querySelectorAll('.msl-btn[data-t]').forEach(b=>b.classList.toggle('on', b.dataset.t===s.tool));
  const lb=$('msl-legbtn'); if(lb){ lb.classList.toggle('on',!!s.legend); lb.setAttribute('aria-pressed',String(!!s.legend)); }
  const st=$('msl-stage'); if(st) st.dataset.tool=s.tool;
  const set=(id,dis)=>{ const b=$(id); if(b) b.disabled=dis; };
  set('msl-undo',!s.strokes.length); set('msl-redo',!s.redo.length); set('msl-clear',!s.strokes.length);
}
function mslSetCor(i){ const s=mslState(); s.cor=i; if(s.tool!=='brush') s.tool='brush'; mslSyncUI(); }
function mslSetTool(t){ mslState().tool=t; mslSyncUI(); }
function mslSetW(v){ mslState().w=+v; }
function mslSetOrg(k){
  const s=mslState(); if(!MSL_ORGAOS[k]||s.org===k) return;
  // cada órgão guarda a sua pintura: ao voltar para ele, o desenho continua lá
  (s.byOrg=s.byOrg||{})[s.org]={strokes:s.strokes, redo:s.redo};
  const b=s.byOrg[k]; s.org=k; s.strokes=b?b.strokes:[]; s.redo=b?b.redo:[];
  render(true);
}
function mslSetLabel(i,v){
  mslState().labels[i-1]=v;
  const el=$('msl-cl-'+i); if(el) el.textContent=v.trim()||('Lesão '+i);
  if(!MSL.used[i-1] || MSL._raf) return; MSL._raf=requestAnimationFrame(()=>{ MSL._raf=0; mslDrawBase(); });
}
function mslUndo(){
  const s=mslState(); if(!s.strokes.length) return;
  s.redo.push(s.strokes.pop()); mslRedrawAll(); mslRefreshLegend(); mslSyncUI();
}
function mslRedo(){
  const s=mslState(); if(!s.redo.length) return;
  s.strokes.push(s.redo.pop()); mslRedrawAll(); mslRefreshLegend(); mslSyncUI();
}
function mslClear(){
  const s=mslState(); if(!s.strokes.length) return;
  s.strokes.push({clear:true}); s.redo=[];       // "limpar" também pode ser desfeito
  mslRedrawAll(); mslRefreshLegend(); mslSyncUI();
  klugToast('Pintura apagada — use Desfazer para voltar');
}

/* ======================= exportação ======================= */
function mslExportCanvas(maxSide){
  const N=MSL.N, sc=Math.min(1,(maxSide||N)/N), W=Math.round(N*sc);
  const c=document.createElement('canvas'); c.width=c.height=W;
  const x=c.getContext('2d');
  x.fillStyle='#fff'; x.fillRect(0,0,W,W);
  x.imageSmoothingQuality='high';
  x.drawImage(MSL.base,0,0,W,W);
  x.globalAlpha=MSL_ALPHA; x.drawImage(MSL.paint,0,0,W,W); x.globalAlpha=1;
  return c;
}
function mslBlob(type,maxSide){
  return new Promise((ok,fail)=>{ try{ mslExportCanvas(maxSide).toBlob(b=>b?ok(b):fail(new Error('canvas')), type, 0.93); }catch(e){ fail(e); } });
}
function mslCopyImg(){
  if(!MSL.ready){ klugToast('Aguarde o mapa carregar.'); return; }
  try{
    if(!(navigator.clipboard && window.ClipboardItem)) throw new Error('sem clipboard');
    navigator.clipboard.write([new ClipboardItem({'image/png': mslBlob('image/png',1600)})])
      .then(()=>klugToast('Imagem copiada ✓ — cole no laudo'))
      .catch(()=>{ klugToast('Não deu para copiar aqui — baixando o JPEG'); mslDownload(); });
  }catch(e){ klugToast('Não deu para copiar aqui — baixando o JPEG'); mslDownload(); }
}
function mslDownload(){
  if(!MSL.ready){ klugToast('Aguarde o mapa carregar.'); return; }
  const o=MSL_ORGAOS[mslState().org];
  mslBlob('image/jpeg',1890).then(b=>{
    const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='mapa-setorial-lesional-'+o.id+'.jpg';
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000);
  }).catch(()=>klugToast('Não consegui gerar a imagem.'));
}
