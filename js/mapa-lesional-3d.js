/* =========================================================================
   KlugRads — Mapa Setorial Lesional · EFEITO 3D NA PINTURA  (módulo de TESTE)
   ---------------------------------------------------------------------------
   Opcional e isolado: não muda os traços (desfazer, borracha, legenda e "lesões
   usadas" continuam lendo a pintura plana). Ele só PINTA POR CIMA uma versão com
   volume: a pintura vira um relevo (altura calculada a partir da forma do traço),
   recebe luz (difusa + brilho) e sombra projetada no desenho.

   Como funciona
   1. A camada de pintura (plana) é reduzida para 630 px e vira uma máscara.
   2. Distância até a borda (EDT) -> altura: cada traço ganha um perfil arredondado,
      qualquer que seja a espessura ("gel" e "tubo") ou só uma borda chanfrada ("relevo").
   3. A altura gera normais; luz vinda de cima à esquerda -> camada de luz/sombra
      (branco = realce, preto = sombra) que é aplicada SÓ onde há tinta (source-atop).
   4. A sombra projetada sai do próprio canvas (shadowBlur) e o resultado fica num
      canvas #msl-3d por cima do desenho. A exportação (copiar/baixar) usa esse canvas.
   Durante o traço, o trecho em andamento aparece plano (#msl-live) e ganha volume
   ao soltar o dedo/mouse.

   Para testar: o painel "Efeito 3D (teste)" aparece sozinho acima do editor da PRÓSTATA.
   ========================================================================= */
(function(){
'use strict';
if(window.msl3d) return;

const S = {on:false, estilo:'gel', relevo:1, brilho:.8, sombra:.55, alfa:.85};
const WL = 630;                                   // resolução do cálculo do relevo
let cv3=null, live=null, low=null, lowCtx=null, lightCv=null, comp=null, realCtx=null, liveOn=false;
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
function camadaLuz(w,h,mask,hg,tint){
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

/* ------------------------- composição ------------------------- */
function garantir(){
  const w=$('msl-world'), p=$('msl-paint'); if(!w||!p||typeof MSL==='undefined'||!MSL.N) return false;
  const N=MSL.N;
  if(!cv3||cv3.parentNode!==w){
    cv3=document.createElement('canvas'); cv3.id='msl-3d'; live=document.createElement('canvas'); live.id='msl-live';
    w.appendChild(cv3); w.appendChild(live); realCtx=null; liveOn=false;
  }
  if(cv3.width!==N){ cv3.width=cv3.height=live.width=live.height=N; comp=null; }
  cv3.style.opacity=S.alfa; live.style.opacity=S.alfa;
  return true;
}
function mostrar(modo){
  const p=$('msl-paint'); if(!p||!cv3) return;
  const v=(el,on)=>{ el.style.visibility=on?'visible':'hidden'; };
  v(p, modo!=='3d'); v(cv3, modo==='3d'); v(live, modo==='3d');
}
function render(){
  if(!garantir()) return;
  if(!S.on){ fimLive(); mostrar('plano'); return; }
  const N=MSL.N;
  if(!low){ low=document.createElement('canvas'); lowCtx=low.getContext('2d',{willReadFrequently:true}); lightCv=document.createElement('canvas'); }
  const Wl=WL, Hl=WL; low.width=Wl; low.height=Hl; lightCv.width=Wl; lightCv.height=Hl;
  lowCtx.clearRect(0,0,Wl,Hl); lowCtx.imageSmoothingQuality='high'; lowCtx.drawImage(MSL.paint,0,0,Wl,Hl);
  const data=lowCtx.getImageData(0,0,Wl,Hl).data, mask=new Uint8Array(Wl*Hl);
  for(let i=0;i<mask.length;i++) mask[i]=data[i*4+3]>90?1:0;
  const hg=altura(mask,Wl,Hl);
  lightCv.getContext('2d').putImageData(camadaLuz(Wl,Hl,mask,hg),0,0);
  if(!comp||comp.width!==N){ comp=document.createElement('canvas'); comp.width=comp.height=N; }
  const c=comp.getContext('2d'); c.globalCompositeOperation='source-over'; c.clearRect(0,0,N,N);
  c.drawImage(MSL.paint,0,0);                       // cor (plana) ...
  c.globalCompositeOperation='source-atop'; c.imageSmoothingQuality='high'; c.drawImage(lightCv,0,0,N,N);   // ... + luz/sombra só onde há tinta
  c.globalCompositeOperation='source-over';
  const x=cv3.getContext('2d'); x.clearRect(0,0,N,N);
  x.save(); x.shadowColor=`rgba(0,0,0,${(.6*S.sombra*(S.estilo==='tubo'?1.4:1)).toFixed(3)})`; x.shadowBlur=N*.008*(.6+S.sombra); x.shadowOffsetX=N*.0035*S.relevo; x.shadowOffsetY=N*.006*S.relevo;
  x.drawImage(comp,0,0); x.restore();
  fimLive(); mostrar('3d');
}

/* trecho em andamento: aparece plano num canvas à parte (resposta imediata) */
function iniciaLive(){
  if(!S.on||!garantir()||liveOn) return;
  if(mslState().tool==='erase'){ mostrar('plano'); return; }       // borracha: mostra a pintura plana enquanto apaga
  realCtx=MSL.pctx; MSL.pctx=live.getContext('2d'); liveOn=true;
}
function fimLive(){
  if(liveOn && realCtx){ MSL.pctx=realCtx; }
  liveOn=false; realCtx=null;
  if(live&&live.width) live.getContext('2d').clearRect(0,0,live.width,live.height);
}

/* ------------------------- encaixe nas funções do mapa ------------------------- */
function enc(nome,antes,depois){
  const orig=window[nome]; if(typeof orig!=='function'||orig._m3d) return;
  const f=function(){ if(antes) try{ antes.apply(this,arguments); }catch(e){ console.error(e); }
    const r=orig.apply(this,arguments);
    if(depois) try{ depois.apply(this,arguments); }catch(e){ console.error(e); }
    return r; };
  f._m3d=1; window[nome]=f;
}
enc('mslStrokeStart', iniciaLive);
enc('mslStrokeEnd',
  function(){ if(liveOn && realCtx && MSL.stroke){ const real=realCtx; real.drawImage(live,0,0); MSL.pctx=real; liveOn=false; realCtx=null; } else if(liveOn){ MSL.pctx=realCtx||MSL.pctx; liveOn=false; realCtx=null; } },
  function(){ render(); });
enc('mslRedrawAll', function(){ fimLive(); }, function(){ if(S.on) render(); });
const exportOrig=window.mslExportCanvas;
window.mslExportCanvas=function(maxSide){
  if(!S.on||!cv3||typeof MSL==='undefined'||!MSL.base) return exportOrig.apply(this,arguments);
  const N=MSL.N, sc=Math.min(1,(maxSide||N)/N), W=Math.round(N*sc), c=document.createElement('canvas'); c.width=c.height=W;
  const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,W,W); x.imageSmoothingQuality='high';
  x.drawImage(MSL.base,0,0,W,W); x.globalAlpha=S.alfa; x.drawImage(cv3,0,0,W,W); x.globalAlpha=1; return c;
};

/* ------------------------- painel de teste ------------------------- */
function painel(){
  const wrap=document.querySelector('.msl-wrap'), ed=$('msl-ed'); if(!wrap||!ed||$('msl3d-panel')) return;
  const sl=(id,rot,min,max,step,val)=>`<label class="m3-sl"><span>${rot}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><output id="${id}-v">${val}</output></label>`;
  const bt=(k,t)=>`<button type="button" class="msl-btn m3-st${S.estilo===k?' on':''}" data-m3="${k}">${t}</button>`;
  const d=document.createElement('div'); d.id='msl3d-panel'; d.className='ti-card';
  d.innerHTML=`<div class="tfg-sec-lbl">Efeito 3D na pintura (teste)</div>
    <div class="msl-row" style="margin-bottom:8px"><button type="button" class="msl-btn${S.on?' on':''}" id="m3-on" aria-pressed="${S.on}">${S.on?'3D ligado':'3D desligado (plano)'}</button>
      ${bt('gel','Gel brilhante')}${bt('relevo','Relevo')}${bt('tubo','Tubo')}</div>
    <div class="m3-grid">${sl('m3-relevo','Volume',.3,2,.05,S.relevo)}${sl('m3-brilho','Brilho',0,1.5,.05,S.brilho)}${sl('m3-sombra','Sombra',0,1,.05,S.sombra)}${sl('m3-alfa','Opacidade',.5,1,.02,S.alfa)}</div>
    <div class="lt" style="font-size:11.5px;color:var(--dim);margin-top:6px">Pinte com o pincel e compare ligando e desligando. Ao exportar, a imagem sai com o efeito ligado.</div>`;
  wrap.insertBefore(d,ed);
  const sync=()=>{ $('m3-on').textContent=S.on?'3D ligado':'3D desligado (plano)'; $('m3-on').classList.toggle('on',S.on); $('m3-on').setAttribute('aria-pressed',String(S.on));
    d.querySelectorAll('.m3-st').forEach(b=>b.classList.toggle('on',b.dataset.m3===S.estilo)); };
  $('m3-on').onclick=()=>{ S.on=!S.on; sync(); render(); };
  d.querySelectorAll('.m3-st').forEach(b=>b.onclick=()=>{ S.estilo=b.dataset.m3; S.on=true; sync(); render(); });
  [['m3-relevo','relevo'],['m3-brilho','brilho'],['m3-sombra','sombra'],['m3-alfa','alfa']].forEach(([id,k])=>{
    const el=$(id), out=$(id+'-v'); el.oninput=()=>{ S[k]=+el.value; out.textContent=el.value; if(S.on){ clearTimeout(el._t); el._t=setTimeout(render,60); } };
  });
}
(function css(){
  if($('msl3d-css')) return; const s=document.createElement('style'); s.id='msl3d-css';
  s.textContent='.m3-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px 14px}.m3-sl{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:650;color:var(--dim)}.m3-sl input{flex:1;min-width:60px;accent-color:var(--accent)}.m3-sl output{min-width:28px;text-align:right;font-variant-numeric:tabular-nums}';
  document.head.appendChild(s);
})();
enc('mslInit', null, function(){
  const oc=(typeof MSL_ORGAOS!=='undefined')&&MSL_ORGAOS[mslState().org]; if(oc&&oc.custom) return;     // só o mapa da PRÓSTATA
  cv3=null; live=null; garantir(); painel(); if(S.on) render();
});

window.msl3d = {S, render, set(o){ Object.assign(S,o||{}); render(); }};
})();
