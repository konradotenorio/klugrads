/* =========================================================================
   KlugRads — Esquema zonal da próstata (desenho ORIGINAL do KlugRads)
   ---------------------------------------------------------------------------
   Ilustração própria, desenhada em código (SVG), para uso nas calculadoras
   PI-RADS v2.1 e Mapa de Setores. Não reproduz figuras de terceiros: o corte
   sagital é um contorno simplificado e os cortes axiais usam a mesma
   geometria polar do Mapa de Setores (calc-prostata-setores.js).
   Zonas (nomenclatura PI-RADS v2.1 — fato anatômico, sem desenho copiado):
     PZ (a, pl, pm) · TZ (a, p) · CZ (só na base) · AS (estroma anterior) · US
   Convenções: sagital com anterior à esquerda; axial em convenção
   radiológica (direita do paciente à esquerda da tela, anterior para cima).
   ========================================================================= */

const PZE_COR = {
  PZ:'#efc3cf', TZ:'#f6d873', CZ:'#a9dbb2', AS:'#b8cdea', US:'#fff4d6', SV:'#e8dcc9', EUE:'#d9c3a5',
};
const PZE_TXT = '#2b2b2b';   // rótulos sobre as cores claras (legível no tema claro e no escuro)

/* ---- corte sagital (linha média) ---- */
function pzeSagitalSVG(){
  const ln = 'stroke="var(--dim)" stroke-width="1.2" stroke-linejoin="round"';
  const t = (x,y,s,extra,cls)=>`<text x="${x}" y="${y}" class="${cls||'pze-t'}" ${extra||''}>${s}</text>`;
  // contorno da próstata (base em cima, ápice embaixo; anterior à esquerda)
  const prost = 'M92,122 C90,104 132,96 168,98 C200,100 222,112 224,134 C226,168 206,214 170,244 C156,256 138,256 126,246 C100,224 92,170 92,122 Z';
  return `<svg viewBox="0 0 320 320" class="pze-svg" role="img" aria-label="Corte sagital esquemático da próstata">
    <defs><clipPath id="pze-clip"><path d="${prost}"/></clipPath></defs>
    <!-- bexiga -->
    <path d="M70,96 C60,52 110,22 160,22 C214,22 254,50 240,96 C232,108 212,104 196,100 C176,96 150,96 128,98 C104,100 76,108 70,96 Z" fill="var(--sf2)" ${ln}/>
    ${t(158,58,'Bexiga')}
    <!-- vesícula seminal -->
    <path d="M206,104 C214,86 236,70 258,72 C276,74 282,92 268,104 C256,114 234,118 214,120 Z" fill="${PZE_COR.SV}" ${ln}/>
    ${t(250,96,'VS',`style="fill:${PZE_TXT}"`)}
    <!-- reto -->
    <path d="M276,128 C268,180 254,232 230,300" fill="none" stroke="var(--dim)" stroke-width="1.2" stroke-dasharray="1 0"/>
    <path d="M300,128 C292,184 280,238 258,304" fill="none" stroke="var(--dim)" stroke-width="1.2"/>
    ${t(288,214,'Reto','transform="rotate(72 288 214)"')}
    <!-- próstata: PZ de fundo e as demais zonas por cima, recortadas no contorno -->
    <path d="${prost}" fill="${PZE_COR.PZ}"/>
    <g clip-path="url(#pze-clip)">
      <!-- AS: faixa anterior -->
      <path d="M80,100 L114,100 C106,140 108,196 134,240 L120,262 C88,226 76,160 80,100 Z" fill="${PZE_COR.AS}"/>
      <!-- CZ: cunha posterior da base, afilando até o colículo seminal -->
      <path d="M166,96 C196,98 228,110 230,128 C214,150 186,168 152,180 C150,150 156,120 166,96 Z" fill="${PZE_COR.CZ}"/>
      <!-- TZ: em volta da uretra proximal, anterior ao colículo -->
      <path d="M116,124 C116,108 146,104 152,116 C156,132 150,160 146,182 C134,190 118,182 114,164 C110,150 114,136 116,124 Z" fill="${PZE_COR.TZ}"/>
      <!-- ducto ejaculatório -->
      <path d="M214,118 C190,136 168,158 149,180" fill="none" stroke="var(--dim)" stroke-width="1" stroke-dasharray="3 3"/>
    </g>
    <!-- uretra -->
    <path d="M150,98 C150,128 150,158 148,180 C144,204 134,232 128,252 C125,270 123,290 122,312" fill="none" stroke="${PZE_COR.US}" stroke-width="7" stroke-linecap="round"/>
    <path d="M150,98 C150,128 150,158 148,180 C144,204 134,232 128,252 C125,270 123,290 122,312" fill="none" stroke="var(--dim)" stroke-width="0.8" stroke-dasharray="1 0" opacity=".6"/>
    <!-- esfíncter uretral externo -->
    <rect x="114" y="258" width="22" height="16" rx="6" fill="${PZE_COR.EUE}" ${ln}/>
    <path d="${prost}" fill="none" ${ln}/>
    <!-- planos dos cortes axiais -->
    <g stroke="var(--dim)" stroke-width="1" stroke-dasharray="5 4" opacity=".9">
      <line x1="60" y1="150" x2="248" y2="150"/><line x1="60" y1="200" x2="248" y2="200"/>
    </g>
    ${t(36,130,'Base','','pze-t pze-lv')}${t(36,178,'Médio','','pze-t pze-lv')}${t(36,228,'Ápice','','pze-t pze-lv')}
    <!-- rótulos das zonas -->
    ${t(104,190,'AS',`style="fill:${PZE_TXT}"`)}${t(132,148,'TZ',`style="fill:${PZE_TXT}"`)}${t(190,128,'CZ',`style="fill:${PZE_TXT}"`)}${t(188,198,'PZ',`style="fill:${PZE_TXT}"`)}
    ${t(142,271,'EUE','style="text-anchor:start"')}${t(114,304,'Uretra','style="text-anchor:end"')}
    ${t(30,14,'◀ anterior','','pze-t pze-o')}${t(292,14,'posterior ▶','','pze-t pze-o')}
  </svg>`;
}

/* ---- cortes axiais coloridos por zona (mesma geometria do Mapa de Setores) ---- */
function pzeZonaDe(z){ return z.slice(0,2)==='PZ' ? 'PZ' : z.slice(0,2)==='TZ' ? 'TZ' : z; }
function pzeAxialSVG(lv){
  PMAP_SH = lv.id;
  const sc = lv.id==='apex' ? 74 : (lv.id==='mid' ? 84 : 80);
  const g = pmapGeom(lv.id);
  let paths='', labels='';
  [['D',true],['E',false]].forEach(([lado,mirror])=>{
    lv.zones.forEach(z=>{
      const [t0,t1,r0,r1]=g[z];
      paths += `<path d="${pmapSector(t0,t1,r0,r1,sc,mirror)}" fill="${PZE_COR[pzeZonaDe(z)]}" stroke="var(--dim)" stroke-width="0.9"/>`;
      const c=pmapCentroid(t0,t1,r0,r1,sc,mirror);
      labels += `<text x="${c[0].toFixed(1)}" y="${(c[1]+2.6).toFixed(1)}" class="pze-s">${z}</text>`;
    });
  });
  const F=PMAP_FORMA[lv.id], W=sc*F.w+14, H=sc+14, Hb=sc*F.post+16;   // altura até o contorno posterior
  return `<div class="pmap-slice">
    <div class="pmap-slice-t">${lv.nome}</div>
    <svg viewBox="${-W} ${-H} ${2*W} ${H+Hb+12}" class="pmap-svg" role="img" aria-label="Corte axial esquemático — ${lv.nome}">
      <text x="${-W+4}" y="${-H+10}" class="pmap-side">D</text><text x="${W-12}" y="${-H+10}" class="pmap-side">E</text>
      <text x="0" y="${-H+8}" class="pmap-ori">anterior</text>
      ${paths}${labels}
      <path d="${pmapOutline(0.14,sc)}" fill="${PZE_COR.US}" stroke="var(--dim)" stroke-width="1"/>
      <text x="0" y="${Hb+6}" class="pmap-ori">posterior</text>
    </svg>
  </div>`;
}

function pzeLegendaHTML(){
  const it = [['PZ','Zona periférica (PZa anterior, PZpl posterolateral, PZpm posteromedial)'],
              ['TZ','Zona de transição (TZa anterior, TZp posterior)'],
              ['CZ','Zona central — só na base'],
              ['AS','Estroma fibromuscular anterior'],
              ['US','Uretra / estroma uretral'],
              ['VS','Vesículas seminais'],
              ['EUE','Esfíncter uretral externo']];
  const cor = {US:PZE_COR.US, VS:PZE_COR.SV, EUE:PZE_COR.EUE};
  return `<div class="ti-legend">${it.map(([k,d])=>`<div class="ti-legend-row"><span class="lk" style="background:${cor[k]||PZE_COR[k]};color:${PZE_TXT};border:1px solid var(--line)">${k}</span><span class="lt">${esc(d)}</span></div>`).join('')}</div>`;
}

/* Card completo. axial=false mostra só o sagital (o Mapa de Setores já tem os cortes). */
function prostEsquemaHTML(axial){
  return `<div class="ti-card">
    <div class="tfg-sec-lbl">Anatomia zonal — esquema</div>
    <div class="pze-grid${axial?'':' so'}">
      <div class="pmap-slice"><div class="pmap-slice-t">Sagital (linha média)</div>${pzeSagitalSVG()}</div>
      ${axial ? PMAP_LEVELS.map(pzeAxialSVG).join('') : ''}
    </div>
    <div class="ti-legend-row" style="margin:8px 0 6px"><span class="lt">As linhas tracejadas no sagital marcam os níveis dos cortes axiais (base, terço médio e ápice). Axiais em convenção radiológica: D = direita do paciente.</span></div>
    ${pzeLegendaHTML()}
    <div class="ti-legend-row" style="margin-top:6px"><span class="lt">Esquema ilustrativo e simplificado, desenhado pelo KlugRads — proporções aproximadas.</span></div>
  </div>`;
}
