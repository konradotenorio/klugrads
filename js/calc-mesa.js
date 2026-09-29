/* =========================================================================
   KlugRads — MESA Score (Risco de Doença Coronariana em 10 Anos)
   ---------------------------------------------------------------------------
   Método: TC · Subespecialidade: Tórax.
   Modelo de Cox do estudo MESA (Multi-Ethnic Study of Atherosclerosis) para
   risco de evento coronariano "duro" (IAM, PCR ressuscitada, morte por DAC
   ou revascularização com angina prévia/concomitante) em 10 anos — com e
   sem o escore de cálcio coronário (CAC/Agatston).

   Fórmula (McClelland RL, et al. J Am Coll Cardiol. 2015;66(15):1643-53):
     soma = Σ (variável × coeficiente do modelo)
     risco (%) = [1 − S0(10)^exp(soma)] × 100
   Modelo SEM CAC (14 variáveis) e COM CAC (15 variáveis, + ln(CAC+1)),
   cada um com seu próprio conjunto de coeficientes e sobrevida basal S0(10).
   Coeficientes conferidos diretamente na Tabela 2 do artigo original (PMC
   free full text) e cruzados com a implementação de código aberto do
   pacote R "CVrisk" (github.com/vcastro/CVrisk, data-raw/score_coef.R),
   que cita a mesma tabela como fonte.

   Coorte de derivação: 6.814 participantes MESA, 45–84 anos, seguimento
   mediano de 10,2 anos. Validado externamente nos estudos HNR e DHS.
   Uso pretendido para adultos de 45–84 anos, sem doença cardiovascular
   conhecida. Ferramenta educacional — não substitui o julgamento clínico.
   ========================================================================= */

const MESA_SEM_CAC = {
  age:0.0455, male:0.7496, chinese:-0.5055, aa:-0.2111, hispanic:-0.1900,
  diabetes:0.5168, smoker:0.4732, totchol:0.0053, hdl:-0.0140, lipidmed:0.2473,
  sbp:0.0085, bpmed:0.3381, famhist:0.4522, s0:0.99963,
};
const MESA_COM_CAC = {
  age:0.0172, male:0.4079, chinese:-0.3475, aa:0.0353, hispanic:-0.0222,
  diabetes:0.3892, smoker:0.3717, totchol:0.0043, hdl:-0.0114, lipidmed:0.1206,
  sbp:0.0066, bpmed:0.2278, famhist:0.3239, logcac:0.2743, s0:0.99833,
};

const MESA_RACAS = [['branco','Caucasiano'],['chines','Chinês'],['aa','Afro-Americano'],['hispanico','Hispânico']];

const MESA_REFS = [
  'McClelland RL, Jorgensen NW, Budoff M, et al. 10-Year Coronary Heart Disease Risk Prediction Using Coronary Artery Calcium and Traditional Risk Factors: Derivation in the MESA (Multi-Ethnic Study of Atherosclerosis) With Validation in the HNR (Heinz Nixdorf Recall) Study and the DHS (Dallas Heart Study). J Am Coll Cardiol. 2015;66(15):1643–1653.',
  'Grundy SM, Stone NJ, Bailey AL, et al. 2018 AHA/ACC/AACVPR/AAPA/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Blood Cholesterol. Circulation. 2019;139(25):e1082–e1143.',
];

function mesaState(){
  if(!state.mesa) state.mesa={sexo:null, idade:'', raca:null, diabetes:null, tabagismo:null, historico:null,
    colesterol:'', hdl:'', pas:'', cac:'', estatina:null, antihipertensivo:null};
  return state.mesa;
}
function mesaNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }
function mesaR1(x){ return Math.round(x*10)/10; }
function mesaFmt(x){ return String(x).replace('.', ','); }

function mesaComplete(s){
  return !!(s.sexo && s.raca && s.diabetes && s.tabagismo && s.historico && s.estatina && s.antihipertensivo
    && mesaNum(s.idade)!=null && mesaNum(s.colesterol)!=null && mesaNum(s.hdl)!=null && mesaNum(s.pas)!=null);
}

/* limites de PLAUSIBILIDADE da entrada (não são limites do estudo): fora deles
   não se calcula, para não devolver um risco sem sentido (ex.: idade 200 → 100%) */
const MESA_LIM = {idade:[18,110], colesterol:[50,700], hdl:[5,200], pas:[60,300], cac:[0,100000]};
function mesaValidate(s){
  const erros = [];
  const chk = (k, label, unit)=>{
    const v = mesaNum(s[k]), lim = MESA_LIM[k];
    if(v==null || v<lim[0] || v>lim[1]) erros.push(`${label}: informe um valor entre ${lim[0]} e ${lim[1]} ${unit}.`);
  };
  chk('idade','Idade','anos'); chk('colesterol','Colesterol total','mg/dL'); chk('hdl','HDL','mg/dL'); chk('pas','Pressão sistólica','mmHg');
  const cacTxt = String(s.cac==null?'':s.cac).trim();
  if(cacTxt !== ''){
    const v = mesaNum(s.cac);
    if(v==null || v<MESA_LIM.cac[0] || v>MESA_LIM.cac[1]) erros.push(`Escore de cálcio (CAC): informe um número entre ${MESA_LIM.cac[0]} e ${MESA_LIM.cac[1]} ou deixe em branco.`);
  }
  const tc = mesaNum(s.colesterol), h = mesaNum(s.hdl);
  if(tc!=null && h!=null && h>tc) erros.push('O HDL não pode ser maior que o colesterol total.');
  return erros;
}

/* soma linear do modelo de Cox (variáveis em unidades originais, sem centralização) */
function mesaSum(coef, s, cacVal){
  const idade=mesaNum(s.idade), tc=mesaNum(s.colesterol), hdl=mesaNum(s.hdl), pas=mesaNum(s.pas);
  let sum = idade*coef.age
    + (s.sexo==='m'?1:0)*coef.male
    + (s.raca==='chines'?1:0)*coef.chinese
    + (s.raca==='aa'?1:0)*coef.aa
    + (s.raca==='hispanico'?1:0)*coef.hispanic
    + (s.diabetes==='sim'?1:0)*coef.diabetes
    + (s.tabagismo==='sim'?1:0)*coef.smoker
    + tc*coef.totchol
    + hdl*coef.hdl
    + (s.estatina==='sim'?1:0)*coef.lipidmed
    + pas*coef.sbp
    + (s.antihipertensivo==='sim'?1:0)*coef.bpmed
    + (s.historico==='sim'?1:0)*coef.famhist;
  if(coef.logcac!=null) sum += Math.log1p(cacVal)*coef.logcac;
  return sum;
}
function mesaRisk(coef, s, cacVal){
  const sum = mesaSum(coef, s, cacVal);
  return (1 - Math.pow(coef.s0, Math.exp(sum))) * 100;
}

function mesaBand(risk){
  if(risk<5)   return {label:'Risco baixo',          c:'#1f9d55', mgmt:'Ênfase em estilo de vida (dieta, atividade física, cessação do tabagismo). Estatina em geral não indicada com base isolada no risco estimado.'};
  if(risk<7.5) return {label:'Risco limítrofe',       c:'#d9a520', mgmt:'Considerar reforçadores de risco (história familiar, CAC, outros) para individualizar a decisão sobre estatina; ênfase em estilo de vida.'};
  if(risk<20)  return {label:'Risco intermediário',   c:'#e07a1f', mgmt:'O CAC pode orientar a decisão: CAC = 0 favorece adiar estatina (exceto fatores de alto risco); CAC 1–99 favorece iniciar estatina (sobretudo ≥ 55 anos); CAC ≥ 100 ou ≥ percentil 75 reforça a indicação de estatina.'};
  return         {label:'Risco alto',                 c:'#cf2020', mgmt:'Estatina de moderada a alta intensidade geralmente indicada, independentemente do CAC.'};
}

/* ---- UI: campos numéricos (mesmo padrão de adrField/ferroField) ---- */
function mesaNumField(k, label, ph, val, unit){
  return `<div class="ti-field">
    <label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf">
      <input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(val)}" oninput="mesaSetNum('${k}',this.value)">
      <span>${esc(unit)}</span>
    </div></div>
  </div>`;
}
/* ---- UI: campos de escolha única (mesmo padrão de cadradsChipRow) ---- */
function mesaChipField(k, label, opts, s){
  const chips = opts.map(o=>`<div class="ti-ftog ${s[k]===o[0]?'on':''}" onclick="mesaSet('${k}','${o[0]}')">${esc(o[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>${esc(label)}</label><div class="ti-foci">${chips}</div></div>`;
}

function mesaResHTML(){
  const s = mesaState();
  if(!mesaComplete(s)) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Preencha todos os campos obrigatórios para calcular o risco em 10 anos. O escore de cálcio (CAC) é opcional.</span></div>`;
  const erros = mesaValidate(s);
  if(erros.length) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt"><b>Confira os valores informados:</b><br>• ${erros.map(esc).join('<br>• ')}</span></div>`;
  const cacVal = mesaNum(s.cac);
  const usaCAC = cacVal!=null && cacVal>=0;
  const coefPrincipal = usaCAC ? MESA_COM_CAC : MESA_SEM_CAC;
  const riscoPrincipal = mesaR1(mesaRisk(coefPrincipal, s, cacVal));
  const band = mesaBand(riscoPrincipal);

  const idade = mesaNum(s.idade);
  const avisoIdade = (idade<45 || idade>84)
    ? `<div class="ti-legend-row" style="margin-top:8px"><span class="lt"><b>Atenção:</b> modelo derivado e validado em adultos de 45–84 anos (MESA). Fora dessa faixa, interprete com cautela.</span></div>` : '';

  let comparativo = '';
  if(usaCAC){
    const riscoSemCac = mesaR1(mesaRisk(MESA_SEM_CAC, s, null));
    comparativo = `<div class="ti-res" style="background:#6b748022;margin-top:10px">
      <div class="lv" style="color:#6b7480;font-size:16px">${mesaFmt(riscoSemCac)}%</div>
      <div class="meta"><div class="a">Risco em 10 anos — sem CAC</div><div class="b">Estimativa apenas com fatores tradicionais, para comparação (mesmo paciente).</div></div>
    </div>`;
  }

  return `${avisoIdade}
    <div class="ti-res" style="background:${band.c}22;margin-top:12px;align-items:flex-start">
      <div class="lv" style="color:${band.c};font-size:22px;min-width:80px">${mesaFmt(riscoPrincipal)}%</div>
      <div class="meta"><div class="a">${esc(band.label)} · risco em 10 anos${usaCAC?' (com CAC)':' (sem CAC)'}</div><div class="b">${esc(band.mgmt)}</div></div>
      <div class="pts" style="background:${band.c}">DAC</div>
    </div>
    ${comparativo}`;
}

function calcMesaHTML(){
  const s = mesaState();
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Dados demográficos</div>
      ${mesaChipField('sexo','Sexo',[['m','Masculino'],['f','Feminino']], s)}
      ${mesaNumField('idade','Idade','ex.: 55', s.idade, 'anos')}
      ${mesaChipField('raca','Raça/etnia', MESA_RACAS, s)}
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fatores de risco</div>
      ${mesaChipField('diabetes','Diabetes',[['sim','Sim'],['nao','Não']], s)}
      ${mesaChipField('tabagismo','Tabagismo atual',[['sim','Sim'],['nao','Não']], s)}
      ${mesaChipField('historico','Histórico familiar (IAM em parente de 1º grau)',[['sim','Sim'],['nao','Não']], s)}
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Valores laboratoriais</div>
      <div class="ti-fields">
        ${mesaNumField('colesterol','Colesterol total','ex.: 200', s.colesterol, 'mg/dL')}
        ${mesaNumField('hdl','HDL colesterol','ex.: 50', s.hdl, 'mg/dL')}
        ${mesaNumField('pas','Pressão arterial sistólica','ex.: 130', s.pas, 'mmHg')}
      </div>
      ${mesaNumField('cac','Escore de cálcio coronário (CAC/Agatston)','opcional', s.cac, 'pontos')}
      <div class="ti-legend-row" style="margin-top:4px"><span class="lt">CAC opcional — deixe em branco se indisponível. Quando informado, o modelo com CAC é usado automaticamente (mais preciso).</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Medicações</div>
      ${mesaChipField('estatina','Medicação para colesterol (estatina/hipolipemiante)',[['sim','Sim'],['nao','Não']], s)}
      ${mesaChipField('antihipertensivo','Medicação para hipertensão',[['sim','Sim'],['nao','Não']], s)}
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Resultado</div>
      <div id="mesa-res">${mesaResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Categorias de risco (10 anos)</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55"> </span><span class="lt"><b>&lt; 5%</b> — baixo</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#d9a520"> </span><span class="lt"><b>5–7,4%</b> — limítrofe</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f"> </span><span class="lt"><b>7,5–19,9%</b> — intermediário</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020"> </span><span class="lt"><b>≥ 20%</b> — alto</span></div>
      </div>
      <div class="ti-legend-row" style="margin-top:6px"><span class="lt">Categorias conforme a diretriz AHA/ACC 2018 de colesterol, aplicadas por convenção ao risco calculado pelo MESA Score. O CAC ajuda a refinar a decisão terapêutica em risco intermediário.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Sobre o modelo</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">Regressão de Cox derivada em 6.814 participantes do MESA (45–84 anos), desfecho "DAC dura" (IAM, PCR ressuscitada, morte por DAC ou revascularização com angina), seguimento mediano de 10,2 anos.</div>
        <div class="tfg-ref-item">A inclusão do CAC melhora significativamente a discriminação do modelo (estatística C 0,80 vs. 0,75; validado nos estudos HNR e DHS).</div>
        <div class="tfg-ref-item">Fórmula: risco (%) = [1 − S0(10)<sup>exp(Σ variável × coeficiente)</sup>] × 100, com conjuntos de coeficientes distintos para os modelos com e sem CAC.</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${MESA_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* ---- ações ---- */
function mesaSet(field,val){ const s=mesaState(); s[field]=(String(s[field])===String(val))?null:val; render(true); }
function mesaSetNum(field,val){ mesaState()[field]=val; mesaRefresh(); }
function mesaRefresh(){ const el=document.getElementById('mesa-res'); if(el) el.innerHTML=translateHTML(mesaResHTML()); }

/* registra no catálogo (CALCS de app.js) — método TC, subespecialidade Tórax */
CALCS.push({id:'mesa', modality:'tc', subspec:'torax', badge:'MS',
  title:'MESA Score',
  desc:'Risco de doença coronariana em 10 anos, com/sem escore de cálcio (McClelland 2015)'});
