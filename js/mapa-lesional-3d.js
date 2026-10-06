/* =========================================================================
   KlugRads — Mapa Setorial Lesional · EFEITO 3D NA PINTURA (padrão de todos os mapas)
   ---------------------------------------------------------------------------
   Motor único, usado por TODOS os mapas (próstata, pelve/endometriose, fístula perianal,
   rim). Não muda os traços (desfazer, borracha, legenda e "lesões usadas" continuam lendo
   a pintura plana): ele só PINTA POR CIMA uma versão com volume.

   Como funciona
   1. As camadas planas de pintura do mapa são juntadas e reduzidas (630 px no maior lado).
   2. Distância até a borda do traço (EDT) -> altura: cada traço ganha um perfil
      arredondado, qualquer que seja a espessura ("gel" e "tubo"), ou só uma borda
      chanfrada ("relevo").
   3. A altura gera normais; luz de cima à esquerda -> camada de luz/sombra (branco =
      realce, preto = sombra) aplicada SÓ onde há tinta (source-atop); sombra projetada
      pelo próprio canvas (shadowBlur).
   4. O resultado fica num canvas por cima do desenho e as camadas planas ficam ocultas.
      A exportação (copiar/baixar) usa esse canvas.
   Durante o traço: na PRÓSTATA o trecho em andamento aparece plano num canvas à parte;
   nos demais mapas a pintura aparece plana enquanto se desenha e ganha volume ao soltar.

   COMO LIGAR EM UM MAPA NOVO
     a) ao criar os canvases:      msl3d.attach('chave', {world, layers:[canvasPintura,...]})
     b) ao (re)desenhar a pintura: msl3d.update('chave')
        (e no início/fim de cada traço: msl3d.liveStart('chave') / msl3d.liveEnd('chave'))
     c) ao exportar:               if(!msl3d.draw('chave', ctx, W, H)) { ...desenho plano... }
     d) painel de opções:          msl3d.painel(elementoDepoisDoQualOCardAparece)
   O efeito vem LIGADO por padrão (o médico pode desligar; a escolha fica no aparelho).
   ========================================================================= */
(function(){
'use strict';
if(window.msl3d) return;

const KEY = 'klug_msl3d';
const S = {on:true, estilo:'gel', relevo:1, brilho:.8, sombra:.55, alfa:.85};
try{ const o=JSON.parse(localStorage.getItem(KEY)||'null'); if(o&&typeof o==='object') Object.keys(S).forEach(k=>{ if(k in o) S[k]=o[k]; }); }catch(_){}
const salvar = ()=>{ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(_){} };
const OPTS = {aberto:false};                       // painel começa fechado (a página de teste abre)
const WL = 630;                                    // resolução do cálculo do relevo (maior lado)
const I = {};                                      // instâncias, uma por mapa
const $ = id=>document.getElementById(id);

/* ------------------------- utilidades numéricas ------------------------- */
function dt1d(f,n,v,z,d){
  let k=0; v[0]=0; z[0]=-1e20; z[1]=1e20;
  for(let q=1;q<n;q++){
    let s;
    for(;;){ const p=v[k]; s=((f[q]+q*q)-(f[p]+p*p))/(2*q-2*p); if(s<=z[k]) k--; else break; }
    k++; v[k]=q; z[k]=s; z[k+1]=1e20;
  }
  k=0;
  for(let q=0;q<n;q++){ while(z[k+1]<q) k++; const p=v[k]; d[q]=(q-p)*(q-p)+f[p]; }
}
function edt(mask,w,h){                            // distância (px) de cada pixel de tinta até o fundo mais próximo
  const f=new Float32Array(w*h), m=Math.max(w,h), t=new Float32Array(m), o=new Float32Array(m), v=new Int32Array(m), z=new Float32Array(m+1);
  for(let i=0;i<f.length;i++) f[i]=mask[i]?1e9:0;
  for(let x=0;x<w;x++){ for(let y=0;y<h;y++) t[y]=f[y*w+x]; dt1d(t,h,v,z,o); for(let y=0;y<h;y++) f[y*w+x]=o[y]; }
  for(let y=0;y<h;y++){ for(let x=0;x<w;x++) t[x]=f[y*w+x]; dt1d(t,w,v,z,o); for(let x=0;x<w;x++) f[y*w+x]=o[x]; }
  for(let i=0;i<f.length;i++) f[i]=Math.sqrt(f[i]);
  return f;
}
function maxFilter(a,w,h,r){                       // máximo local (janela quadrada, separável)
  const t=new Float32Array(a.length), o=new Float32Array(a.length);
  for(let y=0;y<h;y++){ const row=y*w; for(let x=0;x<w;x++){ let m=0; const x0=Math.max(0,x-r), x1=Math.min(w-1,x+r); for(let i=x0;i<=x1;i++){ const q=a[row+i]; if(q>m) m=q; } t[row+x]=m; } }
  for(let x=0;x<w;x++){ for(let y=0;y<h;y++){ let m=0; const y0=Math.max(0,y-r), y1=Math.min(h-1,y+r); for(let i=y0;i<=y1;i++){ const q=t[i*w+x]; if(q>m) m=q; } o[y*w+x]=m; } }
  return o;
}
function boxBlur(a,w,h,r){
  const t=new Float32Array(a.length), o=new Float32Array(a.length), n=2*r+1;
  for(let y=0;y<h;y++){ const row=y*w; for(let x=0;x<w;x++){ let s=0; for(let i=-r;i<=r;i++) s+=a[row+Math.min(w-1,Math.max(0,x+i))]; t[row+x]=s/n; } }
  for(let x=0;x<w;x++){ for(let y=0;y<h;y++){ let s=0; for(let i=-r;i<=r;i++) s+=t[Math.min(h-1,Math.max(0,y+i))*w+x]; o[y*w+x]=s/n; } }
  return o;
}

/* ------------------------- relevo e luz ------------------------- */
function altura(mask,w,h){
  const d=edt(mask,w,h), hg=new Float32Array(w*h);
  if(S.estilo==='relevo'){                          // plano com borda chanfrada
    for(let i=0;i<hg.length;i++){ if(!mask[i]) continue; const u=Math.min(1,d[i]/2.4); hg[i]=S.relevo*3.6*(u*u*(3-2*u)); }
  }else{                                            // gel / tubo: perfil arredondado em cada traço
    const mx=maxFilter(d,w,h,14), gel=S.estilo==='gel';
    for(let i=0;i<hg.length;i++){
      if(!mask[i]) continue; const m=mx[i]; if(m<1) continue;
      const t=Math.min(1,d[i]/m), prof=gel ? Math.sqrt(Math.max(0,1-(1-t)*(1-t))) : (1-(1-t)*(1-t));
      hg[i]=S.relevo*Math.min(m,18)*0.95*prof;
    }
  }
  return boxBlur(boxBlur(hg,w,h,1),w,h,1);
}
function camadaLuz(w,h,mask,hg){
  const img=new ImageData(w,h), px=img.data;
  const L=[-.5,-.65,.62], ln=Math.hypot(L[0],L[1],L[2]); L[0]/=ln; L[1]/=ln; L[2]/=ln;
  let H=[L[0],L[1],L[2]+1]; const hn=Math.hypot(H[0],H[1],H[2]); H=[H[0]/hn,H[1]/hn,H[2]/hn];
  const shin=S.estilo==='gel'?70:(S.estilo==='tubo'?16:30), ks=S.brilho*(S.estilo==='relevo'?.5:(S.estilo==='tubo'?.3:1.15));
  const amb=.55, dif=.65, flat=amb+dif*L[2];
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
    const i=y*w+x; if(!mask[i]) continue;
    const gx=(hg[i+1]-hg[i-1])*.5, gy=(hg[i+w]-hg[i-w])*.5, inv=1/Math.sqrt(gx*gx+gy*gy+1);
    const nx=-gx*inv, ny=-gy*inv, nz=inv;
    const dd=Math.max(0,nx*L[0]+ny*L[1]+nz*L[2]), s=(amb+dif*dd)/flat;
    const sp=Math.pow(Math.max(0,nx*H[0]+ny*H[1]+nz*H[2]),shin)*ks;
    const dl=(s-1)*(s<1?1.35:.9)+sp, p=i*4;
    if(dl>0){ px[p]=px[p+1]=px[p+2]=255; px[p+3]=Math.min(235,dl*255); }
    else    { px[p]=px[p+1]=px[p+2]=0;   px[p+3]=Math.min(215,-dl*255); }
  }
  return img;
}

/* ------------------------- instâncias (um mapa = uma chave) ------------------------- */
function estiloCanvas(c){ Object.assign(c.style,{position:'absolute',left:'0',top:'0',width:'100%',height:'100%',pointerEvents:'none',visibility:'hidden'}); }
function attach(key,o){
  o = o||{}; const world=o.world, layers=(o.layers||[]).filter(Boolean);
  if(!world||!layers.length||!layers[0].width) return null;
  let it=I[key];
  if(!it || it.world!==world || it.layers[0]!==layers[0]){
    it = I[key] = {key,world,layers,hide:o.hide||'visibility',cv:document.createElement('canvas'),live:null,stk:null,comp:null,low:null,lowCtx:null,lightCv:null,realCtx:null,liveOn:false,overlay:!!o.overlay};
    it.cv.className='m3d-cv'; estiloCanvas(it.cv);
    (o.after||layers[layers.length-1]).insertAdjacentElement('afterend',it.cv);
    if(it.overlay){ it.live=document.createElement('canvas'); it.live.className='m3d-live'; estiloCanvas(it.live); it.cv.insertAdjacentElement('afterend',it.live); }
  }
  it.layers=layers; it.W=layers[0].width; it.H=layers[0].height;
  if(it.hide==='opacity') layers.forEach(l=>{ if(l._m3o===undefined) l._m3o=l.style.opacity; });
  if(it.cv.width!==it.W||it.cv.height!==it.H){ it.cv.width=it.W; it.cv.height=it.H; if(it.live){ it.live.width=it.W; it.live.height=it.H; } it.comp=it.stk=null; }
  it.cv.style.opacity=S.alfa; if(it.live) it.live.style.opacity=S.alfa;
  return it;
}
function mostrar(it,modo){
  const d3 = modo==='3d';
  if(it.hide==='opacity') it.layers.forEach(l=>{ l.style.opacity = d3 ? '0' : (l._m3o||''); });      // (a camada recebe os eventos do mouse: não pode sumir de verdade)
  else it.layers.forEach(l=>{ l.style.visibility = d3 ? 'hidden' : 'visible'; });
  it.cv.style.visibility = d3 ? 'visible' : 'hidden';
  if(it.live) it.live.style.visibility = d3 ? 'visible' : 'hidden';
}
function render(it){
  const W=it.W, H=it.H, sc=WL/Math.max(W,H), lw=Math.max(8,Math.round(W*sc)), lh=Math.max(8,Math.round(H*sc));
  if(!it.low){ it.low=document.createElement('canvas'); it.lowCtx=it.low.getContext('2d',{willReadFrequently:true}); it.lightCv=document.createElement('canvas'); }
  if(!it.stk||it.stk.width!==W||it.stk.height!==H){ it.stk=document.createElement('canvas'); it.stk.width=W; it.stk.height=H; it.comp=document.createElement('canvas'); it.comp.width=W; it.comp.height=H; }
  const sx=it.stk.getContext('2d'); sx.globalCompositeOperation='source-over'; sx.clearRect(0,0,W,H);
  it.layers.forEach(l=>sx.drawImage(l,0,0));                             // junta as camadas planas (cor)
  it.low.width=lw; it.low.height=lh; it.lightCv.width=lw; it.lightCv.height=lh;
  it.lowCtx.clearRect(0,0,lw,lh); it.lowCtx.imageSmoothingQuality='high'; it.lowCtx.drawImage(it.stk,0,0,lw,lh);
  const data=it.lowCtx.getImageData(0,0,lw,lh).data, mask=new Uint8Array(lw*lh);
  let any=false; for(let i=0;i<mask.length;i++){ const m=data[i*4+3]>90?1:0; mask[i]=m; if(m) any=true; }
  const x=it.cv.getContext('2d'); x.clearRect(0,0,W,H);
  if(!any) return;
  const hg=altura(mask,lw,lh);
  it.lightCv.getContext('2d').putImageData(camadaLuz(lw,lh,mask,hg),0,0);
  const c=it.comp.getContext('2d'); c.globalCompositeOperation='source-over'; c.clearRect(0,0,W,H);
  c.drawImage(it.stk,0,0);                                               // cor plana ...
  c.globalCompositeOperation='source-atop'; c.imageSmoothingQuality='high'; c.drawImage(it.lightCv,0,0,W,H);   // ... + luz/sombra só onde há tinta
  c.globalCompositeOperation='source-over';
  const k=W/1890;                                                         // sombra proporcional ao tamanho da imagem
  x.save(); x.shadowColor=`rgba(0,0,0,${(.6*S.sombra*(S.estilo==='tubo'?1.4:1)).toFixed(3)})`; x.shadowBlur=1890*k*.008*(.6+S.sombra);
  x.shadowOffsetX=1890*k*.0035*S.relevo; x.shadowOffsetY=1890*k*.006*S.relevo; x.drawImage(it.comp,0,0); x.restore();
}
function fimLive(it){ if(it.live&&it.live.width) it.live.getContext('2d').clearRect(0,0,it.live.width,it.live.height); }
function update(key){
  const it=I[key]; if(!it||!it.cv.isConnected) return;
  fimLive(it);
  if(!S.on){ mostrar(it,'plano'); return; }
  render(it); mostrar(it,'3d');
}
function renderAll(){ Object.keys(I).forEach(k=>{ if(I[k].cv.isConnected) update(k); }); }

/* trecho em andamento (mapas sem canvas "live": mostra a pintura plana enquanto desenha) */
function liveStart(key){ const it=I[key]; if(!it||!it.cv.isConnected||!S.on||it.overlay) return; mostrar(it,'plano'); }
function liveEnd(key){ const it=I[key]; if(it&&!it.overlay) update(key); }

/* exportação: desenha o 3D (se ligado) no contexto de saída; devolve false se o mapa deve usar o desenho plano */
function draw(key,ctx,W,H){
  const it=I[key]; if(!S.on||!it||!it.cv.isConnected||!it.cv.width) return false;
  update(key);
  ctx.save(); ctx.globalAlpha=S.alfa; ctx.drawImage(it.cv,0,0,W,H); ctx.restore(); return true;
}

/* ------------------------- painel de opções ------------------------- */
function painel(depoisDe){
  if(!depoisDe||($('msl3d-panel')&&$('msl3d-panel').isConnected)) return;
  const sl=(id,rot,min,max,step,val)=>`<label class="m3-sl"><span>${rot}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><output id="${id}-v">${val}</output></label>`;
  const bt=(k,t)=>`<button type="button" class="msl-btn m3-st${S.estilo===k?' on':''}" data-m3="${k}">${t}</button>`;
  const d=document.createElement('div'); d.id='msl3d-panel'; d.className='ti-card'; d.style.marginTop='12px';
  d.innerHTML=`<details${OPTS.aberto?' open':''}><summary class="m3-sum">Efeito 3D na pintura · <b id="m3-sum">${S.on?'ligado':'desligado'}</b></summary>
    <div class="msl-row" style="margin:10px 0 8px"><button type="button" class="msl-btn${S.on?' on':''}" id="m3-on" aria-pressed="${S.on}">${S.on?'3D ligado':'3D desligado (plano)'}</button>
      ${bt('gel','Gel brilhante')}${bt('relevo','Relevo')}${bt('tubo','Tubo')}</div>
    <div class="m3-grid">${sl('m3-relevo','Volume',.3,2,.05,S.relevo)}${sl('m3-brilho','Brilho',0,1.5,.05,S.brilho)}${sl('m3-sombra','Sombra',0,1,.05,S.sombra)}${sl('m3-alfa','Opacidade',.5,1,.02,S.alfa)}</div>
    <div class="lt" style="font-size:11.5px;color:var(--dim);margin-top:6px">O efeito é só visual e vale também para a imagem exportada. Ao soltar o traço, a pintura ganha volume.</div></details>`;
  depoisDe.insertAdjacentElement('afterend',d);
  const sync=()=>{ $('m3-on').textContent=S.on?'3D ligado':'3D desligado (plano)'; $('m3-on').classList.toggle('on',S.on); $('m3-on').setAttribute('aria-pressed',String(S.on)); $('m3-sum').textContent=S.on?'ligado':'desligado';
    d.querySelectorAll('.m3-st').forEach(b=>b.classList.toggle('on',b.dataset.m3===S.estilo)); };
  $('m3-on').onclick=()=>{ S.on=!S.on; salvar(); sync(); renderAll(); };
  d.querySelectorAll('.m3-st').forEach(b=>b.onclick=()=>{ S.estilo=b.dataset.m3; S.on=true; salvar(); sync(); renderAll(); });
  [['m3-relevo','relevo'],['m3-brilho','brilho'],['m3-sombra','sombra'],['m3-alfa','alfa']].forEach(([id,k])=>{
    const el=$(id), out=$(id+'-v');
    el.oninput=()=>{ S[k]=+el.value; out.textContent=el.value; salvar();
      Object.keys(I).forEach(n=>{ I[n].cv.style.opacity=S.alfa; if(I[n].live) I[n].live.style.opacity=S.alfa; });
      if(S.on){ clearTimeout(el._t); el._t=setTimeout(renderAll,60); } };
  });
}
(function css(){
  if($('msl3d-css')) return; const s=document.createElement('style'); s.id='msl3d-css';
  s.textContent='.m3-sum{cursor:pointer;font-size:13px;font-weight:700}.m3-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px 14px}.m3-sl{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:650;color:var(--dim)}.m3-sl input{flex:1;min-width:60px;accent-color:var(--accent)}.m3-sl output{min-width:28px;text-align:right;font-variant-numeric:tabular-nums}';
  document.head.appendChild(s);
})();

window.msl3d = {S, OPTS, attach, update, renderAll, liveStart, liveEnd, draw, painel, set(o){ Object.assign(S,o||{}); salvar(); renderAll(); }};

/* ========================= PRÓSTATA (motor próprio do mapa quadrado) =========================
   Encaixa por fora, nas funções globais de mapa-lesional.js. Aqui há o canvas "live":
   o trecho em andamento aparece plano e a pintura já feita continua com volume. */
function enc(nome,antes,depois){
  const orig=window[nome]; if(typeof orig!=='function'||orig._m3d) return;
  const f=function(){ if(antes) try{ antes.apply(this,arguments); }catch(e){ console.error(e); }
    const r=orig.apply(this,arguments);
    if(depois) try{ depois.apply(this,arguments); }catch(e){ console.error(e); }
    return r; };
  f._m3d=1; window[nome]=f;
}
const P = ()=>I.msl;
function pIniciaLive(){
  const it=P(); if(!it||!S.on||it.liveOn||!it.cv.isConnected) return;
  if(mslState().tool==='erase'){ mostrar(it,'plano'); return; }          // borracha: mostra a pintura plana enquanto apaga
  it.realCtx=MSL.pctx; MSL.pctx=it.live.getContext('2d'); it.liveOn=true;
}
function pFimLive(){ const it=P(); if(!it) return; if(it.liveOn&&it.realCtx) MSL.pctx=it.realCtx; it.liveOn=false; it.realCtx=null; fimLive(it); }
enc('mslStrokeStart', pIniciaLive);
enc('mslStrokeEnd',
  function(){ const it=P(); if(it&&it.liveOn&&it.realCtx){ const real=it.realCtx; if(MSL.stroke) real.drawImage(it.live,0,0); MSL.pctx=real; it.liveOn=false; it.realCtx=null; } },
  function(){ update('msl'); });
enc('mslRedrawAll', pFimLive, function(){ if(P()&&P().cv.isConnected) update('msl'); });
const exportOrig=window.mslExportCanvas;
window.mslExportCanvas=function(maxSide){
  const it=P(); if(!S.on||!it||!it.cv.isConnected||typeof MSL==='undefined'||!MSL.base) return exportOrig.apply(this,arguments);
  const N=MSL.N, sc=Math.min(1,(maxSide||N)/N), W=Math.round(N*sc), c=document.createElement('canvas'); c.width=c.height=W;
  const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,W,W); x.imageSmoothingQuality='high';
  x.drawImage(MSL.base,0,0,W,W); draw('msl',x,W,W); return c;
};
enc('mslInit', null, function(){
  const oc=(typeof MSL_ORGAOS!=='undefined')&&MSL_ORGAOS[mslState().org]; if(oc&&oc.custom) return;     // os outros mapas ligam o 3D por conta própria
  if(!$('msl-ed')||typeof MSL==='undefined'||!MSL.N) return;
  attach('msl',{world:$('msl-world'), layers:[$('msl-paint')], overlay:true});
  painel($('msl-ed')); update('msl');
});
})();
