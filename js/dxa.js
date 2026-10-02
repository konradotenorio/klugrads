/* =========================================================================
   KlugRads — Densitometria óssea (DXA): Protocolos, Referências e Calculadoras
   ---------------------------------------------------------------------------
   Método 'dxa' do site (cartão "Densitometria Óssea"). Conteúdo redigido
   pelo KlugRads com base nas Posições Oficiais da ISCD (adulto, 2023;
   pediátrica e composição corporal) e nas Diretrizes Técnicas de
   Densitometria Óssea do PADI/CBR. Cada página entra no catálogo CALCS
   (modality:'dxa', kind 'proto' | 'ref' | 'calc') com page() própria.
   ========================================================================= */

const DXA_REFS = [
  'International Society for Clinical Densitometry (ISCD). 2023 ISCD Official Positions — Adult. Disponível em iscd.org/learn/official-positions.',
  'Krueger D, Tanner SB, Szalat A, et al. DXA Reporting Updates: 2023 Official Positions of the International Society for Clinical Densitometry. J Clin Densitom. 2024;27(1):101437. doi:10.1016/j.jocd.2023.101437.',
  'ISCD. Official Positions — Pediatric e Body Composition (versões vigentes).',
  'Colégio Brasileiro de Radiologia — PADI. Diretrizes Técnicas de Densitometria Óssea. padi.org.br.',
  'World Health Organization. Assessment of fracture risk and its application to screening for postmenopausal osteoporosis. WHO Technical Report Series 843, 1994.',
];
function dxaRefsCard(){
  return `<div class="ti-card"><div class="tfg-sec-lbl">Referências</div><div class="tfg-ref-list">${DXA_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div></div>`;
}
function dxaUl(a){ return `<ul class="ptc-ul">${a.map(x=>`<li>${x}</li>`).join('')}</ul>`; }
function dxaCard(t, body, cls){ return `<div class="ti-card${cls?' '+cls:''}"><div class="tfg-sec-lbl">${esc(t)}</div>${body}</div>`; }

/* ======================= PROTOCOLOS ======================= */
const DXA_PROTO = [
  {id:'coluna', t:'Coluna lombar (PA)', d:'Posicionamento, aquisição e análise L1–L4',
   ind:'Diagnóstico e acompanhamento da DMO; sítio obrigatório junto com o fêmur proximal.',
   sec:[
    ['Posicionamento', ['Paciente em decúbito dorsal, centrado na mesa, com a coluna retificada e alinhada ao eixo longo.',
      'Pernas elevadas sobre o apoio (quadris e joelhos fletidos) para reduzir a lordose lombar.',
      'Retirar objetos metálicos e roupas com botões, zíperes ou fechos na região.']],
    ['Aquisição', ['Incluir de L5 (ou crista ilíaca) até T12 (com as últimas costelas visíveis), para identificar corretamente as vértebras.',
      'A coluna deve ficar centrada no campo, com tecido mole simétrico dos dois lados.']],
    ['Análise', ['Região de interesse: L1–L4.',
      'Excluir vértebras com alteração estrutural local ou artefato; usar o maior número possível de vértebras avaliáveis, no mínimo duas.',
      'Diagnóstico com uma única vértebra não é recomendado.',
      'A coluna lateral não deve ser usada para diagnóstico.']],
   ],
   arm:['Alterações degenerativas, fraturas, calcificações aórticas e artefatos podem superestimar a DMO — considerar excluir a vértebra ou usar outro sítio.']},
  {id:'femur', t:'Fêmur proximal', d:'Rotação interna, regiões fêmur total e colo',
   ind:'Diagnóstico e acompanhamento da DMO; sítio obrigatório junto com a coluna lombar.',
   sec:[
    ['Posicionamento', ['Paciente em decúbito dorsal, perna estendida e abduzida discretamente, com a diáfise femoral paralela ao eixo longo da mesa.',
      'Rotação interna de 15–25° do membro, com o posicionador próprio, para que o trocanter menor fique pouco visível.']],
    ['Aquisição e análise', ['Pode ser medido qualquer um dos lados; no acompanhamento, usar sempre o mesmo lado.',
      'Regiões diagnósticas: fêmur total e colo do fêmur.',
      'Triângulo de Ward e trocanter maior não são usados para diagnóstico.',
      'A média dos dois fêmures pode ser usada no acompanhamento (fêmur total).']],
   ],
   arm:['Rotação inadequada altera a medida do colo; o mesmo posicionamento deve ser reproduzido nos exames de controle.']},
  {id:'antebraco', t:'Antebraço (rádio 33%)', d:'Quando usar e como medir',
   ind:'Usar o rádio 33% quando a coluna e/ou o fêmur não puderem ser medidos ou interpretados, no hiperparatireoidismo e em pacientes acima do limite de peso da mesa.',
   sec:[
    ['Técnica', ['Medir o antebraço não dominante.',
      'Paciente sentado ao lado da mesa, com o antebraço apoiado e alinhado ao eixo do aparelho, sem rotação.',
      'Região diagnóstica: rádio 33% (terço distal); outras regiões do antebraço não são recomendadas para diagnóstico.']],
   ]},
  {id:'corpo', t:'Corpo inteiro e composição corporal', d:'Corpo total, TBLH (pediatria) e composição',
   ind:'Composição corporal (massa gorda, massa magra e conteúdo mineral ósseo) e, em crianças e adolescentes, DMO do corpo inteiro excluindo a cabeça (TBLH).',
   sec:[
    ['Posicionamento', ['Decúbito dorsal, centrado na mesa, com o corpo inteiro dentro do campo de varredura.',
      'Braços ao longo do corpo, afastados do tronco, mãos em posição neutra; pés juntos (fita/apoio se necessário).',
      'Retirar todos os objetos metálicos.']],
    ['Uso', ['Em adultos, a DMO do corpo inteiro não é usada para o diagnóstico de osteoporose.',
      'Em crianças e adolescentes, os sítios preferidos são a coluna lombar PA e o corpo inteiro sem a cabeça (TBLH).',
      'Composição corporal: útil, por exemplo, em lipodistrofia associada ao HIV, em obesos submetidos a cirurgia bariátrica ou grande perda de peso e na avaliação de fraqueza muscular / sarcopenia.']],
   ]},
  {id:'qualidade', t:'Controle de qualidade e precisão', d:'Fantoma, estudo de precisão e MVS',
   ind:'Garantir medidas confiáveis e comparáveis entre exames.',
   sec:[
    ['Controle de qualidade', ['Seguir o programa de controle de qualidade do fabricante.',
      'Escaneamento periódico do fantoma (pelo menos semanal) como verificação independente da calibração.',
      'Registrar e investigar desvios; manutenção e recalibração quando indicado.']],
    ['Estudo de precisão (cada técnico)', ['15 pacientes medidos 3 vezes ou 30 pacientes medidos 2 vezes, com reposicionamento entre as medidas.',
      'Calcular o erro de precisão (RMS-SD) e a mínima variação significativa (MVS / LSC) com 95% de confiança: MVS = 2,77 × erro de precisão.',
      'Precisão mínima aceitável por técnico: coluna lombar 1,9% (MVS 5,3%), fêmur total 1,8% (MVS 5,0%), colo do fêmur 2,5% (MVS 6,9%).']],
    ['Acompanhamento', ['Comparar a DMO (g/cm²), não o T-score, entre exames feitos no mesmo aparelho.',
      'Entre aparelhos diferentes é necessária calibração cruzada.',
      'Informar no laudo a MVS do serviço, a data do exame anterior e a variação numérica e percentual.']],
   ]},
];
function dxaProtoHTML(p){
  return `<div class="ti-wrap">
    <div class="ti-card"><div class="tfg-sec-lbl">Densitometria · Protocolo</div><div class="ptc-ind"><b>Indicação:</b> ${esc(p.ind)}</div>
      ${p.sec.map(s=>`<div class="ptc-lbl">${esc(s[0])}</div>${dxaUl(s[1].map(esc))}`).join('')}</div>
    ${p.arm ? dxaCard('Atenção', dxaUl(p.arm.map(esc)), 'ptc-arm') : ''}
    ${dxaRefsCard()}
  </div>`;
}

/* ======================= REFERÊNCIAS ======================= */
function dxaRefCriteriosHTML(){
  const row=(k,c,t)=>`<div class="ti-legend-row"><span class="lk" style="background:${c}">${k}</span><span class="lt">${t}</span></div>`;
  return `<div class="ti-wrap">
    ${dxaCard('Pós-menopausa e homens ≥ 50 anos — T-score (OMS)', `<div class="ti-legend" style="margin-top:6px">
      ${row('N','#1f9d55','<b>Normal</b> — T-score ≥ −1,0')}
      ${row('OP','#e07a1f','<b>Osteopenia (baixa massa óssea)</b> — T-score entre −1,0 e −2,5')}
      ${row('OS','#cf2020','<b>Osteoporose</b> — T-score ≤ −2,5')}</div>
      ${dxaUl(['Usar o <b>menor T-score</b> entre coluna lombar (L1–L4), colo do fêmur e fêmur total; o rádio 33% entra quando medido.',
        'Formular <b>um único diagnóstico</b> para o exame.',
        'Triângulo de Ward e trocanter maior não são sítios diagnósticos.',
        'A ISCD recomenda o mesmo banco de referência (mulheres brancas, NHANES III para o fêmur) no cálculo do T-score de homens e mulheres. Ao citar raça, a ISCD 2023 prefere o termo “branco” a “caucasiano”.'])}`)}
    ${dxaCard('Pré-menopausa, homens < 50 anos e crianças — Z-score', `<div class="ti-legend" style="margin-top:6px">
      ${row('≤−2','#cf2020','<b>Abaixo da faixa esperada para a idade</b> — Z-score ≤ −2,0')}
      ${row('>−2','#1f9d55','<b>Dentro da faixa esperada para a idade</b> — Z-score > −2,0')}</div>
      ${dxaUl(['Nesse grupo, a osteoporose não deve ser diagnosticada apenas pela densitometria.',
        'Em crianças e adolescentes, não usar T-score nem o termo osteopenia; sítios preferidos: coluna lombar PA e corpo inteiro sem a cabeça (TBLH).'])}`)}
    ${dxaCard('Exclusão de vértebras', dxaUl(['Excluir vértebras com alteração estrutural local (fratura, degeneração importante, artefato).',
      'Excluir a vértebra anatomicamente anormal quando a diferença de T-score para a adjacente for maior que 1,0.',
      'Usar o maior número de vértebras avaliáveis — no mínimo duas; não diagnosticar com uma só.']))}
    ${dxaRefsCard()}
  </div>`;
}
function dxaRefIndicacoesHTML(){
  return `<div class="ti-wrap">
    ${dxaCard('Indicações de densitometria (adultos — ISCD)', dxaUl([
      'Mulheres com 65 anos ou mais.',
      'Mulheres na pós-menopausa com menos de 65 anos e fatores de risco para baixa massa óssea (baixo peso, fratura prévia, medicações de alto risco, doença ou condição associada à perda óssea).',
      'Mulheres na transição menopausal com fatores de risco clínicos para fratura.',
      'Homens com 70 anos ou mais.',
      'Homens com menos de 70 anos e fatores de risco para baixa massa óssea.',
      'Adultos com fratura por fragilidade.',
      'Adultos com doença ou condição associada a baixa massa óssea ou perda óssea.',
      'Adultos em uso de medicações associadas à perda óssea (ex.: glicocorticoides).',
      'Qualquer pessoa em que se considere tratamento farmacológico, ou em tratamento, para monitorar o efeito.',
      'Pessoas sem tratamento em que a evidência de perda óssea mudaria a conduta.']))}
    ${dxaCard('Quando usar o antebraço (rádio 33%)', dxaUl(['Coluna e/ou fêmur que não possam ser medidos ou interpretados.','Hiperparatireoidismo.','Paciente acima do limite de peso da mesa.']))}
    ${dxaRefsCard()}
  </div>`;
}
function dxaRefLaudoHTML(){
  return `<div class="ti-wrap">
    ${dxaCard('Itens do laudo (PADI / ISCD)', dxaUl([
      'Identificação: nome, idade, sexo, etnia, peso e altura.',
      'Equipamento: fabricante, modelo e versão do software.',
      'Indicação clínica e limitações técnicas (artefatos, vértebras excluídas).',
      'Sítios medidos (mínimo de dois sítios válidos: coluna lombar e fêmur) com DMO, T-score e/ou Z-score.',
      'Um único diagnóstico, pela classificação da OMS/ISCD.',
      'No acompanhamento: data do exame anterior, aparelho, MVS do serviço e variação numérica e percentual da DMO.']))}
    ${dxaCard('Atualizações da ISCD 2023 para o laudo', dxaUl([
      'O laudo segue o modelo de laudo radiológico: há elementos <b>obrigatórios</b> (diagnósticos) e <b>opcionais</b> (consultivos, de conduta).',
      'A <b>classificação diagnóstica</b> é obrigatória, aplicando os critérios da OMS quando adequado; listar a tabela de critérios da OMS passou a ser opcional.',
      'Informar por que um sítio adquirido não foi laudado, ou o que pode confundir a DMO num exame aceitável (fratura vertebral, alterações degenerativas, material cirúrgico, ilhota óssea, laminectomia, rotação limitada do quadril).',
      'Risco de fratura: identificar a calculadora usada e listar os fatores de risco positivos incluídos no cálculo.',
      'A frase genérica sobre investigar causas secundárias de baixa DMO passou a ser opcional.',
      'Não aplicar a MVS nem relatar variação da DMO entre aparelhos sem calibração cruzada — apenas comparação qualitativa.',
      'O laudo (inicial e de controle) deve dizer que um exame de acompanhamento é recomendado quando houver comparação válida; o intervalo exato é dado quando houver informação clínica suficiente, senão uma recomendação geral.',
      'Recomenda-se um programa interno de aprendizado entre pares (peer-learning) para a qualidade dos laudos.']))}
    ${dxaCard('Formato dos números', dxaUl(['DMO com 3 casas decimais (ex.: 0,927 g/cm²).','T-score e Z-score com 1 casa decimal (ex.: −2,3).','CMO com 2 casas decimais (ex.: 31,76 g); área com 2 casas (ex.: 43,25 cm²).']))}
    ${dxaRefsCard()}
  </div>`;
}

/* ======================= CALCULADORAS ======================= */
function dxaSt(k){ if(!state.dxa) state.dxa={}; if(!state.dxa[k]) state.dxa[k]={}; return state.dxa[k]; }
function dxaNum(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }
function dxaFmt(n,d){ return n.toFixed(d).replace('.',',').replace('-','−'); }
function dxaInput(st, k, lbl, unit, ph, upd){
  return `<div class="ti-field"><label>${esc(lbl)}</label><div class="ti-szwrap"><div class="ti-szf"><input type="text" inputmode="decimal" placeholder="${esc(ph||'')}" value="${esc(dxaSt(st)[k]||'')}" oninput="dxaSt('${st}')['${k}']=this.value;${upd}()"><span>${esc(unit||'')}</span></div></div></div>`;
}
function dxaRes(color, lv, a, b){
  return `<div class="ti-res" style="background:${color}22;margin-top:10px"><div class="lv" style="color:${color}">${lv}</div><div class="meta"><div class="a">${a}</div><div class="b">${b||''}</div></div></div>`;
}

/* 1. Classificação densitométrica */
function dxaClsResHTML(){
  const s=dxaSt('cls'), g=s.g||'t';
  const sites=[['col','Coluna lombar'],['colo','Colo do fêmur'],['ft','Fêmur total'],['rad','Rádio 33%']];
  const vals=sites.map(([k,n])=>({n, v:dxaNum(s[k])})).filter(x=>x.v!=null);
  if(!vals.length) return `<div class="ti-legend-row" style="margin-top:10px"><span class="lt">Informe pelo menos um ${g==='t'?'T-score':'Z-score'}.</span></div>`;
  const min=vals.reduce((a,b)=>b.v<a.v?b:a);
  const lista = vals.length<2 ? '<br>Atenção: o diagnóstico deve considerar pelo menos dois sítios válidos (coluna e fêmur).' : '';
  if(g==='z') return min.v<=-2 ? dxaRes('#cf2020','Z ≤ −2,0','Abaixo da faixa esperada para a idade',`Menor Z-score: ${dxaFmt(min.v,1)} (${min.n})${lista}`)
                              : dxaRes('#1f9d55','Z > −2,0','Dentro da faixa esperada para a idade',`Menor Z-score: ${dxaFmt(min.v,1)} (${min.n})${lista}`);
  if(min.v<=-2.5) return dxaRes('#cf2020','Osteoporose','T-score ≤ −2,5',`Menor T-score: ${dxaFmt(min.v,1)} (${min.n})${lista}`);
  if(min.v<-1) return dxaRes('#e07a1f','Osteopenia','T-score entre −1,0 e −2,5',`Menor T-score: ${dxaFmt(min.v,1)} (${min.n})${lista}`);
  return dxaRes('#1f9d55','Normal','T-score ≥ −1,0',`Menor T-score: ${dxaFmt(min.v,1)} (${min.n})${lista}`);
}
function dxaClsUpd(){ const el=document.getElementById('dxa-cls-res'); if(el) el.innerHTML=dxaClsResHTML(); }
function dxaClsSetG(g){ dxaSt('cls').g=g; render(true); }
function dxaClsHTML(){
  const s=dxaSt('cls'), g=s.g||'t', lbl=g==='t'?'T-score':'Z-score';
  return `<div class="ti-wrap">
    <div class="ti-card"><div class="tfg-sec-lbl">Grupo</div>
      <div class="ti-foci" style="margin-top:8px">${[['t','Pós-menopausa / homem ≥ 50 anos (T-score)'],['z','Pré-menopausa / homem < 50 / criança (Z-score)']].map(o=>`<div class="ti-ftog ${g===o[0]?'on':''}" onclick="dxaClsSetG('${o[0]}')">${o[1]}</div>`).join('')}</div>
    </div>
    <div class="ti-card"><div class="tfg-sec-lbl">${lbl} por sítio</div>
      ${dxaInput('cls','col','Coluna lombar','', 'ex.: −2,3','dxaClsUpd')}
      ${dxaInput('cls','colo','Colo do fêmur','', '','dxaClsUpd')}
      ${dxaInput('cls','ft','Fêmur total','', '','dxaClsUpd')}
      ${dxaInput('cls','rad','Rádio 33% (opcional)','', '','dxaClsUpd')}
      <div id="dxa-cls-res">${dxaClsResHTML()}</div>
    </div>
    ${dxaCard('Como é feita a classificação', dxaUl(['Usa o menor valor entre os sítios informados (OMS / ISCD).','Ward e trocanter não entram no diagnóstico.','Pré-menopausa, homens < 50 anos e crianças: Z-score ≤ −2,0 = abaixo da faixa esperada para a idade.']))}
    ${dxaRefsCard()}
  </div>`;
}

/* 2. Mínima variação significativa e comparação entre exames */
function dxaMvsResHTML(){
  const s=dxaSt('mvs'), pe=dxaNum(s.pe), a=dxaNum(s.a), b=dxaNum(s.b);
  let h='';
  if(pe!=null) h += `<div class="ti-legend-row" style="margin-top:10px"><span class="lt"><b>MVS (95%)</b> = 2,77 × ${dxaFmt(pe,2)} = <b>${dxaFmt(2.77*pe,1)}%</b></span></div>`;
  else h += `<div class="ti-legend-row" style="margin-top:10px"><span class="lt">Informe o erro de precisão do serviço (%) para calcular a MVS.</span></div>`;
  if(a!=null && b!=null && a>0){
    const d=b-a, pct=d/a*100, lsc= pe!=null ? 2.77*pe : null;
    const sig = lsc!=null ? Math.abs(pct)>=lsc : null;
    const cor = sig==null ? '#888' : !sig ? '#1f9d55' : d<0 ? '#cf2020' : '#1f8fb0';
    const txt = sig==null ? 'Informe a precisão para avaliar a significância' : !sig ? 'Variação NÃO significativa (estabilidade)' : d<0 ? 'Redução significativa da DMO' : 'Aumento significativo da DMO';
    h += dxaRes(cor, `${pct>0?'+':''}${dxaFmt(pct,1)}%`, txt, `Variação: ${d>0?'+':''}${dxaFmt(d,3)} g/cm² (de ${dxaFmt(a,3)} para ${dxaFmt(b,3)} g/cm²)${lsc!=null?` · MVS ${dxaFmt(lsc,1)}%`:''}`);
  }
  return h;
}
function dxaMvsUpd(){ const el=document.getElementById('dxa-mvs-res'); if(el) el.innerHTML=dxaMvsResHTML(); }
function dxaMvsHTML(){
  return `<div class="ti-wrap">
    <div class="ti-card"><div class="tfg-sec-lbl">Precisão do serviço</div>
      ${dxaInput('mvs','pe','Erro de precisão (CV / RMS-SD)','%','ex.: 1,9','dxaMvsUpd')}
      <div class="tfg-sec-lbl" style="margin-top:14px">Comparação (mesmo aparelho, mesmo sítio)</div>
      ${dxaInput('mvs','a','DMO anterior','g/cm²','ex.: 0,899','dxaMvsUpd')}
      ${dxaInput('mvs','b','DMO atual','g/cm²','ex.: 0,861','dxaMvsUpd')}
      <div id="dxa-mvs-res">${dxaMvsResHTML()}</div>
    </div>
    ${dxaCard('Como usar', dxaUl(['A mínima variação significativa (MVS / LSC) com 95% de confiança é 2,77 × o erro de precisão do técnico/serviço.',
      'A variação só é significativa quando for igual ou maior que a MVS.',
      'Comparar a DMO em g/cm² (não o T-score), no mesmo aparelho; entre aparelhos diferentes é necessária calibração cruzada.',
      'Precisão mínima aceitável (ISCD): coluna 1,9% (MVS 5,3%), fêmur total 1,8% (MVS 5,0%), colo 2,5% (MVS 6,9%).']))}
    ${dxaRefsCard()}
  </div>`;
}

/* ---- registro no catálogo ---- */
DXA_PROTO.forEach(p=>CALCS.push({id:'dxa-p-'+p.id, modality:'dxa', subspec:'dxa', kind:'proto', badge:'DO', title:p.t, desc:p.d, page:()=>dxaProtoHTML(p)}));
CALCS.push({id:'dxa-r-criterios', modality:'dxa', subspec:'dxa', kind:'ref', badge:'DO', title:'Critérios diagnósticos (OMS / ISCD)', desc:'T-score, Z-score, sítios e exclusão de vértebras', page:dxaRefCriteriosHTML});
CALCS.push({id:'dxa-r-indicacoes', modality:'dxa', subspec:'dxa', kind:'ref', badge:'DO', title:'Indicações de densitometria', desc:'Quem deve fazer o exame e quando usar o antebraço', page:dxaRefIndicacoesHTML});
CALCS.push({id:'dxa-r-laudo', modality:'dxa', subspec:'dxa', kind:'ref', badge:'DO', title:'Requisitos do laudo', desc:'Itens obrigatórios e formato dos números (PADI)', page:dxaRefLaudoHTML});
CALCS.push({id:'dxa-c-classificacao', modality:'dxa', subspec:'dxa', kind:'calc', badge:'DO', title:'Classificação densitométrica', desc:'Diagnóstico pelo menor T-score ou Z-score', page:dxaClsHTML});
CALCS.push({id:'dxa-c-mvs', modality:'dxa', subspec:'dxa', kind:'calc', badge:'MVS', title:'Mínima variação significativa', desc:'MVS (LSC) e comparação entre exames', page:dxaMvsHTML});
