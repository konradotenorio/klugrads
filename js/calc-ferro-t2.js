/* =========================================================================
   KlugRads — Quantificação de Ferro Hepático por T2* (RM, multi-eco)
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Medicina Interna.
   A partir de vários pares (TE, Sinal) editáveis, ajusta um decaimento
   exponencial S = S0·e^(−TE/T2*) por regressão linear de ln(Sinal) × TE:
        b = inclinação  →  T2* = −1/b (ms) ;  R2* = 1000 / T2* (Hz)
   Correção de campo 3,0 T → 1,5 T:  R2*(1,5T) = (R2*(3T) + 11) / 2
   LIC por calibração selecionável (fórmulas do site do Dr. Ricardo Romano —
   ricardoromano.com; Hankins corrigido para a fórmula publicada, ver abaixo):
        Garbowski: LIC = 31,94 × T2*^(−1,014)
        Henninger: LIC = 0,024 × R2* + 0,277
        Hankins:   LIC = 0,028 × R2* − 0,45   (Hankins et al. Blood 2009; o site tinha typo ×0,454)
   LIC em mg/g (peso seco); μmol/g = mg/g × 17,9. Gráfico em SVG próprio
   (dados + curva de ajuste). Layout TI-RADS/O-RADS. Ferramenta educacional.
   ========================================================================= */

const FT2_C = {
  0:{c:'#1f9d55', name:'Ausente'},
  1:{c:'#3d9970', name:'Insignificante'},
  2:{c:'#d9a520', name:'Leve'},
  3:{c:'#e07a1f', name:'Moderada'},
  4:{c:'#d9531e', name:'Moderada-grave'},
  5:{c:'#cf2020', name:'Grave'},
};

const FT2_REFS = {
  garb: 'Garbowski MW, et al. Biopsy-based calibration of T2* MR for estimation of liver iron concentration. J Cardiovasc Magn Reson. 2014;16:40.',
  henn: 'Henninger B, et al. R2*/T2* relaxometria para quantificação de ferro hepático. RoFo. 2015;187:472.',
  hank: 'Hankins JS, et al. R2* magnetic resonance imaging of the liver in patients with iron overload. Blood. 2009;113(20):4853.',
};
const FT2_REFNAME = {
  garb: 'LIC segundo Garbowski et al. (J Cardiovasc Magn Reson 2014;16:40)',
  henn: 'LIC segundo Henninger et al. (RoFo 2015;187:472)',
  hank: 'LIC segundo Hankins et al. (Blood 2009;113:4853)',
};

function ferroT2State(){
  if(!state.ferroT2) state.ferroT2={campo:'15', ref:'garb', rows:[]};
  const s = state.ferroT2;
  if(!s.campo) s.campo='15';
  if(!s.ref) s.ref='garb';
  if(!Array.isArray(s.rows) || !s.rows.length){ s.rows=[]; for(let i=0;i<6;i++) s.rows.push({te:'',sn:''}); }
  return s;
}
function ft2Num(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }
function ft2R(x,d){ const p=Math.pow(10,d==null?1:d); return Math.round(x*p)/p; }
function ft2Fmt(x){ return String(x).replace('.', ','); }
function ft2Grade(lic){
  if(lic>16) return 5;
  if(lic>8)  return 4;
  if(lic>6)  return 3;
  if(lic>4)  return 2;
  if(lic>2)  return 1;
  return 0;
}

/* Regressão linear (mínimos quadrados) — igual ao site. */
function ft2LinReg(x, y){
  const n=x.length; let sX=0,sY=0,sXY=0,sX2=0;
  for(let i=0;i<n;i++){ sX+=x[i]; sY+=y[i]; sXY+=x[i]*y[i]; sX2+=x[i]*x[i]; }
  const b=(n*sXY - sX*sY)/(n*sX2 - sX*sX);
  const a=(sY - b*sX)/n;
  const meanY=sY/n; let ssTot=0, ssRes=0;
  for(let j=0;j<n;j++){ ssTot+=(y[j]-meanY)*(y[j]-meanY); const yp=a+b*x[j]; ssRes+=(y[j]-yp)*(y[j]-yp); }
  const r2 = ssTot===0 ? 0 : 1 - ssRes/ssTot;
  return {a,b,r2};
}

/* Calcula a partir das linhas preenchidas (>=2 pares válidos). */
function ferroT2Compute(){
  const s = ferroT2State();
  const te=[], sn=[], logs=[];
  s.rows.forEach(function(r){
    const t=ft2Num(r.te), v=ft2Num(r.sn);
    if(t!=null && v!=null && v>0){ te.push(t); sn.push(v); logs.push(Math.log(v)); }
  });
  if(te.length < 2) return {nValid: te.length};
  const reg = ft2LinReg(te, logs);
  if(!(reg.b < 0) || !isFinite(reg.b)) return {nValid: te.length, te, sn, a:reg.a, b:reg.b, r2fit:reg.r2, invalid:true};
  let t2 = 1/(-reg.b);
  let r2star = 1000/t2;
  if(s.campo==='30'){ r2star=(r2star+11)/2; t2=1000/r2star; }
  let lic;
  if(s.ref==='garb') lic = 31.94*Math.pow(t2, -1.014);
  else if(s.ref==='henn') lic = 0.024*r2star + 0.277;
  else lic = Math.max(0, 0.028*r2star - 0.45);   // Hankins et al. Blood 2009: LIC = 0,028×R2* − 0,45 (corrigido; o site tinha typo ×0,454)
  return {nValid:te.length, te, sn, a:reg.a, b:reg.b, r2fit:reg.r2, t2, r2star, lic};
}

/* ---- Gráfico SVG (dados + curva de ajuste) ---- */
function ferroT2PlotSVG(te, sn, a, b){
  const W=460,H=300, mL=48,mR=14,mT=14,mB=38;
  const pw=W-mL-mR, ph=H-mT-mB;
  const xMax = Math.max.apply(null, te) || 1;
  const yMax = (Math.max.apply(null, sn) || 1) * 1.08;
  const sx = x => mL + (x/xMax)*pw;
  const sy = y => mT + ph - (y/yMax)*ph;
  // grades + rótulos
  let grid='';
  for(let i=0;i<=4;i++){
    const yv=yMax*i/4, py=sy(yv);
    grid += `<line x1="${mL}" y1="${py.toFixed(1)}" x2="${mL+pw}" y2="${py.toFixed(1)}" stroke="var(--line)" stroke-width="1"/>`;
    grid += `<text x="${mL-6}" y="${(py+3).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--dim)">${ft2R(yv,0)}</text>`;
  }
  for(let i=0;i<=4;i++){
    const xv=xMax*i/4, px=sx(xv);
    grid += `<text x="${px.toFixed(1)}" y="${(mT+ph+16).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--dim)">${ft2R(xv,1)}</text>`;
  }
  // curva de ajuste
  let path='';
  for(let i=0;i<=100;i++){
    const t=xMax*i/100, y=Math.exp(a+b*t);
    path += (i===0?'M':'L') + sx(t).toFixed(1) + ',' + sy(y).toFixed(1) + ' ';
  }
  // pontos
  const pts = te.map((x,i)=>`<circle cx="${sx(x).toFixed(1)}" cy="${sy(sn[i]).toFixed(1)}" r="4.5" fill="#f39c12"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin:4px auto 0" xmlns="http://www.w3.org/2000/svg">
    ${grid}
    <line x1="${mL}" y1="${mT}" x2="${mL}" y2="${mT+ph}" stroke="var(--dim)" stroke-width="1"/>
    <line x1="${mL}" y1="${mT+ph}" x2="${mL+pw}" y2="${mT+ph}" stroke="var(--dim)" stroke-width="1"/>
    <path d="${path}" fill="none" stroke="#4a9fd4" stroke-width="2"/>
    ${pts}
    <text x="${mL+pw/2}" y="${H-4}" text-anchor="middle" font-size="11" fill="var(--dim)">TE (ms)</text>
    <text x="12" y="${mT+ph/2}" text-anchor="middle" font-size="11" fill="var(--dim)" transform="rotate(-90 12 ${mT+ph/2})">Sinal</text>
  </svg>`;
}

/* ---- resultado (gráfico + LIC + números) ---- */
function ferroT2ResHTML(){
  const c = ferroT2Compute();
  if(c.nValid < 2) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Preencha pelo menos <b>2</b> pares (TE e Sinal) para calcular.</span></div>`;
  if(c.invalid) return `<div style="margin-top:12px">${ferroT2PlotSVG(c.te,c.sn,c.a,c.b)}<div class="ti-legend-row"><span class="lt">O sinal não decai com o TE (ajuste inválido). Confira os valores.</span></div></div>`;
  const g = FT2_C[ft2Grade(c.lic)];
  const licR = ft2R(c.lic,1), umol = ft2R(c.lic*17.9,1);
  const fitOk = c.r2fit >= 0.95;
  return `<div style="margin-top:12px">
    ${ferroT2PlotSVG(c.te, c.sn, c.a, c.b)}
    <div class="ti-res" style="background:${g.c}22;margin-top:12px">
      <div class="lv" style="color:${g.c}">${ft2Fmt(licR)}</div>
      <div class="meta">
        <div class="a">LIC · sobrecarga ${esc(g.name)}</div>
        <div class="b">${ft2Fmt(licR)} mg/g · ${ft2Fmt(umol)} μmol/g (peso seco)</div>
      </div>
      <div class="pts" style="background:${g.c}">mg/g</div>
    </div>
    <div class="ti-legend-row" style="margin-top:10px"><span class="lt">T2*: <b>${ft2Fmt(ft2R(c.t2,1))} ms</b> · R2*: <b>${ft2Fmt(ft2R(c.r2star,1))} Hz</b> · ${c.nValid} ecos</span></div>
    <div class="ti-legend-row"><span class="lt">Qualidade do ajuste (R²): <b style="color:${fitOk?'#1f9d55':'#cf2020'}">${ft2Fmt(ft2R(c.r2fit,3))}</b>${fitOk?'':' — abaixo de 0,95, revise os dados'}</span></div>
    <div class="ti-legend-row"><span class="lt">${esc(FT2_REFNAME[ferroT2State().ref])}</span></div>
  </div>`;
}

/* ---- linha editável de eco ---- */
function ferroT2RowHTML(r, i, total){
  const del = total>2 ? `<button class="ft2-del" onclick="ferroT2DelRow(${i})" aria-label="Remover eco" title="Remover">×</button>` : `<span style="width:28px"></span>`;
  return `<div class="ft2-row">
    <span class="ft2-idx">Eco ${i+1}</span>
    <div class="ti-szf ft2-in"><input type="text" inputmode="decimal" placeholder="TE" value="${esc(r.te)}" oninput="ferroT2SetCell(${i},'te',this.value)"><span>ms</span></div>
    <div class="ti-szf ft2-in"><input type="text" inputmode="decimal" placeholder="Sinal" value="${esc(r.sn)}" oninput="ferroT2SetCell(${i},'sn',this.value)"><span>u.a.</span></div>
    ${del}
  </div>`;
}

function calcFerroT2HTML(){
  const s = ferroT2State();
  const campoChip = (id,txt)=>`<div class="ti-ftog ${s.campo===id?'on':''}" onclick="ferroT2SetCampo('${id}')">${esc(txt)}</div>`;
  const refChip = (id,txt)=>`<div class="ti-ftog ${s.ref===id?'on':''}" onclick="ferroT2SetRef('${id}')">${esc(txt)}</div>`;
  const rows = s.rows.map((r,i)=>ferroT2RowHTML(r,i,s.rows.length)).join('');
  const addBtn = s.rows.length<16 ? `<div class="ti-ftog" style="margin-top:2px" onclick="ferroT2AddRow()">+ Adicionar eco</div>` : '';
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Campo magnético</div>
      <div class="ti-foci" style="margin-top:8px">${campoChip('15','1,5 T')}${campoChip('30','3,0 T')}</div>
      <div class="tfg-sec-lbl" style="margin-top:14px">Calibração de LIC</div>
      <div class="ti-foci" style="margin-top:8px">${refChip('garb','Garbowski')}${refChip('henn','Henninger')}${refChip('hank','Hankins')}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Ecos — TE e Sinal</div>
      <div class="ft2-rows" style="margin-top:8px">${rows}</div>
      ${addBtn}
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Digite o TE (ms) e o Sinal (intensidade média da ROI) de cada eco. O cálculo é automático a partir de 2 pares.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Resultado</div>
      <div id="ferrot2-res">${ferroT2ResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fórmulas</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">Ajuste: ln(Sinal) = a + b × TE (regressão linear) · T2* = −1/b (ms) · R2* = 1000 ÷ T2* (Hz)</div>
        <div class="tfg-ref-item">3,0 T → 1,5 T: R2*(1,5T) = (R2*(3T) + 11) ÷ 2</div>
        <div class="tfg-ref-item">Garbowski: LIC = 31,94 × T2*^(−1,014) · Henninger: LIC = 0,024 × R2* + 0,277 · Hankins: LIC = 0,028 × R2* − 0,45</div>
        <div class="tfg-ref-item">μmol/g = mg/g × 17,9</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Classificação da sobrecarga (LIC, mg/g)</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55"> </span><span class="lt"><b>Ausente</b> — < 2</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#3d9970"> </span><span class="lt"><b>Insignificante</b> — 2–4</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#d9a520"> </span><span class="lt"><b>Leve</b> — 4–6</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f"> </span><span class="lt"><b>Moderada</b> — 6–8</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#d9531e"> </span><span class="lt"><b>Moderada-grave</b> — 8–16</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020"> </span><span class="lt"><b>Grave</b> — > 16</span></div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">${esc(FT2_REFS.garb)}</div>
        <div class="tfg-ref-item">${esc(FT2_REFS.henn)}</div>
        <div class="tfg-ref-item">${esc(FT2_REFS.hank)}</div>
      </div>
    </div>
    <div class="disc"><b>Ferramenta educacional. Estima a concentração de ferro hepático (LIC) por ajuste do decaimento T2* em RM. As calibrações têm limites de validade; não substitui o julgamento clínico.</b></div>
  </div>`;
}

/* ---- ações ---- */
function ferroT2SetCampo(id){ ferroT2State().campo=id; render(true); }
function ferroT2SetRef(id){ ferroT2State().ref=id; render(true); }
function ferroT2AddRow(){ const s=ferroT2State(); if(s.rows.length<16){ s.rows.push({te:'',sn:''}); render(true); } }
function ferroT2DelRow(i){ const s=ferroT2State(); if(s.rows.length>2){ s.rows.splice(i,1); render(true); } }
/* Atualiza só o resultado/gráfico enquanto digita (sem recriar os campos). */
function ferroT2SetCell(i,k,v){ const s=ferroT2State(); if(s.rows[i]){ s.rows[i][k]=v; ferroT2Refresh(); } }
function ferroT2Refresh(){ const el=document.getElementById('ferrot2-res'); if(el) el.innerHTML=translateHTML(ferroT2ResHTML()); }

/* registra no catálogo (CALCS de app.js) — método RM, subespecialidade Medicina Interna */
CALCS.push({id:'ferro-t2', modality:'rm', subspec:'medint', badge:'T2*',
  title:'Ferro Hepático (T2*)',
  desc:'LIC por ajuste multi-eco T2* (regressão + curva) — 3 calibrações'});
