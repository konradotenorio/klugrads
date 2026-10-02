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
function pmapSliceSVG(lv){
  PMAP_SH = lv.id;
  const sc = lv.id==='apex' ? 74 : (lv.id==='mid' ? 84 : 80);
  const g = pmapGeom(lv.id);
  let paths='', labels='';
  [['D',true],['E',false]].forEach(([lado,mirror])=>{
    lv.zones.forEach(z=>{
      const [t0,t1,r0,r1]=g[z]; const id=lv.id+'-'+z+'-'+lado;
      const own=pmapOwner(id);
      const fill= own ? PMAP_COLORS[own] : 'var(--sf2)';
      paths+=`<path d="${pmapSector(t0,t1,r0,r1,sc,mirror)}" fill="${fill}" fill-opacity="${own?0.85:1}" stroke="var(--dim)" stroke-width="1" class="pmap-sec" onclick="pmapToggle('${id}')"><title>${esc(pmapSectorName(id))}</title></path>`;
      const c=pmapCentroid(t0,t1,r0,r1,sc,mirror);
      labels+=`<text x="${c[0].toFixed(1)}" y="${(c[1]+2.5).toFixed(1)}" class="pmap-lbl${own?' on':''}">${own?own:z}</text>`;
    });
  });
  const F=PMAP_FORMA[lv.id], W=sc*F.w+14, H=sc+14, Hb=sc*F.post+16;   // altura até o contorno posterior
  return `<div class="pmap-slice">
    <div class="pmap-slice-t">${lv.nome}</div>
    <svg viewBox="${-W} ${-H} ${2*W} ${H+Hb+12}" class="pmap-svg" role="img" aria-label="Corte axial — ${lv.nome}">
      <text x="${-W+4}" y="${-H+10}" class="pmap-side">D</text><text x="${W-12}" y="${-H+10}" class="pmap-side">E</text>
      <text x="0" y="${-H+8}" class="pmap-ori">anterior</text>
      ${paths}${labels}
      <path d="${pmapOutline(0.14,sc)}" fill="#fff4d6" stroke="var(--dim)" stroke-width="1" pointer-events="none"><title>Uretra</title></path>
      <text x="0" y="${Hb+6}" class="pmap-ori">posterior</text>
    </svg>
  </div>`;
}
function pmapExtraSVG(){
  const piece=(id,shape)=>{ const own=pmapOwner(id);
    return shape.replace('FILL', own?PMAP_COLORS[own]:'var(--sf2)').replace('OPA', own?'0.85':'1')
      .replace('<ellipse','<ellipse class="pmap-sec" onclick="pmapToggle(\''+id+'\')"')
      .replace('<rect','<rect class="pmap-sec" onclick="pmapToggle(\''+id+'\')"'); };
  const lbl=(id,x,y,txt)=>{ const own=pmapOwner(id); return `<text x="${x}" y="${y}" class="pmap-lbl${own?' on':''}">${own?own:txt}</text>`; };
  return `<div class="pmap-slice">
    <div class="pmap-slice-t">Vesículas seminais e esfíncter</div>
    <svg viewBox="-120 -60 240 150" class="pmap-svg" role="img" aria-label="Vesículas seminais e esfíncter uretral externo">
      <text x="-116" y="-48" class="pmap-side">D</text><text x="104" y="-48" class="pmap-side">E</text>
      ${piece('SV-D','<ellipse cx="-52" cy="-18" rx="44" ry="20" transform="rotate(-18 -52 -18)" fill="FILL" fill-opacity="OPA" stroke="var(--dim)" stroke-width="1"><title>Vesícula seminal direita</title></ellipse>')}
      ${piece('SV-E','<ellipse cx="52" cy="-18" rx="44" ry="20" transform="rotate(18 52 -18)" fill="FILL" fill-opacity="OPA" stroke="var(--dim)" stroke-width="1"><title>Vesícula seminal esquerda</title></ellipse>')}
      ${lbl('SV-D',-52,-15,'VS')}${lbl('SV-E',52,-15,'VS')}
      ${piece('EUE','<rect x="-24" y="34" width="48" height="36" rx="16" fill="FILL" fill-opacity="OPA" stroke="var(--dim)" stroke-width="1"><title>Esfíncter uretral externo</title></rect>')}
      ${lbl('EUE',0,56,'EUE')}
    </svg>
  </div>`;
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
  const f=pmapFrase(); if(!f) return '';
  return `<div class="lau-frase">
    <div class="lau-frase-lbl">Frase para o laudo</div>
    <div class="lau-frase-tx">${esc(f).replace(/\n/g,'<br>')}</div>
    <button type="button" class="lau-frase-btn" onclick="pmapCopy()">${svgIcon(P.copy,16,{sw:2})} Copiar frase</button>
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
      <div class="ti-legend-row" style="margin:6px 0 4px"><span class="lt">Convenção radiológica: a direita do paciente (D) fica à esquerda da tela. Toque de novo para desmarcar.</span></div>
      <div class="pmap-grid">${typeof pzeSagitalSVG==='function' ? `<div class="pmap-slice"><div class="pmap-slice-t">Sagital — níveis dos cortes</div>${pzeSagitalSVG()}</div>` : ''}${PMAP_LEVELS.map(pmapSliceSVG).join('')}${pmapExtraSVG()}</div>
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
