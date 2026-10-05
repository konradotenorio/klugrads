/* =========================================================================
   KlugRads — Classificação de Bosniak v2019 (massas renais císticas)
   ---------------------------------------------------------------------------
   Páginas de referência em TC e em RM (Medicina Interna).
   Fontes: Silverman SG, et al. Radiology 2019;292:475-488 e o guia ilustrado
   de Schieda N, et al. RadioGraphics 2021;41(3). Valores conferidos nas
   duas fontes. Ferramenta educacional.
   ========================================================================= */

const BOSNIAK_REFS = [
  'Silverman SG, Pedrosa I, Ellis JH, et al. Bosniak Classification of Cystic Renal Masses, Version 2019: An Update Proposal and Needs Assessment. Radiology. 2019;292(2):475-488. doi:10.1148/radiol.2019182646. PMCID: PMC6677285.',
  'Schieda N, Davenport MS, Krishna S, et al. Bosniak Classification of Cystic Renal Masses, Version 2019: A Pictorial Guide to Clinical Use. RadioGraphics. 2021;41(3). doi:10.1148/rg.2021200160.',
];

const BOSNIAK_DEFS = [
  ['Termo','Definição'],
  ['Massa cística','Menos de cerca de 25% da massa é tecido com realce'],
  ['Não se aplica a','Lesões infecciosas, inflamatórias, vasculares e massas sólidas necróticas'],
  ['Parede ou septo','Fino ≤ 2 mm · minimamente espessado 3 mm · espesso ≥ 4 mm'],
  ['Número de septos','Poucos: 1–3 · muitos: ≥ 4'],
  ['Irregularidade','Protrusão convexa ≤ 3 mm com margens obtusas'],
  ['Nódulo','Protrusão convexa ≥ 4 mm com margens obtusas, ou de qualquer tamanho com margens agudas'],
  ['Realce','Inequívoco à inspeção, ou ≥ 20 HU na TC / ≥ 15% de aumento de sinal na RM'],
  ['Exame','Protocolo de massa renal (TC ou RM)'],
  ['Tamanho','Não faz parte da classificação'],
];

const BOSNIAK_COMMON = {
  IIF: 'Parede lisa minimamente espessada (3 mm) com realce; ou um ou mais septos lisos minimamente espessados (3 mm) com realce; ou muitos (≥ 4) septos lisos e finos (≤ 2 mm) com realce',
  III: 'Uma ou mais paredes ou septos com realce, espessos (≥ 4 mm) ou irregulares (protrusão convexa ≤ 3 mm com margens obtusas)',
  IV:  'Um ou mais nódulos com realce: protrusão convexa ≥ 4 mm com margens obtusas, ou de qualquer tamanho com margens agudas',
};
const BOSNIAK_CONDUTA = [
  ['Classe','Significado','Probabilidade de malignidade','Conduta'],
  ['I','Cisto simples benigno','Praticamente 0%','Nenhuma'],
  ['II','Benigno','< 1%','Sem seguimento'],
  ['IIF','Provavelmente benigno','Baixa (não bem estabelecida)','Seguimento por imagem'],
  ['III','Indeterminado','Cerca de 50%','Vigilância ou tratamento (decisão individualizada)'],
  ['IV','Maligno na maioria dos casos','Cerca de 90%','Tratamento (cirurgia ou ablação)'],
];

function bosniakClassesTC(){
  return [
    ['Classe','Critérios na TC'],
    ['I','Bem definida, parede fina (≤ 2 mm) e lisa; líquido simples homogêneo (−9 a 20 HU); sem septos nem calcificações; a parede pode realçar'],
    ['II','Bem definida, parede fina e lisa, e um dos seis tipos:\n1. Poucos (1–3) septos finos (≤ 2 mm), com qualquer calcificação\n2. Homogênea hiperatenuante (≥ 70 HU) sem contraste\n3. Homogênea, sem realce, > 20 HU no protocolo de massa renal\n4. Homogênea de −9 a 20 HU sem contraste\n5. Homogênea de 21 a 30 HU na fase portal\n6. Homogênea de baixa atenuação, pequena demais para caracterizar'],
    ['IIF', BOSNIAK_COMMON.IIF],
    ['III', BOSNIAK_COMMON.III],
    ['IV', BOSNIAK_COMMON.IV],
  ];
}
function bosniakClassesRM(){
  return [
    ['Classe','Critérios na RM'],
    ['I','Bem definida, parede fina (≤ 2 mm) e lisa; líquido simples homogêneo (sinal semelhante ao do líquor); sem septos nem calcificações; a parede pode realçar'],
    ['II','Bem definida, parede fina e lisa, e um dos três tipos:\n1. Poucos (1–3) septos finos (≤ 2 mm)\n2. Homogênea, marcadamente hiperintensa em T2 (semelhante ao líquor), sem contraste\n3. Homogênea, marcadamente hiperintensa em T1 com supressão de gordura sem contraste (≥ 2,5 vezes o sinal do córtex renal adjacente)'],
    ['IIF', BOSNIAK_COMMON.IIF+'.\nOu: massa sem realce, heterogeneamente hiperintensa em T1 com supressão de gordura sem contraste'],
    ['III', BOSNIAK_COMMON.III],
    ['IV', BOSNIAK_COMMON.IV],
  ];
}

function bosniakPageHTML(mod){
  const T=(title,rows,note)=>`<div class="ti-card">${tableHTML({title,rows},'bos-'+mod+'-'+title)}${note?`<div class="ti-legend-row" style="margin-top:8px"><span class="lt">${esc(note)}</span></div>`:''}</div>`;
  const classes = mod==='rm' ? bosniakClassesRM() : bosniakClassesTC();
  const extra = mod==='rm'
    ? T('Quando preferir a RM', [
        ['Situação na TC'],
        ['Calcificações abundantes'],
        ['Massa homogênea hiperatenuante > 3 cm'],
        ['Massa heterogênea sem realce'],
      ])
    : '';
  return `<div class="ti-wrap">
    ${T('Classificação de Bosniak v2019 — '+(mod==='rm'?'RM':'TC'), classes)}
    ${T('Significado e conduta', BOSNIAK_CONDUTA, 'Use "cisto" apenas para as classes I e II; nas demais, prefira "massa cística" acompanhada da classe de Bosniak.')}
    ${T('Definições', BOSNIAK_DEFS)}
    ${extra}
    <div class="ti-card"><div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${BOSNIAK_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div></div>
  </div>`;
}

CALCS.push({id:'bosniak-tc', modality:'tc', subspec:'rim', badge:'BK', kind:'ref',
  title:'Bosniak v2019 (TC)',
  desc:'Classificação das massas renais císticas na tomografia'});
CALCS.push({id:'bosniak-rm', modality:'rm', subspec:'rim', badge:'BK', kind:'ref',
  title:'Bosniak v2019 (RM)',
  desc:'Classificação das massas renais císticas na ressonância'});
