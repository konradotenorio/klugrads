/* =========================================================================
   KlugRads — Volume Gástrico (resíduo gástrico por ultrassonografia)
   ---------------------------------------------------------------------------
   Método: US · Especialidade: Abdome (Adultos).
   Fórmula de Perlas (2013), revisada em Van de Putte & Perlas, BJA 2014:
     VG (mL) = 27,0 + 14,6 × AST do antro em DLD (cm²) − 1,28 × idade (anos)
     AST = (AP × CC × π) / 4   — diâmetros de serosa a serosa, antro em repouso
   Interpretação: até 1,5 mL/kg = volume basal de jejum (sem risco significativo
   de aspiração); acima disso, volume maior que o basal. Conteúdo sólido ou
   espesso = estômago cheio, independentemente do volume.
   Validado em adultos não gestantes: IMC 19–40 kg/m², 18–85 anos, até 500 mL.
   Layout TI-RADS/O-RADS (classes ti-*). Ferramenta educacional.
   ========================================================================= */

const VG_REF = 'Van de Putte P, Perlas A. Ultrasound assessment of gastric content and volume. Br J Anaesth. 2014;113(1):12-22. doi:10.1093/bja/aeu151.';
const VG_LIMIT = 1.5;   // mL/kg — volume basal de jejum
const VG_TONE = {
  ok:   {c:'#1f9d55', bg:'#1f9d5522', tag:'Basal'},
  high: {c:'#e07a1f', bg:'#e07a1f22', tag:'Alto'},
  info: {c:'#2a8fb0', bg:'#2a8fb022', tag:'mL'},
};

function vgState(){
  if(!state.volgastrico) state.volgastrico={modo:'diam', ap:'', cc:'', ast:'', idade:'', peso:''};
  return state.volgastrico;
}
function vgNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return (isNaN(n)||n<0)?null:n; }
function vgFmt(n, d){ return Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d, maximumFractionDigits:d}); }

/* Cálculo puro (sem DOM) — também usado nos testes. */
function vgCalc(s){
  let ast;
  if(s.modo==='ast'){ ast = vgNum(s.ast); }
  else {
    const ap=vgNum(s.ap), cc=vgNum(s.cc);
    ast = (ap!=null && cc!=null) ? (ap*cc*Math.PI)/4 : null;
  }
  const idade = vgNum(s.idade);
  if(ast==null || ast===0 || idade==null) return null;
  const bruto = 27.0 + 14.6*ast - 1.28*idade;
  const vol = Math.max(0, bruto);
  const peso = vgNum(s.peso);
  const mlkg = (peso && peso>0) ? vol/peso : null;
  const avisos = [];
  if(bruto < 0) avisos.push('O modelo deu valor negativo (antro muito pequeno para a idade): considere o volume desprezível.');
  if(idade < 18 || idade > 85) avisos.push('Idade fora da faixa validada (18–85 anos).');
  if(vol > 500) avisos.push('Volume acima da faixa validada (até 500 mL).');
  return {ast, vol, mlkg, peso, idade, avisos};
}

/* ---- UI ---- */
function vgField(k, label, ph, unit, val){
  return `<div class="ti-field">
    <label>${esc(label)}</label>
    <div class="ti-szwrap"><div class="ti-szf">
      <input type="text" inputmode="decimal" placeholder="${esc(ph)}" value="${esc(val)}" oninput="vgSet('${k}',this.value)">
      <span>${unit}</span>
    </div></div>
  </div>`;
}

function vgResHTML(){
  const r = vgCalc(vgState());
  if(!r) return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">Informe a <b>área do antro</b> (ou os diâmetros AP e CC) e a <b>idade</b>. O <b>peso</b> é opcional e serve para calcular mL/kg.</span></div>`;
  let t, titulo;
  if(r.mlkg==null){ t=VG_TONE.info; titulo='Volume gástrico estimado'; }
  else if(r.mlkg <= VG_LIMIT){ t=VG_TONE.ok; titulo='Compatível com volume basal de jejum'; }
  else { t=VG_TONE.high; titulo='Acima do volume basal de jejum'; }
  const linhaB = r.mlkg==null
    ? `AST ${vgFmt(r.ast,2)} cm² · informe o peso para calcular mL/kg`
    : `${vgFmt(r.mlkg,2)} mL/kg · AST ${vgFmt(r.ast,2)} cm² · limite ${vgFmt(VG_LIMIT,1)} mL/kg`;
  const avisos = r.avisos.length
    ? `<div class="ti-legend-row" style="margin-top:8px"><span class="lt">⚠️ ${r.avisos.map(esc).join('<br>⚠️ ')}</span></div>` : '';
  return `<div class="ti-res" style="background:${t.bg};margin-top:12px">
    <div class="lv" style="color:${t.c}">${vgFmt(Math.round(r.vol),0)} mL</div>
    <div class="meta"><div class="a">${esc(titulo)}</div><div class="b">${linhaB}</div></div>
    <div class="pts" style="background:${t.c}">${t.tag}</div>
  </div>${avisos}${vgFraseHTML()}`;
}

/* ---- Frase pronta para o laudo ---- */
function vgFrase(){
  const r = vgCalc(vgState()); if(!r) return '';
  let f = `Antro gástrico com área de secção transversal de ${vgFmt(r.ast,1)} cm² em decúbito lateral direito, com volume gástrico estimado em ${vgFmt(Math.round(r.vol),0)} mL`;
  if(r.mlkg==null) return f + '.';
  f += ` (${vgFmt(r.mlkg,2)} mL/kg), `;
  f += r.mlkg <= VG_LIMIT
    ? 'compatível com volume basal de jejum (até 1,5 mL/kg).'
    : 'acima do volume basal de jejum (1,5 mL/kg).';
  return f;
}
function vgFraseHTML(){
  const f = vgFrase(); if(!f) return '';
  return `<div class="lau-frase">
    <div class="lau-frase-lbl">Frase para o laudo</div>
    <div class="lau-frase-tx">${esc(f)}</div>
    <button type="button" class="lau-frase-btn" onclick="vgCopyFrase()">${svgIcon(P.copy,16,{sw:2})} Copiar frase</button>
  </div>`;
}
function vgCopyFrase(){ const f=vgFrase(); if(f) klugCopy(f, 'Frase copiada ✓'); }

function calcVolumeGastricoHTML(){
  const s = vgState();
  const chip = (id,txt)=>`<div class="ti-ftog ${s.modo===id?'on':''}" onclick="vgSetModo('${id}')">${esc(txt)}</div>`;
  const campos = s.modo==='ast'
    ? vgField('ast','Área do antro (AST) em DLD','ex.: 6,5','cm²', s.ast)
    : vgField('ap','Diâmetro anteroposterior (AP)','ex.: 2,5','cm', s.ap)
      + vgField('cc','Diâmetro craniocaudal (CC)','ex.: 3,2','cm', s.cc);
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Antro gástrico em decúbito lateral direito</div>
      <div class="ti-foci" style="margin-top:8px">${chip('diam','Diâmetros AP × CC')}${chip('ast','Área já medida')}</div>
      <div class="ti-fields" style="margin-top:10px">
        ${campos}
        ${vgField('idade','Idade','ex.: 45','anos', s.idade)}
        ${vgField('peso','Peso (opcional)','ex.: 70','kg', s.peso)}
      </div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">• Medir de serosa a serosa, com o antro em repouso (entre contrações), em plano sagital no epigástrio.<br>• Use apenas quando o conteúdo for <b>líquido claro</b> ou o antro estiver vazio.</span></div>
      <div id="vg-res">${vgResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Fórmulas (Perlas)</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">VG (mL) = 27,0 + 14,6 × AST em DLD (cm²) − 1,28 × idade (anos)</div>
        <div class="tfg-ref-item">AST = (AP × CC × π) / 4</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Interpretação</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">≤1,5</span><span class="lt"><b>Até 1,5 mL/kg</b>: volume basal de jejum, sem risco significativo de aspiração</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f">&gt;1,5</span><span class="lt"><b>Acima de 1,5 mL/kg</b>: volume maior que o basal, indicar precauções contra aspiração</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">!</span><span class="lt"><b>Conteúdo sólido, particulado ou líquido espesso</b>: estômago cheio, alto risco de aspiração, qualquer que seja o volume calculado</span></div>
      </div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Validado em adultos não gestantes: IMC 19–40 kg/m², 18–85 anos, volumes até 500 mL. Não validado em crianças nem em gestantes.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referência</div>
      <div class="tfg-ref-list"><div class="tfg-ref-item">${esc(VG_REF)}</div></div>
    </div>
  </div>`;
}

/* Troca de modo = re-render (troca os campos). Digitar só atualiza o resultado. */
function vgSetModo(m){ vgState().modo=m; render(true); }
function vgSet(k, v){
  vgState()[k]=v;
  const el=document.getElementById('vg-res'); if(el) el.innerHTML=translateHTML(vgResHTML());
}

/* registra no catálogo (CALCS de app.js) — US, especialidade Abdome */
CALCS.push({id:'volgastrico', spec:'abdome', badge:'VG',
  title:'Volume Gástrico',
  desc:'Resíduo gástrico por US — fórmula de Perlas (mL e mL/kg)'});
