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

   Padrões do usuário (título, texto normal de cada item, título e texto da
   conclusão normal, fonte) ficam em localStorage (Configurações → Padrões
   dos laudos). Os textos dos modelos são próprios do KlugRads.
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

/* Modelos disponíveis */
const LAUDO_MODELOS = {
  us: [
    {id:'us-abdome-total', nome:'Abdome total (modo B)', pronto:true,
     titulo:'ULTRASSONOGRAFIA DE ABDOME TOTAL',
     concTitulo:'Conclusão:',
     concNormal:'Exame sem alterações significativas.',
     items: LAU_ABD_ITEMS},
  ],
};
function lauModelo(id){
  for(const k in LAUDO_MODELOS){ const m=LAUDO_MODELOS[k].find(x=>x.id===id); if(m) return m; }
  return null;
}

/* =========================================================================
   PADRÕES DO USUÁRIO (localStorage)
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
function lauGen(){ const c=lauCfgAll(); return {font:c.font||'Arial', size:c.size||12, bold:c.bold!==false, hifen:c.hifen!==false}; }
function lauMcfg(id){ const c=lauCfgAll(); if(!c.models[id]) c.models[id]={items:{}}; if(!c.models[id].items) c.models[id].items={}; return c.models[id]; }
/* valor efetivo (padrão do usuário ou do modelo) */
function lauTitulo(m){ const u=lauMcfg(m.id); return lauHas(u.titulo)?u.titulo:m.titulo; }
function lauConcTitulo(m){ const u=lauMcfg(m.id); return lauHas(u.concTitulo)?u.concTitulo:m.concTitulo; }
function lauConcNormal(m){ const u=lauMcfg(m.id); return lauHas(u.concNormal)?u.concNormal:m.concNormal; }
function lauItemLabel(m,it){ const u=lauMcfg(m.id).items[it.k]||{}; return lauHas(u.label)?u.label:it.label; }
function lauItemNormal(m,it){ const u=lauMcfg(m.id).items[it.k]||{}; return lauHas(u.normal)?u.normal:it.normal; }
/* usado dentro do build dos rins */
function LAU_NORMAL(k){ const m=lauModelo(state.lau&&state.lau.model||'us-abdome-total'); const it=m.items.find(x=>x.k===k); return lauItemNormal(m,it); }

/* =========================================================================
   ESTADO DO LAUDO EM EDIÇÃO
   ========================================================================= */
function lauDefaults(it){
  const s={};
  it.ctrls.forEach(c=>{
    if(!c.k) return;
    if(c.t==='radio' || c.t==='select') s[c.k]=c.opts[0][0];
    else if(c.t==='check') s[c.k]=false;
    else if(c.t==='dims') s[c.k]=['','',''];
    else s[c.k]='';
  });
  return s;
}
function lauNew(modelId){
  const m=lauModelo(modelId); const v={};
  m.items.forEach(it=>v[it.k]=lauDefaults(it));
  const g=lauGen();
  state.lau = {model:modelId, v, open:null, html:null, autoConc:true, tab:'opc',
               tec:{met:false, bio:false}, ind:'', obs:'', font:g.font, size:g.size};
  return state.lau;
}
function lauCur(){ return state.lau && lauModelo(state.lau.model) ? state.lau : null; }
function lauBuild(m, it){ return it.build(state.lau.v[it.k]); }

/* ---------- geração do HTML do laudo ---------- */
function lauItemHTML(m, it){
  const r = lauBuild(m,it);
  const g = lauGen();
  const lbl = esc(lauItemLabel(m,it)) + ':';
  const txt = esc(r.txt==null ? lauItemNormal(m,it) : r.txt);
  return `${g.hifen?'- ':''}${g.bold?`<b>${lbl}</b>`:lbl} ${txt}`;
}
function lauConcs(m){
  const out=[]; m.items.forEach(it=>{ (lauBuild(m,it).conc||[]).forEach(c=>{ if(c && out.indexOf(c)<0) out.push(c); }); });
  return out;
}
function lauConcHTML(m){
  const g=lauGen(); const c=lauConcs(m);
  const lines = c.length ? c : [lauConcNormal(m)];
  return lines.map(x=>`<div>${g.hifen?'- ':''}${esc(x)}</div>`).join('');
}
function lauTecTxt(){
  const t=state.lau.tec, l=[];
  if(t.met) l.push('meteorismo intestinal'); if(t.bio) l.push('biotipo do paciente');
  return l.length ? `Exame com limitação técnica devido a ${l.join(' e ')}.` : '';
}
function lauDocHTML(m){
  const L=state.lau;
  const tec=lauTecTxt();
  return `<p data-k="titulo" style="text-align:center"><b>${esc(lauTitulo(m))}</b></p>`
    + (lauHas(L.ind)?`<p data-k="ind"><b>Indicação:</b> ${esc(L.ind)}</p>`:'')
    + (tec?`<p data-k="tec">${esc(tec)}</p>`:'')
    + `<p><br></p>`
    + m.items.map(it=>`<p data-k="${it.k}">${lauItemHTML(m,it)}</p>`).join('')
    + (lauHas(L.obs)?`<p data-k="obs">${esc(L.obs)}</p>`:'')
    + `<p><br></p>`
    + `<p data-k="concT"><b>${esc(lauConcTitulo(m))}</b></p>`
    + `<div data-k="conc">${lauConcHTML(m)}</div>`;
}

/* ---------- editor: montar, aplicar alterações ---------- */
function lauEd(){ return document.getElementById('lau-ed'); }
function lauMountEditor(){
  const ed=lauEd(), L=lauCur(); if(!ed||!L) return;
  const m=lauModelo(L.model);
  ed.innerHTML = L.html || lauDocHTML(m);
  ed.style.fontFamily = lauFontCss(L.font);
  ed.style.fontSize = L.size+'pt';
  L.html = ed.innerHTML;
  try{ document.execCommand('styleWithCSS', false, false); }catch(_){}
}
function lauSaveEd(){ const ed=lauEd(); if(ed && state.lau) state.lau.html=ed.innerHTML; }
/* reescreve só o parágrafo do item + a conclusão */
function lauPatch(k){
  const ed=lauEd(), L=lauCur(); if(!ed||!L) return;
  const m=lauModelo(L.model); const it=m.items.find(x=>x.k===k);
  if(it){
    let p=ed.querySelector(`[data-k="${k}"]`);
    if(!p){ // parágrafo apagado à mão: recria antes da conclusão
      p=document.createElement('p'); p.dataset.k=k;
      const ref=ed.querySelector('[data-k="concT"]'); ref?ed.insertBefore(p,ref):ed.appendChild(p);
    }
    p.innerHTML = lauItemHTML(m,it);
    lauFlash(p);
  }
  lauPatchConc();
  lauSaveEd();
}
function lauPatchConc(){
  const ed=lauEd(), L=lauCur(); if(!ed||!L||!L.autoConc) return;
  const m=lauModelo(L.model);
  let c=ed.querySelector('[data-k="conc"]');
  if(!c){ c=document.createElement('div'); c.dataset.k='conc'; ed.appendChild(c); }
  const novo=lauConcHTML(m);
  if(c.innerHTML!==novo){ c.innerHTML=novo; lauFlash(c); }
}
/* parágrafos opcionais (indicação, limitação técnica, observações) */
function lauPatchOpt(k, html, after){
  const ed=lauEd(); if(!ed) return;
  let p=ed.querySelector(`[data-k="${k}"]`);
  if(!html){ if(p) p.remove(); lauSaveEd(); return; }
  if(!p){
    p=document.createElement('p'); p.dataset.k=k;
    let anchor=null;
    if(after==='titulo'){
      anchor = (k==='tec' && ed.querySelector('[data-k="ind"]')) || ed.querySelector('[data-k="titulo"]');
    } else {
      lauModelo(state.lau.model).items.forEach(it=>{ const e=ed.querySelector(`[data-k="${it.k}"]`); if(e) anchor=e; });
    }
    if(anchor) anchor.after(p); else ed.appendChild(p);
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
/* guarda a seleção ao abrir os menus (o select tira o foco do editor) */
let _lauRange=null;
function lauKeepSel(){ const s=window.getSelection(); const ed=lauEd(); if(s&&s.rangeCount&&ed&&ed.contains(s.anchorNode)) _lauRange=s.getRangeAt(0).cloneRange(); else _lauRange=null; }
function lauRestoreSel(){ if(!_lauRange) return; const s=window.getSelection(); s.removeAllRanges(); s.addRange(_lauRange); }

function lauPlain(){
  const ed=lauEd(); if(!ed) return '';
  const tmp=ed.cloneNode(true);
  tmp.querySelectorAll('p,div').forEach(e=>e.appendChild(document.createTextNode('\n')));
  return tmp.textContent.replace(/ /g,' ').replace(/\n{3,}/g,'\n\n').trim();
}
function lauRichHTML(){
  const ed=lauEd(); const L=lauCur(); if(!ed||!L) return '';
  return `<div style="font-family:${lauFontCss(L.font).replace(/"/g,"'")};font-size:${L.size}pt">${ed.innerHTML}</div>`;
}
function lauCopy(){
  const plain=lauPlain(), html=lauRichHTML();
  try{
    if(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write){
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html],{type:'text/html'}),
        'text/plain': new Blob([plain],{type:'text/plain'})})])
        .then(()=>klugToast('Laudo copiado ✓')).catch(()=>klugCopy(plain,'Laudo copiado ✓'));
      return;
    }
  }catch(_){}
  klugCopy(plain,'Laudo copiado ✓');
}
/* .doc = HTML que o Word abre, com as fontes e o negrito */
function lauDownload(){
  const L=lauCur(); if(!L) return;
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Laudo</title>
<style>body{font-family:${lauFontCss(L.font).replace(/"/g,"'")};font-size:${L.size}pt;} p,div{margin:0 0 2pt 0;}</style></head><body>${lauRichHTML()}</body></html>`;
  const blob=new Blob(['﻿',doc],{type:'application/msword'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=(lauModelo(L.model).id)+'.doc'; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- ações do painel esquerdo ---------- */
function lauToggle(k){ const L=lauCur(); if(!L) return; L.open = L.open===k ? null : k; lauRenderLeft(); }
function lauSet(k, c, v){
  const L=lauCur(); if(!L) return;
  const s=L.v[k]; s[c] = (v==='__toggle') ? !s[c] : v;
  lauRenderLeft(); lauPatch(k);
}
/* digitação: só atualiza o texto (não redesenha o painel, mantém o foco) */
function lauSetQ(k, c, v, i){
  const L=lauCur(); if(!L) return;
  if(i!=null){ const a=(L.v[k][c]||['','','']).slice(); a[i]=v; L.v[k][c]=a; }
  else L.v[k][c]=v;
  lauPatch(k); lauUpdSum(k);
}
function lauItemReset(k){
  const L=lauCur(); if(!L) return;
  const it=lauModelo(L.model).items.find(x=>x.k===k);
  L.v[k]=lauDefaults(it); lauRenderLeft(); lauPatch(k);
}
function lauSetAuto(on){ const L=lauCur(); if(!L) return; L.autoConc=on; lauRenderLeft(); if(on) { lauPatchConc(); lauSaveEd(); } }
function lauSetTec(c){ const L=lauCur(); if(!L) return; L.tec[c]=!L.tec[c]; lauRenderLeft(); lauPatchOpt('tec', esc(lauTecTxt()), 'titulo'); }
function lauSetInd(v){ const L=lauCur(); if(!L) return; L.ind=v; lauPatchOpt('ind', lauHas(v)?`<b>Indicação:</b> ${esc(v)}`:'', 'titulo'); }
function lauSetObs(v){ const L=lauCur(); if(!L) return; L.obs=v; lauPatchOpt('obs', lauHas(v)?esc(v):'', 'itens'); }
function lauRestart(){
  const L=lauCur(); if(!L) return;
  if(!confirmLau()) return;
  lauNew(L.model); state.lau.tab=L.tab; render(true);
}
/* confirmação sem diálogo do navegador: 1º clique arma, 2º confirma */
let _lauArm=0;
function confirmLau(){
  const now=Date.now();
  if(now-_lauArm<3500){ _lauArm=0; return true; }
  _lauArm=now; klugToast('Toque de novo em "Novo laudo" para descartar o texto atual.'); return false;
}
function lauTab(t){ const L=lauCur(); if(!L) return; lauSaveEd(); L.tab=t; render(true); }

/* resumo (Normal / Alterado) no cabeçalho de cada item */
function lauSum(m,it){
  const r=lauBuild(m,it);
  if(r.txt==null) return {cls:'ok', t:'Normal'};
  return {cls:'alt', t: r.conc && r.conc.length ? r.conc[0].replace(/\.$/,'') + (r.conc.length>1?` +${r.conc.length-1}`:'') : 'Alterado'};
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
function lauLeftHTML(){
  const L=lauCur(); const m=lauModelo(L.model);
  const cards = m.items.map(it=>{
    const s=L.v[it.k], sum=lauSum(m,it), open=L.open===it.k;
    return `<div class="lau-it ${open?'open':''}">
      <div class="lau-ih" onclick="lauToggle('${it.k}')">
        <div class="lau-in"><div class="lau-il">${esc(lauItemLabel(m,it))}</div><div id="lau-sum-${it.k}" class="lau-sum ${sum.cls}">${esc(sum.t)}</div></div>
        <button type="button" class="lau-alt">${open?'Fechar':'Alterar'}</button>
      </div>
      ${open?`<div class="lau-ib">${it.ctrls.map(c=>lauCtrlHTML(it.k,s,c)).join('')}
        <button type="button" class="lau-reset" onclick="lauItemReset('${it.k}')">${svgIcon(P.reset,14,{sw:2})} Voltar ao normal</button></div>`:''}
    </div>`;
  }).join('');
  const extraOpen = L.open==='__extra';
  return `<div class="lau-it ${extraOpen?'open':''}">
      <div class="lau-ih" onclick="lauToggle('__extra')">
        <div class="lau-in"><div class="lau-il">Indicação e limitações técnicas</div><div class="lau-sum ${(L.ind||L.tec.met||L.tec.bio)?'alt':'ok'}">${(L.ind||L.tec.met||L.tec.bio)?'Preenchido':'Opcional'}</div></div>
        <button type="button" class="lau-alt">${extraOpen?'Fechar':'Alterar'}</button>
      </div>
      ${extraOpen?`<div class="lau-ib">
        <div class="lau-row"><div class="lau-rl">Indicação clínica</div><input class="lau-txt" type="text" value="${esc(L.ind)}" placeholder="ex.: dor abdominal" oninput="lauSetInd(this.value)"></div>
        <label class="lau-chk"><input type="checkbox" ${L.tec.met?'checked':''} onchange="lauSetTec('met')"><span>Limitação: meteorismo intestinal</span></label>
        <label class="lau-chk"><input type="checkbox" ${L.tec.bio?'checked':''} onchange="lauSetTec('bio')"><span>Limitação: biotipo do paciente</span></label>
      </div>`:''}
    </div>
    ${cards}
    <div class="lau-it ${L.open==='__obs'?'open':''}">
      <div class="lau-ih" onclick="lauToggle('__obs')">
        <div class="lau-in"><div class="lau-il">Achados adicionais</div><div class="lau-sum ${L.obs?'alt':'ok'}">${L.obs?'Preenchido':'Opcional'}</div></div>
        <button type="button" class="lau-alt">${L.open==='__obs'?'Fechar':'Alterar'}</button>
      </div>
      ${L.open==='__obs'?`<div class="lau-ib"><textarea class="lau-ta" rows="3" placeholder="Texto livre que entra antes da conclusão" oninput="lauSetObs(this.value)">${esc(L.obs)}</textarea></div>`:''}
    </div>
    <label class="lau-chk lau-auto"><input type="checkbox" ${L.autoConc?'checked':''} onchange="lauSetAuto(this.checked)"><span>Conclusão automática <small>(desligue para editar a conclusão à mão sem ser sobrescrita)</small></span></label>`;
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
          <button type="button" class="lau-btn2" onclick="openLaudoCfg('${L.model}')">Padrões</button>
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
      <div class="st"><div class="t">${esc(m.nome)}</div><div class="d">${m.ativo?'Modelos de laudo estruturado':'Em breve'}</div></div>
      <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
    </div>`).join('');
  return `<div class="calc-list-wrap">
    <div class="calc-intro-lbl">Escolha o método</div>
    ${cards}
    <div class="lc-short" onclick="openLaudoCfg()">
      <div class="si acc">${svgIcon(P.gear,22)}</div>
      <div class="st"><div class="t">Padrões dos laudos</div><div class="d">Título, frases normais, conclusão e fonte</div></div>
      <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
    </div>
    <div class="disc"><b>Ferramenta de apoio. O laudo final é de responsabilidade do médico que o assina.</b></div>
  </div>`;
}

function laudoModHTML(){
  const m = laudoMod(state.laudoMod);
  if(!m || !m.ativo) return `<div class="calc-list-wrap"><div class="empty"><div class="msg">${esc(m?m.nome:'Método')} — modelos <b>em breve</b>.</div></div></div>`;
  const modelos = LAUDO_MODELOS[m.id] || [];
  const cards = modelos.length ? modelos.map(x=>`<div class="lc-short ${x.pronto?'':'locked'}" ${x.pronto?`onclick="openLaudo('${x.id}')"`:''}>
      <div class="si acc">${svgIcon(P.laudo,22)}</div>
      <div class="st"><div class="t">${esc(x.nome)}</div><div class="d">${x.pronto?(state.lau&&state.lau.model===x.id?'Continuar laudo em edição':'Abrir modelo'):'Em construção'}</div></div>
      ${x.pronto?`<div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>`:''}
    </div>`).join('')
    : `<div class="empty"><div class="msg">Modelos <b>em breve</b>.</div></div>`;
  return `<div class="calc-list-wrap">
    <div class="calc-intro-lbl">Modelos — ${esc(m.nome)}</div>
    ${cards}
  </div>`;
}

/* =========================================================================
   CONFIGURAÇÕES — padrões dos laudos
   ========================================================================= */
function laudoCfgHTML(){
  const g=lauGen();
  const all=[]; Object.keys(LAUDO_MODELOS).forEach(k=>LAUDO_MODELOS[k].forEach(m=>{ if(m.pronto) all.push(m); }));
  const mid = state.laudoCfgId && lauModelo(state.laudoCfgId) ? state.laudoCfgId : all[0].id;
  const m=lauModelo(mid), u=lauMcfg(mid);
  const fld=(lbl,val,ph,on,area)=>`<div class="lau-cf"><div class="lau-rl">${esc(lbl)}</div>${area
      ?`<textarea class="lau-ta" rows="3" placeholder="${esc(ph)}" oninput="${on}">${esc(val||'')}</textarea>`
      :`<input class="lau-txt" type="text" placeholder="${esc(ph)}" value="${esc(val||'')}" oninput="${on}">`}</div>`;
  const items = m.items.map(it=>{ const ui=u.items[it.k]||{};
    return `<div class="ti-card">
      <div class="tfg-sec-lbl">${esc(it.label)}</div>
      ${fld('Rótulo no laudo', ui.label, it.label, `lauCfgItem('${mid}','${it.k}','label',this.value)`)}
      ${fld('Texto normal', ui.normal, it.normal, `lauCfgItem('${mid}','${it.k}','normal',this.value)`, true)}
    </div>`; }).join('');
  return `<div class="ti-wrap lau-cfg">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Formatação (todos os laudos)</div>
      <div class="lau-row"><div class="lau-rl">Fonte</div><div class="lau-chips">${LAU_FONTS.map(f=>`<button type="button" class="ti-ftog ${g.font===f.id?'on':''}" style="font-family:${f.css.replace(/"/g,"'")}" onclick="lauCfgGen('font','${f.id}')">${f.id}</button>`).join('')}</div></div>
      <div class="lau-row"><div class="lau-rl">Tamanho</div><div class="lau-chips">${LAU_SIZES.map(z=>`<button type="button" class="ti-ftog ${g.size===z?'on':''}" onclick="lauCfgGen('size',${z})">${z}</button>`).join('')}</div></div>
      <label class="lau-chk"><input type="checkbox" ${g.bold?'checked':''} onchange="lauCfgGen('bold',this.checked)"><span>Nomes dos órgãos em negrito</span></label>
      <label class="lau-chk"><input type="checkbox" ${g.hifen?'checked':''} onchange="lauCfgGen('hifen',this.checked)"><span>Hífen no início de cada linha</span></label>
    </div>
    ${all.length>1?`<div class="ti-foci">${all.map(x=>`<div class="ti-ftog ${x.id===mid?'on':''}" onclick="state.laudoCfgId='${x.id}';render(true)">${esc(x.nome)}</div>`).join('')}</div>`:''}
    <div class="ti-card">
      <div class="tfg-sec-lbl">${esc(m.nome)} — título e conclusão</div>
      ${fld('Título', u.titulo, m.titulo, `lauCfgM('${mid}','titulo',this.value)`)}
      ${fld('Título da conclusão', u.concTitulo, m.concTitulo, `lauCfgM('${mid}','concTitulo',this.value)`)}
      ${fld('Conclusão do exame normal', u.concNormal, m.concNormal, `lauCfgM('${mid}','concNormal',this.value)`)}
    </div>
    ${items}
    <div class="ti-legend-row"><span class="lt">Campos em branco usam o texto padrão do KlugRads (mostrado em cinza). As mudanças valem para os próximos laudos abertos e ficam salvas neste aparelho.</span></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
      <button type="button" class="lau-btn2" onclick="lauCfgReset('${mid}')">Restaurar padrões deste modelo</button>
    </div>
  </div>`;
}
function lauCfgGen(k,v){ lauCfgAll()[k]=v; lauCfgSave(); render(true); }
function lauCfgM(id,k,v){ lauMcfg(id)[k]=v; lauCfgSave(); }
function lauCfgItem(id,ik,k,v){ const u=lauMcfg(id); if(!u.items[ik]) u.items[ik]={}; u.items[ik][k]=v; lauCfgSave(); }
let _lauCfgArm=0;
function lauCfgReset(id){
  const now=Date.now();
  if(now-_lauCfgArm>3500){ _lauCfgArm=now; klugToast('Toque de novo para restaurar os padrões do modelo.'); return; }
  _lauCfgArm=0; lauCfgAll().models[id]={items:{}}; lauCfgSave(); render(true); klugToast('Padrões restaurados ✓');
}

/* =========================================================================
   NAVEGAÇÃO
   ========================================================================= */
function openLaudos(){ navPush(); state.view='laudos'; render(); }
function openLaudoMod(id){ navPush(); state.laudoMod=id; state.view='laudoMod'; render(); }
function openLaudo(id){
  navPush();
  if(!state.lau || state.lau.model!==id) lauNew(id);
  state.laudoId=id; state.view='laudoEdit'; render();
}
function openLaudoCfg(id){ lauSaveEd(); navPush(); if(id) state.laudoCfgId=id; state.view='laudoCfg'; render(); }
