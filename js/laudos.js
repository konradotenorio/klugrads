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
  {id:'mmg',  nome:'Mamografia',                ativo:false},
  {id:'dmo',  nome:'Densitometria óssea',       ativo:false},
  {id:'us',   nome:'Ultrassonografia',          ativo:true},
  {id:'tc',   nome:'Tomografia computadorizada',ativo:false},
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
         '2':'Ecogenicidade parenquimatosa difusamente aumentada, de grau moderado, com menor definição das paredes dos vasos portais e do diafragma.',
         '3':'Ecogenicidade parenquimatosa difusamente aumentada, de grau acentuado, com atenuação do feixe acústico que prejudica a caracterização das paredes dos vasos portais, do diafragma e das porções posteriores do lobo direito.',
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
     const txt = `com dimensões ${dimTxt}${ld}, ${cont}. ${eco}` + (ext.length?' '+ext.join(' '):'');
     return {txt, conc};
   }},

  /* ---------------- VEIAS PORTA E HEPÁTICAS ---------------- */
  {k:'porta', label:'Veias porta e hepáticas',
   normal:'com calibres preservados.',
   ctrls:[
     {t:'check', k:'pAum', lbl:'Veia porta com calibre aumentado'},
     {t:'num', k:'pD', lbl:'Calibre da veia porta', unit:'mm', show:s=>s.pAum, ind:1},
     {t:'check', k:'hDil', lbl:'Veias hepáticas e VCI dilatadas'},
   ],
   build(s){
     if(!s.pAum && !s.hDil) return {txt:null, conc:[]};
     const conc=[], p=[];
     p.push(s.pAum ? lauFrase(lauJoin(['veia porta com calibre aumentado', lauMed(s.pD,'mm')])) : 'Veia porta com calibre preservado.');
     p.push(s.hDil ? 'Veias hepáticas e veia cava inferior dilatadas.' : 'Veias hepáticas com calibres preservados.');
     if(s.pAum) conc.push('Aumento do calibre da veia porta' + (lauHas(s.pD)?` (${lauN(s.pD)} mm)`:'') + '.');
     if(s.hDil) conc.push('Dilatação das veias hepáticas e da veia cava inferior, que pode estar relacionada a congestão hepática.');
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
     {t:'num', k:'parD', lbl:'Espessura', unit:'mm', show:s=>s.est!=='cx'&&s.par, ind:1},
     {t:'check', k:'ccA', lbl:'Sinais de colecistite aguda', show:s=>s.est!=='cx'},
   ],
   build(s){
     if(s.est==='cx') return {txt:'não caracterizada (status pós-colecistectomia).', conc:['Status pós-colecistectomia.']};
     if(s.est==='n' && !s.calc && !s.lama && !s.pol && !s.par && !s.ccA) return {txt:null, conc:[]};
     const conc=[];
     const dist = s.ccA ? 'distendida' : s.est==='hipo' ? 'pouco distendida, limitando a avaliação' : 'normodistendida';
     const paredes = s.ccA ? 'com paredes espessadas e edemaciadas' + (lauHas(s.parD)?` (${lauN(s.parD)} mm)`:'')
                   : s.par ? 'com paredes difusamente espessadas' + (lauHas(s.parD)?` (${lauN(s.parD)} mm)`:'')
                   : 'com paredes finas e regulares';
     const semCalc = !s.calc ? ', sem cálculos' : '';
     let t = `tópica, ${dist}, ${paredes} e conteúdo anecogênico${semCalc}.`;
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
     if(s.ccA) t += ' Sinal de Murphy ultrassonográfico positivo.';
     if(s.ccA) conc.push(s.calc ? 'Achados sugestivos de colecistite aguda litiásica.' : 'Achados sugestivos de colecistite aguda.');
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
     if(s.cis) t += ' ' + lauFrase(lauJoin([`imagem cística na ${s.cisL}`, lauMed(s.cisD,'cm')]));
     if(s.eco==='aum') conc.push('Aumento difuso da ecogenicidade pancreática, que pode corresponder a lipossubstituição.');
     if(s.wir) conc.push('Dilatação do ducto pancreático principal.');
     if(s.cis) conc.push('Lesão cística pancreática. Sugere-se complementação com RM.');
     return {txt:t, conc};
   }},

  /* ---------------- BAÇO ---------------- */
  {k:'baco', label:'Baço',
   normal:'com dimensões normais, homogêneo.',
   ctrls:[
     {t:'radio', k:'dim', lbl:'Dimensões', opts:[['n','Normais'],['aum','Aumentadas'],['cx','Esplenectomia']]},
     {t:'num', k:'comp', lbl:'Maior eixo (opcional)', unit:'cm', show:s=>s.dim!=='cx'},
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
     let t = s.dim==='aum'
       ? `com dimensões aumentadas${c?`, medindo ${c} no maior eixo`:''}, homogêneo.`
       : `com dimensões normais${c?` (${c} no maior eixo)`:''}, homogêneo.`;
     if(s.acs) t += ' ' + lauFrase(lauJoin(['pequena imagem nodular junto ao hilo esplênico, com ecogenicidade semelhante à do baço', lauMed(s.acsD,'cm')]) + ', compatível com baço acessório');
     if(s.cal) t += ' Focos hiperecogênicos esparsos com sombra acústica posterior, compatíveis com calcificações (granulomas).';
     if(s.cis) t += ' ' + lauFrase(lauJoin(['imagem cística simples no parênquima esplênico', lauMed(s.cisD,'cm')]));
     if(s.dim==='aum') conc.push('Esplenomegalia' + (c?` (${c})`:'') + '.');
     if(s.acs) conc.push('Baço acessório.');
     if(s.cal) conc.push('Granulomas calcificados esplênicos.');
     if(s.cis) conc.push('Cisto esplênico.');
     return {txt:t, conc};
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
     ];
   }),
   build(s){
     const lado = L=>{
       const alt = s['est'+L]!=='n' || s['dim'+L]!=='n' || s['calc'+L] || s['hid'+L] || s['cis'+L];
       return {alt, med: lauHas(s['comp'+L]) || lauHas(s['parq'+L])};
     };
     const D=lado('D'), E=lado('E');
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
       if(sem.length===2) t += ' Sem hidronefrose ou cálculos detectáveis ao método.';
       else if(sem[0]==='hidronefrose') t += ' Sem hidronefrose.';
       else if(sem[0]==='cálculos') t += ' Sem cálculos detectáveis ao método.';
       return t;
     };
     const conc=[];
     const both=(fn)=>{ const d=fn('D'), e=fn('E'); return d||e ? lauSides(d,e) : null; };
     let x;
     if(s.estD==='cx') conc.push('Status pós-nefrectomia direita.');
     if(s.estE==='cx') conc.push('Status pós-nefrectomia esquerda.');
     if((x=both(L=>s['est'+L]==='nef'))) conc.push(`Sinais de nefropatia parenquimatosa ${x}.`);
     if((x=both(L=>s['est'+L]!=='cx'&&s['calc'+L]))) conc.push(`Nefrolitíase ${x}.`);
     ['D','E'].forEach(L=>{ if(s['est'+L]!=='cx' && s['hid'+L]) conc.push(`Hidronefrose ${s['hidG'+L]} ${L==='D'?'à direita':'à esquerda'}.`); });
     const cD=s.estD!=='cx'&&s.cisD, cE=s.estE!=='cx'&&s.cisE;
     if(cD&&cE) conc.push('Cistos renais simples bilaterais.');
     else if(cD||cE){ const L=cD?'D':'E'; conc.push(`${s['cisQ'+L]==='n'?'Cistos renais simples':'Cisto renal simples'} ${cD?'à direita':'à esquerda'}.`); }
     return {txt:`${desc('D')} ${desc('E')}`, conc};
   }},

  /* ---------------- BEXIGA ---------------- */
  {k:'bexiga', label:'Bexiga',
   normal:'com paredes regulares e conteúdo anecogênico.',
   ctrls:[
     {t:'radio', k:'rep', lbl:'Repleção', opts:[['n','Adequada'],['pouca','Pouca repleção'],['sonda','Vazia com sonda']]},
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
     if(s.rep==='n' && !s.par && !s.cal && !s.vol && !s.res) return {txt:null, conc:[]};
     const conc=[];
     let t = s.rep==='pouca' ? 'com pouca repleção, limitando a avaliação de suas paredes. Conteúdo anecogênico.'
           : s.par ? 'com paredes difusamente espessadas e trabeculadas' + (lauHas(s.parD)?` (${lauN(s.parD)} mm)`:'') + ' e conteúdo anecogênico.'
           : 'com paredes regulares e conteúdo anecogênico.';
     if(s.rep==='pouca' && s.par) t += ' ' + lauFrase('paredes aparentemente espessadas' + (lauHas(s.parD)?` (${lauN(s.parD)} mm)`:''));
     if(s.cal) t += ' ' + lauFrase(lauJoin(['imagem ecogênica móvel com sombra acústica posterior em seu interior, compatível com cálculo', lauMed(s.calD,'cm')]));
     const v = s.vol ? lauVol(...(s.volV||[])) : null;
     const r = s.res ? lauVol(...(s.resV||[])) : null;
     if(s.vol) t += v!=null ? ` Volume pré-miccional estimado em ${v} mL.` : ' Volume pré-miccional estimado em ___ mL.';
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
     {t:'radio', k:'est', lbl:'Aspecto', opts:[['n','Normal'],['ate','Ateromatose'],['ect','Ectasia'],['an','Aneurisma']]},
     {t:'num', k:'diam', lbl:'Diâmetro máximo', unit:'cm', show:s=>s.est==='ect'||s.est==='an'},
     {t:'select', k:'seg', lbl:'Segmento', opts:[['infrarrenal','Infrarrenal'],['justarrenal','Justarrenal'],['suprarrenal','Suprarrenal']], show:s=>s.est==='an'},
     {t:'num', k:'ext', lbl:'Extensão (opcional)', unit:'cm', show:s=>s.est==='an'},
     {t:'check', k:'tro', lbl:'Trombo mural', show:s=>s.est==='an'},
   ],
   build(s){
     if(s.est==='n') return {txt:null, conc:[]};
     const d = lauHas(s.diam) ? `${lauN(s.diam)} cm` : '';
     if(s.est==='ate') return {txt:'com calibre normal e placas parietais calcificadas.', conc:['Ateromatose aórtica.']};
     if(s.est==='ect') return {txt:`com calibre aumentado${d?`, medindo ${d} de diâmetro máximo`:''}, sem configurar aneurisma.`, conc:[`Ectasia da aorta abdominal${d?` (${d})`:''}.`]};
     let t = `com dilatação aneurismática fusiforme no segmento ${s.seg}${d?`, medindo ${d} de diâmetro máximo`:''}${lauHas(s.ext)?` e ${lauN(s.ext)} cm de extensão`:''}`;
     t += s.tro ? ', com trombo mural.' : '.';
     return {txt:t, conc:[`Aneurisma da aorta abdominal ${s.seg}${d?`, com ${d} de diâmetro máximo`:''}${s.tro?', com trombo mural':''}.`]};
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
const LAU_STRUCT = {};
LAU_ABD_ITEMS.forEach(it=>LAU_STRUCT[it.k]=it);
const LAU_STRUCT_LABELS = {
  'figado':'figado', 'veias porta e hepaticas':'porta', 'vesicula biliar':'vesicula',
  'vias biliares intra e extra-hepaticas':'vias', 'pancreas':'pancreas', 'baco':'baco',
  'rins':'rins', 'bexiga':'bexiga', 'aorta abdominal':'aorta',
  'peritoneo e retroperitoneo':'peritoneo', 'peritoneo / retroperitoneo':'peritoneo',
};
function lauNorm(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim(); }

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
function lauIsWord(w){ return /^[A-Za-zÀ-ÿ-]+[.,;:)]*$/.test(w||'') && !/^x$/i.test(w) && !/^X{1,3}$/.test(w); }
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
      out.push({t:'c', i:n++, o:opts, pre:'', suf}); i=j; continue;
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
  if(_lauTplCache[str]) return _lauTplCache[str];
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
          if(/volume|massa/i.test(ctx)) auto[t[b].i]=dims;
          break;
        }
      }
    }
  });
  return (_lauTplCache[str]={lines, n, auto});
}
function lauAutoVal(tpl, vals, i){
  const d=tpl.auto[i]; if(!d) return null;
  const v=d.map(j=>lauF(vals[j])); if(v.some(x=>!x)) return null;
  const r=v[0]*v[1]*v[2]*0.523;
  return r<10 ? String(Math.round(r*10)/10).replace('.',',') : String(Math.round(r));
}
function lauVal(tpl, vals, i){
  const v=vals&&vals[i];
  if(lauHas(v)) return {v:String(v).trim(), ok:true};
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
    const sk = LAU_STRUCT_LABELS[lauNorm(mi.label)];
    const base = { k:mi.k, label:mi.label, grp:mi.grp||'', dash:mi.dash, normal:mi.text, opts:mi.opts||[] };
    if(sk && !used[sk]){
      used[sk]=1;
      const d=LAU_STRUCT[sk];
      return Object.assign({}, base, {sk, ctrls:d.ctrls, build:d.build});
    }
    return Object.assign({}, base, {generic:true, ctrls:[]});
  });
  return { id:mk.id, nome:mk.nome, grupo:mk.grupo, metodo:'us', pronto:true,
    titulo: mk.titulo.join('\n'), concTitulo: mk.concTitulo, concNormal: mk.conc.filter(c=>!c.opt),
    concOpts: mk.conc.filter(c=>c.opt), trailer: mk.trailer, seq: mk.seq, items,
    estruturado: items.filter(x=>x.sk).length>=2 };
}
const LAUDO_MODELOS = { us: (typeof LAU_US_MASKS!=='undefined' ? LAU_US_MASKS : []).map(lauBuildModel) };
const LAU_GRUPOS = ['Medicina interna','Cabeça e pescoço','Musculoesquelético','Doppler','Obstétrico','Vascular'];
function lauModelo(id){
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
function lauGen(){ const c=lauCfgAll(); return {font:c.font||'Arial', size:c.size||12, bold:c.bold!==false, hifen:c.hifen!==false, concTitulo:c.concTitulo||''}; }
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
function lauItemLabel(m,it){ const u=(lauMcfgPeek(m.id).items||{})[it.k]||{}; return lauHas(u.label)?u.label:it.label; }
function lauItemNormal(m,it){ const u=(lauMcfgPeek(m.id).items||{})[it.k]||{}; return lauHas(u.normal)?u.normal:it.normal; }
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
    if(c.t==='radio' || c.t==='select') s[c.k]=c.opts[0][0];
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
  const g=lauGen();
  if(!state.lauDocs) state.lauDocs={};
  state.lau = state.lauDocs[modelId] = {model:modelId, v, open:null, html:null, autoConc:true, tab:'opc',
    tec:{met:false, bio:false}, ind:'', obs:'', font:g.font, size:g.size, tit:{}, conc:{v:{}, o:[]}, xf:[], xv:{}};
  return state.lau;
}
function lauCur(){ return state.lau && lauModelo(state.lau.model) ? state.lau : null; }
function lauBuild(m, it){
  const s=state.lau.v[it.k];
  if(it.generic) return {txt: lauHas(s.alt)?s.alt.trim():null, conc: lauHas(s.conc)?[lauFrase(s.conc)]:[]};
  return it.build(s);
}
/* conclusão de uma frase da biblioteca: {n} = valor do campo n do texto */
function lauFraseConcHTML(f, vals, lbl){
  if(!lauHas(f.c)) return '';
  const tpl=lauTpl(f.t);
  const L = String(lbl||'').toLowerCase().replace(/^(bursa|bursite|veia|tendão|tendões)\s+/,'').replace(/:$/,'');
  return esc(f.c).replace(/\{L\}/g, esc(L)).replace(/\{(\d+)\}/g,(_,n)=>{
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
function lauFraseLines(list, bag, mode){
  return (list||[]).map(i=>LAU_FRASES[i]).map((f,j)=>f&&f.m===mode ? lauFill(f.t, bag['f'+list[j]], true) : null).filter(x=>x!=null);
}
/* frases opcionais marcadas (já preenchidas) */
function lauOptLines(it, s, html){
  return (it.opts||[]).map((o,i)=> s.__o[i] ? lauFill(o, (s.__v['o'+i]), html) : null).filter(x=>x!=null);
}

/* ---------- geração do HTML do laudo ---------- */
function lauItemHTML(m, it){
  const L=state.lau, s=L.v[it.k], r=lauBuild(m,it), g=lauGen();
  const lblRaw = lauItemLabel(m,it);
  const lbl = lblRaw ? lauFill(lblRaw, s.__v.l, true)+':' : '';
  let txt = r.txt==null ? lauFill(lauItemNormal(m,it), s.__v.n, true) : esc(r.txt).replace(/\n/g,'<br>');
  const subs = lauFraseLines(s.__f, s.__v, 'sub');
  if(subs.length) txt = subs[subs.length-1];
  const adds = lauFraseLines(s.__f, s.__v, 'add');
  if(adds.length && !subs.length && r.txt==null){
    const ws=[]; (s.__f||[]).forEach(i=>{ const f=LAU_FRASES[i]; if(f.m==='add' && f.x) ws.push(...f.x); });
    txt = lauNegStrip(txt, ws, true);
  }
  const ex = lauOptLines(it, s, true).concat(adds);
  if(!txt && ex.length){ txt = ex.shift(); }
  if(ex.length) txt += '<br>' + ex.join('<br>');
  const pre = (g.hifen && it.dash) ? '- ' : '';
  return lbl ? `${pre}${g.bold?`<b>${lbl}</b>`:lbl} ${txt}` : `${pre}${txt}`;
}
function lauConcs(m){
  const out=[];
  const seen={};
  const push=(h)=>{ if(h && !seen[h]){ seen[h]=1; out.push({html:h}); } };
  m.items.forEach(it=>{
    (lauBuild(m,it).conc||[]).forEach(c=>push(esc(c)));
    const s=state.lau.v[it.k];
    (s.__f||[]).forEach(i=>push(lauFraseConcHTML(LAU_FRASES[i], s.__v['f'+i], lauItemLabel(m,it))));
  });
  (state.lau.xf||[]).forEach(i=>push(lauFraseConcHTML(LAU_FRASES[i], state.lau.xv['f'+i])));
  (m.concOpts||[]).forEach((c,i)=>{ if(state.lau.conc.o[i]) out.push({html:lauFill(c.text, state.lau.conc.v['o'+i], true)}); });
  return out;
}
function lauConcHTML(m){
  const g=lauGen(); const f=lauConcs(m); const L=state.lau;
  const norm = lauConcNormalLines(m).map((c,i)=>({c, i, ph:lauHasPh(c.text)}));
  let lines;
  if(!f.length) lines = norm.map(x=>({html:lauFill(x.c.text, L.conc.v['n'+x.i], true), dash:x.c.dash}));
  else {
    const keep = norm.filter(x=>x.ph).map(x=>({html:lauFill(x.c.text, L.conc.v['n'+x.i], true), dash:x.c.dash}));
    const tail = norm.filter(x=>!x.ph && /^Restante/i.test(x.c.text)).map(x=>({html:esc(x.c.text), dash:x.c.dash}));
    lines = keep.concat(f.map(x=>({html:x.html,dash:true})), tail);
  }
  return lines.map(x=>`<div>${g.hifen&&x.dash?'- ':''}${x.html}</div>`).join('');
}
function lauTecTxt(){
  const t=state.lau.tec, l=[];
  if(t.met) l.push('meteorismo intestinal'); if(t.bio) l.push('biotipo do paciente');
  return l.length ? `Exame com limitação técnica devido a ${l.join(' e ')}.` : '';
}
function lauTitHTML(m){
  return lauTitulo(m).split('\n').map((t,i)=>`<b>${lauFill(t, state.lau.tit['t'+i], true)}</b>`).join('<br>');
}
function lauDocHTML(m){
  const L=state.lau; const tec=lauTecTxt();
  const body = m.seq.map(e=>{
    if(e.t==='blank') return '<p><br></p>';
    if(e.t==='line') return `<p>${esc(e.text)}</p>`;
    const it=m.items.find(x=>x.k===e.k); return it ? `<p data-k="${it.k}">${lauItemHTML(m,it)}</p>` : '';
  }).join('');
  return `<p data-k="titulo" style="text-align:center">${lauTitHTML(m)}</p>`
    + (lauHas(L.ind)?`<p data-k="ind"><b>Indicação:</b> ${esc(L.ind)}</p>`:'')
    + (tec?`<p data-k="tec">${esc(tec)}</p>`:'')
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
    p.innerHTML = lauItemHTML(m,it); lauFlash(p);
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
      const anchor = (k==='tec' && ed.querySelector('[data-k="ind"]')) || ed.querySelector('[data-k="titulo"]');
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
  if(k==='__tit') lauPatchTit();
  else if(k==='__conc'){ lauPatchConc(); lauSaveEd(); }
  else if(k==='__obs'){ lauPatchOpt('obs', lauObsHTML()); lauPatchConc(); lauSaveEd(); }
  else { lauPatch(k); lauUpdSum(k); }
}
function lauOpt(k, i){
  const L=lauCur(); if(!L) return;
  if(k==='__conc'){ L.conc.o[i]=!L.conc.o[i]; lauRenderLeft(); lauPatchConc(); lauSaveEd(); return; }
  const s=L.v[k]; s.__o[i]=!s.__o[i]; lauRenderLeft(); lauPatch(k);
}
function lauItemReset(k){
  const L=lauCur(); if(!L) return;
  const it=lauModelo(L.model).items.find(x=>x.k===k);
  L.v[k]=lauDefaults(it); lauRenderLeft(); lauPatch(k);
}
function lauSetAuto(on){ const L=lauCur(); if(!L) return; L.autoConc=on; lauRenderLeft(); if(on){ lauPatchConc(); lauSaveEd(); } }
function lauSetTec(c){ const L=lauCur(); if(!L) return; L.tec[c]=!L.tec[c]; lauRenderLeft(); lauPatchOpt('tec', esc(lauTecTxt())); }
function lauSetInd(v){ const L=lauCur(); if(!L) return; L.ind=v; lauPatchOpt('ind', lauHas(v)?`<b>Indicação:</b> ${esc(v)}`:''); }
function lauObsHTML(){
  const L=state.lau; const parts=[];
  if(lauHas(L.obs)) parts.push(esc(L.obs).replace(/\n/g,'<br>'));
  return parts.concat(lauFraseLines(L.xf, L.xv, 'add')).join('<br>');
}
function lauSetObs(v){ const L=lauCur(); if(!L) return; L.obs=v; lauPatchOpt('obs', lauObsHTML()); }
function lauFraseToggle(k, i){
  const L=lauCur(); if(!L) return;
  const list = k==='__obs' ? L.xf : L.v[k].__f;
  const j=list.indexOf(i); if(j>=0) list.splice(j,1); else list.push(i);
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

function lauSum(m,it){
  const s=state.lau.v[it.k]; const r=lauBuild(m,it);
  const opt=(s.__o||[]).some(Boolean) || (s.__f||[]).length>0;
  if(r.txt==null && !r.conc.length && !opt){
    const filled = Object.values(s.__v||{}).some(a=>(a||[]).some(lauHas));
    return filled ? {cls:'ok', t:'Medidas preenchidas'} : {cls:'ok', t:'Normal'};
  }
  const nomes = (r.conc||[]).map(c=>c.replace(/\.$/,'')).concat((s.__f||[]).map(i=>LAU_FRASES[i].n));
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
    if(tk.t==='c') return esc(tk.pre)+`<select class="lau-ph-sel" onchange="lauPh('${k}','${tplId}',${tk.i},this.value,${sj})"><option value="">${esc(tk.o.join(' / '))}</option>${tk.o.map(o=>`<option ${v===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`+esc(tk.suf);
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
  const fs = lauFrasesDe(org).filter(f=>!(estrut && f.s));
  if(!fs.length) return '';
  const chips = fs.map(f=>`<button type="button" class="ti-ftog ${list.indexOf(f.i)>=0?'on':''}" onclick="lauFraseToggle('${k}',${f.i})">${f.m==='sub'?'':'+ '}${esc(f.n)}</button>`).join('');
  const sel = list.map(i=>{ const f=LAU_FRASES[i];
    return `<div class="lau-fsel"><div class="lau-fsel-h"><b>${esc(f.n)}</b><span>${f.m==='sub'?'substitui o texto':'linha acrescentada'}</span><button type="button" onclick="lauFraseToggle('${k}',${i})" aria-label="Remover">×</button></div>${lauHasPh(f.t)?lauInlineForm(k,'f'+i,f.t,bag['f'+i]):`<div class="lau-inl dim">${esc(f.t)}</div>`}</div>`; }).join('');
  return `<div class="lau-rl" style="margin-top:12px">Frases de alteração</div><div class="lau-chips lau-fchips">${chips}</div>${sel}`;
}
function lauItemPanel(m, it){
  const s=state.lau.v[it.k]; const k=it.k;
  const normal=lauItemNormal(m,it), lbl=lauItemLabel(m,it);
  let h='';
  if(lauHasPh(lbl)) h += `<div class="lau-rl">Rótulo</div>${lauInlineForm(k,'l',lbl,s.__v.l)}`;
  if(lauHasPh(normal)) h += `<div class="lau-rl">${it.generic?'Texto da máscara — preencha os campos':'Medidas do texto padrão'}</div>${lauInlineForm(k,'n',normal,s.__v.n)}`;
  else if(it.generic) h += `<div class="lau-rl">Texto da máscara</div><div class="lau-inl dim">${esc(normal).replace(/\n/g,'<br>')}</div>`;
  if(!it.generic) h += it.ctrls.map(c=>lauCtrlHTML(k,s,c)).join('');
  h += lauOptsHTML(k, it.opts, s.__o, s.__v);
  h += lauFrasesPanel(k, it.sk ? [it.sk] : lauFraseOrgao(lbl || String(normal).slice(0,60)), s.__f, s.__v, !!it.sk);
  if(it.generic){
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
  const extraOn = L.ind||L.tec.met||L.tec.bio;
  let h = lauCard('__extra', 'Título, indicação e limitações',
    `<div class="lau-sum ${extraOn?'alt':'ok'}">${extraOn?'Preenchido':'Opcional'}</div>`,
    ()=>`${lauHasPh(tit)?`<div class="lau-rl">Título</div>${tit.split('\n').map((t,i)=>lauHasPh(t)?lauInlineForm('__tit','t'+i,t,L.tit['t'+i]):'').join('')}`:''}
        <div class="lau-row"><div class="lau-rl">Indicação clínica</div><input class="lau-txt" type="text" value="${esc(L.ind)}" placeholder="ex.: dor abdominal" oninput="lauSetInd(this.value)"></div>
        <label class="lau-chk"><input type="checkbox" ${L.tec.met?'checked':''} onchange="lauSetTec('met')"><span>Limitação: meteorismo intestinal</span></label>
        <label class="lau-chk"><input type="checkbox" ${L.tec.bio?'checked':''} onchange="lauSetTec('bio')"><span>Limitação: biotipo do paciente</span></label>`);
  h += m.items.map(it=>{
    const sum=lauSum(m,it);
    const nm = lauItemLabel(m,it) ? lauFill(lauItemLabel(m,it), L.v[it.k].__v.l) : lauFill(lauItemNormal(m,it), L.v[it.k].__v.n).slice(0,48)+'…';
    const title = esc(nm.replace(/:$/,'')) + (it.grp?` <span class="lau-grp">${esc(it.grp)}</span>`:'');
    return lauCard(it.k, title, `<div id="lau-sum-${it.k}" class="lau-sum ${sum.cls}">${esc(sum.t)}</div>`, ()=>lauItemPanel(m,it));
  }).join('');
  h += lauCard('__obs', 'Achados adicionais', `<div class="lau-sum ${(L.obs||L.xf.length)?'alt':'ok'}">${(L.obs||L.xf.length)?'Preenchido':'Opcional'}</div>`,
    ()=>`<textarea class="lau-ta" rows="3" placeholder="Texto livre que entra antes da conclusão" oninput="lauSetObs(this.value)">${esc(L.obs)}</textarea>`
      + lauFrasesPanel('__obs', '__extra', L.xf, L.xv));
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
    <div class="lau-tabs">
      <button type="button" class="${L.tab==='opc'?'on':''}" onclick="lauTab('opc')">Achados</button>
      <button type="button" class="${L.tab==='txt'?'on':''}" onclick="lauTab('txt')">Laudo</button>
    </div>
    <div class="lau-split">
      <div class="lau-pane lau-l"><div id="lau-left">${lauLeftHTML()}</div></div>
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
      <div class="st"><div class="t">${esc(m.nome)}</div><div class="d">${m.ativo?`${(LAUDO_MODELOS[m.id]||[]).length} modelos de laudo`:'Em breve'}</div></div>
      <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
    </div>`).join('');
  return `<div class="calc-list-wrap">
    <div class="lau-beta"><b>Em desenvolvimento · fase de testes.</b> Os modelos ainda estão sendo construídos e revisados.</div>
    <div class="calc-intro-lbl">Escolha o método</div>
    ${cards}
    <div class="lc-short" onclick="openLaudoCfg()">
      <div class="si acc">${svgIcon(P.gear,22)}</div>
      <div class="st"><div class="t">Padrões dos laudos</div><div class="d">Formatação geral e textos de cada laudo</div></div>
      <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
    </div>
    <div class="disc"><b>Ferramenta de apoio. O laudo final é de responsabilidade do médico que o assina.</b></div>
  </div>`;
}
/* lista agrupada com busca (usada nos modelos e nas configurações) */
function lauListHTML(metodo, onclickFn, sub){
  const q = lauNorm(state.lauQ||'');
  const ms = (LAUDO_MODELOS[metodo]||[]).filter(m=>!q || lauNorm(m.nome+' '+m.grupo).indexOf(q)>=0);
  const groups = LAU_GRUPOS.map(g=>{
    const xs=ms.filter(m=>m.grupo===g); if(!xs.length) return '';
    return `<div class="lau-lg">${esc(g)}</div>` + xs.map(m=>{
      const cur = state.lauDocs && state.lauDocs[m.id];
      return `<div class="lau-li" onclick="${onclickFn}('${m.id}')">
        <div class="lau-lt">${esc(m.nome)}${m.estruturado?' <span class="lau-tag ok">Achados estruturados</span>':''}</div>
        <div class="lau-ld">${sub(m,cur)}</div>
        <div class="chev">${svgIcon(P.chev,16,{sw:2})}</div></div>`;
    }).join('');
  }).join('');
  return `<div class="lau-search"><input type="search" placeholder="Buscar laudo…" value="${esc(state.lauQ||'')}" oninput="state.lauQ=this.value;lauRefreshList()"></div>
    <div id="lau-list">${groups || '<div class="empty"><div class="msg">Nenhum laudo encontrado.</div></div>'}</div>`;
}
function lauRefreshList(){
  const v=state.view; const el=document.getElementById('lau-list'); if(!el) return;
  const tmp=document.createElement('div');
  tmp.innerHTML = v==='laudoCfg' ? lauCfgListHTML() : laudoModHTML();
  const n=tmp.querySelector('#lau-list'); if(n) el.innerHTML=translateHTML(n.innerHTML);
}
function laudoModHTML(){
  const m = laudoMod(state.laudoMod);
  if(!m || !m.ativo) return `<div class="calc-list-wrap"><div class="empty"><div class="msg">${esc(m?m.nome:'Método')} — modelos <b>em breve</b>.</div></div></div>`;
  return `<div class="calc-list-wrap">
    <div class="lau-beta"><b>Em testes.</b> Toque no laudo para abrir. Os órgãos marcados com "Achados estruturados" já montam as frases e a conclusão sozinhos; nos demais, preencha os campos e descreva a alteração.</div>
    ${lauListHTML(m.id, 'openLaudo', (x,cur)=>cur?'Continuar laudo em edição':`${x.items.length} itens`)}
  </div>`;
}

/* =========================================================================
   CONFIGURAÇÕES — padrões dos laudos
   Tela 1: formatação geral (vale para todos) + lista de laudos.
   Tela 2: um laudo — título, conclusão e texto de cada item.
   ========================================================================= */
function lauCfgListHTML(){
  return lauListHTML('us','openLaudoCfgModel',(x)=>{
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
      <div class="lau-cf"><div class="lau-rl">Título da conclusão</div><input class="lau-txt" type="text" placeholder="Conclusão:" value="${esc(g.concTitulo)}" oninput="lauCfgGen('concTitulo',this.value,true)"></div>
    </div>
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
      ${state.lauDocs&&state.lauDocs[mid]?`<button type="button" class="lau-btn2" onclick="lauCfgApply('${mid}')">Aplicar ao laudo aberto (descarta o texto atual)</button>`:''}
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
  if(state.lauDocs && state.lauDocs[id]) state.lau=state.lauDocs[id]; else lauNew(id);
  state.laudoId=id; state.view='laudoEdit'; render();
}
function openLaudoCfg(id){ lauSaveEd(); navPush(); state.laudoCfgId=id||null; state.view='laudoCfg'; render(); }
function openLaudoCfgModel(id){ navPush(); state.laudoCfgId=id; state.view='laudoCfg'; render(); }
