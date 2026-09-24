/* =========================================================================
   KlugRads — Esteatose Hepática por RM (fração de gordura)
   ---------------------------------------------------------------------------
   Método: RM (Ressonância Magnética) · Subespecialidade: Medicina Interna.
   Estima a fração de gordura hepática a partir das intensidades de sinal:
     - Dupla-eco (Dixon):  FF% = 100 × (sinal in phase − sinal out phase) / (2 × sinal in phase)
     - Fat-only:           FF% = 100 × sinal fat-only / sinal in phase       (tem prioridade)
   Graduação (Tang A et al., Radiology 2013;267(2):422–431):
     Grau 0 Normal 0–6,4% · I Leve 6,5–17,4% · II Moderada 17,5–22,0% · III Acentuada >22,1%
   Segue o layout do TI-RADS / O-RADS (classes ti-*). Ferramenta educacional.
   Fonte dos parâmetros: calculadora do Dr. Ricardo Romano (ricardoromano.com).
   ========================================================================= */

const ESTEAT_C = {
  0:{c:'#1f9d55', bg:'#1f9d5522', rom:'0',   name:'Normal',    range:'0–6,4%'},
  1:{c:'#d9a520', bg:'#d9a52022', rom:'I',   name:'Leve',      range:'6,5–17,4%'},
  2:{c:'#e07a1f', bg:'#e07a1f22', rom:'II',  name:'Moderada',  range:'17,5–22,0%'},
  3:{c:'#cf2020', bg:'#cf202022', rom:'III', name:'Acentuada', range:'>22,1%'},
};

const ESTEAT_REFS = [
  'Tang A, Tan J, Sun M, et al. Nonalcoholic Fatty Liver Disease: MR Imaging of Liver Proton Density Fat Fraction to Assess Hepatic Steatosis. Radiology. 2013;267(2):422–431.',
];

function esteatoseState(){ if(!state.esteatoseRm) state.esteatoseRm={ip:'',op:'',fat:''}; return state.esteatoseRm; }
function esteatoseNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }

/* ---- cálculo da fração de gordura ---- */
function esteatoseCalc(s){
  const ip = esteatoseNum(s.ip);
  if(ip==null || ip<=0) return null;
  const fat = (String(s.fat).trim()!=='') ? esteatoseNum(s.fat) : null;
  const op  = (String(s.op).trim()!=='')  ? esteatoseNum(s.op)  : null;
  let ff=null, metodo='';
  if(fat!=null){ ff = 100 * fat / ip; metodo='fat-only'; }
  else if(op!=null){ ff = 100 * (ip - op) / (2 * ip); metodo='dupla-eco (Dixon)'; }
  if(ff==null) return null;
  ff = Math.round(ff*10)/10;
  return {ff, metodo};
}
function esteatoseGrade(ff){
  if(ff < 6.5)  return 0;
  if(ff < 17.5) return 1;
  if(ff < 22.1) return 2;
  return 3;
}

/* ---- UI ---- */
function esteatoseField(k, label, ph, val){
  return `<div class="ti-field">
    <label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf">
      <input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(val)}" oninput="esteatoseSet('${k}',this.value)">
      <span>u.a.</span>
    </div></div>
  </div>`;
}

function esteatoseResultHTML(){
  const r = esteatoseCalc(esteatoseState());
  if(!r) return '';
  const c = ESTEAT_C[esteatoseGrade(r.ff)];
  const ffTxt = String(r.ff).replace('.', ',');
  return `<div class="ti-res" style="background:${c.bg};margin-top:14px">
    <div class="lv" style="color:${c.c}">${ffTxt}%</div>
    <div class="meta">
      <div class="a">${c.rom==='0' ? 'Grau 0 · fígado normal' : 'Grau '+c.rom+' · esteatose '+esc(c.name)}</div>
      <div class="b">Fração de gordura hepática · faixa ${esc(c.range)} · cálculo por ${esc(r.metodo)}</div>
    </div>
    <div class="pts" style="background:${c.c}">${c.rom}</div>
  </div>`;
}

function calcEsteatoseRmHTML(){
  const s = esteatoseState();
  const legend = [0,1,2,3].map(k=>{
    const c = ESTEAT_C[k];
    return `<div class="ti-legend-row"><span class="lk" style="background:${c.c}">${c.rom}</span><span class="lt">${esc(c.name)} — ${esc(c.range)}</span></div>`;
  }).join('');
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Parâmetros (intensidade de sinal)</div>
      <div class="ti-fields">
        ${esteatoseField('ip','Sinal in phase','ex.: 320', s.ip)}
        ${esteatoseField('op','Sinal out phase','ex.: 210', s.op)}
        ${esteatoseField('fat','Sinal fat-only','opcional', s.fat)}
      </div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Informe o <b>sinal in phase</b> com o <b>out phase</b> (Dixon 2 ecos), ou com o <b>fat-only</b>. Se o fat-only for preenchido, ele tem prioridade no cálculo.</span></div>
      <div id="est-res">${esteatoseResultHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fórmulas</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">Dupla-eco (Dixon): FF% = 100 × (sinal in phase − sinal out phase) ÷ (2 × sinal in phase)</div>
        <div class="tfg-ref-item">Fat-only: FF% = 100 × sinal fat-only ÷ sinal in phase</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Graduação da esteatose (fração de gordura)</div>
      <div class="ti-legend">${legend}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${ESTEAT_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional. Estima a fração de gordura hepática por RM (método de Dixon / sinal). Não substitui a quantificação por PDFF calibrada (multi-eco) nem o julgamento clínico.</b></div>
  </div>`;
}

/* Atualiza só o resultado enquanto o usuário digita (sem recriar os campos,
   para não perder o foco do input). */
function esteatoseSet(k, v){ esteatoseState()[k]=v; esteatoseRefresh(); }
function esteatoseRefresh(){
  const el = document.getElementById('est-res');
  if(el) el.innerHTML = translateHTML(esteatoseResultHTML());
}

/* registra no catálogo (CALCS de app.js) — método RM, subespecialidade Medicina Interna */
CALCS.push({id:'esteatose-rm', modality:'rm', subspec:'medint', badge:'FF',
  title:'Esteatose Hepática (RM)',
  desc:'Fração de gordura hepática por RM (Dixon) e graduação'});
