/* =========================================================================
   KlugRads — Esteatose Hepática por TC (fração de gordura / atenuação)
   ---------------------------------------------------------------------------
   Método: TC (Tomografia Computadorizada) · Subespecialidade: Medicina Interna.
   O exame é SEM contraste OU COM contraste — nunca os dois juntos. Por isso há
   um SELETOR de método no topo; só os campos/resultado do método escolhido
   aparecem (evita conflito entre os dois cálculos).

   1) SEM contraste (Pickhardt et al., 120 kV — Equação 1 de Starekova et al.):
        PDFF% = −0,58 × densidade hepática (UH) + 38,2   (limitado a 0–100)
        Graduação (Starekova J et al., Radiology 2021;301(2):250–262 — limiares de PDFF
        propostos para esteatose leve/moderada/acentuada: 5% / 15% / 25%; no artigo, equivalentes
        em TC a 120 kVp ≈ 57 / 40 / 23 UH). UH tratado como número INTEIRO (a entrada é arredondada)
        e PDFF arredondado a 0,1; faixas em UH derivadas da equação (a 23 UH → 24,9% = moderada):
        Normal <5% · Leve 5–<15% · Moderada 15–<25% · Acentuada ≥25%
        (sem numeração "grau": o artigo reserva "grau 0–3" à classificação histológica de Brunt.)
   2) COM contraste (Kim DY et al.):
        valor = (fígado − 0,3 × (0,75 × porta + 0,25 × aorta)) ÷ 0,7
        > 104 UH = ausência de esteatose · ≤ 104 UH = provável esteatose

   Segue o layout do TI-RADS / O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

/* `hu` = faixa em UH INTEIROS (TC sem contraste, 120 kVp) que a equação converte para cada faixa de
   PDFF (PDFF arredondado a 0,1) — mesma regra do cálculo; confira com o teste de varredura. */
const ESTTC_C = {
  0:{c:'#1f9d55', bg:'#1f9d5522', name:'Normal',    range:'<5%',      hu:'≥58 UH'},
  1:{c:'#d9a520', bg:'#d9a52022', name:'Leve',      range:'5–14,9%',  hu:'41–57 UH'},
  2:{c:'#e07a1f', bg:'#e07a1f22', name:'Moderada',  range:'15–24,9%', hu:'23–40 UH'},
  3:{c:'#cf2020', bg:'#cf202022', name:'Acentuada', range:'≥25%',     hu:'≤22 UH'},
};

const ESTTC_REF_STAREKOVA = 'Starekova J, Hernando D, Pickhardt PJ, Reeder SB. Quantification of Liver Fat Content with CT and MRI: State of the Art. Radiology. 2021;301(2):250–262.';
const ESTTC_REF_PICKHARDT = 'Pickhardt PJ, Graffy PM, Reeder SB, Hernando D, Li K. Quantification of Liver Fat Content with Unenhanced MDCT: Phantom and Clinical Correlation with MRI Proton Density Fat Fraction. AJR Am J Roentgenol. 2018;211(3):W151–W157.';
const ESTTC_REF_KIM = 'Kim DY, et al. Contrast-enhanced computed tomography for the diagnosis of fatty liver: prospective study with same-day biopsy used as the reference standard. Eur Radiol. 2010;20(2):359–366.';
const ESTTC_REF_MONJARDIM = 'Monjardim RF, et al. Diagnosis of Hepatic Steatosis by Contrast-Enhanced Abdominal Computed Tomography. Radiol Bras. 2013;46(3):134–138.';

function esteatoseTcState(){
  if(!state.esteatoseTc) state.esteatoseTc={metodo:'nc', nc:'', fig:'', porta:'', aorta:''};
  if(!state.esteatoseTc.metodo) state.esteatoseTc.metodo='nc';
  return state.esteatoseTc;
}
function esttcNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }

/* ---- 1) sem contraste (Pickhardt) ---- */
function esttcNcCalc(s){
  const huRaw = esttcNum(s.nc);
  if(huRaw==null) return null;
  const hu = Math.round(huRaw);   // UH sempre inteiro (sem casas decimais)
  let pdff = Math.round((-0.58*hu + 38.2)*10)/10;
  pdff = Math.max(0, Math.min(100, pdff));
  return {pdff, hu};
}
function esttcGrade(p){ if(p<5)return 0; if(p<15)return 1; if(p<25)return 2; return 3; }

/* ---- 2) com contraste (Kim) ---- */
function esttcCtCalc(s){
  const fig=esttcNum(s.fig), porta=esttcNum(s.porta), aorta=esttcNum(s.aorta);
  if(fig==null || porta==null || aorta==null) return null;
  const res = Math.round(((fig - 0.3*(0.75*porta + 0.25*aorta))/0.7)*10)/10;
  return {res, steat: res <= 104};
}

/* ---- UI ---- */
function esttcField(k, label, ph, val){
  return `<div class="ti-field">
    <label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf">
      <input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(val)}" oninput="esteatoseTcSet('${k}',this.value)">
      <span>UH</span>
    </div></div>
  </div>`;
}

function esttcNcResHTML(){
  const r = esttcNcCalc(esteatoseTcState()); if(!r) return '';
  const g = esttcGrade(r.pdff);
  const c = ESTTC_C[g];
  const txt = String(r.pdff).replace('.', ',');
  return `<div class="ti-res" style="background:${c.bg};margin-top:12px">
    <div class="lv" style="color:${c.c}">${txt}%</div>
    <div class="meta">
      <div class="a">${g===0 ? 'Fígado normal · sem esteatose' : 'Esteatose '+esc(c.name.toLowerCase())}</div>
      <div class="b">PDFF estimada · faixa ${esc(c.range)} · TC sem contraste (Pickhardt)</div>
    </div>
    <div class="pts" style="background:${c.c}">${esc(c.name)}</div>
  </div>${esttcFraseHTML('nc')}`;
}

function esttcCtResHTML(){
  const r = esttcCtCalc(esteatoseTcState()); if(!r) return '';
  const c = r.steat
    ? {c:'#e07a1f', bg:'#e07a1f22', label:'Provável esteatose'}
    : {c:'#1f9d55', bg:'#1f9d5522', label:'Ausência de esteatose'};
  const txt = String(r.res).replace('.', ',');
  return `<div class="ti-res" style="background:${c.bg};margin-top:12px">
    <div class="lv" style="color:${c.c}">${txt}</div>
    <div class="meta">
      <div class="a">${esc(c.label)}</div>
      <div class="b">Atenuação hepática corrigida (UH) · limiar 104 UH · TC com contraste (Kim)</div>
    </div>
    <div class="pts" style="background:${c.c}">UH</div>
  </div>${esttcFraseHTML('ct')}`;
}

/* ---- Frases prontas para o laudo (preenchidas com os valores calculados) ---- */
const ESTTC_GRAU_TXT = {1:'leve', 2:'moderada', 3:'acentuada'};
function esttcNcFrase(){
  const s = esteatoseTcState(); const r = esttcNcCalc(s); if(!r) return '';
  const hu = String(r.hu);
  const y  = String(r.pdff).replace('.', ',');
  const g  = esttcGrade(r.pdff);
  if(g===0) return `Fígado com densidade parenquimatosa dentro dos limites da normalidade (média de ${hu} UH), com PDFF estimado em ${y}%, sem sinais de esteatose hepática.`;
  return `Fígado apresentando redução da densidade parenquimatosa, com média de ${hu} UH (PDFF estimado em ${y}%), compatível com esteatose hepática ${ESTTC_GRAU_TXT[g]}.`;
}
function esttcCtFrase(){
  const s = esteatoseTcState(); const r = esttcCtCalc(s); if(!r) return '';
  const z = String(r.res).replace('.', ',');
  if(r.steat) return `Fígado com atenuação parenquimatosa corrigida de ${z} UH em estudo com contraste, sugestivo para esteatose hepática (limiar ≤ 104 UH).`;
  return `Fígado com atenuação parenquimatosa corrigida de ${z} UH em estudo com contraste, sem sinais de esteatose hepática (limiar > 104 UH).`;
}
function esttcFraseHTML(mode){
  const f = mode==='ct' ? esttcCtFrase() : esttcNcFrase();
  if(!f) return '';
  return `<div class="lau-frase">
    <div class="lau-frase-lbl">Frase para o laudo</div>
    <div class="lau-frase-tx">${esc(f)}</div>
    <button type="button" class="lau-frase-btn" onclick="esttcCopyFrase('${mode}')">${svgIcon(P.copy,16,{sw:2})} Copiar frase</button>
  </div>`;
}
function esttcCopyFrase(mode){
  const f = mode==='ct' ? esttcCtFrase() : esttcNcFrase();
  if(f) klugCopy(f, 'Frase copiada ✓');
}

/* Card do método SEM contraste (Pickhardt) */
function esttcNcBlockHTML(s){
  const legend = [0,1,2,3].map(k=>{
    const c = ESTTC_C[k];
    return `<div class="ti-legend-row"><span class="lk" style="background:${c.c}"> </span><span class="lt">${esc(c.name)} — ${esc(c.range)} · ${esc(c.hu)}</span></div>`;
  }).join('');
  return `<div class="ti-card">
      <div class="tfg-sec-lbl">Densidade hepática (sem contraste, 120 kV)</div>
      <div class="ti-fields">${esttcField('nc','Densidade hepática','ex.: 45', s.nc)}</div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">• Meça a atenuação média do parênquima hepático na TC <b>sem contraste</b> (UH em número inteiro).<br>• O cálculo estima a fração lipídica (PDFF).<br>• <b>Aviso técnico:</b> a TC apresenta desempenho diagnóstico limitado na esteatose leve (sensibilidade de 57% e especificidade de 88% para corte histológico de 10–20%) e é considerada inadequada para diagnóstico primário ou monitoramento da esteatose; nessas situações, a RM com quantificação de fração de gordura (PDFF) é o método de escolha.</span></div>
      <div id="est-tc-nc-res">${esttcNcResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fórmula (Pickhardt)</div>
      <div class="tfg-ref-list"><div class="tfg-ref-item">PDFF% = −0,58 × densidade hepática (UH) + 38,2</div></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Graduação (PDFF · Starekova 2021)</div>
      <div class="ti-legend">${legend}</div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">• Faixas em UH (números inteiros) derivadas da equação de conversão; válidas para aquisições a 120 kVp. No artigo, os limiares de PDFF de 5%, 15% e 25% equivalem a 57, 40 e 23 UH; a 23 UH a equação resulta em 24,9% (moderada).</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">${esc(ESTTC_REF_STAREKOVA)}</div>
        <div class="tfg-ref-item">${esc(ESTTC_REF_PICKHARDT)}</div>
      </div>
    </div>`;
}

/* Card do método COM contraste (Kim) */
function esttcCtBlockHTML(s){
  const legend = `<div class="ti-legend-row"><span class="lk" style="background:#1f9d55">&gt;104</span><span class="lt">Ausência de esteatose</span></div>
    <div class="ti-legend-row"><span class="lk" style="background:#e07a1f">≤104</span><span class="lt">Provável esteatose</span></div>`;
  return `<div class="ti-card">
      <div class="tfg-sec-lbl">Densidades (com contraste)</div>
      <div class="ti-fields">
        ${esttcField('fig','Densidade hepática','ex.: 95', s.fig)}
        ${esttcField('porta','Densidade da veia porta','ex.: 130', s.porta)}
        ${esttcField('aorta','Densidade da aorta','ex.: 140', s.aorta)}
      </div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">• Corrige a atenuação hepática pelo realce vascular.<br>• Resultado: <b>&gt; 104 UH</b> = ausência; <b>≤ 104 UH</b> = provável esteatose.<br>• <b>Observação técnica:</b> a TC sem contraste apresenta maior acurácia que a TC com contraste na estimativa da gordura hepática (R² de 0,65 vs 0,51 em relação à histologia), pois o realce iodado eleva a atenuação do parênquima e compromete a quantificação; o estudo contrastado é menos acurado na esteatose leve. Sempre que possível, preferir a aquisição sem contraste.</span></div>
      <div id="est-tc-ct-res">${esttcCtResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fórmula (Kim)</div>
      <div class="tfg-ref-list"><div class="tfg-ref-item">valor = (fígado − 0,3 × (0,75 × porta + 0,25 × aorta)) ÷ 0,7 · esteatose provável se ≤ 104 UH</div></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Interpretação</div>
      <div class="ti-legend">${legend}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">${esc(ESTTC_REF_KIM)}</div>
        <div class="tfg-ref-item">${esc(ESTTC_REF_MONJARDIM)}</div>
      </div>
    </div>`;
}

function calcEsteatoseTcHTML(){
  const s = esteatoseTcState();
  const chip = (id,txt)=>`<div class="ti-ftog ${s.metodo===id?'on':''}" onclick="esteatoseTcSetMetodo('${id}')">${esc(txt)}</div>`;
  const bloco = s.metodo==='ct' ? esttcCtBlockHTML(s) : esttcNcBlockHTML(s);
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Método do exame</div>
      <div class="ti-foci" style="margin-top:8px">${chip('nc','Sem contraste')}${chip('ct','Com contraste')}</div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">• Escolha acima o método, conforme o exame realizado.<br>• Só um método selecionado é calculado (sem conflito entre ambos).</span></div>
    </div>
    ${bloco}
  </div>`;
}

/* Troca de método = re-render (troca os campos exibidos). Preserva os valores
   digitados em cada método, mas só o método ativo é calculado/exibido. */
function esteatoseTcSetMetodo(m){ esteatoseTcState().metodo=m; render(true); }

/* Atualiza só o resultado do método ativo enquanto digita (sem recriar campos). */
function esteatoseTcSet(k, v){ esteatoseTcState()[k]=v; esteatoseTcRefresh(); }
function esteatoseTcRefresh(){
  const a = document.getElementById('est-tc-nc-res'); if(a) a.innerHTML=translateHTML(esttcNcResHTML());
  const b = document.getElementById('est-tc-ct-res'); if(b) b.innerHTML=translateHTML(esttcCtResHTML());
}

/* registra no catálogo (CALCS de app.js) — método TC, subespecialidade Medicina Interna */
CALCS.push({id:'esteatose-tc', modality:'tc', subspec:'figado', badge:'FF',
  title:'Esteatose Hepática (TC)',
  desc:'Fração lipídica hepática por TC sem e com contraste'});
