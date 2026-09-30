/* =========================================================================
   KlugRads — Esteatose Hepática por RM (fração de gordura)
   ---------------------------------------------------------------------------
   Método: RM (Ressonância Magnética) · Subespecialidade: Medicina Interna.
   Estima a fração lipídica hepática:
     - Dupla-eco (Dixon):  FF% = 100 × (sinal in phase − sinal out phase) / (2 × sinal in phase)
     - Fat-only:           FF% = valor informado diretamente (%)            (tem prioridade)
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

/* ---- cálculo da fração lipídica ---- */
function esteatoseCalc(s){
  // Fat-only tem PRIORIDADE e é a fração lipídica DIRETA (%): não precisa do in phase.
  const fat = (String(s.fat).trim()!=='') ? esteatoseNum(s.fat) : null;
  if(fat!=null){
    const ff = Math.round(Math.max(0, Math.min(100, fat))*10)/10;
    return {ff, metodo:'fat-only (fração lipídica direta)'};
  }
  // Dupla-eco (Dixon): FF% = 100 × (in phase − out phase) ÷ (2 × in phase) — precisa de in e out.
  const ip = esteatoseNum(s.ip);
  const op = (String(s.op).trim()!=='') ? esteatoseNum(s.op) : null;
  if(ip!=null && ip>0 && op!=null){
    const ff = Math.round((100 * (ip - op) / (2 * ip))*10)/10;
    return {ff, metodo:'dupla-eco (Dixon)'};
  }
  return null;
}
function esteatoseGrade(ff){
  if(ff < 6.5)  return 0;
  if(ff < 17.5) return 1;
  if(ff < 22.1) return 2;
  return 3;
}

/* ---- UI ---- */
function esteatoseField(k, label, ph, val, unit){
  return `<div class="ti-field">
    <label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf">
      <input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(val)}" oninput="esteatoseSet('${k}',this.value)">
      <span>${esc(unit||'u.a.')}</span>
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
      <div class="b">Fração lipídica hepática · faixa ${esc(c.range)} · cálculo por ${esc(r.metodo)}</div>
    </div>
    <div class="pts" style="background:${c.c}">${c.rom}</div>
  </div>${esteatoseFraseHTML()}`;
}

/* ---- Frase pronta para o laudo (preenchida com a fração lipídica calculada) ---- */
function esteatoseFrase(){
  const r = esteatoseCalc(esteatoseState()); if(!r) return '';
  const y = String(r.ff).replace('.', ',');
  return r.ff > 5
    ? `Fígado apresentando sinais de deposição adiposa parenquimatosa, sendo calculada porcentagem de gordura em ${y}% (normal até 5%).`
    : `Fígado sem sinais significativos de deposição adiposa parenquimatosa; porcentagem de gordura calculada em ${y}% (normal até 5%).`;
}
function esteatoseFraseHTML(){
  const f = esteatoseFrase(); if(!f) return '';
  return `<div class="lau-frase">
    <div class="lau-frase-lbl">Frase para o laudo</div>
    <div class="lau-frase-tx">${esc(f)}</div>
    <button type="button" class="lau-frase-btn" onclick="esteatoseCopyFrase()">${svgIcon(P.copy,16,{sw:2})} Copiar frase</button>
  </div>`;
}
function esteatoseCopyFrase(){ const f=esteatoseFrase(); if(f) klugCopy(f, 'Frase copiada'); }

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
        ${esteatoseField('fat','Fat-only (fração lipídica)','ex.: 12', s.fat, '%')}
      </div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">• Informe o sinal <b>in</b> e <b>out phase</b> (Dixon 2 ecos), ou apenas o <b>fat-only</b>.<br>• Se o fat-only for preenchido, ele tem prioridade no cálculo.</span></div>
      <div id="est-res">${esteatoseResultHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fórmulas</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">Dupla-eco (Dixon): FF% = 100 × (sinal in phase − sinal out phase) ÷ (2 × sinal in phase)</div>
        <div class="tfg-ref-item">Fat-only: a fração lipídica (%) é o valor informado diretamente — sem cálculo.</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Graduação da esteatose (fração lipídica)</div>
      <div class="ti-legend">${legend}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${ESTEAT_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
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
  desc:'Fração lipídica hepática por RM'});
