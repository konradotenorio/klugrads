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
/* contorno em feijão: elipse (a,b) girada (rot) com a reentrância do hilo no ângulo notch */
function bean(cx,cy,a,b,rot,notch,depth,width){
  const P = [];
  for(let i=0;i<180;i++){
    const t = i/180*2*Math.PI; let x = a*Math.cos(t), y = b*Math.sin(t);
    const c = Math.cos(rot), s = Math.sin(rot); let X = x*c - y*s, Y = x*s + y*c;
    if(depth){
      const phi = Math.atan2(Y,X); let dd = Math.atan2(Math.sin(phi-notch), Math.cos(phi-notch));
      const k = depth*Math.exp(-(dd/width)*(dd/width)), r = Math.hypot(X,Y);
      X *= (r-k)/r; Y *= (r-k)/r;
    }
    P.push([cx+X, cy+Y]);
  }
  return P;
}
const path = P => 'M'+P.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')+'Z';
/* ponto do contorno na direção ang (a partir do centro) */
function naDirecao(P,cx,cy,ang){
  let best=null, bd=9;
  P.forEach(p=>{ const a=Math.atan2(p[1]-cy,p[0]-cx), d=Math.abs(Math.atan2(Math.sin(a-ang),Math.cos(a-ang))); if(d<bd){ bd=d; best=p; } });
  return best;
}
/* ponto do contorno na altura y, do lado sinal (+1 direita da tela, -1 esquerda) */
function naAltura(P,cx,y,sinal){
  let best=null, bd=1e9;
  P.forEach(p=>{ if((p[0]-cx)*sinal<=0) return; const d=Math.abs(p[1]-y); if(d<bd){ bd=d; best=p; } });
  return best;
}
/* centro da lesão a partir do ponto de superfície e da normal externa (E define a profundidade) */
function profundidade(p,nx,ny,r,exo){
  const off = exo==='1' ? 0.3*r : exo==='2' ? -0.35*r : -(r+5);
  return [p[0]+nx*off, p[1]+ny*off];
}
function lesao(cx,cy,r,proj){
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${C.les}" fill-opacity="${proj?0.25:0.5}" stroke="${C.les}" stroke-width="2.4"${proj?' stroke-dasharray="6 4"':''}/>`;
}
/* altura (y) do centro da lesão conforme o polo e a relação com a linha polar */
function alturaLesao(s,cy,yU,yL,r,b){
  if(s.polo==='med') return cy;
  const L = lEfetivo(s), up = s.polo==='sup';
  const linha = up ? yU : yL, sg = up ? -1 : 1;
  let y = L==='1' ? linha + sg*(r+6) : L==='2' ? linha + sg*(r*0.45) : linha - sg*(r*0.25);
  const lim = up ? cy-b+r*0.5 : cy+b-r*0.5;              // não sai do polo
  if(L==='1') y = up ? Math.max(y, lim) : Math.min(y, lim);
  return y;
}
function raio(s){ const d=num(s.diam); return Math.max(8, Math.min(110, (d==null?2.5:d)/2*PX_CM)); }

/* ---- vasos e pelve saindo do hilo (desenhados de posterior para anterior: pelve, artéria, veia) ---- */
function seta(x1,y1,x2,y2,cor,w){ return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${cor}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`; }

/* ======================= CORONAL ======================= */
function coronal(s,ox,oy){
  const sg = s.lado==='d' ? 1 : -1;                     // +1: hilo à direita da tela (rim direito)
  const cx=ox+150, cy=oy+205, a=74, b=135;
  const K = bean(cx,cy,a,b,0, sg>0?0:Math.PI, 40, 0.45);
  const yU=cy-68, yL=cy+68;
  let o = `<path d="${path(K)}" fill="${C.cortex}" stroke="${C.cortexS}" stroke-width="2.5"/>`;
  // pirâmides medulares
  [[-0.55,-0.62],[-0.82,-0.25],[-0.85,0.15],[-0.75,0.5],[-0.5,0.78]].forEach(([fx,fy])=>{
    const px=cx - sg*a*0.62*Math.abs(fx)*0.95, py=cy+b*fy*0.82, tx=cx+sg*6, ty=cy+fy*b*0.45;
    const ang=Math.atan2(ty-py,tx-px), w=13;
    o += `<path d="M${(px-Math.sin(ang)*w).toFixed(1)} ${(py+Math.cos(ang)*w).toFixed(1)}L${(px+Math.sin(ang)*w).toFixed(1)} ${(py-Math.cos(ang)*w).toFixed(1)}L${(px+Math.cos(ang)*26).toFixed(1)} ${(py+Math.sin(ang)*26).toFixed(1)}Z" fill="${C.medula}" opacity=".55"/>`;
  });
  // seio renal
  const S = bean(cx+sg*26,cy,40,74,0, sg>0?0:Math.PI, 0, 1);
  o += `<path d="${path(S)}" fill="${C.seio}" stroke="${C.seioS}" stroke-width="1.5"/>`;
  // lesão (antes do sistema coletor e dos vasos, que ficam visíveis por cima)
  const r = raio(s), yl = alturaLesao(s,cy,yU,yL,r,b);
  if(s.pos==='lat' || s.pos==='med'){
    const lado = s.pos==='lat' ? -sg : sg;
    const p = naAltura(K,cx,yl,lado), ccx=cx, ccy=Math.max(cy-b*0.55,Math.min(cy+b*0.55,yl));
    let nx=p[0]-ccx, ny=p[1]-ccy; const nn=Math.hypot(nx,ny)||1; nx/=nn; ny/=nn;
    const c = (s.pos==='med' && s.polo==='med') ? [cx+sg*(s.exo==='3'?18:44), yl]   // hilar: no lábio do seio, junto aos vasos
            : profundidade(p,nx,ny,r,s.exo);
    o += lesao(c[0],c[1],r,false);
  } else {
    o += lesao(cx-sg*a*0.35, yl, r, true);           // face anterior/posterior: projeção (tracejado)
  }
  // sistema coletor: pelve + cálices maiores e menores
  const px=cx+sg*30, py=cy+10;
  const cal = [[-48,-52],[-30,-6],[-44,46]];
  cal.forEach(([dx,dy])=>{
    const ex=px+sg*dx, ey=py+dy;
    o += seta(px,py,ex,ey,C.coletor,9);
    [[-7,-9],[-9,6]].forEach(([u,v])=>{ const mx=ex+sg*u, my=ey+v; o += seta(ex,ey,mx,my,C.coletor,6) + `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5" fill="${C.coletor}" stroke="${C.coletorS}" stroke-width="1"/>`; });
  });
  o += `<path d="M${px-sg*8} ${py-14}Q${px+sg*30} ${py-6} ${px+sg*46} ${py+18}Q${px+sg*30} ${py+26} ${px-sg*6} ${py+16}Z" fill="${C.coletor}" stroke="${C.coletorS}" stroke-width="1.2"/>`;
  // ureter
  o += `<path d="M${px+sg*44} ${py+18}Q${px+sg*52} ${py+70} ${px+sg*40} ${cy+b+40}" stroke="${C.coletor}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  // artéria (posterior à veia) e veia (mais anterior): desenhadas por último, a veia por cima
  const hx = cx+sg*(a-28), ex = cx+sg*(a+70);
  o += seta(hx-sg*22,cy-32,ex,cy-36,C.art,9);
  [[-38,-58],[-34,-10]].forEach(([dx,dy])=>{ o += seta(hx-sg*22,cy-32,cx+sg*(dx+40),cy+dy,C.art,4.5); });
  o += seta(hx-sg*20,cy-14,ex,cy-12,C.veia,12);
  [[-36,-40],[-30,14]].forEach(([dx,dy])=>{ o += seta(hx-sg*20,cy-14,cx+sg*(dx+40),cy+dy,C.veia,5); });
  // linhas polares
  [yU,yL].forEach((y,i)=>{
    o += `<line x1="${cx-a-26}" y1="${y}" x2="${cx+a+26}" y2="${y}" stroke="${C.polar}" stroke-width="1.6" stroke-dasharray="7 5"/>`;
    o += `<text x="${cx-sg*(a+28)}" y="${y-5}" font-size="10.5" fill="${C.dim}" text-anchor="${sg>0?'start':'end'}" font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke">${i?'linha polar inferior':'linha polar superior'}</text>`;
  });
  return o + rotulos(ox,oy,'CORONAL', sg>0?['LATERAL','MEDIAL']:['MEDIAL','LATERAL'],['CRANIAL','CAUDAL']);
}

/* ======================= AXIAL (nível do hilo) ======================= */
function axial(s,ox,oy){
  const sg = s.lado==='d' ? 1 : -1;
  const cx=ox+150, cy=oy+205, a=82, b=58;
  const notch = sg>0 ? -Math.PI/4 : -3*Math.PI/4;        // hilo voltado anteromedialmente
  const rot = sg>0 ? Math.PI/5 : -Math.PI/5;
  const K = bean(cx,cy,a,b,rot,notch,32,0.55);
  let o = `<path d="${path(K)}" fill="${C.cortex}" stroke="${C.cortexS}" stroke-width="2.5"/>`;
  const dx=Math.cos(notch), dy=Math.sin(notch);              // direção do hilo
  const nx=-dy*sg, ny=dx*sg;                                  // perpendicular
  // anterior = para cima (y menor): escolhe o sentido da perpendicular que aponta para cima
  const ax_ = ny<0 ? [nx,ny] : [-nx,-ny];
  const sx=cx+dx*14, sy=cy+dy*14;
  const S = bean(sx,sy,34,26,notch,0,0,1);
  o += `<path d="${path(S)}" fill="${C.seio}" stroke="${C.seioS}" stroke-width="1.5"/>`;
  // lesão: direção conforme a posição
  const lat = sg>0 ? Math.PI : 0;                              // lateral na tela
  const ang = s.pos==='lat' ? lat : s.pos==='med' ? (sg>0 ? Math.PI/12 : Math.PI-Math.PI/12)
            : s.pos==='ant' ? (sg>0 ? -Math.PI*0.62 : -Math.PI*0.38) : (sg>0 ? Math.PI*0.62 : Math.PI*0.38);
  const r = raio(s), p = naDirecao(K,cx,cy,ang);
  let ux=p[0]-cx, uy=p[1]-cy; const un=Math.hypot(ux,uy)||1; ux/=un; uy/=un;
  const c = profundidade(p,ux,uy,r,s.exo); o += lesao(c[0],c[1],r,false);
  // de anterior para posterior: veia, artéria, pelve
  const lane = (k,cor,w)=>{ const bx=sx+ax_[0]*k, by=sy+ax_[1]*k; return seta(bx-dx*8,by-dy*8, bx+dx*120, by+dy*120, cor, w); };
  o += `<path d="M${(sx-ax_[0]*12-dx*14).toFixed(1)} ${(sy-ax_[1]*12-dy*14).toFixed(1)}l${(dx*22).toFixed(1)} ${(dy*22).toFixed(1)}" stroke="${C.coletor}" stroke-width="16" stroke-linecap="round"/>`;
  o += lane(-12,C.coletor,10) + lane(2,C.art,8) + lane(16,C.veia,11);
  // plano coronal do rim (divide faces anterior e posterior)
  o += `<line x1="${(cx-Math.cos(rot)*(a+22)).toFixed(1)}" y1="${(cy-Math.sin(rot)*(a+22)).toFixed(1)}" x2="${(cx+Math.cos(rot)*(a+22)).toFixed(1)}" y2="${(cy+Math.sin(rot)*(a+22)).toFixed(1)}" stroke="${C.polar}" stroke-width="1.3" stroke-dasharray="5 5" opacity=".6"/>`;
  return o + rotulos(ox,oy,'AXIAL (nível do hilo)', sg>0?['LATERAL','MEDIAL']:['MEDIAL','LATERAL'],['ANTERIOR','POSTERIOR']);
}

/* ======================= SAGITAL ======================= */
function sagital(s,ox,oy){
  const cx=ox+150, cy=oy+205, a=60, b=135;
  const K = bean(cx,cy,a,b,-0.12,0,0,1);
  const yU=cy-68, yL=cy+68;
  let o = `<path d="${path(K)}" fill="${C.cortex}" stroke="${C.cortexS}" stroke-width="2.5"/>`;
  const S = bean(cx,cy,30,72,-0.12,0,0,1);
  o += `<path d="${path(S)}" fill="${C.seio}" stroke="${C.seioS}" stroke-width="1.5"/>`;
  const r = raio(s), yl = alturaLesao(s,cy,cy-68,cy+68,r,b);
  if(s.pos==='ant' || s.pos==='pos'){
    const p = naAltura(K,cx,yl,s.pos==='ant'?-1:1), ccy=Math.max(cy-b*0.55,Math.min(cy+b*0.55,yl));
    let nx=p[0]-cx, ny=p[1]-ccy; const nn=Math.hypot(nx,ny)||1; nx/=nn; ny/=nn;
    const c = profundidade(p,nx,ny,r,s.exo); o += lesao(c[0],c[1],r,false);
  } else o += lesao(cx, yl, r, true);                           // margem lateral/medial: projeção
  // cálices em corte
  [[-6,-52],[8,-30],[-10,30],[6,52]].forEach(([u,v])=>{ o += `<circle cx="${cx+u}" cy="${cy+v}" r="6.5" fill="${C.coletor}" stroke="${C.coletorS}" stroke-width="1"/>`; });
  // hilo em corte: de anterior (esquerda) para posterior (direita): veia, artéria, pelve
  o += `<circle cx="${cx-17}" cy="${cy}" r="9" fill="${C.veia}"/><circle cx="${cx}" cy="${cy-2}" r="6" fill="${C.art}"/><circle cx="${cx+16}" cy="${cy+2}" r="9" fill="${C.coletor}" stroke="${C.coletorS}" stroke-width="1"/>`;
  [yU,yL].forEach((y,i)=>{
    o += `<line x1="${cx-a-34}" y1="${y}" x2="${cx+a+34}" y2="${y}" stroke="${C.polar}" stroke-width="1.6" stroke-dasharray="7 5"/>`;
    o += `<text x="${cx+a+36}" y="${y-5}" font-size="10.5" fill="${C.dim}" text-anchor="end" font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke">${i?'linha polar inferior':'linha polar superior'}</text>`;
  });
  return o + rotulos(ox,oy,'SAGITAL',['ANTERIOR','POSTERIOR'],['CRANIAL','CAUDAL']);
}

function rotulos(ox,oy,tit,[esq,dir],[cima,baixo]){
  const F = 'font-family="Segoe UI,Arial,Helvetica,sans-serif"';
  return `<text x="${ox+150}" y="${oy+26}" ${F} font-size="15" font-weight="800" fill="${C.txt}" text-anchor="middle">${tit}</text>`
    + `<text x="${ox+150}" y="${oy+46}" ${F} font-size="10.5" font-weight="700" fill="${C.dim}" text-anchor="middle">${cima}</text>`
    + `<text x="${ox+150}" y="${oy+398}" ${F} font-size="10.5" font-weight="700" fill="${C.dim}" text-anchor="middle">${baixo}</text>`
    + `<text x="${ox+10}" y="${oy+212}" ${F} font-size="10.5" font-weight="700" fill="${C.dim}" text-anchor="start">${esq}</text>`
    + `<text x="${ox+290}" y="${oy+212}" ${F} font-size="10.5" font-weight="700" fill="${C.dim}" text-anchor="end">${dir}</text>`;
}

/* ======================= imagem completa (3 planos + legenda + escore) ======================= */
function svg(){
  const s = st(), sc = escore(s), W = 960, H = 520;
  const F = 'font-family="Segoe UI,Arial,Helvetica,sans-serif"';
  const lado = s.lado==='d' ? 'RIM DIREITO' : 'RIM ESQUERDO';
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  o += `<rect width="${W}" height="${H}" fill="${C.fundo}"/>`;
  o += `<text x="${W/2}" y="30" ${F} font-size="19" font-weight="800" fill="${C.txt}" text-anchor="middle">MAPA DA LESÃO RENAL — ${lado}</text>`;
  [0,320,640].forEach((x,i)=>{ o += `<rect x="${x+8}" y="44" width="304" height="406" rx="14" fill="none" stroke="#e3e5ea" stroke-width="1.5"/>`; });
  o += `<g ${F}>` + coronal(s,10,44) + axial(s,330,44) + sagital(s,650,44) + '</g>';
  // legenda
  const it = [[C.veia,'Veia renal'],[C.art,'Artéria renal'],[C.coletor,'Sistema coletor'],[C.les,'Lesão']];
  let lx = 20; const ly = 474;
  it.forEach(([c,t])=>{ o += `<circle cx="${lx+7}" cy="${ly}" r="7" fill="${c}"/><text x="${lx+19}" y="${ly+4}" ${F} font-size="12.5" font-weight="600" fill="${C.txt}">${t}</text>`; lx += 30 + t.length*7; });
  o += `<line x1="${lx}" y1="${ly}" x2="${lx+26}" y2="${ly}" stroke="${C.polar}" stroke-width="1.6" stroke-dasharray="7 5"/><text x="${lx+32}" y="${ly+4}" ${F} font-size="12.5" font-weight="600" fill="${C.txt}">Linhas polares</text>`;
  o += `<text x="20" y="${ly+24}" ${F} font-size="11" fill="${C.dim}">Hilo (anterior → posterior): veia, artéria, pelve. Contorno tracejado = lesão projetada fora do plano.</text>`;
  if(sc.ok){
    const tc = {low:'#1f9d55',mod:'#e07a1f',high:'#cf2020'}[sc.tone];
    o += `<rect x="${W-262}" y="${ly-22}" width="244" height="50" rx="12" fill="${tc}" fill-opacity=".12" stroke="${tc}" stroke-width="1.5"/>`;
    o += `<text x="${W-246}" y="${ly+2}" ${F} font-size="20" font-weight="800" fill="${tc}">R.E.N.A.L. ${sc.tot}${sc.suf}</text>`;
    o += `<text x="${W-246}" y="${ly+19}" ${F} font-size="11.5" font-weight="700" fill="${C.txt}">${sc.comp} · R${sc.R} E${sc.E} N${sc.N} L${sc.L}</text>`;
  }
  o += `<text x="${W-12}" y="${H-8}" ${F} font-size="10" fill="#9aa1ab" text-anchor="end">${MARCA}</text>`;
  return o + '</svg>';
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
  return `<div id="rim-root">
    <div class="ti-card em-ctl" id="rim-ctl">${ctlHTML()}</div>
    <div class="ti-legend-row" style="margin:0 0 10px"><span class="lt">Descreva a lesão e o esquema se ajusta nos três planos. Coronal em visão anterior (convenção radiológica: o lado direito do paciente fica à esquerda da tela); axial no nível do hilo, anterior no alto; sagital com anterior à esquerda. <b>L</b>: as linhas polares passam pelos lábios superior e inferior do seio renal; lesão no terço médio é sempre L3.</span></div>
    <div class="ti-card" style="padding:8px"><div id="rim-svg" style="width:100%;overflow:hidden;border-radius:10px">${svg()}</div></div>
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
  const r=g('rim-res'); if(r) r.innerHTML = resHTML();
  const t=g('rim-txt'); if(t) t.textContent = texto();
  const sv = v && v.querySelector('svg'); if(sv){ sv.removeAttribute('width'); sv.removeAttribute('height'); sv.style.width='100%'; sv.style.height='auto'; sv.style.display='block'; }
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
    const a = e.target.closest('button[id^="rim-b-"]'); if(!a) return;
    if(a.id==='rim-b-copy') copiar(); else if(a.id==='rim-b-down') baixar(); else if(a.id==='rim-b-txt') copiarTexto();
  });
  root.addEventListener('input', e=>{
    const id = e.target.id; if(id!=='rim-diam' && id!=='rim-dist') return;
    st()[id.slice(4)] = e.target.value; atualizar(false);
  });
  atualizar(false);
}

/* ======================= exportação ======================= */
function canvas(){
  return new Promise((ok,no)=>{
    const im = new Image(), K = 2;
    im.onload = ()=>{ const c=document.createElement('canvas'); c.width=960*K; c.height=520*K; const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.drawImage(im,0,0,c.width,c.height); ok(c); };
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
window.RIM_MAPA = {st, escore, texto, svg};
})();
