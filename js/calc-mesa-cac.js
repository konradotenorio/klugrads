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
   para "branco", coletados de brinde).

   Método entre as idades coletadas (âncoras): em cada âncora, o percentil de
   um escore é obtido por interpolação log-linear entre os pontos de controle
   (100−P(CAC>0), 0) · (25, P25) · (50, P50) · (75, P75) · (90, P90); para uma
   idade intermediária, interpola-se linearmente o PERCENTIL entre as duas
   âncoras vizinhas. Isso garante que o percentil nunca diminui quando o
   escore aumenta. A tabela P25–P90 exibida é a inversão dessa mesma função
   (coincide com os dados coletados nas âncoras). P(CAC>0) é interpolada
   linearmente. Validação interna (leave-one-out nas âncoras interiores dos
   caucasianos M e F): erro típico (RMS) ≈ 3 e máximo ≈ 7 pontos de percentil;
   nos demais grupos, com menos âncoras, o erro pode ser maior. O resultado
   pode, portanto, diferir do valor exato da calculadora oficial fora das
   idades coletadas. Escore 0 não tem percentil: informa-se a fração do grupo
   sem calcificação (100 − P(CAC>0)).
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
  'Valores de referência coletados diretamente na calculadora oficial do MESA (tools.mesa-nhlbi.org/Calcium), idades 45/65/84 (grade adicional em 50/55/75 para caucasianos). Entre as idades coletadas o percentil é estimado por interpolação entre as âncoras (validação interna em caucasianos: erro típico ≈ 3 e máximo ≈ 7 pontos de percentil) — pode diferir da calculadora oficial.',
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

/* limites de PLAUSIBILIDADE da entrada (não são limites do estudo): fora deles
   a idade é rejeitada; entre 18–44 e 85–110 usa-se a âncora mais próxima, com aviso */
const MESA_CAC_IDADE_MIN = 18, MESA_CAC_IDADE_MAX = 110;

/* vizinhas de "age" em g.ages (idade limitada às pontas); interp=false quando cai numa âncora */
function mesaCacBracket(ages, age){
  const a = Math.max(ages[0], Math.min(ages[ages.length-1], age));
  let i = 0;
  while(i < ages.length-2 && ages[i+1] < a) i++;
  const a0=ages[i], a1=ages[i+1];
  const t = a1===a0 ? 0 : (a-a0)/(a1-a0);
  return {i, t, clamped: age<ages[0]||age>ages[ages.length-1], interp: ages.indexOf(a)<0};
}

/* pontos de controle (percentil, escore) de UMA âncora: (100−P(CAC>0), 0) e P25/P50/P75/P90 > 0 */
function mesaCacAnchorPts(g, i){
  const pts = [{r: Math.max(0, 100-g.pnz[i]), v: 0}];
  [['p25',25],['p50',50],['p75',75],['p90',90]].forEach(([k,r])=>{
    const v = g[k][i];
    if(v > pts[pts.length-1].v) pts.push({r, v});
  });
  return pts;
}
/* percentil de um escore numa âncora. ceiling: escore 0 (r = fração SEM cálcio);
   lower: sem nenhum percentil positivo (todos ≤ P90 são zero) → só se sabe que r é um limite inferior;
   tail: acima do P90, extrapolado pela inclinação do último segmento (log-escore vs. percentil) */
function mesaCacAnchorRank(g, i, score){
  const pts = mesaCacAnchorPts(g, i);
  if(score <= 0) return {r: pts[0].r, ceiling:true};
  if(pts.length === 1) return {r: pts[0].r, lower:true};
  const last = pts[pts.length-1];
  if(score <= last.v){
    let k=0; while(k<pts.length-2 && pts[k+1].v < score) k++;
    const p0=pts[k], p1=pts[k+1];
    const l0=Math.log(p0.v+1), l1=Math.log(p1.v+1), ls=Math.log(score+1);
    return {r: p0.r + (p1.r-p0.r)*(l1===l0 ? 0 : (ls-l0)/(l1-l0))};
  }
  const p0=pts[pts.length-2], p1=last;
  const l0=Math.log(p0.v+1), l1=Math.log(p1.v+1), ls=Math.log(score+1);
  const slope = (p1.r-p0.r)/(l1-l0 || 1);
  return {r: Math.min(99.9, Math.max(p1.r, p1.r + slope*(ls-l1))), tail:true};
}
/* percentil do escore na idade pedida: interpolação linear do PERCENTIL entre as âncoras vizinhas */
function mesaCacRank(g, age, score){
  const br = mesaCacBracket(g.ages, age);
  const a0 = mesaCacAnchorRank(g, br.i, score), a1 = mesaCacAnchorRank(g, br.i+1, score);
  const w0 = br.t < 1, w1 = br.t > 0;
  return {
    r: a0.r + (a1.r-a0.r)*br.t,
    clamped: br.clamped, interp: br.interp,
    ceiling: score <= 0,
    lower: (w0 && !!a0.lower) || (w1 && !!a1.lower),
    tail:  (w0 && !!a0.tail)  || (w1 && !!a1.tail),
  };
}
function mesaCacPnz(g, age){
  const br = mesaCacBracket(g.ages, age);
  return g.pnz[br.i] + (g.pnz[br.i+1]-g.pnz[br.i])*br.t;
}
/* escore no percentil rk (25/50/75/90) = inversa de mesaCacRank (busca binária em ln(escore+1)) */
function mesaCacQuantile(g, age, rk){
  if(100 - mesaCacPnz(g, age) >= rk) return 0;
  const f = u => mesaCacRank(g, age, Math.exp(u)-1).r;
  let lo = 0, hi = Math.log(1e6+1);
  for(let n=0; n<60; n++){ const mid=(lo+hi)/2; if(f(mid) >= rk) hi=mid; else lo=mid; }
  return Math.exp(hi)-1;
}
function mesaCacForAge(g, age){
  const br = mesaCacBracket(g.ages, age);
  return {
    clamped: br.clamped, interp: br.interp,
    anchors: g.ages.join('/'),
    pnz: mesaCacPnz(g, age),
    p25: mesaCacQuantile(g, age, 25),
    p50: mesaCacQuantile(g, age, 50),
    p75: mesaCacQuantile(g, age, 75),
    p90: mesaCacQuantile(g, age, 90),
  };
}

function mesaCacRankLabel(est){
  const r = est.r;
  if(est.ceiling) return 'CAC = 0';
  if(est.lower)   return `> percentil ${Math.floor(r)}`;
  if(est.tail && r >= 99) return '> percentil 99';
  return `${(est.tail||est.interp)?'~':''}percentil ${mesaCacR(r)}`;
}
function mesaCacRiskNote(est, pnz){
  if(est.ceiling) return {c:'#1f9d55', txt:`Escore zero: sem calcificação coronariana detectável (percentil não se aplica). Nesta idade/sexo/raça, cerca de ${mesaCacR(100-pnz)}% da coorte MESA também tem CAC = 0.`};
  const rank = est.r;
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

  const aviso = t => `<div class="ti-legend-row" style="margin-top:8px"><span class="lt">${t}</span></div>`;
  if(idade < MESA_CAC_IDADE_MIN || idade > MESA_CAC_IDADE_MAX)
    return aviso(`<b>Idade inválida:</b> informe um valor entre ${MESA_CAC_IDADE_MIN} e ${MESA_CAC_IDADE_MAX} anos (o MESA cobre 45–84 anos).`);

  const ref = mesaCacForAge(g, idade);
  let avisos = '';
  if(ref.clamped) avisos += aviso(`<b>Atenção:</b> idade fora de 45–84 anos — valor de referência usa o limite mais próximo (${idade<45?45:84} anos), fora da faixa validada pelo MESA.`);
  else if(ref.interp) avisos += aviso(`<b>Estimativa:</b> ${mesaCacR(idade)} anos não é uma idade coletada (${ref.anchors}); valores obtidos por interpolação — erro típico ≈ 3 e até ≈ 7 pontos de percentil na validação interna (caucasianos); em outros grupos pode ser maior.`);

  const tabela = `<div class="ti-res" style="background:#6b748022;margin-top:12px;align-items:flex-start">
    <div class="lv" style="color:#6b7480;font-size:18px;min-width:64px">${mesaCacR(ref.pnz)}%</div>
    <div class="meta"><div class="a">Probabilidade de CAC &gt; 0 nessa idade/sexo/raça</div>
    <div class="b">Percentis do escore Agatston${ref.interp||ref.clamped?' (estimados)':''} — 25º: ${mesaCacR(ref.p25)} · 50º: ${mesaCacR(ref.p50)} · 75º: ${mesaCacR(ref.p75)} · 90º: ${mesaCacR(ref.p90)}</div></div>
  </div>`;

  const cacTxt = String(s.cac==null?'':s.cac).trim();
  const cacVal = mesaCacNum(s.cac);
  let scoreBox = '';
  if(cacTxt !== '' && (cacVal==null || cacVal<0)){
    scoreBox = aviso('<b>Escore inválido:</b> informe um número maior ou igual a zero (escore de Agatston).');
  } else if(cacVal!=null){
    const est = mesaCacRank(g, idade, cacVal);
    const note = mesaCacRiskNote(est, ref.pnz);
    scoreBox = `<div class="ti-res" style="background:${note.c}22;margin-top:10px;align-items:flex-start">
      <div class="lv" style="color:${note.c};font-size:20px;min-width:110px">${mesaCacRankLabel(est)}</div>
      <div class="meta"><div class="a">Escore CAC informado: ${mesaCacFmt(cacVal)}</div><div class="b">${esc(note.txt)}</div></div>
      <div class="pts" style="background:${note.c}">CAC</div>
    </div>`;
  }

  return `${avisos}${tabela}${scoreBox}`;
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
        <div class="tfg-ref-item">Escore zero não tem percentil: indica ausência de calcificação detectável, e o app informa a fração do grupo que também tem CAC = 0.</div>
        <div class="tfg-ref-item">Idades intermediárias entre os pontos coletados (45/65/84, com grade extra em 50/55/75 para caucasianos) são estimadas por interpolação; nesses casos o percentil aparece com "~" e pode diferir da calculadora oficial — ver nota de metodologia nas referências.</div>
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
