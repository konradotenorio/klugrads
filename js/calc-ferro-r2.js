/* =========================================================================
   KlugRads — Quantificação de Ferro Hepático por R2* (RM)
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Medicina Interna.
   Seletor de campo magnético (1,5 T / 3,0 T). A partir do R2* hepático (s⁻¹),
   calcula T2* e a concentração de ferro (LIC) por duas calibrações:

   1,5 T:  T2* = 1000 / R2*
           LIC(Garbowski) = 31,94 × T2*^(−1,014)
           LIC(Reeder)    = 0,04 + 0,0262 × R2*
   3,0 T:  R2*(1,5T eq) = (R2* + 11) / 2 ;  T2*(1,5T) = 1000 / R2*(1,5T eq)
           LIC(Garbowski) = 31,94 × T2*(1,5T)^(−1,014)
           LIC(Reeder)    = 0,0141 × R2*
   LIC em mg/g (peso seco); μmol/g = mg/g × 17,9.

   Fonte dos parâmetros: calculadora do Dr. Ricardo Romano (ricardoromano.com).
   Segue o layout do TI-RADS / O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const FERRO_C = {
  0:{c:'#1f9d55', name:'Ausente',        range:'< 2'},
  1:{c:'#3d9970', name:'Insignificante', range:'2–4'},
  2:{c:'#d9a520', name:'Leve',           range:'4–6'},
  3:{c:'#e07a1f', name:'Moderada',       range:'6–8'},
  4:{c:'#d9531e', name:'Moderada-grave', range:'8–16'},
  5:{c:'#cf2020', name:'Grave',          range:'> 16'},
};

const FERRO_REFS = [
  'Henninger B, Alustiza J, Garbowski M, Gandon Y. Practical guide to quantification of hepatic iron with MRI. Eur Radiol. 2020;30(1):383–393.',
  'Hernando D, Reeder SB, et al. Complex confounder-corrected R2* mapping for liver iron quantification with MRI. Eur Radiol. 2021;31(1):264–275.',
  'Garbowski MW, et al. Biopsy-based calibration of T2* magnetic resonance for estimation of liver iron concentration and comparison with R2 Ferriscan. J Cardiovasc Magn Reson. 2014;16:40.',
];

function ferroR2State(){
  if(!state.ferroR2) state.ferroR2={campo:'15', r2:''};
  if(!state.ferroR2.campo) state.ferroR2.campo='15';
  return state.ferroR2;
}
function ferroNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }
function ferroR(x){ return Math.round(x*10)/10; }          // arredonda a 1 casa (igual ao site)
function ferroFmt(x){ return String(x).replace('.', ','); } // exibe com vírgula
function ferroGrade(lic){
  if(lic < 2)  return 0;
  if(lic < 4)  return 1;
  if(lic < 6)  return 2;
  if(lic < 8)  return 3;
  if(lic <= 16) return 4;
  return 5;
}

/* ---- UI ---- */
function ferroField(s){
  return `<div class="ti-field">
    <label>R2* hepático</label>
    <div class="ti-szwrap"><div class="ti-szf">
      <input type="text" inputmode="decimal" placeholder="ex.: 100" value="${esc(s.r2)}" oninput="ferroSet(this.value)">
      <span>s⁻¹</span>
    </div></div>
  </div>`;
}

function ferroLicResHTML(titulo, lic){
  const g = FERRO_C[ferroGrade(lic)];
  const umol = ferroR(lic*17.9);
  return `<div class="ti-res" style="background:${g.c}22;margin-top:10px">
    <div class="lv" style="color:${g.c}">${ferroFmt(lic)}</div>
    <div class="meta">
      <div class="a">${esc(titulo)} · sobrecarga ${esc(g.name)}</div>
      <div class="b">${ferroFmt(lic)} mg/g · ${ferroFmt(umol)} μmol/g (peso seco)</div>
    </div>
    <div class="pts" style="background:${g.c}">mg/g</div>
  </div>`;
}

function ferroResHTML(){
  const s = ferroR2State();
  const v = ferroNum(s.r2);
  if(v==null || v<=0) return '';
  let info='', licG, licR;
  if(s.campo==='30'){
    const tRaw  = ferroR(1000/v);
    const rCorr = (v+11)/2;
    const tCorr = ferroR(1000/rCorr);
    licG = ferroR(31.94*Math.pow(tCorr, -1.014));
    licR = ferroR(0.0141*v);
    info = `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">T2* (3,0 T): <b>${ferroFmt(tRaw)} ms</b> · R2* equivalente a 1,5 T: <b>${ferroFmt(ferroR(rCorr))} s⁻¹</b> · T2* (1,5 T): <b>${ferroFmt(tCorr)} ms</b></span></div>`;
  } else {
    const t = ferroR(1000/v);
    licG = ferroR(31.94*Math.pow(t, -1.014));
    licR = ferroR(0.04 + 0.0262*v);
    info = `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">T2* (1,5 T): <b>${ferroFmt(t)} ms</b></span></div>`;
  }
  return `${info}${ferroLicResHTML('LIC (Garbowski)', licG)}${ferroLicResHTML('LIC (Reeder)', licR)}`;
}

function calcFerroR2HTML(){
  const s = ferroR2State();
  const chip = (id,txt)=>`<div class="ti-ftog ${s.campo===id?'on':''}" onclick="ferroSetCampo('${id}')">${esc(txt)}</div>`;
  const legend = [0,1,2,3,4,5].map(k=>{
    const g = FERRO_C[k];
    return `<div class="ti-legend-row"><span class="lk" style="background:${g.c}"> </span><span class="lt"><b>${esc(g.name)}</b> — LIC ${esc(g.range)} mg/g</span></div>`;
  }).join('');
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Campo magnético</div>
      <div class="ti-foci" style="margin-top:8px">${chip('15','1,5 T')}${chip('30','3,0 T')}</div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Selecione o campo do exame. Só o campo escolhido é calculado.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">R2* hepático (${s.campo==='30'?'3,0 T':'1,5 T'})</div>
      <div class="ti-fields">${ferroField(s)}</div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Informe o R2* medido no mapa hepático, em s⁻¹. São mostradas duas calibrações de LIC (Garbowski e Reeder).</span></div>
      <div id="ferro-res">${ferroResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fórmulas</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">T2* (ms) = 1000 ÷ R2* (s⁻¹)</div>
        <div class="tfg-ref-item">LIC (Garbowski) = 31,94 × T2*^(−1,014)</div>
        <div class="tfg-ref-item">LIC (Reeder) — 1,5 T: 0,04 + 0,0262 × R2* · 3,0 T: 0,0141 × R2*</div>
        <div class="tfg-ref-item">3,0 T → 1,5 T: R2*(1,5T) = (R2*(3T) + 11) ÷ 2 · μmol/g = mg/g × 17,9</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Classificação da sobrecarga (LIC, peso seco)</div>
      <div class="ti-legend">${legend}</div>
      <div class="ti-legend-row" style="margin-top:6px"><span class="lt">A conduta depende da causa (hemocromatose hereditária, causa hematológica) e do perfil clínico.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${FERRO_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional. Estima a concentração de ferro hepático (LIC) a partir do R2* por RM. As calibrações têm limites de validade; não substitui o julgamento clínico.</b></div>
  </div>`;
}

/* Troca de campo = re-render (recalcula com a fórmula do campo). */
function ferroSetCampo(id){ ferroR2State().campo=id; render(true); }
/* Atualiza só o resultado enquanto digita (sem recriar o campo). */
function ferroSet(v){ ferroR2State().r2=v; ferroRefresh(); }
function ferroRefresh(){ const el=document.getElementById('ferro-res'); if(el) el.innerHTML=translateHTML(ferroResHTML()); }

/* registra no catálogo (CALCS de app.js) — método RM, subespecialidade Medicina Interna */
CALCS.push({id:'ferro-r2', modality:'rm', subspec:'medint', badge:'Fe',
  title:'Ferro Hepático (R2*)',
  desc:'Quantificação de ferro (LIC) por R2* — 1,5 T e 3,0 T'});
