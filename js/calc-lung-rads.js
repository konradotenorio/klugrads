/* =========================================================================
   KlugRads — Lung-RADS v2022 (rastreamento de câncer de pulmão por TC-BD)
   ---------------------------------------------------------------------------
   Método: TC · Subespecialidade: Tórax.
   Categoriza nódulo pulmonar no rastreamento (TC de baixa dose) segundo o
   ACR Lung-RADS v2022 (Christensen J, et al. Radiology / JACR 2024).
   Usa o DIÂMETRO MÉDIO (média do maior e do menor eixo) em mm.
   Revelação progressiva (chips) + campos numéricos. Ferramenta educacional.

   Categorias e limiares (v2022):
   SÓLIDO   basal:  <6→2 · 6–<8→3 · 8–<15→4A · ≥15→4B
            novo:   <4→2 · 4–<6→3 · 6–<8→4A · ≥8→4B
            cresc.: <8→4A · ≥8→4B
   PARTE-SÓLIDO  basal: total<6→2 · total≥6 c/ sólido<6→3 · sólido 6–<8→4A · sólido≥8→4B
                 novo/cresc.: total<6(novo)→3 · sólido<4→4A · sólido≥4→4B
   NÃO-SÓLIDO (vidro fosco)  <30→2 · ≥30→3 (≥30 estável/lento→2)
   4X = categoria 3/4 com achados adicionais suspeitos (espiculação, linfonodo-
        megalia, metástase, GGN que dobra em ≤1 ano) → conduzir como 4B.
   Modificador S = achado clinicamente significativo não relacionado ao câncer.
   ========================================================================= */

const LR_TONE = {
  gray:  {c:'#6b7480', bg:'#6b748022'},
  low:   {c:'#1f9d55', bg:'#1f9d5522'},
  amber: {c:'#d9a520', bg:'#d9a52022'},
  orange:{c:'#e07a1f', bg:'#e07a1f22'},
  high:  {c:'#cf2020', bg:'#cf202022'},
};
const LR_INFO = {
  '0': {tone:'gray',   d:'Incompleto',                          risk:'—',     mgmt:'Comparar com exame prévio ou TC de baixa dose adicional em 1–3 meses (parte dos pulmões não avaliável ou possível infecção/inflamação).'},
  '1': {tone:'low',    d:'Negativo',                            risk:'< 1%',  mgmt:'Rastreamento anual — TC de baixa dose em 12 meses.'},
  '2': {tone:'low',    d:'Aparência ou comportamento benigno',  risk:'< 1%',  mgmt:'Rastreamento anual — TC de baixa dose em 12 meses.'},
  '3': {tone:'amber',  d:'Provavelmente benigno',               risk:'1–2%',  mgmt:'TC de baixa dose em 6 meses.'},
  '4A':{tone:'orange', d:'Suspeito',                            risk:'5–15%', mgmt:'TC de baixa dose em 3 meses; PET/TC pode ser usada se componente sólido ≥ 8 mm.'},
  '4B':{tone:'high',   d:'Muito suspeito',                      risk:'> 15%', mgmt:'TC diagnóstica (± contraste), PET/TC e/ou amostragem tecidual, conforme probabilidade e comorbidades.'},
  '4X':{tone:'high',   d:'Muito suspeito (achados adicionais)', risk:'> 15%', mgmt:'Conduzir como 4B: TC diagnóstica, PET/TC e/ou biópsia.'},
};
const LR_REFS = [
  'Christensen J, Prosper AE, Wu CC, et al. ACR Lung-RADS v2022: Assessment Categories and Management Recommendations. J Am Coll Radiol / Radiology. 2024.',
  'American College of Radiology. Lung CT Screening Reporting & Data System (Lung-RADS) v2022.',
];

const LR_Q = {
  special:{label:'Tipo de achado', opts:[
    ['comum','Nódulo a classificar'],
    ['benign','Calcificação benigna ou gordura'],
    ['juxta','Justapleural liso, < 10 mm'],
    ['cat0','Exame incompleto / infecção'],
  ]},
  comp:{label:'Composição do nódulo', opts:[
    ['solid','Sólido'],['partsolid','Parte-sólido'],['ggn','Não-sólido (vidro fosco)'],
  ]},
  growth:{label:'Comportamento', opts:[
    ['basal','Basal (1º rastreio)'],['novo','Novo'],['cresc','Crescendo'],['estavel','Estável ou lento'],
  ]},
  feat4x:{label:'Achados adicionais suspeitos? (espiculação, linfonodomegalia, metástase, GGN que dobra em ≤ 1 ano)', opts:[['nao','Não'],['sim','Sim']]},
  modS:{label:'Achado clinicamente significativo NÃO relacionado ao câncer de pulmão? (modificador S)', opts:[['nao','Não'],['sim','Sim']]},
};

function lungradsState(){ if(!state.lungrads) state.lungrads={}; return state.lungrads; }
function lrNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }

/* ---- categoria base a partir de composição + tamanho + comportamento ---- */
function lungradsCat(s){
  if(s.special==='cat0')   return '0';
  if(s.special==='benign') return '1';
  if(s.special==='juxta')  return '2';
  if(s.special!=='comum' || !s.comp || !s.growth) return null;
  const g = s.growth;
  if(s.comp==='solid'){
    const d = lrNum(s.sizeSolid); if(d==null) return null;
    if(g==='cresc') return d<8?'4A':'4B';
    if(g==='novo')  return d<4?'2': d<6?'3': d<8?'4A':'4B';
    return d<6?'2': d<8?'3': d<15?'4A':'4B';                 // basal / estável
  }
  if(s.comp==='partsolid'){
    const t = lrNum(s.sizeTotal); if(t==null) return null;
    if(g==='novo' || g==='cresc'){
      if(t<6 && g==='novo') return '3';
      const c = lrNum(s.sizeComp); if(c==null) return null;
      return c<4?'4A':'4B';
    }
    if(t<6) return '2';                                       // basal / estável
    const c = lrNum(s.sizeComp); if(c==null) return null;
    return c<6?'3': c<8?'4A':'4B';
  }
  if(s.comp==='ggn'){
    const d = lrNum(s.sizeGgn); if(d==null) return null;
    if(g==='estavel') return '2';                            // estável/lento (qualquer tamanho) → 2
    return d<30?'2':'3';
  }
  return null;
}
function lungradsResult(s){
  let cat = lungradsCat(s); if(cat==null) return null;
  if(s.feat4x==='sim' && (cat==='3'||cat==='4A'||cat==='4B')) cat='4X';
  const modS = (s.modS==='sim');
  return {cat, modS};
}

/* ---- perguntas visíveis (revelação progressiva) ---- */
function lungradsShown(s){
  const shown=['special'];
  if(s.special!=='comum') return shown;
  shown.push('comp');
  if(!s.comp) return shown;
  shown.push('__size','growth');
  if(!s.growth) return shown;
  shown.push('feat4x','modS');
  return shown;
}

/* ---- UI ---- */
function lungradsChipRow(key){
  const q=LR_Q[key], s=lungradsState();
  const chips=q.opts.map(o=>`<div class="ti-ftog ${String(s[key])===String(o[0])?'on':''}" onclick="lungradsSet('${key}','${o[0]}')">${esc(o[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>${esc(q.label)}</label><div class="ti-foci">${chips}</div></div>`;
}
function lrSizeField(k,label,ph,val){
  return `<div class="ti-field"><label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf"><input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(val==null?'':val)}" oninput="lungradsSetSize('${k}',this.value)"><span>mm</span></div></div></div>`;
}
function lungradsSizeHTML(){
  const s=lungradsState();
  if(s.comp==='solid')     return lrSizeField('sizeSolid','Diâmetro médio','ex.: 7', s.sizeSolid);
  if(s.comp==='partsolid') return lrSizeField('sizeTotal','Diâmetro médio total','ex.: 10', s.sizeTotal)+lrSizeField('sizeComp','Componente sólido (diâm. médio)','ex.: 5', s.sizeComp);
  if(s.comp==='ggn')       return lrSizeField('sizeGgn','Diâmetro médio','ex.: 20', s.sizeGgn);
  return '';
}
function lungradsResHTML(){
  const r = lungradsResult(lungradsState());
  if(!r) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Responda os itens acima para obter a categoria Lung-RADS.</span></div>`;
  const info=LR_INFO[r.cat], t=LR_TONE[info.tone];
  const label = 'Lung-RADS '+r.cat+(r.modS?'S':'');
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px;align-items:flex-start">
    <div class="lv" style="color:${t.c};font-size:19px;min-width:120px">${label}</div>
    <div class="meta"><div class="a">${esc(info.d)}${info.risk!=='—'?' · malignidade '+info.risk:''}</div><div class="b">${esc(info.mgmt)}${r.modS?' · Modificador S: achado significativo não pulmonar (não altera o seguimento do nódulo).':''}</div></div>
    <div class="pts" style="background:${t.c}">${r.cat}</div>
  </div>`;
}

function calcLungRadsHTML(){
  const s=lungradsState(); const shown=lungradsShown(s);
  let rows='';
  shown.forEach(k=>{ rows += (k==='__size') ? lungradsSizeHTML() : lungradsChipRow(k); });
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Nódulo no rastreamento (TC de baixa dose) · diâmetro médio</div>
      ${rows}
      <div id="lung-rads-res">${lungradsResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Categorias Lung-RADS v2022</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#6b7480">0</span><span class="lt">Incompleto</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">1</span><span class="lt">Negativo · &lt; 1% · anual (12 m)</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">2</span><span class="lt">Benigno · &lt; 1% · anual (12 m)</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#d9a520">3</span><span class="lt">Provavelmente benigno · 1–2% · LDCT 6 m</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f">4A</span><span class="lt">Suspeito · 5–15% · LDCT 3 m (PET/TC se sólido ≥ 8 mm)</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">4B</span><span class="lt">Muito suspeito · &gt; 15% · TC diagnóstica / PET-TC / biópsia</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">4X</span><span class="lt">Categoria 3/4 com achados adicionais suspeitos · conduzir como 4B</span></div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${LR_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* Chip = re-render (revela a próxima pergunta / recalcula). */
function lungradsSet(field,val){ const s=lungradsState(); s[field]=(String(s[field])===String(val))?null:val; render(true); }
/* Campo numérico = atualiza só o resultado (não perde o foco). */
function lungradsSetSize(field,val){ lungradsState()[field]=val; const el=document.getElementById('lung-rads-res'); if(el) el.innerHTML=translateHTML(lungradsResHTML()); }

/* registra no catálogo (CALCS de app.js) — método TC, subespecialidade Tórax */
CALCS.push({id:'lung-rads', modality:'tc', subspec:'torax', badge:'LR',
  title:'Lung-RADS v2022',
  desc:'Rastreamento de câncer de pulmão por TC de baixa dose (ACR Lung-RADS 2022)'});
