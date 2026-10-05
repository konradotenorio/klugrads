/* =========================================================================
   KlugRads — Mapa Setorial Lesional · RIM (nódulo renal / R.E.N.A.L.)
   ---------------------------------------------------------------------------
   Terceiro órgão do Mapa Setorial Lesional (os outros: PRÓSTATA e PELVE).
   Em vez de pintura livre, a lesão é DESCRITA (lado, polo, posição, diâmetro,
   componente exofítico, distância ao seio/sistema coletor, relação com as
   linhas polares) e o esquema se desenha sozinho nos três planos:
     coronal  — visão anterior, convenção radiológica (direito do paciente à
                esquerda da tela), com as linhas polares;
     axial    — no nível do hilo, anterior no alto;
     sagital  — anterior à esquerda, cranial no alto.
   Hilo renal na ordem anatômica, de anterior para posterior:
     VEIA renal → ARTÉRIA renal → PELVE renal (sistema coletor).
   O escore R.E.N.A.L. (Kutikov & Uzzo, 2009) é calculado com os mesmos
   critérios da calculadora RENAL Score (calc-renal.js).
   Ilustração esquemática original (desenho vetorial), feita em KlugRads.
   Estado em memória (state.msl.rim). Nada sai do aparelho.
   ========================================================================= */
(function(){
'use strict';

const C = {
  cortex:'#D9897A', cortexS:'#9C4F42', medula:'#B9604F', seio:'#F5EBCF', seioS:'#D8C79A',
  coletor:'#E3B21F', coletorS:'#9A7A0E', art:'#D62828', veia:'#2B59C3',
  les:'#7E22CE', polar:'#1f2630', fundo:'#ffffff', txt:'#1f2630', dim:'#6b7280',
};
const MARCA = 'Ilustração esquemática — KlugRads';
const REF = [
  'Kutikov A, Uzzo RG. The R.E.N.A.L. nephrometry score: a comprehensive standardized system for quantitating renal tumor size, location and depth. J Urol. 2009;182(3):844–853.',
];
const PX_CM = 24.5;                 // escala do desenho: rim de ~11 cm ≈ 270 px

const LADO  = [['d','Rim direito'],['e','Rim esquerdo']];
const POLO  = [['sup','Polo superior'],['med','Terço médio (interpolar)'],['inf','Polo inferior']];
const POS   = [['lat','Margem lateral'],['ant','Face anterior'],['pos','Face posterior'],['med','Margem medial (hilar)']];
const EXO   = [['1','≥ 50% exofítica'],['2','< 50% exofítica'],['3','Totalmente endofítica']];
const LPOL  = [['1','Além da linha polar'],['2','Cruza a linha polar (< 50%)'],['3','> 50% além da linha polar']];

function st(){
  const m = mslState();
  if(!m.rim) m.rim = {lado:'d', polo:'sup', pos:'lat', diam:'', exo:'1', dist:'', l:'1', h:false};
  return m.rim;
}
const g = id => document.getElementById(id);
const num = v => { const n = parseFloat(String(v||'').replace(',','.')); return isNaN(n) ? null : n; };
const fmt = v => String(Math.round(v*10)/10).replace('.',',');

/* ======================= escore ======================= */
function lEfetivo(s){ return s.polo==='med' ? '3' : s.l; }
function aSufixo(s){ return s.pos==='ant' ? 'a' : s.pos==='pos' ? 'p' : 'x'; }
function escore(s){
  const d = num(s.diam), n = num(s.dist);
  const R = d==null ? null : d<=4 ? 1 : d<7 ? 2 : 3;
  const N = n==null ? null : n>=7 ? 1 : n>4 ? 2 : 3;
  const E = +s.exo, L = +lEfetivo(s);
  if(R==null || N==null) return {R, E, N, L, ok:false};
  const tot = R+E+N+L, suf = aSufixo(s) + (s.h ? 'h' : '');
  const comp = tot>=10 ? ['Alta complexidade','high'] : tot>=7 ? ['Moderada complexidade','mod'] : ['Baixa complexidade','low'];
  return {R, E, N, L, tot, suf, comp:comp[0], tone:comp[1], ok:true};
}

/* ======================= texto para o laudo ======================= */
function texto(){
  const s = st(), sc = escore(s), d = num(s.diam), n = num(s.dist);
  const lado = s.lado==='d' ? 'direito' : 'esquerdo';
  const polo = {sup:'no polo superior', med:'no terço médio', inf:'no polo inferior'}[s.polo];
  const pos  = {lat:'na margem lateral', ant:'na face anterior', pos:'na face posterior', med:'na margem medial (hilar)'}[s.pos];
  const exo  = {'1':'predominantemente exofítica (≥ 50%)', '2':'com componente exofítico inferior a 50%', '3':'totalmente endofítica'}[s.exo];
  const linha = s.polo==='sup' ? 'superior' : 'inferior';
  const L = lEfetivo(s);
  const lp = s.polo==='med' ? 'situada entre as linhas polares'
    : L==='1' ? `situada inteiramente ${s.polo==='sup'?'acima':'abaixo'} da linha polar ${linha}`
    : L==='2' ? `cruzando a linha polar ${linha}`
    : `com mais de 50% da lesão além da linha polar ${linha}`;
  let t = `Lesão no rim ${lado}, ${polo}, ${pos}, ${d!=null?`medindo ${fmt(d)} cm no maior eixo`:'medindo ___ cm no maior eixo'}, ${exo}, ${n!=null?`distando ${fmt(n)} mm do seio renal / sistema coletor`:'distando ___ mm do seio renal / sistema coletor'}, ${lp}.`;
  if(s.h) t += ' Contato com a artéria ou a veia renal principal (hilar).';
  if(sc.ok) t += `\nEscore de nefrometria R.E.N.A.L.: ${sc.tot}${sc.suf} (R${sc.R} + E${sc.E} + N${sc.N} + L${sc.L}) — ${sc.comp.toLowerCase()}.`;
  return t;
}

/* ======================= geometria ======================= */
/* Escala real: PX_CM px = 1 cm. Rim adulto: 11 cm (maior eixo) × 4 cm (transverso) × 3,5 cm (AP). */
const KL = 11, KT = 4, KAP = 3.5;
/* contorno em feijão: elipse (a,b) girada (rot) com a reentrância do hilo no ângulo notch */
function bean(cx,cy,a,b,rot,notch,depth,width){
  const P = [];
  for(let i=0;i<200;i++){
    const t = i/200*2*Math.PI; let x = a*Math.cos(t), y = b*Math.sin(t);
    const c = Math.cos(rot), s = Math.sin(rot); let X = x*c - y*s, Y = x*s + y*c;
    if(depth){
      const phi = Math.atan2(Y,X); const dd = Math.atan2(Math.sin(phi-notch), Math.cos(phi-notch));
      const k = depth*Math.exp(-(dd/width)*(dd/width)), r = Math.hypot(X,Y);
      X *= (r-k)/r; Y *= (r-k)/r;
    }
    P.push([cx+X, cy+Y]);
  }
  return P;
}
/* contorno suave (Catmull-Rom → Bézier) */
function path(P){
  const n=P.length, f=v=>v.toFixed(1); let d=`M${f(P[0][0])} ${f(P[0][1])}`;
  for(let i=0;i<n;i++){
    const p0=P[(i-1+n)%n], p1=P[i], p2=P[(i+1)%n], p3=P[(i+2)%n];
    d+=`C${f(p1[0]+(p2[0]-p0[0])/6)} ${f(p1[1]+(p2[1]-p0[1])/6)} ${f(p2[0]-(p3[0]-p1[0])/6)} ${f(p2[1]-(p3[1]-p1[1])/6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d+'Z';
}
/* distância do centro (ox,oy) ao contorno P na direção ang */
function raioDir(P,ox,oy,ang){
  let best=null, bd=9;
  P.forEach(p=>{ const a=Math.atan2(p[1]-oy,p[0]-ox), d=Math.abs(Math.atan2(Math.sin(a-ang),Math.cos(a-ang))); if(d<bd){ bd=d; best=p; } });
  return Math.hypot(best[0]-ox,best[1]-oy);
}
function naDirecao(P,ox,oy,ang){ const r=raioDir(P,ox,oy,ang); return [ox+Math.cos(ang)*r, oy+Math.sin(ang)*r]; }
/* ponto do contorno na altura y, do lado sinal (+1 direita da tela, -1 esquerda) */
function naAltura(P,cx,y,sinal){
  let best=null, bd=1e9;
  P.forEach(p=>{ if((p[0]-cx)*sinal<=0) return; const d=Math.abs(p[1]-y); if(d<bd){ bd=d; best=p; } });
  return best;
}
/* centro da lesão a partir do ponto de superfície e da normal externa (E define a profundidade) */
function profundidade(p,nx,ny,r,exo){
  const off = exo==='1' ? 0.3*r : exo==='2' ? -0.35*r : -(r+3);
  return [p[0]+nx*off, p[1]+ny*off];
}
function lesao(cx,cy,r,proj){
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${proj?C.les:'url(#rmLes)'}" fill-opacity="${proj?0.18:0.78}" stroke="#5B168F" stroke-width="2"${proj?' stroke-dasharray="6 4"':''}/>`;
}
/* altura (y) do centro da lesão conforme o polo e a relação com a linha polar */
function alturaLesao(s,cy,yU,yL,r,b){
  if(s.polo==='med') return cy;
  const L = lEfetivo(s), up = s.polo==='sup';
  const linha = up ? yU : yL, sg = up ? -1 : 1;
  let y = L==='1' ? linha + sg*(r+3) : L==='2' ? linha + sg*(r*0.45) : linha - sg*(r*0.25);
  const lim = up ? cy-b+r*0.4 : cy+b-r*0.4;
  if(L==='1') y = up ? Math.max(y, Math.min(lim, linha-3)) : Math.min(y, Math.max(lim, linha+3));
  return y;
}
/* raio da lesão em escala real (diâmetro informado; sem valor: 2,5 cm) */
function raio(s){ const d=num(s.diam); return Math.max(3, (d==null?2.5:d)/2*PX_CM); }

/* interseção do raio (ox,oy)+t·(dx,dy) com a elipse (sx,sy,rx,ry,rot) — maior t positivo */
function raioElipse(ox,oy,dx,dy,sx,sy,rx,ry,rot){
  const c=Math.cos(-rot), s=Math.sin(-rot);
  const X=(ox-sx)*c-(oy-sy)*s, Y=(ox-sx)*s+(oy-sy)*c, DX=dx*c-dy*s, DY=dx*s+dy*c;
  const A=DX*DX/(rx*rx)+DY*DY/(ry*ry), B=2*(X*DX/(rx*rx)+Y*DY/(ry*ry)), Cc=X*X/(rx*rx)+Y*Y/(ry*ry)-1;
  const D=B*B-4*A*Cc; if(D<0) return 0; return (-B+Math.sqrt(D))/(2*A);
}
const f1 = v => v.toFixed(1);
const linha = (pts,cor,w,op) => `<path d="M${pts.map(p=>f1(p[0])+' '+f1(p[1])).join('L')}" stroke="${cor}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${op!=null?` opacity="${op}"`:''}/>`;
const curva = (a,c,b,cor,w) => `<path d="M${f1(a[0])} ${f1(a[1])}Q${f1(c[0])} ${f1(c[1])} ${f1(b[0])} ${f1(b[1])}" stroke="${cor}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
/* vaso/ducto com contorno (duas passadas) */
const tubo = (a,c,b,cor,borda,w) => curva(a,c,b,borda,w+2) + curva(a,c,b,cor,w);

/* ======================= motor anatômico =======================
   Desenha cápsula/córtex, pirâmides (medula), colunas, seio renal com gordura,
   cálices menores (taça em cada papila), infundíbulos até os cálices maiores
   e a pelve; ramos da artéria e da veia nas colunas entre as pirâmides. */
function rimAnatomico(o){
  const {K, ox, oy, angs, sinus, junc, pelve, ramosA, ramosV, seioNotch} = o, z = o.z||1;
  const [sx,sy,srx,sry,srot] = sinus;
  let base = `<path d="${path(K)}" fill="url(#rmCortex)" stroke="#8E3F33" stroke-width="2.2"/>`;
  // seio renal (gordura) — elipse
  const S = bean(sx,sy,srx,sry,srot,seioNotch!=null?seioNotch:0,0,1);
  const seio = `<path d="${path(S)}" fill="url(#rmSeio)" stroke="#CDB57A" stroke-width="1.2"/>`
    + [[-.35,-.5],[.25,-.15],[-.2,.35],[.3,.55],[0,.05]].map(([u,v])=>{ const c=Math.cos(srot), s=Math.sin(srot), x=sx+(u*srx*c - v*sry*s), y=sy+(u*srx*s + v*sry*c); return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(srx*0.22)}" ry="${f1(srx*0.17)}" fill="#FFF7DF" opacity=".55"/>`; }).join('');
  // pirâmides
  let pir = '', cal = '';
  const papilas = [];
  angs.forEach(a=>{
    const dx=Math.cos(a), dy=Math.sin(a), D=raioDir(K,ox,oy,a), Ds=raioElipse(ox,oy,dx,dy,sx,sy,srx,sry,srot);
    const tb=D-Math.max(9*z, Math.min(D*0.3, 16*z)); let ta=Math.max(Ds+1, tb*0.45); ta=Math.max(ta, tb-36*z); if(tb-ta<5) return;
    const px=-dy, py=dx, w=Math.min(13*z, Math.max(5,(tb-ta)*0.5)), wa=2.2*z;
    const B=[ox+dx*tb, oy+dy*tb], A=[ox+dx*ta, oy+dy*ta], Bo=[ox+dx*(tb+4), oy+dy*(tb+4)];
    const b1=[B[0]+px*w,B[1]+py*w], b2=[B[0]-px*w,B[1]-py*w], a1=[A[0]+px*wa,A[1]+py*wa], a2=[A[0]-px*wa,A[1]-py*wa];
    const m1=[(b1[0]+a1[0])/2+px*w*0.18,(b1[1]+a1[1])/2+py*w*0.18], m2=[(b2[0]+a2[0])/2-px*w*0.18,(b2[1]+a2[1])/2-py*w*0.18];
    pir += `<path d="M${f1(b1[0])} ${f1(b1[1])}Q${f1(Bo[0])} ${f1(Bo[1])} ${f1(b2[0])} ${f1(b2[1])}Q${f1(m2[0])} ${f1(m2[1])} ${f1(a2[0])} ${f1(a2[1])}Q${f1(A[0]-dx*2)} ${f1(A[1]-dy*2)} ${f1(a1[0])} ${f1(a1[1])}Q${f1(m1[0])} ${f1(m1[1])} ${f1(b1[0])} ${f1(b1[1])}Z" fill="url(#rmPir)" stroke="#7E2F27" stroke-width=".8" stroke-opacity=".5"/>`;
    for(let k=-2;k<=2;k++){ const q=k/2.6; pir += linha([[B[0]+px*w*q*0.9,B[1]+py*w*q*0.9],[A[0]+px*wa*q,A[1]+py*wa*q]],'#6E2620',0.6,0.35); }
    papilas.push({A, dx, dy, px, py, a});
  });
  // cálices menores (taça), infundíbulos, cálices maiores e pelve
  papilas.forEach(p=>{
    const c1=[p.A[0]+p.px*6.5*z-p.dx*0.5, p.A[1]+p.py*6.5*z-p.dy*0.5], c2=[p.A[0]-p.px*6.5*z-p.dx*0.5, p.A[1]-p.py*6.5*z-p.dy*0.5];
    const fundo=[p.A[0]-p.dx*6*z, p.A[1]-p.dy*6*z];
    const J = junc(p.a);
    cal += tubo(fundo,[(fundo[0]+J[0])/2,(fundo[1]+J[1])/2],J,'#F2D879','#A88A26',3.4*z);
    cal += `<path d="M${f1(c1[0])} ${f1(c1[1])}Q${f1(p.A[0]-p.dx*1)} ${f1(p.A[1]-p.dy*1)} ${f1(c2[0])} ${f1(c2[1])}Q${f1(fundo[0]-p.px*2)} ${f1(fundo[1]-p.py*2)} ${f1(fundo[0])} ${f1(fundo[1])}Q${f1(fundo[0]+p.px*2)} ${f1(fundo[1]+p.py*2)} ${f1(c1[0])} ${f1(c1[1])}Z" fill="#F2D879" stroke="#A88A26" stroke-width="1"/>`;
  });
  return {base, seio, pir, cal, papilas, pelve, ramosA, ramosV};
}
/* ramos vasculares nas colunas (entre pirâmides), a partir do ponto do hilo */
function ramos(K,ox,oy,angs,H,cor,borda,w,desvio,passo){
  let o=''; const gaps=[];
  for(let i=0;i<angs.length-1;i++) gaps.push((angs[i]+angs[i+1])/2);
  gaps.forEach((a,i)=>{
    if(passo && i%passo) return;
    a += desvio; const D=raioDir(K,ox,oy,a), e=[ox+Math.cos(a)*D*0.8, oy+Math.sin(a)*D*0.8], m=[ox+Math.cos(a)*D*0.4, oy+Math.sin(a)*D*0.4];
    const q=[(H[0]+m[0])/2+(ox-(H[0]+m[0])/2)*0.35, (H[1]+m[1])/2+(oy-(H[1]+m[1])/2)*0.35];
    o += tubo(H,q,m,cor,borda,w*1.25) + tubo(m,[(m[0]+e[0])/2,(m[1]+e[1])/2],e,cor,borda,w);
    // arqueada: pequeno arco na base das pirâmides
    const pa=-Math.sin(a), pb=Math.cos(a);
    o += curva([e[0]-pa*5,e[1]-pb*5],[e[0]+Math.cos(a)*2,e[1]+Math.sin(a)*2],[e[0]+pa*5,e[1]+pb*5],cor,Math.max(1,w*0.55));
  });
  return o;
}
function defs(){
  return `<defs>
    <radialGradient id="rmCortex" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#E9A493"/><stop offset=".65" stop-color="#D47F6D"/><stop offset="1" stop-color="#B9604F"/></radialGradient>
    <linearGradient id="rmPir" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A9473C"/><stop offset="1" stop-color="#8C362D"/></linearGradient>
    <radialGradient id="rmSeio" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#FBEFC9"/><stop offset="1" stop-color="#EBD39A"/></radialGradient>
    <radialGradient id="rmLes" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#B57BE8"/><stop offset="1" stop-color="#7E22CE"/></radialGradient>
    <linearGradient id="rmArt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E53935"/><stop offset="1" stop-color="#B71C1C"/></linearGradient>
    <linearGradient id="rmVeia" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3F6FD8"/><stop offset="1" stop-color="#22479E"/></linearGradient>
  </defs>`;
}
function polares(cx,y1,y2,a,ox,lado){
  let o='';
  [y1,y2].forEach((y,i)=>{
    o += `<line x1="${ox+14}" y1="${f1(y)}" x2="${ox+290}" y2="${f1(y)}" stroke="${C.polar}" stroke-width="1.4" stroke-dasharray="7 5" opacity=".85"/>`;
    o += `<text x="${lado<0?ox+16:ox+288}" y="${f1(y-5)}" font-size="10" fill="${C.dim}" text-anchor="${lado<0?'start':'end'}" font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke">${i?'linha polar inferior':'linha polar superior'}</text>`;
  });
  return o;
}
function escala(ox,oy){
  const x=ox+20, y=oy+372, w=2*PX_CM;
  return `<path d="M${x} ${y-4}V${y}H${f1(x+w)}V${y-4}M${f1(x+w/2)} ${y}V${y-3}" stroke="${C.txt}" stroke-width="1.4" fill="none"/><text x="${f1(x+w/2)}" y="${y+12}" font-size="10" font-weight="700" fill="${C.txt}" text-anchor="middle">2 cm</text>`;
}

/* ======================= CORONAL ======================= */
function coronal(s,ox,oy){
  const sg = s.lado==='d' ? 1 : -1;                     // +1: hilo à direita da tela (rim direito)
  const a=KT/2*PX_CM, b=KL/2*PX_CM, cx=ox+142-sg*10, cy=oy+214;
  const notch = sg>0?0:Math.PI;
  const rotC = sg*0.12;
  const K = bean(cx,cy,a,b,rotC,notch,a*0.7,0.55);
  const yU=cy-b*0.5, yL=cy+b*0.5;
  const c0x=cx+sg*a*0.22, c0y=cy;
  const lat = sg>0?Math.PI:0;
  const angs=[-2.05,-1.62,-1.15,-0.62,0,0.62,1.15,1.62,2.05].map(k=>lat-sg*k);
  const sinus=[cx+sg*a*0.36, cy, a*0.46, b*0.5, rotC];
  const PV=[cx+sg*(a*0.62), cy+b*0.1];                 // pelve no hilo
  const MJ = {sup:[cx+sg*a*0.25, cy-b*0.3], med:[cx+sg*a*0.18, cy], inf:[cx+sg*a*0.25, cy+b*0.3]};
  const junc = ang => { const vy=Math.sin(ang); return vy<-0.55 ? MJ.sup : vy>0.55 ? MJ.inf : MJ.med; };
  const R = rimAnatomico({K, ox:c0x, oy:c0y, angs, sinus, junc, seioNotch:0});
  // cálices maiores e pelve
  let col = R.cal;
  ['sup','med','inf'].forEach(k=>{ col += tubo(MJ[k],[(MJ[k][0]+PV[0])/2,(MJ[k][1]+PV[1])/2],PV,'#F2D879','#A88A26',k==='med'?4:5); });
  col += `<path d="M${f1(PV[0]-sg*10)} ${f1(PV[1]-12)}Q${f1(PV[0]+sg*16)} ${f1(PV[1]-6)} ${f1(PV[0]+sg*20)} ${f1(PV[1]+14)}Q${f1(PV[0]+sg*6)} ${f1(PV[1]+18)} ${f1(PV[0]-sg*8)} ${f1(PV[1]+10)}Z" fill="#F2D879" stroke="#A88A26" stroke-width="1.2"/>`;
  col += tubo([PV[0]+sg*18,PV[1]+14],[PV[0]+sg*26,cy+b*0.75],[PV[0]+sg*14,oy+392],'#F2D879','#A88A26',4);
  // artéria (posterior à veia) e veia (anterior): ramos segmentares/interlobares e tronco
  const HA=[cx+sg*a*0.55, cy-b*0.17], HV=[cx+sg*a*0.6, cy-b*0.07];
  const art = ramos(K,c0x,c0y,angs,HA,'url(#rmArt)','#7F1010',1.2,0.07,0)
    + tubo([cx+sg*(a+95),cy-b*0.22],[cx+sg*(a+30),cy-b*0.2],HA,'url(#rmArt)','#7F1010',6);
  const vei = ramos(K,c0x,c0y,angs,HV,'url(#rmVeia)','#16336F',1.5,-0.08,2)
    + tubo([cx+sg*(a+95),cy-b*0.06],[cx+sg*(a+30),cy-b*0.04],HV,'url(#rmVeia)','#16336F',9);
  // lesão
  const r = raio(s), yl = alturaLesao(s,cy,yU,yL,r,b);
  let les;
  if(s.pos==='lat' || s.pos==='med'){
    const lado = s.pos==='lat' ? -sg : sg;
    if(s.pos==='med' && s.polo==='med') les = lesao(cx+sg*(s.exo==='3'?a*0.25:a*0.75), yl, r, false);
    else {
      const p = naAltura(K,cx,yl,lado), ccy=Math.max(cy-b*0.6,Math.min(cy+b*0.6,yl));
      let nx=p[0]-cx, ny=p[1]-ccy; const nn=Math.hypot(nx,ny)||1; nx/=nn; ny/=nn;
      const c = profundidade(p,nx,ny,r,s.exo); les = lesao(c[0],c[1],r,false);
    }
  } else les = lesao(cx-sg*a*0.25, yl, r, true);
  const o = R.base + R.pir + R.seio + col + art + vei + les + polares(cx,yU,yL,a,ox,sg>0?-1:1);
  return clip(ox,oy,o) + rotulos(ox,oy,'CORONAL', sg>0?['LATERAL','MEDIAL']:['MEDIAL','LATERAL'],['CRANIAL','CAUDAL']);
}

/* ======================= AXIAL (nível do hilo) ======================= */
function axial(s,ox,oy){
  const sg = s.lado==='d' ? 1 : -1;
  const Z=1.9;                                         // axial ampliado (zoom) para ficar legível
  const a=KT/2*PX_CM*Z, b=KAP/2*PX_CM*Z, cx=ox+150-sg*12, cy=oy+222;
  const notch = sg>0 ? -Math.PI/4 : -3*Math.PI/4;        // hilo voltado anteromedialmente
  const rot = sg>0 ? Math.PI/6 : -Math.PI/6;
  const K = bean(cx,cy,a,b,rot,notch,a*0.55,0.75);
  const dx=Math.cos(notch), dy=Math.sin(notch);
  const c0x=cx+dx*a*0.15, c0y=cy+dy*a*0.15;
  const angs=[-2.35,-1.6,-0.85,0,0.85,1.6,2.35].map(k=>notch+Math.PI+k);
  const sinus=[cx+dx*a*0.32, cy+dy*a*0.32, a*0.42, b*0.36, notch];
  const PV=[cx+dx*a*0.7, cy+dy*a*0.7];
  const ant = (dy*sg<0) ? [-dy,dx] : [dy,-dx];          // perpendicular que aponta para anterior (y menor)
  const A_ = ant[1]<0 ? ant : [-ant[0],-ant[1]];
  const R = rimAnatomico({K, ox:c0x, oy:c0y, angs, sinus, junc:()=>[PV[0]-A_[0]*4,PV[1]-A_[1]*4], seioNotch:notch, z:Z});
  // de anterior para posterior: veia, artéria, pelve (lanes paralelas saindo do hilo)
  const lane=(k,len)=>[[PV[0]+A_[0]*k-dx*4, PV[1]+A_[1]*k-dy*4],[PV[0]+A_[0]*k+dx*len*0.5, PV[1]+A_[1]*k+dy*len*0.5],[PV[0]+A_[0]*k+dx*len, PV[1]+A_[1]*k+dy*len]];
  const pel = lane(-12,90), ar = lane(3,120), ve = lane(17,120);
  let col = R.cal + tubo(pel[0],pel[1],pel[2],'#F2D879','#A88A26',12);
  const art = ramos(K,c0x,c0y,angs,ar[0],'url(#rmArt)','#7F1010',2.2,0.06,0) + tubo(ar[0],ar[1],ar[2],'url(#rmArt)','#7F1010',9);
  const vei = ramos(K,c0x,c0y,angs,ve[0],'url(#rmVeia)','#16336F',2.6,-0.07,2) + tubo(ve[0],ve[1],ve[2],'url(#rmVeia)','#16336F',13);
  const latA = sg>0 ? Math.PI : 0;
  const ang = s.pos==='lat' ? latA : s.pos==='med' ? (sg>0 ? Math.PI/10 : Math.PI-Math.PI/10)
            : s.pos==='ant' ? (sg>0 ? -Math.PI*0.6 : -Math.PI*0.4) : (sg>0 ? Math.PI*0.6 : Math.PI*0.4);
  const r = raio(s)*Z, p = naDirecao(K,cx,cy,ang);
  let ux=p[0]-cx, uy=p[1]-cy; const un=Math.hypot(ux,uy)||1; ux/=un; uy/=un;
  const c = profundidade(p,ux,uy,r,s.exo);
  const o = R.base + R.pir + R.seio + col + art + vei + lesao(c[0],c[1],r,false);
  return clip(ox,oy,o) + rotulos(ox,oy,'AXIAL (nível do hilo)', sg>0?['LATERAL','MEDIAL']:['MEDIAL','LATERAL'],['ANTERIOR','POSTERIOR']);
}

/* ======================= SAGITAL ======================= */
function sagital(s,ox,oy){
  const a=KAP/2*PX_CM, b=KL/2*PX_CM, cx=ox+150, cy=oy+214, rot=0.12;   // polo inferior um pouco mais anterior
  const K = bean(cx,cy,a,b,rot,0,0,1);
  const yU=cy-b*0.5, yL=cy+b*0.5;
  const angs=[-2.75,-2.2,-1.7,-1.25,-0.6,0,0.6,1.25,1.7,2.2,2.75,3.14159].map(k=>k);
  const sinus=[cx, cy, a*0.48, b*0.5, rot];
  const PV=[cx+8, cy+3];
  const jy = ang => cy + Math.max(-0.34,Math.min(0.34,Math.sin(ang)*0.4))*b;
  const R = rimAnatomico({K, ox:cx, oy:cy, angs, sinus, junc:ang=>[cx+6-Math.sin(rot)*(jy(ang)-cy), jy(ang)]});
  R.cal = tubo([cx+6+Math.sin(rot)*b*0.34, cy-b*0.34],[cx+8,cy],[cx+6-Math.sin(rot)*b*0.34, cy+b*0.34],'#F2D879','#A88A26',5) + R.cal;
  // hilo em corte: de anterior (esquerda) para posterior (direita): veia, artéria, pelve
  const vasos = `<circle cx="${cx+9}" cy="${cy+3}" r="7.5" fill="#F2D879" stroke="#A88A26" stroke-width="1.2"/>`
    + `<circle cx="${cx-3}" cy="${cy-3}" r="4.5" fill="url(#rmArt)" stroke="#7F1010" stroke-width="1"/>`
    + `<circle cx="${cx-14}" cy="${cy}" r="6.5" fill="url(#rmVeia)" stroke="#16336F" stroke-width="1"/>`;
  const r = raio(s), yl = alturaLesao(s,cy,yU,yL,r,b);
  let les;
  if(s.pos==='ant' || s.pos==='pos'){
    const p = naAltura(K,cx,yl,s.pos==='ant'?-1:1), ccy=Math.max(cy-b*0.6,Math.min(cy+b*0.6,yl));
    let nx=p[0]-cx, ny=p[1]-ccy; const nn=Math.hypot(nx,ny)||1; nx/=nn; ny/=nn;
    const c = profundidade(p,nx,ny,r,s.exo); les = lesao(c[0],c[1],r,false);
  } else les = lesao(cx, yl, r, true);
  const o = R.base + R.pir + R.seio + R.cal + vasos + les + polares(cx,yU,yL,a,ox,1);
  return clip(ox,oy,o) + rotulos(ox,oy,'SAGITAL',['ANTERIOR','POSTERIOR'],['CRANIAL','CAUDAL']);
}
let CLIPN = 0;
function clip(ox,oy,inner){
  const id='rmClip'+(++CLIPN);
  return `<clipPath id="${id}"><rect x="${ox+1}" y="${oy+1}" width="302" height="404" rx="13"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
}

function rotulos(ox,oy,tit,[esq,dir],[cima,baixo]){
  const F = 'font-family="Segoe UI,Arial,Helvetica,sans-serif"', H='stroke="#fff" stroke-width="3" paint-order="stroke"';
  return `<text x="${ox+150}" y="${oy+24}" ${F} font-size="15" font-weight="800" fill="${C.txt}" text-anchor="middle" ${H}>${tit}</text>`
    + `<text x="${ox+150}" y="${oy+42}" ${F} font-size="10.5" font-weight="700" fill="${C.dim}" text-anchor="middle" ${H}>${cima}</text>`
    + `<text x="${ox+150}" y="${oy+398}" ${F} font-size="10.5" font-weight="700" fill="${C.dim}" text-anchor="middle" ${H}>${baixo}</text>`
    + `<text x="${ox+8}" y="${oy+60}" ${F} font-size="10.5" font-weight="700" fill="${C.dim}" text-anchor="start" ${H}>${esq}</text>`
    + `<text x="${ox+294}" y="${oy+60}" ${F} font-size="10.5" font-weight="700" fill="${C.dim}" text-anchor="end" ${H}>${dir}</text>`;
}

/* ======================= imagem completa (3 planos + legenda + escore) ======================= */
const W = 960, H = 520;
function svg(){
  const s = st(), sc = escore(s); CLIPN = 0;
  const F = 'font-family="Segoe UI,Arial,Helvetica,sans-serif"';
  const lado = s.lado==='d' ? 'RIM DIREITO' : 'RIM ESQUERDO';
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` + defs();
  o += `<rect width="${W}" height="${H}" fill="${C.fundo}"/>`;
  o += `<text x="${W/2}" y="30" ${F} font-size="19" font-weight="800" fill="${C.txt}" text-anchor="middle">MAPA DA LESÃO RENAL — ${lado}</text>`;
  o += `<g ${F}>` + coronal(s,8,44) + axial(s,328,44) + sagital(s,648,44) + '</g>';
  [0,320,640].forEach(x=>{ o += `<rect x="${x+9}" y="45" width="302" height="404" rx="13" fill="none" stroke="#e3e5ea" stroke-width="1.5"/>`; });
  const it = [['url(#rmVeia)','Veia renal'],['url(#rmArt)','Artéria renal'],['#F2D879','Sistema coletor'],['url(#rmLes)','Lesão']];
  let lx = 20; const ly = 474;
  it.forEach(([c,t])=>{ o += `<circle cx="${lx+7}" cy="${ly}" r="7" fill="${c}" stroke="rgba(0,0,0,.25)"/><text x="${lx+19}" y="${ly+4}" ${F} font-size="12.5" font-weight="600" fill="${C.txt}">${t}</text>`; lx += 30 + t.length*7; });
  o += `<line x1="${lx}" y1="${ly}" x2="${lx+26}" y2="${ly}" stroke="${C.polar}" stroke-width="1.6" stroke-dasharray="7 5"/><text x="${lx+32}" y="${ly+4}" ${F} font-size="12.5" font-weight="600" fill="${C.txt}">Linhas polares</text>`;
  o += `<text x="20" y="${ly+24}" ${F} font-size="11" fill="${C.dim}">Hilo, de anterior para posterior: veia, artéria, pelve. Tracejado = lesão projetada fora do plano.</text>`;
  if(sc.ok){
    const tc = {low:'#1f9d55',mod:'#e07a1f',high:'#cf2020'}[sc.tone];
    o += `<rect x="${W-262}" y="${ly-22}" width="244" height="50" rx="12" fill="${tc}" fill-opacity=".12" stroke="${tc}" stroke-width="1.5"/>`;
    o += `<text x="${W-246}" y="${ly+2}" ${F} font-size="20" font-weight="800" fill="${tc}">R.E.N.A.L. ${sc.tot}${sc.suf}</text>`;
    o += `<text x="${W-246}" y="${ly+19}" ${F} font-size="11.5" font-weight="700" fill="${C.txt}">${sc.comp} · R${sc.R} E${sc.E} N${sc.N} L${sc.L}</text>`;
  }
  o += `<text x="${W-12}" y="${H-8}" ${F} font-size="10" fill="#9aa1ab" text-anchor="end">${MARCA}</text>`;
  return o + '</svg>';
}

/* ======================= desenho livre (por cima do esquema) ======================= */
const CORES = [['#7E22CE','Roxo'],['#E11D2E','Vermelho'],['#1D4ED8','Azul'],['#111111','Preto'],['#059669','Verde']];
const DZ = 2;                                          // resolução do canvas (×)
const DR = {ctx:null, cur:null, rect:null};
function dst(){ const s=st(); if(!s.draw) s.draw={on:false, cor:'#7E22CE', w:4, tool:'pen', strokes:[], redo:[]}; return s.draw; }
function traco(ctx,t){
  const q=t.pts; ctx.save(); ctx.scale(DZ,DZ); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=t.w;
  ctx.globalCompositeOperation = t.e ? 'destination-out' : 'source-over'; ctx.strokeStyle = t.c; ctx.fillStyle = t.c;
  if(q.length<4){ ctx.beginPath(); ctx.arc(q[0],q[1],t.w/2,0,Math.PI*2); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(q[0],q[1]); for(let i=2;i<q.length;i+=2) ctx.lineTo(q[i],q[i+1]); ctx.stroke(); }
  ctx.restore();
}
function redesenha(){
  const c=g('rim-draw'); if(!c) return; const x=c.getContext('2d'); DR.ctx=x; x.clearRect(0,0,c.width,c.height);
  dst().strokes.forEach(t=>t.clear ? x.clearRect(0,0,c.width,c.height) : traco(x,t));
}
function ptDraw(e){ const r=DR.rect; return [+( (e.clientX-r.left)/r.width*W ).toFixed(1), +((e.clientY-r.top)/r.height*H).toFixed(1)]; }
function drawHTML(){
  const d=dst();
  const cores = CORES.map(([c,n])=>`<button type="button" class="msl-cor${d.cor===c&&d.tool==='pen'?' on':''}" data-rd="cor" data-v="${c}" style="--c:${c}" title="${n}"><span class="msl-dot"></span><span class="msl-cl">${n}</span></button>`).join('');
  return `<div class="msl-row" style="flex-wrap:wrap;gap:6px;align-items:center">
      <button type="button" class="msl-btn${d.on?' on':''}" data-rd="on">${mslIc('pen')}<span>${d.on?'Desenhando':'Desenhar à mão'}</span></button>
      ${d.on?`<button type="button" class="msl-btn${d.tool==='erase'?' on':''}" data-rd="erase">${mslIc('eraser')}<span>Borracha</span></button>
      <label class="msl-size"><span>Espessura</span><input type="range" id="rim-dw" min="1" max="24" step="1" value="${d.w}"></label>`:''}
      <button type="button" class="msl-btn" data-rd="undo"${d.strokes.length?'':' disabled'}>${mslIc('undo')}<span>Desfazer</span></button>
      <button type="button" class="msl-btn" data-rd="redo"${d.redo.length?'':' disabled'}>${mslIc('redo')}<span>Refazer</span></button>
      <button type="button" class="msl-btn" data-rd="clear"${d.strokes.length?'':' disabled'}>${mslIc('eraser')}<span>Apagar desenho</span></button>
    </div>${d.on?`<div class="msl-cores" style="margin-top:8px">${cores}</div>`:''}`;
}

/* ======================= tela ======================= */
function ctlHTML(){
  const s = st();
  const chips = (k,opts,dis) => opts.map(o=>`<button type="button" class="ti-ftog ${String(s[k])===o[0]?'on':''}" data-rim="${k}" data-v="${o[0]}"${dis?' disabled style="opacity:.4;cursor:default"':''}>${esc(o[1])}</button>`).join('');
  const row = (lbl,inner) => `<div class="em-rw"><div class="em-rl">${lbl}</div>${inner}</div>`;
  const inp = (k,ph,un) => `<div class="ti-szf" style="max-width:220px"><input type="text" inputmode="decimal" id="rim-${k}" placeholder="${ph}" value="${esc(s[k])}"><span>${un}</span></div>`;
  return row('Lado',`<div class="em-chips">${chips('lado',LADO)}</div>`)
    + row('Localização (polo)',`<div class="em-chips">${chips('polo',POLO)}</div>`)
    + row('Posição (A)',`<div class="em-chips">${chips('pos',POS)}</div>`)
    + row('Maior diâmetro (R)', inp('diam','ex.: 3,2','cm'))
    + row('Exofítica / endofítica (E)',`<div class="em-chips">${chips('exo',EXO)}</div>`)
    + row('Distância ao seio renal / sistema coletor (N)', inp('dist','ex.: 5','mm'))
    + row('Linhas polares (L)',`<div class="em-chips">${chips('l',LPOL,s.polo==='med')}</div>`)
    + row('Hilar (h)',`<div class="em-chips"><button type="button" class="ti-ftog ${s.h?'on':''}" data-rim="h" data-v="1">Toca a artéria/veia renal principal</button></div>`);
}
function resHTML(){
  const sc = escore(st());
  if(!sc.ok) return `<div class="ti-legend-row"><span class="lt">Informe o <b>maior diâmetro</b> e a <b>distância ao seio renal / sistema coletor</b> para calcular o escore R.E.N.A.L.</span></div>`;
  const t = {low:['#1f9d55','Baixa'],mod:['#e07a1f','Moderada'],high:['#cf2020','Alta']}[sc.tone];
  return `<div class="ti-res" style="background:${t[0]}22">
    <div class="lv" style="color:${t[0]}">${sc.tot}${esc(sc.suf)}</div>
    <div class="meta"><div class="a">${sc.comp}</div><div class="b">R${sc.R} + E${sc.E} + N${sc.N} + L${sc.L} · sufixo ${esc(sc.suf)}</div></div>
    <div class="pts" style="background:${t[0]}">${t[1]}</div>
  </div>`;
}
function html(){
  const d = dst();
  return `<div id="rim-root">
    <div class="ti-card em-ctl" id="rim-ctl">${ctlHTML()}</div>
    <div class="ti-legend-row" style="margin:0 0 10px"><span class="lt">Descreva a lesão e o esquema se ajusta nos três planos, com a lesão proporcional ao diâmetro informado. Coronal em visão anterior (convenção radiológica); axial no nível do hilo, anterior no alto; sagital com anterior à esquerda. <b>L</b>: as linhas polares passam pelos lábios superior e inferior do seio renal; lesão no terço médio é sempre L3. Se preferir, use <b>Desenhar à mão</b> para marcar por cima do esquema.</span></div>
    <div class="ti-card" style="padding:8px">
      <div id="rim-dbar" style="margin:2px 2px 8px">${drawHTML()}</div>
      <div id="rim-stage" style="position:relative;width:100%;border-radius:10px;overflow:hidden;aspect-ratio:${W}/${H};touch-action:${d.on?'none':'auto'}">
        <div id="rim-svg" style="position:absolute;inset:0"></div>
        <canvas id="rim-draw" width="${W*DZ}" height="${H*DZ}" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:${d.on?'auto':'none'};cursor:${d.on?'crosshair':'default'}"></canvas>
      </div>
    </div>
    <div class="ti-card" style="margin-top:12px">
      <div class="tfg-sec-lbl">Escore R.E.N.A.L.</div>
      <div id="rim-res">${resHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Para o laudo</div>
      <div id="rim-txt" style="white-space:pre-wrap;font-size:13.5px;line-height:1.5;margin-bottom:10px">${esc(texto())}</div>
      <div class="pmap-acts">
        <button type="button" class="lau-frase-btn" id="rim-b-copy">${svgIcon(P.copy,16,{sw:2})} Copiar imagem</button>
        <button type="button" class="lau-btn2" id="rim-b-txt">Copiar texto</button>
        <button type="button" class="lau-btn2" id="rim-b-down">Baixar JPEG</button>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referência</div>
      <div class="msl-refintro">Ilustração esquemática original. Critérios do escore conforme a publicação abaixo (R ≤ 4 / 4–7 / ≥ 7 cm; E ≥ 50% / &lt; 50% exofítica / endofítica; N ≥ 7 / 4–7 / ≤ 4 mm; L além da linha polar / cruza / &gt; 50% além, entre as linhas ou cruzando a linha média axial; sufixos a, p, x e h). Complexidade: 4–6 baixa, 7–9 moderada, 10–12 alta.</div>
      <div class="tfg-ref-list">${REF.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}
function atualizar(ctl){
  if(ctl){ const c=g('rim-ctl'); if(c) c.innerHTML = ctlHTML(); }
  const v=g('rim-svg'); if(v) v.innerHTML = svg();
  const sv = v && v.querySelector('svg'); if(sv){ sv.removeAttribute('width'); sv.removeAttribute('height'); sv.style.width='100%'; sv.style.height='100%'; sv.style.display='block'; }
  const r=g('rim-res'); if(r) r.innerHTML = resHTML();
  const t=g('rim-txt'); if(t) t.textContent = texto();
}
function barra(){
  const b=g('rim-dbar'); if(b) b.innerHTML = drawHTML();
  const d=dst(), c=g('rim-draw'), stg=g('rim-stage');
  if(c){ c.style.pointerEvents = d.on?'auto':'none'; c.style.cursor = d.on?'crosshair':'default'; }
  if(stg) stg.style.touchAction = d.on?'none':'auto';
}
function init(){
  const root = g('rim-root'); if(!root) return;
  root.addEventListener('click', e=>{
    const b = e.target.closest('[data-rim]');
    if(b && !b.disabled){
      const s = st(), k = b.dataset.rim;
      if(k==='h') s.h = !s.h; else s[k] = b.dataset.v;
      atualizar(true); return;
    }
    const r = e.target.closest('[data-rd]');
    if(r && !r.disabled){
      const d = dst();
      switch(r.dataset.rd){
        case 'on': d.on = !d.on; if(d.on && d.tool!=='erase') d.tool='pen'; break;
        case 'cor': d.cor = r.dataset.v; d.tool = 'pen'; break;
        case 'erase': d.tool = d.tool==='erase' ? 'pen' : 'erase'; break;
        case 'undo': if(d.strokes.length){ d.redo.push(d.strokes.pop()); redesenha(); } break;
        case 'redo': if(d.redo.length){ d.strokes.push(d.redo.pop()); redesenha(); } break;
        case 'clear': if(d.strokes.length){ d.strokes.push({clear:true}); d.redo=[]; redesenha(); klugToast('Desenho apagado — use Desfazer para voltar'); } break;
      }
      barra(); return;
    }
    const a = e.target.closest('button[id^="rim-b-"]'); if(!a) return;
    if(a.id==='rim-b-copy') copiar(); else if(a.id==='rim-b-down') baixar(); else if(a.id==='rim-b-txt') copiarTexto();
  });
  root.addEventListener('input', e=>{
    const id = e.target.id;
    if(id==='rim-dw'){ dst().w = +e.target.value; return; }
    if(id!=='rim-diam' && id!=='rim-dist') return;
    st()[id.slice(4)] = e.target.value; atualizar(false);
  });
  const c = g('rim-draw');
  c.addEventListener('pointerdown', e=>{
    const d=dst(); if(!d.on || (e.pointerType==='mouse' && e.button!==0)) return;
    e.preventDefault(); try{ c.setPointerCapture(e.pointerId); }catch(_){}
    DR.rect = c.getBoundingClientRect();
    DR.cur = {c:d.cor, w:d.tool==='erase'?Math.max(10,d.w*3):d.w, e:d.tool==='erase', pts:ptDraw(e)};
    traco(c.getContext('2d'), DR.cur);
  });
  c.addEventListener('pointermove', e=>{
    if(!DR.cur) return; const p=ptDraw(e), q=DR.cur.pts;
    if(Math.hypot(p[0]-q[q.length-2],p[1]-q[q.length-1])<0.8) return;
    q.push(p[0],p[1]);
    const x=c.getContext('2d'); x.save(); x.scale(DZ,DZ); x.lineCap='round'; x.lineWidth=DR.cur.w; x.strokeStyle=DR.cur.c;
    x.globalCompositeOperation = DR.cur.e?'destination-out':'source-over';
    x.beginPath(); x.moveTo(q[q.length-4],q[q.length-3]); x.lineTo(p[0],p[1]); x.stroke(); x.restore();
  });
  const fim = ()=>{ if(!DR.cur) return; const d=dst(); d.strokes.push(DR.cur); d.redo=[]; DR.cur=null; barra(); };
  c.addEventListener('pointerup', fim); c.addEventListener('pointercancel', fim);
  atualizar(false); redesenha();
}

/* ======================= exportação ======================= */
function canvas(){
  return new Promise((ok,no)=>{
    const im = new Image(), Z = 2;
    im.onload = ()=>{
      const c=document.createElement('canvas'); c.width=W*Z; c.height=H*Z; const x=c.getContext('2d');
      x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.drawImage(im,0,0,c.width,c.height);
      const dc=g('rim-draw'); if(dc && dst().strokes.length) x.drawImage(dc,0,0,c.width,c.height);
      ok(c);
    };
    im.onerror = no;
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg());
  });
}
const blob = (tipo,q) => canvas().then(c=>new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('canvas')),tipo,q)));
function baixar(){
  blob('image/jpeg',0.93).then(b=>{
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'mapa-renal-'+(st().lado==='d'?'direito':'esquerdo')+'.jpg';
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000);
  }).catch(()=>klugToast('Não consegui gerar a imagem.'));
}
function copiar(){
  try{
    if(!(navigator.clipboard && window.ClipboardItem)) throw new Error('sem clipboard');
    navigator.clipboard.write([new ClipboardItem({'image/png': blob('image/png')})])
      .then(()=>klugToast('Imagem copiada ✓ — cole no laudo'))
      .catch(()=>{ klugToast('Não deu para copiar aqui — baixando o JPEG'); baixar(); });
  }catch(e){ klugToast('Não deu para copiar aqui — baixando o JPEG'); baixar(); }
}
function copiarTexto(){
  const t = texto();
  (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject())
    .then(()=>klugToast('Texto copiado ✓'))
    .catch(()=>klugToast('Não deu para copiar o texto aqui.'));
}

/* ======================= registro ======================= */
MSL_ORGAOS.rim = {id:'rim', nome:'RIM (Nódulo renal · R.E.N.A.L.)', custom:true, html:html, init:init};
window.RIM_MAPA = {st, escore, texto, svg, canvas};
})();
