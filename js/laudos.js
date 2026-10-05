/* =========================================================================
   KlugRads — Laudos estruturados
   ---------------------------------------------------------------------------
   Área ao lado do Visualizador DICOM. Métodos: Radiografia, Mamografia,
   Densitometria óssea, Ultrassonografia, TC e RM.

   Tela de um laudo = dividida em duas:
     • esquerda: itens da máscara; cada item tem "Alterar" para marcar achados
       e medidas;
     • direita: editor de texto (negrito, itálico, sublinhado, fontes Arial /
       Times New Roman / Calibri, tamanho, alinhamentos, listas) com o laudo.
   Cada alteração reescreve só o parágrafo daquele item e a conclusão
   (enquanto a conclusão automática estiver ligada). O resto do texto, editado
   à mão, é preservado.

   Modelos: as máscaras de US do usuário (js/laudos-us-mascaras.js, gerado
   por tools/laudos/parse_mascaras.py). Órgãos com achados estruturados
   (fígado, vesícula, rins, aorta…) usam os controles de LAU_ABD_ITEMS em
   qualquer máscara; os demais itens têm campos (XXX), frases opcionais,
   texto alternativo e frase de conclusão.

   Padrões do usuário (Configurações → Padrões dos laudos): formatação geral
   para todos os laudos e, por laudo, título, textos normais e conclusão.
   ========================================================================= */

const LAUDO_MODS = [
  {id:'rx',   nome:'Radiografia',               ativo:false},
  {id:'mmg',  nome:'Mamografia',                ativo:true},
  {id:'dmo',  nome:'Densitometria óssea',       ativo:true},
  {id:'us',   nome:'Ultrassonografia',          ativo:true},
  {id:'tc',   nome:'Tomografia computadorizada',ativo:true},
  {id:'rm',   nome:'Ressonância magnética',     ativo:false},
];

/* ---------- utilidades de texto ---------- */
const LAU_FONTS = [
  {id:'Arial',           css:'Arial, Helvetica, sans-serif'},
  {id:'Times New Roman', css:'"Times New Roman", Times, serif'},
  {id:'Calibri',         css:'Calibri, Carlito, "Segoe UI", sans-serif'},
];
const LAU_SIZES = [10,11,12,13,14,16,18];
function lauFontCss(id){ const f=LAU_FONTS.find(x=>x.id===id); return f?f.css:LAU_FONTS[0].css; }

function lauHas(v){ return v!=null && String(v).trim()!==''; }
function lauN(v){ return String(v==null?'':v).trim().replace(/\./g,','); }
function lauF(v){ const n=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?null:n; }
function lauMed(v,u){ return lauHas(v) ? `medindo ${lauN(v)} ${u}` : ''; }
function lauDimsTxt(v){ const d=(v||[]).filter(lauHas).map(lauN); return d.length ? `medindo ${d.join(' x ')} cm` : ''; }
function lauVol(a,b,c){ a=lauF(a);b=lauF(b);c=lauF(c); if(!a||!b||!c) return null; return Math.round(a*b*c*0.523); }
function lauJoin(parts){
  return parts.filter(Boolean).reduce((a,b)=> a ? a + (/\b[oa] maior$/.test(a) ? ' ' : ', ') + b : b, '');
}
/* "no segmento VII", "no lobo direito"… */
function lauSeg(v){
  if(!lauHas(v)) return '';
  return /^lobo|^lobos/.test(v) ? `no ${v}` : `no segmento ${v}`;
}
function lauSides(d,e){ return d&&e ? 'bilateral' : d ? 'à direita' : 'à esquerda'; }
/* frase com primeira letra maiúscula e ponto final */
function lauFrase(s){
  s = String(s||'').trim(); if(!s) return '';
  s = s.charAt(0).toUpperCase()+s.slice(1);
  return /[.!?:]$/.test(s) ? s : s+'.';
}

const LAU_SEGS = [['','—'],['I','I'],['II','II'],['III','III'],['IVa','IVa'],['IVb','IVb'],['V','V'],['VI','VI'],['VII','VII'],['VIII','VIII'],['lobo direito','lobo direito'],['lobo esquerdo','lobo esquerdo']];
const LAU_QTD = [['1','Único'],['n','Múltiplos']];

/* =========================================================================
   MODELO — US de abdome total (modo B)
   Cada item: k, label, normal (texto padrão), ctrls (controles do painel
   esquerdo) e build(s) → {txt: texto alterado ou null (= normal), conc: []}.
   ========================================================================= */
const LAU_ABD_ITEMS = [
  /* ---------------- FÍGADO ---------------- */
  {k:'figado', label:'Fígado',
   normal:'com dimensões normais, contornos regulares e bordas finas. Ecotextura parenquimatosa hepática homogênea.',
   ctrls:[
     {t:'radio', k:'dim', lbl:'Dimensões', opts:[['n','Normais'],['aum','Aumentadas'],['red','Reduzidas']]},
     {t:'num', k:'ld', lbl:'Lobo direito (opcional)', unit:'cm', show:s=>s.dim!=='n'},
     {t:'radio', k:'par', lbl:'Parênquima', opts:[['n','Homogêneo'],['est','Esteatose'],['hep','Hepatopatia crônica']]},
     {t:'radio', k:'grau', lbl:'Grau da esteatose', opts:[['1','Leve'],['2','Moderada'],['3','Acentuada']], show:s=>s.par==='est'},
     {t:'check', k:'cisto', lbl:'Cisto simples'},
     {t:'radio', k:'cistoQ', lbl:'Quantidade', opts:LAU_QTD, show:s=>s.cisto, ind:1},
     {t:'num', k:'cistoD', lbl:'Medida (maior)', unit:'cm', show:s=>s.cisto, ind:1},
     {t:'select', k:'cistoS', lbl:'Localização', opts:LAU_SEGS, show:s=>s.cisto, ind:1},
     {t:'check', k:'hem', lbl:'Nódulo sugestivo de hemangioma'},
     {t:'radio', k:'hemQ', lbl:'Quantidade', opts:LAU_QTD, show:s=>s.hem, ind:1},
     {t:'num', k:'hemD', lbl:'Medida (maior)', unit:'cm', show:s=>s.hem, ind:1},
     {t:'select', k:'hemS', lbl:'Localização', opts:LAU_SEGS, show:s=>s.hem, ind:1},
     {t:'check', k:'nod', lbl:'Nódulo sólido indeterminado'},
     {t:'radio', k:'nodE', lbl:'Ecogenicidade', opts:[['hipoecogênico','Hipo'],['hiperecogênico','Hiper'],['isoecogênico','Iso'],['heterogêneo','Heterogêneo']], show:s=>s.nod, ind:1},
     {t:'num', k:'nodD', lbl:'Medida', unit:'cm', show:s=>s.nod, ind:1},
     {t:'select', k:'nodS', lbl:'Localização', opts:LAU_SEGS, show:s=>s.nod, ind:1},
     {t:'check', k:'calc', lbl:'Calcificação / granuloma'},
     {t:'num', k:'calcD', lbl:'Medida', unit:'cm', show:s=>s.calc, ind:1},
     {t:'select', k:'calcS', lbl:'Localização', opts:LAU_SEGS, show:s=>s.calc, ind:1},
   ],
   build(s){
     const conc=[]; let alt=false;
     const dimTxt = {n:'normais', aum:'aumentadas', red:'reduzidas'}[s.dim];
     const ld = lauHas(s.ld) ? ` (lobo direito ${lauMed(s.ld,'cm')})` : '';
     if(s.dim==='aum'){ alt=true; conc.push('Hepatomegalia.'); }
     if(s.dim==='red'){ alt=true; }
     let cont='contornos regulares e bordas finas', eco='Ecotextura parenquimatosa hepática homogênea.';
     if(s.par==='est'){
       alt=true;
       eco = {
         '1':'Ecogenicidade parenquimatosa difusamente aumentada, de grau leve, com boa caracterização das paredes dos vasos portais e do diafragma.',
         '2':'Parênquima hepático com ecotextura homogênea e aumento difuso da ecogenicidade, que atenua o feixe acústico posterior e diminui a sensibilidade para a detecção de eventuais lesões.',
         '3':'Parênquima hepático com aumento acentuado e difuso da ecogenicidade, com atenuação do feixe acústico posterior, que prejudica a avaliação das paredes dos vasos portais e do diafragma e diminui a sensibilidade para a detecção de eventuais lesões.',
       }[s.grau];
       conc.push({'1':'Esteatose hepática leve (grau I).','2':'Esteatose hepática moderada (grau II).','3':'Esteatose hepática acentuada (grau III).'}[s.grau]);
     }
     if(s.par==='hep'){
       alt=true;
       cont='contornos irregulares (lobulados) e bordas rombas';
       eco='Ecotextura parenquimatosa difusamente heterogênea, de aspecto grosseiro.';
       conc.push('Sinais ultrassonográficos de hepatopatia crônica.');
     }
     if(s.dim==='red' && s.par!=='hep') conc.push('Fígado de dimensões reduzidas.');
     const ext=[];
     if(s.cisto){ alt=true; const loc=lauSeg(s.cistoS), m=lauMed(s.cistoD,'cm');
       if(s.cistoQ==='n'){ ext.push(lauFrase(lauJoin([`imagens císticas simples (anecogênicas, de paredes finas, com reforço acústico posterior) esparsas pelo parênquima, a maior ${loc}`.trim(), m]))); conc.push('Cistos hepáticos simples.'); }
       else { ext.push(lauFrase(lauJoin([`imagem cística simples (anecogênica, de paredes finas, com reforço acústico posterior) ${loc}`.trim(), m]))); conc.push('Cisto hepático simples.'); }
     }
     if(s.hem){ alt=true; const loc=lauSeg(s.hemS), m=lauMed(s.hemD,'cm');
       if(s.hemQ==='n'){ ext.push(lauFrase(lauJoin([`nódulos hiperecogênicos, homogêneos e bem delimitados, o maior ${loc}`.trim(), m]) + ', com aspecto sugestivo de hemangiomas')); conc.push('Nódulos hepáticos com aspecto ultrassonográfico sugestivo de hemangiomas.'); }
       else { ext.push(lauFrase(lauJoin([`nódulo hiperecogênico, homogêneo e bem delimitado ${loc}`.trim(), m]) + ', com aspecto sugestivo de hemangioma')); conc.push('Nódulo hepático com aspecto ultrassonográfico sugestivo de hemangioma.'); }
     }
     if(s.nod){ alt=true; ext.push(lauFrase(lauJoin([`nódulo sólido ${s.nodE} ${lauSeg(s.nodS)}`.trim(), lauMed(s.nodD,'cm')])));
       conc.push('Nódulo hepático sólido indeterminado. Sugere-se complementação com método seccional (TC ou RM com contraste).'); }
     if(s.calc){ alt=true; ext.push(lauFrase(lauJoin([`foco hiperecogênico com sombra acústica posterior ${lauSeg(s.calcS)}`.trim(), lauMed(s.calcD,'cm')]) + ', compatível com calcificação (granuloma calcificado)'));
       conc.push('Calcificação hepática (granuloma calcificado).'); }
     if(!alt) return {txt:null, conc:[]};
     // lesões focais: "Ecotextura … homogênea, exceto por …" (montado em lauItemHTML)
     const txt = `com dimensões ${dimTxt}${ld}, ${cont}. ${eco}`;
     return {txt, conc, les:ext};
   }},

  /* ---------------- VEIAS PORTA E HEPÁTICAS ---------------- */
  {k:'porta', label:'Veias porta e hepáticas',
   normal:'com calibres preservados.',
   ctrls:[
     {t:'check', k:'pAum', lbl:'Veia porta com calibre aumentado'},
     {t:'num', k:'pD', lbl:'Calibre da veia porta', unit:'mm', show:s=>s.pAum, ind:1},
     {t:'check', k:'hDil', lbl:'Veias hepáticas e VCI dilatadas'},
     {t:'check', k:'hp', lbl:'Sinais de hipertensão portal'},
     {t:'check', k:'hpG', lbl:'Colaterais perigástricas', show:s=>s.hp, ind:1},
     {t:'check', k:'hpE', lbl:'Colaterais periesofágicas', show:s=>s.hp, ind:1},
     {t:'check', k:'hpR', lbl:'Colaterais esplenorrenais', show:s=>s.hp, ind:1},
     {t:'check', k:'hpU', lbl:'Recanalização da veia paraumbilical', show:s=>s.hp, ind:1},
   ],
   build(s){
     if(!s.pAum && !s.hDil && !s.hp) return {txt:null, conc:[]};
     const conc=[], p=[];
     p.push(s.pAum ? lauFrase(lauJoin(['veia porta com calibre aumentado', lauMed(s.pD,'mm')])) : 'Veia porta com calibre preservado.');
     p.push(s.hDil ? 'Veias hepáticas e veia cava inferior dilatadas.' : 'Veias hepáticas com calibres preservados.');
     if(s.pAum) conc.push('Aumento do calibre da veia porta' + (lauHas(s.pD)?` (${lauN(s.pD)} mm)`:'') + '.');
     if(s.hDil) conc.push('Dilatação das veias hepáticas e da veia cava inferior, que pode estar relacionada a congestão hepática.');
     if(s.hp){
       const col=[s.hpG&&'perigástricos', s.hpE&&'periesofágicos', s.hpR&&'esplenorrenais'].filter(Boolean);
       const colC=[s.hpG&&'perigástricas', s.hpE&&'periesofágicas', s.hpR&&'esplenorrenais'].filter(Boolean);
       if(col.length || s.hpU){
         let f = col.length ? `vasos colaterais ${lauJuntaE(col)}` : '';
         if(s.hpU) f = f ? `${f}, além de recanalização da veia paraumbilical` : 'recanalização da veia paraumbilical';
         p.push(lauFrase('circulação colateral portossistêmica: ' + f));
       } else p.push('Sinais de circulação colateral portossistêmica.');
       const det=[colC.length?`colaterais ${lauJuntaE(colC)}`:'', s.hpU?'recanalização da veia paraumbilical':''].filter(Boolean);
       conc.push(`Sinais de hipertensão portal${det.length?` (${det.join(' e ')})`:''}.`);
       if(s.pAum){ const i=conc.findIndex(c=>/^Aumento do calibre da veia porta/.test(c)); if(i>=0) conc.splice(i,1); }
     }
     /* o rótulo já diz "Veias porta e hepáticas:" — frase começa em minúscula */
     const t = p.join(' ');
     return {txt: t.charAt(0).toLowerCase()+t.slice(1), conc};
   }},

  /* ---------------- VESÍCULA BILIAR ---------------- */
  {k:'vesicula', label:'Vesícula biliar',
   normal:'tópica, normodistendida, com paredes finas e regulares e conteúdo anecogênico, sem cálculos.',
   ctrls:[
     {t:'radio', k:'est', lbl:'Situação', opts:[['n','Normodistendida'],['hipo','Pouco distendida'],['cx','Colecistectomia']]},
     {t:'check', k:'calc', lbl:'Cálculo(s)', show:s=>s.est!=='cx'},
     {t:'radio', k:'calcQ', lbl:'Quantidade', opts:LAU_QTD, show:s=>s.est!=='cx'&&s.calc, ind:1},
     {t:'num', k:'calcD', lbl:'Medida (maior)', unit:'cm', show:s=>s.est!=='cx'&&s.calc, ind:1},
     {t:'radio', k:'calcM', lbl:'Mobilidade', opts:[['m','Móvel'],['imp','Impactado no infundíbulo']], show:s=>s.est!=='cx'&&s.calc, ind:1},
     {t:'check', k:'lama', lbl:'Lama biliar', show:s=>s.est!=='cx'},
     {t:'check', k:'pol', lbl:'Pólipo(s)', show:s=>s.est!=='cx'},
     {t:'radio', k:'polQ', lbl:'Quantidade', opts:LAU_QTD, show:s=>s.est!=='cx'&&s.pol, ind:1},
     {t:'num', k:'polD', lbl:'Medida (maior)', unit:'cm', show:s=>s.est!=='cx'&&s.pol, ind:1},
     {t:'check', k:'par', lbl:'Paredes espessadas', show:s=>s.est!=='cx'},
     {t:'num', k:'parD', lbl:'Espessura', unit:'mm', show:s=>s.est!=='cx'&&s.par&&!s.ccA, ind:1},
     {t:'check', k:'ccA', lbl:'Sinais de colecistite aguda', show:s=>s.est!=='cx'},
     {t:'num', k:'parD', lbl:'Espessura da parede', unit:'mm', show:s=>s.est!=='cx'&&s.ccA, ind:1},
     {t:'radio', k:'mur', lbl:'Sinal de Murphy ultrassonográfico', opts:[['','Não informar'],['pos','Positivo'],['neg','Negativo']], show:s=>s.est!=='cx'&&s.ccA, ind:1},
   ],
   build(s){
     if(s.est==='cx') return {txt:'não caracterizada (status pós-colecistectomia).', conc:['Status pós-colecistectomia.']};
     if(s.est==='n' && !s.calc && !s.lama && !s.pol && !s.par && !s.ccA) return {txt:null, conc:[]};
     const conc=[];
     const dist = s.ccA ? 'distendida' : 'normodistendida';
     const paredes = s.ccA ? 'com paredes espessadas e edemaciadas' + (lauHas(s.parD)?` (${lauN(s.parD)} mm)`:'')
                   : s.par ? 'com paredes difusamente espessadas' + (lauHas(s.parD)?` (${lauN(s.parD)} mm)`:'')
                   : 'com paredes finas e regulares';
     const semCalc = !s.calc ? ', sem cálculos' : '';
     // cálculo ou lama: o conteúdo deixa de ser anecogênico
     let t = (s.calc || s.lama)
       ? `tópica, ${dist}, ${paredes.replace(/^com /,'de ')}, com conteúdo hiperecogênico de permeio.`
       : `tópica, ${dist}, ${paredes} e conteúdo anecogênico${semCalc}.`;
     // pouco distendida: a parede não é avaliável — só a limitação
     if(s.est==='hipo' && !s.ccA) t = 'tópica, pouco distendida, limitando a sua avaliação.' + (s.par ? ' ' + lauFrase('paredes aparentemente espessadas' + (lauHas(s.parD)?` (${lauN(s.parD)} mm)`:'')) : '');
     if(s.calc){
       const m=lauMed(s.calcD,'cm');
       if(s.calcQ==='n') t += ' ' + lauFrase(lauJoin([`múltiplos cálculos em seu interior, ${s.calcM==='imp'?'um deles impactado no infundíbulo':'móveis'}, com sombra acústica posterior, o maior`, m]));
       else t += ' ' + lauFrase(lauJoin([`cálculo único em seu interior, ${s.calcM==='imp'?'impactado no infundíbulo':'móvel'}, com sombra acústica posterior`, m]));
     }
     if(s.lama) t += ' Material ecogênico, sem sombra acústica, depositado na porção pendente (lama biliar).';
     if(s.pol){
       const m=lauMed(s.polD,'cm');
       t += ' ' + lauFrase(s.polQ==='n' ? lauJoin(['imagens polipoides aderidas à parede, fixas, sem sombra acústica, a maior', m]) : lauJoin(['imagem polipoide aderida à parede, fixa, sem sombra acústica', m]));
     }
     if(s.ccA && s.mur==='pos') t += ' Sinal de Murphy ultrassonográfico positivo.';
     if(s.ccA && s.mur==='neg') t += ' Sinal de Murphy ultrassonográfico negativo.';
     const mur = s.mur==='pos' ? ', com sinal de Murphy ultrassonográfico positivo' : '';
     if(s.ccA) conc.push((s.calc ? 'Achados sugestivos de colecistite aguda litiásica' : 'Achados sugestivos de colecistite aguda') + mur + '.');
     else if(s.calc) conc.push(s.calcM==='imp' ? 'Colelitíase, com cálculo impactado no infundíbulo.' : 'Colelitíase.');
     if(s.ccA && s.calcM==='imp' && s.calc) conc.push('Cálculo impactado no infundíbulo.');
     if(s.lama) conc.push('Lama biliar.');
     if(s.pol) conc.push(s.polQ==='n' ? 'Pólipos na vesícula biliar.' : 'Pólipo na vesícula biliar.');
     if(s.par && !s.ccA) conc.push('Espessamento parietal difuso da vesícula biliar.');
     if(s.est==='hipo' && !s.ccA) conc.push('Vesícula biliar pouco distendida, com avaliação limitada.');
     return {txt:t, conc};
   }},

  /* ---------------- VIAS BILIARES ---------------- */
  {k:'vias', label:'Vias biliares intra e extra-hepáticas',
   normal:'sem dilatações.',
   ctrls:[
     {t:'radio', k:'dil', lbl:'Dilatação', opts:[['n','Ausente'],['ie','Intra e extra-hepática'],['i','Só intra-hepática'],['e','Só extra-hepática']]},
     {t:'num', k:'col', lbl:'Colédoco (opcional)', unit:'mm'},
     {t:'check', k:'cl', lbl:'Cálculo no colédoco'},
     {t:'num', k:'clD', lbl:'Medida', unit:'cm', show:s=>s.cl, ind:1},
   ],
   build(s){
     if(s.dil==='n' && !s.cl && !lauHas(s.col)) return {txt:null, conc:[]};
     const conc=[]; const col = lauHas(s.col) ? `${lauN(s.col)} mm` : '';
     let t;
     if(s.dil==='n') t = `sem dilatações${col?`, com colédoco medindo ${col}`:''}.`;
     else if(s.dil==='ie') t = `dilatadas${col?`, com colédoco medindo ${col}`:''}.`;
     else if(s.dil==='i') t = `dilatação das vias biliares intra-hepáticas, com colédoco de calibre preservado${col?` (${col})`:''}.`;
     else t = `colédoco dilatado${col?`, medindo ${col}`:''}, sem dilatação das vias biliares intra-hepáticas.`;
     if(s.cl) t += ' ' + lauFrase(lauJoin(['imagem ecogênica com sombra acústica posterior no interior do colédoco, sugestiva de cálculo', lauMed(s.clD,'cm')]));
     if(s.dil==='ie') conc.push('Dilatação das vias biliares intra e extra-hepáticas.');
     if(s.dil==='i') conc.push('Dilatação das vias biliares intra-hepáticas.');
     if(s.dil==='e') conc.push('Dilatação do colédoco.');
     if(s.cl) conc.push('Imagem sugestiva de coledocolitíase.');
     return {txt:t, conc};
   }},

  /* ---------------- PÂNCREAS ---------------- */
  {k:'pancreas', label:'Pâncreas',
   normal:'com dimensões, contornos e ecogenicidade normais.',
   ctrls:[
     {t:'radio', k:'vis', lbl:'Avaliação', opts:[['c','Completa'],['p','Parcial (gases)'],['nv','Não caracterizado']]},
     {t:'radio', k:'eco', lbl:'Ecogenicidade', opts:[['n','Normal'],['aum','Aumentada']], show:s=>s.vis!=='nv'},
     {t:'check', k:'wir', lbl:'Ducto pancreático dilatado', show:s=>s.vis!=='nv'},
     {t:'num', k:'wirD', lbl:'Calibre', unit:'mm', show:s=>s.vis!=='nv'&&s.wir, ind:1},
     {t:'check', k:'cis', lbl:'Lesão cística', show:s=>s.vis!=='nv'},
     {t:'num', k:'cisD', lbl:'Medida', unit:'cm', show:s=>s.vis!=='nv'&&s.cis, ind:1},
     {t:'select', k:'cisL', lbl:'Localização', opts:[['cabeça','Cabeça'],['processo uncinado','Processo uncinado'],['corpo','Corpo'],['cauda','Cauda']], show:s=>s.vis!=='nv'&&s.cis, ind:1},
   ],
   build(s){
     if(s.vis==='nv') return {txt:'não caracterizado devido à interposição gasosa intestinal.', conc:[]};
     if(s.vis==='c' && s.eco==='n' && !s.wir && !s.cis) return {txt:null, conc:[]};
     const conc=[];
     let t = s.eco==='aum' ? 'com dimensões e contornos normais e ecogenicidade difusamente aumentada.' : 'com dimensões, contornos e ecogenicidade normais.';
     if(s.vis==='p') t = 'parcialmente caracterizado devido à interposição gasosa intestinal; nas porções avaliadas, ' + t;
     if(s.wir) t += ' ' + lauFrase(lauJoin(['ducto pancreático principal dilatado', lauMed(s.wirD,'mm')]));
     if(s.cis) t += ' ' + lauFrase(lauJoin([`imagem cística ${/^(cabeça|cauda)$/.test(s.cisL)?'na':'no'} ${s.cisL}`, lauMed(s.cisD,'cm')]));
     if(s.eco==='aum') conc.push('Aumento difuso da ecogenicidade pancreática, que pode corresponder a lipossubstituição.');
     if(s.wir) conc.push('Dilatação do ducto pancreático principal.');
     if(s.cis) conc.push('Lesão cística pancreática. Sugere-se complementação com RM e colangiorressonância.');
     return {txt:t, conc};
   }},

  /* ---------------- BAÇO ---------------- */
  {k:'baco', label:'Baço',
   normal:'com dimensões normais, homogêneo.',
   ctrls:[
     {t:'radio', k:'dim', lbl:'Dimensões', opts:[['n','Normais'],['aum','Aumentadas'],['cx','Esplenectomia']]},
     {t:'num', k:'comp', lbl:'Maior eixo (opcional)', unit:'cm', show:s=>s.dim!=='cx'},
     {t:'num', k:'trans', lbl:'Eixo transversal (opcional, para o índice esplênico)', unit:'cm', show:s=>s.dim!=='cx'},
     {t:'check', k:'acs', lbl:'Baço acessório', show:s=>s.dim!=='cx'},
     {t:'num', k:'acsD', lbl:'Medida', unit:'cm', show:s=>s.dim!=='cx'&&s.acs, ind:1},
     {t:'check', k:'cal', lbl:'Calcificações (granulomas)', show:s=>s.dim!=='cx'},
     {t:'check', k:'cis', lbl:'Cisto', show:s=>s.dim!=='cx'},
     {t:'num', k:'cisD', lbl:'Medida', unit:'cm', show:s=>s.dim!=='cx'&&s.cis, ind:1},
   ],
   build(s){
     if(s.dim==='cx') return {txt:'não caracterizado (status pós-esplenectomia).', conc:['Status pós-esplenectomia.']};
     if(s.dim==='n' && !lauHas(s.comp) && !s.acs && !s.cal && !s.cis) return {txt:null, conc:[]};
     const conc=[]; const c = lauHas(s.comp) ? `${lauN(s.comp)} cm` : '';
     // índice esplênico uniplanar = maior eixo × eixo transversal (normal < 60, aba Referências → Baço); só com as duas medidas
     const L=lauF(s.comp), T=lauF(s.trans), idx = L && T ? Math.round(L*T*10)/10 : null;
     const idxTxt = idx!=null ? lauN(String(idx)) : '';
     const med = idx!=null ? `maior eixo de ${c} e eixo transversal de ${lauN(s.trans)} cm; índice esplênico de ${idxTxt}` : c ? `${c} no maior eixo` : '';
     const aum = s.dim==='aum' || (idx!=null && idx>=60);   // índice ≥ 60: dimensões aumentadas
     let t = aum
       ? `com dimensões aumentadas${med?` (${med})`:''}, homogêneo.`
       : `com dimensões normais${med?` (${med})`:''}, homogêneo.`;
     if(s.acs) t += ' ' + lauFrase(lauJoin(['pequena imagem nodular junto ao hilo esplênico, com ecogenicidade semelhante à do baço', lauMed(s.acsD,'cm')]) + ', compatível com baço acessório');
     const les=[];
     if(s.cal) les.push('focos hiperecogênicos esparsos com sombra acústica posterior, compatíveis com calcificações (granulomas)');
     if(s.cis) les.push(lauJoin(['imagem cística simples no parênquima esplênico', lauMed(s.cisD,'cm')]));
     if(aum) conc.push('Esplenomegalia' + (idx!=null ? ` (índice esplênico de ${idxTxt})` : c?` (${c})`:'') + '.');
     if(s.acs) conc.push('Baço acessório.');
     if(s.cal) conc.push('Granulomas calcificados esplênicos.');
     if(s.cis) conc.push('Cisto esplênico.');
     return {txt:t, conc, les};
   }},

  /* ---------------- RINS ---------------- */
  {k:'rins', label:'Rins',
   normal:'tópicos, de dimensões normais, com espessura e ecogenicidade parenquimatosas preservadas, sem hidronefrose ou cálculos detectáveis ao método.',
   ctrls: ['D','E'].flatMap(L=>{
     const nome = L==='D' ? 'Rim direito' : 'Rim esquerdo';
     const ok = s=>s['est'+L]!=='cx';
     return [
       {t:'head', lbl:nome},
       {t:'radio', k:'est'+L, lbl:'Situação', opts:[['n','Normal'],['nef','Nefropatia'],['cx','Nefrectomia']]},
       {t:'radio', k:'dim'+L, lbl:'Dimensões', opts:[['n','Normais'],['red','Reduzidas'],['aum','Aumentadas']], show:ok},
       {t:'num', k:'comp'+L, lbl:'Comprimento (opcional)', unit:'cm', show:ok},
       {t:'num', k:'parq'+L, lbl:'Parênquima (opcional)', unit:'cm', show:ok},
       {t:'check', k:'calc'+L, lbl:'Cálculo(s)', show:ok},
       {t:'radio', k:'calcQ'+L, lbl:'Quantidade', opts:LAU_QTD, show:s=>ok(s)&&s['calc'+L], ind:1},
       {t:'num', k:'calcD'+L, lbl:'Medida (maior)', unit:'cm', show:s=>ok(s)&&s['calc'+L], ind:1},
       {t:'select', k:'calcL'+L, lbl:'Localização', opts:[['','—'],['grupo calicinal superior','Cálice superior'],['grupo calicinal médio','Cálice médio'],['grupo calicinal inferior','Cálice inferior'],['pelve renal','Pelve renal']], show:s=>ok(s)&&s['calc'+L], ind:1},
       {t:'check', k:'hid'+L, lbl:'Hidronefrose', show:ok},
       {t:'radio', k:'hidG'+L, lbl:'Grau', opts:[['leve','Leve'],['moderada','Moderada'],['acentuada','Acentuada']], show:s=>ok(s)&&s['hid'+L], ind:1},
       {t:'check', k:'cis'+L, lbl:'Cisto(s) simples', show:ok},
       {t:'radio', k:'cisQ'+L, lbl:'Quantidade', opts:LAU_QTD, show:s=>ok(s)&&s['cis'+L], ind:1},
       {t:'num', k:'cisD'+L, lbl:'Medida (maior)', unit:'cm', show:s=>ok(s)&&s['cis'+L], ind:1},
       {t:'select', k:'cisL'+L, lbl:'Localização', opts:[['','—'],['terço superior','Terço superior'],['terço médio','Terço médio'],['terço inferior','Terço inferior']], show:s=>ok(s)&&s['cis'+L], ind:1},
       {t:'check', k:'nod'+L, lbl:'Nódulo', show:ok},
       {t:'dims', k:'nodV'+L, lbl:'Medidas', show:s=>ok(s)&&s['nod'+L], ind:1},
       {t:'radio', k:'nodE'+L, lbl:'Ecogenicidade', opts:[['','—'],['hipoecogênico','Hipoecogênico'],['isoecogênico','Isoecogênico'],['hiperecogênico','Hiperecogênico'],['heterogêneo','Heterogêneo']], show:s=>ok(s)&&s['nod'+L], ind:1},
       {t:'radio', k:'nodC'+L, lbl:'Contornos', opts:[['','—'],['regulares','Regulares'],['lobulados','Lobulados'],['irregulares','Irregulares']], show:s=>ok(s)&&s['nod'+L], ind:1},
       {t:'select', k:'nodL'+L, lbl:'Localização', opts:[['','—'],['terço superior','Terço superior'],['terço médio','Terço médio'],['terço inferior','Terço inferior']], show:s=>ok(s)&&s['nod'+L], ind:1},
     ];
   }),
   build(s){
     const lado = L=>{
       const alt = s['est'+L]!=='n' || s['dim'+L]!=='n' || s['calc'+L] || s['hid'+L] || s['cis'+L] || s['nod'+L];
       return {alt, med: lauHas(s['comp'+L]) || lauHas(s['parq'+L])};
     };
     const D=lado('D'), E=lado('E');
     const nodTxt = (L, onde)=>{ if(s['est'+L]==='cx' || !s['nod'+L]) return '';
       const desc=[s['nodE'+L], lauHas(s['nodC'+L])?`de contornos ${s['nodC'+L]}`:''].filter(lauHas).join(', ');
       const loc = lauHas(s['nodL'+L]) ? `no ${s['nodL'+L]} ${onde?onde.replace(/^no /,'do '):''}`.trim() : (onde||'');
       return ' ' + lauFrase(lauJoin([`nódulo sólido${desc?' '+desc:''}`, loc, lauDimsTxt(s['nodV'+L])])); };
     const medTxt = L=>{
       const c=s['comp'+L], p=s['parq'+L];
       return [lauHas(c)?`${lauN(c)} cm de comprimento`:'', lauHas(p)?`parênquima de ${lauN(p)} cm`:''].filter(Boolean).join(' e ');
     };
     if(!D.alt && !E.alt){
       if(!D.med && !E.med) return {txt:null, conc:[]};
       const m=[];
       if(D.med) m.push(`rim direito com ${medTxt('D')}`);
       if(E.med) m.push(`rim esquerdo com ${medTxt('E')}`);
       return {txt: LAU_NORMAL('rins') + ' ' + lauFrase('medidas: ' + m.join('; ')), conc:[]};
     }
     const desc = L=>{
       const nome = L==='D'?'Rim direito':'Rim esquerdo';
       if(s['est'+L]==='cx') return `${nome} não caracterizado (status pós-nefrectomia).`;
       const dim = {n:'normais',red:'reduzidas',aum:'aumentadas'}[s['dim'+L]];
       const med = medTxt(L);
       const par = s['est'+L]==='nef'
         ? 'com ecogenicidade parenquimatosa aumentada e diferenciação corticomedular reduzida'
         : 'com espessura e ecogenicidade parenquimatosas preservadas';
       let t = `${nome} tópico, de dimensões ${dim}${med?` (${med})`:''}, ${par}.`;
       const sem=[];
       if(s['hid'+L]) t += ` Dilatação ${s['hidG'+L]} do sistema pielocalicinal (hidronefrose ${s['hidG'+L]}).`; else sem.push('hidronefrose');
       if(s['calc'+L]){
         const loc = lauHas(s['calcL'+L]) ? `no ${s['calcL'+L]}`.replace('no pelve','na pelve') : '';
         t += ' ' + lauFrase(s['calcQ'+L]==='n'
           ? lauJoin([`cálculos esparsos, o maior ${loc}`.trim(), lauMed(s['calcD'+L],'cm')])
           : lauJoin([`cálculo ${loc}`.trim(), lauMed(s['calcD'+L],'cm')]));
       } else sem.push('cálculos');
       if(s['cis'+L]){
         const loc = lauHas(s['cisL'+L]) ? `no ${s['cisL'+L]}` : '';
         t += ' ' + lauFrase(s['cisQ'+L]==='n'
           ? lauJoin([`cistos simples, o maior ${loc}`.trim(), lauMed(s['cisD'+L],'cm')])
           : lauJoin([`cisto simples ${loc}`.trim(), lauMed(s['cisD'+L],'cm')]));
       }
       t += nodTxt(L, '');
       if(sem.length===2) t += ' Sem hidronefrose ou cálculos detectáveis ao método.';
       else if(sem[0]==='hidronefrose') t += ' Sem hidronefrose.';
       else if(sem[0]==='cálculos') t += ' Sem cálculos detectáveis ao método.';
       return t;
     };
     /* descrição conjunta ("Rins tópicos, …") quando a base dos dois lados é igual
        (mesma situação e mesmas dimensões); frases separadas por lado só quando
        diferem (ex.: nefropatia unilateral, rim reduzido de um lado, nefrectomia) */
     const juntos = s.estD!=='cx' && s.estE!=='cx' && s.estD===s.estE && s.dimD===s.dimE;
     const descJunto = ()=>{
       const dim = {n:'normais',red:'reduzidas',aum:'aumentadas'}[s.dimD];
       const m=[];
       if(D.med) m.push(`rim direito com ${medTxt('D')}`);
       if(E.med) m.push(`rim esquerdo com ${medTxt('E')}`);
       const par = s.estD==='nef'
         ? 'com ecogenicidade parenquimatosa aumentada e diferenciação corticomedular reduzida'
         : 'com espessura e ecogenicidade parenquimatosas preservadas';
       let t = `tópicos, de dimensões ${dim}${m.length?` (${m.join('; ')})`:''}, ${par}.`;
       const doRim = L => L==='D'?'do rim direito':'do rim esquerdo';
       const noRim = L => L==='D'?'no rim direito':'no rim esquerdo';
       // hidronefrose
       if(s.hidD && s.hidE && s.hidGD===s.hidGE) t += ` Dilatação ${s.hidGD} do sistema pielocalicinal bilateralmente (hidronefrose ${s.hidGD} bilateral).`;
       else ['D','E'].forEach(L=>{ if(s['hid'+L]) t += ` Dilatação ${s['hidG'+L]} do sistema pielocalicinal ${doRim(L)} (hidronefrose ${s['hidG'+L]}).`; });
       // cálculos
       ['D','E'].forEach(L=>{
         if(!s['calc'+L]) return;
         const l = s['calcL'+L];
         const loc = !lauHas(l) ? noRim(L)
           : l==='pelve renal' ? `na pelve renal ${L==='D'?'direita':'esquerda'}`
           : `no ${l} ${doRim(L)}`;
         t += ' ' + lauFrase(s['calcQ'+L]==='n'
           ? lauJoin([lauHas(l) ? `cálculos esparsos ${noRim(L)}, o maior ${l==='pelve renal'?'na pelve renal':'no '+l}` : `cálculos esparsos ${noRim(L)}, o maior`, lauMed(s['calcD'+L],'cm')])
           : lauJoin([`cálculo ${loc}`, lauMed(s['calcD'+L],'cm')]));
       });
       // cistos
       ['D','E'].forEach(L=>{
         if(!s['cis'+L]) return;
         const l = s['cisL'+L];
         t += ' ' + lauFrase(s['cisQ'+L]==='n'
           ? lauJoin([lauHas(l) ? `cistos simples ${noRim(L)}, o maior no ${l}` : `cistos simples ${noRim(L)}, o maior`, lauMed(s['cisD'+L],'cm')])
           : lauJoin([lauHas(l) ? `cisto simples no ${l} ${doRim(L)}` : `cisto simples ${noRim(L)}`, lauMed(s['cisD'+L],'cm')]));
       });
       ['D','E'].forEach(L=>{ t += nodTxt(L, L==='D'?'no rim direito':'no rim esquerdo'); });
       const semH = !s.hidD && !s.hidE, semC = !s.calcD && !s.calcE;
       if(semH && semC) t += ' Sem hidronefrose ou cálculos detectáveis ao método.';
       else if(semH) t += ' Sem hidronefrose.';
       else if(semC) t += ' Sem cálculos detectáveis ao método.';
       return t;
     };
     const conc=[];
     const both=(fn)=>{ const d=fn('D'), e=fn('E'); return d||e ? lauSides(d,e) : null; };
     ['D','E'].forEach(L=>{ if(s['est'+L]!=='cx' && s['est'+L]!=='nef' && s['dim'+L]!=='n'){ const c=lauHas(s['comp'+L])?` (${lauN(s['comp'+L])} cm)`:''; conc.push(`${L==='D'?'Rim direito':'Rim esquerdo'} de dimensões ${s['dim'+L]==='red'?'reduzidas':'aumentadas'}${c}.`); } });
     let x;
     if(s.estD==='cx') conc.push('Status pós-nefrectomia direita.');
     if(s.estE==='cx') conc.push('Status pós-nefrectomia esquerda.');
     if((x=both(L=>s['est'+L]==='nef'))) conc.push(`Sinais de nefropatia parenquimatosa ${x}.`);
     if((x=both(L=>s['est'+L]!=='cx'&&s['calc'+L]))) conc.push(`Nefrolitíase ${x}.`);
     if(s.estD!=='cx' && s.estE!=='cx' && s.hidD && s.hidE && s.hidGD===s.hidGE) conc.push(`Hidronefrose ${s.hidGD} bilateral.`);
     else ['D','E'].forEach(L=>{ if(s['est'+L]!=='cx' && s['hid'+L]) conc.push(`Hidronefrose ${s['hidG'+L]} ${L==='D'?'à direita':'à esquerda'}.`); });
     const cD=s.estD!=='cx'&&s.cisD, cE=s.estE!=='cx'&&s.cisE;
     if(cD&&cE) conc.push('Cistos renais simples bilaterais.');
     else if(cD||cE){ const L=cD?'D':'E'; conc.push(`${s['cisQ'+L]==='n'?'Cistos renais simples':'Cisto renal simples'} ${cD?'à direita':'à esquerda'}.`); }
     ['D','E'].forEach(L=>{ if(s['est'+L]==='cx' || !s['nod'+L]) return; const lado = L==='D'?'à direita':'à esquerda';
       conc.push(s['nodE'+L]==='hiperecogênico'
         ? `Nódulo renal hiperecogênico ${lado}, que pode corresponder a angiomiolipoma. Sugere-se complementação com TC ou RM para caracterização.`
         : `Nódulo renal sólido ${lado}. Sugere-se complementação com TC ou RM para caracterização.`); });
     return {txt: juntos ? descJunto() : `${desc('D')} ${desc('E')}`, conc};
   }},

  /* ---------------- BEXIGA ---------------- */
  {k:'bexiga', label:'Bexiga',
   normal:'com paredes regulares e conteúdo anecogênico.',
   ctrls:[
     {t:'radio', k:'rep', lbl:'Repleção', opts:[['n','Adequada'],['pouca','Repleção parcial'],['sonda','Vazia com sonda']]},
     {t:'check', k:'par', lbl:'Paredes espessadas / trabeculadas', show:s=>s.rep!=='sonda'},
     {t:'num', k:'parD', lbl:'Espessura', unit:'mm', show:s=>s.rep!=='sonda'&&s.par, ind:1},
     {t:'check', k:'cal', lbl:'Cálculo', show:s=>s.rep!=='sonda'},
     {t:'num', k:'calD', lbl:'Medida', unit:'cm', show:s=>s.rep!=='sonda'&&s.cal, ind:1},
     {t:'check', k:'vol', lbl:'Volume pré-miccional', show:s=>s.rep==='n'},
     {t:'dims', k:'volV', lbl:'Medidas (L × AP × T)', show:s=>s.rep==='n'&&s.vol, ind:1},
     {t:'check', k:'res', lbl:'Resíduo pós-miccional', show:s=>s.rep==='n'},
     {t:'dims', k:'resV', lbl:'Medidas (L × AP × T)', show:s=>s.rep==='n'&&s.res, ind:1},
   ],
   build(s){
     if(s.rep==='sonda') return {txt:'vazia, com sonda vesical de demora em seu interior.', conc:[]};
     // laudos de próstata: "Volume pré-miccional" já vem marcado (volAuto) e só entra no texto quando calculado
     const volOn = s.vol && !(s.volAuto && lauVol(...(s.volV||[]))==null);
     if(s.rep==='n' && !s.par && !s.cal && !volOn && !s.res) return {txt:null, conc:[]};
     const conc=[];
     let t = s.rep==='pouca' ? 'com repleção parcial, limitando a avaliação de suas paredes. Conteúdo anecogênico.'
           : s.par ? 'com paredes difusamente espessadas e trabeculadas' + (lauHas(s.parD)?` (${lauN(s.parD)} mm)`:'') + ' e conteúdo anecogênico.'
           : s.volAuto ? 'com repleção satisfatória, paredes regulares e conteúdo anecogênico.'
           : 'com paredes regulares e conteúdo anecogênico.';
     if(s.rep==='pouca' && s.par) t += ' ' + lauFrase('paredes aparentemente espessadas' + (lauHas(s.parD)?` (${lauN(s.parD)} mm)`:''));
     if(s.cal) t += ' ' + lauFrase(lauJoin(['imagem ecogênica móvel com sombra acústica posterior em seu interior, compatível com cálculo', lauMed(s.calD,'cm')]));
     const v = s.vol ? lauVol(...(s.volV||[])) : null;
     const r = s.res ? lauVol(...(s.resV||[])) : null;
     if(volOn) t += v!=null ? ` Volume pré-miccional estimado em ${v} mL.` : ' Volume pré-miccional estimado em ___ mL.';
     if(s.res) t += r!=null ? ` Resíduo pós-miccional estimado em ${r} mL.` : ' Resíduo pós-miccional estimado em ___ mL.';
     if(s.par) conc.push('Espessamento parietal vesical difuso.');
     if(s.cal) conc.push('Litíase vesical.');
     if(s.res && r!=null) conc.push(`Resíduo pós-miccional de ${r} mL.`);
     return {txt:t, conc};
   }},

  /* ---------------- AORTA ---------------- */
  {k:'aorta', label:'Aorta abdominal',
   normal:'com calibre normal.',
   ctrls:[
     {t:'radio', k:'vis', lbl:'Avaliação', opts:[['c','Completa'],['p','Parcial (gases)'],['nv','Não caracterizada']]},
     {t:'radio', k:'est', lbl:'Aspecto', opts:[['n','Normal'],['ate','Ateromatose'],['ect','Ectasia'],['an','Aneurisma']], show:s=>s.vis!=='nv'},
     {t:'num', k:'diam', lbl:'Diâmetro máximo', unit:'cm', show:s=>s.est==='ect'||s.est==='an'},
     {t:'select', k:'seg', lbl:'Segmento', opts:[['infrarrenal','Infrarrenal'],['justarrenal','Justarrenal'],['suprarrenal','Suprarrenal']], show:s=>s.est==='an'},
     {t:'num', k:'ext', lbl:'Extensão (opcional)', unit:'cm', show:s=>s.est==='an'},
     {t:'check', k:'tro', lbl:'Trombo mural', show:s=>s.est==='an'},
   ],
   build(s){
     if(s.vis==='nv') return {txt:'não caracterizada devido à interposição gasosa intestinal.', conc:[]};
     const pc = s.vis==='p' ? 'parcialmente caracterizada devido à interposição gasosa intestinal; nas porções avaliadas, ' : '';
     const r = lauAortaBuild(s);
     if(!pc) return r;
     return {txt: pc + (r.txt || 'com calibre normal.'), conc:r.conc};
   }},

  /* ---------------- PERITÔNEO / RETROPERITÔNIO ---------------- */
  {k:'peritoneo', label:'Peritôneo / retroperitôneo',
   normal:'Ausência de líquido livre ou coleções detectáveis.',
   ctrls:[
     {t:'check', k:'liq', lbl:'Líquido livre'},
     {t:'radio', k:'liqG', lbl:'Quantidade', opts:[['pequena','Pequena'],['moderada','Moderada'],['grande','Grande']], show:s=>s.liq, ind:1},
     {t:'select', k:'liqL', lbl:'Localização', opts:[['difuso pela cavidade abdominal','Difuso'],['no espaço hepatorrenal','Hepatorrenal'],['peri-hepático','Peri-hepático'],['periesplênico','Periesplênico'],['na pelve','Pelve'],['nas goteiras parietocólicas','Goteiras parietocólicas']], show:s=>s.liq, ind:1},
     {t:'check', k:'col', lbl:'Coleção'},
     {t:'text', k:'colL', lbl:'Localização', ph:'ex.: no flanco direito', show:s=>s.col, ind:1},
     {t:'dims', k:'colV', lbl:'Medidas', show:s=>s.col, ind:1},
     {t:'check', k:'lin', lbl:'Linfonodomegalia retroperitoneal'},
     {t:'num', k:'linD', lbl:'Maior (menor eixo)', unit:'cm', show:s=>s.lin, ind:1},
   ],
   build(s){
     if(!s.liq && !s.col && !s.lin) return {txt:null, conc:[]};
     const conc=[], p=[];
     if(s.liq){ p.push(`${s.liqG.charAt(0).toUpperCase()+s.liqG.slice(1)} quantidade de líquido livre ${s.liqL}.`);
       conc.push(`${s.liqG.charAt(0).toUpperCase()+s.liqG.slice(1)} quantidade de líquido livre na cavidade abdominal.`); }
     else p.push('Ausência de líquido livre.');
     if(s.col){
       const v=s.colV||[], ms=v.filter(lauHas).map(lauN), vol=lauVol(...v);
       p.push(lauFrase(`coleção ${lauHas(s.colL)?s.colL.trim():''}`.trim() + (ms.length?`, medindo ${ms.join(' x ')} cm`:'') + (vol!=null?` (volume estimado de ${vol} mL)`:'')));
       conc.push(lauFrase(`coleção ${lauHas(s.colL)?s.colL.trim():''}`.trim()));
     }
     if(s.lin){ p.push(lauFrase(lauJoin(['linfonodos retroperitoneais aumentados, o maior', lauHas(s.linD)?`medindo ${lauN(s.linD)} cm no menor eixo`:''])));
       conc.push('Linfonodomegalia retroperitoneal.'); }
     return {txt:p.join(' '), conc};
   }},
];

/* Itens com achados estruturados, reaproveitados em qualquer máscara que
   tenha o mesmo órgão (o texto normal vem da própria máscara). */
function lauAortaBuild(s){
     if(s.est==='n' || !s.est) return {txt:null, conc:[]};
     const d = lauHas(s.diam) ? `${lauN(s.diam)} cm` : '';

     if(s.est==='ate') return {txt:'com calibre normal e placas parietais calcificadas.', conc:['Ateromatose aórtica.']};
     if(s.est==='ect') return {txt:`com calibre aumentado${d?`, medindo ${d} de diâmetro máximo`:''}, sem configurar aneurisma.`, conc:[`Ectasia da aorta abdominal${d?` (${d})`:''}.`]};
     let t = `com dilatação aneurismática fusiforme no segmento ${s.seg}${d?`, medindo ${d} de diâmetro máximo`:''}${lauHas(s.ext)?` e ${lauN(s.ext)} cm de extensão`:''}`;
     t += s.tro ? ', com trombo mural.' : '.';
     return {txt:t, conc:[`Aneurisma da aorta abdominal ${s.seg}${d?`, com ${d} de diâmetro máximo`:''}${s.tro?', com trombo mural':''}.`]};
}
const LAU_STRUCT = {};
LAU_ABD_ITEMS.forEach(it=>LAU_STRUCT[it.k]=it);
const LAU_STRUCT_LABELS = {
  'figado':'figado', 'veias porta e hepaticas':'porta', 'vesicula biliar':'vesicula',
  'vias biliares intra e extra-hepaticas':'vias', 'pancreas':'pancreas', 'baco':'baco',
  'rins':'rins', 'bexiga':'bexiga', 'aorta abdominal':'aorta',
  'peritoneo e retroperitoneo':'peritoneo', 'peritoneo / retroperitoneo':'peritoneo',
  'cirurgias previas':'cirurgia', 'alcas intestinais':'alcas', 'elastografia hepatica':'elasto',
};
/* Elastografia hepática (2D-SWE): conclusão automática pela faixa do valor (SRU 2020)
   e alerta de qualidade quando IQR/mediana > 30% */
LAU_STRUCT.elasto = {k:'elasto', label:'Elastografia hepática', noNF:true,
  normal:'realizada com a técnica “shear wave” (2D-SWE), com medidas múltiplas. Mediana das elasticidades (liver stiffness) no lobo direito calculada em XXX kPa (IQR/med: XXX%).',
  ctrls:[
    {t:'radio', k:'marca', lbl:'Aparelho', opts:[['','Não informar'],['Samsung','Samsung'],['GE','GE'],['Philips','Philips'],['Mindray','Mindray'],['outra','Outra']]},
    {t:'text', k:'modelo', lbl:'Modelo do aparelho (opcional)', ph:'ex.: RS85, LOGIQ E10, EPIQ Elite, Resona I9'},
    {t:'num', k:'kpa', lbl:'Mediana da elasticidade', unit:'kPa'},
    {t:'num', k:'iqr', lbl:'IQR/mediana', unit:'%'},
  ],
  build(s){
    const k=lauF(s.kpa), q=lauF(s.iqr);
    const ap = [s.marca&&s.marca!=='outra'?s.marca:'', lauHas(s.modelo)?s.modelo.trim():''].filter(Boolean).join(' ');
    if(k==null && !ap) return {txt:null, conc:['Elastografia hepática por 2D-SWE com índice de elasticidade calculado em ___ kPa.']};
    const kv=k==null?'___':lauN(s.kpa), qv=lauHas(s.iqr)?lauN(s.iqr):'';
    let t=`realizada${ap?` em equipamento ${ap}`:''} com a técnica “shear wave” (2D-SWE), com medidas múltiplas. Mediana das elasticidades (liver stiffness) no lobo direito calculada em ${kv} kPa${qv?` (IQR/med: ${qv}%)`:''}.`;
    if(k==null) return {txt:t, conc:['Elastografia hepática por 2D-SWE com índice de elasticidade calculado em ___ kPa.']};
    const inf = k<5 ? 'inferindo ausência de fibrose (normal)'
      : k<9 ? 'inferindo ausência de fibrose clinicamente significativa'
      : k<13 ? 'inferindo presença de fibrose clinicamente significativa'
      : k<=17 ? 'inferindo cirrose'
      : 'inferindo cirrose, com valor sugestivo de hipertensão portal clinicamente significativa (F4)';
    const conc=[`Elastografia hepática por 2D-SWE com índice de elasticidade calculado em ${kv} kPa, ${inf}.`];
    if(q!=null && q>30){
      t += ` A relação IQR/mediana (${qv}%) está acima de 30%, indicando grande variabilidade entre as medidas.`;
      conc.push(`Qualidade técnica da elastografia abaixo do recomendado (IQR/mediana de ${qv}%, acima de 30%): o valor obtido tem menor confiabilidade e deve ser interpretado com cautela, podendo o exame ser repetido.`);
    }
    return {txt:t, conc};
  }};
/* Alças intestinais — apêndice e intussuscepção */
LAU_STRUCT.alcas = {k:'alcas', label:'Alças intestinais', hideNormal:true,   // só entra no laudo quando marcado
  normal:'sem distensão ou espessamento parietal detectáveis ao método.',
  ctrls:[
    {t:'radio', k:'ap', lbl:'Apêndice cecal', opts:[['ns','Não descrever'],['n','Normal'],['nc','Não caracterizado'],['ap','Apendicite']]},
    {t:'num', k:'apD', lbl:'Calibre (opcional)', unit:'mm', show:s=>s.ap==='n'||s.ap==='ap', ind:1},
    {t:'check', k:'apL', lbl:'Apendicolito', show:s=>s.ap==='ap', ind:1},
    {t:'check', k:'apG', lbl:'Densificação da gordura periapendicular', show:s=>s.ap==='ap', ind:1},
    {t:'check', k:'apQ', lbl:'Líquido periapendicular', show:s=>s.ap==='ap', ind:1},
    {t:'check', k:'apC', lbl:'Coleção / abscesso periapendicular', show:s=>s.ap==='ap', ind:1},
    {t:'check', k:'int', lbl:'Intussuscepção'},
    {t:'select', k:'intL', lbl:'Localização', opts:[['no flanco direito','Flanco direito'],['na fossa ilíaca direita','Fossa ilíaca direita'],['no hipocôndrio direito','Hipocôndrio direito'],['no mesogástrio','Mesogástrio'],['no epigástrio','Epigástrio'],['no hipocôndrio esquerdo','Hipocôndrio esquerdo'],['no flanco esquerdo','Flanco esquerdo'],['na fossa ilíaca esquerda','Fossa ilíaca esquerda']], show:s=>s.int, ind:1},
    {t:'num', k:'intD', lbl:'Diâmetro (opcional)', unit:'cm', show:s=>s.int, ind:1},
  ],
  build(s){
    if(s.ap==='ns' && !s.int) return {txt:null, conc:[]};
    const conc=[]; const base = LAU_NORMAL('alcas') || 'sem distensão ou espessamento parietal detectáveis ao método.';
    let t = s.int ? 'sem distensão difusa.' : base;
    const d = lauHas(s.apD) ? ` (${lauN(s.apD)} mm)` : '';
    if(s.ap==='n') t += ` Apêndice cecal caracterizado, compressível, de calibre normal${d}, sem sinais inflamatórios.`;
    if(s.ap==='nc') t += ' Apêndice cecal não caracterizado.';
    if(s.ap==='ap'){
      const ex=[s.apL&&'apendicolito (imagem ecogênica com sombra acústica em sua luz)', s.apG&&'densificação (hiperecogenicidade) da gordura periapendicular', s.apQ&&'pequena quantidade de líquido periapendicular'].filter(Boolean);
      t += ` Apêndice cecal não compressível, com calibre aumentado${d} e paredes espessadas${ex.length?', com '+lauJuntaE(ex):''}.`;
      if(s.apC) t += ' Coleção periapendicular com conteúdo espesso, sugestiva de abscesso.';
      conc.push(s.apC ? 'Achados ultrassonográficos compatíveis com apendicite aguda complicada com coleção periapendicular.'
                      : 'Achados ultrassonográficos compatíveis com apendicite aguda' + (s.apL?', com apendicolito':'') + '.');
    }
    if(s.int){
      t += ' ' + lauFrase(lauJoin([`imagem em "alvo" no corte transversal e em "pseudorrim" no longitudinal ${s.intL||'no flanco direito'}`, lauHas(s.intD)?`medindo ${lauN(s.intD)} cm de diâmetro`:'']) + ', compatível com intussuscepção intestinal');
      conc.push('Achados compatíveis com intussuscepção intestinal.');
    }
    return {txt:t, conc};
  }};

/* Mama — cirurgias prévias (mamoplastia, mastectomia com/sem reconstrução, implantes) */
const LAU_LADO = [['bi','Bilateral'],['d','Direita'],['e','Esquerda']];
function lauLadoTxt(v, plural){ return v==='d' ? 'à direita' : v==='e' ? 'à esquerda' : (plural?'bilaterais':'bilateral'); }
LAU_STRUCT.cirurgia = {k:'cirurgia', label:'Cirurgias prévias', hideNormal:true,   // sem nada marcado, não aparece no laudo
  normal:'sem sinais de intervenção cirúrgica prévia.',
  ctrls:[
    {t:'check', k:'mamo', lbl:'Mamoplastia'},
    {t:'radio', k:'mamoT', lbl:'Tipo', opts:[['red','Redutora'],['aum','De aumento'],['out','Outra / não especificada']], show:s=>s.mamo, ind:1},
    {t:'radio', k:'mamoL', lbl:'Lado', opts:LAU_LADO, show:s=>s.mamo, ind:1},
    {t:'check', k:'mast', lbl:'Mastectomia'},
    {t:'radio', k:'mastL', lbl:'Lado', opts:[['d','Direita'],['e','Esquerda'],['bi','Bilateral']], show:s=>s.mast, ind:1},
    {t:'radio', k:'rec', lbl:'Reconstrução', opts:[['nao','Não'],['sim','Sim']], show:s=>s.mast, ind:1},
    {t:'radio', k:'recT', lbl:'Tipo de reconstrução', opts:[['impl','Implante mamário'],['ret','Retalho miocutâneo']], show:s=>s.mast&&s.rec==='sim', ind:1},
    {t:'check', k:'impl', lbl:'Implantes mamários'},
    {t:'radio', k:'implL', lbl:'Lado', opts:LAU_LADO, show:s=>s.impl, ind:1},
    {t:'radio', k:'implP', lbl:'Posição (opcional)', opts:[['ne','Não especificar'],['rg','Retroglandular'],['rm','Retromuscular'],['pp','Pré-peitoral'],['sf','Subfascial']], show:s=>s.impl, ind:1},
    {t:'radio', k:'implI', lbl:'Integridade', opts:[['ok','Íntegro'],['intra','Rotura intracapsular'],['extra','Rotura extracapsular']], show:s=>s.impl, ind:1},
  ],
  build(s){
    if(!s.mamo && !s.mast && !s.impl) return {txt:null, conc:[]};
    const p=[], conc=[];
    if(s.mamo){
      const tipo = {red:'redutora ', aum:'de aumento ', out:''}[s.mamoT];
      p.push(`sinais de mamoplastia ${tipo}${lauLadoTxt(s.mamoL)}.`);
      conc.push(`Status pós-mamoplastia ${tipo}${lauLadoTxt(s.mamoL)}.`.replace('  ',' '));
    }
    if(s.mast){
      const lado = s.mastL==='bi' ? 'bilateral' : s.mastL==='d' ? 'direita' : 'esquerda';
      const rec = s.rec==='sim' ? (s.recT==='ret' ? ', com reconstrução com retalho miocutâneo' : ', com reconstrução com implante mamário') : ', sem reconstrução';
      p.push(`status pós-mastectomia ${lado}${rec}.`);
      conc.push(`Status pós-mastectomia ${lado}${rec}.`);
    }
    if(s.impl){
      const pl = s.implL==='bi';
      const POS = {rg:['retroglandular','retroglandulares'], rm:['retromuscular','retromusculares'], pp:['pré-peitoral','pré-peitorais'], sf:['subfascial','subfasciais']}[s.implP];
      const pos = POS ? ' '+POS[1] : '', posS = POS ? ' '+POS[0] : '';
      const integ = {ok: pl?'íntegros, de contornos regulares':'íntegro, de contornos regulares',
        intra: 'com linhas ecogênicas paralelas em seu interior (sinal da escada), sugerindo rotura intracapsular',
        extra: 'com área hiperecogênica e sombra acústica difusa adjacente (padrão em tempestade de neve), compatível com silicone livre — rotura extracapsular'}[s.implI];
      p.push(`${pl?'implantes mamários'+pos:'implante mamário'+posS} ${lauLadoTxt(s.implL, pl)}, ${integ}.`);
      if(s.implI==='ok') conc.push(pl ? 'Implantes mamários íntegros.' : `Implante mamário ${lauLadoTxt(s.implL)} íntegro.`);
      else conc.push(`Sinais de rotura ${s.implI==='intra'?'intracapsular':'extracapsular'} de implante mamário ${lauLadoTxt(s.implL)}.`);
    }
    const t = p.map((x,i)=> i ? x.charAt(0).toUpperCase()+x.slice(1) : x).join(' ');
    return {txt:t, conc};
  }};
function lauNorm(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim(); }

/* =========================================================================
   MAMOGRAFIA — itens estruturados (composição ACR e cirurgias prévias)
   ========================================================================= */
const LAU_STRUCT_LABELS_MMG = { 'tecnica':'mgtec', 'composicao mamaria':'mgcomp', 'cirurgias previas':'mgcir' };
/* técnica: incidências complementares (o texto padrão vem da máscara) */
const LAU_MG_INC = [['mag','Magnificação com compressão seletiva','magnificação com compressão seletiva'],['comp','Compressão localizada','compressão localizada'],
  ['ccx','Crânio-caudal exagerada','crânio-caudal exagerada'],['clv','Cleavage ou incidência medial exagerada','cleavage (incidência medial exagerada)'],
  ['rol','Mama “rolada”','mama “rolada”'],['perf','Perfil','perfil'],['cleo','Cleópatra','Cleópatra'],['axi','Incidência axilar','axilar']];
LAU_STRUCT.mgtec = {k:'mgtec', label:'Técnica',
  normal:'exame realizado em mamógrafo digital, nas incidências craniocaudal e mediolateral oblíqua bilaterais.',
  ctrls:[{t:'check', k:'eklund', lbl:'Implantes: incidências com manobra de Eklund'}, {t:'head', lbl:'Incidências complementares'}]
    .concat(LAU_MG_INC.map(o=>({t:'check', k:'i_'+o[0], lbl:o[1]})))
    .concat([{t:'text', k:'incOut', lbl:'Outra (opcional)', ph:'ex.: tangencial'},
             {t:'radio', k:'incL', lbl:'Mama', opts:[['ne','Não especificar'],['d','Direita'],['e','Esquerda'],['bi','Bilateral']], show:s=>LAU_MG_INC.some(o=>s['i_'+o[0]])||lauHas(s.incOut)}]),
  build(s){
    const l = LAU_MG_INC.filter(o=>s['i_'+o[0]]).map(o=>o[2]);
    if(lauHas(s.incOut)) l.push(s.incOut.trim());
    if(!l.length && !s.eklund) return {txt:null, conc:[]};
    let base = LAU_NORMAL('mgtec').trim().replace(/\.?$/,'.');
    if(s.eklund) base = base.replace(/\.$/, ', complementadas por incidências com deslocamento posterior dos implantes (manobra de Eklund).');
    if(!l.length) return {txt:base, conc:[]};
    const lado = {d:' da mama direita', e:' da mama esquerda', bi:' bilaterais'}[s.incL]||'';
    return {txt:`${base} ${l.length>1?'Realizadas incidências complementares':'Realizada incidência complementar'}${lado}: ${lauJuntaE(l)}.`, conc:[]};
  }};
/* mama única (mamografia unilateral) ou as duas */
function lauMgSing(){ const L=state.lau, m=L&&lauModelo(L.model); return !!(m && m.metodo==='mmg' && (L.lado==='d'||L.lado==='e')); }
/* mamografia unilateral (lado escolhido no início): textos da máscara no singular */
function lauMgUni(m){ const L=state.lau; return !!(m && m.metodo==='mmg' && L && L.model===m.id && (L.lado==='d'||L.lado==='e')); }
function lauMgUniTxt(t){
  return String(t||'').replace(/ bilaterais(?=[.,;])/g,'').replace(/^mamas com /,'mama com ')
    .replace(/complexos areolopapilares/g,'complexo areolopapilar').replace(/nos prolongamentos axilares/g,'no prolongamento axilar');
}
LAU_STRUCT.mgcomp = {k:'mgcomp', label:'Composição mamária',
  normal:'mamas com densidades fibroglandulares esparsas (padrão ACR B).',
  ctrls:[
    {t:'radio', k:'acr', lbl:'Composição (ACR BI-RADS®)', def:'b', opts:[['a','A — predominantemente adiposas'],['b','B — densidades fibroglandulares esparsas'],['c','C — heterogeneamente densas'],['d','D — extremamente densas']]},
  ],
  build(s){
    if(s.acr==='b') return {txt:null, conc:[]};
    const sg=lauMgSing(), M=sg?'mama':'mamas';
    const t = {
      a:`${M} ${sg?'predominantemente adiposa':'predominantemente adiposas'} (padrão ACR A).`,
      c:`${M} ${sg?'heterogeneamente densa':'heterogeneamente densas'} (padrão ACR C), o que pode ocultar pequenos nódulos.`,
      d:`${M} ${sg?'extremamente densa':'extremamente densas'} (padrão ACR D), o que reduz a sensibilidade da mamografia.`,
    }[s.acr];
    return {txt:t, conc:[]};
  }};
LAU_STRUCT.mgcir = {k:'mgcir', label:'Cirurgias prévias', hideNormal:true,   // sem nada marcado, não aparece no laudo
  normal:'sem sinais de intervenção cirúrgica prévia.',
  ctrls:[
    {t:'check', k:'cons', lbl:'Cirurgia conservadora (setorectomia / quadrantectomia)'},
    {t:'radio', k:'consL', lbl:'Lado', opts:[['d','Direita'],['e','Esquerda'],['bi','Bilateral']], show:s=>s.cons, ind:1},
    {t:'check', k:'mamo', lbl:'Mamoplastia'},
    {t:'radio', k:'mamoT', lbl:'Tipo', opts:[['red','Redutora'],['out','Outra / não especificada']], show:s=>s.mamo, ind:1},
    {t:'radio', k:'mamoL', lbl:'Lado', opts:LAU_LADO, show:s=>s.mamo, ind:1},
    {t:'check', k:'mast', lbl:'Mastectomia'},
    {t:'radio', k:'mastL', lbl:'Lado', opts:[['d','Direita'],['e','Esquerda']], show:s=>s.mast, ind:1},
    {t:'radio', k:'rec', lbl:'Reconstrução', opts:[['nao','Não'],['impl','Implante mamário'],['ret','Retalho miocutâneo']], show:s=>s.mast, ind:1},
    {t:'check', k:'impl', lbl:'Implantes mamários'},
    {t:'radio', k:'implL', lbl:'Lado', opts:LAU_LADO, show:s=>s.impl, ind:1},
    {t:'radio', k:'implP', lbl:'Posição (opcional)', opts:[['ne','Não especificar'],['rg','Retroglandular'],['rp','Retropeitoral']], show:s=>s.impl, ind:1},
    {t:'radio', k:'implI', lbl:'Aspecto', opts:[['ok','Contornos regulares'],['irr','Contorno irregular'],['extra','Silicone livre (rotura extracapsular)']], show:s=>s.impl, ind:1},
  ],
  build(s){
    if(!s.cons && !s.mamo && !s.mast && !s.impl) return {txt:null, conc:[]};
    const p=[], conc=[];
    const mamaDe = v => v==='bi' ? 'em ambas as mamas' : `na mama ${v==='d'?'direita':'esquerda'}`;
    if(s.cons){
      p.push(`sinais de cirurgia conservadora ${mamaDe(s.consL)}, com alterações cicatriciais no sítio cirúrgico.`);
      conc.push(`Alterações pós-cirúrgicas ${mamaDe(s.consL)} (cirurgia conservadora).`);
    }
    if(s.mamo){
      const tipo = s.mamoT==='red' ? 'redutora ' : '';
      p.push(`sinais de mamoplastia ${tipo}${lauLadoTxt(s.mamoL)}, com alterações arquiteturais de aspecto cicatricial.`);
      conc.push(`Status pós-mamoplastia ${tipo}${lauLadoTxt(s.mamoL)}.`);
    }
    if(s.mast){
      const lado = s.mastL==='d' ? 'direita' : 'esquerda';
      const rec = s.rec==='impl' ? ', com reconstrução com implante mamário' : s.rec==='ret' ? ', com reconstrução com retalho miocutâneo' : '';
      p.push(`status pós-mastectomia ${lado}${rec}.`);
      conc.push(`Status pós-mastectomia ${lado}${rec}.`);
    }
    if(s.impl){
      const pl = s.implL==='bi';
      const POS = {rg:['retroglandular','retroglandulares'], rp:['retropeitoral','retropeitorais']}[s.implP];
      const pos = POS ? ' '+POS[pl?1:0] : '';
      const asp = s.implI==='extra'
        ? 'com material de densidade de silicone fora dos limites do implante, sugerindo rotura extracapsular'
        : s.implI==='irr' ? `com contorno focalmente irregular, que pode corresponder a herniação ou dobra${pl?'':' do implante'}`
        : `de contornos regulares, sem sinais mamográficos de rotura extracapsular`;
      p.push(`${pl?'implantes mamários':'implante mamário'}${pos} ${lauLadoTxt(s.implL, pl)}, ${asp}.`);
      conc.push(s.implI==='extra' ? `Sinais de rotura extracapsular de implante mamário ${lauLadoTxt(s.implL)}.`
              : s.implI==='irr' ? `Irregularidade de contorno de implante mamário ${lauLadoTxt(s.implL)}; a ressonância magnética pode ser considerada para avaliação da integridade.`
              : (pl ? 'Implantes mamários sem sinais mamográficos de rotura extracapsular.' : `Implante mamário ${lauLadoTxt(s.implL)} sem sinais mamográficos de rotura extracapsular.`)
                + ' A mamografia não avalia adequadamente a integridade intracapsular; quando necessário, a ressonância magnética é o método indicado.');
    }
    const t = p.map((x,i)=> i ? x.charAt(0).toUpperCase()+x.slice(1) : x).join(' ');
    return {txt:t, conc};
  }};

/* ---------- Mamografia: léxico ACR BI-RADS® (mamografia) ----------
   Cada "kind" tem descritores (chips), sugestão de categoria (o médico
   confirma), texto do laudo e conclusão. Localização: quadrante + terço. */
const LAU_MG_LOC = [['QSL','quadrante superolateral','no'],['QSM','quadrante superomedial','no'],['QIL','quadrante inferolateral','no'],['QIM','quadrante inferomedial','no'],
  ['JQS','junção dos quadrantes superiores','na'],['JQI','junção dos quadrantes inferiores','na'],['JQL','junção dos quadrantes laterais','na'],['JQM','junção dos quadrantes mediais','na'],
  ['Retroareolar','região retroareolar','na'],['Central','região central','na'],['Prolong. axilar','prolongamento axilar','no']];
const LAU_MG_PROF = ['terço anterior','terço médio','terço posterior'];
const LAU_MG_CATS = ['0','2','3','4A','4B','4C','5','6'];
function lauMgLocTxt(d, html, obrig){
  if(d.loc==null) return obrig ? lauMk('localização',html) : '';
  const l=LAU_MG_LOC[d.loc]; let t=`${l[2]} ${l[1]}`;
  if(d.prof!=null) t += `, ${LAU_MG_PROF[d.prof]}`;
  return html ? esc(t) : t;
}
/* medidas opcionais: tudo em branco → some do texto */
function lauMgMed(f, vals, html){
  if(!lauHas(f.t)) return '';
  if(!(vals||[]).some(lauHas) && f.medOpc) return '';
  return lauSemDistVazia(lauFill(f.t, vals, html));
}
const LAU_MG_KINDS = {
  mgnod: {
    desc:{
      forma:{l:'Forma', o:['oval','redonda','irregular']},
      margem:{l:'Margens', o:['circunscritas','obscurecidas','microlobuladas','indistintas','espiculadas']},
      dens:{l:'Densidade', o:['alta','igual ao parênquima','baixa','com conteúdo de gordura'], t:['de alta densidade','isodenso ao parênquima','de baixa densidade','com conteúdo de gordura']},
    },
    sug(d){
      if(d.forma==null && d.margem==null && d.dens==null) return null;
      if(d.dens===3) return '2';
      if(d.forma===2 && d.margem===4) return '5';
      const susp = (d.forma===2) + (d.margem!=null && d.margem>=2) + (d.dens===0);
      if(d.margem===1 && !susp) return '0';
      return !susp ? '3' : susp===1 ? '4A' : susp===2 ? '4B' : '4C';
    },
    x:()=>['nódulos'],
    text(f, d, w, loc, med, cat){ return `Nódulo de forma ${w('forma')}, margens ${w('margem')}, ${w('dens')}, ${loc}${med?', '+med:''}. Categoria BI-RADS®: ${cat}.`; },
    conc(d, L, pl){ return `${pl?'Nódulos semelhantes':'Nódulo'} na ${L}`; },
  },
  mgcalc: {
    desc:{
      morf:{l:'Morfologia', o:['cutâneas','vasculares','grosseiras ("em pipoca")','em bastão (secretórias)','redondas / puntiformes','anelares (centro lucente)','distróficas','em "leite de cálcio"','em fio de sutura',
                             'amorfas','grosseiras heterogêneas','finas pleomórficas','finas lineares / lineares ramificadas']},
      dist:{l:'Distribuição', o:['difusa','regional','agrupada','linear','segmentar']},
    },
    sug(d){
      if(d.morf==null) return null;
      if(d.morf<=8) return '2';
      if(d.morf===9 && d.dist===0) return '2';
      let c = d.morf===12 ? '4C' : '4B';
      if(d.dist===3 || d.dist===4) c = c==='4B' ? '4C' : '5';
      return c;
    },
    x:(d)=> d.morf!=null && d.morf>8 ? ['calcificações suspeitas'] : [],
    text(f, d, w, loc, med, cat){ return `Calcificações ${w('morf')}, de distribuição ${w('dist')}${loc?', '+loc:''}${med?', '+med:''}. Categoria BI-RADS®: ${cat}.`; },
    conc(d, L){ return d.morf!=null && d.morf<=8 ? `Calcificações de aspecto benigno na ${L}` : `Calcificações ${d.morf!=null?LAU_MG_KINDS.mgcalc.desc.morf.o[d.morf]:''}${d.dist!=null?' de distribuição '+LAU_MG_KINDS.mgcalc.desc.dist.o[d.dist]:''} na ${L}`.replace('  ',' '); },
  },
  mgass: {
    desc:{
      tipo:{l:'Tipo', o:['vista em uma incidência','global','focal','em desenvolvimento'],
            t:['Assimetria vista em apenas uma incidência','Assimetria global','Assimetria focal','Assimetria focal em desenvolvimento (nova ou maior que no exame anterior)']},
    },
    sug(d){ return d.tipo==null ? null : ['0','2','0','4'][d.tipo]; },
    x:()=>['assimetrias'],
    text(f, d, w, loc, med, cat){ return `${d.tipo==null?lauMk('Assimetria ___',w.html):w('tipo')}${loc?' '+loc:''}${med?', '+med:''}, sem nódulo, calcificações suspeitas ou distorção arquitetural associados. Categoria BI-RADS®: ${cat}.`; },
    conc(d, L){ return `${['Assimetria em uma incidência','Assimetria global','Assimetria focal','Assimetria em desenvolvimento'][d.tipo]||'Assimetria'} na ${L}`; },
  },
  mgdist: {
    desc:{
      tipo:{l:'Tipo', o:['fora de sítio cirúrgico','em sítio cirúrgico'],
            t:['Distorção arquitetural, sem nódulo definido associado','Distorção arquitetural no sítio cirúrgico, de aspecto cicatricial']},
    },
    sug(d){ return d.tipo==null ? null : ['4','2'][d.tipo]; },
    x:()=>['distorção arquitetural'],
    text(f, d, w, loc, med, cat){ return [d.tipo==null?lauMk('Distorção arquitetural ___',w.html):w('tipo'), loc, med].filter(Boolean).join(', ') + `. Categoria BI-RADS®: ${cat}.`; },
    conc(d, L){ return d.tipo===1 ? `Distorção arquitetural cicatricial (sítio cirúrgico) na ${L}` : `Distorção arquitetural na ${L}`; },
  },
};
function lauMgK(f){ return f && LAU_MG_KINDS[f.kind] || null; }
function lauMgCat(f, d){ const K=lauMgK(f); return d.cat || (K ? K.sug(d) : null); }
function lauMgText(f, id, bag, html){
  const K=lauMgK(f), d=bag['d'+id]||{};
  const w=(k)=>{ const D=K.desc[k]; if(d[k]==null) return lauMk('___',html); const v=(D.t||D.o)[d[k]]; return html?esc(v):v; };
  w.html=html;
  const cat=lauMgCat(f,d);
  const loc=lauMgLocTxt(d, html, f.kind==='mgnod'||f.kind==='mgcalc');
  return K.text(f, d, w, loc, lauMgMed(f, bag['f'+id], html), cat?esc(cat):lauMk('?',html));
}
function lauMgConc(f, id, bag, lbl, plural){
  const K=lauMgK(f), d=bag['d'+id]||{}, cat=lauMgCat(f,d);
  const L=String(lbl||'mama').toLowerCase().replace(/:$/,'');
  return `${esc(K.conc(d, L, plural))} — BI-RADS® ${cat?esc(cat)+': '+esc(lauManejo(cat)):lauMk('?',true)}.`;
}
/* manejo por categoria; na mamografia o controle é mamográfico */
function lauManejo(cat){
  const t=LAU_BR_MANEJO[cat]||''; const L=state.lau, m=L&&lauModelo(L.model);
  return m && m.metodo==='mmg' ? t.replace('ultrassonográfico','mamográfico') : t;
}
/* rótulo "Mama" (mamografia unilateral) → "mama direita/esquerda" conforme o lado */
function lauLblLado(m, lbl){
  const L=state.lau;
  if(m && m.metodo==='mmg' && /^(mama|região axilar):?$/i.test(String(lbl||'').trim()) && (L.lado==='d'||L.lado==='e'))
    return String(lbl).trim().replace(/:$/,'') + (L.lado==='d'?' direita':' esquerda');
  return lbl;
}
/* limitações técnicas e indicações por método */
const LAU_TEC = {
  us:[['met','meteorismo intestinal'],['bio','biotipo do paciente']],
  tc:[],
  dmo:[['mov','movimentação do paciente'],['art','artefatos metálicos'],['deg','alterações degenerativas']],
  mmg:[['pos','dificuldade de posicionamento'],['mov','artefato de movimento'],['comp','compressão limitada por desconforto']],
};
const LAU_IND_MMG = ['Rastreamento','Controle de achado prévio','Complementação diagnóstica','Pós-operatório','Nódulo palpável','Descarga papilar','Retração cutânea / mamilar','Linfonodo axilar aumentado'];

/* =========================================================================
   MARCADORES DAS MÁSCARAS
   "XXX" / "XX" / "X" = campo a preencher; "a XX b" = escolha entre a e b
   (ex.: "anteversão XX retroversão"). Template = linhas → tokens:
     {t:'w', s}            palavra
     {t:'p', i, pre, suf}  campo (valor i)
     {t:'c', i, o:[…], pre, suf}  escolha (valor i)
   ========================================================================= */
const LAU_PREP = ['à','ao','a','de','do','da','em','no','na','e'];
const LAU_PH_RE = /^([(\[]*)(X{1,3})([^\sX]*)$/;
const LAU_UNIT = /^(cm|mm|m|ml|mL|g|kg|bpm|kPa|%|cm³|mm³|semanas?|dias?|anos?|meses)[.,;:)]*$/;
function lauIsWord(w){ return (/^[A-Za-zÀ-ÿ-]+\*?[.,;:)]*$/.test(w||'') || /^0\*?[.,;:)]*$/.test(w||'')) && !/^x$/i.test(w) && !/^X{1,3}$/.test(w); }   // "0": grau 0 de Grannum
function lauTokLine(line, start){
  const W = line.split(' '); const out=[]; let i=0, n=start;
  while(i<W.length){
    const w=W[i], m=w.match(LAU_PH_RE);
    const prevW = out.length && out[out.length-1].t==='w' ? out[out.length-1].s : '';
    if(m && m[2]==='XX' && !m[1] && !m[3] && lauIsWord(prevW) && !/[:=]$/.test(prevW)
       && LAU_PREP.indexOf(prevW.toLowerCase())<0 && lauIsWord(W[i+1]) && !LAU_UNIT.test(W[i+1])){
      // escolha: opção à esquerda (com a preposição só se a da direita também tiver), depois as da direita
      const left=[out.pop().s];
      const rPrep = LAU_PREP.indexOf((W[i+1]||'').toLowerCase())>=0;
      if(rPrep && out.length && out[out.length-1].t==='w' && LAU_PREP.indexOf(out[out.length-1].s.toLowerCase())>=0) left.unshift(out.pop().s);
      const opts=[left.join(' ')]; let j=i+1; let suf='';
      for(;;){
        const r=[]; let k=j;
        if(LAU_PREP.indexOf((W[k]||'').toLowerCase())>=0 && lauIsWord(W[k+1])){ r.push(W[k]); k++; }
        r.push(W[k]); k++;
        let txt=r.join(' '); const pm=txt.match(/[.,;:)]+$/); if(pm){ suf=pm[0]; txt=txt.slice(0,-suf.length); }
        opts.push(txt);
        if(!suf && W[k]==='XX' && lauIsWord(W[k+1])){ j=k+1; continue; }
        j=k; break;
      }
      const def = (opts.find(o=>/\*$/.test(o))||'').replace(/\*$/,'');
      out.push({t:'c', i:n++, o:opts.map(o=>o.replace(/\*$/,'')), def, pre:'', suf}); i=j; continue;
    }
    if(m && (m[2].length>=2 || /^(cm|mm|m|g|kg|mL|ml|%|cm³|kPa|bpm)/.test(W[i+1]||'') )){ out.push({t:'p', i:n++, pre:m[1], suf:m[3]}); i++; continue; }
    out.push({t:'w', s:w}); i++;
  }
  return {toks:out, next:n};
}
/* template = {lines:[tokens…], n: nº de valores, auto:{i:[a,b,c]}} */
const _lauTplCache = {};
function lauTpl(str){
  str = String(str==null?'':str);
  const mm = lauUnMM(); const key = (mm?'mm|':'')+str;
  if(_lauTplCache[key]) return _lauTplCache[key];
  if(mm){ const s2=lauCm2Mm(str); const t=lauTplRaw(s2); return (_lauTplCache[key]=Object.assign({}, t, {mm: s2!==str})); }
  return (_lauTplCache[key]=lauTplRaw(str));
}
function lauTplRaw(str){
  let n=0; const lines=str.split('\n').map(l=>{ const r=lauTokLine(l,n); n=r.next; return r.toks; });
  // volume/massa automáticos a partir de "A x B x C"
  const auto={};
  lines.forEach(t=>{
    for(let a=0;a+4<t.length;a++){
      if(t[a].t==='p' && t[a+1].s==='x' && t[a+2].t==='p' && t[a+3].s==='x' && t[a+4].t==='p'){
        const dims=[t[a].i,t[a+2].i,t[a+4].i];
        for(let b=a+5;b<t.length;b++){
          if(t[b].t!=='p') continue;
          const ctx=t.slice(Math.max(a+5,b-4),b).map(x=>x.s||'').join(' ');
          const nxt=(t[b+1]&&t[b+1].s)||'';
          if(/dmsg|di[aâ]metro m[eé]dio/i.test(ctx)) auto[t[b].i]={mean:dims};   // DMSG = média das 3 medidas
          else if(/volume|massa/i.test(ctx) || /^(cm³|cm3|ml|mL)/.test(nxt)) auto[t[b].i]=dims;
          break;
        }
      }
    }
    // "volume ... total: XXX cm³" = soma dos volumes automáticos anteriores
    for(let b=0;b<t.length;b++){
      if(t[b].t!=='p' || auto[t[b].i]) continue;
      const ctx=t.slice(Math.max(0,b-4),b).map(x=>x.s||'').join(' ');
      const nxt=(t[b+1]&&t[b+1].s)||'';
      const prev=Object.keys(auto).map(Number).filter(i=>i<t[b].i && Array.isArray(auto[i]));
      if(/total/i.test(ctx) && /^(cm³|cm3|ml|mL)/.test(nxt) && prev.length>1) auto[t[b].i]={sum:prev};
    }
  });
  return {lines, n, auto};
}
function lauAutoVal(tpl, vals, i){
  const d=tpl.auto[i]; if(!d) return null;
  let r;
  if(d.mean){
    const v=d.mean.map(j=>lauF(vals[j])); if(v.some(x=>!x)) return null;
    return String(Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10).replace('.',',');
  }
  if(d.sum){
    const parts=d.sum.map(j=>{ const u=lauF(vals[j]); if(u!=null) return u; const a=lauAutoVal(tpl, vals, j); return a==null?null:lauF(a); });
    if(parts.some(x=>x==null)) return null;
    r=parts.reduce((a,b)=>a+b,0);
  } else {
    const v=d.map(j=>lauF(vals[j])); if(v.some(x=>!x)) return null;
    r=v[0]*v[1]*v[2]*0.523;
    if(tpl.mm) r=r/1000;   // medidas digitadas em mm → volume em cm³
  }
  return r<100 ? String(Math.round(r*10)/10).replace('.',',') : String(Math.round(r));
}
function lauVal(tpl, vals, i){
  const v=vals&&vals[i];
  if(lauHas(v)) return {v:String(v).trim(), ok:true};
  const tk=tpl.lines.flat().find(t=>t.i===i && t.t==='c' && t.def); if(tk) return {v:tk.def, ok:true};
  const a=lauAutoVal(tpl, vals||[], i); if(a!=null) return {v:a, ok:true};
  return {v:null, ok:false};
}
/* preenche: html=true marca em amarelo o que falta */
function lauFill(str, vals, html){
  const tpl=lauTpl(str); vals=vals||[];
  return tpl.lines.map(toks=>toks.map(tk=>{
    if(tk.t==='w') return html?esc(tk.s):tk.s;
    const r=lauVal(tpl, vals, tk.i);
    let core;
    if(tk.t==='c') core = r.ok ? r.v : tk.o.join(' / ');
    else core = r.ok ? (lauN(r.v)) : 'XXX';
    if(html) core = r.ok ? esc(core) : `<mark class="lau-ph">${esc(core)}</mark>`;
    return (html?esc(tk.pre):tk.pre) + core + (html?esc(tk.suf):tk.suf);
  }).join(' ')).join(html?'<br>':'\n');
}
function lauHasPh(str){ return lauTpl(str).n>0; }

/* =========================================================================
   MODELOS (a partir das máscaras de US)
   ========================================================================= */
function lauBuildModel(mk){
  const used={};
  const items = mk.items.map(mi=>{
    const smap = mk.metodo==='mmg' ? LAU_STRUCT_LABELS_MMG : mk.metodo==='dmo' ? (typeof LAU_STRUCT_LABELS_DMO!=='undefined'?LAU_STRUCT_LABELS_DMO:{}) : mk.metodo==='tc' ? {} : LAU_STRUCT_LABELS;   // TC: itens de texto (os estruturados de US usam termos de US)
    const sk = smap[lauNorm(mi.label)] || null;
    const base = { k:mi.k, label:mi.label, grp:mi.grp||'', dash:mi.dash, normal:mi.text, opts:mi.opts||[], alts:mi.alts||null };
    if(sk && !used[sk]){
      used[sk]=1;
      const d=LAU_STRUCT[sk];
      return Object.assign({}, base, {sk, ctrls:d.ctrls, build:d.build, hideNormal:!!d.hideNormal, noNF:!!d.noNF});
    }
    return Object.assign({}, base, {generic:true, ctrls:[]});
  });
  // lateralidade: título terminando em "DO/DA … XX" ou exame bilateral dos membros
  let titulo = mk.titulo.join('\n'), lado=null;
  const ult = mk.titulo[mk.titulo.length-1]||'';
  const mm = ult.match(/^(.*\b(DO|DA)\b.*?)\s+X{2,3}$/);
  if(mm){ lado={gen: mm[2]==='DA'?'f':'m', bil:false, ambos:/DO MEMBRO (INFERIOR|SUPERIOR)$/.test(mm[1])}; titulo = mk.titulo.slice(0,-1).concat(mm[1]).join('\n'); }   // ambos: membro também pode ser bilateral
  else if(/DOS MEMBROS (INFERIORES|SUPERIORES)/.test(titulo)) lado={gen:'m', bil:true};
  else if(mk.metodo==='mmg' && /BILATERAL/.test(titulo)) lado={gen:'f', bil:true, mg:true};
  const oct = (mk.flags||[]).indexOf('oct')>=0;
  if(oct) lado={gen:'m', bil:true, eye:true};
  return { id:mk.id, nome:mk.nome, grupo:mk.grupo, metodo:mk.metodo||'us', pronto:true, lado, oct, semRot: oct || mk.metodo==='dmo',
    titulo, concTitulo: mk.concTitulo, concNormal: mk.conc.filter(c=>!c.opt),
    concOpts: mk.conc.filter(c=>c.opt), trailer: mk.trailer, seq: mk.seq, items,
    estruturado: items.filter(x=>x.sk).length>=2 };
}
const LAUDO_MODELOS = { us: (typeof LAU_US_MASKS!=='undefined' ? LAU_US_MASKS : []).map(lauBuildModel),
  mmg: (typeof LAU_MMG_MASKS!=='undefined' ? LAU_MMG_MASKS : []).map(lauBuildModel),
  tc:  (typeof LAU_TC_MASKS!=='undefined' ? LAU_TC_MASKS : []).map(lauBuildModel) };
/* densitometria: os itens estruturados ficam em laudos-dmo.js (carregado depois) — monta na 1ª consulta */
function lauModelosDmo(){ if(!LAUDO_MODELOS.dmo && typeof LAU_DMO_MASKS!=='undefined' && typeof LAU_STRUCT_LABELS_DMO!=='undefined') LAUDO_MODELOS.dmo = LAU_DMO_MASKS.map(lauBuildModel); return LAUDO_MODELOS.dmo||[]; }
const LAU_GRUPOS = ['Medicina interna','Mama','Cabeça e pescoço','Musculoesquelético','Obstétrico','Vascular','Mamografia','Densitometria'];
function lauModelo(id){
  lauModelosDmo();
  for(const k in LAUDO_MODELOS){ const m=LAUDO_MODELOS[k].find(x=>x.id===id); if(m) return m; }
  return null;
}

/* =========================================================================
   PADRÕES DO USUÁRIO (localStorage)
   Geral (vale para todos): fonte, tamanho, negrito, hífen, título da conclusão.
   Por laudo: título, rótulo e texto normal de cada item, conclusão normal.
   ========================================================================= */
const LAU_CFG_KEY = 'klug_laudo_cfg_v1';
function lauCfgAll(){
  if(state.lauCfg) return state.lauCfg;
  let c=null; try{ c=JSON.parse(localStorage.getItem(LAU_CFG_KEY)||'null'); }catch(_){}
  state.lauCfg = (c && typeof c==='object') ? c : {};
  if(!state.lauCfg.models) state.lauCfg.models={};
  return state.lauCfg;
}
function lauCfgSave(){ try{ localStorage.setItem(LAU_CFG_KEY, JSON.stringify(lauCfgAll())); }catch(_){} }
function lauGen(){ const c=lauCfgAll(); return {font:c.font||'Arial', size:c.size||12, bold:c.bold!==false, hifen:c.hifen!==false, concTitulo:c.concTitulo||'', les:c.les||'het', un:c.un||'cm'}; }
/* unidade das medidas lineares dos campos (cm padrão das máscaras; mm opcional) */
function lauUnMM(){ try{ return lauCfgAll().un==='mm'; }catch(_){ return false; } }
/* "8,1 cm" → "81 mm" (texto já montado; não mexe em cm³, cm², cm/s) */
function lauCmNumMm(t){ return String(t).replace(/(\d+(?:,\d+)?)\s*cm(?![³²\/\w])/g, (_,n)=>{ const v=Math.round(parseFloat(n.replace(',','.'))*100)/10; return String(v).replace('.',',')+' mm'; }); }
/* "XXX cm" → "XXX mm" (só comprimento: não mexe em cm³, cm², cm/s) */
function lauCm2Mm(str){ return String(str).replace(/(X{2,3}[^\sX]*|\{\d+\})(\s+)cm(?=[\s.,;:)]|$)/g, '$1$2mm'); }
function lauMcfg(id){ const c=lauCfgAll(); if(!c.models[id]) c.models[id]={items:{}}; if(!c.models[id].items) c.models[id].items={}; return c.models[id]; }
function lauMcfgPeek(id){ const c=lauCfgAll(); return c.models[id]||{items:{}}; }
function lauTitulo(m){ const u=lauMcfgPeek(m.id); return lauHas(u.titulo)?u.titulo:m.titulo; }
function lauConcTitulo(m){
  const u=lauMcfgPeek(m.id); if(lauHas(u.concTitulo)) return u.concTitulo;
  const g=lauGen(); if(g.concTitulo && /^Conclusão:?$/.test(m.concTitulo||'')) return g.concTitulo;
  return m.concTitulo;
}
/* linhas da conclusão normal: [{text,dash}] */
function lauConcNormalLines(m){
  const u=lauMcfgPeek(m.id);
  if(lauHas(u.concNormal)) return u.concNormal.split('\n').filter(lauHas).map(t=>({text:t.replace(/^-\s*/,''), dash:/^-/.test(t)||true}));
  return m.concNormal;
}
function lauItemLabel(m,it){ const u=(lauMcfgPeek(m.id).items||{})[it.k]||{}; const l=lauHas(u.label)?u.label:it.label;
  return lauMgUni(m) && /^regiões axilares$/i.test(l||'') ? 'Região axilar '+(state.lau.lado==='d'?'direita':'esquerda') : l; }
function lauItemNormal(m,it){
  // variação da máscara escolhida no painel (alternativas "a || b")
  const L=state.lau, sv = it.alts && L && L.model===m.id && L.v && L.v[it.k];
  if(sv && sv.__alt>0 && it.alts[sv.__alt]) return it.alts[sv.__alt];
  const u=(lauMcfgPeek(m.id).items||{})[it.k]||{}; const t=lauHas(u.normal)?u.normal:it.normal; return lauMgUni(m) ? lauMgUniTxt(t) : t; }
/* usado dentro do build dos rins: texto normal já preenchido */
function LAU_NORMAL(k){
  const L=lauCur(); const m=L&&lauModelo(L.model); if(!m) return '';
  const it=m.items.find(x=>x.sk===k||x.k===k); if(!it) return '';
  return lauFill(lauItemNormal(m,it), (L.v[it.k].__v||{}).n).replace(/\n/g,' ');
}

/* =========================================================================
   ESTADO DO LAUDO EM EDIÇÃO (um por modelo, mantido durante a sessão)
   ========================================================================= */
function lauDefaults(it){
  const s={__v:{}, __o:[], __f:[]};
  (it.ctrls||[]).forEach(c=>{
    if(!c.k) return;
    if(c.t==='radio' || c.t==='select') s[c.k]=c.def!=null ? c.def : c.opts[0][0];
    else if(c.t==='check') s[c.k]=false;
    else if(c.t==='dims') s[c.k]=['','',''];
    else s[c.k]='';
  });
  if(it.generic){ s.alt=''; s.conc=''; }
  return s;
}
function lauNew(modelId){
  const m=lauModelo(modelId); const v={};
  m.items.forEach(it=>v[it.k]=lauDefaults(it));
  // próstata: medidas do volume vesical pré-miccional já abertas no item Bexiga
  if(/prostata/.test(modelId)) m.items.forEach(it=>{ if(it.sk==='bexiga'){ v[it.k].vol=true; v[it.k].volAuto=true; } });
  const g=lauGen();
  state.lau = {model:modelId, v, open:null, html:null, autoConc:true, tab:'opc',
    tec:{}, ind:'', obs:'', font:g.font, size:g.size, tit:{}, conc:{v:{}, o:[]}, xf:[], xv:{}};
  return state.lau;
}
function lauCur(){ return state.lau && lauModelo(state.lau.model) ? state.lau : null; }
function lauBuild(m, it){
  const s=state.lau.v[it.k];
  if(it.generic) return {txt: lauHas(s.alt)?s.alt.trim():null, conc: lauHas(s.conc)?[lauFrase(s.conc)]:[]};
  const r = it.build(typeof lauAutoEstado==='function' ? lauAutoEstado(m, it, s) : s);   // regras automáticas pelas medidas
  if(!lauUnMM() || !r) return r;
  // preferência em mm: os itens estruturados (controles em cm) escrevem o comprimento em mm
  const cv = t => typeof t==='string' ? lauCmNumMm(t) : t;
  return Object.assign({}, r, {txt: r.html ? r.txt : cv(r.txt), conc: (r.conc||[]).map(cv)});
}
/* conclusão de uma frase da biblioteca: {n} = valor do campo n do texto */
function lauFraseConcHTML(f, vals, lbl){
  if(!lauHas(f.c)) return '';
  const tpl=lauTpl(f.t);
  const L = String(lbl||'').toLowerCase().replace(/^(bursa|bursite|veia|tendão|tendões)\s+/,'').replace(/:$/,'');
  let c = lauUnMM() ? lauCm2Mm(f.c) : f.c;
  if(LAU_MSK.indexOf(f.o)>=0) c = c.replace(/\{(\d+)\}/g, (m0,n)=> lauVal(tpl, vals||[], +n).ok ? m0 : '\u0000')
                                  .replace(/\s*\(\u0000\)|\s+(?:do|da|dos|das|no|na)\s+\u0000|\s*\u0000/g, '');
  return esc(c).replace(/\{L\}/g, esc(L)).replace(/\{(\d+)\}/g,(_,n)=>{
    n=+n; const r=lauVal(tpl, vals||[], n);
    if(r.ok) return esc(lauN(r.v));
    let tk=null; tpl.lines.forEach(l=>l.forEach(t=>{ if(t.i===n) tk=t; }));
    return `<mark class="lau-ph">${esc(tk&&tk.t==='c'?tk.o.join(' / '):'XXX')}</mark>`;
  });
}
/* retira do texto padrão as negativas contrariadas pelos achados
   (ex.: "sem hidronefrose ou cálculos" + hidronefrose → "sem cálculos").
   Frases curtas só negativas ("ausentes.", "não há.") são trocadas. */
const LAU_NEG_CURTA = /^(ausentes?|não há|ausência de [^.]+|negativo|não caracterizad[^.]*|sem [^.]+|em volume fisiológico)\.?$/i;
function lauNegStrip(html, words, temAdd){
  const plain = html.replace(/<[^>]+>/g,'').trim();
  if(!words.length) return (temAdd && LAU_NEG_CURTA.test(plain)) ? '' : html;
  const hit = t=>words.some(w=>lauNorm(t).indexOf(lauNorm(w))>=0);
  return html.replace(/(,?\s*)\b(sem|ausência de|não há)\s+([^.;<]+?)(\s+detectáve(?:is|l) ao método)?(?=[.;]|$)/gi, (all, pre, neg, lista, suf)=>{
    const itens = lista.split(/\s+ou\s+|,\s*/);
    const resto = itens.filter(x=>!hit(x));
    if(resto.length===itens.length) return all;
    if(!resto.length) return '';
    const txt = resto.length>1 ? resto.slice(0,-1).join(', ')+' ou '+resto[resto.length-1] : resto[0];
    return `${pre}${neg} ${txt}${suf||''}`;
  }).replace(/^\s*[.;,]\s*/,'').replace(/\.\s*\./g,'.');
}
/* Cada frase escolhida é uma instância "índice_n" (a mesma frase pode entrar
   várias vezes, ex.: dois nódulos). Valores dos campos em bag['f'+id];
   descritores das frases com classificação (TI-RADS / BI-RADS) em bag['d'+id]. */
function lauFI(id){ return LAU_FRASES[parseInt(id,10)]; }
/* quantidade: único | 'n' vários semelhantes (frase do maior + esta linha) | 'd' diferentes (uma frase por achado) */
const LAU_QTPL = 'Identificam-se outras XXX formações de aspecto semelhante, a maior medindo XXX cm.';
function lauQtd(f, bag, id){ return f.q ? ((bag['d'+id]||{}).qtd || '1') : '1'; }
/* mama: em "vários semelhantes" informa-se a localização e as medidas de cada um */
const LAU_LOCT = 'às XXX horas, a XXX cm do mamilo, a XXX cm da pele, medindo XXX x XXX x XXX cm';
function lauMulti(f){ return (f.o==='mama' && !f.tn) || f.kind==='tirads'; }   // f.tn: "vários" numa frase só (o maior)
/* modelo de localização/medidas de cada achado semelhante */
function lauLocTpl(f){ return f.kind==='tirads' ? f.t : (f.loct || LAU_LOCT); }
function lauQn(d){ const n=parseInt((d||{}).qn,10); return isNaN(n) ? 2 : Math.max(2, Math.min(12, n)); }
function lauLocs(f, id, bag, html){
  const d=bag['d'+id]||{}; const out=[lauFill(f.kind?f.t:LAU_LOCT, f.kind?bag['f'+id]:bag['f'+id+'_1'], html)];
  for(let j=2;j<=lauQn(d);j++) out.push(lauFill(lauLocTpl(f), bag['f'+id+'_'+j], html));
  return out;
}
/* "às 10 h, 1,2 x 0,8 x 0,9 cm" para a conclusão */
function lauLocCurta(vals){
  const v=i=> lauHas((vals||[])[i]) ? esc(lauN(vals[i])) : lauMk('___',true);
  return `às ${v(0)} h, ${v(2)} x ${v(3)} x ${v(4)} cm`;
}
/* distâncias do mamilo e da pele são opcionais: sem valor, saem do texto */
function lauSemDistVazia(t){
  return t.replace(/a (<mark class="lau-ph">)?XXX(<\/mark>)? cm d[ao] (mamilo|pele), /g, '')
          .replace(/,?\s*às (<mark class="lau-ph">)?XXX(<\/mark>)? horas(?=[,.])/g, '').replace(/:\s*,\s*/g, ': ')
          .replace(/,? o maior(?=\.)/g, '').replace(/o maior, medindo/g, 'o maior medindo');   // horário em branco sai do texto
}
/* trechos opcionais da frase (f.vaz): saem quando o campo ficou em branco */
function lauTiraVazio(t, pats){
  pats.forEach(p=>{
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/XXX/g,'(?:<mark class="lau-ph">XXX</mark>|XXX)'), 'g');
    t = t.replace(re,'');
  });
  return t;
}
const LAU_MSK = ['tendao','bursa','derrame','acromio','poplitea','ligamento','fascia','nervo','musculo','interdigital','hernia'];
const _MK = '(?:<mark class="lau-ph">XXX</mark>|XXX)';
function lauTiraMedVazia(t){
  // medidas em parte preenchidas: "2,0 x XXX x XXX cm" → "2,0 cm"
  const N='\\d+(?:[.,]\\d+)?';
  t = t.replace(new RegExp(`(${N})((?:\\s*x\\s*(?:${N}|${_MK}))+)(?=\\s*(?:cm|mm))`,'g'), (m0,a,rest)=>
        a + rest.replace(new RegExp(`\\s*x\\s*${_MK}`,'g'),''))
       .replace(new RegExp(`(?:${_MK}\\s*x\\s*)+(${N})`,'g'), '$1');
  return t
    .replace(new RegExp(`,?\\s*(?:medindo|com|de)\\s+(?:até\\s+)?${_MK}(?:\\s*x\\s*${_MK})*\\s*(?:cm³|cm²|cm|mm)(?:\\s+de\\s+(?:espessura|extensão|diâmetro))?(?:\\s*\\(volume estimado em ${_MK} cm³\\))?`,'g'), '')
    .replace(new RegExp(`\\s*\\([^()]*${_MK}[^()]*\\)`,'g'), '')
    .replace(new RegExp(`,?\\s*distando\\s+${_MK}\\s*(?:cm|mm)\\s+da pele`,'g'), '');
}
function lauFraseText(id, bag, html){
  const f=lauFI(id); if(!f) return '';
  let t;
  if(lauKindTE(f)) t = lauTendText(f, id, bag, html);
  else if(lauMgK(f)) t = lauMgText(f, id, bag, html);
  else if(f.kind==='tirads') t = lauTiradsText(f, bag['f'+id], bag['d'+id]||{}, html);
  else if(f.kind==='orads') t = lauOradsText(f, bag['f'+id], bag['d'+id]||{}, html);
  else if(f.kind==='hernia') t = lauHerniaText(f, bag['f'+id], bag['d'+id]||{}, html);
  else if(f.kind==='birads') t = lauBiradsText(f, bag['f'+id], bag['d'+id]||{}, html);
  else t = lauFill(f.tn && lauQtd(f,bag,id)==='n' ? f.tn : f.t, bag['f'+id], html);
  if(f.mt){ const n=lauMtN(bag['d'+id]); for(let j=2;j<=n+1;j++) t += `${html?'<br>':'\n'}${f.mtn||'Nódulo'} ${j}: ${lauFill(f.mt, bag['f'+id+'_'+j], html)}.`; }
  if(f.loc && !lauMgK(f)){ const lt=lauMgLocTxt(bag['d'+id]||{}, html, false); t = lt ? t.replace('{LOC}', lt) : t.replace(/,?\s*\{LOC\}/, ''); }
  if(f.medOpc && !lauMgK(f)) t = lauTiraMedVazia(t);
  if(lauQtd(f,bag,id)==='n'){
    if(f.kind==='birads') t = lauBiradsText(f, bag['f'+id], bag['d'+id]||{}, html, lauLocs(f,id,bag,html));
    else if(f.kind==='tirads') t = lauTiradsText(f, bag['f'+id], bag['d'+id]||{}, html, lauLocs(f,id,bag,html));
    else if(lauMulti(f)) t += lauLocs(f,id,bag,html).slice(1).map((l,j)=>`${html?'<br>':'\n'}Formação semelhante ${j+2}: ${l}.`).join('');
    else if(!f.tn) t += ' ' + lauFill(LAU_QTPL, bag['q'+id], html);
  }
  if(f.vaz) t = lauTiraVazio(t, f.vaz);
  if(LAU_MSK.indexOf(f.o)>=0) t = lauTiraMedVazia(t);
  return f.o==='mama' ? lauSemDistVazia(f.medOpc ? lauTiraMedVazia(t) : t) : t;
}
function lauFraseConc(id, bag, lbl){
  const f=lauFI(id); if(!f) return '';
  const n = lauQtd(f,bag,id)==='n';
  if(lauKindTE(f)) return lauTendConc(f, id, bag);
  if(lauMgK(f)) return lauMgConc(f, id, bag, lbl, n);
  if(f.kind==='orads') return lauOradsConc(f, bag['f'+id], bag['d'+id]||{}, lbl);
  if(f.kind==='hernia') return lauHerniaConc(f, bag['d'+id]||{});
  if(f.kind==='tirads') return lauTiradsConc(f, bag['f'+id], bag['d'+id]||{}, n, n ? [bag['f'+id]].concat(Array.from({length:lauQn(bag['d'+id])-1},(_,j)=>bag['f'+id+'_'+(j+2)])) : null);
  if(f.kind==='birads') return lauBiradsConc(f, bag['f'+id], bag['d'+id]||{}, lbl, n, n ? [bag['f'+id]].concat(Array.from({length:lauQn(bag['d'+id])-1},(_,j)=>bag['f'+id+'_'+(j+2)])) : null);
  return lauFraseConcHTML(n && f.cp ? Object.assign({}, f, {c:f.cp}) : f, bag['f'+id], lbl);
}
function lauFraseLines(list, bag, mode){
  return (list||[]).filter(id=>{ const f=lauFI(id); return f && f.m===mode; }).map(id=>lauFraseText(id, bag, true));
}

/* ---------- Tendões / músculos (seleção por articulação) ---------- */
const LAU_ALVOS = {
  'us-ombro':   {tend:[['supraespinal','do supraespinal'],['infraespinal','do infraespinal'],['subescapular','do subescapular'],['redondo menor','do redondo menor'],['cabeça longa do bíceps','da cabeça longa do bíceps']],
                 musc:[['supraespinal','supraespinal'],['infraespinal','infraespinal'],['subescapular','subescapular'],['redondo menor','redondo menor'],['deltoide','deltoide']]},
  'us-cotovelo':{lig:[['colateral ulnar','colateral ulnar'],['colateral radial','colateral radial']], tend:[['comum dos extensores','comum dos extensores'],['comum dos flexores','comum dos flexores'],['tríceps braquial','do tríceps braquial'],['bíceps distal','do bíceps distal']],
                 musc:[['bíceps braquial','bíceps braquial'],['braquial','braquial'],['tríceps braquial','tríceps braquial'],['braquiorradial','braquiorradial']]},
  'us-punho':   {tend:[['flexores dos dedos','flexores dos dedos'],['abdutor longo / extensor curto do polegar (1º compartimento)','do 1º compartimento extensor (abdutor longo e extensor curto do polegar)'],['extensor ulnar do carpo','do extensor ulnar do carpo'],['flexor radial do carpo','do flexor radial do carpo'],['extensores dos dedos','extensores dos dedos']], musc:[]},
  'us-mao':     {tend:[['flexores dos dedos','flexores dos dedos'],['extensores dos dedos','extensores dos dedos']], musc:[['interósseos','interósseos'],['tenar','tenar'],['hipotenar','hipotenar']]},
  'us-dedo-da-mao':{tend:[['flexor profundo','do flexor profundo'],['flexor superficial','do flexor superficial'],['extensor','extensor']], musc:[]},
  'us-joelho':  {lig:[['colateral medial','colateral medial'],['colateral lateral','colateral lateral']], tend:[['quadríceps femoral','do quadríceps femoral'],['patelar','patelar'],['pata de ganso','da pata de ganso',{pl:1,tn:1}],['trato iliotibial','do trato iliotibial'],['bíceps femoral','do bíceps femoral'],['semimembranoso','do semimembranoso']],
                 musc:[['gastrocnêmio medial','gastrocnêmio medial'],['vasto medial','vasto medial'],['vasto lateral','vasto lateral']]},
  'us-quadril': {tend:[['glúteo médio','do glúteo médio'],['glúteo mínimo','do glúteo mínimo'],['retofemoral','retofemoral'],['iliopsoas','do iliopsoas'],['isquiotibiais (origem)','dos isquiotibiais']],
                 musc:[['glúteo médio','glúteo médio'],['glúteo mínimo','glúteo mínimo'],['iliopsoas','iliopsoas'],['adutor longo','adutor longo'],['retofemoral','retofemoral']]},
  'us-tornozelo':{lig:[['fibulotalar anterior','fibulotalar anterior'],['fibulocalcâneo','fibulocalcâneo'],['tibiofibular anterior','tibiofibular anterior'],['deltoide','deltoide']], tend:[['calcâneo','do calcâneo'],['tibial posterior','do tibial posterior'],['fibular longo','do fibular longo'],['fibular curto','do fibular curto'],['flexor longo do hálux','do flexor longo do hálux'],['tibial anterior','do tibial anterior']], musc:[]},
  'us-pe':      {tend:[['tibial posterior','do tibial posterior'],['fibulares','dos fibulares'],['flexores','flexores'],['extensores','extensores']], musc:[['abdutor do hálux','abdutor do hálux'],['flexor curto dos dedos','flexor curto dos dedos'],['quadrado plantar','quadrado plantar']]},
  'us-braco':   {tend:[], musc:[['bíceps braquial','bíceps braquial'],['braquial','braquial'],['tríceps braquial','tríceps braquial'],['deltoide','deltoide'],['coracobraquial','coracobraquial']]},
  'us-antebraco':{tend:[], musc:[['flexor radial do carpo','flexor radial do carpo'],['flexores superficiais dos dedos','flexores superficiais dos dedos'],['extensor comum dos dedos','extensor comum dos dedos'],['braquiorradial','braquiorradial'],['pronador redondo','pronador redondo']]},
  'us-coxa':    {tend:[], musc:[['reto femoral','reto femoral'],['vasto lateral','vasto lateral'],['vasto medial','vasto medial'],['vasto intermédio','vasto intermédio'],['bíceps femoral','bíceps femoral'],['semitendíneo','semitendíneo'],['semimembranoso','semimembranoso'],['adutor longo','adutor longo']]},
  'us-perna':   {tend:[], musc:[['gastrocnêmio medial','gastrocnêmio medial'],['gastrocnêmio lateral','gastrocnêmio lateral'],['sóleo','sóleo'],['tibial anterior','tibial anterior'],['fibulares','fibulares']]},
  'us-sinfise-pubica':{tend:[['adutor longo','do adutor longo'],['reto abdominal','do reto abdominal']], musc:[['adutor longo','adutor longo'],['adutor curto','adutor curto'],['grácil','grácil'],['pectíneo','pectíneo']]},
};
const LAU_TEND_TIPOS = [['tend','Tendinopatia'],['parcial','Rotura parcial'],['completa','Rotura completa'],['calc','Tendinopatia calcárea']];
const LAU_FACES = ['intrassubstancial','da face articular','da face bursal'];
const LAU_MUSC_TIPOS = [['est','Estiramento (grau I)'],['parcial','Rotura parcial (grau II)'],['completa','Rotura completa (grau III)'],['hemat','Hematoma'],['atrof','Atrofia / lipossubstituição']];
function lauAlvos(kind){ const L=state.lau; const a=LAU_ALVOS[L&&L.model]||{}; return (kind==='tend'?a.tend:kind==='lig'?a.lig:a.musc)||[]; }
const LAU_LIG_TIPOS = [['est','Estiramento'],['parcial','Rotura parcial'],['completa','Rotura completa']];
function lauKindTE(f){ return f.kind==='tend'||f.kind==='musc'||f.kind==='lig'; }
/* compara sem acento e sem "h" (supraespinhal = supraespinal) */
function lauNormH(s){ return lauNorm(s).replace(/h/g,''); }
/* opções do item: tendões/músculos citados no rótulo; se só um, ele já fica escolhido */
function lauAlvoOpts(kind, label){
  const al=lauAlvos(kind), L=lauNormH(label);
  const idx=al.map((a,i)=>i).filter(i=>{ const n=lauNormH(al[i][0]).split(' (')[0]; const j=L.indexOf(n); return j>=0 && (j===0 || /[\s,.("“'‘]/.test(L[j-1])); });
  return idx;
}
/* cada tendão/músculo marcado tem o seu tipo de lesão: d.det[chave] = {tipo, face, bainha};
   medidas em bag['f'+id+'_'+chave]. chave = índice na lista ou 'x' (digitado em "outro"). */
function lauAlvoList(kind, d){
  const al=lauAlvos(kind); const out=(d.alvos||[]).map(i=>al[i]?{key:String(i), nome:al[i][0], prep:al[i][1], x:al[i][2]||{}}:null).filter(Boolean);
  if(lauHas(d.alvoTxt)) out.push({key:'x', nome:d.alvoTxt.trim(), prep:(kind==='tend'?'do ':'')+d.alvoTxt.trim(), x:{}});
  return out;
}
function lauJuntaE(xs){ return xs.length<2 ? (xs[0]||'') : xs.slice(0,-1).join(', ')+' e '+xs[xs.length-1]; }
function lauTendTpl(f, t){
  t=t||{};
  if(f.kind==='tend') return t.tipo==='parcial' ? 'medindo XXX cm' : t.tipo==='completa' ? 'retração do coto de XXX cm' : t.tipo==='calc' ? 'calcificação de XXX cm' : '';
  return (t.tipo==='parcial'||t.tipo==='hemat') ? 'hematoma de XXX x XXX x XXX cm (volume estimado em XXX cm³)' : t.tipo==='completa' ? 'retração do coto de XXX cm' : '';
}
/* frase de um alvo; sujeito = "tendão do supraespinal" (ou vazio quando o rótulo já diz qual é) */
function lauTendFrase(f, a, t, vals, html, sujeito){
  t=t||{}; const tpl=lauTendTpl(f,t); const med = tpl ? lauFill(tpl, vals, html) : '';
  const S = sujeito ? sujeito+' ' : '';
  const tipo=t.tipo;
  if(f.kind==='tend'){
    const X=(a&&a.x)||{}; const pl=!!X.pl;
    const dist = X.tn ? 'distensão líquida peritendínea (tenossinovite)' : 'distensão líquida da bainha tendínea';
    const b = t.bainha ? `, com ${dist}` : '';
    if(!tipo) return t.bainha ? `${S}sem alterações estruturais, com ${dist}.` : `${S}${lauMk('(escolha o tipo)',html)}.`;
    if(tipo==='tend') return `${S}${pl?'espessados e hipoecogênicos':'espessado e hipoecogênico'}, com perda parcial do padrão fibrilar (tendinopatia), sem sinais de rotura${b}.`;
    if(tipo==='parcial') return `${S}com sinais de tendinopatia e rotura parcial ${LAU_FACES[t.face||0]}, ${med}${b}.`;
    if(tipo==='completa') return `${S}com rotura completa, com ${med}${b}.`;
    if(tipo==='calc') return `${S}com tendinopatia calcárea (${med})${b}.`;
    return `${S}espessado e hipoecogênico, com perda parcial do padrão fibrilar (tendinopatia), sem sinais de rotura${b}.`;
  }
  if(f.kind==='lig'){
    if(!tipo) return `${S}${lauMk('(escolha o tipo)',html)}.`;
    return S + {est:'espessado e hipoecogênico, com fibras contínuas (estiramento).', parcial:'com rotura parcial de suas fibras.', completa:'com descontinuidade completa de suas fibras (rotura completa).'}[tipo];
  }
  if(!tipo) return `${S}${lauMk('(escolha o tipo)',html)}.`;
  return S + {est:'com área de alteração ecotextural, sem descontinuidade de fibras (estiramento).', parcial:`com rotura parcial de fibras, com ${med}.`, completa:`com rotura completa, com ${med}.`, hemat:`com ${med}.`, atrof:'com redução de volume e aumento da ecogenicidade (lipossubstituição).'}[tipo];
}
function lauTendText(f, id, bag, html){
  const d=bag['d'+id]||{}; const det=d.det||{}; const al=lauAlvoList(f.kind, d);
  const nomeK = f.kind==='tend'?'tendão':f.kind==='lig'?'ligamento':'músculo';
  if(!al.length) return `${nomeK} ${lauMk('___',html)} ${lauMk('(marque o '+nomeK+')',html)}.`;
  if(d.fixo) return lauTendFrase(f, al[0], det[al[0].key], bag['f'+id+'_'+al[0].key], html, '');
  const frases = al.map(a=>lauTendFrase(f, a, det[a.key], bag['f'+id+'_'+a.key], html,
    (f.kind==='tend'?'tendão ':f.kind==='lig'?'ligamento ':'músculo ') + (html?esc(a.prep):a.prep)));
  return frases.map((x,i)=> i ? x.charAt(0).toUpperCase()+x.slice(1) : x).join(' ');
}
/* conclusão: objetos agrupáveis {g, pre, de, suf, musc}; lauConcs junta os do mesmo grupo
   ("Tendinopatia da cabeça longa do bíceps, do supraespinal e do infraespinal, sem rotura.") */
function lauTendConc(f, id, bag){
  const d=bag['d'+id]||{}; const det=d.det||{}; const al=lauAlvoList(f.kind, d);
  return al.map(a=>{
    const t=det[a.key]||{}; const tipo=t.tipo;
    if(!tipo && !t.bainha) return null;
    if(f.kind==='tend'){
      const de = /^(do|da|dos|das) /.test(a.prep) ? a.prep : 'do tendão '+a.prep;
      const b = t.bainha && tipo ? ', com distensão líquida da bainha tendínea' : '';
      if(a.x && a.x.tn){ const bt = t.bainha ? (tipo?', com tenossinovite':'') : ''; if(!tipo) return {g:'tenos', pre:'Tenossinovite', de, suf:'.'};
        if(tipo==='tend') return {g:'tend-tn'+bt, pre:'Tendinopatia', de, suf:`, sem rotura${bt}.`}; }
      if(!tipo) return {g:'bainha', pre:'Distensão líquida da bainha tendínea', de, suf:'.'};
      if(tipo==='parcial') return {g:'parcial'+(t.face||0)+b, pre:'Tendinopatia', de, suf:` com rotura parcial ${LAU_FACES[t.face||0]}${b}.`};
      if(tipo==='completa') return {g:'completa'+b, pre:'Rotura completa', de: /^do tendão /.test(de)?de:'do tendão '+a.prep.replace(/^(do|da|dos|das) /,''), suf:`${b}.`};
      if(tipo==='calc') return {g:'calc'+b, pre:'Tendinopatia calcárea', de, suf:`${b}.`};
      return {g:'tend'+b, pre:'Tendinopatia', de, suf:`, sem rotura${b}.`};
    }
    if(f.kind==='lig'){ const L={est:'Estiramento', parcial:'Rotura parcial', completa:'Rotura completa'}[tipo]; return {g:'l'+tipo, pre:L, de:a.prep, suf:'.', lig:true}; }
    const T={est:['Estiramento',' (grau I).'], parcial:['Rotura parcial',' (grau II).'], completa:['Rotura completa',' (grau III).'], hemat:['Hematoma',''], atrof:['Atrofia e lipossubstituição','.']}[tipo];
    return {g:'m'+tipo, pre:T[0], de:a.prep, suf:T[1]||'.', musc:true, hemat:tipo==='hemat'};
  }).filter(Boolean);
}

/* ---------- TI-RADS (mesma pontuação da calculadora: TIRADS_CATS / tiradsEval) ---------- */
const LAU_TR_TXT = {
  comp:['cístico','espongiforme','misto cístico-sólido','sólido'],
  echo:['anecoico','hiperecoico/isoecoico','hipoecoico','acentuadamente hipoecoico'],
  shape:['mais largo que alto','mais alto que largo'],
  margin:['de margens regulares','de margens mal definidas','de margens lobuladas/irregulares','com extensão extratireoidiana'],
};
const LAU_TR_FOCI = ['sem focos ecogênicos','com macrocalcificações','com calcificação periférica (em casca)','com focos ecogênicos puntiformes'];
function lauTrNod(d){ return {comp:d.comp??null, echo:d.echo??null, shape:d.shape??null, margin:d.margin??null, foci:d.foci&&d.foci.length?d.foci:[0]}; }
function lauMaxDim(f, vals){
  const tpl=lauTpl(f.t); let mx=null;
  tpl.lines.flat().forEach(tk=>{ if(tk.t==='p'){ const v=lauF((vals||[])[tk.i]); if(v!=null && (mx==null||v>mx) && !tpl.auto[tk.i]) mx=v; } });
  return mx;
}
function lauMk(v,html){ return html ? `<mark class="lau-ph">${esc(v)}</mark>` : v; }
function lauTiradsText(f, vals, d, html, locs){
  const n=lauTrNod(d), ev=tiradsEval(n);
  const w=(k)=> n[k]==null ? lauMk('___',html) : (html?esc(LAU_TR_TXT[k][n[k]]):LAU_TR_TXT[k][n[k]]);
  const foci = n.foci.map(i=>LAU_TR_FOCI[i]).join(' e ').replace('sem focos ecogênicos e ','');
  const loc = lauFill(f.t, vals, html);
  const cat = ev.complete || ev.auto ? `TR${ev.tr} (${ev.pts} ponto${ev.pts===1?'':'s'})` : lauMk('TR?',html);
  if(locs){ const br=html?'<br>':'\n';
    return `Identificam-se ${locs.length} nódulos com as mesmas características: ${w('comp')}, ${w('echo')}, ${w('shape')}, ${w('margin')}, ${html?esc(foci):foci}. ACR TI-RADS: ${cat}.`
      + locs.map((l,j)=>`${br}Nódulo ${j+1}: ${l}.`).join(''); }
  return `Nódulo ${w('comp')}, ${w('echo')}, ${w('shape')}, ${w('margin')}, ${html?esc(foci):foci}, ${loc}. ACR TI-RADS: ${cat}.`;
}
function lauTiradsConc(f, vals, d, plural, all){
  const n=lauTrNod(d), ev=tiradsEval(n);
  const tpl=lauTpl(f.t); const lista=(plural&&all?all:[vals]);
  const lados=[...new Set(lista.map(v=>lauVal(tpl, v||[], 1)).filter(x=>x.ok).map(x=>x.v))];
  const ladoTxt = lados.length>1 ? 'em ambos os lobos' : lados.length ? 'no lobo '+esc(lados[0]) : 'no lobo '+lauMk('direito / esquerdo',true);
  const nome = plural ? 'Nódulos tireoidianos semelhantes' : 'Nódulo tireoidiano';
  if(!(ev.complete||ev.auto)) return `${nome} ${ladoTxt} — ACR TI-RADS ${lauMk('TR?',true)}.`;
  const mx = lista.map(v=>lauMaxDim(f, v)).filter(x=>x!=null).reduce((a,b)=>Math.max(a,b), -Infinity);
  const r=tiradsRec(ev.tr, mx===-Infinity?null:mx, ev.auto);
  return `${nome} ${ladoTxt} — ACR TI-RADS TR${ev.tr} (${esc(TIRADS_TRC[ev.tr].name.toLowerCase())})${plural?'; conduta pelo maior':''}. ${esc(r.a)}${r.a==='Informe o tamanho'?'':'.'}`;
}

/* ---------- O-RADS US (mesma classificação da calculadora: oradsEval / oradsMgmt, js/calc-orads.js) ---------- */
const LAU_OR = {
  tipo:{l:'Tipo', o:[['uni','Unilocular'],['bi','Bilocular'],['multi','Multilocular'],['solido','Sólida (≥ 80% sólida)']]},
  cont:{l:'Conteúdo', o:['Anecogênico','Ecos de baixo nível','Ecos reticulares (hemorrágico)'], cist:1},
  contorno:{l:'Parede / contorno', o:[['smooth','Liso'],['irregular','Irregular']]},
  solido:{l:'Componente sólido', o:[['none','Ausente'],['pp_lt4','Projeções papilares (< 4)'],['pp_ge4','Projeções papilares (≥ 4)'],['outro','Componente sólido (não papilar)']], cist:1},
  cs:{l:'Escore de cor (Doppler)', o:[[1,'1 — ausente'],[2,'2 — mínimo'],[3,'3 — moderado'],[4,'4 — intenso']]},
  shadow:{l:'Sombra acústica', o:[[1,'Presente'],[0,'Ausente']], sol:1},
  ascite:{l:'Ascite / nódulos peritoneais', o:[[1,'Presentes']]},
  meno:{l:'Status menopausal (conduta)', o:[['pre','Pré-menopausa'],['post_early','Pós-menopausa < 5 anos'],['post_late','Pós-menopausa ≥ 5 anos']]},
};
const LAU_OR_TXT = {
  tipo:{uni:'Imagem cística unilocular', bi:'Imagem cística bilocular', multi:'Imagem cística multilocular', solido:'Lesão sólida'},
  cont:['de conteúdo anecogênico','com ecos de baixo nível','com ecos reticulares de permeio'],
  contorno:{smooth:'de paredes lisas', irregular:'de paredes irregulares'},
  contornoSol:{smooth:'de contornos lisos', irregular:'de contornos irregulares'},
  solido:{none:'sem componente sólido', pp_lt4:'com projeções papilares (menos de quatro)', pp_ge4:'com quatro ou mais projeções papilares', outro:'com componente sólido'},
  cs:{1:'sem fluxo ao Doppler (escore de cor 1)', 2:'com fluxo mínimo ao Doppler (escore de cor 2)', 3:'com fluxo moderado ao Doppler (escore de cor 3)', 4:'com fluxo intenso ao Doppler (escore de cor 4)'},
};
function lauOrMeno(d){ if(d.meno) return d.meno; const A=typeof lauAutoCfg==='function'?lauAutoCfg():{}; return A.fase==='meno' ? 'post_early' : 'pre'; }
function lauOrLesao(f, vals, d){
  let s=lauMaxDim(f, vals); if(s!=null && lauUnMM()) s=s/10;   // calculadora em cm
  return {tipo:d.tipo||null, simples: d.tipo==='uni' && d.cont!=null ? d.cont===0 : null, contorno:d.contorno||null,
          cs:d.cs||null, solido:d.solido||'none', shadow: d.shadow==null ? null : !!d.shadow, size: s==null?'':String(s),
          classica:null, ascite: !!d.ascite};
}
function lauOradsText(f, vals, d, html){
  const L=lauOrLesao(f, vals, d), ev=oradsEval(L);
  const sol = d.tipo==='solido';
  const partes=[ d.tipo ? LAU_OR_TXT.tipo[d.tipo] : lauMk('Lesão anexial ___',html) ];
  if(!sol && d.cont!=null) partes.push(LAU_OR_TXT.cont[d.cont]);
  if(d.contorno) partes.push((sol?LAU_OR_TXT.contornoSol:LAU_OR_TXT.contorno)[d.contorno]);
  if(!sol && d.tipo) partes.push(LAU_OR_TXT.solido[d.solido||'none']);
  if(sol && d.shadow!=null) partes.push(d.shadow ? 'com sombra acústica posterior' : 'sem sombra acústica posterior');
  if(d.cs) partes.push(LAU_OR_TXT.cs[d.cs]);
  let t = (html ? partes.map((x,i)=> i===0 && !d.tipo ? x : esc(x)).join(', ') : partes.join(', '));
  const med = lauTiraMedVazia(lauFill(f.t, vals, html)).trim();
  if(med) t += ', ' + med;
  t += '.';
  if(d.ascite) t += ' Ascite e/ou nódulos peritoneais associados.';
  t += ` O-RADS US: ${ev.cat!=null ? ev.cat : lauMk('?',html)}.`;
  return t;
}
function lauOradsConc(f, vals, d, lbl){
  const L=lauOrLesao(f, vals, d), ev=oradsEval(L);
  const onde = /ov[aá]rio/i.test(lbl||'') ? ' no '+String(lbl).replace(/:$/,'').toLowerCase() : '';
  const tipo = (d.tipo ? {uni:'Cisto unilocular', bi:'Cisto bilocular', multi:'Cisto multilocular', solido:'Lesão sólida'}[d.tipo] : 'Lesão anexial') + onde;
  if(ev.cat==null) return `${tipo} — O-RADS US ${lauMk('?',true)} (complete os descritores).`;
  return `${tipo} — O-RADS US ${ev.cat}.`;   // só a classificação (risco e conduta ficam no painel)
}
function lauOradsDescHTML(k, id, f, d, chip){
  const sol=d.tipo==='solido';
  let h = Object.keys(LAU_OR).filter(key=>!(LAU_OR[key].cist && sol) && !(LAU_OR[key].sol && !sol)).map(key=>{
    const D=LAU_OR[key];
    const ops = D.o.map((o,oi)=> Array.isArray(o) ? chip(key,o[0],o[1],d[key]===o[0] || (key==='meno' && !d.meno && lauOrMeno(d)===o[0]) || (key==='solido' && !d.solido && o[0]==='none' && d.tipo && !sol)) : chip(key,oi,o,d[key]===oi)).join('');
    return `<div class="lau-row"><div class="lau-rl">${esc(D.l)}</div><div class="lau-chips">${ops}</div></div>`;
  }).join('');
  const L=lauOrLesao(f, lauPhBag(k)['f'+id], d), ev=oradsEval(L);
  if(ev.cat!=null){ const C=ORADS_C[ev.cat], mg=oradsMgmt(L, ev, lauOrMeno(d));
    h += `<div class="lau-clres" style="background:${C.bg};border-color:${C.c}"><b style="color:${C.c}">O-RADS US ${ev.cat}</b> — ${esc(C.name)} (risco ${esc(C.risk)}) · ${esc(ev.why||'')}${mg&&mg.a?` · ${esc(mg.a)}`:''}</div>`; }
  else h += `<div class="lau-clres">Marque tipo, contorno${sol?', escore de cor e sombra acústica':', conteúdo (unilocular) e componente sólido'} e preencha as medidas (mesma classificação da calculadora O-RADS).</div>`;
  return h;
}

/* ---------- Hérnias da parede abdominal: colo (2 medidas), saco herniário (3), conteúdo e redutibilidade ---------- */
const LAU_HR = {
  cont:{l:'Conteúdo do saco herniário', o:[['adiposo','Tecido adiposo'],['alcas','Alças intestinais'],['ambos','Tecido adiposo e alças intestinais']]},
  red:{l:'Às manobras', o:[['red','Redutível'],['parc','Parcialmente redutível'],['irr','Irredutível']]},
};
const LAU_HR_TXT = {cont:{adiposo:'tecido adiposo', alcas:'alças intestinais', ambos:'tecido adiposo e alças intestinais'},
  red:{red:'redutível às manobras', parc:'parcialmente redutível às manobras', irr:'irredutível às manobras'}};
function lauHerniaText(f, vals, d, html){
  const v=vals||[];
  const colo=lauDimsTxt([v[0],v[1]]), saco=lauDimsTxt([v[2],v[3],v[4]]);
  const p=[`Hérnia ${f.ht||''}`.trim()];
  if(colo) p.push('com colo ' + colo);
  if(saco) p.push('saco herniário ' + saco);
  if(d.cont) p.push('contendo ' + LAU_HR_TXT.cont[d.cont]);
  if(d.red) p.push(LAU_HR_TXT.red[d.red]);
  const t=p.join(', ') + '.';
  return html ? esc(t) : t;
}
function lauHerniaConc(f, d){ return esc(`Hérnia ${f.ht||''}${d.cont?' contendo '+LAU_HR_TXT.cont[d.cont]:''}.`.replace(/\s+\./,'.')); }
function lauHerniaDescHTML(d, chip){
  return Object.keys(LAU_HR).map(key=>`<div class="lau-row"><div class="lau-rl">${esc(LAU_HR[key].l)}</div><div class="lau-chips">${LAU_HR[key].o.map(o=>chip(key,o[0],o[1],d[key]===o[0])).join('')}</div></div>`).join('');
}

/* ---------- BI-RADS (léxico ACR BI-RADS US, 5ª ed.) ----------
   A categoria é escolhida pelo médico; a sugestão segue os descritores:
   cisto simples → 2; sólido oval, paralelo e circunscrito → 3;
   1 descritor suspeito → 4A, 2 → 4B, ≥3 → 4C; espiculado + irregular +
   não paralelo → 5; massa complexa cística e sólida → 4. */
const LAU_BR = {
  forma:{l:'Forma', o:['oval','redonda','irregular']},
  orient:{l:'Orientação', o:['paralela','não paralela']},
  margem:{l:'Margem', o:['circunscrita','indistinta','angular','microlobulada','espiculada']},
  eco:{l:'Padrão ecogênico', o:['anecoico','hiperecoico','complexo cístico e sólido','hipoecoico','isoecoico','heterogêneo']},
  post:{l:'Achados posteriores (opcional)', o:['sem alterações acústicas posteriores','com reforço acústico posterior','com sombra acústica posterior','com padrão posterior combinado']},
  calc:{l:'Calcificações (opcional)', o:['sem calcificações','com calcificações internas']},
};
const LAU_BR_CATS = ['2','3','4A','4B','4C','5','6'];
const LAU_BR_ORDEM = ['0','1','2','3','4','4A','4B','4C','5','6'];
const LAU_BR_MANEJO = {
  '0':'avaliação adicional por imagem', '1':'rastreamento de rotina', '2':'achado benigno; rastreamento de rotina',
  '3':'provavelmente benigno; controle ultrassonográfico em 6 meses', '4':'suspeito; recomenda-se estudo histopatológico',
  '4A':'baixa suspeição; recomenda-se estudo histopatológico', '4B':'moderada suspeição; recomenda-se estudo histopatológico',
  '4C':'alta suspeição; recomenda-se estudo histopatológico', '5':'altamente sugestivo de malignidade; recomenda-se estudo histopatológico',
  '6':'malignidade comprovada por biópsia; conduta terapêutica',
};
function lauBrSug(d){
  if(d.eco==null && d.forma==null && d.margem==null) return null;
  if(d.eco===0 && (d.margem==null||d.margem===0)) return '2';
  if(d.eco===2) return '4';
  const susp = (d.forma===2) + (d.orient===1) + (d.margem!=null&&d.margem>0) + (d.post===2) + (d.calc===1);
  if(d.margem===4 && d.forma===2 && d.orient===1) return '5';
  if(!susp) return '3';
  return susp===1 ? '4A' : susp===2 ? '4B' : '4C';
}
function lauBrCat(d){ return d.cat || lauBrSug(d); }
function lauBiradsText(f, vals, d, html, locs){
  const w=(k,suf)=> d[k]==null ? lauMk('___',html) : (html?esc(LAU_BR[k].o[d[k]]):LAU_BR[k].o[d[k]])+(suf||'');
  const cat=lauBrCat(d);
  const opt=(k)=> d[k]==null ? '' : (html?esc(LAU_BR[k].o[d[k]]):LAU_BR[k].o[d[k]])+', ';
  const catTxt = cat?esc(cat):lauMk('?',html);
  if(locs){ const br=html?'<br>':'\n';
    return `Identificam-se ${locs.length} nódulos com as mesmas características: forma ${w('forma')}, orientação ${w('orient')} à pele, margem ${w('margem')}, padrão ${w('eco')}, ${opt('post')}${opt('calc')}categoria BI-RADS®: ${catTxt}.`
      + locs.map((l,j)=>`${br}Nódulo ${j+1}: ${l}.`).join(''); }
  return `Nódulo de forma ${w('forma')}, orientação ${w('orient')} à pele, margem ${w('margem')}, ${w('eco')}, ${opt('post')}${opt('calc')}localizado ${lauFill(f.t, vals, html)}. Categoria BI-RADS®: ${catTxt}.`;
}
function lauBiradsConc(f, vals, d, lbl, plural, all){
  const cat=lauBrCat(d); const L=String(lbl||'').toLowerCase().replace(/:$/,'');
  const manejo = `BI-RADS® ${cat?esc(cat)+': '+esc(lauManejo(cat)):lauMk('?',true)}`;
  if(!plural) return `Nódulo na ${esc(L||'mama')} — ${manejo}.`;
  return `Nódulos na ${esc(L||'mama')} — ${manejo}.`;
}
/* categoria BI-RADS de uma instância (frases de mama têm f.br fixo) */
function lauBrOf(id, bag){ const f=lauFI(id); if(!f) return null; if(f.kind==='birads') return lauBrCat(bag['d'+id]||{}); if(lauMgK(f)) return lauMgCat(f, bag['d'+id]||{}); return f.br||null; }
function lauDetSet(k, id, key, fld, v){
  const bag=lauPhBag(k); const d=bag['d'+id]=Object.assign({}, bag['d'+id]||{}); const det=d.det=Object.assign({}, d.det||{});
  const t=det[key]=Object.assign({}, det[key]||{});
  t[fld] = t[fld]===v ? null : v;
  lauRenderLeft();
  if(k==='__obs'){ lauPatchOpt('obs', lauObsHTML()); lauPatchConc(); lauSaveEd(); } else { lauPatch(k); lauUpdSum(k); }
}
function lauDescTxt(k, id, v, redesenha){
  const bag=lauPhBag(k); bag['d'+id]=Object.assign({}, bag['d'+id]||{}, {alvoTxt:v});
  if(redesenha) lauRenderLeft();
  if(k==='__obs'){ lauPatchOpt('obs', lauObsHTML()); lauPatchConc(); lauSaveEd(); } else { lauPatch(k); lauUpdSum(k); }
}
function lauDescSet(k, id, key, v){
  const bag=lauPhBag(k); const d=bag['d'+id]=Object.assign({}, bag['d'+id]||{});
  if(key==='alvos'){ const a=(d.alvos||[]).slice(); const j=a.indexOf(v); j>=0?a.splice(j,1):a.push(v); d.alvos=a; }
  else if(key==='foci'){ let a=(d.foci||[0]).slice(); if(v===0) a=[0]; else { a=a.filter(x=>x!==0); const j=a.indexOf(v); j>=0?a.splice(j,1):a.push(v); if(!a.length) a=[0]; } d.foci=a; }
  else d[key] = d[key]===v ? null : v;
  lauRenderLeft();
  if(k==='__obs'){ lauPatchOpt('obs', lauObsHTML()); lauPatchConc(); lauSaveEd(); } else { lauPatch(k); lauUpdSum(k); }
}
function lauDescHTML(k, id, f, d){
  const chip=(key,v,txt,on)=>`<button type="button" class="ti-ftog ${on?'on':''}" onclick="lauDescSet('${k}','${id}','${key}',${typeof v==='string'?`'${v}'`:v})">${esc(txt)}</button>`;
  if(lauMgK(f) || f.loc){
    const K=lauMgK(f); let h='';
    if(K){
      h += Object.keys(K.desc).map(key=>`<div class="lau-row"><div class="lau-rl">${esc(K.desc[key].l)}</div><div class="lau-chips">${K.desc[key].o.map((o,oi)=>chip(key,oi,o,d[key]===oi)).join('')}</div></div>`).join('');
    }
    h += `<div class="lau-row"><div class="lau-rl">Localização${K&&(f.kind==='mgnod'||f.kind==='mgcalc')?'':' (opcional)'}</div><div class="lau-chips">${LAU_MG_LOC.map((o,oi)=>chip('loc',oi,o[0],d.loc===oi)).join('')}</div>
      <div class="lau-chips" style="margin-top:6px">${LAU_MG_PROF.map((o,oi)=>chip('prof',oi,o,d.prof===oi)).join('')}</div></div>`;
    if(K){
      const sug=K.sug(d), cat=d.cat||sug;
      h += `<div class="lau-row"><div class="lau-rl">Categoria BI-RADS® ${sug?`<span class="lau-sug">sugestão: ${esc(sug)}</span>`:''}</div><div class="lau-chips">${LAU_MG_CATS.map(c=>chip('cat',c,c,d.cat===c||(!d.cat&&sug===c))).join('')}</div></div>`;
      h += `<div class="lau-clres">${cat?`<b>BI-RADS® ${esc(cat)}</b> — ${esc(lauManejo(cat))}${d.cat?'':' <i>(sugestão pelos descritores — confirme)</i>'}`:'Marque os descritores para a sugestão de categoria.'}</div>`;
    }
    return h;
  }
  if(lauKindTE(f)){
    const al=lauAlvos(f.kind); const T=f.kind==='tend'?LAU_TEND_TIPOS:f.kind==='lig'?LAU_LIG_TIPOS:LAU_MUSC_TIPOS;
    const nome = f.kind==='tend'?'Tendão':f.kind==='lig'?'Ligamento':'Músculo';
    const bag=lauPhBag(k); const det=d.det||{};
    let h='';
    if(!d.fixo){
      const ops = (d.opts&&d.opts.length) ? d.opts : al.map((a,i)=>i);
      h += `<div class="lau-row"><div class="lau-rl">${nome}(s) acometido(s) — marque um ou mais</div><div class="lau-chips">${ops.map(ai=>chip('alvos',ai,al[ai][0],(d.alvos||[]).indexOf(ai)>=0)).join('')}</div>
      <input class="lau-txt" style="margin-top:6px" type="text" placeholder="${ops.length?'outro (opcional)':'digite o nome'}" value="${esc(d.alvoTxt||'')}" onchange="lauDescTxt('${k}','${id}',this.value,true)" oninput="lauDescTxt('${k}','${id}',this.value)"></div>`;
    }
    const dchip=(key,fld,v,txt,on)=>`<button type="button" class="ti-ftog ${on?'on':''}" onclick="lauDetSet('${k}','${id}','${key}','${fld}',${typeof v==='string'?`'${v}'`:v})">${esc(txt)}</button>`;
    h += lauAlvoList(f.kind, d).map(a=>{
      const t=det[a.key]||{}; const tpl=lauTendTpl(f,t);
      return `<div class="lau-tbox"><div class="lau-tbox-h">${esc(a.nome)}</div>
        <div class="lau-chips">${T.map(o=>dchip(a.key,'tipo',o[0],o[1],t.tipo===o[0])).join('')}${f.kind==='tend'?dchip(a.key,'bainha',1,a.x&&a.x.tn?'Tenossinovite':'Distensão líquida da bainha',!!t.bainha):''}</div>
        ${f.kind==='tend'&&t.tipo==='parcial'?`<div class="lau-rl" style="margin-top:6px">Face</div><div class="lau-chips">${LAU_FACES.map((o,oi)=>dchip(a.key,'face',oi,o.replace('da face ','face '),(t.face||0)===oi)).join('')}</div>`:''}
        ${tpl?`<div class="lau-rl" style="margin-top:6px">Medidas</div>${lauInlineForm(k,'f'+id+'_'+a.key,tpl,bag['f'+id+'_'+a.key])}`:''}
      </div>`;
    }).join('');
    return h;
  }
  if(f.kind==='orads') return lauOradsDescHTML(k, id, f, d, chip);
  if(f.kind==='hernia') return lauHerniaDescHTML(d, chip);
  if(f.kind==='tirads'){
    const n=lauTrNod(d), ev=tiradsEval(n);
    let h = ['comp','echo','shape','margin'].map(key=>`<div class="lau-row"><div class="lau-rl">${esc(TIRADS_CATS[key].label)}</div><div class="lau-chips">${TIRADS_CATS[key].opts.map((o,oi)=>chip(key,oi,`${o[0]} (${o[1]})`,n[key]===oi)).join('')}</div></div>`).join('');
    h += `<div class="lau-row"><div class="lau-rl">Focos ecogênicos</div><div class="lau-chips">${TIRADS_FOCI.map((o,oi)=>chip('foci',oi,`${o[2]} (${o[1]})`,n.foci.indexOf(oi)>=0)).join('')}</div></div>`;
    const ok=ev.complete||ev.auto; const tc=TIRADS_TRC[ev.tr];
    h += `<div class="lau-clres" style="${ok?`background:${tc.bg};border-color:${tc.c}`:''}">${ok?`<b style="color:${tc.c}">TR${ev.tr} · ${ev.pts} ponto${ev.pts===1?'':'s'}</b> — ${esc(tc.name)} · ${esc(tiradsRec(ev.tr, lauMaxDim(f, lauPhBag(k)['f'+id]), ev.auto).a)}`:'Marque composição, ecogenicidade, formato e margens (mesma pontuação da calculadora TI-RADS).'}</div>`;
    return h;
  }
  let h = Object.keys(LAU_BR).map(key=>`<div class="lau-row"><div class="lau-rl">${esc(LAU_BR[key].l)}</div><div class="lau-chips">${LAU_BR[key].o.map((o,oi)=>chip(key,oi,o,d[key]===oi)).join('')}</div></div>`).join('');
  const sug=lauBrSug(d);
  h += `<div class="lau-row"><div class="lau-rl">Categoria BI-RADS® ${sug?`<span class="lau-sug">sugestão: ${esc(sug)}</span>`:''}</div><div class="lau-chips">${LAU_BR_CATS.map(c=>chip('cat',c,c,d.cat===c||(!d.cat&&sug===c))).join('')}</div></div>`;
  const cat=lauBrCat(d);
  h += `<div class="lau-clres">${cat?`<b>BI-RADS® ${esc(cat)}</b> — ${esc(LAU_BR_MANEJO[cat])}${d.cat?'':' <i>(sugestão pelos descritores — confirme)</i>'}`:'Marque os descritores para a sugestão de categoria.'}</div>`;
  return h;
}
/* frases opcionais marcadas (já preenchidas) */
function lauOptLines(it, s, html){
  return (it.opts||[]).map((o,i)=> s.__o[i] ? lauFill(o, (s.__v['o'+i]), html) : null).filter(x=>x!=null);
}

/* ---------- geração do HTML do laudo ---------- */
function lauItemOculto(m, it){
  // obstétricos com Doppler: bexiga, útero e colo só entram no laudo quando alterados
  if(/^us-obstetrico-(doppler|gemelar-com-doppler)$/.test(m.id) && /^(bexiga|utero|colo-uterino)$/.test(it.k)){
    const s=state.lau.v[it.k];
    const marc = (s.__f||[]).length || (s.__o||[]).some(Boolean) || s.__alt>0;
    if(it.generic) return !(marc || lauHas(s.alt) || Object.values(s.__v||{}).some(a=>Array.isArray(a) && a.some(lauHas)));
    return !marc && lauBuild(m,it).txt==null;
  }
  if(!it.hideNormal) return false;
  const s=state.lau.v[it.k], r=lauBuild(m,it);
  return r.txt==null && !(s.__f||[]).length && !(s.__o||[]).some(Boolean);
}
function lauExceto(txt, les){
  const l = les.map(x=>String(x).trim().replace(/[\s.]+$/,'')).map(x=>x.charAt(0).toLowerCase()+x.slice(1));
  const re = /homogêne([oa])(?=\.)/;
  if(re.test(txt)) return lauGen().les==='exc'
    ? txt.replace(re, m0=>`${m0}, exceto por ${lauJuntaE(l)}`)
    : txt.replace(re, (m0,g)=>`heterogêne${g} pela presença de ${lauJuntaE(l)}`);
  return txt + ' ' + l.map(x=>x.charAt(0).toUpperCase()+x.slice(1)+'.').join(' ');
}
function lauItemHTML(m, it){
  if(m.oct && typeof lauOctItemOculto==='function' && lauOctItemOculto(m,it)) return '';
  const L=state.lau, s=(m.oct && typeof lauOctShadow==='function') ? lauOctShadow(m,it) : L.v[it.k], r=lauBuild(m,it), g=lauGen();
  if(lauItemOculto(m,it)) return '';
  const lblRaw = lauLblLado(m, lauItemLabel(m,it));
  const lbl = lblRaw ? lauFill(lblRaw, s.__v.l, true)+':' : '';
  let txt = r.txt==null ? lauFill(lauItemNormal(m,it), s.__v.n, true) : r.html ? r.txt : esc(r.txt).replace(/\n/g,'<br>');
  if(r.txt==null && it.generic && typeof lauAutoTxt==='function') txt = lauAutoTxt(m, it, txt);
  if(r.txt==null && it.generic) txt = lauAteroTxt(m, txt);
  if(m.lado && m.lado.ambos && state.lau.lado==='b') txt = lauBilPlural(txt);
  const subs = lauFraseLines(s.__f, s.__v, 'sub');
  if(subs.length){
    const multi = (s.__f||[]).filter(id=>{ const f=lauFI(id); return f && lauKindTE(f); }).length;
    if(multi){
      txt = subs.map((x,i)=> i ? x.charAt(0).toUpperCase()+x.slice(1) : x).join(' ');
      const soFixo = (s.__f||[]).every(id=>{ const f=lauFI(id); return !(f && lauKindTE(f)) || (s.__v['d'+id]||{}).fixo; });
      // "Demais…" só quando sobrou algum tendão/ligamento/músculo do item sem alteração
      const sobra = (s.__f||[]).some(id=>{ const f=lauFI(id), d=s.__v['d'+id]||{}; return f && lauKindTE(f) && !d.fixo && (!(d.opts&&d.opts.length) || (d.alvos||[]).length < d.opts.length); });
      if(!soFixo && sobra && /^(tend(ões|oes)|ventres|planos|musculatura|compartimentos|ligamentos)/i.test(lblRaw||'')) txt += ' Demais com aspecto habitual.';
    } else txt = subs[subs.length-1];
  }
  // lesões focais (estruturadas e frases marcadas com les) entram como "homogênea, exceto por …"
  const lesF = (s.__f||[]).filter(id=>{ const f=lauFI(id); return f && f.m==='add' && f.les; });
  const les = (r.les||[]).map(x=>esc(x)).concat(lesF.map(id=>lauFraseText(id, s.__v, true)));
  if(les.length) txt = lauExceto(txt, les);
  const adds = (s.__f||[]).filter(id=>{ const f=lauFI(id); return f && f.m==='add' && !f.les; }).map(id=>lauFraseText(id, s.__v, true));
  if(adds.length && !subs.length && r.txt==null){
    const ws=[]; (s.__f||[]).forEach(id=>{ const f=lauFI(id); if(!f || f.m!=='add') return; const K=lauMgK(f); const xs = K ? K.x(s.__v['d'+id]||{}) : (f.x || (/^mg/.test(f.o) ? ['\u0000'] : null)); if(xs) ws.push(...xs); });
    txt = lauNegStrip(txt, ws, true);
  }
  const ex = lauOptLines(it, s, true).concat(adds);
  if(!txt && ex.length){ txt = ex.shift(); }
  if(ex.length) txt += '<br>' + ex.join('<br>');
  // obstétrico (2º/3º tri, Doppler, gemelar): IR, percentil e MoM não preenchidos saem do laudo
  // "medindo XXX x XXX x XXX cm, com volume estimado em 30 mL": sem as medidas, fica só o volume digitado
  if(it.generic) txt = txt.replace(/medindo <mark class="lau-ph">XXX<\/mark> x <mark class="lau-ph">XXX<\/mark> x <mark class="lau-ph">XXX<\/mark> (?:cm|mm), com (volume estimado em )(?!<mark)/, '$1');
  // nervos: área seccional não medida sai do texto
  if(it.generic && /^nervo (mediano|ulnar)/i.test(lauItemLabel(m,it)||'')) txt = txt.replace(/,? com área seccional de <mark class="lau-ph">XXX<\/mark> mm²[^.<]*/, '');
  // artéria hepática (Doppler): IR não preenchido sai do texto
  if(it.generic && /^arteria hepatica/.test(lauNorm(lauItemLabel(m,it)||''))) txt = txt.replace(/,? (?:e|com) índice de resistividade \(IR\) de <mark class="lau-ph">XXX<\/mark>/, '');
  // próstata: protrusão intravesical (IPP) sem medida → "não caracterizada"
  if(it.generic && /^protrusao prostatica intravesical/.test(lauNorm(lauItemLabel(m,it)||'')) && /^de cerca de <mark class="lau-ph">XXX<\/mark> (cm|mm)\.?$/.test(txt.trim())) txt = 'não caracterizada.';
  if(it.generic && !lauItemLabel(m,it)) txt = txt.replace(/^(Protrusão prostática intravesical(?: \(IPP\))?) (?:de cerca de|estimada em) <mark class="lau-ph">XXX<\/mark> (?:cm|mm)\./, '$1 não caracterizada.');
  if(it.generic && typeof lauRetosTxt==='function') txt = lauRetosTxt(m, it, txt);
  if(it.generic && typeof lauCarAtivo==='function' && lauCarAtivo(m)){ txt = lauCarItemTxt(m, it, lauCarTxt(m, it, txt)); if(!txt) return ''; }
  if(it.generic && typeof lauObsDopAtivo==='function' && lauObsDopAtivo(m)){
    if(lauAutoCfg().on) txt = lauObsLiqTxt(m, it, txt);
    const PH='<mark class="lau-ph">XXX<\/mark>';
    txt = txt.replace(new RegExp('IR = '+PH+' e (?=IP)','g'), '')
             .replace(new RegExp(',? correspondendo ao percentil '+PH+' para a idade gestacional','g'), '')
             .replace(new RegExp(' \\(percentil '+PH+'\\)','g'), '')
             .replace(new RegExp(' \\('+PH+' MoM\\)','g'), '')
             .replace(new RegExp(' e de espessura de até '+PH+' mm','g'), '')
             .replace(/ Grau de maturação \(Grannum\): <mark class="lau-ph">[^<]*<\/mark>\./g, '');
  }
  if(m.semRot) return txt;   // densitometria / OCT: frases corridas, sem rótulo nem hífen
  const pre = (g.hifen && it.dash) ? '- ' : '';
  return lbl ? `${pre}${g.bold?`<b>${lbl}</b>`:lbl} ${txt}` : `${pre}${txt}`;
}
function lauConcs(m){
  const out=[];
  const seen={};
  const grupos={};
  const push=(h)=>{
    if(Array.isArray(h)) return h.forEach(push);
    if(h && typeof h==='object'){            // achado agrupável (tendões / músculos)
      if(!grupos[h.g]){ grupos[h.g]={pre:h.pre, suf:h.suf, musc:h.musc, lig:h.lig, hemat:h.hemat, des:[]}; out.push({grupo:h.g}); }
      if(grupos[h.g].des.indexOf(h.de)<0) grupos[h.g].des.push(h.de);
      return;
    }
    if(h && !seen[h]){ seen[h]=1; out.push({html:h}); }
  };
  const vis = m.items.filter(it=>!lauItemOutroLado(m,it));   // exame unilateral: ignora o outro lado
  vis.forEach(it=>{
    (lauBuild(m,it).conc||[]).forEach(c=>push(esc(c)));
    const s=state.lau.v[it.k];
    (s.__f||[]).forEach(id=>push(lauFraseConc(id, s.__v, lauLblLado(m, lauItemLabel(m,it)))));
  });
  (state.lau.xf||[]).forEach(id=>push(lauFraseConc(id, state.lau.xv, '')));
  out.forEach(o=>{ if(o.grupo){ const g=grupos[o.grupo]; const pl=g.des.length>1;
    const alvo = g.lig ? `${pl?'dos ligamentos':'do ligamento'} ${lauJuntaE(g.des)}` : g.musc ? `${g.hemat?(pl?'nos músculos':'no músculo'):(pl?'dos músculos':'do músculo')} ${lauJuntaE(g.des)}` : g.des.join(', ').replace(/, ([^,]*)$/, pl&&g.des.length>2?', $1':', $1');
    o.html = esc(`${g.pre} ${alvo}${g.suf}`); delete o.grupo; } });
  (m.concOpts||[]).forEach((c,i)=>{ if(state.lau.conc.o[i]) out.push({html:lauFill(c.text, state.lau.conc.v['o'+i], true)}); });
  // categoria BI-RADS final do exame = a mais alta entre os achados
  let br=null; const cats=new Set();
  const seeBr=(list,bag)=>(list||[]).forEach(id=>{ const c=lauBrOf(id,bag); if(c){ cats.add(c); if(br==null || LAU_BR_ORDEM.indexOf(c)>LAU_BR_ORDEM.indexOf(br)) br=c; } });
  vis.forEach(it=>seeBr(state.lau.v[it.k].__f, state.lau.v[it.k].__v)); seeBr(state.lau.xf, state.lau.xv);
  if(m.metodo==='dmo' && typeof dmoConcs==='function') return dmoConcs(m);
  if(m.oct && typeof lauOctConcs==='function') return lauOctConcs(m);
  if(m.metodo==='mmg' || m.id==='us-mamas'){
    // mamografia (e US das mamas): achados sem categoria em cada linha, iguais nas duas mamas viram uma frase só,
    // e uma única categoria BI-RADS® no fim (a mais alta)
    if(m.items.some(it=>it.sk==='mgcir' && !lauItemOutroLado(m,it) && (lauBuild(m,it).conc||[]).length)){
      cats.add('2');
    }
    // hierarquia ACR para a avaliação global: 1 < 2 < 3 < 6 < 0 < 4 < 5
    const ORD=['1','2','3','6','0','4','4A','4B','4C','5'];
    br = [...cats].sort((a,b)=>ORD.indexOf(b)-ORD.indexOf(a))[0] || null;
    const res = lauMgMergeConc(out.map(o=>o.html));
    if(br) res.push(`Categoria BI-RADS®: ${esc(br)} (${esc(lauManejo(br))}).`);
    return res.map(h=>({html:h}));
  }
  if(br && cats.size>1) out.push({html:`Categoria BI-RADS® final do exame: ${esc(br)} (${esc(lauManejo(br))}).`});
  return out;
}
/* singular → plural quando o mesmo achado está nas duas mamas */
const LAU_MG_PLURAL = [
  [/^Ginecomastia nas mamas/,'Ginecomastia bilateral'],
  [/^Cisto simples/,'Cistos simples'], [/^Cisto complicado/,'Cistos complicados'], [/^Cisto oleoso/,'Cistos oleosos'],
  [/^Massa complexa cística e sólida/,'Massas complexas císticas e sólidas'], [/^Coleção/,'Coleções'],
  [/^Nódulo /,'Nódulos '], [/^Linfonodo intramamário/,'Linfonodos intramamários'], [/^Fibroadenoma calcificado/,'Fibroadenomas calcificados'],
  [/^Assimetria global/,'Assimetrias globais'], [/^Assimetria focal/,'Assimetrias focais'], [/^Assimetria /,'Assimetrias '],
  [/^Distorção arquitetural cicatricial/,'Distorções arquiteturais cicatriciais'], [/^Distorção arquitetural/,'Distorções arquiteturais'],
  [/^Lesão com conteúdo/,'Lesões com conteúdo'], [/^Clipe metálico/,'Clipes metálicos'], [/^Status pós-mastectomia/,'Status pós-mastectomia'],
];
function lauMgMergeConc(lines){
  const tira = h => h.replace(/\s*\(BI-RADS®[^)]*\)/g,'').replace(/\s+—\s+BI-RADS®.*$/,'').replace(/[\s.;,]*$/,'') + '.';
  const out=[], idx={};
  lines.map(tira).forEach(h=>{
    const mm = h.match(/ na mama (direita|esquerda)/);
    if(!mm){ if(out.indexOf(h)<0) out.push(h); return; }
    const key = h.replace(mm[0],' na mama §');
    if(idx[key]==null){ idx[key]={i:out.length, lados:new Set([mm[1]])}; out.push(h); return; }
    const g=idx[key]; g.lados.add(mm[1]);
    if(g.lados.size>1){
      let t = key.replace(' na mama §',' nas mamas'); const pl = LAU_MG_PLURAL.find(p=>p[0].test(t));
      t = pl ? t.replace(pl[0],pl[1]) : (/^[A-ZÀ-Ú][a-zà-ú]*s\b/.test(t) ? t : key.replace(' na mama §',' em ambas as mamas'));
      out[g.i]=t;
    }
  });
  return out;
}
function lauConcHTML(m){
  const g=lauGen(); const f=lauConcs(m); const L=state.lau;
  const au = (typeof lauAutoConcs==='function' && !m.semRot && m.metodo!=='mmg') ? lauAutoConcs(m) : {out:[], reps:[]};
  au.out.forEach(t=>f.push({html:esc(t)}));
  const cv = (x)=> typeof lauAutoConcVals==='function' ? lauAutoConcVals(m, x.c.text, L.conc.v['n'+x.i]) : L.conc.v['n'+x.i];
  const crep = (h)=> au.reps.reduce((a,[re,b])=>a.replace(re,b), h);
  const norm = lauConcNormalLines(m).map((c,i)=>({c, i, ph:lauHasPh(c.text)}));
  let lines;
  if(!f.length && !au.reps.length) lines = norm.map(x=>({html:lauFill(x.c.text, cv(x), true), dash:x.c.dash}));
  else if(!f.length) lines = norm.map(x=>({html:crep(lauFill(x.c.text, cv(x), true)), dash:x.c.dash})).filter(x=>!/sem alterações|sem achados|dentro dos par/i.test(x.html) || !au.reps.length);
  else {
    const keep = norm.filter(x=>x.ph || (au.keep||[]).some(re=>re.test(x.c.text))).map(x=>({html:crep(lauFill(x.c.text, cv(x), true)), dash:x.c.dash}));
    const tail = norm.filter(x=>!x.ph && /^Restante/i.test(x.c.text)).map(x=>({html:esc(x.c.text), dash:x.c.dash}));
    lines = keep.concat(f.map(x=>({html:x.html,dash:true})), tail);
  }
  if(m.oct && !f.length && (L.lado==='d'||L.lado==='e')) lines = lines.map(x=>({html: x.html.replace('Exame dentro dos parâmetros de normalidade em ambos os olhos.', `Olho ${L.lado==='d'?'direito':'esquerdo'} dentro dos parâmetros de normalidade.`), dash:x.dash}));
  return lines.map(x=>`<div>${g.hifen&&x.dash&&!m.semRot?'- ':''}${x.html}</div>`).join('');
}
function lauTecOpts(){ const m=lauModelo(state.lau.model); return LAU_TEC[(m&&m.metodo)||'us'] || LAU_TEC.us; }
function lauTecTxt(){
  const t=state.lau.tec, l=lauTecOpts().filter(o=>t[o[0]]).map(o=>o[1]);
  return l.length ? `Exame com limitação técnica devido a ${lauJuntaE(l)}.` : '';
}
/* membro bilateral (opção "Bilateral" nos exames de um membro): plural das veias/artérias */
const LAU_BIL_PLURAL = [[/\bpoplítea, tibiais e fibular\b/g,'poplíteas, tibiais e fibulares'],[/\bsafenas magna e parva\b/g,'safenas magnas e parvas'],
  [/\bVeias subclávia, axilar, braquial, radial, ulnar,/g,'Veias subclávias, axilares, braquiais, radiais, ulnares,'],[/\bcefálica\b/g,'cefálicas'],[/\bbasílica\b/g,'basílicas']];
function lauBilPlural(t){ return LAU_BIL_PLURAL.reduce((x,[a,b])=>x.replace(a,b), t); }
function lauLadoTitulo(m, t, html){
  const L=state.lau; if(!m.lado) return t;
  const v=L.lado;
  if(m.lado.bil){
    if(v!=='d' && v!=='e') return t;
    if(m.lado.mg) return t.replace(/BILATERAL/, `DA MAMA ${v==='d'?'DIREITA':'ESQUERDA'}`);
    return t.replace(/DOS MEMBROS (INFERIORES|SUPERIORES)/, (_,x)=>`DO MEMBRO ${x==='INFERIORES'?'INFERIOR':'SUPERIOR'} ${v==='d'?'DIREITO':'ESQUERDO'}`);
  }
  if(v==='b' && m.lado.ambos) return t.replace(/DO MEMBRO (INFERIOR|SUPERIOR)/, (_,x)=>`DOS MEMBROS ${x}ES`);
  const f=m.lado.gen==='f';
  const txt = v==='d' ? (f?'DIREITA':'DIREITO') : v==='e' ? (f?'ESQUERDA':'ESQUERDO') : null;
  return txt ? t+' '+txt : t + ' ' + (html?`<mark class="lau-ph">${f?'DIREITA / ESQUERDA':'DIREITO / ESQUERDO'}</mark>`:'XXX');
}
function lauTitHTML(m){
  const ls=lauTitulo(m).split('\n');
  return ls.map((t,i)=>{ let h=lauFill(t, state.lau.tit['t'+i], true); if(i===ls.length-1) h=lauLadoTitulo(m,h,true); return `<b>${h}</b>`; }).join('<br>');
}
/* exame bilateral com um lado escolhido: some o que for do outro lado (itens e cabeçalhos) */
function lauOutroLado(m, txt){
  const L=state.lau; if(!m.lado || !m.lado.bil || (L.lado!=='d' && L.lado!=='e')) return false;
  return L.lado==='d' ? /\besquerd[oa]s?\b/i.test(txt||'') : /\bdireit[oa]s?\b/i.test(txt||'');
}
function lauItemOutroLado(m, it){ return lauOutroLado(m, it.grp) || ((/^(direit|esquerd)[oa]$/i.test(it.label||'') || (m.lado&&m.lado.mg&&/^mama (direita|esquerda)$/i.test(it.label||''))) && lauOutroLado(m, it.label)); }
function lauSetLado(v){
  const L=lauCur(); if(!L) return; const m=lauModelo(L.model);
  L.lado = L.lado===v ? null : v;
  if(m.lado && m.lado.bil){ lauSaveEd(); L.html=null; render(true); return; }   // reconstrói sem o outro lado
  lauRenderLeft(); lauPatchTit();
  if(m.lado && m.lado.ambos){ const ed=lauEd(); if(ed) m.items.forEach(o=>{ const q=ed.querySelector(`[data-k="${o.k}"]`); if(!q) return; const h=lauItemHTML(m,o); if(q.innerHTML!==h){ q.innerHTML=h; q.hidden=!h; } }); lauSaveEd(); }
}
function lauLadoHTML(m){
  if(!m.lado) return '';
  const L=state.lau; const f=m.lado.gen==='f';
  const ops = m.lado.eye ? [['bi','Ambos os olhos'],['d','Só olho direito'],['e','Só olho esquerdo']] : m.lado.bil ? [['bi','Bilateral'],['d',f?'Direita':'Direito'],['e',f?'Esquerda':'Esquerdo']] : [['d',f?'Direita':'Direito'],['e',f?'Esquerda':'Esquerdo']].concat(m.lado.ambos ? [['b','Bilateral']] : []);
  const cur = m.lado.bil ? (L.lado||'bi') : L.lado;
  return `<div class="lau-lado"><span>${m.lado.eye?'Olhos':'Lado'}</span>${ops.map(o=>`<button type="button" class="ti-ftog ${cur===o[0]?'on':''}" onclick="lauSetLado('${o[0]}')">${o[1]}</button>`).join('')}</div>`;
}
function lauDocHTML(m){
  const L=state.lau; const tec=lauTecTxt();
  const body = m.seq.map(e=>{
    if(e.t==='blank') return '<p><br></p>';
    if(e.t==='line'){
      if(!lauOutroLado(m, e.text)) return `<p>${m.oct?'<b>'+esc(e.text)+'</b>':esc(e.text)}</p>`;
      return m.lado && m.lado.eye ? `<p><b>${esc(e.text)}</b></p><p>Não consta exame do ${/esquerd/i.test(e.text)?'olho esquerdo':'olho direito'} para análise.</p>` : '';
    }
    const it=m.items.find(x=>x.k===e.k); if(!it || lauItemOutroLado(m,it)) return '';
    const h=lauItemHTML(m,it); return `<p data-k="${it.k}"${h?'':' hidden'}>${h}</p>`;
  }).join('');
  return `<p data-k="titulo" style="text-align:center">${lauTitHTML(m)}</p>`
    + (lauHas(L.ind)?`<p data-k="ind"><b>Indicação:</b> ${esc(L.ind)}</p>`:'')
    + (tec?`<p data-k="tec">${esc(tec)}</p>`:'')
    + ((typeof lauIgDocHTML==='function' && lauIgDocHTML(m)) ? `<p data-k="ig">${lauIgDocHTML(m)}</p>` : '')
    + `<p><br></p>` + body
    + (lauObsHTML()?`<p data-k="obs">${lauObsHTML()}</p>`:'')
    + (m.concTitulo ? `<p><br></p><p data-k="concT"><b>${esc(lauConcTitulo(m))}</b></p><div data-k="conc">${lauConcHTML(m)}</div>` : '')
    + (m.trailer.length ? `<p><br></p>` + m.trailer.map(t=>`<p>${esc(t)}</p>`).join('') : '');
}

/* ---------- editor: montar, aplicar alterações ---------- */
function lauEd(){ const e=document.getElementById('lau-ed'); return e && e.dataset.mounted ? e : null; }
function lauMountEditor(){
  const ed=document.getElementById('lau-ed'), L=lauCur(); if(!ed||!L||ed.dataset.mounted) return;
  ed.dataset.mounted='1';
  const m=lauModelo(L.model);
  ed.innerHTML = L.html || lauDocHTML(m);
  ed.style.fontFamily = lauFontCss(L.font);
  ed.style.fontSize = L.size+'pt';
  L.html = ed.innerHTML;
  try{ document.execCommand('styleWithCSS', false, false); }catch(_){}
}
function lauSaveEd(){ const ed=lauEd(); if(ed && state.lau) state.lau.html=ed.innerHTML; }
function lauPatch(k){
  const ed=lauEd(), L=lauCur(); if(!ed||!L) return;
  const m=lauModelo(L.model); const it=m.items.find(x=>x.k===k);
  if(it){
    let p=ed.querySelector(`[data-k="${k}"]`);
    if(!p){
      p=document.createElement('p'); p.dataset.k=k;
      const ref=ed.querySelector('[data-k="concT"]'); ref?ed.insertBefore(p,ref):ed.appendChild(p);
    }
    const h=lauItemHTML(m,it); p.innerHTML = h; p.hidden = !h; if(h) lauFlash(p);
    if(typeof lauAutoStUpd==='function') lauAutoStUpd(m,it);
    const outros = m.oct || (typeof lauAutoAfetaOutros==='function' && lauAutoAfetaOutros(m,it));
    if(outros) m.items.forEach(o=>{ if(o.k===k) return; const q=ed.querySelector(`[data-k="${o.k}"]`); if(!q) return; const hh=lauItemHTML(m,o); if(q.innerHTML!==hh){ q.innerHTML=hh; q.hidden=!hh; } });   // frases que ocultam itens do mesmo olho
  }
  lauPatchConc(); lauSaveEd();
}
function lauPatchConc(){
  const ed=lauEd(), L=lauCur(); if(!ed||!L||!L.autoConc) return;
  const m=lauModelo(L.model); if(!m.concTitulo) return;
  let c=ed.querySelector('[data-k="conc"]');
  if(!c){ c=document.createElement('div'); c.dataset.k='conc'; ed.appendChild(c); }
  const novo=lauConcHTML(m);
  if(c.innerHTML!==novo){ c.innerHTML=novo; lauFlash(c); }
}
function lauPatchTit(){
  const ed=lauEd(), L=lauCur(); if(!ed||!L) return;
  const p=ed.querySelector('[data-k="titulo"]'); if(p){ p.innerHTML=lauTitHTML(lauModelo(L.model)); lauFlash(p); }
  lauSaveEd();
}
function lauPatchOpt(k, html){
  const ed=lauEd(); if(!ed) return;
  let p=ed.querySelector(`[data-k="${k}"]`);
  if(!html){ if(p) p.remove(); lauSaveEd(); return; }
  if(!p){
    p=document.createElement('p'); p.dataset.k=k;
    if(k==='obs'){
      const ref=ed.querySelector('[data-k="concT"]');
      if(ref){ const prev=ref.previousElementSibling; ed.insertBefore(p, (prev && prev.innerHTML==='<br>') ? prev : ref); }
      else ed.appendChild(p);
    } else {
      const anchor = (k==='tec' && ed.querySelector('[data-k="ind"]')) || (k==='ig' && (ed.querySelector('[data-k="tec"]') || ed.querySelector('[data-k="ind"]'))) || ed.querySelector('[data-k="titulo"]');
      if(anchor) anchor.after(p); else ed.insertBefore(p, ed.firstChild);
    }
  }
  p.innerHTML=html; lauFlash(p); lauSaveEd();
}
function lauFlash(el){ try{ el.classList.remove('lau-flash'); void el.offsetWidth; el.classList.add('lau-flash'); }catch(_){} }

/* ---------- comandos do editor ---------- */
function lauCmd(cmd, val){
  const ed=lauEd(); if(!ed) return;
  ed.focus();
  try{ document.execCommand(cmd, false, val==null?null:val); }catch(_){}
  lauSaveEd();
}
function lauSelInEd(){
  const sel=window.getSelection(); const ed=lauEd();
  return sel && sel.rangeCount && !sel.isCollapsed && ed && ed.contains(sel.anchorNode);
}
function lauSetFont(id){
  const ed=lauEd(); if(!ed) return;
  if(lauSelInEd()){ lauCmd('fontName', lauFontCss(id)); return; }
  state.lau.font=id; ed.style.fontFamily=lauFontCss(id);
}
function lauSetSize(pt){
  const ed=lauEd(); if(!ed) return; pt=parseInt(pt,10);
  if(lauSelInEd()){
    lauCmd('fontSize','7');
    ed.querySelectorAll('font[size="7"]').forEach(f=>{
      const sp=document.createElement('span'); sp.style.fontSize=pt+'pt'; if(f.face) sp.style.fontFamily=f.face; if(f.color) sp.style.color=f.color;
      while(f.firstChild) sp.appendChild(f.firstChild); f.replaceWith(sp);
    });
    lauSaveEd(); return;
  }
  state.lau.size=pt; ed.style.fontSize=pt+'pt';
}
let _lauRange=null;
function lauKeepSel(){ const s=window.getSelection(); const ed=lauEd(); if(s&&s.rangeCount&&ed&&ed.contains(s.anchorNode)) _lauRange=s.getRangeAt(0).cloneRange(); else _lauRange=null; }
function lauRestoreSel(){ if(!_lauRange) return; const s=window.getSelection(); s.removeAllRanges(); s.addRange(_lauRange); }

/* cópia sem as marcações amarelas dos campos */
function lauCleanClone(){
  const ed=lauEd(); if(!ed) return null;
  const c=ed.cloneNode(true);
  c.querySelectorAll('[hidden]').forEach(e=>e.remove());
  c.querySelectorAll('mark.lau-ph').forEach(mk=>mk.replaceWith(document.createTextNode(mk.textContent)));
  c.querySelectorAll('[data-k]').forEach(e=>e.removeAttribute('data-k'));
  c.querySelectorAll('.lau-flash').forEach(e=>e.classList.remove('lau-flash'));
  c.querySelectorAll('[class=""]').forEach(e=>e.removeAttribute('class'));
  return c;
}
function lauPlain(){
  const c=lauCleanClone(); if(!c) return '';
  c.querySelectorAll('br').forEach(b=>b.replaceWith(document.createTextNode('\n')));
  c.querySelectorAll('p,div').forEach(e=>e.appendChild(document.createTextNode('\n')));
  return c.textContent.replace(/ /g,' ').replace(/\n{3,}/g,'\n\n').trim();
}
function lauRichHTML(){
  const c=lauCleanClone(); const L=lauCur(); if(!c||!L) return '';
  return `<div style="font-family:${lauFontCss(L.font).replace(/"/g,"'")};font-size:${L.size}pt">${c.innerHTML}</div>`;
}
function lauPending(){ const ed=lauEd(); return ed ? ed.querySelectorAll('mark.lau-ph').length : 0; }
function lauCopy(){
  const plain=lauPlain(), html=lauRichHTML();
  const n=lauPending(); const msg = n ? `Laudo copiado ✓ (${n} campo${n>1?'s':''} sem preencher)` : 'Laudo copiado ✓';
  try{
    if(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write){
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html],{type:'text/html'}),
        'text/plain': new Blob([plain],{type:'text/plain'})})])
        .then(()=>klugToast(msg)).catch(()=>klugCopy(plain,msg));
      return;
    }
  }catch(_){}
  klugCopy(plain,msg);
}
function lauDownload(){
  const L=lauCur(); if(!L) return;
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Laudo</title>
<style>body{font-family:${lauFontCss(L.font).replace(/"/g,"'")};font-size:${L.size}pt;} p,div{margin:0 0 2pt 0;}</style></head><body>${lauRichHTML()}</body></html>`;
  const blob=new Blob(['﻿',doc],{type:'application/msword'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=L.model+'.doc'; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- ações do painel esquerdo ---------- */
function lauToggle(k){ const L=lauCur(); if(!L) return; L.open = L.open===k ? null : k; lauRenderLeft(); }
function lauSet(k, c, v){
  const L=lauCur(); if(!L) return;
  const s=L.v[k]; s[c] = (v==='__toggle') ? !s[c] : v;
  lauRenderLeft(); lauPatch(k);
}
function lauSetQ(k, c, v, i){
  const L=lauCur(); if(!L) return;
  if(i!=null){ const a=(L.v[k][c]||['','','']).slice(); a[i]=v; L.v[k][c]=a; }
  else L.v[k][c]=v;
  lauPatch(k); lauUpdSum(k);
}
/* campos das máscaras: k = item | '__tit' | '__conc'; tpl = 'n','l','o0',… */
function lauPhBag(k){
  const L=lauCur(); if(k==='__tit') return L.tit; if(k==='__conc') return L.conc.v; if(k==='__obs') return L.xv; return L.v[k].__v;
}
function lauPh(k, tpl, i, v, str){
  const L=lauCur(); if(!L) return;
  const bag=lauPhBag(k); const a=(bag[tpl]||[]).slice(); a[i]=v; bag[tpl]=a;
  // atualiza os campos automáticos (volume) do mesmo trecho
  const t=lauTpl(str||''); Object.keys(t.auto).forEach(j=>{
    const el=document.getElementById(`ph-${k}-${tpl}-${j}`); if(el){ const av=lauAutoVal(t,a,+j); el.placeholder = av!=null ? av : '…'; }
  });
  if(/^f\d/.test(tpl)){ const id=tpl.slice(1), f=lauFI(id), el=document.getElementById(`desc-${k}-${id}`);
    if(f && f.kind && el) el.innerHTML = translateHTML(lauDescHTML(k, id, f, bag['d'+id]||{})); }
  if(k==='__tit') lauPatchTit();
  else if(k==='__conc'){ lauPatchConc(); lauSaveEd();
    if(typeof lauObsDopAtivo==='function'){ const m=lauModelo(L.model); if(lauObsDopAtivo(m)) lauObsDopCalc(m); } }
  else if(k==='__obs'){ lauPatchOpt('obs', lauObsHTML()); lauPatchConc(); lauSaveEd(); }
  else { lauPatch(k); lauUpdSum(k);
    if(typeof lauEcoCalc==='function'){ const L=lauCur(), m=L&&lauModelo(L.model); const it=m&&m.items.find(x=>x.k===k);
      if(it && m.id==='us-ecocardio'){ if(L.v[k].__ecoAuto) delete L.v[k].__ecoAuto[i]; lauEcoCalc(m); }
      if(it && typeof lauCarAtivo==='function' && lauCarAtivo(m)){ if(L.v[k].__carAuto) delete L.v[k].__carAuto[i]; lauCarCalc(m); }
      if(it && typeof lauObsDopAtivo==='function' && lauObsDopAtivo(m)){ if(L.v[k].__obsAuto) delete L.v[k].__obsAuto[tpl+':'+i]; lauObsDopCalc(m); } } }
}
function lauOpt(k, i){
  const L=lauCur(); if(!L) return;
  if(k==='__conc'){ L.conc.o[i]=!L.conc.o[i]; lauRenderLeft(); lauPatchConc(); lauSaveEd(); return; }
  const s=L.v[k]; s.__o[i]=!s.__o[i]; lauRenderLeft(); lauPatch(k);
  const m=lauModelo(L.model); if(typeof lauObsDopAtivo==='function' && lauObsDopAtivo(m)) lauObsDopCalc(m);
}
/* rótulo curto do botão de cada alternativa: começo do texto (sem campos) */
function lauAltRotulo(a, todas){
  let t=String(a).replace(/\bX{2,3}\b/g,'…').replace(/\s+/g,' ').trim();
  // começo igual em todas as opções (ex.: "Realizados cortes axiais …"): mostra só o que muda
  if(todas && todas.length>1){
    const ws=todas.map(x=>String(x).split(/\s+/)); let n=0;
    while(ws.every(w=>w[n]!=null && w[n]===ws[0][n])) n++;
    if(n>=2) t='… '+t.split(/\s+/).slice(n).join(' ');
  }
  t=t.split(/(?<=[.;])\s/)[0].replace(/[.;]$/,'');
  return t.length>48 ? t.slice(0,46).replace(/\s+\S*$/,'')+'…' : t;
}
function lauAltSet(k, i){
  const L=lauCur(); if(!L) return; const s=L.v[k]; if(!s) return;
  if((s.__alt||0)===i) return;
  s.__alt=i; s.__v.n=[];   // os campos mudam de posição entre as variações
  lauRenderLeft(); lauPatch(k); lauUpdSum(k);
}
function lauItemReset(k){
  const L=lauCur(); if(!L) return;
  const it=lauModelo(L.model).items.find(x=>x.k===k);
  L.v[k]=lauDefaults(it); lauRenderLeft(); lauPatch(k);
}
function lauSetAuto(on){ const L=lauCur(); if(!L) return; L.autoConc=on; lauRenderLeft(); if(on){ lauPatchConc(); lauSaveEd(); } }
function lauSetTec(c){ const L=lauCur(); if(!L) return; L.tec[c]=!L.tec[c]; lauRenderLeft(); lauPatchOpt('tec', esc(lauTecTxt())); }
function lauSetInd(v){ const L=lauCur(); if(!L) return; L.ind=v; lauPatchOpt('ind', lauHas(v)?`<b>Indicação:</b> ${esc(v)}`:''); }
function lauSetIndChip(v){ const L=lauCur(); if(!L) return; lauSetInd(L.ind===v?'':v); lauRenderLeft(); }
function lauObsHTML(){
  const L=state.lau; const parts=[];
  if(lauHas(L.obs)) parts.push(esc(L.obs).replace(/\n/g,'<br>'));
  return parts.concat(lauFraseLines(L.xf, L.xv, 'add')).join('<br>');
}
function lauSetObs(v){ const L=lauCur(); if(!L) return; L.obs=v; lauPatchOpt('obs', lauObsHTML()); }
let _lauFseq=0;
function lauFraseList(k){ const L=lauCur(); return k==='__obs' ? L.xf : L.v[k].__f; }
/* frase "acrescenta": cada toque cria uma nova instância; "substitui": liga/desliga */
function lauFraseToggle(k, i){
  const L=lauCur(); if(!L) return;
  const list=lauFraseList(k); const f=LAU_FRASES[i];
  const cur=list.filter(id=>parseInt(id,10)===i);
  if(f.m==='sub' && !lauKindTE(f) && cur.length) cur.forEach(id=>list.splice(list.indexOf(id),1));
  else {
    const id=i+'_'+(++_lauFseq); list.push(id);
    if(lauKindTE(f) && k!=='__obs'){
      const m=lauModelo(L.model), it=m.items.find(x=>x.k===k);
      const ops=lauAlvoOpts(f.kind, lauItemLabel(m,it));
      if(ops.length===1) L.v[k].__v['d'+id] = {alvos:[ops[0]], fixo:true};
      else {
        // item com vários: todos os da articulação, menos os que têm item próprio (ex.: cabeça longa do bíceps)
        const proprios = m.items.filter(x=>x.k!==k).map(x=>lauAlvoOpts(f.kind, lauItemLabel(m,x))).filter(o=>o.length===1).map(o=>o[0]);
        const todos = lauAlvos(f.kind).map((a,j)=>j).filter(j=>proprios.indexOf(j)<0);
        const ord = ops.concat(todos.filter(j=>ops.indexOf(j)<0));
        L.v[k].__v['d'+id] = {opts:ord, alvos:[]};
      }
    }
  }
  lauFraseAfter(k);
}
function lauQnSet(k, id, v){ const bag=lauPhBag(k); bag['d'+id]=Object.assign({}, bag['d'+id]||{}, {qn:v}); lauRenderLeft(); if(k==='__obs'){ lauPatchOpt('obs', lauObsHTML()); lauPatchConc(); lauSaveEd(); } else { lauPatch(k); lauUpdSum(k); } }
function lauQnAdd(k, id){ const d=lauPhBag(k)['d'+id]||{}; lauQnSet(k, id, String(Math.min(12, lauQn(d)+1))); }
function lauQnDel(k, id, j){
  const bag=lauPhBag(k); const d=bag['d'+id]||{}; const n=lauQn(d);
  for(let x=j; x<n; x++) bag['f'+id+'_'+x] = bag['f'+id+'_'+(x+1)];
  delete bag['f'+id+'_'+n];
  if(n<=2){ bag['d'+id]=Object.assign({}, d, {qtd:'1', qn:2}); lauRenderLeft(); if(k==='__obs'){ lauPatchOpt('obs', lauObsHTML()); lauPatchConc(); lauSaveEd(); } else { lauPatch(k); lauUpdSum(k); } return; }
  lauQnSet(k, id, String(n-1));
}
/* frases com f.mt: o maior + outros achados descritos um a um (ex.: miomas) */
function lauMtN(d){ const n=parseInt((d||{}).nx,10); return isNaN(n)?0:Math.max(0,Math.min(12,n)); }
function lauMtSet(k, id, n){ const bag=lauPhBag(k); bag['d'+id]=Object.assign({}, bag['d'+id]||{}, {nx:n}); lauRenderLeft(); if(k==='__obs'){ lauPatchOpt('obs', lauObsHTML()); lauPatchConc(); lauSaveEd(); } else { lauPatch(k); lauUpdSum(k); } }
function lauMtAdd(k, id){ lauMtSet(k, id, lauMtN(lauPhBag(k)['d'+id])+1); }
function lauMtDel(k, id, j){
  const bag=lauPhBag(k); const n=lauMtN(bag['d'+id]);
  for(let x=j; x<=n; x++) bag['f'+id+'_'+x] = bag['f'+id+'_'+(x+1)];
  delete bag['f'+id+'_'+(n+1)];
  lauMtSet(k, id, n-1);
}
function lauFraseAddDiff(k, i){
  const L=lauCur(); if(!L) return;
  const id=i+'_'+(++_lauFseq); lauFraseList(k).push(id);
  const bag=lauPhBag(k); bag['d'+id]={qtd:'d'};
  lauFraseAfter(k);
}
function lauFraseDel(k, id){
  const L=lauCur(); if(!L) return;
  const list=lauFraseList(k); const j=list.indexOf(id); if(j>=0) list.splice(j,1);
  lauFraseAfter(k);
}
function lauFraseAfter(k){
  lauRenderLeft();
  if(k==='__obs'){ lauPatchOpt('obs', lauObsHTML()); lauPatchConc(); lauSaveEd(); }
  else lauPatch(k);
}
let _lauArm=0;
function lauRestart(){
  const L=lauCur(); if(!L) return;
  const now=Date.now();
  if(now-_lauArm>3500){ _lauArm=now; klugToast('Toque de novo em "Novo laudo" para descartar o texto atual.'); return; }
  _lauArm=0; const tab=L.tab; lauNew(L.model); state.lau.tab=tab; render(true);
}
function lauTab(t){ const L=lauCur(); if(!L) return; lauSaveEd(); L.tab=t; render(true); }

function lauDmoRef(v){ const L=lauCur(); if(!L) return; L.dmoRef=v; lauSaveEd(); L.html=null; render(true); }
function lauSum(m,it){
  const s=state.lau.v[it.k]; const r=lauBuild(m,it);
  if(r.sum) return {cls: /Preencher/.test(r.sum)?'ok':'alt', t:r.sum};
  const opt=(s.__o||[]).some(Boolean) || (s.__f||[]).length>0;
  if(r.txt==null && !r.conc.length && !opt && it.alts && s.__alt>0) return {cls:'alt', t:lauAltRotulo(it.alts[s.__alt])};
  if(r.txt==null && !r.conc.length && !opt){
    const filled = Object.values(s.__v||{}).some(a=>(a||[]).some(lauHas));
    return filled ? {cls:'ok', t:'Medidas preenchidas'} : {cls:'ok', t:'Normal'};
  }
  const nomes = (r.conc||[]).map(c=>c.replace(/\.$/,'')).concat((s.__f||[]).map(id=>lauFI(id).n));
  return {cls:'alt', t: nomes.length ? nomes[0] + (nomes.length>1?` +${nomes.length-1}`:'') : 'Alterado'};
}
function lauUpdSum(k){
  const L=lauCur(); if(!L) return; const m=lauModelo(L.model); const it=m.items.find(x=>x.k===k);
  const el=document.getElementById('lau-sum-'+k); if(!el) return;
  const s=lauSum(m,it); el.className='lau-sum '+s.cls; el.textContent=s.t;
}

/* ---------- UI: controles ---------- */
function lauCtrlHTML(k, s, c){
  if(c.show && !c.show(s)) return '';
  const ind = c.ind ? ' ind' : '';
  if(c.t==='head') return `<div class="lau-ch">${esc(c.lbl)}</div>`;
  if(c.t==='check') return `<label class="lau-chk${ind}"><input type="checkbox" ${s[c.k]?'checked':''} onchange="lauSet('${k}','${c.k}','__toggle')"><span>${esc(c.lbl)}</span></label>`;
  if(c.t==='radio') return `<div class="lau-row${ind}"><div class="lau-rl">${esc(c.lbl)}</div><div class="lau-chips">${c.opts.map(o=>`<button type="button" class="ti-ftog ${s[c.k]===o[0]?'on':''}" onclick="lauSet('${k}','${c.k}','${esc(o[0])}')">${esc(o[1])}</button>`).join('')}</div></div>`;
  if(c.t==='select') return `<div class="lau-row${ind}"><div class="lau-rl">${esc(c.lbl)}</div><select class="lau-sel" onchange="lauSet('${k}','${c.k}',this.value)">${c.opts.map(o=>`<option value="${esc(o[0])}" ${s[c.k]===o[0]?'selected':''}>${esc(o[1])}</option>`).join('')}</select></div>`;
  if(c.t==='num') return `<div class="lau-row${ind}"><div class="lau-rl">${esc(c.lbl)}</div><div class="lau-num"><input type="text" inputmode="decimal" value="${esc(s[c.k])}" oninput="lauSetQ('${k}','${c.k}',this.value)"><span>${esc(c.unit||'')}</span></div></div>`;
  if(c.t==='text') return `<div class="lau-row${ind}"><div class="lau-rl">${esc(c.lbl)}</div><input class="lau-txt" type="text" placeholder="${esc(c.ph||'')}" value="${esc(s[c.k])}" oninput="lauSetQ('${k}','${c.k}',this.value)"></div>`;
  if(c.t==='dims'){ const v=s[c.k]||['','',''];
    return `<div class="lau-row${ind}"><div class="lau-rl">${esc(c.lbl)}</div><div class="lau-dims">${[0,1,2].map(i=>`<input type="text" inputmode="decimal" value="${esc(v[i])}" oninput="lauSetQ('${k}','${c.k}',this.value,${i})">`).join('<i>×</i>')}<span>cm</span></div></div>`; }
  return '';
}
/* texto da máscara com os campos embutidos (para preencher) */
function lauInlineForm(k, tplId, str, vals){
  const tpl=lauTpl(str); vals=vals||[];
  const sj = JSON.stringify(str).replace(/"/g,'&quot;');
  return `<div class="lau-inl">${tpl.lines.map(toks=>toks.map(tk=>{
    if(tk.t==='w') return esc(tk.s);
    const v=vals[tk.i]||'';
    if(tk.t==='c') return esc(tk.pre)+`<select class="lau-ph-sel" onchange="lauPh('${k}','${tplId}',${tk.i},this.value,${sj})">${tk.def?'':`<option value="">${esc(tk.o.join(' / '))}</option>`}${tk.o.map(o=>`<option ${(v||tk.def)===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`+esc(tk.suf);
    const av=lauAutoVal(tpl, vals, tk.i);
    return esc(tk.pre)+`<input id="ph-${k}-${tplId}-${tk.i}" class="lau-ph-in" type="text" value="${esc(v)}" placeholder="${av!=null?esc(av):'…'}" oninput="lauPh('${k}','${tplId}',${tk.i},this.value,${sj})">`+esc(tk.suf);
  }).join(' ')).join('<br>')}</div>`;
}
function lauOptsHTML(k, opts, flags, bag){
  if(!opts || !opts.length) return '';
  return `<div class="lau-rl" style="margin-top:10px">Frases opcionais da máscara</div>` + opts.map((o,i)=>{
    const on=!!flags[i];
    const body = on && lauHasPh(o) ? lauInlineForm(k,'o'+i,o,bag['o'+i]) : '';
    return `<label class="lau-chk"><input type="checkbox" ${on?'checked':''} onchange="lauOpt('${k}',${i})"><span>${esc(lauFill(o,bag['o'+i]))}</span></label>${body}`;
  }).join('');
}
function lauFrasesPanel(k, org, list, bag, estrut){
  const lblK = (()=>{ const L=state.lau, m=L&&lauModelo(L.model), it=m&&m.items.find(x=>x.k===k); return it?lauNorm(lauItemLabel(m,it)):''; })();
  const mid = state.lau && state.lau.model;
  const mItens = (()=>{ const m=mid&&lauModelo(mid); return m ? m.items.map(i=>lauNorm(lauItemLabel(m,i)||'')) : []; })();
  const fs = lauFrasesDe(org).filter(f=>!(estrut && f.s) && !(f.n==='Tenossinovite' && /pata de ganso/.test(lblK)) && !(f.so && f.so.indexOf(mid)<0)
    && !(f.nm && mItens.some(l=>f.nm.test(l))));   // nm: some quando o laudo tem item próprio (ex.: miomas vão no "Miométrio")
  if(!fs.length) return '';
  const nOf = i=>list.filter(id=>parseInt(id,10)===i).length;
  const chips = fs.map(f=>{ const n=nOf(f.i); return `<button type="button" class="ti-ftog ${n?'on':''}${f.kind?' lau-fk':''}" onclick="lauFraseToggle('${k}',${f.i})">${f.m==='sub'?'':'+ '}${esc(f.n)}${n>1?` <span class="n">${n}</span>`:''}</button>`; }).join('');
  const seq={};
  const sel = list.map(id=>{ const f=lauFI(id); const d=bag['d'+id]||{}; const fi=parseInt(id,10);
    seq[fi]=(seq[fi]||0)+1; const num = nOf(fi)>1 ? ' '+seq[fi] : '';
    const qtd = f.q ? (d.qtd||'1') : null;
    const octM = (()=>{ const L=state.lau, m=L&&lauModelo(L.model); return m&&m.oct; })();
    const olhoAtual = octM ? lauOctOlhoDe(d) : null;
    const oh = octM ? `<div class="lau-row"><div class="lau-rl">Olho afetado${olhoAtual?'':' <mark class="lau-ph">escolha</mark>'}</div><div class="lau-chips">${[['d','Olho direito'],['e','Olho esquerdo'],['a','Ambos']].map(o=>`<button type="button" class="ti-ftog ${olhoAtual===o[0]?'on':''}" onclick="lauDescSet('${k}','${id}','olho','${o[0]}')">${o[1]}</button>`).join('')}</div></div>` : '';
    const qh = oh + (f.q ? `<div class="lau-row"><div class="lau-rl">Quantidade</div><div class="lau-chips">${[['1','Único'],['n','Vários semelhantes'],['d','Diferentes entre si']].map(o=>`<button type="button" class="ti-ftog ${qtd===o[0]?'on':''}" onclick="lauDescSet('${k}','${id}','qtd','${o[0]}')">${o[1]}</button>`).join('')}</div></div>` : '');
    const multi = qtd==='n' && lauMulti(f);
    const nome1 = f.kind ? 'Nódulo' : 'Formação';
    // 1º achado (descrição principal) logo após os descritores; depois os demais e o botão +
    const tplK = lauKindTE(f) ? '' : null;
    const principal = tplK!=null ? (tplK ? `<div class="lau-rl">Medidas</div>${lauInlineForm(k,'f'+id,tplK,bag['f'+id])}` : '') : lauHasPh(f.t)
      ? (f.kind||multi ? `<div class="lau-rl">${multi?nome1+' 1 — localização e medidas':f.kind==='hernia'||f.kind==='orads'?'Medidas':lauMgK(f)?(f.medOpc?'Medidas (opcional)':'Medidas'):'Localização e medidas'}</div>` : '') + lauInlineForm(k,'f'+id,(f.tn && qtd==='n') ? f.tn : f.t,bag['f'+id])
      : `<div class="lau-inl dim">${esc(f.t)}</div>`;
    const extras = multi
      ? Array.from({length:lauQn(d)-1},(_,j)=>`<div class="lau-rl lau-rlx">${nome1} ${j+2} — localização e medidas <button type="button" class="lau-xs" onclick="lauQnDel('${k}','${id}',${j+2})" aria-label="Remover">×</button></div>${lauInlineForm(k,'f'+id+'_'+(j+2),lauLocTpl(f),bag['f'+id+'_'+(j+2)])}`).join('')
        + `<button type="button" class="lau-addd" onclick="lauQnAdd('${k}','${id}')">+ adicionar ${f.kind?'nódulo':'formação'} semelhante</button>`
      : (qtd==='n' && !f.tn ? `<div class="lau-rl">Os demais:</div>${lauInlineForm(k,'q'+id,LAU_QTPL,bag['q'+id])}` : '');
    const mtx = f.mt ? Array.from({length:lauMtN(d)},(_,j)=>`<div class="lau-rl lau-rlx">${esc(f.mtn||'Nódulo')} ${j+2} <button type="button" class="lau-xs" onclick="lauMtDel('${k}','${id}',${j+2})" aria-label="Remover">×</button></div>${lauInlineForm(k,'f'+id+'_'+(j+2),f.mt,bag['f'+id+'_'+(j+2)])}`).join('')
        + `<button type="button" class="lau-addd" onclick="lauMtAdd('${k}','${id}')">+ ${esc(f.mtb||'adicionar outro')}</button>` : '';
    const diff = qtd==='d' ? `<button type="button" class="lau-addd" onclick="lauFraseAddDiff('${k}',${fi})">+ adicionar outro diferente</button>` : '';
    return `<div class="lau-fsel"><div class="lau-fsel-h"><b>${esc(f.n)}${num}</b><span>${f.m==='sub'?'substitui o texto':'linha acrescentada'}</span><button type="button" onclick="lauFraseDel('${k}','${id}')" aria-label="Remover">×</button></div>${qh}${f.kind||f.loc?`<div id="desc-${k}-${id}">${lauDescHTML(k,id,f,d)}</div>`:''}${f.mt?`<div class="lau-rl">${esc(f.mtn||'Nódulo')} 1 (o maior)</div>`:''}${principal}${extras}${mtx}${diff}</div>`; }).join('');
  return `<div class="lau-rl" style="margin-top:12px">Frases de alteração</div><div class="lau-chips lau-fchips">${chips}</div>${sel}`;
}
function lauItemPanel(m, it){
  const s=state.lau.v[it.k]; const k=it.k;
  const normal=lauItemNormal(m,it), lbl=lauItemLabel(m,it);
  let h='';
  if(lauHasPh(lbl)) h += `<div class="lau-rl">Rótulo</div>${lauInlineForm(k,'l',lbl,s.__v.l)}`;
  if(it.alts && it.alts.length>1) h += `<div class="lau-row"><div class="lau-rl">Opções da máscara</div><div class="lau-chips">${it.alts.map((a,i)=>`<button type="button" class="ti-ftog ${(s.__alt||0)===i?'on':''}" title="${esc(a)}" onclick="lauAltSet('${k}',${i})">${esc(lauAltRotulo(a, it.alts))}</button>`).join('')}</div></div>`;
  if(m.oct && lauHasPh(normal)){
    const tw=lauOctGemeo(m,it);
    h += `<div class="lau-rl">Olho direito</div>${lauInlineForm(k,'n',normal,s.__v.n)}`;
    if(tw) h += `<div class="lau-rl" style="margin-top:8px">Olho esquerdo</div>${lauInlineForm(tw.k,'n',lauItemNormal(m,tw),state.lau.v[tw.k].__v.n)}`;
  } else if(lauHasPh(normal) && !it.noNF) h += `<div class="lau-rl">${it.generic?'Texto da máscara — preencha os campos':'Medidas do texto padrão'}</div>${lauInlineForm(k,'n',String(normal).replace(/^\n+/,''),s.__v.n)}`;
  else if(it.generic) h += `<div class="lau-rl">Texto da máscara</div><div class="lau-inl dim">${esc(normal).replace(/\n/g,'<br>')}</div>`;
  if(!it.generic) h += it.ctrls.map(c=>lauCtrlHTML(k,s,c)).join('');
  if(typeof lauAutoBoxHTML==='function') h += lauAutoBoxHTML(m, it);
  h += lauOptsHTML(k, it.opts, s.__o, s.__v);
  h += lauFrasesPanel(k, it.sk ? [it.sk] : lauFraseOrgao(lbl || String(normal).slice(0,60), m.metodo==='tc' && !m.oct ? 'tcg' : m.metodo), s.__f, s.__v, !!it.sk);
  if(it.generic && !m.oct){
    h += `<div class="lau-row"><div class="lau-rl">Substituir o texto por (alteração)</div><textarea class="lau-ta" rows="3" placeholder="Deixe em branco para manter o texto da máscara" oninput="lauSetQ('${k}','alt',this.value)">${esc(s.alt)}</textarea></div>`;
    h += `<div class="lau-row"><div class="lau-rl">Frase para a conclusão</div><input class="lau-txt" type="text" value="${esc(s.conc)}" placeholder="ex.: Tendinopatia do supraespinal." oninput="lauSetQ('${k}','conc',this.value)"></div>`;
  }
  return h + `<button type="button" class="lau-reset" onclick="lauItemReset('${k}')">${svgIcon(P.reset,14,{sw:2})} Voltar ao normal</button>`;
}
function lauCard(key, title, sum, body){
  const L=state.lau, open=L.open===key;
  return `<div class="lau-it ${open?'open':''}">
      <div class="lau-ih" onclick="lauToggle('${key}')">
        <div class="lau-in"><div class="lau-il">${title}</div>${sum}</div>
        <button type="button" class="lau-alt">${open?'Fechar':'Alterar'}</button>
      </div>
      ${open?`<div class="lau-ib">${body()}</div>`:''}
    </div>`;
}
function lauLeftHTML(){
  const L=lauCur(); const m=lauModelo(L.model);
  const tit=lauTitulo(m);
  const extraOn = L.ind||Object.values(L.tec).some(Boolean);
  const indChips = m.metodo==='mmg' ? `<div class="lau-chips" style="margin-top:6px">${LAU_IND_MMG.map(v=>`<button type="button" class="ti-ftog ${L.ind===v?'on':''}" onclick="lauSetIndChip(this.textContent)">${esc(v)}</button>`).join('')}</div>` : '';
  const dmoRefH = m.metodo==='dmo' ? `<div class="lau-lado"><span>Critério</span>${[['t','T-score (pós-menopausa / homem ≥ 50 anos)'],['z','Z-score (pré-menopausa / homem < 50 anos / criança)']].map(o=>`<button type="button" class="ti-ftog ${(L.dmoRef||'t')===o[0]?'on':''}" onclick="lauDmoRef('${o[0]}')">${o[1]}</button>`).join('')}</div>` : '';
  let h = dmoRefH + lauLadoHTML(m) + lauAteroHTML(m) + (typeof lauIgHTML==='function' ? lauIgHTML(m) : '') + lauCard('__extra', 'Título, indicação e limitações',
    `<div class="lau-sum ${extraOn?'alt':'ok'}">${extraOn?'Preenchido':'Opcional'}</div>`,
    ()=>`${lauHasPh(tit)?`<div class="lau-rl">Título</div>${tit.split('\n').map((t,i)=>lauHasPh(t)?lauInlineForm('__tit','t'+i,t,L.tit['t'+i]):'').join('')}`:''}
        <div class="lau-row"><div class="lau-rl">Indicação clínica</div><input class="lau-txt" type="text" value="${esc(L.ind)}" placeholder="${m.metodo==='mmg'?'ex.: rastreamento':'ex.: dor abdominal'}" oninput="lauSetInd(this.value)">${indChips}</div>
        ${lauTecOpts().map(o=>`<label class="lau-chk"><input type="checkbox" ${L.tec[o[0]]?'checked':''} onchange="lauSetTec('${o[0]}')"><span>Limitação: ${esc(o[1])}</span></label>`).join('')}`);
  h += m.items.filter(it=> m.oct ? lauOctOlho(it)==='d' : !lauItemOutroLado(m,it)).map(it=>{
    const sum=lauSum(m,it);
    const nm = lauItemLabel(m,it) ? lauFill(lauItemLabel(m,it), L.v[it.k].__v.l) : lauFill(lauItemNormal(m,it), L.v[it.k].__v.n).slice(0,48)+'…';
    const title = esc(nm.replace(/:$/,'')) + (it.grp&&!m.oct?` <span class="lau-grp">${esc(it.grp)}</span>`:'');
    return lauCard(it.k, title, `<div id="lau-sum-${it.k}" class="lau-sum ${sum.cls}">${esc(sum.t)}</div>`, ()=>lauItemPanel(m,it));
  }).join('');
  h += lauCard('__obs', 'Achados adicionais', `<div class="lau-sum ${(L.obs||L.xf.length)?'alt':'ok'}">${(L.obs||L.xf.length)?'Preenchido':'Opcional'}</div>`,
    ()=>`<textarea class="lau-ta" rows="3" placeholder="Texto livre que entra antes da conclusão" oninput="lauSetObs(this.value)">${esc(L.obs)}</textarea>`
      + lauFrasesPanel('__obs', m.metodo==='mmg' ? 'mgextra' : (m.metodo==='tc' && !m.oct) ? 'tcextra' : /^us-.*(carotida|vertebra|temporai)/.test(m.id) ? '__extracerv' : '__extra', L.xf, L.xv));
  if(m.concTitulo){
    const norm=lauConcNormalLines(m);
    const anyPh = norm.some(c=>lauHasPh(c.text));
    const nOpt=(m.concOpts||[]).length;
    if(anyPh || nOpt){
      const on=L.conc.o.some(Boolean);
      h += lauCard('__conc', 'Conclusão — campos e frases', `<div class="lau-sum ${on?'alt':'ok'}">${on?'Frase opcional marcada':'Normal'}</div>`,
        ()=> norm.map((c,i)=>lauHasPh(c.text)?lauInlineForm('__conc','n'+i,c.text,L.conc.v['n'+i]):'').join('')
           + lauOptsHTML('__conc', (m.concOpts||[]).map(c=>c.text), L.conc.o, L.conc.v));
    }
  }
  h += `<label class="lau-chk lau-auto"><input type="checkbox" ${L.autoConc?'checked':''} onchange="lauSetAuto(this.checked)"><span>Conclusão automática <small>(desligue para editar a conclusão à mão sem ser sobrescrita)</small></span></label>`;
  return h;
}
/* Doppler arterial dos MMII: ateromatose como achado geral (linha antes da conclusão + frase da conclusão) */
const LAU_ATERO_MODELOS = /^us-arterial(-e-venoso)?-(dos-)?mmii/;
function lauAteroIdx(){ return LAU_FRASES.findIndex(f=>f.o==='artgeral'); }
function lauAteroHTML(m){
  if(!LAU_ATERO_MODELOS.test(m.id)) return '';
  const L=state.lau, i=lauAteroIdx(); const id=(L.xf||[]).find(x=>parseInt(x,10)===i);
  const cur = id ? (((L.xv||{})['f'+id]||[])[0] || 'leve') : '';
  return `<div class="lau-lado"><span>Ateromatose (achado geral, sem estenoses significativas)</span>${[['','Ausente'],['leve','Leve'],['moderada','Moderada'],['difusa','Difusa']].map(o=>`<button type="button" class="ti-ftog ${cur===o[0]?'on':''}" onclick="lauAteroSet('${o[0]}')">${o[1]}</button>`).join('')}</div>`;
}
/* com ateromatose marcada, as artérias deixam de ser descritas "sem placas" */
const LAU_ATERO_TXT = [
  [/com paredes regulares e calibre preservado, sem dilatações ou placas ateromatosas determinando estenoses significativas\./g,
   'com calibre preservado e placas ateromatosas parietais, sem dilatações ou estenoses hemodinamicamente significativas.'],
  [/de trajetos e calibres normais, sem espessamentos ou calcificações parietais\./g,
   'de trajetos e calibres normais, com placas ateromatosas parietais, sem estenoses hemodinamicamente significativas.'],
];
function lauAteroAtivo(m){ const L=state.lau; if(!m || !LAU_ATERO_MODELOS.test(m.id) || !L || L.model!==m.id) return false; const i=lauAteroIdx(); return (L.xf||[]).some(x=>parseInt(x,10)===i); }
function lauAteroTxt(m, txt){ return lauAteroAtivo(m) ? LAU_ATERO_TXT.reduce((t,[a,b])=>t.replace(a,b), txt) : txt; }
function lauAteroSet(g){
  const L=lauCur(); if(!L) return; const i=lauAteroIdx();
  L.xf = L.xf.filter(x=>parseInt(x,10)!==i);
  if(g){ const id=i+'_'+(++_lauFseq); L.xf.push(id); L.xv['f'+id]=[g]; }
  // redesenha as artérias (texto muda com/sem ateromatose)
  const m=lauModelo(L.model), ed=lauEd();
  if(ed) m.items.forEach(o=>{ const q=ed.querySelector(`[data-k="${o.k}"]`); if(!q) return; const h=lauItemHTML(m,o); if(q.innerHTML!==h){ q.innerHTML=h; q.hidden=!h; lauFlash(q); } });
  lauFraseAfter('__obs');
}
function lauRenderLeft(){
  const el=document.getElementById('lau-left'); if(!el) return;
  el.innerHTML = translateHTML(lauLeftHTML());
}

function lauToolbarHTML(){
  const L=lauCur();
  const b=(cmd,icon,title,val)=>`<button type="button" class="lau-tb" title="${title}" aria-label="${title}" onmousedown="event.preventDefault()" onclick="lauCmd('${cmd}'${val!=null?`,'${val}'`:''})">${icon}</button>`;
  const al=(d)=>`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="${d}"/></svg>`;
  return `<div class="lau-tbar">
    ${b('undo',al('M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3'),'Desfazer')}
    ${b('redo',al('m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3'),'Refazer')}
    <span class="lau-sep"></span>
    ${b('bold','<b>N</b>','Negrito')}
    ${b('italic','<i style="font-family:serif">I</i>','Itálico')}
    ${b('underline','<u>S</u>','Sublinhado')}
    <span class="lau-sep"></span>
    <select class="lau-tsel" title="Fonte" onmousedown="lauKeepSel()" onfocus="lauKeepSel()" onchange="lauRestoreSel();lauSetFont(this.value)">${LAU_FONTS.map(f=>`<option value="${f.id}" ${L.font===f.id?'selected':''} style="font-family:${f.css.replace(/"/g,"'")}">${f.id}</option>`).join('')}</select>
    <select class="lau-tsel sz" title="Tamanho" onmousedown="lauKeepSel()" onfocus="lauKeepSel()" onchange="lauRestoreSel();lauSetSize(this.value)">${LAU_SIZES.map(z=>`<option value="${z}" ${L.size===z?'selected':''}>${z}</option>`).join('')}</select>
    <span class="lau-sep"></span>
    ${b('justifyLeft',al('M4 6h16M4 10h10M4 14h16M4 18h10'),'Alinhar à esquerda')}
    ${b('justifyCenter',al('M4 6h16M7 10h10M4 14h16M7 18h10'),'Centralizar')}
    ${b('justifyRight',al('M4 6h16M10 10h10M4 14h16M10 18h10'),'Alinhar à direita')}
    ${b('justifyFull',al('M4 6h16M4 10h16M4 14h16M4 18h16'),'Justificar')}
    <span class="lau-sep"></span>
    ${b('insertUnorderedList',al('M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01'),'Lista')}
    ${b('removeFormat',al('M6 4h12M10 4 8 20M4 20l16-16'),'Limpar formatação')}
  </div>`;
}

function laudoEditHTML(){
  const L=lauCur();
  if(!L) return `<div class="calc-list-wrap"><div class="empty"><div class="msg">Escolha um modelo de laudo.</div></div></div>`;
  setTimeout(lauMountEditor, 0);
  return `<div class="lau-wrap tab-${L.tab}">
    <div class="lau-beta"><b>Em desenvolvimento · fase de testes.</b> Confira sempre o texto antes de usar. Campos em <mark class="lau-ph">amarelo</mark> ainda não foram preenchidos. Sugestões e erros: Configurações → Críticas e Sugestões.</div>
    ${lauFavsEdHTML(L.model)}
    <div class="lau-tabs">
      <button type="button" class="${L.tab==='opc'?'on':''}" onclick="lauTab('opc')">Achados</button>
      <button type="button" class="${L.tab==='txt'?'on':''}" onclick="lauTab('txt')">Laudo</button>
    </div>
    <div class="lau-split">
      <div class="lau-pane lau-l"><div id="lau-voz">${typeof vozHTML==='function'?vozHTML():''}</div><div id="lau-left">${lauLeftHTML()}</div></div>
      <div class="lau-pane lau-r">
        ${lauToolbarHTML()}
        <div id="lau-ed" class="lau-ed" contenteditable="true" spellcheck="true" lang="pt-BR" oninput="lauSaveEd()"></div>
        <div class="lau-acts">
          <button type="button" class="lau-frase-btn" onclick="lauCopy()">${svgIcon(P.copy,16,{sw:2})} Copiar laudo</button>
          <button type="button" class="lau-btn2" onclick="lauDownload()">Baixar .doc</button>
          <button type="button" class="lau-btn2" onclick="lauRestart()">Novo laudo</button>
          <button type="button" class="lau-btn2" onclick="openLaudoCfg('${L.model}')">Padrões deste laudo</button>
        </div>
        <div class="disc"><b>Ferramenta de apoio. O laudo final é de responsabilidade do médico que o assina.</b></div>
      </div>
    </div>
  </div>`;
}

/* =========================================================================
   LISTAS (métodos → modelos)
   ========================================================================= */
function laudoMod(id){ return LAUDO_MODS.find(m=>m.id===id); }

function laudosHTML(){
  const cards = LAUDO_MODS.map(m=>`<div class="lc-short ${m.ativo?'':'locked'}" onclick="openLaudoMod('${m.id}')">
      <div class="si acc">${svgIcon(P.laudo,22)}</div>
      <div class="st"><div class="t">${stMark('lmod:'+m.id)}${esc(m.nome)}</div><div class="d">${m.ativo?`${(LAUDO_MODELOS[m.id]||[]).length} modelos de laudo`:'Em breve'}</div></div>
      <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
    </div>`).join('');
  return `<div class="calc-list-wrap">
    <div class="lau-beta"><b>Em desenvolvimento · fase de testes.</b> Os modelos ainda estão sendo construídos e revisados.</div>
    <div class="calc-intro-lbl">Escolha o método</div>
    ${cards}
    <div class="lc-short" onclick="openLaudoCfg()">
      <div class="si acc">${svgIcon(P.gear,22)}</div>
      <div class="st"><div class="t">${stMark('lmod:cfg')}Padrões dos laudos</div><div class="d">Formatação geral e textos de cada laudo</div></div>
      <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
    </div>
    <div class="disc"><b>Ferramenta de apoio. O laudo final é de responsabilidade do médico que o assina.</b></div>
  </div>`;
}
/* lista agrupada com busca (usada nos modelos e nas configurações) */
/* Lista com filtro por subespecialidade (chips) e busca. Com texto na busca,
   procura em todas as subespecialidades. */
/* favoritos dos laudos (ficam neste aparelho) */
const LAU_FAV_KEY='klug_laudo_favs_v1';
const LAU_FAV_ICO='<circle cx="12" cy="12" r="7"/>';   // símbolo do favorito: bola
function lauFavs(){ if(state.lauFavs) return state.lauFavs; let a=[]; try{ a=JSON.parse(localStorage.getItem(LAU_FAV_KEY)||'[]'); }catch(_){} state.lauFavs=Array.isArray(a)?a:[]; return state.lauFavs; }
function lauIsFav(id){ return lauFavs().indexOf(id)>=0; }
function lauFavToggle(id){
  const a=lauFavs(); const i=a.indexOf(id); i>=0 ? a.splice(i,1) : a.push(id);
  try{ localStorage.setItem(LAU_FAV_KEY, JSON.stringify(a)); }catch(_){}
  lauRefreshList();
}
function lauFavsHTML(all, onclickFn){
  const fs = lauFavs().map(id=>all.find(m=>m.id===id)).filter(Boolean).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR',{sensitivity:'base',numeric:true}));
  const star = svgIcon(LAU_FAV_ICO,14,{fill:'currentColor',noStroke:true});
  return `<div class="lau-favs"><div class="lau-favs-h">${star} Favoritos</div>${fs.length
    ? `<div class="lau-chips">${fs.map(m=>`<button type="button" class="ti-ftog" onclick="${onclickFn}('${m.id}')"><span class="x">${star}</span>${stMark('laudo:'+m.id)}${esc(m.nome)}</button>`).join('')}</div>`
    : `<div class="lau-favs-e">Toque na bolinha ao lado de um laudo para fixá-lo aqui.</div>`}</div>`;
}
/* favoritos dentro do laudo aberto: um toque abre um laudo novo daquele modelo (some se não houver favoritos) */
const LAU_MET_TAG = {us:'US', tc:'TC', mmg:'MMG', dmo:'DMO'};
function lauFavsEdHTML(atual){
  lauModelosDmo();
  const fs = lauFavs().map(id=>lauModelo(id)).filter(Boolean).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR',{sensitivity:'base',numeric:true}));
  if(!fs.length) return '';
  const star = svgIcon(LAU_FAV_ICO,14,{fill:'currentColor',noStroke:true});
  const tag = m=> m.metodo && m.metodo!=='us' ? `<small style="opacity:.7">${LAU_MET_TAG[m.metodo]||m.metodo.toUpperCase()}</small> ` : '';
  return `<div class="lau-favs lau-favs-ed"><div class="lau-favs-h">${star} Favoritos · abrir laudo novo</div><div class="lau-chips">${fs.map(m=>
    `<button type="button" class="ti-ftog ${m.id===atual?'on':''}" onclick="openLaudo('${m.id}')" title="Abrir um laudo novo: ${esc(m.nome)}"><span class="x">${star}</span>${stMark('laudo:'+m.id)}${tag(m)}${esc(m.nome)}</button>`).join('')}</div></div>`;
}
function lauListHTML(metodo, onclickFn, sub){
  lauModelosDmo();
  const all = [].concat(...[].concat(metodo).map(k=>LAUDO_MODELOS[k]||[])).slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR',{sensitivity:'base',numeric:true}));
  const q = lauNorm(state.lauQ||'');
  const grupos = LAU_GRUPOS.filter(g=>all.some(m=>m.grupo===g));
  if(!state.lauGrp || grupos.indexOf(state.lauGrp)<0) state.lauGrp = grupos[0];
  const ms = q ? all.filter(m=>lauNorm(m.nome+' '+m.grupo).indexOf(q)>=0) : all.filter(m=>m.grupo===state.lauGrp);
  const row = m=>`<div class="lau-li" onclick="${onclickFn}('${m.id}')">
        <div class="lau-lt">${stMark('laudo:'+m.id)}${esc(m.nome)}${m.estruturado?' <span class="lau-tag ok">Achados estruturados</span>':''}</div>
        <div class="lau-ld">${sub(m)}</div>
        <button type="button" class="lau-star ${lauIsFav(m.id)?'on':''}" onclick="event.stopPropagation();lauFavToggle('${m.id}')" aria-label="${lauIsFav(m.id)?'Remover dos favoritos':'Favoritar'}" title="${lauIsFav(m.id)?'Remover dos favoritos':'Favoritar'}">${svgIcon(LAU_FAV_ICO,20,{fill:lauIsFav(m.id)?'currentColor':'none',sw:2})}</button>
        <div class="chev">${svgIcon(P.chev,16,{sw:2})}</div></div>`;
  const body = q
    ? grupos.map(g=>{ const xs=ms.filter(m=>m.grupo===g); return xs.length ? `<div class="lau-lg">${esc(g)}</div>`+xs.map(row).join('') : ''; }).join('')
    : ms.map(row).join('');
  const chips = grupos.map(g=>`<button type="button" class="ti-ftog ${!q&&state.lauGrp===g?'on':''}" onclick="state.lauGrp='${g}';state.lauQ='';lauRefreshList(true)">${esc(g)} <span class="n">${all.filter(m=>m.grupo===g).length}</span></button>`).join('');
  return `<div class="lau-search"><input id="lau-q" type="search" placeholder="Buscar em todos os laudos…" value="${esc(state.lauQ||'')}" oninput="state.lauQ=this.value;lauRefreshList()"></div>
    <div id="lau-grps" class="lau-chips lau-grps">${chips}</div>
    <div id="lau-favw">${lauFavsHTML(all, onclickFn)}</div>
    <div id="lau-list">${body || '<div class="empty"><div class="msg">Nenhum laudo encontrado.</div></div>'}</div>`;
}
function lauRefreshList(limpaBusca){
  const v=state.view; const el=document.getElementById('lau-list'); if(!el) return;
  const tmp=document.createElement('div');
  tmp.innerHTML = v==='laudoCfg' ? lauCfgListHTML() : laudoModHTML();
  const n=tmp.querySelector('#lau-list'); if(n) el.innerHTML=translateHTML(n.innerHTML);
  const g=tmp.querySelector('#lau-grps'), ge=document.getElementById('lau-grps'); if(g&&ge) ge.innerHTML=translateHTML(g.innerHTML);
  const fv=tmp.querySelector('#lau-favw'), fe=document.getElementById('lau-favw'); if(fv&&fe) fe.innerHTML=translateHTML(fv.innerHTML);
  if(limpaBusca){ const qi=document.getElementById('lau-q'); if(qi) qi.value=''; }
}
function laudoModHTML(){
  const m = laudoMod(state.laudoMod);
  if(!m || !m.ativo) return `<div class="calc-list-wrap"><div class="empty"><div class="msg">${esc(m?m.nome:'Método')} — modelos <b>em breve</b>.</div></div></div>`;
  return `<div class="calc-list-wrap">
    <div class="lau-beta"><b>Em testes.</b> Toque no laudo para abrir. Os órgãos marcados com "Achados estruturados" já montam as frases e a conclusão sozinhos; nos demais, preencha os campos e descreva a alteração.</div>
    ${lauListHTML(m.id, 'openLaudo', (x)=>`${x.items.length} ${x.items.length===1?"item":"itens"}`)}
  </div>`;
}

/* =========================================================================
   CONFIGURAÇÕES — padrões dos laudos
   Tela 1: formatação geral (vale para todos) + lista de laudos.
   Tela 2: um laudo — título, conclusão e texto de cada item.
   ========================================================================= */
function lauCfgListHTML(){
  lauModelosDmo();
  return lauListHTML(['us','mmg','dmo','tc'],'openLaudoCfgModel',(x)=>{
    const u=lauMcfgPeek(x.id); const n=Object.values(u.items||{}).filter(o=>lauHas(o.label)||lauHas(o.normal)).length + (lauHas(u.titulo)?1:0)+(lauHas(u.concNormal)?1:0)+(lauHas(u.concTitulo)?1:0);
    return n ? `<span class="lau-tag">${n} personalizado${n>1?'s':''}</span>` : 'Texto padrão da máscara';
  });
}
function laudoCfgHTML(){
  const g=lauGen();
  if(state.laudoCfgId && lauModelo(state.laudoCfgId)) return laudoCfgModelHTML(state.laudoCfgId);
  return `<div class="ti-wrap lau-cfg">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Formatação — vale para todos os laudos</div>
      <div class="lau-row"><div class="lau-rl">Fonte</div><div class="lau-chips">${LAU_FONTS.map(f=>`<button type="button" class="ti-ftog ${g.font===f.id?'on':''}" style="font-family:${f.css.replace(/"/g,"'")}" onclick="lauCfgGen('font','${f.id}')">${f.id}</button>`).join('')}</div></div>
      <div class="lau-row"><div class="lau-rl">Tamanho</div><div class="lau-chips">${LAU_SIZES.map(z=>`<button type="button" class="ti-ftog ${g.size===z?'on':''}" onclick="lauCfgGen('size',${z})">${z}</button>`).join('')}</div></div>
      <label class="lau-chk"><input type="checkbox" ${g.bold?'checked':''} onchange="lauCfgGen('bold',this.checked)"><span>Nomes dos órgãos em negrito</span></label>
      <label class="lau-chk"><input type="checkbox" ${g.hifen?'checked':''} onchange="lauCfgGen('hifen',this.checked)"><span>Hífen no início das linhas</span></label>
      <div class="lau-row"><div class="lau-rl">Unidade das medidas nos campos</div><div class="lau-chips">${[['cm','Centímetros (cm)'],['mm','Milímetros (mm)']].map(o=>`<button type="button" class="ti-ftog ${g.un===o[0]?'on':''}" onclick="lauCfgGen('un','${o[0]}')">${o[1]}</button>`).join('')}</div><div class="ti-legend-row" style="margin-top:4px"><span class="lt">Vale para os campos das máscaras e das frases de alteração; os volumes continuam em cm³ e são calculados corretamente. Nos itens com controles próprios (ex.: rins, baço) o valor continua sendo digitado em cm, mas o laudo sai em mm. Troque a unidade antes de começar o laudo.</span></div></div>
      <div class="lau-row"><div class="lau-rl">Lesão focal em órgão de ecotextura homogênea (fígado, baço)</div><div class="lau-chips">${[['het','“heterogênea pela presença de …”'],['exc','“homogênea, exceto por …”']].map(o=>`<button type="button" class="ti-ftog ${g.les===o[0]?'on':''}" onclick="lauCfgGen('les','${o[0]}')">${o[1]}</button>`).join('')}</div></div>
      <div class="lau-cf"><div class="lau-rl">Título da conclusão</div><input class="lau-txt" type="text" placeholder="Conclusão:" value="${esc(g.concTitulo)}" oninput="lauCfgGen('concTitulo',this.value,true)"></div>
    </div>
    ${typeof lauAutoCfgHTML==='function' ? lauAutoCfgHTML() : ''}
    <div class="ti-card">
      <div class="tfg-sec-lbl">Personalizar um laudo</div>
      <div class="ti-legend-row" style="margin:2px 0 8px"><span class="lt">Escolha o laudo para mudar o título, a conclusão normal e o texto de cada item.</span></div>
      ${lauCfgListHTML()}
    </div>
    <div class="ti-legend-row"><span class="lt">Os padrões ficam salvos neste aparelho e valem para os próximos laudos abertos.</span></div>
  </div>`;
}
function laudoCfgModelHTML(mid){
  const m=lauModelo(mid), u=lauMcfgPeek(mid);
  const fld=(lbl,val,ph,on,area)=>`<div class="lau-cf"><div class="lau-rl">${esc(lbl)}</div>${area
      ?`<textarea class="lau-ta" rows="${Math.min(6,Math.max(2,String(ph).split('\n').length+1))}" placeholder="${esc(ph)}" oninput="${on}">${esc(val||'')}</textarea>`
      :`<input class="lau-txt" type="text" placeholder="${esc(ph)}" value="${esc(val||'')}" oninput="${on}">`}</div>`;
  const items = m.items.map(it=>{ const ui=(u.items||{})[it.k]||{};
    return `<div class="ti-card">
      <div class="tfg-sec-lbl">${esc(it.label||'Linha sem rótulo')}${it.grp?' · '+esc(it.grp):''}</div>
      ${it.label?fld('Rótulo no laudo', ui.label, it.label, `lauCfgItem('${mid}','${it.k}','label',this.value)`):''}
      ${fld('Texto normal', ui.normal, it.normal, `lauCfgItem('${mid}','${it.k}','normal',this.value)`, true)}
    </div>`; }).join('');
  const concPh = m.concNormal.map(c=>(c.dash?'- ':'')+c.text).join('\n');
  return `<div class="ti-wrap lau-cfg">
    <div class="lau-crumb" onclick="state.laudoCfgId=null;render()">${svgIcon(P.back,16,{sw:2.2})} Todos os laudos</div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">${esc(m.nome)} — título e conclusão</div>
      ${fld('Título', u.titulo, m.titulo, `lauCfgM('${mid}','titulo',this.value)`, m.titulo.indexOf('\n')>=0)}
      ${m.concTitulo?fld('Título da conclusão', u.concTitulo, lauConcTitulo(Object.assign({},m,{id:'__'})), `lauCfgM('${mid}','concTitulo',this.value)`):''}
      ${m.concTitulo?fld('Conclusão do exame normal', u.concNormal, concPh, `lauCfgM('${mid}','concNormal',this.value)`, true):''}
    </div>
    ${items}
    <div class="ti-legend-row"><span class="lt">Campos em branco usam o texto da máscara (em cinza). Use XXX para criar um campo a preencher e "a XX b" para uma escolha. As mudanças valem para os próximos laudos abertos e ficam salvas neste aparelho.</span></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
      <button type="button" class="lau-btn2" onclick="lauCfgReset('${mid}')">Restaurar padrões deste laudo</button>
    </div>
  </div>`;
}
function lauCfgGen(k,v,noRender){ lauCfgAll()[k]=v; lauCfgSave(); if(!noRender) render(true); }
function lauCfgM(id,k,v){ lauMcfg(id)[k]=v; lauCfgSave(); }
function lauCfgItem(id,ik,k,v){ const u=lauMcfg(id); if(!u.items[ik]) u.items[ik]={}; u.items[ik][k]=v; lauCfgSave(); }
let _lauCfgArm=0;
function lauCfgReset(id){
  const now=Date.now();
  if(now-_lauCfgArm>3500){ _lauCfgArm=now; klugToast('Toque de novo para restaurar os padrões deste laudo.'); return; }
  _lauCfgArm=0; lauCfgAll().models[id]={items:{}}; lauCfgSave(); render(true); klugToast('Padrões restaurados ✓');
}
function lauCfgApply(id){ if(state.lauDocs) delete state.lauDocs[id]; if(state.lau&&state.lau.model===id) state.lau=null; klugToast('O próximo laudo aberto usará os novos padrões ✓'); render(true); }

/* =========================================================================
   NAVEGAÇÃO
   ========================================================================= */
function openLaudos(){ navPush(); state.view='laudos'; render(); }
function openLaudoMod(id){ navPush(); state.laudoMod=id; state.view='laudoMod'; render(); }
function openLaudo(id){
  lauSaveEd(); navPush();
  lauNew(id);   // abrir um laudo (outro ou o mesmo) sempre começa um laudo novo
  state.laudoId=id; state.view='laudoEdit'; render();
}
function openLaudoCfg(id){ lauSaveEd(); navPush(); state.laudoCfgId=id||null; state.view='laudoCfg'; render(); }
function openLaudoCfgModel(id){ navPush(); state.laudoCfgId=id; state.view='laudoCfg'; render(); }
