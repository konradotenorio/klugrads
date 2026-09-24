/* =========================================================================
   KlugRads — Nódulo Adrenal por RM (chemical shift)
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Medicina Interna.
   Caracteriza adenoma pela perda de sinal na fase oposta (lipídio intracelular).
   Dois métodos (fórmulas do site do Dr. Ricardo Romano — ricardoromano.com):

     Índice de Intensidade de Sinal (IIS):
        IIS% = 100 × (sinal in phase − sinal out phase) / sinal in phase
        adenoma se > 16,5% ; ≤ 16,5% indeterminado

     Razão de Sinal Adrenal:Baço (ASR):
        ASR = (Adrenal out phase / Baço out phase) ÷ (Adrenal in phase / Baço in phase)
        adenoma se < 0,71 ; ≥ 0,71 indeterminado

   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const ADRM_ADEN = {c:'#1f9d55', bg:'#1f9d5522', label:'Adenoma'};
const ADRM_IND  = {c:'#e07a1f', bg:'#e07a1f22', label:'Indeterminado'};
const ADRM_REF  = 'Nandra G, et al. Technical and Interpretive Pitfalls in Adrenal Imaging. RadioGraphics. 2020;40(4):1041–1060.';

function adrenalRmState(){ if(!state.adrenalRm) state.adrenalRm={iisIn:'',iisOut:'',adrIn:'',adrOut:'',bacoIn:'',bacoOut:''}; return state.adrenalRm; }
function adrmNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }
function adrmR(x,d){ const p=Math.pow(10,d==null?1:d); return Math.round(x*p)/p; }
function adrmFmt(x){ return String(x).replace('.', ','); }

/* ---- cálculos ---- */
function adrmIIS(s){
  const a=adrmNum(s.iisIn), b=adrmNum(s.iisOut);
  if(a==null || b==null || a===0) return null;
  return adrmR(100*(a-b)/a, 1);
}
function adrmASR(s){
  const ai=adrmNum(s.adrIn), ao=adrmNum(s.adrOut), bi=adrmNum(s.bacoIn), bo=adrmNum(s.bacoOut);
  if(ai==null||ao==null||bi==null||bo==null || ai===0 || bi===0 || bo===0) return null;
  return adrmR((ao/bo)/(ai/bi), 1);
}

/* ---- UI ---- */
function adrmField(k, label, ph, val){
  return `<div class="ti-field">
    <label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf">
      <input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(val)}" oninput="adrenalRmSet('${k}',this.value)">
      <span>u.a.</span>
    </div></div>
  </div>`;
}
function adrmIISResHTML(){
  const v = adrmIIS(adrenalRmState()); if(v==null) return '';
  const c = v>16.5 ? ADRM_ADEN : ADRM_IND;
  return `<div class="ti-res" style="background:${c.bg};margin-top:12px">
    <div class="lv" style="color:${c.c}">${adrmFmt(v)}%</div>
    <div class="meta"><div class="a">Índice de intensidade de sinal · ${c.label}</div>
      <div class="b">queda de sinal na fase oposta · limiar para adenoma: > 16,5%</div></div>
    <div class="pts" style="background:${c.c}">IIS</div>
  </div>`;
}
function adrmASRResHTML(){
  const v = adrmASR(adrenalRmState()); if(v==null) return '';
  const c = v<0.71 ? ADRM_ADEN : ADRM_IND;
  return `<div class="ti-res" style="background:${c.bg};margin-top:12px">
    <div class="lv" style="color:${c.c}">${adrmFmt(v)}</div>
    <div class="meta"><div class="a">Razão adrenal:baço · ${c.label}</div>
      <div class="b">normalizada pelo baço · limiar para adenoma: < 0,71</div></div>
    <div class="pts" style="background:${c.c}">ASR</div>
  </div>`;
}

function calcAdrenalRmHTML(){
  const s = adrenalRmState();
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Índice de intensidade de sinal (IIS)</div>
      <div class="ti-fields">
        ${adrmField('iisIn','Sinal in phase','ex.: 320', s.iisIn)}
        ${adrmField('iisOut','Sinal out phase','ex.: 180', s.iisOut)}
      </div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Intensidade de sinal do nódulo nas sequências <b>in phase</b> e <b>out phase</b>.</span></div>
      <div id="adrrm-iis-res">${adrmIISResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Razão de sinal adrenal:baço (ASR)</div>
      <div class="ti-fields">
        ${adrmField('adrIn','Adrenal — in phase','ex.: 300', s.adrIn)}
        ${adrmField('adrOut','Adrenal — out phase','ex.: 150', s.adrOut)}
        ${adrmField('bacoIn','Baço — in phase','ex.: 280', s.bacoIn)}
        ${adrmField('bacoOut','Baço — out phase','ex.: 270', s.bacoOut)}
      </div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Usa o baço como referência (o baço não perde sinal na fase oposta).</span></div>
      <div id="adrrm-asr-res">${adrmASRResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fórmulas</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">IIS% = 100 × (sinal in phase − sinal out phase) ÷ sinal in phase · adenoma se > 16,5%</div>
        <div class="tfg-ref-item">ASR = (Adrenal out phase ÷ Baço out phase) ÷ (Adrenal in phase ÷ Baço in phase) · adenoma se < 0,71</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Interpretação</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55"> </span><span class="lt"><b>Adenoma</b> — IIS > 16,5% ou ASR < 0,71 (queda de sinal na fase oposta = lipídio intracelular)</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f"> </span><span class="lt"><b>Indeterminado</b> — sem queda significativa de sinal (investigar)</span></div>
      </div>
      <div class="ti-legend-row" style="margin-top:6px"><span class="lt">Útil sobretudo em nódulos indeterminados na TC (10–20 UH). Feocromocitoma e metástase podem, raramente, conter lipídio.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referência</div>
      <div class="tfg-ref-list"><div class="tfg-ref-item">${esc(ADRM_REF)}</div></div>
    </div>
    <div class="disc"><b>Ferramenta educacional. O chemical shift caracteriza adenomas pela perda de sinal na fase oposta; nódulos indeterminados ou suspeitos exigem investigação. Não substitui o julgamento clínico.</b></div>
  </div>`;
}

/* Atualiza só os resultados enquanto digita (sem recriar os campos). */
function adrenalRmSet(k, v){ adrenalRmState()[k]=v; adrenalRmRefresh(); }
function adrenalRmRefresh(){
  const a=document.getElementById('adrrm-iis-res'); if(a) a.innerHTML=translateHTML(adrmIISResHTML());
  const b=document.getElementById('adrrm-asr-res'); if(b) b.innerHTML=translateHTML(adrmASRResHTML());
}

/* registra no catálogo (CALCS de app.js) — método RM, subespecialidade Medicina Interna */
CALCS.push({id:'adrenal-rm', modality:'rm', subspec:'medint', badge:'AD',
  title:'Nódulo Adrenal (RM)',
  desc:'Chemical shift — índice de sinal (IIS) e razão adrenal:baço (ASR)'});
