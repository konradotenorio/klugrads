/* =========================================================================
   KlugRads — Escore de Cálcio Coronário (Agatston) + CAC-DRS
   ---------------------------------------------------------------------------
   Método: TC · Subespecialidade: Tórax.
   Calcula o escore de Agatston lesão a lesão (área × fator de densidade) e
   classifica pelo CAC-DRS (Coronary Artery Calcium Data and Reporting System,
   SCCT — Hecht HS et al. J Cardiovasc Comput Tomogr 2018;12:185-191).

   Agatston (1990): só entram pixels ≥ 130 UH; lesão = área contígua ≥ 1 mm²;
   fator pelo PICO de atenuação da lesão — 130–199 UH = 1, 200–299 = 2,
   300–399 = 3, ≥ 400 = 4; escore da lesão = área (mm²) × fator; escore total
   = soma de todas as lesões de todas as artérias.

   CAC-DRS (por paciente): A0 = 0 · A1 = 1–99 · A2 = 100–299 · A3 = ≥ 300.
   Modificador N = nº de artérias com calcificação (TCE, DA, Cx, CD; N1–N4).
   Em TC de tórax SEM sincronismo cardíaco usa-se a avaliação visual global
   (V0 ausente · V1 leve · V2 moderada · V3 acentuada) no lugar do Agatston.
   Ferramenta educacional — não substitui o software da estação de trabalho.
   ========================================================================= */

const CACD_VESSELS = [
  {k:'tce', ab:'TCE', name:'Tronco da coronária esquerda'},
  {k:'da',  ab:'DA',  name:'Descendente anterior'},
  {k:'cx',  ab:'Cx',  name:'Circunflexa'},
  {k:'cd',  ab:'CD',  name:'Coronária direita'},
];
const CACD_TONE = {
  low:   {c:'#1f9d55', bg:'#1f9d5522'},
  amber: {c:'#d9a520', bg:'#d9a52022'},
  orange:{c:'#e07a1f', bg:'#e07a1f22'},
  high:  {c:'#cf2020', bg:'#cf202022'},
};
const CACD_INFO = {
  0:{tone:'low',    risk:'Muito baixo risco',
     mgmt:'Estatina geralmente não recomendada (exceto hipercolesterolemia familiar; diabetes, tabagismo ou história familiar forte podem justificar tratamento a critério clínico). Estilo de vida saudável.'},
  1:{tone:'amber',  risk:'Risco levemente aumentado',
     mgmt:'Estatina de intensidade moderada (individualizar; a favor sobretudo a partir dos 55 anos).'},
  2:{tone:'orange', risk:'Risco moderadamente aumentado',
     mgmt:'Estatina de intensidade moderada a alta + AAS 81 mg (se sem contraindicação de sangramento).'},
  3:{tone:'high',   risk:'Risco moderado a gravemente aumentado',
     mgmt:'Estatina de alta intensidade + AAS 81 mg (se sem contraindicação de sangramento).'},
};
const CACD_VIS = [
  ['0','V0 — Ausente'], ['1','V1 — Leve'], ['2','V2 — Moderada'], ['3','V3 — Acentuada'],
];
const CACD_VIS_TXT = {1:'leve', 2:'moderado', 3:'acentuado'};
const CACD_MODES = [
  ['lesoes','Por lesões (área × densidade)'],
  ['vasos','Escore por artéria'],
  ['visual','Visual (TC de tórax sem gatilho)'],
];
const CACD_REFS = [
  'Agatston AS, Janowitz WR, Hildner FJ, et al. Quantification of coronary artery calcium using ultrafast computed tomography. J Am Coll Cardiol. 1990;15(4):827-832.',
  'Hecht HS, Blaha MJ, Kazerooni EA, et al. CAC-DRS: Coronary Artery Calcium Data and Reporting System. An expert consensus document of the Society of Cardiovascular Computed Tomography (SCCT). J Cardiovasc Comput Tomogr. 2018;12(3):185-191.',
  'Hecht HS, Cronin P, Blaha MJ, et al. 2016 SCCT/STR guidelines for coronary artery calcium scoring of noncontrast noncardiac chest CT scans. J Cardiovasc Comput Tomogr. 2017;11(1):74-84.',
  'Coronary artery calcium scoring in 2026: strengths, limitations, and optimized clinical use. Front Radiol. 2026. doi:10.3389/fradi.2026.1822303.',
];

function cacdState(){
  if(!state.cacDrs) state.cacDrs = {mode:'lesoes', zero:false, vis:null, visN:null,
    les:{tce:[], da:[], cx:[], cd:[]}, vas:{tce:'', da:'', cx:'', cd:''}};
  return state.cacDrs;
}
function cacdNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }
function cacdR1(x){ return Math.round(x*10)/10; }
function cacdFmt(x){ return String(cacdR1(x)).replace('.', ','); }
function cacdFactor(hu){ if(hu>=400) return 4; if(hu>=300) return 3; if(hu>=200) return 2; if(hu>=130) return 1; return 0; }
function cacdCat(total){ if(total<=0) return 0; if(total<100) return 1; if(total<300) return 2; return 3; }

/* lesão → {ok, f, score}; null se algum campo estiver vazio/inválido */
function cacdLesion(l){
  const a=cacdNum(l.a), hu=cacdNum(l.hu);
  if(a==null || hu==null || a<0) return null;
  const f = cacdFactor(hu);
  const ok = a>=1 && f>0;
  return {ok, f, score: ok ? a*f : 0, a, hu};
}
function cacdLesionTxt(l){
  const r = cacdLesion(l);
  if(!r) return '—';
  if(!r.ok) return 'não pontua';
  return `× ${r.f} = ${cacdFmt(r.score)}`;
}

/* Calcula tudo; devolve null (nada informado) | {invalid} | resultado */
function cacdCompute(s){
  if(s.mode==='visual'){
    if(s.vis==null) return null;
    const v = parseInt(s.vis,10);
    const n = v>0 && s.visN ? parseInt(s.visN,10) : null;
    return {kind:'V', v, n, cat:v, code:'CAC-DRS V'+v+(n?'/N'+n:'')};
  }
  const per = {}; let any = false, invalid = false;
  if(s.mode==='lesoes'){
    CACD_VESSELS.forEach(function(v){
      let t = 0;
      s.les[v.k].forEach(function(l){ const r=cacdLesion(l); if(r){ any=true; t+=r.score; } });
      per[v.k] = cacdR1(t);
    });
    if(!any && s.zero){ any=true; }
  } else {
    CACD_VESSELS.forEach(function(v){
      const txt = String(s.vas[v.k]==null?'':s.vas[v.k]).trim();
      if(txt===''){ per[v.k]=0; return; }
      any = true;
      const n = cacdNum(txt);
      if(n==null || n<0) invalid = true; else per[v.k] = n;
    });
  }
  if(invalid) return {invalid:true};
  if(!any) return null;
  let total = 0, n = 0;
  CACD_VESSELS.forEach(function(v){ total += per[v.k]; if(per[v.k]>0) n++; });
  total = cacdR1(total);
  const cat = cacdCat(total);
  return {kind:'A', per, total, n, cat, code:'CAC-DRS A'+cat+(cat>0?'/N'+n:'')};
}

/* ---- Frase pronta para o laudo ---- */
function cacdFrase(){
  const r = cacdCompute(cacdState());
  if(!r || r.invalid) return '';
  const info = CACD_INFO[r.cat];
  if(r.kind==='V'){
    if(r.v===0) return 'Ausência de calcificações coronarianas à avaliação visual (tomografia sem sincronismo cardíaco), CAC-DRS V0.';
    return `Calcificações coronarianas de grau ${CACD_VIS_TXT[r.v]} à avaliação visual (tomografia sem sincronismo cardíaco)${r.n?', acometendo '+r.n+(r.n>1?' artérias':' artéria'):''}, correspondendo a ${r.code} (${info.risk.toLowerCase()}).`;
  }
  if(r.cat===0) return 'Ausência de calcificações coronarianas (escore de cálcio de Agatston = 0), CAC-DRS A0 (muito baixo risco).';
  const arts = CACD_VESSELS.filter(v=>r.per[v.k]>0).map(v=>`${v.ab}: ${cacdFmt(r.per[v.k])}`).join('; ');
  return `Calcificações coronarianas com escore de cálcio (Agatston) total de ${cacdFmt(r.total)}, acometendo ${r.n} ${r.n>1?'artérias':'artéria'} (${arts}), correspondendo a ${r.code} (${info.risk.toLowerCase()}).`;
}
function cacdCopyFrase(){ const f=cacdFrase(); if(f) klugCopy(f, 'Frase copiada ✓'); }

/* ---- Resultado ---- */
function cacdResHTML(){
  const s = cacdState(); const r = cacdCompute(s);
  const aviso = t => `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">${t}</span></div>`;
  if(!r){
    if(s.mode==='lesoes') return aviso('Adicione as lesões (área em mm² e pico de atenuação em UH) nas artérias acometidas — ou marque “Sem calcificações” se o escore for zero.');
    if(s.mode==='vasos')  return aviso('Informe o escore de Agatston de cada artéria (use 0 quando não houver calcificação).');
    return aviso('Selecione o grau visual de calcificação coronariana.');
  }
  if(r.invalid) return aviso('<b>Valor inválido:</b> informe números maiores ou iguais a zero.');

  const info = CACD_INFO[r.cat], t = CACD_TONE[info.tone];
  let sub = '';
  if(r.kind==='A'){
    const arts = CACD_VESSELS.map(v=>`${v.ab} ${cacdFmt(r.per[v.k])}`).join(' · ');
    sub = `Escore de Agatston total: ${cacdFmt(r.total)}${r.cat>0?' — '+r.n+(r.n>1?' artérias':' artéria')+' acometida'+(r.n>1?'s':''):''}<br>${arts}`;
  } else {
    sub = `Avaliação visual global${r.n?' — '+r.n+(r.n>1?' artérias':' artéria')+' acometida'+(r.n>1?'s':''):''}`;
  }
  let out = `<div class="ti-res" style="background:${t.bg};margin-top:12px;align-items:flex-start;flex-wrap:wrap">
    <div class="lv" style="color:${t.c};font-size:16px;min-width:136px">${esc(r.code)}</div>
    <div class="meta" style="flex:1 1 190px"><div class="a">${esc(info.risk)}</div><div class="b">${sub}</div><div class="b">${esc(info.mgmt)}</div></div>
  </div>`;
  if(r.kind==='A' && r.total>=1000){
    out += `<div class="ti-res" style="background:${CACD_TONE.high.bg};align-items:flex-start;flex-wrap:wrap">
      <div class="lv" style="color:${CACD_TONE.high.c};font-size:14px;min-width:136px">CAC ≥ 1.000</div>
      <div class="meta" style="flex:1 1 190px"><div class="b">Fenótipo de risco muito alto: considerar meta de LDL-c mais agressiva e terapia hipolipemiante adicional, a critério clínico.</div></div>
    </div>`;
  }
  const f = cacdFrase();
  if(f) out += `<div class="lau-frase">
    <div class="lau-frase-lbl">Frase para o laudo</div>
    <div class="lau-frase-tx">${esc(f)}</div>
    <button type="button" class="lau-frase-btn" onclick="cacdCopyFrase()">${svgIcon(P.copy,16,{sw:2})} Copiar frase</button>
  </div>`;
  if(r.kind==='A' && r.total>0) out += `<div class="ti-legend-row" style="margin-top:10px"><span class="lt">O escore absoluto não considera idade, sexo e raça. Para saber se está acima do esperado (percentil ≥ 75 reforça o risco):</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
      <button type="button" class="ti-ftog" onclick="cacdOpenMesa('mesa-cac')">Percentil (MESA CAC)</button>
      <button type="button" class="ti-ftog" onclick="cacdOpenMesa('mesa')">Risco em 10 anos (MESA Score)</button>
    </div>`;
  return out;
}

/* ---- UI ---- */
function cacdModeRow(s){
  const chips = CACD_MODES.map(m=>`<div class="ti-ftog ${s.mode===m[0]?'on':''}" onclick="cacdSetMode('${m[0]}')">${esc(m[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>Como informar o escore</label><div class="ti-foci">${chips}</div></div>`;
}
function cacdLesionRows(v, s){
  return s.les[v.k].map(function(l,i){
    return `<div class="cac-lrow">
      <div class="ti-szf"><input type="text" inputmode="decimal" placeholder="área" value="${esc(l.a)}" oninput="cacdSetLes('${v.k}',${i},'a',this.value)"><span>mm²</span></div>
      <div class="ti-szf"><input type="text" inputmode="decimal" placeholder="pico" value="${esc(l.hu)}" oninput="cacdSetLes('${v.k}',${i},'hu',this.value)"><span>UH</span></div>
      <span class="cac-lsc" id="cacd-ls-${v.k}-${i}">${esc(cacdLesionTxt(l))}</span>
      <button type="button" class="cac-x" aria-label="Remover lesão" onclick="cacdRemLes('${v.k}',${i})">×</button>
    </div>`;
  }).join('');
}
function cacdLesoesHTML(s){
  const zero = `<div class="ti-field ti-field-foci"><label>Sem calcificações coronarianas</label><div class="ti-foci"><div class="ti-ftog ${s.zero?'on':''}" onclick="cacdToggleZero()">Escore = 0</div></div></div>`;
  const vessels = CACD_VESSELS.map(function(v){
    const tot = cacdVesselTotal(s, v.k);
    return `<div class="cac-vessel">
      <div class="cac-vh"><b>${esc(v.ab)}</b> <span>${esc(v.name)}</span><span class="cac-vt" id="cacd-vt-${v.k}">${tot>0?cacdFmt(tot):''}</span></div>
      ${cacdLesionRows(v, s)}
      <button type="button" class="cac-add" onclick="cacdAddLes('${v.k}')">+ Adicionar lesão</button>
    </div>`;
  }).join('');
  return zero + vessels;
}
function cacdVesselTotal(s, k){
  let t=0; s.les[k].forEach(function(l){ const r=cacdLesion(l); if(r) t+=r.score; }); return cacdR1(t);
}
function cacdVasosHTML(s){
  return CACD_VESSELS.map(function(v){
    return `<div class="ti-field"><label>${esc(v.ab)} — ${esc(v.name)}</label>
      <div class="ti-szwrap"><div class="ti-szf"><input type="text" inputmode="decimal" placeholder="0" value="${esc(s.vas[v.k])}" oninput="cacdSetVas('${v.k}',this.value)"><span>pontos</span></div></div></div>`;
  }).join('');
}
function cacdVisualHTML(s){
  const chips = CACD_VIS.map(o=>`<div class="ti-ftog ${String(s.vis)===o[0]?'on':''}" onclick="cacdSetVis('${o[0]}')">${esc(o[1])}</div>`).join('');
  let out = `<div class="ti-field ti-field-foci"><label>Grau global de calcificação coronariana</label><div class="ti-foci">${chips}</div></div>`;
  if(s.vis!=null && s.vis!=='0'){
    const ns = ['1','2','3','4'].map(n=>`<div class="ti-ftog ${String(s.visN)===n?'on':''}" onclick="cacdSetVisN('${n}')">N${n}</div>`).join('');
    out += `<div class="ti-field ti-field-foci"><label>Artérias com calcificação (TCE, DA, Cx, CD) — opcional</label><div class="ti-foci">${ns}</div></div>`;
  }
  return out;
}

function calcCacDrsHTML(){
  const s = cacdState();
  const body = s.mode==='lesoes' ? cacdLesoesHTML(s) : s.mode==='vasos' ? cacdVasosHTML(s) : cacdVisualHTML(s);
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Escore de cálcio coronário (TC sem contraste)</div>
      ${cacdModeRow(s)}
      ${body}
      <div id="cacd-res">${cacdResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Como funciona</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item"><b>Agatston:</b> só entram pixels ≥ 130 UH; lesão = área contígua ≥ 1 mm². Fator pelo <b>pico</b> de atenuação da lesão: 130–199 UH = 1 · 200–299 = 2 · 300–399 = 3 · ≥ 400 = 4. Escore da lesão = área × fator; escore total = soma de todas as lesões. Padrão: cortes de 3 mm com sincronismo cardíaco, 120 kVp. O ramo intermédio e a artéria descendente posterior entram na artéria do seu território.</div>
        <div class="tfg-ref-item"><b>CAC-DRS:</b> A0 = 0 · A1 = 1–99 · A2 = 100–299 · A3 = ≥ 300 (a publicação grafa “&gt; 300”; aqui 300 conta como A3). <b>N</b> = número de artérias com calcificação (N1–N4: TCE, DA, Cx, CD). Ex.: <b>CAC-DRS A2/N2</b>.</div>
        <div class="tfg-ref-item"><b>V (visual):</b> em TC de tórax <u>sem</u> sincronismo cardíaco, o CAC-DRS usa o grau global — nenhum, leve, moderado ou acentuado (V0–V3) — no lugar do Agatston. Não se aplica a exames com sincronismo.</div>
        <div class="tfg-ref-item">As condutas seguem o consenso SCCT 2018 (opinião de especialistas), pensadas para adultos assintomáticos, em geral de 40–75 anos e risco intermediário. A decisão terapêutica é do médico assistente — o uso de AAS em prevenção primária deve pesar o risco de sangramento.</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${CACD_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* ---- ações ---- */
function cacdRefresh(){ const el=document.getElementById('cacd-res'); if(el) el.innerHTML=translateHTML(cacdResHTML()); }
function cacdSetMode(m){ cacdState().mode=m; render(true); }
function cacdToggleZero(){ const s=cacdState(); s.zero=!s.zero; render(true); }
function cacdAddLes(k){ const s=cacdState(); s.les[k].push({a:'', hu:''}); s.zero=false; render(true); }
function cacdRemLes(k,i){ cacdState().les[k].splice(i,1); render(true); }
function cacdSetLes(k,i,f,val){
  const s=cacdState(); const l=s.les[k][i]; if(!l) return;
  l[f]=val;
  const sc=document.getElementById(`cacd-ls-${k}-${i}`); if(sc) sc.textContent=cacdLesionTxt(l);
  const vt=document.getElementById('cacd-vt-'+k); if(vt){ const t=cacdVesselTotal(s,k); vt.textContent = t>0?cacdFmt(t):''; }
  cacdRefresh();
}
function cacdSetVas(k,val){ cacdState().vas[k]=val; cacdRefresh(); }
function cacdSetVis(v){ const s=cacdState(); s.vis=(String(s.vis)===String(v))?null:v; if(s.vis==null||s.vis==='0') s.visN=null; render(true); }
function cacdSetVisN(n){ const s=cacdState(); s.visN=(String(s.visN)===String(n))?null:n; render(true); }
/* leva o escore para MESA CAC (percentil) ou MESA Score (risco em 10 anos) */
function cacdOpenMesa(id){
  const r = cacdCompute(cacdState());
  if(r && r.kind==='A'){
    const txt = String(r.total).replace('.', ',');
    if(id==='mesa-cac' && typeof mesaCacState==='function') mesaCacState().cac = txt;
    if(id==='mesa' && typeof mesaState==='function') mesaState().cac = txt;
  }
  openFavCalc(id);
}

/* registra no catálogo (CALCS de app.js) — método TC, subespecialidade Tórax */
CALCS.push({id:'cac-drs', modality:'tc', subspec:'torax', badge:'AG',
  title:'Escore de Cálcio (Agatston + CAC-DRS)',
  desc:'Escore de Agatston lesão a lesão e classificação CAC-DRS (A0–A3, N1–N4; visual V0–V3) — SCCT 2018'});
