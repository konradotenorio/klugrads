/* =========================================================================
   KlugRads — Laudos estruturados: Densitometria óssea (DXA)
   ---------------------------------------------------------------------------
   Itens estruturados (LAU_STRUCT.dmo*) usados pelas máscaras de
   tools/laudos/mascaras_dmo.txt. Cada sítio recebe DMO (g/cm²), % do
   adulto jovem e % da idade (como no relatório do aparelho), T-score e
   Z-score; o texto do relatório e a hipótese diagnóstica são montados
   automaticamente.
   Critérios (OMS / ISCD; diretrizes técnicas do PADI):
     • Pós-menopausa e homens ≥ 50 anos — menor T-score entre coluna
       lombar, colo do fêmur, fêmur total e rádio 33%:
       ≥ −1,0 normal · entre −1,0 e −2,5 osteopenia · ≤ −2,5 osteoporose.
     • Pré-menopausa, homens < 50 anos e crianças — Z-score:
       ≤ −2,0 abaixo do esperado para a idade; > −2,0 dentro do esperado.
     • Triângulo de Ward e trocanter não entram no diagnóstico.
     • Corpo inteiro: não é sítio diagnóstico de osteoporose em adultos.
   Carregar depois de laudos.js.
   ========================================================================= */

const LAU_STRUCT_LABELS_DMO = { 'tecnica':'dmotec', 'coluna lombar':'dmocol', 'femur':'dmofem', 'antebraco':'dmorad', 'corpo inteiro':'dmocorpo' };
const LAU_TEC_DMO = [['mov','movimentação do paciente'],['art','artefatos metálicos'],['pos','dificuldade de posicionamento']];

function dmoRef(){ const L=state.lau; return (L && L.dmoRef) || 't'; }
function dmoMk(v){ return lauMk(v, true); }
function dmoV(v, suf){ return lauHas(v) ? esc(lauN(v))+(suf||'') : dmoMk('___'); }
/* % do aparelho (ex.: 76 = 24% abaixo; 112 = 12% acima) */
function dmoPct(p, quem){
  const n=lauF(p); if(n==null) return `${dmoMk('___')}% em relação ao esperado ${quem}`;
  const d=Math.round((100-n)*10)/10;
  if(d===0) return `massa óssea igual à esperada ${quem}`;
  return `${esc(String(Math.abs(d)).replace('.',','))}% ${d>0?'abaixo':'acima'} do esperado ${quem}`;
}
function dmoScores(s, pre){
  const t=s[pre+'t'], z=s[pre+'z'], ref=dmoRef(), out=[];
  if(lauHas(t) || ref==='t') out.push(`T-score: ${dmoV(t)}`);
  if(lauHas(z) || ref==='z') out.push(`Z-score: ${dmoV(z)}`);
  return `(${out.join('; ')})`;
}
/* frase padrão de um sítio */
function dmoSitio(nome, s, pre){
  return `${nome} foi de ${dmoV(s[pre+'dmo'],' g/cm²')}, correspondendo a uma massa óssea ${dmoPct(s[pre+'py'],'para o adulto jovem (20 a 29 anos)')} e ${dmoPct(s[pre+'pi'],'para a idade (mesmo sexo, idade, peso e altura)')} ${dmoScores(s,pre)}.`;
}
function dmoCtrls(pre, extra){
  return [
    {t:'num', k:pre+'dmo', lbl:'DMO', unit:'g/cm²'},
    {t:'num', k:pre+'py', lbl:'% do adulto jovem (valor do aparelho, ex.: 76)', unit:'%'},
    {t:'num', k:pre+'pi', lbl:'% da idade (valor do aparelho, ex.: 91)', unit:'%'},
    {t:'num', k:pre+'t', lbl:'T-score', unit:''},
    {t:'num', k:pre+'z', lbl:'Z-score', unit:''},
  ].map(c=>Object.assign(c, extra||{}));
}
const DMO_LADO = [['','Não informar'],['direito','Direito'],['esquerdo','Esquerdo']];

LAU_STRUCT.dmotec = {k:'dmotec', label:'Técnica', noNF:true,
  normal:'Exame realizado pelo método de absorção de raios X de dupla energia (DXA).',
  ctrls:[{t:'text', k:'ap', lbl:'Aparelho (opcional)', ph:'ex.: Lunar Prodigy Advance DPX, Hologic Horizon'}],
  build(s){
    if(!lauHas(s.ap)) return {txt:null, conc:[]};
    return {txt:`Exame realizado com equipamento ${s.ap.trim()} pelo método de absorção de raios X de dupla energia (DXA).`, conc:[]};
  }};

LAU_STRUCT.dmocol = {k:'dmocol', label:'Coluna lombar', noNF:true,
  normal:'A densidade mineral óssea (DMO) do segmento L1-L4 da COLUNA LOMBAR.',
  ctrls:[{t:'select', k:'seg', lbl:'Segmento analisado', opts:[['L1-L4','L1-L4'],['L1-L3','L1-L3'],['L2-L4','L2-L4'],['L1-L2','L1-L2'],['L2-L3','L2-L3'],['L3-L4','L3-L4'],['L1 e L3','L1 e L3'],['L1 e L4','L1 e L4'],['L2 e L4','L2 e L4']]}]
    .concat(dmoCtrls(''))
    .concat([{t:'check', k:'deg', lbl:'Alterações degenerativas / artefatos na coluna'}]),
  build(s){
    let t = dmoSitio(`A densidade mineral óssea (DMO) do segmento ${esc(s.seg||'L1-L4')} da COLUNA LOMBAR`, s, '');
    if(s.seg && s.seg!=='L1-L4') t += ` Vértebras excluídas da análise por alterações que interferem na medida.`;
    if(s.deg) t += ` Observam-se alterações degenerativas e/ou artefatos na coluna lombar, que podem superestimar a DMO.`;
    return {txt:t, html:true, conc:[], sum: lauHas(s.t)?`T-score ${lauN(s.t)}`:(lauHas(s.z)?`Z-score ${lauN(s.z)}`:'Preencher valores')};
  }};

LAU_STRUCT.dmofem = {k:'dmofem', label:'Fêmur', noNF:true,
  normal:'A DMO do FÊMUR TOTAL.',
  ctrls:[{t:'radio', k:'lado', lbl:'Lado', opts:DMO_LADO}, {t:'head', lbl:'Fêmur total'}]
    .concat(dmoCtrls(''))
    .concat([{t:'head', lbl:'Colo do fêmur'},
             {t:'num', k:'cdmo', lbl:'DMO', unit:'g/cm²'}, {t:'num', k:'ct', lbl:'T-score', unit:''}, {t:'num', k:'cz', lbl:'Z-score (opcional)', unit:''},
             {t:'head', lbl:'Outras regiões (opcional — não entram no diagnóstico)'},
             {t:'num', k:'wdmo', lbl:'Triângulo de Ward — DMO', unit:'g/cm²'}, {t:'num', k:'tdmo', lbl:'Trocanter maior — DMO', unit:'g/cm²'}]),
  build(s){
    const lado = s.lado ? ' '+s.lado.toUpperCase() : '';
    let t = dmoSitio(`A DMO do FÊMUR TOTAL${lado}`, s, '');
    const sc=[]; if(lauHas(s.ct)) sc.push(`T-score: ${esc(lauN(s.ct))}`); if(lauHas(s.cz)) sc.push(`Z-score: ${esc(lauN(s.cz))}`);
    const partes=[`o COLO DO FÊMUR tem DMO de ${dmoV(s.cdmo,' g/cm²')}${sc.length?` (${sc.join('; ')})`:''}`];
    if(lauHas(s.wdmo)) partes.push(`o TRIÂNGULO DE WARD, de ${esc(lauN(s.wdmo))} g/cm²`);
    if(lauHas(s.tdmo)) partes.push(`o TROCANTER MAIOR, de ${esc(lauN(s.tdmo))} g/cm²`);
    const j = partes.length>1 ? partes.slice(0,-1).join(', ')+' e '+partes[partes.length-1] : partes[0];
    t += '<br>' + j.charAt(0).toUpperCase()+j.slice(1)+'.';
    const tmin=[s.t,s.ct].map(lauF).filter(x=>x!=null);
    return {txt:t, html:true, conc:[], sum: tmin.length?`T-score ${lauN(String(Math.min(...tmin)))}`:'Preencher valores'};
  }};

LAU_STRUCT.dmorad = {k:'dmorad', label:'Antebraço', noNF:true,
  normal:'A DMO do ANTEBRAÇO DISTAL (rádio 33%).',
  ctrls:[{t:'radio', k:'lado', lbl:'Lado', opts:DMO_LADO}].concat(dmoCtrls('')),
  build(s){
    const lado = s.lado ? ' '+s.lado.toUpperCase() : '';
    return {txt: dmoSitio(`A DMO do ANTEBRAÇO DISTAL${lado} (rádio 33%)`, s, ''), html:true, conc:[], sum: lauHas(s.t)?`T-score ${lauN(s.t)}`:(lauHas(s.z)?`Z-score ${lauN(s.z)}`:'Preencher valores')};
  }};

LAU_STRUCT.dmocorpo = {k:'dmocorpo', label:'Corpo inteiro', noNF:true,
  normal:'A DMO do CORPO INTEIRO.',
  ctrls:[{t:'radio', k:'reg', lbl:'Região', opts:[['tot','Corpo inteiro'],['scab','Corpo inteiro sem a cabeça (TBLH)']]}]
    .concat(dmoCtrls(''))
    .concat([{t:'head', lbl:'Composição corporal (opcional)'},
             {t:'num', k:'gkg', lbl:'Massa gorda', unit:'kg'}, {t:'num', k:'gpc', lbl:'Gordura corporal', unit:'%'},
             {t:'num', k:'mkg', lbl:'Massa magra', unit:'kg'}, {t:'num', k:'cmo', lbl:'Conteúdo mineral ósseo (CMO)', unit:'g'}]),
  build(s){
    const reg = s.reg==='scab' ? 'do CORPO INTEIRO, excluindo a cabeça,' : 'do CORPO INTEIRO';
    let t = dmoSitio(`A DMO ${reg}`, s, '');
    const c=[];
    if(lauHas(s.gkg)||lauHas(s.gpc)) c.push(`massa gorda${lauHas(s.gkg)?` de ${esc(lauN(s.gkg))} kg`:''}${lauHas(s.gpc)?` (${esc(lauN(s.gpc))}% de gordura corporal)`:''}`);
    if(lauHas(s.mkg)) c.push(`massa magra de ${esc(lauN(s.mkg))} kg`);
    if(lauHas(s.cmo)) c.push(`conteúdo mineral ósseo de ${esc(lauN(s.cmo))} g`);
    if(c.length) t += `<br>Composição corporal: ${lauJuntaE(c)}.`;
    return {txt:t, html:true, conc:[], sum: lauHas(s.t)?`T-score ${lauN(s.t)}`:(lauHas(s.z)?`Z-score ${lauN(s.z)}`:'Preencher valores')};
  }};

/* ---- hipótese diagnóstica (uma só, para o exame todo) ---- */
const DMO_NOME = {dmocol:'a COLUNA LOMBAR', dmofem:'o FÊMUR', dmorad:'o RÁDIO DISTAL', dmocorpo:'o CORPO INTEIRO'};
function dmoConcs(m){
  const L=state.lau, ref=dmoRef();
  const its = m.items.filter(it=>it.sk && it.sk!=='dmotec');
  const val = (it)=>L.v[it.k];
  const diag = its.filter(it=>it.sk!=='dmocorpo');
  const nomes = its.map(it=>DMO_NOME[it.sk]).filter(Boolean);
  const lista = nomes.length>1 ? nomes.slice(0,-1).join(', ')+' e '+nomes[nomes.length-1] : (nomes[0]||'');
  const out=[];
  if(ref==='z'){
    const zs=[]; its.forEach(it=>{ const s=val(it); [s.z, s.cz].map(lauF).filter(x=>x!=null).forEach(x=>zs.push(x)); });
    if(!zs.length) return [{html:dmoMk('Informe o Z-score para a hipótese diagnóstica.')}];
    const zmin=Math.min(...zs);
    out.push({html: zmin<=-2 ? `Densidade mineral óssea abaixo do esperado para a idade (Z-score ≤ −2,0).`
                             : `Densidade mineral óssea dentro do esperado para a idade.`});
    return out;
  }
  if(!diag.length){   // só corpo inteiro: não é sítio diagnóstico em adultos
    const s=its[0]&&val(its[0]); const t=s&&lauF(s.t);
    out.push({html: t==null ? dmoMk('Informe o T-score.') : `DMO do corpo inteiro com T-score de ${esc(lauN(s.t))}.`});
    out.push({html:'A DMO do corpo inteiro não é utilizada para o diagnóstico densitométrico de osteoporose em adultos; o diagnóstico baseia-se na coluna lombar e no fêmur proximal.'});
    return out;
  }
  const ts=[]; diag.forEach(it=>{ const s=val(it); [s.t, s.ct].map(lauF).filter(x=>x!=null).forEach(x=>ts.push(x)); });
  if(!ts.length) return [{html:dmoMk('Informe o T-score para a hipótese diagnóstica.')}];
  const tmin=Math.min(...ts);
  out.push({html: tmin<=-2.5 ? 'Osteoporose.' : tmin<-1 ? 'Osteopenia.' : `Valores normais de densidade óssea para ${lista}.`});
  return out;
}
