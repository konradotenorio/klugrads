/* =========================================================================
   KlugRads — Prova de Boyden (fração de ejeção da vesícula biliar)
   ---------------------------------------------------------------------------
   Método: US · Especialidade: Abdome (Medicina Interna).
   FE (%) = (VA − VB) / VA × 100
     VA = volume da vesícula em jejum; VB = volume após o estímulo (refeição gordurosa).
   Volume por medidas: elipsoide = C × AP × T × 0,523 (cm³ = mL).
   Interpretação: < 35% hipocinesia biliar · 35–90% normal · > 90% hipercinesia biliar.
   O botão "Levar para a máscara" abre o laudo "Abdome Superior com Boyden" já com
   o tempo e o esvaziamento preenchidos (no texto da vesícula e na conclusão).
   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */
(function(){
'use strict';

const MASK = 'us-abdome-superior-com-boyden';
const TONE = {
  hipo:  {c:'#e07a1f', bg:'#e07a1f22', tag:'Hipocinesia'},
  norm:  {c:'#1f9d55', bg:'#1f9d5522', tag:'Normal'},
  hiper: {c:'#cf2020', bg:'#cf202022', tag:'Hipercinesia'},
};

function st(){
  if(!state.boyden) state.boyden = {modo:'vol', va:'', vb:'', a1:'', a2:'', a3:'', b1:'', b2:'', b3:'', min:''};
  return state.boyden;
}
const num = v => { const n=parseFloat(String(v==null?'':v).replace(',','.')); return (isNaN(n)||n<0)?null:n; };
const fmt = (n,d) => Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d, maximumFractionDigits:d});
const elip = (a,b,c) => (a!=null&&b!=null&&c!=null) ? a*b*c*0.523 : null;

/* cálculo puro (também usado nos testes) */
function calc(s){
  const va = s.modo==='med' ? elip(num(s.a1),num(s.a2),num(s.a3)) : num(s.va);
  const vb = s.modo==='med' ? elip(num(s.b1),num(s.b2),num(s.b3)) : num(s.vb);
  if(va==null || vb==null || va<=0) return null;
  const fe = (va-vb)/va*100;
  const cls = fe < 35 ? 'hipo' : fe > 90 ? 'hiper' : 'norm';
  const avisos = [];
  if(vb > va) avisos.push('O volume após o estímulo é maior que o volume em jejum (FE negativa): confira as medidas.');
  return {va, vb, fe, cls};
}
function feTxt(fe){ return fmt(Math.round(fe), 0); }
function frase(r, s){
  const min = num(s.min);
  return `Foi realizada a reavaliação da vesícula biliar ${min!=null?fmt(min,0):'XXX'} minutos após uma refeição gordurosa. Volume em jejum (VA) de ${fmt(r.va,1)} mL e após o estímulo (VB) de ${fmt(r.vb,1)} mL, evidenciando esvaziamento de ${feTxt(r.fe)}%.`;
}
function conc(r){
  const t = {hipo:' (hipocinesia biliar)', norm:'', hiper:' (hipercinesia biliar)'}[r.cls];
  return `Ultrassonografia do abdome superior com prova motora de Boyden evidenciando esvaziamento de ${feTxt(r.fe)}% do volume da vesícula biliar${t}.`;
}

/* ---- UI ---- */
function campo(k, label, ph, unit){
  return `<div class="ti-field"><label>${esc(label)}</label><div class="ti-szwrap"><div class="ti-szf">
    <input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(st()[k])}" oninput="boydenSet('${k}',this.value)"><span>${unit}</span>
  </div></div></div>`;
}
function dims(p, label){
  return `<div class="ti-field"><label>${esc(label)}</label><div style="display:flex;gap:6px;align-items:center">
    ${[1,2,3].map(i=>`<div class="ti-szf" style="flex:1"><input type="text" inputmode="decimal" placeholder="${['C','AP','T'][i-1]}" value="${esc(st()[p+i])}" oninput="boydenSet('${p+i}',this.value)"></div>`).join('<span>×</span>')}
    <span style="font-size:12px;color:var(--dim)">cm</span></div></div>`;
}
function resHTML(){
  const s=st(), r=calc(s);
  if(!r) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Informe o volume da vesícula em <b>jejum</b> (V<sub>A</sub>) e <b>após o estímulo</b> (V<sub>B</sub>).</span></div>`;
  const t=TONE[r.cls];
  const aviso = r.vb>r.va ? `<div class="ti-legend-row" style="margin-top:8px"><span class="lt">⚠️ O volume após o estímulo é maior que o volume em jejum: confira as medidas.</span></div>` : '';
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px">
      <div class="lv" style="color:${t.c}">${feTxt(r.fe)}%</div>
      <div class="meta"><div class="a">${r.cls==='hipo'?'Hipocinesia biliar':r.cls==='hiper'?'Hipercinesia biliar':'Fração de ejeção normal'}</div>
      <div class="b">V<sub>A</sub> ${fmt(r.va,1)} mL · V<sub>B</sub> ${fmt(r.vb,1)} mL</div></div>
      <div class="pts" style="background:${t.c}">${t.tag}</div>
    </div>${aviso}
    <div class="ti-card" style="margin-top:12px">
      <div class="tfg-sec-lbl">Para o laudo</div>
      <div style="font-size:13.5px;line-height:1.5;margin-bottom:6px">${esc(frase(r,s))}</div>
      <div style="font-size:13.5px;line-height:1.5;margin-bottom:10px"><b>Conclusão:</b> ${esc(conc(r))}</div>
      <div class="pmap-acts">
        <button type="button" class="lau-frase-btn" onclick="boydenMascara()">Levar para a máscara de Boyden</button>
        <button type="button" class="lau-btn2" onclick="boydenCopiar()">Copiar texto</button>
      </div>
    </div>`;
}
function html(){
  const s=st();
  const modo=(m,txt)=>`<div class="ti-ftog ${s.modo===m?'on':''}" onclick="boydenModo('${m}')">${txt}</div>`;
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Volumes da vesícula biliar</div>
      <div class="ti-field ti-field-foci"><label>Informar</label><div class="ti-foci">${modo('vol','Volume (mL)')}${modo('med','Medidas (C × AP × T)')}</div></div>
      <div class="ti-fields">
        ${s.modo==='med' ? dims('a','V A — em jejum') + dims('b','V B — após o estímulo') : campo('va','V A — em jejum','ex.: 30','mL') + campo('vb','V B — após o estímulo','ex.: 12','mL')}
        ${campo('min','Tempo após a refeição (opcional)','ex.: 45','min')}
      </div>
      <div id="boyden-res">${resHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fração de ejeção (FE)</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lt"><b>FE = (V<sub>A</sub> − V<sub>B</sub>) / V<sub>A</sub> × 100</b> · V<sub>A</sub>: volume em jejum · V<sub>B</sub>: volume após o estímulo. Por medidas: volume = C × AP × T × 0,523.</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f"> </span><span class="lt"><b>Hipocinesia biliar</b> — &lt; 35%</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55"> </span><span class="lt"><b>Normal</b> — 35% a 90%</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020"> </span><span class="lt"><b>Hipercinesia biliar</b> — &gt; 90%</span></div>
      </div>
    </div>
  </div>`;
}

/* ---- ações ---- */
window.boydenSet = function(k,v){ st()[k]=v; const el=document.getElementById('boyden-res'); if(el) el.innerHTML = typeof translateHTML==='function' ? translateHTML(resHTML()) : resHTML(); };
window.boydenModo = function(m){ st().modo=m; render(true); };
window.boydenCopiar = function(){
  const s=st(), r=calc(s); if(!r) return;
  const t = frase(r,s) + '\n\nConclusão:\n- ' + conc(r);
  (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject())
    .then(()=>klugToast('Texto copiado ✓')).catch(()=>klugToast('Não deu para copiar aqui.'));
};
/* abre a máscara "Abdome Superior com Boyden" com tempo e esvaziamento preenchidos */
window.boydenMascara = function(){
  const s=st(), r=calc(s); if(!r) return;
  openLaudo(MASK);
  setTimeout(()=>{
    try{
      const L=state.lau, m=lauModelo(L.model); if(!m) return;
      const min=num(s.min), fe=feTxt(r.fe);
      // texto da vesícula: "… XXX minutos … estimado em XXX%"
      m.items.forEach(it=>{
        const n=lauItemNormal(m,it); if(!/refeição gordurosa/.test(n||'')) return;
        const ps=lauTpl(n).lines.flat().filter(t=>t.t==='p');
        if(ps[0] && min!=null) lauPh(it.k,'n',ps[0].i,fmt(min,0),n);
        if(ps.length>=4){ lauPh(it.k,'n',ps[1].i,fmt(r.va,1),n); lauPh(it.k,'n',ps[2].i,fmt(r.vb,1),n); lauPh(it.k,'n',ps[3].i,fe,n); }
        else if(ps[1]) lauPh(it.k,'n',ps[1].i,fe,n);
      });
      // conclusão: "esvaziamento de XXX% …" (+ hipo/hipercinesia)
      lauConcNormalLines(m).forEach((c,i)=>{ if(!/Boyden/.test(c.text)) return; const p=lauTpl(c.text).lines.flat().find(t=>t.t==='p'); if(p) lauPh('__conc','n'+i,p.i,fe,c.text); });
      lauRenderLeft(); klugToast('Máscara de Boyden aberta com o esvaziamento de '+fe+'%');
    }catch(e){ console.warn('boyden', e); }
  }, 60);
};

CALCS.push({id:'boyden', spec:'abdome', badge:'BY', title:'Prova de Boyden',
  desc:'Fração de ejeção da vesícula biliar (esvaziamento após refeição gordurosa)', page:html});
window.BOYDEN = {calc, frase, conc};
})();
