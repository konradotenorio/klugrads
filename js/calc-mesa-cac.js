/* =========================================================================
   KlugRads — MESA CAC (Percentil do Escore de Cálcio Coronário)
   ---------------------------------------------------------------------------
   Método: TC · Subespecialidade: Tórax.
   Percentil do escore de cálcio coronário (Agatston) por idade, sexo e
   raça/etnia, a partir dos valores de referência do estudo MESA
   (McClelland RL, Chung H, Detrano R, Post W, Kronmal RA. Distribution of
   coronary artery calcium by race, gender, and age: results from the
   Multi-Ethnic Study of Atherosclerosis (MESA). Circulation. 2006;
   113(1):30-37).

   IMPORTANTE — natureza dos dados: o artigo original de 2006 NÃO publica
   fórmula fechada nem tabela impressa dos percentis — os autores estimaram
   a distribuição por técnicas não-paramétricas e disponibilizam os valores
   apenas pela calculadora oficial do MESA (tools.mesa-nhlbi.org/Calcium).
   Os números abaixo foram coletados manualmente, um a um, diretamente
   nessa calculadora oficial (não são aproximação nem invenção), nas idades
   45/65/84 anos para os 8 grupos sexo×raça (com pontos extras em 50/55/75
   para "branco", coletados de brinde). Idades intermediárias são obtidas
   por interpolação (linear para a probabilidade de CAC>0; log-linear para
   os valores de percentil, que crescem de forma aproximadamente
   exponencial com a idade) — não são consultas novas ao site oficial.
   Por isso o resultado pode diferir em alguns pontos percentuais do valor
   exato da calculadora oficial para idades fora da grade coletada.
   Ferramenta educacional.
   ========================================================================= */

/* ages, pnz=P(CAC>0) em %, p25/p50/p75/p90 = valor Agatston no percentil */
const MESA_CAC_TABLE = {
  branco_m:    {ages:[45,50,55,65,75,84], pnz:[25,41,56,77,90,99], p25:[0,0,0,5,52,157],  p50:[0,0,6,71,248,542],   p75:[0,22,68,307,820,1634], p90:[36,110,234,802,2030,3848]},
  branco_f:    {ages:[45,55,65,84],       pnz:[7,26,47,98],        p25:[0,0,0,46],        p50:[0,0,0,159],         p75:[0,1,54,488],           p90:[0,38,228,1168]},
  negro_m:     {ages:[45,65,84],          pnz:[19,56,92],          p25:[0,0,52],          p50:[0,8,224],           p75:[0,95,726],              p90:[16,330,1794]},
  negro_f:     {ages:[45,65,84],          pnz:[8,37,85],           p25:[0,0,13],          p50:[0,0,78],            p75:[0,26,282],              p90:[0,159,698]},
  chines_m:    {ages:[45,65,84],          pnz:[28,64,86],          p25:[0,0,20],          p50:[0,18,112],          p75:[3,121,391],             p90:[50,372,971]},
  chines_f:    {ages:[45,65,84],          pnz:[4,46,81],           p25:[0,0,6],           p50:[0,0,50],            p75:[0,45,190],              p90:[0,194,483]},
  hispanico_m: {ages:[45,65,84],          pnz:[23,64,99],          p25:[0,0,59],          p50:[0,22,203],          p75:[0,141,619],             p90:[42,429,1468]},
  hispanico_f: {ages:[45,65,84],          pnz:[4,38,83],           p25:[0,0,12],          p50:[0,0,83],            p75:[0,19,309],              p90:[0,106,768]},
};
const MESA_CAC_RACAS = [['branco','Caucasiano'],['chines','Chinês'],['negro','Afro-Americano'],['hispanico','Hispânico']];

const MESA_CAC_REFS = [
  'McClelland RL, Chung H, Detrano R, Post W, Kronmal RA. Distribution of Coronary Artery Calcium by Race, Gender, and Age: Results From the Multi-Ethnic Study of Atherosclerosis (MESA). Circulation. 2006;113(1):30–37.',
  'Valores de referência coletados diretamente na calculadora oficial do MESA (tools.mesa-nhlbi.org/Calcium), idades 45/65/84 (grade adicional em 50/55/75 para caucasianos); idades intermediárias interpoladas — ver nota no topo do código-fonte.',
  'Grundy SM, Stone NJ, Bailey AL, et al. 2018 AHA/ACC/AACVPR/AAPA/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Blood Cholesterol. Circulation. 2019;139(25):e1082–e1143. (uso do percentil ≥75 na decisão de estatina)',
];

function mesaCacState(){
  if(!state.mesaCac) state.mesaCac={sexo:null, raca:null, idade:'', cac:''};
  return state.mesaCac;
}
function mesaCacNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }
function mesaCacR(x){ return Math.round(x); }
function mesaCacFmt(x){ return String(x).replace('.', ','); }

function mesaCacGroup(s){
  if(!s.raca || !s.sexo) return null;
  return MESA_CAC_TABLE[s.raca+'_'+s.sexo] || null;
}

/* interpolação linear simples entre pontos vizinhos de "ages" */
function mesaCacBracket(ages, age){
  const a = Math.max(ages[0], Math.min(ages[ages.length-1], age));
  let i = 0;
  while(i < ages.length-2 && ages[i+1] < a) i++;
  const a0=ages[i], a1=ages[i+1];
  const t = a1===a0 ? 0 : (a-a0)/(a1-a0);
  return {i, t, clamped: age<ages[0]||age>ages[ages.length-1]};
}
function mesaCacLerp(arr, br){ return arr[br.i] + (arr[br.i+1]-arr[br.i])*br.t; }
/* interpolação log-linear (ln(v+1)) — cresce ~exponencial com idade */
function mesaCacLerpLog(arr, br){
  const a=Math.log(arr[br.i]+1), b=Math.log(arr[br.i+1]+1);
  return Math.exp(a+(b-a)*br.t)-1;
}

function mesaCacForAge(g, age){
  const br = mesaCacBracket(g.ages, age);
  return {
    clamped: br.clamped,
    pnz: mesaCacLerp(g.pnz, br),
    p25: mesaCacLerpLog(g.p25, br),
    p50: mesaCacLerpLog(g.p50, br),
    p75: mesaCacLerpLog(g.p75, br),
    p90: mesaCacLerpLog(g.p90, br),
  };
}

/* percentil estimado de um escore observado, por interpolação log-linear
   entre os pontos de controle (rank%, valor): (100-pnz,0) · (25,p25) · (50,p50) · (75,p75) · (90,p90) */
function mesaCacScorePercentile(ref, score){
  const pts = [{r: Math.max(0, 100-ref.pnz), v: 0}];
  [[25,ref.p25],[50,ref.p50],[75,ref.p75],[90,ref.p90]].forEach(([r,v])=>{
    if(v > pts[pts.length-1].v) pts.push({r, v});
  });
  if(score<=0) return {approx:true, r: pts[0].r, ceiling:true};
  if(score <= pts[pts.length-1].v){
    let i=0; while(i<pts.length-2 && pts[i+1].v < score) i++;
    const p0=pts[i], p1=pts[i+1];
    const lv0=Math.log(p0.v+1), lv1=Math.log(p1.v+1), ls=Math.log(score+1);
    const t = lv1===lv0 ? 0 : (ls-lv0)/(lv1-lv0);
    return {approx:false, r: p0.r + (p1.r-p0.r)*t};
  }
  /* acima do 90º: extrapola a inclinação do último segmento (log-valor vs. rank) */
  const p0=pts[pts.length-2], p1=pts[pts.length-1];
  const lv0=Math.log(p0.v+1), lv1=Math.log(p1.v+1), ls=Math.log(score+1);
  const slope = (p1.r-p0.r)/(lv1-lv0 || 1);
  const rEst = p1.r + slope*(ls-lv1);
  return {approx:true, r: Math.min(99.9, Math.max(p1.r, rEst)), tail:true};
}

function mesaCacRiskNote(rank){
  if(rank>=75) return {c:'#cf2020', txt:'≥ percentil 75 para idade/sexo/raça — carga de placa maior que a esperada; reforça indicação de estatina em risco intermediário (AHA/ACC 2018).'};
  if(rank>=50) return {c:'#e07a1f', txt:'Entre os percentis 50 e 75 — carga de placa acima da mediana para o grupo.'};
  return {c:'#1f9d55', txt:'Abaixo do percentil 50 — carga de placa igual ou abaixo da mediana para idade/sexo/raça.'};
}

/* ---- UI ---- */
function mesaCacChipField(k, label, opts, s){
  const chips = opts.map(o=>`<div class="ti-ftog ${s[k]===o[0]?'on':''}" onclick="mesaCacSet('${k}','${o[0]}')">${esc(o[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>${esc(label)}</label><div class="ti-foci">${chips}</div></div>`;
}
function mesaCacNumField(k, label, ph, val, unit){
  return `<div class="ti-field">
    <label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf">
      <input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(val)}" oninput="mesaCacSetNum('${k}',this.value)">
      <span>${esc(unit)}</span>
    </div></div>
  </div>`;
}

function mesaCacResHTML(){
  const s = mesaCacState();
  const g = mesaCacGroup(s);
  const idade = mesaCacNum(s.idade);
  if(!g || idade==null) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Selecione sexo, raça/etnia e informe a idade (45–84 anos). O escore de cálcio observado é opcional.</span></div>`;

  const ref = mesaCacForAge(g, idade);
  const avisoIdade = ref.clamped
    ? `<div class="ti-legend-row" style="margin-top:8px"><span class="lt"><b>Atenção:</b> idade fora de 45–84 anos — valor de referência usa o limite mais próximo (${idade<45?45:84} anos), fora da faixa validada pelo MESA.</span></div>` : '';

  const tabela = `<div class="ti-res" style="background:#6b748022;margin-top:12px;align-items:flex-start">
    <div class="lv" style="color:#6b7480;font-size:18px;min-width:64px">${mesaCacR(ref.pnz)}%</div>
    <div class="meta"><div class="a">Probabilidade de CAC &gt; 0 nessa idade/sexo/raça</div>
    <div class="b">Percentis do escore Agatston — 25º: ${mesaCacR(ref.p25)} · 50º: ${mesaCacR(ref.p50)} · 75º: ${mesaCacR(ref.p75)} · 90º: ${mesaCacR(ref.p90)}</div></div>
  </div>`;

  const cacVal = mesaCacNum(s.cac);
  let scoreBox = '';
  if(cacVal!=null && cacVal>=0){
    const est = mesaCacScorePercentile(ref, cacVal);
    const note = mesaCacRiskNote(est.r);
    const label = est.ceiling ? `≤ percentil ${mesaCacR(est.r)}` : `${est.tail?'~':''}percentil ${mesaCacR(est.r)}`;
    scoreBox = `<div class="ti-res" style="background:${note.c}22;margin-top:10px;align-items:flex-start">
      <div class="lv" style="color:${note.c};font-size:20px;min-width:110px">${label}</div>
      <div class="meta"><div class="a">Escore CAC informado: ${mesaCacFmt(cacVal)}</div><div class="b">${esc(note.txt)}</div></div>
      <div class="pts" style="background:${note.c}">CAC</div>
    </div>`;
  }

  return `${avisoIdade}${tabela}${scoreBox}`;
}

function calcMesaCacHTML(){
  const s = mesaCacState();
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Dados demográficos</div>
      ${mesaCacChipField('sexo','Sexo',[['m','Masculino'],['f','Feminino']], s)}
      ${mesaCacNumField('idade','Idade','ex.: 60', s.idade, 'anos')}
      ${mesaCacChipField('raca','Raça/etnia', MESA_CAC_RACAS, s)}
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Escore de cálcio coronário observado (opcional)</div>
      ${mesaCacNumField('cac','Escore Agatston','opcional', s.cac, 'pontos')}
      <div class="ti-legend-row" style="margin-top:4px"><span class="lt">Deixe em branco para ver apenas a tabela de percentis do grupo. Informe o escore para estimar em que percentil ele se encontra.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Resultado</div>
      <div id="mesa-cac-res">${mesaCacResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Como interpretar</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">O percentil compara o escore do paciente com pessoas do mesmo sexo, idade e raça/etnia na coorte MESA — não é o mesmo que a categoria de gravidade absoluta do Agatston (0 / 1–99 / 100–399 / ≥400).</div>
        <div class="tfg-ref-item">Percentil ≥ 75 é o corte mais citado na literatura (AHA/ACC 2018) para reforçar indicação de estatina em pacientes de risco intermediário.</div>
        <div class="tfg-ref-item">Idades intermediárias entre os pontos coletados (45/65/84, com grade extra em 50/55/75 para caucasianos) são interpoladas — ver nota de metodologia nas referências.</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${MESA_CAC_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* ---- ações ---- */
function mesaCacSet(field,val){ const s=mesaCacState(); s[field]=(String(s[field])===String(val))?null:val; render(true); }
function mesaCacSetNum(field,val){ mesaCacState()[field]=val; mesaCacRefresh(); }
function mesaCacRefresh(){ const el=document.getElementById('mesa-cac-res'); if(el) el.innerHTML=translateHTML(mesaCacResHTML()); }

/* registra no catálogo (CALCS de app.js) — método TC, subespecialidade Tórax */
CALCS.push({id:'mesa-cac', modality:'tc', subspec:'torax', badge:'PC',
  title:'MESA CAC (Percentil)',
  desc:'Percentil do escore de cálcio coronário por idade, sexo e raça/etnia (McClelland 2006)'});
