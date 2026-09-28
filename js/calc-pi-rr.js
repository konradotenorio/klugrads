/* =========================================================================
   KlugRads — PI-RR (recidiva local de câncer de próstata na RM)
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Medicina Interna.
   Prostate Imaging for Recurrence Reporting (Panebianco V, et al. 2021).
   Avalia recidiva LOCAL após tratamento (prostatectomia radical OU radioterapia).
   O T2 dá a anatomia, mas NÃO define o escore. O escore final = o MAIOR entre
   DWI e DCE; se DWI e DCE forem ambos 4 → sobe para 5. Escala 1–5:
     1 muito improvável · 2 improvável · 3 equívoco · 4 provável · 5 muito provável
   Ferramenta educacional. Revelação progressiva.
   ========================================================================= */

const PIRR_TONE = {1:{c:'#1f9d55',bg:'#1f9d5522'},2:{c:'#1f9d55',bg:'#1f9d5522'},3:{c:'#d9a520',bg:'#d9a52022'},4:{c:'#e07a1f',bg:'#e07a1f22'},5:{c:'#cf2020',bg:'#cf202022'}};
const PIRR_DESC = {1:'Recidiva muito improvável',2:'Recidiva improvável',3:'Equívoco (indeterminado)',4:'Recidiva provável',5:'Recidiva muito provável'};
const PIRR_REFS = ['Panebianco V, Villeirs G, Weinreb JC, et al. Prostate Magnetic Resonance Imaging for Local Recurrence Reporting (PI-RR): International Consensus. Eur Urol Oncol. 2021.'];
const PIRR_Q = {
  setting:{label:'Cenário (tratamento prévio)', opts:[['rp','Pós-prostatectomia radical'],['rt','Pós-radioterapia']]},
  dwi:{label:'DWI — escore (1–5)', opts:[['1','1'],['2','2'],['3','3'],['4','4'],['5','5']]},
  dce:{label:'DCE — escore (1–5)', opts:[['1','1'],['2','2'],['3','3'],['4','4'],['5','5']]},
};

function pirrState(){ if(!state.pirr) state.pirr={}; return state.pirr; }
function pirrScore(s){
  if(!s.setting || s.dwi==null || s.dce==null) return null;
  const dwi=+s.dwi, dce=+s.dce;
  let f=Math.max(dwi,dce);
  if(dwi===4 && dce===4) f=5;      // ambos 4 → sobe para 5
  return f;
}
function pirrShown(s){ const sh=['setting']; if(!s.setting) return sh; sh.push('dwi','dce'); return sh; }
function pirrRow(key){
  const q=PIRR_Q[key], s=pirrState();
  const chips=q.opts.map(o=>`<div class="ti-ftog ${String(s[key])===String(o[0])?'on':''}" onclick="pirrSet('${key}','${o[0]}')">${esc(o[1])}</div>`).join('');
  return `<div class="ti-field ti-field-foci"><label>${esc(q.label)}</label><div class="ti-foci">${chips}</div></div>`;
}
function pirrResHTML(){
  const f=pirrScore(pirrState());
  if(f==null) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Responda os itens acima para obter o PI-RR.</span></div>`;
  const t=PIRR_TONE[f];
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px;align-items:flex-start">
    <div class="lv" style="color:${t.c};font-size:18px;min-width:100px">PI-RR ${f}</div>
    <div class="meta"><div class="a">${esc(PIRR_DESC[f])}</div><div class="b">Escore = maior entre DWI e DCE; DWI e DCE ambos 4 → 5. O T2 auxilia a anatomia, mas não define.</div></div>
    <div class="pts" style="background:${t.c}">${f}</div>
  </div>`;
}
function calcPiRrHTML(){
  const s=pirrState(); const rows=pirrShown(s).map(pirrRow).join('');
  const hint = s.setting==='rt'
    ? 'Pós-radioterapia: a próstata permanece; recidiva tende a restrição focal à difusão e realce precoce focal, geralmente no sítio do tumor original.'
    : (s.setting==='rp' ? 'Pós-prostatectomia: avaliar o leito cirúrgico/anastomose vesicouretral; recidiva costuma mostrar realce precoce focal (DCE) e restrição à difusão.' : '');
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Recidiva local na RM (PI-RR)</div>
      ${rows}
      ${hint?`<div class="ti-legend-row" style="margin-top:8px"><span class="lt">${esc(hint)}</span></div>`:''}
      <div id="pi-rr-res">${pirrResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Categorias PI-RR</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">1</span><span class="lt">Muito improvável</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">2</span><span class="lt">Improvável</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#d9a520">3</span><span class="lt">Equívoco</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f">4</span><span class="lt">Provável</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">5</span><span class="lt">Muito provável</span></div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referência</div>
      <div class="tfg-ref-list">${PIRR_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}
function pirrSet(field,val){ const s=pirrState(); s[field]=(String(s[field])===String(val))?null:val; render(true); }

CALCS.push({id:'pi-rr', modality:'rm', subspec:'medint', badge:'RR',
  title:'PI-RR',
  desc:'Recidiva local de câncer de próstata na RM pós-tratamento (PI-RR)'});
