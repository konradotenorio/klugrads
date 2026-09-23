/* =========================================================================
   KlugRads — Esteatose Hepática por TC (fração de gordura / atenuação)
   ---------------------------------------------------------------------------
   Método: TC (Tomografia Computadorizada) · Subespecialidade: Medicina Interna.
   O exame é SEM contraste OU COM contraste — nunca os dois juntos. Por isso há
   um SELETOR de método no topo; só os campos/resultado do método escolhido
   aparecem (evita conflito entre os dois cálculos).

   1) SEM contraste (Pickhardt et al., 120 kV):
        PDFF% = −0,58 × densidade hepática (UH) + 38,2   (limitado a 0–100)
        Graduação: 0 Normal <6,5% · I Leve 6,5–17,4% · II Moderada 17,5–22,0% · III Acentuada ≥22,1%
   2) COM contraste (Kim DY et al.):
        valor = (fígado − 0,3 × (0,75 × porta + 0,25 × aorta)) ÷ 0,7
        > 104 UH = ausência de esteatose · ≤ 104 UH = provável esteatose

   Segue o layout do TI-RADS / O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const ESTTC_C = {
  0:{c:'#1f9d55', bg:'#1f9d5522', rom:'0',   name:'Normal',    range:'0–6,4%'},
  1:{c:'#d9a520', bg:'#d9a52022', rom:'I',   name:'Leve',      range:'6,5–17,4%'},
  2:{c:'#e07a1f', bg:'#e07a1f22', rom:'II',  name:'Moderada',  range:'17,5–22,0%'},
  3:{c:'#cf2020', bg:'#cf202022', rom:'III', name:'Acentuada', range:'>22,1%'},
};

const ESTTC_REF_PICKHARDT = 'Pickhardt PJ, et al. Quantification of Liver Fat Content with Non-contrast MDCT: Phantom and Clinical Correlation with MRI Proton Density Fat Fraction. AJR Am J Roentgenol. 2018;211(3):W151–W157.';
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
  const hu = esttcNum(s.nc);
  if(hu==null) return null;
  let pdff = Math.round((-0.58*hu + 38.2)*10)/10;
  pdff = Math.max(0, Math.min(100, pdff));
  return {pdff};
}
function esttcGrade(p){ if(p<6.5)return 0; if(p<17.5)return 1; if(p<22.1)return 2; return 3; }

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
  const c = ESTTC_C[esttcGrade(r.pdff)];
  const txt = String(r.pdff).replace('.', ',');
  return `<div class="ti-res" style="background:${c.bg};margin-top:12px">
    <div class="lv" style="color:${c.c}">${txt}%</div>
    <div class="meta">
      <div class="a">${c.rom==='0' ? 'Grau 0 · fígado normal' : 'Grau '+c.rom+' · esteatose '+esc(c.name)}</div>
      <div class="b">PDFF estimada · faixa ${esc(c.range)} · TC sem contraste (Pickhardt)</div>
    </div>
    <div class="pts" style="background:${c.c}">${c.rom}</div>
  </div>`;
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
  </div>`;
}

/* Card do método SEM contraste (Pickhardt) */
function esttcNcBlockHTML(s){
  const legend = [0,1,2,3].map(k=>{
    const c = ESTTC_C[k];
    return `<div class="ti-legend-row"><span class="lk" style="background:${c.c}">${c.rom}</span><span class="lt">${esc(c.name)} — ${esc(c.range)}</span></div>`;
  }).join('');
  return `<div class="ti-card">
      <div class="tfg-sec-lbl">Densidade hepática (sem contraste, 120 kV)</div>
      <div class="ti-fields">${esttcField('nc','Densidade hepática','ex.: 45', s.nc)}</div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Meça a atenuação do parênquima hepático na TC <b>sem contraste</b>. Estima a fração de gordura (PDFF).</span></div>
      <div id="est-tc-nc-res">${esttcNcResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fórmula (Pickhardt)</div>
      <div class="tfg-ref-list"><div class="tfg-ref-item">PDFF% = −0,58 × densidade hepática (UH) + 38,2</div></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Graduação (PDFF)</div>
      <div class="ti-legend">${legend}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referência</div>
      <div class="tfg-ref-list"><div class="tfg-ref-item">${esc(ESTTC_REF_PICKHARDT)}</div></div>
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
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Corrige a atenuação hepática pelo realce vascular. Resultado <b>&gt; 104 UH</b> = ausência; <b>≤ 104 UH</b> = provável esteatose.</span></div>
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
      <div class="ti-foci" style="margin-top:8px">${chip('nc','Sem contraste (Pickhardt)')}${chip('ct','Com contraste (Kim)')}</div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Escolha conforme o exame realizado. Só o método selecionado é calculado — sem conflito entre os dois.</span></div>
    </div>
    ${bloco}
    <div class="disc"><b>Ferramenta educacional. Estima a esteatose hepática por TC (atenuação em UH). Não substitui a quantificação por PDFF por RM nem o julgamento clínico.</b></div>
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
CALCS.push({id:'esteatose-tc', modality:'tc', subspec:'medint', badge:'FF',
  title:'Esteatose Hepática (TC)',
  desc:'Fração de gordura / atenuação hepática por TC (Pickhardt e Kim)'});
