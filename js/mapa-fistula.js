/* =========================================================================
   KlugRads — Mapa Setorial Lesional · FÍSTULA PERINAL
   ---------------------------------------------------------------------------
   Quarto órgão do Mapa Setorial Lesional (os outros: PRÓSTATA, PELVE e RIM).
   Mesmo editor do mapa de endometriose (pincel, borracha, seta, desfazer/refazer,
   legenda pequena dentro da imagem, zoom, tela cheia, copiar / baixar JPEG), sobre
   dois esquemas anatômicos do períneo:
     coronal — visão posterior das regiões glúteas, com os planos musculares;
     axial   — corte no nível do canal anal, com a VISÃO ILUSTRATIVA DO CANAL ANAL no
               alto e as quatro orientações (anterior, posterior, direito, esquerdo).
   O corte axial segue a convenção radiológica: o lado DIREITO do paciente fica à
   ESQUERDA da imagem (como numa RM). Título e orientações são desenhados na própria
   imagem (orientacao()), então vão junto na cópia/JPEG exportados.

   Pincéis (2 cores fluorescentes, cada uma é um achado):
     TRAJETO FISTULOSO (verde fluorescente, com brilho) e
     ABSCESSO (amarelo fluorescente, sem contorno nem margem).
   O trajeto fica sempre por cima do abscesso. A seta é sempre preta.
   Cada pincel, a borracha e a seta guardam a sua própria espessura.

   Imagens: /img/fistula/ (esquemas ilustrativos). O axial tem uma faixa extra no alto
   (AX_TOP) e embaixo (AX_BOT) para os rótulos não cobrirem a anatomia.

   Estado em memória (state.msl.fp), como o resto do Mapa Setorial Lesional.
   Tudo roda no navegador: nenhuma imagem ou desenho sai do aparelho.
   ========================================================================= */
(function(){
'use strict';

const BASE = '/img/fistula/';
const CORTES = [['cor','Coronal'],['ax','Axial']];
const ARQ = {cor:'coronal.webp', ax:'axial.webp'};
const LES = [
  {id:1, nome:'Trajeto fistuloso', cor:'#39FF14', anel:'#16A34A', cn:'VERDE'},
  {id:2, nome:'Abscesso',          cor:'#F5FF1F', anel:'#B59B00', cn:'AMARELO'},
];
const ALPHA = 0.9, ZMAX = 8;
const GLOW = 5;                          // brilho (halo) em volta do TRAJETO, em px da imagem de referência: dá o efeito fluorescente
const OUT = 0;                           // contorno preto em volta do ABSCESSO (px de referência): 0 = sem contorno/margem (padrão). Se for > 0, contorno() volta a desenhar a faixa preta
const REFW = 1103;                       // largura de referência (px): pincel, brilho, contorno e cursor escalam com R.K = largura da imagem / REFW
const AX_TOP = 120, AX_BOT = 56;         // faixas extras da imagem axial (px): título + ANTERIOR no alto, POSTERIOR embaixo
const SETA = {fill:'#000000', line:'#FFFFFF'};   // seta sempre preta; o fio branco só garante que ela apareça sobre o músculo escuro
const TAM0 = {1:8, 2:26, e:30, a:18};   // espessura inicial: trajeto (fino), abscesso (grosso), borracha, seta

/* ---- estado (em memória) ---- */
function st(){
  const m = mslState();
  if(!m.fp) m.fp = {pos:{corte:'cor'}, cor:1, tool:'brush', sz:Object.assign({},TAM0), legend:true,
                    strokes:{cor:[],ax:[]}, redo:{cor:[],ax:[]}, full:false};
  return m.fp;
}
const chave = s => s.tool==='arrow' ? 'a' : s.tool==='erase' ? 'e' : s.cor;   // qual espessura o controle está mexendo
const tam = s => s.sz[chave(s)];
/* runtime (não vai para o state): canvases, imagem, gesto em curso */
const R = {view:null, IW:0, IH:0, K:1, fw:0, fh:0, k:1, tx:0, ty:0, W:0, H:0, img:null, ready:false,
           ptrs:new Map(), stroke:null, pan:null, pinch:null, used:[false,false], usedKey:'', scan:null,
           tok:0, bctx:null, ca:null, ct:null, co:null, raf:0, actx:null, sctx:null, rect:null, wired:false, arrow:null, edit:null, sel:null, drag:null};
const g = id => document.getElementById(id);

/* ======================= tela ======================= */
function arquivo(){ return BASE + ARQ[st().pos.corte]; }
function ctlHTML(){
  const s = st(), p = s.pos;
  const chips = (k,opts) => opts.map(o=>`<button type="button" class="ti-ftog ${p[k]===o[0]?'on':''}" data-fp="pos" data-k="${k}" data-v="${o[0]}">${esc(o[1])}</button>`).join('');
  const row = (lbl,inner) => `<div class="em-rw"><div class="em-rl">${esc(lbl)}</div>${inner}</div>`;
  const cores = LES.map(c=>`<button type="button" class="msl-cor${s.cor===c.id&&s.tool==='brush'?' on':''}" data-fp="cor" data-v="${c.id}" style="--c:${c.anel}" title="${esc(c.nome)} (${esc(c.cn)})"><span class="msl-dot" style="background:${c.cor};box-shadow:inset 0 0 0 1.5px rgba(0,0,0,.35)"></span><span class="msl-cl">${esc(c.nome)}<span class="em-sub">${esc(c.cn)}</span></span></button>`).join('');
  return row('Corte',`<div class="em-chips">${chips('corte',CORTES)}</div>`)
       + row('LEGENDA',`<div class="msl-cores em-cores">${cores}</div>`);
}
function html(){
  const s = st();
  const tb = (id,ic,lbl,extra) => `<button type="button" class="msl-btn${extra||''}" id="${id}" title="${lbl}" aria-label="${lbl}">${mslIc(ic)}<span>${lbl}</span></button>`;
  return `<div id="fp-root">
    <div class="ti-card em-ctl" id="fp-ctl">${ctlHTML()}</div>
    <div class="ti-legend-row" style="margin:0 0 10px"><span class="lt">Escolha o corte (coronal ou axial) e marque, por cima da imagem, o trajeto fistuloso (verde) e os abscessos (amarelo). Cada corte guarda a sua marcação. No corte axial, as bordas indicam anterior, posterior, direito e esquerdo do paciente (convenção radiológica: o lado direito do paciente fica à esquerda da imagem). Zoom: roda do mouse ou dois dedos; mover a imagem ampliada: botão direito do mouse ou dois dedos.</span></div>
    <div class="msl-ed${s.full?' full':''}" id="fp-ed">
      <div class="msl-bar">
        <div class="msl-row">
          ${tb('fp-b-brush','pen','Pincel',s.tool==='brush'?' on':'')}${tb('fp-b-erase','eraser','Borracha',s.tool==='erase'?' on':'')}${tb('fp-b-arrow','arrow','Seta',s.tool==='arrow'?' on':'')}<button type="button" class="msl-btn" id="fp-b-delarrow" title="Apagar a seta selecionada" aria-label="Apagar a seta selecionada" disabled${s.tool==='arrow'?'':' style="display:none"'}>${mslIc('trash')}<span>Apagar seta</span></button>
          <label class="msl-size" title="Espessura do pincel, da borracha e tamanho da seta"><span>Espessura</span><input type="range" id="fp-w" min="3" max="70" step="1" value="${tam(s)}"></label>
        </div>
        <div class="msl-row em-hint" id="fp-hint"${s.tool==='arrow'?'':' style="display:none"'}>Seta: arraste do local do texto até o achado (a ponta fica onde soltar); o texto é opcional. Toque numa seta para mexer nela: arraste-a para mover, arraste as bolinhas para ajustar as pontas, toque de novo para editar o texto, ou use Apagar seta (ou a tecla Delete).</div>
        <div class="msl-row">
          ${tb('fp-b-undo','undo','Desfazer')}${tb('fp-b-redo','redo','Refazer')}${tb('fp-b-clear','eraser','Limpar tudo')}
          ${tb('fp-b-leg','list','Legenda',s.legend?' on':'')}
          <span class="msl-sp"></span>
          ${tb('fp-b-zout','zout','Zoom −')}${tb('fp-b-zin','zin','Zoom +')}
          <button type="button" class="msl-btn" id="fp-b-fit" title="Ajustar à tela"><span id="fp-zoom">100%</span></button>
          <button type="button" class="msl-btn" id="fp-b-full" title="Tela cheia">${mslIc(s.full?'exit':'full')}<span>${s.full?'Sair':'Tela cheia'}</span></button>
        </div>
      </div>
      <div class="msl-stage em-stage" id="fp-stage">
        <div class="msl-world" id="fp-world"><canvas id="fp-base"></canvas><canvas id="fp-po"></canvas><canvas id="fp-pa"></canvas><canvas id="fp-pt"></canvas><canvas id="fp-arrows"></canvas><canvas id="fp-sel"></canvas></div>
        <div class="msl-cur" id="fp-cur"></div>
        <div class="msl-msg" id="fp-msg">Carregando o mapa…</div>
      </div>
    </div>
    <div class="ti-card" style="margin-top:12px">
      <div class="tfg-sec-lbl">Para o laudo</div>
      <div class="pmap-acts">
        <button type="button" class="lau-frase-btn" id="fp-b-copy">${svgIcon(P.copy,16,{sw:2})} Copiar imagem</button>
        <button type="button" class="lau-btn2" id="fp-b-down">Baixar JPEG</button>
      </div>
    </div>
  </div>`;
}

/* ======================= inicialização (após cada render) ======================= */
function init(){
  const root = g('fp-root'); if(!root) return;
  R.view = null; R.ready = false; R.ptrs.clear(); R.stroke = null; R.arrow = null; R.edit = null; R.sel = null; R.drag = null; R.pan = null; R.pinch = null; R.usedKey = ''; R.k = 1;
  root.addEventListener('click', onClick);
  g('fp-w').addEventListener('input', e=>{ const s = st(); s.sz[chave(s)] = +e.target.value; });
  const stg = g('fp-stage');
  stg.addEventListener('pointerdown', onDown);
  stg.addEventListener('pointermove', onMove);
  stg.addEventListener('pointerup', onUp);
  stg.addEventListener('pointercancel', onUp);
  stg.addEventListener('pointerleave', ()=>{ const c=g('fp-cur'); if(c) c.style.display='none'; });
  stg.addEventListener('wheel', e=>{ e.preventDefault(); const r=stg.getBoundingClientRect(); zoomAt(e.clientX-r.left, e.clientY-r.top, R.k*Math.exp(-e.deltaY*0.0016)); }, {passive:false});
  stg.addEventListener('contextmenu', e=>e.preventDefault());
  if(!R.wired){
    R.wired = true;
    window.addEventListener('resize', ()=>{ if(ativo()) fit(); });
    window.addEventListener('keydown', e=>{
      if(!ativo()) return;
      if(e.key==='Escape' && R.edit){ fecharTxt(); return; }
      if(e.key==='Escape' && R.sel && st().tool==='arrow'){ R.sel = null; drawSel(); return; }
      if(e.key==='Escape' && st().full){ toggleFull(); return; }
      const t = e.target && e.target.tagName; if(t==='INPUT'||t==='TEXTAREA') return;
      if((e.key==='Delete'||e.key==='Backspace') && R.sel && st().tool==='arrow'){ e.preventDefault(); apagarSeta(); return; }
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); }
    });
  }
  sync(); carregar();
}
function ativo(){ return state.view==='mapaLesional' && mslState().org==='fistula' && !!g('fp-root'); }

function setTool(t){
  const s = st(); s.tool = t;
  if(t!=='arrow'){ fecharTxt(); R.sel = null; }
  g('fp-ctl').innerHTML = ctlHTML(); sync();
}
function onClick(e){
  if(R.edit && !e.target.closest('#fp-txt,#fp-stage')) fecharTxt();          // o "click" que vem após o arrasto cai no palco: não fecha
  const d = e.target.closest('[data-fp]');
  if(d && !d.disabled){
    const s = st();
    if(d.dataset.fp==='pos'){ s.pos[d.dataset.k] = d.dataset.v; g('fp-ctl').innerHTML = ctlHTML(); carregar(); return; }
    if(d.dataset.fp==='cor'){ s.cor = +d.dataset.v; setTool('brush'); return; }
  }
  const b = e.target.closest('button[id^="fp-b-"]'); if(!b) return;
  const s = st();
  switch(b.id){
    case 'fp-b-brush': setTool('brush'); break;
    case 'fp-b-erase': setTool('erase'); break;
    case 'fp-b-arrow': setTool('arrow'); break;
    case 'fp-b-delarrow': apagarSeta(); break;
    case 'fp-b-undo': undo(); break;
    case 'fp-b-redo': redo(); break;
    case 'fp-b-clear': limpar(); break;
    case 'fp-b-leg': s.legend=!s.legend; refreshLegend(true); sync(); klugToast(s.legend?'Legenda ligada (só os achados marcados)':'Legenda desligada'); break;
    case 'fp-b-zout': zoomBy(1/1.4); break;
    case 'fp-b-zin': zoomBy(1.4); break;
    case 'fp-b-fit': fit(); break;
    case 'fp-b-full': toggleFull(); break;
    case 'fp-b-copy': copiar(); break;
    case 'fp-b-down': baixar(); break;
  }
}

/* ======================= imagem base (esquema + orientações + legenda + marca) ======================= */
const CACHE = {};
function imagem(f){
  if(CACHE[f]) return CACHE[f];
  return CACHE[f] = new Promise((ok,no)=>{ const im=new Image(); im.onload=()=>ok(im); im.onerror=()=>{ delete CACHE[f]; no(new Error('falha: '+f)); }; im.src=f; });
}
async function carregar(){
  const tok = ++R.tok, s = st();
  let im; try{ im = await imagem(arquivo()); }
  catch(e){ const m=g('fp-msg'); if(m){ m.style.display=''; m.textContent='Não foi possível carregar a imagem do mapa. Verifique a conexão e tente de novo.'; } return; }
  if(tok!==R.tok || !g('fp-base')) return;                     // a tela já foi refeita enquanto a imagem carregava
  R.img = im;
  const corte = s.pos.corte;
  if(R.view!==corte){
    R.view = corte; R.IW = im.naturalWidth; R.IH = im.naturalHeight; R.K = R.IW/REFW;
    for(const id of ['fp-base','fp-po','fp-pa','fp-pt','fp-arrows','fp-sel']){ g(id).width = R.IW; g(id).height = R.IH; }
    R.bctx = g('fp-base').getContext('2d'); R.co = g('fp-po').getContext('2d'); R.ca = g('fp-pa').getContext('2d'); R.ct = g('fp-pt').getContext('2d');
    R.actx = g('fp-arrows').getContext('2d'); R.sctx = g('fp-sel').getContext('2d');
    fecharTxt(); R.sel = null; R.drag = null;
    g('fp-pa').style.opacity = ALPHA; g('fp-pt').style.opacity = ALPHA;
    if(window.msl3d){ msl3d.attach('fp',{world:g('fp-world'), layers:[g('fp-pa'),g('fp-pt')]}); msl3d.painel(g('fp-ed')); }   // efeito 3D (padrão)
    fit(); redrawAll(); R.usedKey = '';
  }
  R.ready = true; const m = g('fp-msg'); if(m) m.style.display = 'none';
  refreshLegend(true); sync();
}
function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
/* legenda pequena e discreta, DENTRO da imagem, canto inferior direito (mesmo desenho da legenda da próstata e da pelve) */
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
    ctx.strokeStyle = c.anel; ctx.lineWidth = 2*k; ctx.stroke();       // aro fino da própria cor (só na bolinha da legenda): o amarelo fluorescente some no fundo branco sem ele
    ctx.fillStyle = '#1f2630'; ctx.font = F(600,31*k); ctx.fillText(texts[i], x+padX+40*k, cy+1*k);
  });
  ctx.restore();
}
/* marca padrão do Mapa Setorial Lesional (mslMarca, em mapa-lesional.js): escura (fundo claro), canto inferior esquerdo */
function marca(ctx){ mslMarca(ctx, R.IW, R.IH, {cor:'rgba(31,38,48,.82)', canto:'esq'}); }
/* corte axial: título no alto e as orientações nas quatro bordas (nas faixas extras, em cima e embaixo).
   Esquerdo/direito são do PACIENTE, na convenção radiológica: o direito fica à esquerda da imagem. */
function orientacao(ctx){
  const k = R.IW/1890, m = 26*k, F = (w,px)=>`${w} ${px}px "Segoe UI",Arial,Helvetica,sans-serif`;
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  /* título: faixa escura, centralizada, no alto da imagem */
  const tit = 'VISÃO ILUSTRATIVA DO CANAL ANAL', th = 62*k, ty = m;
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
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.moveTo(ax+p[0][0],ay+p[0][1]); ctx.lineTo(ax+p[1][0],ay+p[1][1]); ctx.lineTo(ax+p[2][0],ay+p[2][1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1f2630'; ctx.fillText(txt, ax+ar+12*k, cy+1*k);
  };
  badge('ANTERIOR','up',R.IW/2,ty+th+14*k+bh/2);
  badge('POSTERIOR','down',R.IW/2,R.IH-m-bh/2);
  ctx.font = F(700,27*k);
  const bw = t => ctx.measureText(t).width + 34*k + 2*ar + 12*k, cy = AX_TOP + (R.IH-AX_TOP-AX_BOT)/2;   // meio da anatomia (sem as faixas extras)
  badge('DIREITO','left',m+bw('DIREITO')/2,cy);
  badge('ESQUERDO','right',R.IW-m-bw('ESQUERDO')/2,cy);
  ctx.restore();
}
function drawBase(){
  const ctx = R.bctx; if(!ctx || !R.img) return;
  ctx.clearRect(0,0,R.IW,R.IH);
  ctx.drawImage(R.img,0,0,R.IW,R.IH);
  if(R.view==='ax') orientacao(ctx);
  marca(ctx);
  const rows = LES.filter(c=>R.used[c.id-1]);
  if(st().legend && rows.length) legenda(ctx,rows);
}
/* quais achados têm pintura visível: cada achado tem a sua camada (trajeto em #fp-pt, abscesso em #fp-pa);
   lê a camada reduzida, então borracha e desfazer também contam */
function scanUsed(){
  const M = 640, h = Math.max(1,Math.round(M*R.IH/R.IW)), c = R.scan || (R.scan = document.createElement('canvas')); c.width = M; c.height = h;
  const x = c.getContext('2d',{willReadFrequently:true}); x.imageSmoothingQuality = 'high';
  return ['fp-pt','fp-pa'].map(id=>{
    x.clearRect(0,0,M,h); x.drawImage(g(id),0,0,M,h);
    const d = x.getImageData(0,0,M,h).data; let n = 0;
    for(let i=3;i<d.length;i+=4) if(d[i]>=90 && ++n>=2) return true;
    return false;
  });
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
  const stg = g('fp-stage'), w = g('fp-world'); if(!stg || !w || !R.IW) return;
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
  const w = g('fp-world'); if(!w) return; clampPan();
  w.style.transform = `translate(${R.tx}px,${R.ty}px) scale(${R.k})`;
  const z = g('fp-zoom'); if(z) z.textContent = Math.round(R.k*100)+'%';
  if(R.sel) drawSel();                                    // as bolinhas mantêm o tamanho na tela quando o zoom muda
}
function zoomAt(cx,cy,nk){ nk = Math.min(ZMAX,Math.max(1,nk)); const px=(cx-R.tx)/R.k, py=(cy-R.ty)/R.k; R.k=nk; R.tx=cx-px*nk; R.ty=cy-py*nk; applyView(); }
function zoomBy(f){ zoomAt(R.W/2,R.H/2,R.k*f); }
function toggleFull(){
  const s = st(); s.full = !s.full;
  const ed = g('fp-ed'); if(ed) ed.classList.toggle('full',s.full);
  const b = g('fp-b-full'); if(b) b.innerHTML = mslIc(s.full?'exit':'full')+`<span>${s.full?'Sair':'Tela cheia'}</span>`;
  requestAnimationFrame(fit);
}

/* ======================= ponteiro ======================= */
function ptr(e,r){ return [(e.clientX-r.left)/r.width*R.IW, (e.clientY-r.top)/r.height*R.IH]; }
function onDown(e){
  if(!R.ready) return;
  const stg = g('fp-stage'); R.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{ stg.setPointerCapture(e.pointerId); }catch(_){}
  if(R.ptrs.size===2){ cancelStroke(); pinchStart(); return; }
  if(R.ptrs.size>2) return;
  if(e.pointerType==='mouse' && (e.button===1||e.button===2)){ R.pan = {x:e.clientX,y:e.clientY,tx:R.tx,ty:R.ty}; stg.classList.add('grabbing'); return; }
  if(e.pointerType==='mouse' && e.button!==0) return;
  if(st().tool==='arrow'){ setaStart(e); return; }
  strokeStart(e);
}
function onMove(e){
  if(R.ptrs.has(e.pointerId)) R.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  cursor(e);
  if(R.pinch && R.ptrs.size>=2){ pinchMove(); return; }
  if(R.pan){ R.tx = R.pan.tx+(e.clientX-R.pan.x); R.ty = R.pan.ty+(e.clientY-R.pan.y); applyView(); return; }
  if(R.arrow && R.ptrs.size===1){ setaMove(e); return; }
  if(R.drag && R.ptrs.size===1){ dragMove(e); return; }
  if(R.stroke && R.ptrs.size===1){ const evs=(e.getCoalescedEvents&&e.getCoalescedEvents())||[e]; (evs.length?evs:[e]).forEach(strokeAdd); }
}
function onUp(e){
  R.ptrs.delete(e.pointerId);
  if(R.pinch && R.ptrs.size<2) R.pinch = null;
  if(R.pan){ R.pan = null; const stg=g('fp-stage'); if(stg) stg.classList.remove('grabbing'); }
  if(R.arrow) setaEnd();
  if(R.drag) dragEnd();
  if(R.stroke) strokeEnd();
  if(e.pointerType!=='mouse'){ const c=g('fp-cur'); if(c) c.style.display='none'; }
}
function pinchStart(){
  const a=[...R.ptrs.values()], stg=g('fp-stage'); if(!stg||a.length<2) return;
  const r = stg.getBoundingClientRect(); R.pan = null;
  R.pinch = {d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1, cx:(a[0].x+a[1].x)/2-r.left, cy:(a[0].y+a[1].y)/2-r.top, k:R.k, tx:R.tx, ty:R.ty};
}
function pinchMove(){
  const a=[...R.ptrs.values()], stg=g('fp-stage'), p=R.pinch; if(!stg||!p||a.length<2) return;
  const r = stg.getBoundingClientRect(), d = Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1;
  const cx = (a[0].x+a[1].x)/2-r.left, cy = (a[0].y+a[1].y)/2-r.top, nk = Math.min(ZMAX,Math.max(1,p.k*d/p.d));
  const px = (p.cx-p.tx)/p.k, py = (p.cy-p.ty)/p.k; R.k = nk; R.tx = cx-px*nk; R.ty = cy-py*nk; applyView();
}
function cursor(e){
  const c = g('fp-cur'), stg = g('fp-stage'); if(!c||!stg) return;
  if(st().tool==='arrow' && e.pointerType==='mouse' && R.ready && !R.arrow && !R.drag && !R.pan){      // mouse sobre uma seta: mostra que dá para mexer
    const w = g('fp-world'), p = w ? ptr(e,w.getBoundingClientRect()) : null, h = p && setaAlvo(p[0],p[1],false);
    stg.style.cursor = h ? (h.mode==='move' ? 'move' : 'grab') : '';
  }
  if(e.pointerType==='touch' || st().tool==='arrow'){ c.style.display='none'; return; }
  const r = stg.getBoundingClientRect(), d = Math.max(4, tam(st())*R.K*R.fw*R.k/R.IW);
  c.style.display='block'; c.style.width = c.style.height = d+'px'; c.style.left = (e.clientX-r.left)+'px'; c.style.top = (e.clientY-r.top)+'px';
}

/* ======================= traços =======================
   Os traços são guardados como listas de pontos (vetorial): desfazer/refazer e re-render após qualquer
   render() do app são só "repintar os traços". Cada achado tem a sua camada: ABSCESSO (#fp-pa) e TRAJETO
   (#fp-pt, que fica por cima); a borracha (destination-out) apaga nas duas.
   TRAJETO leva um brilho (halo) da própria cor: é o que dá o aspecto fluorescente.
   ABSCESSO não tem contorno (OUT = 0). Com OUT > 0, contorno() desenha uma faixa preta (#fp-po, por baixo do
   preenchimento), recalculada a partir da camada do abscesso: assim ela acompanha também as bordas deixadas
   pela borracha e pelo desfazer. */
const alvos = s => s.e ? [R.ca,R.ct] : [s.c===2 ? R.ca : R.ct];
function style(ctx,s){
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,R.IW,R.IH); ctx.clip();
  ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=s.w*R.K;
  const col = s.e ? '#000' : LES[s.c-1].cor; ctx.strokeStyle = col; ctx.fillStyle = col;
  if(!s.e && s.c===1){ ctx.shadowColor = col; ctx.shadowBlur = GLOW*R.K; }
  ctx.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
}
function drawStroke(s){
  const q = s.pts;
  alvos(s).forEach(ctx=>{
    style(ctx,s);
    if(q.length<4){ ctx.beginPath(); ctx.arc(q[0],q[1],s.w*R.K/2,0,Math.PI*2); ctx.fill(); }
    else{ ctx.beginPath(); ctx.moveTo(q[0],q[1]); ctx.lineTo((q[0]+q[2])/2,(q[1]+q[3])/2);
      for(let i=2;i<q.length-2;i+=2) ctx.quadraticCurveTo(q[i],q[i+1],(q[i]+q[i+2])/2,(q[i+1]+q[i+3])/2);
      ctx.lineTo(q[q.length-2],q[q.length-1]); ctx.stroke(); }
    ctx.restore();
  });
}
function lista(){ return st().strokes[R.view] || (st().strokes[R.view]=[]); }
function listaRedo(){ return st().redo[R.view] || (st().redo[R.view]=[]); }
function redrawAll(){
  if(!R.ca) return; R.ca.clearRect(0,0,R.IW,R.IH); R.ct.clearRect(0,0,R.IW,R.IH);
  lista().forEach(s=>{ if(s.clear){ R.ca.clearRect(0,0,R.IW,R.IH); R.ct.clearRect(0,0,R.IW,R.IH); } else if(!s.arrow && !s.mv && !s.del) drawStroke(s); });
  contorno(); redrawSetas(); drawSel();
  if(window.msl3d) msl3d.update('fp');
}
/* caixa (px da imagem) que pode conter abscesso: só os traços de abscesso depois do último "Limpar tudo", com folga para o contorno */
function caixaAbscesso(){
  let x0=1e9, y0=1e9, x1=-1e9, y1=-1e9;
  const add = s=>{ if(s.e || s.c!==2 || !s.pts) return; const m = (s.w/2+OUT)*R.K+3, q = s.pts;
    for(let i=0;i<q.length;i+=2){ x0=Math.min(x0,q[i]-m); x1=Math.max(x1,q[i]+m); y0=Math.min(y0,q[i+1]-m); y1=Math.max(y1,q[i+1]+m); } };
  const l = lista(); let i = l.length-1; while(i>=0 && !l[i].clear) i--;
  for(let j=i+1;j<l.length;j++) add(l[j]);
  if(R.stroke) add(R.stroke);
  if(x0>x1) return null;
  x0 = Math.max(0,Math.floor(x0)); y0 = Math.max(0,Math.floor(y0)); x1 = Math.min(R.IW,Math.ceil(x1)); y1 = Math.min(R.IH,Math.ceil(y1));
  return {x:x0, y:y0, w:x1-x0, h:y1-y0};
}
/* contorno preto do abscesso = a camada do abscesso "engordada" em OUT (cópias deslocadas em anéis), menos o próprio abscesso */
function contorno(){
  const o = R.co; if(!o || !g('fp-po')) return;
  o.clearRect(0,0,R.IW,R.IH);
  if(!(OUT>0)) return;                                        // sem contorno: a camada #fp-po fica vazia
  const b = caixaAbscesso(); if(!b || b.w<1 || b.h<1) return;
  const A = R.ca.canvas, rad = OUT*R.K;
  for(const [r,n] of [[rad/3,8],[rad*2/3,12],[rad,16]])
    for(let i=0;i<n;i++){ const a = i/n*2*Math.PI; o.drawImage(A,b.x,b.y,b.w,b.h,b.x+Math.cos(a)*r,b.y+Math.sin(a)*r,b.w,b.h); }
  o.save();
  o.globalCompositeOperation = 'source-in'; o.fillStyle = '#000'; o.fillRect(b.x,b.y,b.w,b.h);      // tudo que foi coberto vira preto
  o.globalCompositeOperation = 'destination-out'; o.drawImage(A,b.x,b.y,b.w,b.h,b.x,b.y,b.w,b.h);   // tira o miolo: sobra só a faixa em volta
  o.restore();
}
function agendaContorno(){ if(R.raf) return; R.raf = requestAnimationFrame(()=>{ R.raf = 0; contorno(); }); }   // durante o traço: no máximo uma vez por quadro
function strokeStart(e){
  const s = st(), w = g('fp-world'); if(!w) return;
  if(window.msl3d) msl3d.liveStart('fp');
  R.rect = w.getBoundingClientRect(); const p = ptr(e,R.rect);
  R.stroke = {c:s.cor, w:tam(s), e:s.tool==='erase', pts:[+p[0].toFixed(1),+p[1].toFixed(1)]};
  drawStroke(R.stroke); if(R.stroke.e || R.stroke.c===2) agendaContorno();
}
function strokeAdd(ev){
  const s = R.stroke; if(!s) return; const p = ptr(ev,R.rect), q = s.pts;
  if(Math.hypot(p[0]-q[q.length-2],p[1]-q[q.length-1]) < 1.2) return;
  q.push(+p[0].toFixed(1),+p[1].toFixed(1));
  const m = q.length;
  alvos(s).forEach(ctx=>{
    style(ctx,s); ctx.beginPath();
    if(m===4){ ctx.moveTo(q[0],q[1]); ctx.lineTo((q[0]+q[2])/2,(q[1]+q[3])/2); }
    else{ const ax=(q[m-6]+q[m-4])/2, ay=(q[m-5]+q[m-3])/2, bx=(q[m-4]+q[m-2])/2, by=(q[m-3]+q[m-1])/2; ctx.moveTo(ax,ay); ctx.quadraticCurveTo(q[m-4],q[m-3],bx,by); }
    ctx.stroke(); ctx.restore();
  });
  if(s.e || s.c===2) agendaContorno();
}
function strokeEnd(){
  const s = R.stroke; R.stroke = null; if(!s) return;
  const q = s.pts, m = q.length;
  if(m>=4) alvos(s).forEach(ctx=>{ style(ctx,s); ctx.beginPath(); ctx.moveTo((q[m-4]+q[m-2])/2,(q[m-3]+q[m-1])/2); ctx.lineTo(q[m-2],q[m-1]); ctx.stroke(); ctx.restore(); });
  lista().push(s); st().redo[R.view] = [];
  if(s.e || s.c===2) contorno();
  refreshLegend(); sync();
  if(window.msl3d) msl3d.liveEnd('fp');
}
function cancelStroke(){
  if(R.arrow){ R.arrow = null; redrawSetas(); }
  if(R.drag){ Object.assign(R.drag.a,R.drag.s0); R.drag = null; redrawSetas(); drawSel(); }
  if(!R.stroke) return; R.stroke = null; redrawAll();
}

/* ======================= setas =======================
   A seta é um item da mesma lista dos traços (desfazer/refazer/limpar valem para ela) e é desenhada
   numa camada própria (#fp-arrows), por cima da pintura e com cor cheia: a borracha não a apaga.
   Item: {arrow:true, x0,y0 (início = lado da caixa de texto), x1,y1 (ponta), w, text}. A caixa de texto
   só aparece se houver texto; fica encostada no início da seta, do lado oposto ao da ponta. */
function setaMed(ctx,a){
  const K = R.K, k = R.IW/1890, sw = Math.max(3,a.w*0.4)*K, hl = sw*4.6, hw = sw*2.3;
  let dx = a.x1-a.x0, dy = a.y1-a.y0; const L = Math.hypot(dx,dy)||1; dx /= L; dy /= L;
  const txt = (a.text||'').trim(); let pill = null, sx = a.x0, sy = a.y0;
  if(txt){
    ctx.save(); ctx.font = `700 ${38*k}px "Segoe UI",Arial,Helvetica,sans-serif`;
    const pw = ctx.measureText(txt).width + 44*k, ph = 68*k; ctx.restore();
    const t = Math.min((pw/2)/Math.max(Math.abs(dx),1e-6), (ph/2)/Math.max(Math.abs(dy),1e-6)) - 3*k, m = 8*k;
    const cx = Math.min(R.IW-m-pw/2, Math.max(m+pw/2, a.x0-dx*t)), cy = Math.min(R.IH-m-ph/2, Math.max(m+ph/2, a.y0-dy*t));
    pill = {x:cx-pw/2, y:cy-ph/2, w:pw, h:ph, cx, cy, txt, k};
    sx = cx; sy = cy;                                        // a haste sai do centro da caixa (que é desenhada por cima)
  }
  return {sw, hl, hw, sx, sy, pill};
}
function drawArrow(ctx,a){
  const G = setaMed(ctx,a), hx = a.x1, hy = a.y1, o = Math.max(2.2*R.K, G.sw*0.22);
  let ux = hx-G.sx, uy = hy-G.sy; const L = Math.hypot(ux,uy)||1; ux /= L; uy /= L;
  const hl = Math.min(G.hl,L*0.75), hw = G.hw*hl/G.hl, bx = hx-ux*hl, by = hy-uy*hl, nx = -uy, ny = ux;
  const head = ()=>{ ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(bx+nx*hw,by+ny*hw); ctx.lineTo(bx-nx*hw,by-ny*hw); ctx.closePath(); };
  const haste = lw=>{ ctx.beginPath(); ctx.moveTo(G.sx,G.sy); ctx.lineTo(bx+ux*hl*0.5,by+uy*hl*0.5); ctx.lineWidth = lw; ctx.stroke(); };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle = SETA.line; haste(G.sw+2*o); head(); ctx.lineWidth = 2*o; ctx.stroke();      // contorno
  ctx.strokeStyle = ctx.fillStyle = SETA.fill; haste(G.sw); head(); ctx.fill();                                // miolo
  const p = G.pill;
  if(p){
    ctx.font = `700 ${38*p.k}px "Segoe UI",Arial,Helvetica,sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = 'rgba(30,36,46,.85)'; ctx.lineWidth = 2.5*p.k;
    roundRect(ctx,p.x,p.y,p.w,p.h,16*p.k); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1f2630'; ctx.fillText(p.txt,p.cx,p.cy+1*p.k);
  }
  ctx.restore();
}
/* setas visíveis: as criadas depois do último "Limpar tudo" e ainda não apagadas.
   Mover e apagar entram na mesma lista como itens {mv:true,ref,from,to} e {del:true,ref}, para o Desfazer/Refazer valer. */
function setasVis(){
  const l = lista(); let i = l.length-1; while(i>=0 && !l[i].clear) i--;
  const v = [];
  for(let j=i+1;j<l.length;j++){ const s = l[j]; if(s.arrow) v.push(s); else if(s.del){ const k = v.indexOf(s.ref); if(k>=0) v.splice(k,1); } }
  return v;
}
function redrawSetas(prev){
  const ctx = R.actx; if(!ctx) return; ctx.clearRect(0,0,R.IW,R.IH);
  setasVis().forEach(a=>drawArrow(ctx,a)); if(prev) drawArrow(ctx,prev);
}
const esc1 = () => R.fw/R.IW*R.k;                      // pixels de tela por pixel da imagem (com o zoom atual)
/* o que está sob o ponteiro: bolinha da ponta/início da seta selecionada, ou o corpo (haste, ponta ou etiqueta) de uma seta */
function setaAlvo(x,y,touch){
  const f = esc1()||1, tolH = (touch?26:16)/f, sel = R.sel && setasVis().includes(R.sel) ? R.sel : null;
  if(sel){
    if(Math.hypot(x-sel.x1,y-sel.y1) <= tolH) return {a:sel, mode:'head'};
    if(Math.hypot(x-sel.x0,y-sel.y0) <= tolH) return {a:sel, mode:'tail'};
  }
  const l = setasVis(), tol = (touch?20:12)/f;
  for(let i=l.length-1;i>=0;i--){
    const a = l[i], G = setaMed(R.actx,a), p = G.pill;
    if(p && x>=p.x && x<=p.x+p.w && y>=p.y && y<=p.y+p.h) return {a, mode:'move'};
    const vx = a.x1-G.sx, vy = a.y1-G.sy, t = Math.max(0,Math.min(1,((x-G.sx)*vx+(y-G.sy)*vy)/(vx*vx+vy*vy||1)));
    if(Math.hypot(x-(G.sx+vx*t),y-(G.sy+vy*t)) <= Math.max(G.hw,tol)) return {a, mode:'move'};
  }
  return null;
}
/* bolinhas nas pontas e contorno tracejado na etiqueta da seta selecionada (camada própria: não vai para a imagem exportada) */
function drawSel(){
  const ctx = R.sctx; if(!ctx) return;
  ctx.clearRect(0,0,R.IW,R.IH);
  if(R.sel && !setasVis().includes(R.sel)){ R.sel = null; }
  const b = g('fp-b-delarrow'); if(b){ b.style.display = st().tool==='arrow' ? '' : 'none'; b.disabled = !R.sel; }
  const a = R.sel; if(!a || st().tool!=='arrow') return;
  const f = esc1()||1, r = 9/f, G = setaMed(R.actx,a), p = G.pill;
  ctx.save(); ctx.lineWidth = 2.5/f; ctx.strokeStyle = '#12a9c9';
  if(p){ ctx.setLineDash([8/f,6/f]); ctx.strokeRect(p.x-6/f,p.y-6/f,p.w+12/f,p.h+12/f); ctx.setLineDash([]); }
  for(const [x,y] of [[a.x0,a.y0],[a.x1,a.y1]]){
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3/f; ctx.stroke();
    ctx.beginPath(); ctx.arc(x,y,r*0.38,0,Math.PI*2); ctx.fillStyle = '#12a9c9'; ctx.fill();
  }
  ctx.restore();
}
const SETA_MIN = 22;                                   // arrasto mínimo (px da imagem de referência) para valer como seta; menos que isso é um toque
function setaStart(e){
  const w = g('fp-world'); if(!w) return;
  fecharTxt();
  R.rect = w.getBoundingClientRect(); const p = ptr(e,R.rect), touch = e.pointerType!=='mouse';
  const alvo = setaAlvo(p[0],p[1],touch);
  if(alvo){                                            // tocou numa seta: seleciona e prepara mover / ajustar (se não arrastar, é um toque: edita o texto)
    const a = alvo.a; R.sel = a; drawSel();
    R.drag = {mode:alvo.mode, a, p0:p, s0:{x0:a.x0,y0:a.y0,x1:a.x1,y1:a.y1}, moved:false};
    return;
  }
  const had = !!R.sel; R.sel = null; drawSel();
  R.arrow = {arrow:true, x0:p[0], y0:p[1], x1:p[0], y1:p[1], w:tam(st()), text:'', had};
}
function setaMove(e){
  const a = R.arrow; if(!a) return; const p = ptr(e,R.rect); a.x1 = p[0]; a.y1 = p[1];
  redrawSetas(Math.hypot(a.x1-a.x0,a.y1-a.y0) >= SETA_MIN*R.K ? a : null);
}
function setaEnd(){
  const a = R.arrow; R.arrow = null; if(!a) return;
  if(Math.hypot(a.x1-a.x0,a.y1-a.y0) < SETA_MIN*R.K){        // toque em lugar vazio: tira a seleção, ou ensina o gesto
    redrawSetas();
    if(!a.had) klugToast('Arraste na imagem para desenhar a seta');
    return;
  }
  delete a.had; ['x0','y0','x1','y1'].forEach(k=>{ a[k] = +a[k].toFixed(1); });
  lista().push(a); st().redo[R.view] = []; R.sel = a; redrawSetas(); drawSel(); sync(); abrirTxt(a);
}
/* mover a seta inteira ou ajustar uma das pontas */
function dragMove(e){
  const d = R.drag, a = d.a, p = ptr(e,R.rect), f = esc1()||1;
  const dx = p[0]-d.p0[0], dy = p[1]-d.p0[1];
  if(!d.moved){ if(Math.hypot(dx,dy)*f < 4) return; d.moved = true; fecharTxt(); }
  const cl = (v,lo,hi)=>Math.max(lo,Math.min(hi,v)), s = d.s0;
  if(d.mode==='move'){
    const mx = cl(dx,-Math.min(s.x0,s.x1),R.IW-Math.max(s.x0,s.x1)), my = cl(dy,-Math.min(s.y0,s.y1),R.IH-Math.max(s.y0,s.y1));
    a.x0 = s.x0+mx; a.y0 = s.y0+my; a.x1 = s.x1+mx; a.y1 = s.y1+my;
  }else{
    const x = cl(p[0],0,R.IW), y = cl(p[1],0,R.IH), o = d.mode==='head' ? [a.x0,a.y0] : [a.x1,a.y1];
    if(Math.hypot(x-o[0],y-o[1]) < SETA_MIN*R.K*0.5) return;                    // não deixa a seta virar um ponto
    if(d.mode==='head'){ a.x1 = x; a.y1 = y; } else { a.x0 = x; a.y0 = y; }
  }
  redrawSetas(); drawSel();
}
function dragEnd(){
  const d = R.drag; R.drag = null; if(!d) return;
  const a = d.a;
  if(!d.moved){ abrirTxt(a); return; }                                          // toque na seta: editar o texto / apagar
  ['x0','y0','x1','y1'].forEach(k=>{ a[k] = +a[k].toFixed(1); });
  lista().push({mv:true, ref:a, from:d.s0, to:{x0:a.x0,y0:a.y0,x1:a.x1,y1:a.y1}}); st().redo[R.view] = []; sync();
}
function apagarSeta(){
  const a = R.sel; if(!a || !setasVis().includes(a)) return;
  fecharTxt(); lista().push({del:true, ref:a}); st().redo[R.view] = []; R.sel = null;
  redrawSetas(); drawSel(); sync(); klugToast('Seta apagada — use Desfazer para voltar');
}
/* caixa de texto (opcional) da seta: aparece ao lado do início da seta; o texto vai para a imagem enquanto se digita */
function fecharTxt(){ const d = g('fp-txt'); if(d) d.remove(); R.edit = null; }
function abrirTxt(a){
  const stg = g('fp-stage'); if(!stg) return;
  fecharTxt(); R.edit = a;
  const d = document.createElement('div'); d.className = 'em-txt'; d.id = 'fp-txt';
  d.innerHTML = '<input type="text" id="fp-txt-in" maxlength="60" placeholder="Texto da seta (opcional)" autocomplete="off" enterkeyhint="done" aria-label="Texto da seta (opcional)"><button type="button" class="msl-btn on" id="fp-txt-ok">OK</button><button type="button" class="msl-btn" id="fp-txt-del" title="Apagar esta seta" aria-label="Apagar esta seta">'+mslIc('trash')+'</button>';
  ['pointerdown','pointerup','pointermove','wheel','contextmenu'].forEach(ev=>d.addEventListener(ev,x=>x.stopPropagation()));
  const inp = d.firstChild; inp.value = a.text || '';
  inp.addEventListener('input',()=>{ a.text = inp.value; redrawSetas(); drawSel(); });
  inp.addEventListener('keydown',x=>{ if(x.key==='Enter'){ x.preventDefault(); fecharTxt(); } });
  d.querySelector('#fp-txt-ok').addEventListener('click',()=>fecharTxt());
  d.querySelector('#fp-txt-del').addEventListener('click',()=>{ R.sel = a; apagarSeta(); });
  stg.appendChild(d); posTxt(d,a);
  inp.focus({preventScroll:true});
}
/* posiciona a caixa de digitação perto do início da seta, num lado que não cubra a seta nem a etiqueta;
   se não houver espaço (palco pequeno), vai para a borda de cima ou de baixo, a mais distante da seta */
function posTxt(d,a){
  const f = R.fw/R.IW*R.k, X = x=>R.tx+x*f, Y = y=>R.ty+y*f, m = 6, w = d.offsetWidth, h = d.offsetHeight, p = setaMed(R.actx,a).pill;
  const xs = [X(a.x0),X(a.x1)], ys = [Y(a.y0),Y(a.y1)];
  if(p){ xs.push(X(p.x),X(p.x+p.w)); ys.push(Y(p.y),Y(p.y+p.h)); }
  const bx0 = Math.min(...xs)-6, bx1 = Math.max(...xs)+6, by0 = Math.min(...ys)-6, by1 = Math.max(...ys)+6;
  const left = Math.max(m,Math.min(R.W-w-m,X(a.x0)-24)), clampT = t=>Math.max(m,Math.min(R.H-h-m,t));
  let top = null;
  for(const t0 of [Y(a.y0)+18, Y(a.y0)-h-18, m, R.H-h-m]){
    const t = clampT(t0);
    if(!(left<bx1 && left+w>bx0 && t<by1 && t+h>by0)){ top = t; break; }
  }
  if(top===null) top = (ys[0]+ys[1])/2 > R.H/2 ? m : R.H-h-m;
  d.style.left = left+'px'; d.style.top = top+'px';
}

/* ======================= ações ======================= */
function sync(){
  const s = st();
  const set = (id,on)=>{ const b=g(id); if(b) b.classList.toggle('on',on); };
  set('fp-b-brush',s.tool==='brush'); set('fp-b-erase',s.tool==='erase'); set('fp-b-arrow',s.tool==='arrow'); set('fp-b-leg',s.legend);
  const stg = g('fp-stage'); if(stg){ stg.classList.toggle('em-arrow',s.tool==='arrow'); if(s.tool!=='arrow') stg.style.cursor = ''; }
  const hint = g('fp-hint'); if(hint) hint.style.display = s.tool==='arrow' ? '' : 'none';
  const w = g('fp-w'); if(w) w.value = tam(s);                                  // a espessura é de cada pincel / da borracha / da seta
  const dis = (id,d)=>{ const b=g(id); if(b) b.disabled=d; };
  dis('fp-b-undo',!lista().length); dis('fp-b-redo',!listaRedo().length); dis('fp-b-clear',!lista().length);
  drawSel();
}
/* desfazer/refazer também valem para mover (volta/reaplica a posição) e apagar seta */
function undo(){ const l=lista(); if(!l.length) return; fecharTxt(); const s=l.pop(); if(s.mv) Object.assign(s.ref,s.from); listaRedo().push(s); redrawAll(); refreshLegend(); sync(); }
function redo(){ const r=listaRedo(); if(!r.length) return; fecharTxt(); const s=r.pop(); if(s.mv) Object.assign(s.ref,s.to); lista().push(s); redrawAll(); refreshLegend(); sync(); }
function limpar(){ const l=lista(); if(!l.length) return; fecharTxt(); l.push({clear:true}); st().redo[R.view]=[]; redrawAll(); refreshLegend(); sync(); klugToast('Marcação apagada — use Desfazer para voltar'); }

/* ======================= exportação ======================= */
function exportCanvas(){
  const c = document.createElement('canvas'); c.width = R.IW; c.height = R.IH; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0,0,R.IW,R.IH); x.imageSmoothingQuality = 'high';
  x.drawImage(g('fp-base'),0,0); x.drawImage(g('fp-po'),0,0);
  if(!(window.msl3d && msl3d.draw('fp',x,R.IW,R.IH))){ x.globalAlpha = ALPHA; x.drawImage(g('fp-pa'),0,0); x.drawImage(g('fp-pt'),0,0); x.globalAlpha = 1; }
  x.drawImage(g('fp-arrows'),0,0); return c;
}
const blob = (tipo,q) => new Promise((ok,no)=>{ try{ exportCanvas().toBlob(b=>b?ok(b):no(new Error('canvas')),tipo,q); }catch(e){ no(e); } });
function baixar(){
  if(!R.ready){ klugToast('Aguarde o mapa carregar.'); return; }
  const nome = 'mapa-fistula-perinal-'+(st().pos.corte==='ax'?'axial':'coronal')+'.jpg';
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
MSL_ORGAOS.fistula = {id:'fistula', nome:'FÍSTULA PERINAL', custom:true, html:html, init:init};
})();
