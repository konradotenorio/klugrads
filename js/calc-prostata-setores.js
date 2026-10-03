/* =========================================================================
   KlugRads — Mapa de Setores da Próstata (PI-RADS v2.1)
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Medicina Interna.
   41 setores: 38 na próstata (19 por lado), 2 vesículas seminais e
   1 esfíncter uretral externo.
     Base:        PZa, PZpl, PZpm, CZ, TZa, TZp, AS   (x2 lados)
     Terço médio: PZa, PZpl, PZpm, TZa, TZp, AS       (x2 lados)
     Ápice:       PZa, PZpl, PZpm, TZa, TZp, AS       (x2 lados)
   O usuário escolhe a lesão ativa (até 4) e toca nos setores do esquema:
   o setor fica pintado com a cor da lesão, e a frase para o laudo é montada.
   Esquema axial ORIGINAL e simplificado (convenção radiológica: direita do
   paciente à esquerda da tela; anterior para cima). Ferramenta educacional.
   ========================================================================= */

const PMAP_COLORS = {1:'#cf2020', 2:'#e07a1f', 3:'#7b4bd6', 4:'#1f8fb0'};
const PMAP_REFS = [
  'Turkbey B, Rosenkrantz AB, Haider MA, et al. Prostate Imaging Reporting and Data System Version 2.1: 2019 Update. Eur Urol. 2019;76(3):340–351.',
  'Scott R, Misser SK, Cioni D, Neri E. PI-RADS v2.1: What has changed and how to report. SA J Radiol. 2021;25(1):2062. doi:10.4102/sajr.v25i1.2062.',
];
const PMAP_LEVELS = [
  {id:'base', nome:'Base',        txt:'na base',        de:'da base',        zones:['PZa','PZpl','PZpm','CZ','TZa','TZp','AS']},
  {id:'mid',  nome:'Terço médio', txt:'no terço médio', de:'do terço médio', zones:['PZa','PZpl','PZpm','TZa','TZp','AS']},
  {id:'apex', nome:'Ápice',       txt:'no ápice',       de:'do ápice',       zones:['PZa','PZpl','PZpm','TZa','TZp','AS']},
];
const PMAP_ZONE = {
  PZa: {nome:'zona periférica anterior',      f:true},
  PZpl:{nome:'zona periférica posterolateral', f:true},
  PZpm:{nome:'zona periférica posteromedial', f:true},
  CZ:  {nome:'zona central',                   f:true},
  TZa: {nome:'zona de transição anterior',     f:true},
  TZp: {nome:'zona de transição posterior',    f:true},
  AS:  {nome:'estroma fibromuscular anterior', f:false},
};
const PMAP_EXTRA = {
  'SV-D':{nome:'vesícula seminal direita',  f:true},
  'SV-E':{nome:'vesícula seminal esquerda', f:true},
  'EUE': {nome:'esfíncter uretral externo', f:false},
};

/* ---- estado ---- */
function pmapState(){
  if(!state.prostMap){
    state.prostMap={active:1, lesions:{}};
    for(let i=1;i<=4;i++) state.prostMap.lesions[i]={sectors:[], cat:null, size:''};
  }
  return state.prostMap;
}
function pmapOwner(sec){
  const s=pmapState();
  for(let i=1;i<=4;i++) if(s.lesions[i].sectors.indexOf(sec)>=0) return i;
  return 0;
}

/* ---- geometria (coordenadas polares num contorno elíptico) ----
   θ em graus a partir do anterior (0°) até o posterior (180°), para o lado
   ESQUERDO do paciente (direita da tela). O lado direito é espelhado. */
/* Contorno em forma de próstata (não elipse): anterior mais estreito e
   arredondado, posterior mais largo e achatado, com leve depressão na linha
   média posterior. A base é mais larga; o ápice, menor e mais arredondado. */
let PMAP_SH='mid';
const PMAP_FORMA = { base:{w:1.34, ant:0.84, post:0.74, notch:0.08}, mid:{w:1.25, ant:0.86, post:0.78, notch:0.07}, apex:{w:1.12, ant:0.9, post:0.88, notch:0.04} };
function pmapShape(th){
  const f=PMAP_FORMA[PMAP_SH]||PMAP_FORMA.mid, a=th*Math.PI/180, sn=Math.sin(a), c=Math.cos(a);
  const wx = f.w*(f.ant + (1-f.ant)*(1-c)/2);                 // mais estreito na frente
  let y = -c*(c>0 ? 1 : f.post);                              // posterior achatado
  if(c<0){ const d=(180-th)/18; y -= f.notch*Math.exp(-d*d); } // sulco mediano posterior
  return [sn*wx, y];
}
function pmapPt(th, r, sc){
  const p=pmapShape(th);
  return [(r*p[0]*sc).toFixed(1), (r*p[1]*sc).toFixed(1)];
}
/* contorno fechado (ex.: uretra no centro) */
function pmapOutline(r, sc){
  const pts=[]; for(let i=0;i<=36;i++){ const th=i*10, p=pmapShape(th>180?360-th:th); pts.push([(th>180?-1:1)*r*p[0]*sc, r*p[1]*sc]); }
  return 'M'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join('L')+'Z';
}
function pmapSector(t0,t1,r0,r1,sc,mirror){
  const n=10, pts=[];
  for(let i=0;i<=n;i++){ const t=t0+(t1-t0)*i/n; pts.push(pmapPt(t,r1,sc)); }
  for(let i=n;i>=0;i--){ const t=t0+(t1-t0)*i/n; pts.push(r0>0?pmapPt(t,r0,sc):['0','0']); }
  const m=mirror?-1:1;
  return 'M'+pts.map(p=>(m*parseFloat(p[0])).toFixed(1)+','+p[1]).join('L')+'Z';
}
function pmapCentroid(t0,t1,r0,r1,sc,mirror){
  const t=(t0+t1)/2, r=(r0+r1)/2, p=pmapPt(t,r,sc);
  return [(mirror?-1:1)*parseFloat(p[0]), parseFloat(p[1])];
}
/* Recortes por zona: [θ0, θ1, r0, r1]. PZ é o anel externo; TZ o miolo. */
function pmapGeom(level){
  const pzIn = level==='apex' ? 0.52 : 0.64;   // no ápice a PZ ocupa mais área
  const g = {
    AS:   [0, 34, 0.14, 1.0],
    PZa:  [34, 72, pzIn, 1.0],
    PZpl: [72, 138, pzIn, 1.0],
    PZpm: [138, 180, pzIn, 1.0],
    TZa:  [34, 95, 0.14, pzIn],
    TZp:  [95, 180, 0.14, pzIn],
  };
  if(level==='base'){ g.TZp=[95,138,0.14,pzIn]; g.CZ=[138,180,0.14,pzIn]; }
  return g;
}

/* ---- desenho ---- */
/* cores das zonas (mesmo esquema do desenho zonal) */
const PMAP_ZCOR = {PZ:'#efc3cf', TZ:'#f6d873', CZ:'#a9dbb2', AS:'#b8cdea', US:'#fff4d6', SV:'#e8dcc9', EUE:'#d9c3a5'};
function pmapZCor(z){ return PMAP_ZCOR[z.slice(0,2)==='PZ'?'PZ':z.slice(0,2)==='TZ'?'TZ':z]; }
/* ex=true: versão para exportar (imagem) — cores fixas, sem cliques */
function pmapSliceInner(lv, ex){
  PMAP_SH = lv.id;
  const sc = lv.id==='apex' ? 74 : (lv.id==='mid' ? 84 : 80);
  const g = pmapGeom(lv.id);
  const ln = ex ? '#6b6b6b' : 'var(--dim)';
  let paths='', labels='';
  [['D',true],['E',false]].forEach(([lado,mirror])=>{
    lv.zones.forEach(z=>{
      const [t0,t1,r0,r1]=g[z]; const id=lv.id+'-'+z+'-'+lado;
      const own=pmapOwner(id);
      const fill= own ? PMAP_COLORS[own] : pmapZCor(z);
      paths+= ex ? `<path d="${pmapSector(t0,t1,r0,r1,sc,mirror)}" fill="${fill}" stroke="${ln}" stroke-width="1"/>`
                 : `<path d="${pmapSector(t0,t1,r0,r1,sc,mirror)}" fill="${fill}" stroke="${ln}" stroke-width="1" class="pmap-sec" onclick="pmapToggle('${id}')"><title>${esc(pmapSectorName(id))}</title></path>`;
      const c=pmapCentroid(t0,t1,r0,r1,sc,mirror);
      labels+= ex ? `<text x="${c[0].toFixed(1)}" y="${(c[1]+(own?3.5:2.5)).toFixed(1)}" font-family="Arial,Helvetica,sans-serif" font-size="${own?11:8}" font-weight="700" text-anchor="middle" fill="${own?'#fff':'#2b2b2b'}">${own?own:z}</text>`
                  : `<text x="${c[0].toFixed(1)}" y="${(c[1]+2.5).toFixed(1)}" class="pmap-lbl z${own?' on':''}">${own?own:z}</text>`;
    });
  });
  const F=PMAP_FORMA[lv.id], W=sc*F.w+14, H=sc+14, Hb=sc*F.post+16;   // altura até o contorno posterior
  const tx = (x,y,t,cls,anc)=> ex ? `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${cls==='pmap-side'?11:8}" font-weight="${cls==='pmap-side'?800:400}" font-style="${cls==='pmap-ori'?'italic':'normal'}" text-anchor="${anc||'middle'}" fill="${cls==='pmap-side'?'#1d6f8a':'#777'}">${t}</text>`
                                   : `<text x="${x}" y="${y}" class="${cls}">${t}</text>`;
  const body = `${tx(-W+4,-H+10,'D','pmap-side','start')}${tx(W-12,-H+10,'E','pmap-side','start')}${tx(0,-H+8,'anterior','pmap-ori')}
      ${paths}${labels}
      <path d="${pmapOutline(0.14,sc)}" fill="${PMAP_ZCOR.US}" stroke="${ln}" stroke-width="1" pointer-events="none"><title>Uretra</title></path>
      ${tx(0,Hb+6,'posterior','pmap-ori')}${pmapDrawSVG(lv.id)}`;
  return {vb:[-W,-H,2*W,H+Hb+12], body};
}
function pmapSliceSVG(lv){
  const r=pmapSliceInner(lv,false);
  return `<div class="pmap-slice">
    <div class="pmap-slice-t">${lv.nome}</div>
    <svg viewBox="${r.vb.join(' ')}" class="pmap-svg" data-pid="${lv.id}" role="img" aria-label="Corte axial — ${lv.nome}">${r.body}</svg>
  </div>`;
}
function pmapExtraInner(ex){
  const ln = ex ? '#6b6b6b' : 'var(--dim)';
  const piece=(id,tag,attrs,title)=>{ const own=pmapOwner(id);
    const fill= own?PMAP_COLORS[own]:PMAP_ZCOR[id==='EUE'?'EUE':'SV'];
    return `<${tag} ${attrs} fill="${fill}" stroke="${ln}" stroke-width="1"${ex?'':` class="pmap-sec" onclick="pmapToggle('${id}')"`}><title>${title}</title></${tag}>`; };
  const lbl=(id,x,y,txt)=>{ const own=pmapOwner(id);
    return ex ? `<text x="${x}" y="${y+(own?1:0)}" font-family="Arial,Helvetica,sans-serif" font-size="${own?12:9}" font-weight="700" text-anchor="middle" fill="${own?'#fff':'#2b2b2b'}">${own?own:txt}</text>`
              : `<text x="${x}" y="${y}" class="pmap-lbl z${own?' on':''}">${own?own:txt}</text>`; };
  const side=(x,y,t)=> ex ? `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="800" fill="#1d6f8a">${t}</text>` : `<text x="${x}" y="${y}" class="pmap-side">${t}</text>`;
  const body = `${side(-116,-48,'D')}${side(104,-48,'E')}
      ${piece('SV-D','ellipse','cx="-52" cy="-18" rx="44" ry="20" transform="rotate(-18 -52 -18)"','Vesícula seminal direita')}
      ${piece('SV-E','ellipse','cx="52" cy="-18" rx="44" ry="20" transform="rotate(18 52 -18)"','Vesícula seminal esquerda')}
      ${lbl('SV-D',-52,-15,'VS')}${lbl('SV-E',52,-15,'VS')}
      ${piece('EUE','rect','x="-24" y="34" width="48" height="36" rx="16"','Esfíncter uretral externo')}
      ${lbl('EUE',0,56,'EUE')}${pmapDrawSVG('extra')}`;
  return {vb:[-120,-60,240,150], body};
}
function pmapExtraSVG(){
  const r=pmapExtraInner(false);
  return `<div class="pmap-slice">
    <div class="pmap-slice-t">Vesículas seminais e esfíncter</div>
    <svg viewBox="${r.vb.join(' ')}" class="pmap-svg" data-pid="extra" role="img" aria-label="Vesículas seminais e esfíncter uretral externo">${r.body}</svg>
  </div>`;
}

/* ---- imagem do esquema com as lesões (para colar no laudo) ---- */
function pmapExportSVG(){
  const W=1200, F='font-family="Arial,Helvetica,sans-serif"';
  const cell=(r,x,y,w,h,t)=>`<text x="${x+w/2}" y="${y-8}" ${F} font-size="15" font-weight="700" text-anchor="middle" fill="#444">${t}</text>`
    + `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${r.vb.join(' ')}" preserveAspectRatio="xMidYMid meet">${r.body}</svg>`;
  let g = `<rect width="${W}" height="620" fill="#ffffff"/>`
    + `<text x="24" y="34" ${F} font-size="20" font-weight="700" fill="#222">Mapa de setores da próstata — PI-RADS v2.1</text>`;
  PMAP_LEVELS.forEach((lv,i)=>{ g += cell(pmapSliceInner(lv,true), 24+i*392, 70, 370, 300, lv.nome); });
  g += cell(pmapExtraInner(true), 24, 410, 300, 190, 'Vesículas seminais e esfíncter');
  // legenda das lesões
  const s=pmapState(); let y=420;
  for(let i=1;i<=4;i++){ const L=s.lesions[i]; if(!L.sectors.length) continue;
    const ex=[]; if(L.cat) ex.push('PI-RADS '+L.cat); const sz=parseFloat(String(L.size||'').replace(',','.')); if(sz>0) ex.push(String(sz).replace('.',',')+' mm');
    g += `<circle cx="372" cy="${y-5}" r="10" fill="${PMAP_COLORS[i]}"/><text x="372" y="${y-1}" ${F} font-size="12" font-weight="700" text-anchor="middle" fill="#fff">${i}</text>`
      + `<text x="392" y="${y}" ${F} font-size="15" font-weight="700" fill="#222">Lesão ${i}${ex.length?' — '+ex.join(', '):''}</text>`
      + `<text x="392" y="${y+20}" ${F} font-size="12.5" fill="#555">${esc(L.sectors.slice().sort(pmapOrder).map(pmapCode).join(' · '))}</text>`;
    y += 48;
  }
  if(y===420) g += `<text x="372" y="${y}" ${F} font-size="14" fill="#888">Nenhuma lesão marcada.</text>`;
  g += `<text x="${W-24}" y="606" ${F} font-size="11" text-anchor="end" fill="#999">D = direita do paciente · esquema ilustrativo KlugRads</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="620" viewBox="0 0 ${W} 620">${g}</svg>`;
}
function pmapImgBlob(type){
  return new Promise((ok, fail)=>{
    const img=new Image();
    img.onload=()=>{ const k=2, c=document.createElement('canvas'); c.width=img.width*k; c.height=img.height*k;
      const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.scale(k,k); x.drawImage(img,0,0);
      c.toBlob(b=> b?ok(b):fail(new Error('canvas')), type, 0.92); };
    img.onerror=fail;
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(pmapExportSVG());
  });
}
/* copiar: a área de transferência só aceita PNG; para JPEG há o botão de baixar */
function pmapCopyImg(){
  try{
    if(!(navigator.clipboard && window.ClipboardItem)) throw new Error('sem clipboard');
    navigator.clipboard.write([new ClipboardItem({'image/png': pmapImgBlob('image/png')})])
      .then(()=>klugToast('Imagem do esquema copiada ✓ — cole no laudo'))
      .catch(()=>{ klugToast('Não deu para copiar aqui — baixando o JPEG'); pmapBaixarJpg(); });
  }catch(e){ klugToast('Não deu para copiar aqui — baixando o JPEG'); pmapBaixarJpg(); }
}
function pmapBaixarJpg(){
  pmapImgBlob('image/jpeg').then(b=>{
    const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='mapa-setores-prostata.jpg';
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }).catch(()=>klugToast('Não consegui gerar a imagem.'));
}

/* ---- nomes e frase ---- */
function pmapSectorName(id){
  if(PMAP_EXTRA[id]) return PMAP_EXTRA[id].nome;
  const [lvId,z,lado]=id.split('-');
  const lv=PMAP_LEVELS.find(l=>l.id===lvId), zn=PMAP_ZONE[z];
  const ladoTxt = lado==='D' ? (zn.f?'direita':'direito') : (zn.f?'esquerda':'esquerdo');
  return zn.nome+' '+ladoTxt+' '+lv.txt;
}
/* Trecho para a frase: "na zona periférica posterolateral direita do terço médio". */
function pmapSectorPhrase(id){
  if(PMAP_EXTRA[id]) return (PMAP_EXTRA[id].f?'na ':'no ')+PMAP_EXTRA[id].nome;
  const [lvId,z,lado]=id.split('-');
  const lv=PMAP_LEVELS.find(l=>l.id===lvId), zn=PMAP_ZONE[z];
  const ladoTxt = lado==='D' ? (zn.f?'direita':'direito') : (zn.f?'esquerda':'esquerdo');
  return (zn.f?'na ':'no ')+zn.nome+' '+ladoTxt+' '+lv.de;
}
function pmapCode(id){
  if(PMAP_EXTRA[id]) return id==='EUE'?'EUE':('VS '+id.slice(3));
  const [lvId,z,lado]=id.split('-');
  return (PMAP_LEVELS.find(l=>l.id===lvId).nome)+' '+z+' '+lado;
}
function pmapOrder(a,b){
  const key=id=>{
    if(PMAP_EXTRA[id]) return 900+Object.keys(PMAP_EXTRA).indexOf(id);
    const [lvId,z,lado]=id.split('-');
    return PMAP_LEVELS.findIndex(l=>l.id===lvId)*100 + (lado==='D'?0:50) + Object.keys(PMAP_ZONE).indexOf(z);
  };
  return key(a)-key(b);
}
function pmapFrase(){
  const s=pmapState(), out=[];
  for(let i=1;i<=4;i++){
    const L=s.lesions[i]; if(!L.sectors.length) continue;
    const secs=L.sectors.slice().sort(pmapOrder).map(pmapSectorPhrase);
    const lista = secs.length>1 ? secs.slice(0,-1).join(', ')+' e '+secs[secs.length-1] : secs[0];
    const extras=[];
    if(L.cat) extras.push('PI-RADS '+L.cat);
    const sz=parseFloat(String(L.size||'').replace(',','.'));
    if(sz>0) extras.push(String(sz).replace('.',',')+' mm');
    out.push(`Lesão ${i}${extras.length?' ('+extras.join(', ')+')':''} localizada ${lista}.`);
  }
  return out.join('\n');
}

/* ---- UI ---- */
function pmapLesionChips(){
  const s=pmapState();
  return [1,2,3,4].map(i=>{
    const n=s.lesions[i].sectors.length;
    const on=s.active===i;
    return `<div class="ti-ftog ${on?'on':''}" onclick="pmapSetActive(${i})" style="${on?'background:'+PMAP_COLORS[i]+';border-color:'+PMAP_COLORS[i]+';color:#fff':''}">
      <span class="pmap-dot" style="background:${PMAP_COLORS[i]}"></span>Lesão ${i}${n?' · '+n:''}</div>`;
  }).join('');
}
function pmapActiveHTML(){
  const s=pmapState(), L=s.lesions[s.active];
  const cats=[3,4,5].map(c=>`<div class="ti-ftog ${L.cat===c?'on':''}" onclick="pmapSetCat(${c})">PI-RADS ${c}</div>`).join('');
  const lista = L.sectors.length
    ? L.sectors.slice().sort(pmapOrder).map(id=>`<span class="pmap-tag" style="border-color:${PMAP_COLORS[s.active]}" onclick="pmapToggle('${id}')" title="Remover">${esc(pmapCode(id))} ✕</span>`).join('')
    : '<span class="lt">Toque nos setores do esquema para marcar a lesão.</span>';
  return `<div class="ti-field ti-field-foci"><label>Categoria (opcional)</label><div class="ti-foci">${cats}</div></div>
    <div class="ti-field"><label>Maior eixo (opcional)</label>
      <div class="ti-szwrap"><div class="ti-szf"><input type="text" inputmode="decimal" placeholder="ex.: 12" value="${esc(L.size)}" oninput="pmapSetSize(this.value)"><span>mm</span></div></div></div>
    <div class="pmap-tags">${lista}</div>`;
}
function pmapFraseHTML(){
  const f=pmapFrase();
  const temDesenho = Object.values((pmapState().draw)||{}).some(t=>t.length);
  if(!f && temDesenho) return `<div class="lau-frase"><div class="pmap-acts">
      <button type="button" class="lau-btn2" onclick="pmapCopyImg()">Copiar imagem do esquema</button>
      <button type="button" class="lau-btn2" onclick="pmapBaixarJpg()">Baixar JPEG</button></div></div>`;
  if(!f) return '';
  return `<div class="lau-frase">
    <div class="lau-frase-lbl">Frase para o laudo</div>
    <div class="lau-frase-tx">${esc(f).replace(/\n/g,'<br>')}</div>
    <div class="pmap-acts">
      <button type="button" class="lau-frase-btn" onclick="pmapCopy()">${svgIcon(P.copy,16,{sw:2})} Copiar frase</button>
      <button type="button" class="lau-btn2" onclick="pmapCopyImg()">Copiar imagem do esquema</button>
      <button type="button" class="lau-btn2" onclick="pmapBaixarJpg()">Baixar JPEG</button>
    </div>
  </div>`;
}

function calcProstataSetoresHTML(){
  const legend = Object.keys(PMAP_ZONE).map(z=>`<div class="ti-legend-row"><span class="lk" style="background:var(--sf2);color:var(--tx);border:1px solid var(--line)">${z}</span><span class="lt">${esc(PMAP_ZONE[z].nome.charAt(0).toUpperCase()+PMAP_ZONE[z].nome.slice(1))}${z==='CZ'?' (só na base)':''}</span></div>`).join('');
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Lesão ativa</div>
      <div class="ti-foci" style="margin-top:8px">${pmapLesionChips()}</div>
      <div id="pmap-active" style="margin-top:10px">${pmapActiveHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Mapa de setores — cortes axiais</div>
      ${pmapDrawBarHTML()}
      <div class="ti-legend-row" style="margin:6px 0 4px"><span class="lt">Convenção radiológica: a direita do paciente (D) fica à esquerda da tela. Toque de novo para desmarcar.</span></div>
      <div class="pmap-grid${pmapState().modo==='draw'?' pmap-drawing':''}" id="pmap-grid">${typeof pzeSagitalSVG==='function' ? `<div class="pmap-slice"><div class="pmap-slice-t">Sagital — níveis dos cortes</div>${pzeSagitalSVG()}</div>` : ''}${PMAP_LEVELS.map(pmapSliceSVG).join('')}${pmapExtraSVG()}</div>
      <div id="pmap-frase">${pmapFraseHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Setores (PI-RADS v2.1)</div>
      <div class="ti-legend">${legend}</div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">41 setores: 38 na próstata (19 por lado — 7 na base, 6 no terço médio e 6 no ápice), 2 nas vesículas seminais e 1 no esfíncter uretral externo. O PI-RADS v2.1 acrescentou os setores PZpm da base.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${PMAP_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* ---- ações ---- */
function pmapToggle(id){
  const s=pmapState(), own=pmapOwner(id);
  if(own){ const a=s.lesions[own].sectors; a.splice(a.indexOf(id),1); if(own===s.active){ render(true); return; } }
  s.lesions[s.active].sectors.push(id);
  render(true);
}
function pmapSetActive(i){ pmapState().active=i; render(true); }
function pmapSetCat(c){ const L=pmapState().lesions[pmapState().active]; L.cat=(L.cat===c?null:c); render(true); }
function pmapSetSize(v){
  pmapState().lesions[pmapState().active].size=v;
  const el=document.getElementById('pmap-frase'); if(el) el.innerHTML=translateHTML(pmapFraseHTML());
}
function pmapCopy(){ const f=pmapFrase(); if(f) klugCopy(f,'Frase copiada ✓'); }

/* registra no catálogo (CALCS de app.js) — método RM, subespecialidade Medicina Interna */
CALCS.push({id:'prostata-setores', modality:'rm', subspec:'medint', badge:'MS',
  title:'Mapa de Setores da Próstata',
  desc:'PI-RADS v2.1 — marque a lesão no esquema de 41 setores'});


/* =========================================================================
   Desenho livre (lápis) sobre os cortes do esquema
   ---------------------------------------------------------------------------
   Modo "Desenhar": o dedo/mouse/caneta risca por cima dos cortes axiais e das
   vesículas/esfíncter. Os traços ficam guardados em coordenadas do próprio
   esquema (viewBox), por isso acompanham o zoom da tela e entram na imagem
   copiada/baixada para o laudo. Borracha apaga o traço tocado.
   ========================================================================= */
const PMAP_PEN_CORES = ['#111111','#cf2020','#e07a1f','#7b4bd6','#1f8fb0','#16a34a'];
const PMAP_PEN_W = {fina:1.4, media:2.6, grossa:4.5};
function pmapDraw(){ const s=pmapState(); if(!s.draw) s.draw={}; if(!s.modo) s.modo='marcar'; if(!s.pen) s.pen={c:'#111111', w:'media', tool:'lapis'}; return s; }
function pmapPathD(pts){ if(!pts.length) return ''; let d=`M${pts[0]} ${pts[1]}`; for(let i=2;i<pts.length;i+=2) d+=` L${pts[i]} ${pts[i+1]}`; if(pts.length===2) d+=` L${pts[0]+0.01} ${pts[1]}`; return d; }
function pmapDrawSVG(pid){
  const s=pmapDraw(); const ts=s.draw[pid]||[];
  return `<g class="pmap-ink" pointer-events="none">${ts.map(t=>`<path d="${pmapPathD(t.pts)}" fill="none" stroke="${t.c}" stroke-width="${t.w}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</g>`;
}
function pmapDrawBarHTML(){
  const s=pmapDraw(), P=s.pen, on=s.modo==='draw';
  const nTr=Object.values(s.draw).reduce((a,t)=>a+t.length,0);
  const modo=`<div class="ti-foci" style="margin:8px 0 6px">
      <div class="ti-ftog ${!on?'on':''}" onclick="pmapSetModo('marcar')">Marcar setores</div>
      <div class="ti-ftog ${on?'on':''}" onclick="pmapSetModo('draw')">✎ Desenhar</div></div>`;
  if(!on) return modo + (nTr?`<div class="ti-legend-row" style="margin:0 0 4px"><span class="lt">${nTr} traço${nTr>1?'s':''} desenhado${nTr>1?'s':''} — entram na imagem copiada.</span></div>`:'');
  return modo + `<div class="pmap-pen">
      <div class="ti-foci">
        <div class="ti-ftog ${P.tool==='lapis'?'on':''}" onclick="pmapPen('tool','lapis')">✎ Lápis</div>
        <div class="ti-ftog ${P.tool==='borracha'?'on':''}" onclick="pmapPen('tool','borracha')">⌫ Borracha</div>
      </div>
      <div class="pmap-pen-cores">${PMAP_PEN_CORES.map(c=>`<button type="button" class="pmap-pen-cor ${P.c===c&&P.tool==='lapis'?'on':''}" style="background:${c}" onclick="pmapPen('c','${c}')" aria-label="Cor"></button>`).join('')}</div>
      <div class="ti-foci">${[['fina','Fina'],['media','Média'],['grossa','Grossa']].map(o=>`<div class="ti-ftog ${P.w===o[0]?'on':''}" onclick="pmapPen('w','${o[0]}')">${o[1]}</div>`).join('')}</div>
      <div class="ti-foci">
        <div class="ti-ftog" onclick="pmapDesfazer()">↶ Desfazer</div>
        <div class="ti-ftog" onclick="pmapLimparDesenho()">Limpar desenho</div>
      </div>
    </div>
    <div class="ti-legend-row" style="margin:2px 0 4px"><span class="lt">Desenhe por cima dos cortes com o dedo, a caneta ou o mouse. O desenho entra na imagem copiada para o laudo. Para voltar a marcar setores, toque em "Marcar setores".</span></div>`;
}
function pmapSetModo(m){ pmapDraw().modo=m; render(true); }
function pmapPen(k,v){ const P=pmapDraw().pen; P[k]=v; if(k==='c') P.tool='lapis'; render(true); }
function pmapDesfazer(){ const s=pmapDraw(); const h=s.hist||[]; const pid=h.pop(); if(pid && s.draw[pid] && s.draw[pid].length) s.draw[pid].pop(); render(true); }
function pmapLimparDesenho(){ const s=pmapDraw(); s.draw={}; s.hist=[]; render(true); }

/* coordenadas do toque → coordenadas do esquema (viewBox) */
function pmapSvgPt(svg, e){ const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; const m=svg.getScreenCTM(); if(!m) return null; const r=pt.matrixTransform(m.inverse()); return [+r.x.toFixed(1), +r.y.toFixed(1)]; }
let PMAP_TR=null;
document.addEventListener('pointerdown', e=>{
  const svg=e.target.closest && e.target.closest('.pmap-drawing svg.pmap-svg[data-pid]'); if(!svg) return;
  const s=pmapDraw(); if(s.modo!=='draw') return;
  e.preventDefault(); const p=pmapSvgPt(svg,e); if(!p) return;
  const pid=svg.dataset.pid;
  if(s.pen.tool==='borracha'){ PMAP_TR={svg, pid, erase:true}; pmapApagarEm(pid,p); return; }
  try{ svg.setPointerCapture(e.pointerId); }catch(_){}
  const live=document.createElementNS('http://www.w3.org/2000/svg','path');
  live.setAttribute('fill','none'); live.setAttribute('stroke',s.pen.c); live.setAttribute('stroke-width',PMAP_PEN_W[s.pen.w]);
  live.setAttribute('stroke-linecap','round'); live.setAttribute('stroke-linejoin','round'); live.setAttribute('pointer-events','none');
  svg.appendChild(live);
  PMAP_TR={svg, pid, live, t:{c:s.pen.c, w:PMAP_PEN_W[s.pen.w], pts:p.slice()}};
  live.setAttribute('d', pmapPathD(PMAP_TR.t.pts));
}, {passive:false});
document.addEventListener('pointermove', e=>{
  if(!PMAP_TR) return; e.preventDefault();
  const p=pmapSvgPt(PMAP_TR.svg,e); if(!p) return;
  if(PMAP_TR.erase){ pmapApagarEm(PMAP_TR.pid,p); return; }
  const a=PMAP_TR.t.pts, n=a.length; if(Math.hypot(p[0]-a[n-2], p[1]-a[n-1])<0.8) return;
  a.push(p[0],p[1]); PMAP_TR.live.setAttribute('d', pmapPathD(a));
}, {passive:false});
const pmapFimTraco = ()=>{
  if(!PMAP_TR) return; const T=PMAP_TR; PMAP_TR=null;
  if(T.erase) return;
  const s=pmapDraw(); (s.draw[T.pid]=s.draw[T.pid]||[]).push(T.t); (s.hist=s.hist||[]).push(T.pid);
  const fr=document.getElementById('pmap-frase'); if(fr) fr.innerHTML=translateHTML(pmapFraseHTML());   // mostra "copiar imagem" já no 1º traço
};
document.addEventListener('pointerup', pmapFimTraco);
document.addEventListener('pointercancel', pmapFimTraco);
/* borracha: apaga o traço mais próximo do toque (até ~6 unidades do esquema) */
function pmapApagarEm(pid, p){
  const s=pmapDraw(), ts=s.draw[pid]||[]; let best=-1, bd=6;
  ts.forEach((t,i)=>{ for(let j=0;j<t.pts.length;j+=2){ const d=Math.hypot(t.pts[j]-p[0], t.pts[j+1]-p[1]); if(d<bd){ bd=d; best=i; } } });
  if(best<0) return;
  ts.splice(best,1);
  const svg=document.querySelector(`svg.pmap-svg[data-pid="${pid}"]`); const g=svg&&svg.querySelector('.pmap-ink');
  if(g){ const tmp=document.createElementNS('http://www.w3.org/2000/svg','svg'); tmp.innerHTML=pmapDrawSVG(pid); g.replaceWith(tmp.firstChild); }
  // traços ainda "vivos" já salvos: o histórico de desfazer só guarda o órgão; remove uma entrada correspondente
  const h=s.hist||[]; const k=h.lastIndexOf(pid); if(k>=0) h.splice(k,1);
}
