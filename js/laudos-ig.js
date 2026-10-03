/* =========================================================================
   KlugRads — Idade gestacional nos laudos obstétricos
   ---------------------------------------------------------------------------
   Quadro no topo dos laudos obstétricos (US):
     • IG informada (semanas + dias), ou
     • calculadora pela DUM, ou
     • calculadora por exame anterior (data do exame + IG naquele dia).
   A data de referência é a data do exame (padrão: hoje).
   Resultado: IG na data do exame e data provável do parto (DPP = 280 dias).
   Entra no laudo logo abaixo do título/indicação; vazio = não aparece.
   Carregar depois de laudos.js.
   ========================================================================= */

function lauIgAtivo(m){ return !!(m && /obstetric/.test(m.id)); }
function lauIgHoje(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function lauIgSt(){ const L=state.lau; if(!L.ig) L.ig={modo:'dum', dum:'', exData:'', exSem:'', exDias:'', sem:'', dias:'', data:lauIgHoje()}; return L.ig; }
function lauIgD(s){ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||''); return m ? Date.UTC(+m[1], +m[2]-1, +m[3]) : null; }
function lauIgBr(ms){ const d=new Date(ms); return String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'/'+d.getUTCFullYear(); }
const LAU_IG_DIA = 86400000;
function lauIgSD(dias){ const s=Math.floor(dias/7), d=dias%7; return `${s} semana${s===1?'':'s'}${d?` e ${d} dia${d===1?'':'s'}`:''}`; }

/* resultado: {dias, dpp, txt} ou {erro} ou null (nada preenchido) */
function lauIgCalc(){
  const g=lauIgSt(); const ref=lauIgD(g.data) ?? lauIgD(lauIgHoje());
  let dias=null, txt='';
  if(g.modo==='dum'){
    const dum=lauIgD(g.dum); if(dum==null) return null;
    dias=Math.round((ref-dum)/LAU_IG_DIA);
    txt=`<b>DUM:</b> ${lauIgBr(dum)}. <b>Idade gestacional pela DUM:</b> {IG}.`;
  } else if(g.modo==='exame'){
    const ex=lauIgD(g.exData); const s=parseInt(g.exSem,10), d=parseInt(g.exDias||'0',10);
    if(ex==null || isNaN(s)) return null;
    const base=s*7+(isNaN(d)?0:d);
    dias=base+Math.round((ref-ex)/LAU_IG_DIA);
    txt=`<b>Idade gestacional pelo exame de ${lauIgBr(ex)}</b> (${lauIgSD(base)} naquela data): {IG}.`;
  } else {
    const s=parseInt(g.sem,10), d=parseInt(g.dias||'0',10); if(isNaN(s)) return null;
    dias=s*7+(isNaN(d)?0:d);
    txt=`<b>Idade gestacional:</b> {IG}.`;
  }
  if(dias<0 || dias>44*7) return {erro:'Datas incoerentes: confira a DUM / o exame anterior e a data do exame.'};
  const dpp=ref+(280-dias)*LAU_IG_DIA;
  return {dias, dpp, html: txt.replace('{IG}', lauIgSD(dias))+` <b>Data provável do parto:</b> ${lauIgBr(dpp)}.`};
}
function lauIgDocHTML(m){ if(!lauIgAtivo(m)) return ''; const r=lauIgCalc(); return r && r.html ? r.html : ''; }

/* ---- quadro do painel ---- */
function lauIgHTML(m){
  if(!lauIgAtivo(m)) return '';
  const g=lauIgSt();
  const tab=(k,l)=>`<button type="button" class="ti-ftog ${g.modo===k?'on':''}" onclick="lauIgModo('${k}')">${l}</button>`;
  const num=(k,ph,w)=>`<input type="text" inputmode="numeric" class="lau-txt" style="width:${w||70}px" value="${esc(g[k]||'')}" placeholder="${ph}" oninput="lauIgSet('${k}',this.value)">`;
  const data=(k)=>`<input type="date" class="lau-txt" style="width:160px" value="${esc(g[k]||'')}" onchange="lauIgSet('${k}',this.value)">`;
  let campos='';
  if(g.modo==='dum') campos=`<label class="lau-ig-l">DUM ${data('dum')}</label>`;
  else if(g.modo==='exame') campos=`<label class="lau-ig-l">Data do exame anterior ${data('exData')}</label><label class="lau-ig-l">IG naquele exame ${num('exSem','sem')} ${num('exDias','dias')}</label>`;
  else campos=`<label class="lau-ig-l">IG ${num('sem','semanas',80)} ${num('dias','dias')}</label>`;
  return `<div class="lau-ig">
    <div class="lau-ig-t">Idade gestacional</div>
    <div class="lau-chips">${tab('dum','Pela DUM')}${tab('exame','Por exame anterior')}${tab('manual','Digitar IG')}</div>
    <div class="lau-ig-c">${campos}<label class="lau-ig-l">Data deste exame ${data('data')}</label></div>
    <div class="lau-ig-r" id="lau-ig-r">${lauIgResHTML()}</div>
  </div>`;
}
function lauIgResHTML(){
  const r=lauIgCalc();
  if(!r) return '<span class="lt">Preencha para incluir a IG e a DPP no laudo (em branco, não aparece).</span>';
  if(r.erro) return `<span style="color:#e11d48">${esc(r.erro)}</span>`;
  return `<span>${r.html}</span>`;
}
function lauIgAtualiza(){
  const el=document.getElementById('lau-ig-r'); if(el) el.innerHTML=lauIgResHTML();
  const L=lauCur(); if(!L) return; const m=lauModelo(L.model);
  lauPatchOpt('ig', lauIgDocHTML(m));
}
function lauIgSet(k, v){ const g=lauIgSt(); g[k]=String(v).replace(/[^\d-]/g,'').slice(0,10); if(k==='exSem'||k==='exDias'||k==='sem'||k==='dias') g[k]=g[k].replace(/-/g,'').slice(0,2); lauIgAtualiza(); }
function lauIgModo(k){ lauIgSt().modo=k; lauRenderLeft(); lauIgAtualiza(); }
