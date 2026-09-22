/* =========================================================================
   KlugRads — app de referência em ultrassonografia (PT-BR).
   Conteúdo reconstruído a partir do app MedUltra (propriedade do usuário).
   FERRAMENTA EDUCACIONAL — não substitui o julgamento clínico.

   Telas (state.view): home | refs | detail | calc | favoritos | novalista.
   Tema claro/escuro (CSS custom properties via [data-theme]).
   Persistência (localStorage): radref_theme, radref_favs, radref_favcalcs,
   radref_lists. (A chave `ultraref_data` é o cache dos dados — não é tocada
   por esta UI.)

   Modelo de item (inalterado, vem do seed completo / Supabase):
   {id,group,region,name,abbr,iconKey,tables[],footnotes[],
    chart{header,rows},exam{prep,position,points,technique},refs[]}.
   ========================================================================= */

/* ---- Ícones de órgão (chip da lista; via iconKey do item) ---- */
const ICONS = {
  organ:'<svg viewBox="0 0 24 24"><path d="M6 9c-2 2-2 7 2 9 3 1 5-1 6-3 1 2 4 3 6 0 2-3 0-9-4-9-2 0-3 1-4 2-1-2-3-3-6-1z"/></svg>',
  drop:'<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
  baby:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 21c0-4 3-6 6-6s6 2 6 6"/></svg>',
  ruler:'<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/></svg>',
};

/* ---- Ícones de UI (traço; stroke=currentColor) ---- */
const P = {
  back:'<polyline points="15 6 9 12 15 18"/>',
  chev:'<polyline points="9 6 15 12 9 18"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  sun:'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.5 12h2M19.5 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z"/>',
  star:'<path d="M12 3.4l2.6 5.27 5.82.85-4.21 4.1 1 5.8L12 17.7l-5.21 2.72 1-5.8-4.21-4.1 5.82-.85L12 3.4z"/>',
  book:'<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19a1 1 0 0 1 1 1v12"/><path d="M7.5 16H20v3a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 18.5v-13"/><path d="M9 7.5h7M9 10.5h5"/>',
  calc:'<rect x="5" y="3" width="14" height="18" rx="3"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11.5" x2="9.3" y2="11.5"/><line x1="12" y1="11.5" x2="12.3" y2="11.5"/><line x1="15" y1="11.5" x2="15.3" y2="11.5"/><line x1="9" y1="15" x2="9.3" y2="15"/><line x1="12" y1="15" x2="12.3" y2="15"/><line x1="15" y1="14.5" x2="15" y2="17.5"/><line x1="9" y1="17.5" x2="12.5" y2="17.5"/>',
  calcTab:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M8 15h2M14 11h2M14 15h2"/>',
  listplus:'<line x1="4" y1="7" x2="14" y2="7"/><line x1="4" y1="12" x2="11" y2="12"/><line x1="4" y1="17" x2="11" y2="17"/><line x1="17.5" y1="13.5" x2="17.5" y2="20.5"/><line x1="14" y1="17" x2="21" y2="17"/>',
  trash:'<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"/>',
  minus:'<line x1="6" y1="12" x2="18" y2="12"/>',
  table:'<rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  exam:'<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/>',
  tech:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  tools:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  reset:'<path d="M3 12a9 9 0 1 0 2.64-6.36"/><polyline points="3 3.5 3 9 8.5 9"/>',
  gear:'<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};
function svgIcon(inner, size, o){
  o = o || {};
  const fill = o.fill || 'none';
  const stroke = o.noStroke ? 'none' : 'currentColor';
  const sw = o.sw || 1.7;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" `
    + `stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

const ESC_MAP = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>ESC_MAP[c]); }
function nl2br(s){ return esc(s).replace(/\r?\n/g,'<br>'); }
const $ = id=>document.getElementById(id);

/* ---- Modalidades de diagnóstico por imagem ---- */
const MODALITIES = [
  {id:'rx',   name:'Radiografia',                label:'Radiografia',                  active:false,
   icon:'<rect x="5" y="2" width="14" height="20" rx="1.5"/><path d="M9 7h6M8 11h3M8 15h3M13 11h3M13 15h3"/>'},
  {id:'mamo', name:'Mamografia',                 label:'Mamografia',                   active:false,
   icon:'<path d="M6 19C6 12 9 5 12 5s6 7 6 14"/><line x1="3" y1="19" x2="21" y2="19"/><path d="M7.5 19c.8-3.5 2.5-5.5 4.5-5.5s3.7 2 4.5 5.5"/>'},
  {id:'dxa',  name:'Densitometria Óssea',        label:'Densitometria<br>Óssea',       active:false,
   icon:'<circle cx="9" cy="5" r="3"/><circle cx="15" cy="19" r="3"/><path d="M9 8l6 8"/>'},
  {id:'us',   name:'Ultrassonografia',           label:'Ultrassonografia',             active:true,
   icon:'<rect x="9" y="14" width="6" height="7" rx="3"/><path d="M7 12c1-2.5 2.5-4 5-4s4 1.5 5 4"/><path d="M4 10C5.5 5.5 8.5 4 12 4s6.5 1.5 8 6"/>'},
  {id:'tc',   name:'Tomografia Computadorizada', label:'Tomografia<br>Computadorizada',active:false,
   icon:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>'},
  {id:'rm',   name:'Ressonância Magnética',      label:'Ressonância<br>Magnética',     active:false,
   icon:'<rect x="3" y="7" width="18" height="10" rx="5"/><ellipse cx="12" cy="12" rx="3.5" ry="4"/><path d="M8 7V5M16 7V5M8 17v2M16 17v2"/>'},
];

/* ---- Especialidades de US ---- */
const SPECIALTIES = [
  {id:'neurocab',   name:'Neuro, Cabeça e Pescoço', regions:['Cabeça e Pescoço','Pequenas Partes'],                                                                           hasSub:true,  groups:['Pediatria','Adultos'], excludeNames:['Derrame Pleural']},
  {id:'torax',      name:'Tórax',               regions:[],                                                                                                                    hasSub:true,  groups:['Pediatria','Adultos'], includeNames:['Derrame Pleural']},
  {id:'abdome',     name:'Abdome',               regions:['Abdome superior','Retroperitônio','Trato Gastrintestinal','Trato Genital - Feminino','Trato Genital - Masculino','Trato Urinário'], hasSub:true,  groups:['Pediatria','Adultos']},
  {id:'musculo',    name:'Musculoesquelético',   regions:['Ossos Longos'],                                                                                                      hasSub:true,  groups:['Pediatria','Adultos']},
  {id:'obstetrico', name:'Obstétrico e Fetal',   regions:['1º Trimestre','2º e 3º Trimestres','Ossos Longos','Cabeça e Pescoço'],                                            hasSub:false, groups:['Fetal']},
  {id:'doppler',    name:'Doppler',              regions:['Cervical'],                                                                                                           hasSub:false, groups:['Doppler']},
];

/* ---- Índice Doppler: exames ativos + próximos conteúdos ---- */
const DOPPLER_INDEX = [
  {region:'Cervical', id:'doppler-carotidas-vertebrais'},
  {region:'Cervical', id:'doppler-transcraniano'},
  {region:'Cervical', id:'doppler-arterias-temporais'},

  {region:'Membros inferiores', id:'doppler-arterial-membros-inferiores'},
  {region:'Membros inferiores', id:'doppler-venoso-mmii-trombose'},
  {region:'Membros inferiores', id:'doppler-venoso-mmii-varizes'},
  {region:'Membros inferiores', id:'doppler-controle-arterial-mmii'},
  {region:'Membros inferiores', id:'doppler-aneurisma-pseudoaneurisma-mmii'},
  {region:'Membros inferiores', id:'doppler-aprisionamento-poplitea'},

  {region:'Membros superiores', id:'doppler-arterial-membros-superiores'},
  {region:'Membros superiores', id:'doppler-venoso-mmss-trombose'},
  {region:'Membros superiores', id:'doppler-desfiladeiro-toracico'},
  {region:'Membros superiores', id:'doppler-mapeamento-venoso-mmss'},

  {region:'Aorta e vasos abdominais', name:'Doppler de aorta abdominal e artérias ilíacas'},
  {region:'Aorta e vasos abdominais', name:'Doppler para controle de endoprótese de aorta'},
  {region:'Aorta e vasos abdominais', name:'Doppler de artérias renais'},
  {region:'Aorta e vasos abdominais', name:'Doppler de artérias mesentéricas'},
  {region:'Aorta e vasos abdominais', name:'Doppler de veia cava inferior e veias ilíacas'},
  {region:'Aorta e vasos abdominais', name:'Doppler para síndrome de May–Thurner'},
  {region:'Aorta e vasos abdominais', name:'Doppler para síndrome de Nutcracker'},
  {region:'Aorta e vasos abdominais', name:'Doppler para compressão do tronco celíaco'},

  {region:'Fígado e sistema portal', name:'Doppler hepático'},
  {region:'Fígado e sistema portal', name:'Doppler para hipertensão portal'},
  {region:'Fígado e sistema portal', name:'Doppler para trombose portal'},
  {region:'Fígado e sistema portal', name:'Doppler de TIPS e derivações portossistêmicas'},
  {region:'Fígado e sistema portal', name:'Doppler do fígado transplantado'},

  {region:'Rim', name:'Doppler do rim transplantado'},

  {region:'Hemodiálise', name:'Mapeamento pré-operatório para fístula arteriovenosa'},
  {region:'Hemodiálise', name:'Doppler de fístula arteriovenosa para hemodiálise'},
  {region:'Hemodiálise', name:'Doppler de prótese arteriovenosa para hemodiálise'},
];

/* ---- Taxa de Filtração Glomerular (MDRD) ---- */
const TFG_STAGES = [
  {stage:'I',    min:90,  max:Infinity, label:'Estágio I',    desc:'Função renal normal ou aumentada. Lesão renal com TFG preservada.',              clr:'#16a34a', bg:'#16a34a22'},
  {stage:'II',   min:60,  max:89,       label:'Estágio II',   desc:'Lesão renal com leve redução da TFG.',                                            clr:'#0891b2', bg:'#0891b222'},
  {stage:'IIIa', min:45,  max:59,       label:'Estágio IIIa', desc:'Redução leve a moderada da TFG.',                                                 clr:'#d97706', bg:'#d9770622'},
  {stage:'IIIb', min:30,  max:44,       label:'Estágio IIIb', desc:'Redução moderada a grave da TFG.',                                                clr:'#ea580c', bg:'#ea580c22'},
  {stage:'IV',   min:15,  max:29,       label:'Estágio IV',   desc:'Redução grave da TFG. Preparar para terapia renal substitutiva.',                 clr:'#dc2626', bg:'#dc262622'},
  {stage:'V',    min:0,   max:14,       label:'Estágio V',    desc:'Falência renal. Necessidade de diálise ou transplante.',                          clr:'#ef4444', bg:'#7f1d1d55'},
];
const TFG_REFS = [
  'Levey AS et al. A more accurate method to estimate glomerular filtration rate from serum creatinine: a new prediction equation. Ann Intern Med. 1999;130(6):461–70.',
  'Levey AS et al. New equation to estimate glomerular filtration rate. Ann Intern Med. 2009;150:604–612.',
  'Vyas DA, et al. Hidden in Plain Sight — Reconsidering the Use of Race Correction in Clinical Algorithms. N Engl J Med. 2020;383(9):874–882.',
  'Rocha AD, et al. Validation of CKD-EPI and MDRD Formulas for Glomerular Filtration Rate Estimation in Brazilian Patients. Int J Nephrol. 2020;2020:2141038.',
];

/* Valores dos drums */
const CR_VALUES = Array.from({length:200},(_,i)=>((i+1)*0.1).toFixed(1));  // '0.1'…'20.0'
const AGE_VALUES = Array.from({length:120},(_,i)=>String(i+1));             // '1'…'120'
let _tfgTimer = null;

function tfgResultHTML(r){
  if(r == null) return '';
  const st = TFG_STAGES.find(s=>r>=s.min && r<=s.max) || TFG_STAGES[TFG_STAGES.length-1];
  return `<div class="tfg-card">
    <div class="tfg-result">
      <div class="tfg-result-num">${r.toFixed(1)}</div>
      <div class="tfg-result-unit">mL / min / 1,73 m²</div>
      <div><span class="tfg-stage-badge" style="background:${st.bg};color:${st.clr}">${esc(st.label)}</span></div>
      <div class="tfg-stage-desc">${esc(st.desc)}</div>
    </div>
  </div>`;
}

/* ---- DADOS (seed offline; sync opcional com Supabase) ---- */
function hydrate(items){
  return (items||[]).map(src=>{
    let d; try{ d=JSON.parse(JSON.stringify(src)); }catch(_){ d=Object.assign({},src); }
    d.icon = ICONS[d.iconKey] || ICONS.organ;
    return d;
  });
}
// Sem seed embarcado e sem cache de conteúdo. O app começa vazio e só
// enche depois de o servidor confirmar sessão e assinatura.
//
// O cache local existia para a tela não piscar em branco, mas era ele que
// permitia usar o app offline: os 74 itens ficavam no aparelho e apareciam
// sem ninguém precisar autorizar. Guardar conteúdo pago no cliente é
// entregar o produto — some daqui, e some também o resto de "offline".
function initialData(){
  try{ localStorage.removeItem('ultraref_data'); }catch(_){}   // limpa o legado
  // Modo estático: conteúdo embutido em js/seed.js (window.SEED), sem backend.
  if(window.CONFIG && CONFIG.STATIC_MODE && Array.isArray(window.SEED)) return window.SEED;
  return [];
}
let DATA = hydrate(initialData());

// Distingue três situações que antes eram uma só ("deu ruim"):
//   {itens}        — veio conteúdo
//   'sem-acesso'   — autenticou, mas a assinatura não cobre (RLS devolve 0)
//   null           — falha de rede; mantém o que já estava em tela
async function loadFromSupabase(){
  const cfg = window.CONFIG || {};
  if(cfg.USE_SUPABASE === false) return null;
  if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;

  const sessao = await KlugSessao.valida();
  if(!sessao) return 'sem-sessao';

  const url = `${cfg.SUPABASE_URL}/rest/v1/${cfg.TABLE||'referencias'}?select=conteudo&order=sort_order.asc`;
  try{
    const res = await fetch(url, { headers:{ apikey:cfg.SUPABASE_ANON_KEY, Authorization:`Bearer ${sessao.access_token}` }});
    if(res.status===401 || res.status===403) return 'sem-sessao';
    if(!res.ok) return null;
    const rows = await res.json();
    const items = (Array.isArray(rows)?rows:[]).map(r=>r&&r.conteudo).filter(Boolean);
    // Lista vazia com HTTP 200 é a resposta do RLS a quem não assina:
    // a consulta é válida, só não há linha visível para este usuário.
    return items.length ? items : 'sem-acesso';
  }catch(_){ return null; }
}

async function syncData(){
  const remote = await loadFromSupabase();
  if(remote === null){ mostrarSemConexao(); return; }   // sem rede: nao ha o que mostrar
  if(remote === 'sem-sessao'){ KlugSessao.paraLogin('sessao'); return; }
  if(remote === 'sem-acesso'){ KlugSessao.paraLogin('assinatura'); return; }
  DATA = hydrate(remote);
  render(true);
}

// Tela de bloqueio por falta de internet. O KlugRads deixou de funcionar
// offline por decisao de produto: sem conexao nao da para conferir se a
// assinatura vale nem se a conta foi aberta em outro aparelho.
function mostrarSemConexao(){
  if(document.getElementById('klug-offline')) return;
  const box=document.createElement('div');
  box.id='klug-offline';
  box.innerHTML=
    '<div class="ko-fundo"></div><div class="ko-caixa">'+
    '<div class="ko-titulo">Sem conexão</div>'+
    '<div class="ko-texto">O KlugRads precisa de internet para confirmar seu acesso. '+
    'Conecte-se e tente de novo.</div>'+
    '<button class="ko-btn" id="ko-tentar" type="button">Tentar de novo</button></div>';
  const css=document.createElement('style');
  css.textContent=
    '#klug-offline{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;}'+
    '#klug-offline .ko-fundo{position:absolute;inset:0;background:var(--bg,#0e1216);}'+
    '#klug-offline .ko-caixa{position:relative;max-width:360px;width:100%;text-align:center;}'+
    '#klug-offline .ko-titulo{font-size:19px;font-weight:750;color:var(--tx,#e9eef3);margin-bottom:10px;}'+
    '#klug-offline .ko-texto{font-size:14px;line-height:1.55;color:var(--dim,#8b98a5);margin-bottom:22px;}'+
    '#klug-offline .ko-btn{width:100%;font:inherit;font-weight:700;font-size:15px;border-radius:12px;'+
      'padding:13px;border:0;cursor:pointer;background:var(--accent,#15b8a6);color:var(--accentInk,#04221f);}';
  document.head.appendChild(css);
  document.body.appendChild(box);
  document.getElementById('ko-tentar').addEventListener('click',()=>window.location.reload());
  window.addEventListener('online',()=>window.location.reload(),{once:true});
}

/* ---- ESTADO ---- */
let state = {
  view:'modality', theme:'dark', specialty:'abdome', subBand:'Adultos', query:'', calcSpec:'neurocab',
  item:null, sub:'tabela',
  perfil:null, assinatura:null,     // preenchidos por carregarDadosDaConta()
  favs:[], lists:[],
  newName:'', composingId:null, modalityId:null,
  calcId:null,
  tfgCr:'1.0', tfgAge:'45', tfgSexo:'M', tfgResult:null,
  tirads:null, orads:null, pe:null, sga:null, gdm:null, ptb:null,
  lang:'pt', fontScale:1, user:null,
  favCalcs:[],
  nav:[],
  termsAccepted:false,
};
const FONT_STEPS = [0.85, 0.925, 1, 1.075, 1.15, 1.25];
const LANGS = [['pt','Português'],['en','English'],['es','Español']];

/* ---- Termos de Uso e Responsabilidade (texto próprio do KlugRads, 3 idiomas) ----
   Ao alterar o conteúdo, suba TERMS_VERSION para reexibir o aceite a todos. */
// v2 (05/08/2026): o app passou a ter conta e assinatura. A versão anterior
// afirmava que nenhum dado ia para servidores nossos — verdade enquanto o
// app era aberto, falsa a partir do cadastro de CPF e CRM. Subir a versão
// reexibe o aceite a quem já havia aceitado o texto antigo.
const TERMS_VERSION = '4';
const TERMS = {
  pt:{
    title:'Termos de Uso e Responsabilidade',
    intro:'Leia e aceite os termos abaixo para usar o aplicativo.',
    items:[
      ['Finalidade educacional','O KlugRads é uma ferramenta de referência e educação. Não fornece diagnóstico nem conduta e não substitui o julgamento clínico do profissional.'],
      ['Responsabilidade do usuário','Todas as decisões clínicas são de sua inteira responsabilidade. Confira valores e fórmulas nas fontes originais antes de aplicá-los.'],
      ['Uso profissional','Destinado a profissionais de saúde e estudantes da área. Você declara ser maior de 18 anos.'],
      ['Acesso livre e gratuito','O KlugRads é aberto e gratuito, sem cadastro e sem login. Não coletamos dados pessoais nem exigimos conta para usar.'],
      ['Seus dados ficam no aparelho','Favoritos, listas e os valores que você digita nas calculadoras ficam somente no seu aparelho (armazenamento local do navegador) e não são enviados a servidores nossos. Você é responsável por obter o consentimento dos pacientes cujos dados venha a inserir.'],
      ['Sem garantias','O conteúdo é fornecido "como está", sem garantia de disponibilidade, exatidão ou atualização. O uso é por sua conta e risco.'],
      ['Conteúdo de terceiros','Fórmulas e referências pertencem aos seus autores e são citadas para fins educacionais.'],
    ],
    check:'Confirmo que sou profissional de saúde e li os termos acima.',
    accept:'Aceitar e continuar', reject:'Recusar',
    need:'Marque a confirmação acima para continuar.',
    rejected:'É necessário aceitar os termos para usar o aplicativo. Você poderá alterar sua resposta a qualquer momento em Configurações.',
    foot:'Você poderá rever estes termos ou alterar sua resposta a qualquer momento em Configurações.',
    manageLbl:'Termos de Uso e Responsabilidade', manageSub:'Leia novamente e gerencie seu aceite',
    accepted:'Você aceitou os termos de uso.', revoke:'Revogar aceite',
  },
  en:{
    title:'Terms of Use and Responsibility',
    intro:'Read and accept the terms below to use the app.',
    items:[
      ['Educational purpose','KlugRads is a reference and education tool. It does not provide diagnosis or management and does not replace the professional\'s clinical judgment.'],
      ['User responsibility','All clinical decisions are entirely your responsibility. Check values and formulas against the original sources before applying them.'],
      ['Professional use','Intended for healthcare professionals and students in the field. You declare that you are 18 or older.'],
      ['Free and open access','KlugRads is open and free — no sign-up, no login. We do not collect personal data or require an account to use it.'],
      ['Your data stays on your device','Favorites, lists and the values you type into the calculators stay only on your device (the browser\'s local storage) and are not sent to our servers. You are responsible for obtaining consent from the patients whose data you enter.'],
      ['No warranties','Content is provided "as is", with no guarantee of availability, accuracy or timeliness. Use is at your own risk.'],
      ['Third-party content','Formulas and references belong to their authors and are cited for educational purposes.'],
    ],
    check:'I confirm that I am a healthcare professional and have read the terms above.',
    accept:'Accept and continue', reject:'Decline',
    need:'Check the confirmation above to continue.',
    rejected:'You must accept the terms to use the app. You can change your answer any time in Settings.',
    foot:'You can review these terms or change your answer any time in Settings.',
    manageLbl:'Terms of Use and Responsibility', manageSub:'Read again and manage your acceptance',
    accepted:'You have accepted the terms of use.', revoke:'Revoke acceptance',
  },
  es:{
    title:'Términos de Uso y Responsabilidad',
    intro:'Lea y acepte los términos a continuación para usar la aplicación.',
    items:[
      ['Finalidad educativa','KlugRads es una herramienta de referencia y educación. No proporciona diagnóstico ni conducta y no sustituye el juicio clínico del profesional.'],
      ['Responsabilidad del usuario','Todas las decisiones clínicas son de su entera responsabilidad. Verifique valores y fórmulas en las fuentes originales antes de aplicarlos.'],
      ['Uso profesional','Destinado a profesionales de la salud y estudiantes del área. Usted declara ser mayor de 18 años.'],
      ['Acceso libre y gratuito','KlugRads es abierto y gratuito, sin registro y sin inicio de sesión. No recopilamos datos personales ni exigimos cuenta para usarlo.'],
      ['Sus datos quedan en el dispositivo','Los favoritos, las listas y los valores que escribe en las calculadoras quedan solo en su dispositivo (almacenamiento local del navegador) y no se envían a nuestros servidores. Usted es responsable de obtener el consentimiento de los pacientes cuyos datos ingrese.'],
      ['Sin garantías','El contenido se ofrece "tal cual", sin garantía de disponibilidad, exactitud o actualización. El uso es bajo su propio riesgo.'],
      ['Contenido de terceros','Las fórmulas y referencias pertenecen a sus autores y se citan con fines educativos.'],
    ],
    check:'Confirmo que soy profesional de la salud y he leído los términos anteriores.',
    accept:'Aceptar y continuar', reject:'Rechazar',
    need:'Marque la confirmación anterior para continuar.',
    rejected:'Debe aceptar los términos para usar la aplicación. Puede cambiar su respuesta en cualquier momento en Ajustes.',
    foot:'Puede revisar estos términos o cambiar su respuesta en cualquier momento en Ajustes.',
    manageLbl:'Términos de Uso y Responsabilidad', manageSub:'Léalos de nuevo y gestione su aceptación',
    accepted:'Ha aceptado los términos de uso.', revoke:'Revocar aceptación',
  },
};
function TT(){ return TERMS[state.lang] || TERMS.pt; }

function persist(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} }
function loadState(){
  try{ const t=localStorage.getItem('radref_theme'); if(t==='dark'||t==='light') state.theme=t; }catch(_){}
  try{ const f=JSON.parse(localStorage.getItem('radref_favs')||'[]'); if(Array.isArray(f)) state.favs=f; }catch(_){}
  try{ const l=JSON.parse(localStorage.getItem('radref_lists')||'[]'); if(Array.isArray(l)) state.lists=l; }catch(_){}
  state.lang='pt';   // app em português apenas; i18n dormente até a fase de tradução
  try{ const f=parseFloat(localStorage.getItem('radref_fontscale')); if(FONT_STEPS.includes(f)) state.fontScale=f; }catch(_){}
  try{ const u=JSON.parse(localStorage.getItem('radref_user')||'null'); if(u&&u.email) state.user=u; }catch(_){}
  try{ const c=JSON.parse(localStorage.getItem('radref_favcalcs')||'[]'); if(Array.isArray(c)) state.favCalcs=c; }catch(_){}
  try{ state.termsAccepted = localStorage.getItem('radref_terms')===TERMS_VERSION; }catch(_){}
}

/* ---- HELPERS de dados ---- */
const GROUP_BAND = {'Fetal':'Obstétrico','Pediatria':'Pediátrico','Adultos':'Adulto'};

function specialtyItems(){
  const sp = SPECIALTIES.find(x=>x.id===state.specialty);
  if(!sp) return [];
  let items = sp.regions.length
    ? DATA.filter(d=>sp.regions.includes(d.region) && sp.groups.includes(d.group))
    : [];
  if(sp.includeNames && sp.includeNames.length){
    const extra = DATA.filter(d=>sp.includeNames.includes(d.name) && sp.groups.includes(d.group));
    extra.forEach(e=>{ if(!items.find(i=>i.id===e.id)) items.push(e); });
  }
  if(sp.excludeNames && sp.excludeNames.length){
    items = items.filter(d=>!sp.excludeNames.includes(d.name));
  }
  if(sp.hasSub){
    const grp = state.subBand==='Pediátrico' ? 'Pediatria' : 'Adultos';
    items = items.filter(d=>d.group===grp);
  }
  return items;
}
function metaOf(d){ return [d.region, d.abbr].filter(Boolean).join(' · '); }

/* =========================================================================
   RENDER
   render(keep): keep=true preserva o scroll (atualizações in-place);
   sem keep, reinicia o scroll ao topo (navegação) com fade.
   ========================================================================= */
function render(keep){
  applyTheme();
  applyFontScale();
  // Enquanto os termos não forem aceitos, o app abre na tela de aceite (bloqueia
  // toda a navegação). A leitura em Configurações usa a view 'termsRead'.
  if(!state.termsAccepted && state.view!=='terms'){ state.view='terms'; }
  renderSidebar();
  renderStage(keep);
}
// Palco = tudo dentro de #app (header + corpo + subtabs). Separado da sidebar
// para poder atualizar o conteúdo sem recriar a sidebar (mantém foco da busca).
function renderStage(keep){
  const v = state.view;
  try{ document.body.dataset.view = v; }catch(_){}   // escopa CSS por view (desktop)
  const hdr = $('hdr');
  if(v==='home' || v==='modality' || v==='terms'){ hdr.className='hdr hide'; hdr.innerHTML=''; }
  else { hdr.className='hdr'; hdr.innerHTML = translateHTML(headerHTML()); }
  const s = $('scroll');
  const top = keep ? s.scrollTop : 0;
  s.innerHTML = translateHTML(viewHTML());
  s.className = keep ? 'scroll' : 'scroll fade';
  s.scrollTop = top;
  if(v==='calc' && state.calcId==='tfg') setTimeout(initDrums, 0);
  const sub = $('subtabs');
  sub.className='subtabs hide';
  sub.innerHTML='';
}

/* ---- Sidebar persistente (layout web / desktop) ---- */
function sidebarHTML(){
  const spItems = (typeof SPECIALTIES!=='undefined'?SPECIALTIES:[]).map(s=>
    `<div class="side-item ${state.view==='refs'&&state.specialty===s.id?'on':''}" onclick="openSpecialty('${s.id}')">
       <span class="si">${svgIcon(P.book,19,{sw:1.8})}</span>${esc(s.name)}</div>`).join('');
  const tool=(view,label,icon)=>`<div class="side-item ${state.view===view?'on':''}" onclick="setView('${view}')"><span class="si">${icon}</span>${esc(label)}</div>`;
  return `<div class="side-top">
      <div class="side-brand"><span class="k">KLUG</span><span class="r">RADS</span></div>
      <div class="side-slogan">Sua referência em Radiologia</div>
    </div>
    <div class="side-search">
      <span class="si">${svgIcon(P.search,16,{sw:2})}</span>
      <input placeholder="Buscar órgão ou medida…" value="${esc(state.query||'')}" oninput="sideSearch(this.value)">
    </div>
    <nav class="side-nav">
      <div class="side-sec">Ultrassonografia</div>
      ${spItems}
      <div class="side-sec">Ferramentas</div>
      <div class="side-item ${state.view==='calc'&&state.modalityId==='us'?'on':''}" onclick="openCalcs()"><span class="si">${svgIcon(P.calc,19)}</span>Calculadoras</div>
      ${tool('ferramentas','Outras Ferramentas', svgIcon(P.tools,19))}
      ${tool('favoritos','Favoritos', svgIcon(P.star,19,{fill:'none'}))}
      ${tool('config','Configurações', svgIcon(P.gear,19))}
      <div class="side-item ${state.view==='modality'?'on':''}" onclick="setView('modality')"><span class="si">${svgIcon(P.grid,19)}</span>Métodos de Diagnóstico</div>
    </nav>
    <div class="side-foot"><b>Grátis · sem login</b><br>Ferramenta educacional — não substitui o julgamento clínico.</div>`;
}
function renderSidebar(){
  const el = $('side'); if(!el) return;
  if(!state.termsAccepted || state.view==='terms'){ el.style.display='none'; el.innerHTML=''; return; }
  el.style.display='';
  el.innerHTML = translateHTML(sidebarHTML());
}
function openSpecialty(id){ state.view='refs'; state.specialty=id; state.query=''; render(); }
function openCalcs(){ state.modalityId='us'; state.calcId=null; state.view='calc'; render(); }
function sideSearch(v){
  state.query = v;
  if(state.view!=='refs'){ state.view='refs'; if(!state.specialty && typeof SPECIALTIES!=='undefined') state.specialty=SPECIALTIES[0].id; renderStage(); }
  const el=$('reflist'); if(el) el.innerHTML = translateHTML(refsListHTML());
}
function applyTheme(){
  document.documentElement.setAttribute('data-theme', state.theme==='light'?'light':'dark');
  const m = document.querySelector('meta[name=theme-color]');
  if(m) m.setAttribute('content', state.theme==='light'?'#eceff3':'#0e1216');
}
function renderHeader(){ $('hdr').innerHTML = headerHTML(); }

function headerHTML(){
  const v = state.view;
  let title='', sub='';
  if(v==='refs'){ title='Referências'; }
  else if(v==='detail'){ title=state.item?state.item.name:''; sub=(state.item&&state.item.abbr)?state.item.abbr:''; }
  else if(v==='calc'){ const c = state.calcId ? findCalc(state.calcId) : null; title = c ? c.title : 'Calculadoras'; }
  else if(v==='ferramentas'){ title='Outras Ferramentas'; }
  else if(v==='config'){ title='Configurações'; }
  else if(v==='termsRead'){ title=TT().title; }
  else if(v==='favoritos'){ title='Favoritos'; }
  else if(v==='novalista'){ const cl=state.lists.find(x=>x.id===state.composingId); title=cl?cl.name:'Minhas listas'; sub=cl?'Lista personalizada':''; }
  else if(v==='construction'){ const m=MODALITIES.find(x=>x.id===state.modalityId)||{}; title=m.name||'Em Construção'; }

  let right='';
  if(v==='calc' && state.calcId){
    right += `<button class="iconbtn" onclick="resetCalc()" aria-label="Resetar calculadora" title="Resetar">${svgIcon(P.reset,21,{sw:2})}</button>`;
  }
  if(v==='detail' && state.item){
    const isFav = state.favs.indexOf(state.item.id)>=0;
    right += `<button class="iconbtn" style="color:${isFav?'var(--star)':'var(--dim)'}" onclick="toggleFav('${esc(state.item.id)}')" aria-label="Favoritar">${svgIcon(P.star,22,{fill:isFav?'currentColor':'none'})}</button>`;
  }

  return `<button class="hbtn" onclick="goBack()" aria-label="Voltar">${svgIcon(P.back,22,{sw:2.2})}</button>
    <div class="htitle-wrap"><div class="htitle">${esc(title)}</div>${sub?`<div class="hsub">${esc(sub)}</div>`:''}</div>
    <div class="hact">${right}</div>`;
}

function viewHTML(){
  switch(state.view){
    case 'modality': return modalityHTML();
    case 'home': return homeHTML();
    case 'refs': return refsHTML();
    case 'detail': return detailHTML();
    case 'calc': return calcViewHTML();
    case 'favoritos': return favHTML();
    case 'novalista': return listsHTML();
    case 'construction': return constructionHTML();
    case 'ferramentas': return ferramentasHTML();
    case 'config': return configHTML();
    case 'terms': return termsGateHTML();
    case 'termsRead': return termsReadHTML();
    default: return modalityHTML();
  }
}

/* ---- 0. MODALIDADES (tela inicial) ---- */
function modalityHTML(){
  const cards = MODALITIES.map(m=>`
    <div class="mod-card ${m.active?'active':'locked'}" onclick="openModality('${m.id}')">
      <div class="mod-icon">${svgIcon(m.icon,22)}</div>
      <div class="mod-name">${m.label}</div>
      ${!m.active?'<div class="mod-badge">Em construção</div>':''}
    </div>`).join('');
  return `<div class="modal-screen">
    <div class="modal-head">
      <div class="modal-brand">KLUG<span>RADS</span></div>
      <div class="modal-slogan">Sua referência em Radiologia</div>
      <div class="modal-title">Métodos de Diagnóstico</div>
      <div class="modal-sub">Selecione uma modalidade</div>
    </div>
    <div class="modal-grid">${cards}</div>
    <div class="modal-shortcuts">
      <div class="lc-short" onclick="setView('ferramentas')">
        <div class="si acc">${svgIcon(P.tools,22)}</div>
        <div class="st"><div class="t">Outras Ferramentas</div><div class="d">Calculadoras e referências por especialidade</div></div>
        <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
      </div>
      <div class="lc-short" onclick="setView('favoritos')">
        <div class="si star">${svgIcon(P.star,23,{fill:'currentColor',noStroke:true})}</div>
        <div class="st"><div class="t">Favoritos</div><div class="d">Acesso rápido ao que você marcou</div></div>
        <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
      </div>
      <div class="lc-short" onclick="setView('novalista')">
        <div class="si acc">${svgIcon(P.listplus,23)}</div>
        <div class="st"><div class="t">Nova lista</div><div class="d">Monte um pacote para o plantão</div></div>
        <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
      </div>
      <div class="lc-short" onclick="setView('config')">
        <div class="si acc">${svgIcon(P.gear,23)}</div>
        <div class="st"><div class="t">Configurações</div><div class="d">Tema, conta, idioma e tamanho da fonte</div></div>
        <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
      </div>
    </div>
  </div>`;
}

/* ---- 1a. OUTRAS FERRAMENTAS ---- */
function ferramentasHTML(){
  return `<div class="lc-b">
    <div class="lc-top">
      <div class="lc-card fill" onclick="openGeneralCalcs()">
        <div class="lc-chip">${svgIcon(P.calc,26)}</div>
        <div><div class="t">Calculadoras</div><div class="d">Calculadoras gerais, fora da ultrassonografia</div></div>
      </div>
    </div>
  </div>`;
}

/* ---- 1c. CONFIGURAÇÕES ---- */
function configHTML(){
  const i = FONT_STEPS.indexOf(state.fontScale);
  // A area de Conta ja existia, mas lia um `state.user` do sistema antigo
  // (radref_user), sem ligacao com a sessao real: mostrava "nao conectado"
  // para quem estava logado, e o botao Sair so limpava aquela chave — nao
  // encerrava a sessao nem liberava o aparelho.
  const p = state.perfil;
  const a = state.assinatura;
  const linha = (rot,val,sub) => val
    ? `<div class="set-row"><div class="lbl">${esc(rot)}<div class="sub">${esc(val)}${sub?' · '+esc(sub):''}</div></div></div>`
    : '';
  const conta = state.user
    ? `${linha('E-mail', state.user.email)}
       ${p ? linha('Nome', p.nome) : ''}
       ${p && p.crm ? linha('CRM', p.crm + (p.crm_uf ? '-' + p.crm_uf : '')) : ''}
       ${p ? linha('Telefone', formatarTelefone(p.telefone)) : ''}
       ${a ? linha('Assinatura', rotuloAssinatura(a)) : ''}
       ${linha('Este aparelho', 'Sessão ativa')}
       <div style="padding:14px 18px"><button class="set-btn" onclick="logout()">Sair da conta</button></div>`
    : `<div class="set-row"><div class="lbl">Carregando sua conta…</div></div>`;
  return `<div class="set-wrap">
    <div class="sec-label">Aparência</div>
    <div class="set-row">
      <div class="lbl">Tema<div class="sub">Layout dia ou noite</div></div>
      <div class="set-seg">
        <button class="${state.theme==='light'?'on':''}" onclick="setTheme('light')">☀️ Dia</button>
        <button class="${state.theme==='dark'?'on':''}" onclick="setTheme('dark')">🌙 Noite</button>
      </div>
    </div>
    <div class="set-row">
      <div class="lbl">Tamanho da fonte<div class="sub">Aumenta ou diminui todo o app</div></div>
      <div class="set-step">
        <button onclick="stepFont(-1)" ${i<=0?'disabled':''} aria-label="Diminuir fonte">−</button>
        <div class="val">${Math.round(state.fontScale*100)}%</div>
        <button onclick="stepFont(1)" ${i>=FONT_STEPS.length-1?'disabled':''} aria-label="Aumentar fonte">+</button>
      </div>
    </div>

    ${(window.CONFIG&&CONFIG.STATIC_MODE) ? '' : `<div class="sec-label" style="margin-top:14px">Conta</div>${conta}`}

    <div class="sec-label" style="margin-top:14px">Críticas e Sugestões</div>
    <div class="set-row">
      <div class="lbl">Envie sua opinião para a nossa equipe<div class="sub">Em construção</div></div>
    </div>
    <div style="padding:14px 18px"><button class="set-btn" onclick="enviarSugestao()">Enviar mensagem</button></div>

    <div class="sec-label" style="margin-top:14px">${esc(TT().title)}</div>
    <div class="set-row" onclick="setView('termsRead')" style="cursor:pointer">
      <div class="lbl">${esc(TT().manageLbl)}<div class="sub">${esc(TT().manageSub)}</div></div>
      <div style="color:var(--dim);display:flex">${svgIcon(P.chev,18,{sw:2})}</div>
    </div>
  </div>`;
}

/* ---- Termos: itens + tela de aceite (1º uso) + leitura em Configurações ---- */
function termsItemsHTML(){
  return `<div class="terms-box">` + TT().items.map(it=>
    `<div class="terms-item"><b>${esc(it[0])}</b><span>${esc(it[1])}</span></div>`
  ).join('') + `</div>`;
}
function termsGateHTML(){
  const T = TT();
  return `<div class="terms-wrap">
    <div class="terms-brand">KLUG<span>RADS</span></div>
    <div class="terms-title">${esc(T.title)}</div>
    <div class="terms-intro">${esc(T.intro)}</div>
    ${termsItemsHTML()}
    <label class="terms-check">
      <input type="checkbox" id="terms-chk" onchange="document.getElementById('terms-msg').style.display='none'">
      <span>${esc(T.check)}</span>
    </label>
    <div class="terms-msg" id="terms-msg"></div>
    <div class="terms-actions">
      <button class="terms-reject" onclick="rejectTerms()">${esc(T.reject)}</button>
      <button class="terms-accept" onclick="acceptTerms()">${esc(T.accept)}</button>
    </div>
    <div class="terms-foot">${esc(T.foot)}</div>
  </div>`;
}
function termsReadHTML(){
  const T = TT();
  return `<div class="terms-wrap" style="padding-top:12px">
    ${termsItemsHTML()}
    <div class="set-note" style="text-align:center">✓ ${esc(T.accepted)}</div>
    <div style="padding:6px 2px"><button class="set-btn" onclick="revokeTerms()">${esc(T.revoke)}</button></div>
  </div>`;
}
function acceptTerms(){
  const chk = document.getElementById('terms-chk');
  if(!chk || !chk.checked){
    const m = document.getElementById('terms-msg');
    if(m){ m.textContent = TT().need; m.style.display='block'; }
    return;
  }
  state.termsAccepted = true;
  try{ localStorage.setItem('radref_terms', TERMS_VERSION); }catch(_){}
  state.nav=[]; state.view='modality'; render();
}
function rejectTerms(){
  const m = document.getElementById('terms-msg');
  if(m){ m.textContent = TT().rejected; m.style.display='block'; }
}
function revokeTerms(){
  state.termsAccepted = false;
  try{ localStorage.removeItem('radref_terms'); }catch(_){}
  state.nav=[]; state.view='terms'; render();
}
function setTheme(t){
  if(state.theme===t) return;
  state.theme=t;
  try{ localStorage.setItem('radref_theme', t); }catch(_){}
  applyTheme(); render(true);
}
function setLang(l){
  state.lang=l;
  try{ localStorage.setItem('radref_lang', l); }catch(_){}
  render(true);
}
function applyFontScale(){
  document.documentElement.style.setProperty('--app-zoom', state.fontScale);
}
function stepFont(dir){
  const i = FONT_STEPS.indexOf(state.fontScale) + dir;
  if(i<0 || i>=FONT_STEPS.length) return;
  state.fontScale = FONT_STEPS[i];
  try{ localStorage.setItem('radref_fontscale', String(state.fontScale)); }catch(_){}
  applyFontScale(); render(true);
}
function login(){
  // Placeholder — a autenticação real (Supabase/Stripe) entra na etapa de monetização.
  alert(t('Login em breve.'));
}
function enviarSugestao(){
  // Placeholder — o e-mail da central ainda será definido.
  alert(t('Canal de contato em construção — em breve você poderá enviar críticas e sugestões por aqui.'));
}
// Busca perfil e assinatura para a area de Conta. Sao dados do proprio
// usuario: a RLS ja garante que ninguem enxerga os dos outros.
async function carregarDadosDaConta(){
  const cfg = window.CONFIG || {};
  const s = await KlugSessao.valida();
  if(!s) return;
  const h = { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}` };
  try{
    const [rp, ra] = await Promise.all([
      fetch(`${cfg.SUPABASE_URL}/rest/v1/perfis?select=nome,cpf,crm,crm_uf,telefone&limit=1`, {headers:h}),
      fetch(`${cfg.SUPABASE_URL}/rest/v1/assinaturas?select=status,expira_em&limit=1`, {headers:h}),
    ]);
    const perfis = rp.ok ? await rp.json() : [];
    const assins = ra.ok ? await ra.json() : [];
    state.perfil = perfis[0] || null;
    state.assinatura = assins[0] || null;
    if(state.view==='settings') render(true);
  }catch(_){ /* area de Conta fica sem os extras; nao quebra o app */ }
}

function formatarTelefone(t){
  const d=(t||'').replace(/\D/g,'');
  if(d.length===11) return d.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3');
  if(d.length===10) return d.replace(/(\d{2})(\d{4})(\d{4})/,'($1) $2-$3');
  return t||'';
}

function rotuloAssinatura(a){
  const nomes={trial:'Período de teste',ativa:'Ativa',inadimplente:'Pagamento pendente',
               cancelada:'Cancelada',expirada:'Expirada'};
  const base=nomes[a.status]||a.status;
  if(!a.expira_em) return a.status==='ativa' ? base+' · sem prazo' : base;
  const dias=Math.ceil((new Date(a.expira_em)-Date.now())/86400000);
  return dias>0 ? `${base} · ${dias} dia${dias===1?'':'s'} restante${dias===1?'':'s'}` : `${base} · vencida`;
}

// Sair de verdade: encerra a sessao no servidor (liberando o aparelho),
// apaga token e conteudo, e volta para o login.
function logout(){
  try{ localStorage.removeItem('radref_user'); }catch(_){}   // resto do sistema antigo
  const id = KlugSessao.aparelhoId();
  const cfg = window.CONFIG || {};
  KlugSessao.valida().then(function(s){
    const fim = s
      ? fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/encerrar_sessao`, {
          method:'POST',
          headers:{'Content-Type':'application/json', apikey:cfg.SUPABASE_ANON_KEY,
                   Authorization:`Bearer ${s.access_token}`},
          body: JSON.stringify({p_device_id:id})
        }).catch(()=>{})
      : Promise.resolve();
    fim.then(()=>KlugSessao.sair());
  });
}

/* ---- 1b. LAUNCHER (home) ---- */
function homeHTML(){
  return `<div class="lc">
    <button class="iconbtn lc-back" onclick="goBack()" aria-label="Voltar">${svgIcon(P.back,22,{sw:2.2})}</button>
    <div class="lc-head">
      <div class="lc-brand">KLUG<span>RADS</span></div>
      <div class="lc-greet">Ultrassonografia</div>
    </div>
    <div class="lc-b">
      <div class="lc-top">
        <div class="lc-card" onclick="setView('calc')">
          <div class="lc-chip">${svgIcon(P.calc,26)}</div>
          <div><div class="t">Calculadoras</div><div class="d">TI-RADS, BI-RADS, escores e fórmulas</div></div>
        </div>
        <div class="lc-card fill" onclick="setView('refs')">
          <div class="lc-chip">${svgIcon(P.book,26)}</div>
          <div><div class="t">Referências</div><div class="d">Medidas normais por órgão e idade</div></div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---- 2. REFERÊNCIAS (lista) ---- */
function refsHTML(){
  const sp = SPECIALTIES.find(x=>x.id===state.specialty);
  const specChips = SPECIALTIES.map(s=>
    `<div class="chip ${state.specialty===s.id?'on':''}" onclick="setSpecialty('${s.id}')">${esc(s.name)}</div>`
  ).join('');
  let subRow = '';
  if(sp && sp.hasSub){
    subRow = `<div class="sec-label">Faixa Etária</div>
      <div class="subbandrow">
        <div class="chip subbandchip ${state.subBand==='Pediátrico'?'on':''}" onclick="setSubBand('Pediátrico')">Pediátrico</div>
        <div class="chip subbandchip ${state.subBand==='Adultos'?'on':''}" onclick="setSubBand('Adultos')">Adultos</div>
      </div>`;
  }
  return `<div class="rsearch"><div class="rsearch-box">
      <div class="rsearch-ic">${svgIcon(P.search,18,{sw:2})}</div>
      <input id="q" value="${esc(state.query)}" oninput="onSearch(this.value)" placeholder="Pesquisar órgão ou medida…">
    </div></div>
    <div class="sec-label spec-label">Especialidades</div>
    <div class="bandzone">
      <div class="bandrow" id="bandrow">${specChips}</div>
      <div class="band-fade"><div class="band-arrow" onclick="scrollBandMore()">»</div></div>
    </div>
    ${subRow}
    <div id="reflist">${refsListHTML()}</div>`;
}
function refsListHTML(){
  const sp = SPECIALTIES.find(x=>x.id===state.specialty);
  const q = state.query.trim().toLowerCase();
  if(sp&&sp.id==='doppler') return dopplerIndexHTML(q);
  let items = specialtyItems();
  if(q) items = items.filter(d=>(d.name+' '+(d.abbr||'')+' '+d.region).toLowerCase().includes(q));
  if(!items.length){
    const msg = (sp && !sp.regions.length)
      ? `${sp.name} — referências em breve.`
      : q ? `Nenhum resultado para "${state.query}".` : 'Sem itens para esta seleção.';
    return `<div class="empty"><div class="big">○</div><div class="msg">${esc(msg)}</div></div>`;
  }
  let html='', last=null;
  items.forEach(d=>{
    if(d.region!==last){ html+=`<div class="grp">${esc(d.region)}</div>`; last=d.region; }
    html += rowHTML(d);
  });
  html += `<div class="disc"><b>Ferramenta educacional. Os valores são referências da literatura e não substituem o julgamento clínico.</b></div>`;
  return html;
}
function dopplerIndexHTML(q){
  const entries=DOPPLER_INDEX.map(entry=>{
    if(!entry.id) return entry;
    const item=DATA.find(d=>d.id===entry.id);
    return item?Object.assign({},entry,{item}):entry;
  }).filter(entry=>{
    if(!q) return true;
    const item=entry.item;
    const text=item?(item.name+' '+(item.abbr||'')+' '+entry.region):(entry.name+' '+entry.region);
    return text.toLowerCase().includes(q);
  });
  if(!entries.length){
    return `<div class="empty"><div class="big">○</div><div class="msg">Nenhum resultado para "${esc(state.query)}".</div></div>`;
  }
  let html='',last=null;
  entries.forEach(entry=>{
    if(entry.region!==last){ html+=`<div class="grp">${esc(entry.region)}</div>`; last=entry.region; }
    html+=entry.item?rowHTML(entry.item):dopplerSoonRowHTML(entry);
  });
  html+=`<div class="disc">Os itens marcados como <b>Em breve</b> formam o índice planejado da seção Doppler. Os valores publicados são referências da literatura e não substituem o julgamento clínico.</div>`;
  return html;
}
function dopplerSoonRowHTML(entry){
  return `<button class="row roadmap-row" type="button" disabled aria-label="${esc(entry.name)} — em breve">
    <span class="ic">${ICONS.drop}</span>
    <span class="tx"><span class="nm">${esc(entry.name)}</span><span class="meta">${esc(entry.region)}</span></span>
    <span class="soon-badge">Em breve</span>
  </button>`;
}
function rowHTML(d){
  const isFav = state.favs.indexOf(d.id)>=0;
  return `<div class="row" onclick="openItem('${esc(d.id)}')">
    <div class="ic">${d.icon||ICONS.organ}</div>
    <div class="tx"><div class="nm">${esc(d.name)}</div><div class="meta">${esc(metaOf(d))}</div></div>
    <div class="star-btn ${isFav?'on':''}" onclick="event.stopPropagation();toggleFav('${esc(d.id)}')">${svgIcon(P.star,20,{fill:isFav?'currentColor':'none'})}</div>
    <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
  </div>`;
}

/* ---- 3. DETALHE ---- */
function detailHTML(){
  const d = state.item; if(!d) return '';
  const faixa = (GROUP_BAND[d.group]||d.group)+' — '+d.region;
  const contextLabel = d.group==='Doppler' ? 'Seção' : 'Faixa etária';
  let h = `<div class="sec-label">${contextLabel}</div><div class="d-age">${esc(faixa)}</div>`;
  h += referenceCalculatorHTML(d);
  if(d.tables&&d.tables.length){ d.tables.forEach((t,i)=>{ h+=tableHTML(t,d.id+'-'+i); }); }
  else { h+=`<div class="empty"><div class="msg">Sem tabela de referência para este item.</div></div>`; }
  if(d.footnotes&&d.footnotes.length){ h+=`<div class="note">`+d.footnotes.map(f=>nl2br(f)).join('<br>')+`</div>`; }
  h += refsAccHTML(d);
  // Desktop: conteúdo à esquerda + coluna direita (relacionados/ações). No
  // celular a coluna direita fica escondida (CSS) e o conteúdo ocupa tudo.
  return `<div class="detail-grid"><div class="detail-main">${h}</div>${detailRailHTML(d)}</div>`;
}
function detailRailHTML(d){
  const sib = (typeof DATA!=='undefined'?DATA:[]).filter(x=>x.region===d.region && x.group===d.group && x.id!==d.id).slice(0,8);
  let rel='';
  if(sib.length){
    rel = `<div class="rail-card"><h4>Nesta seção</h4><div class="rail-rel">`+
      sib.map(x=>`<a onclick="openItem('${esc(x.id)}')"><span class="d"></span>${esc(x.name)}</a>`).join('')+`</div></div>`;
  }
  const isFav = state.favs.indexOf(d.id)>=0;
  const fav = `<div class="rail-card"><h4>Ações</h4>
    <button class="rail-cta" style="${isFav?'background:var(--starSoft);color:var(--star)':''}" onclick="toggleFav('${esc(d.id)}')">${isFav?'★ Nos favoritos':'☆ Favoritar'}</button></div>`;
  const calc = `<div class="rail-card"><h4>Calculadoras</h4><div class="rail-note">Escores e fórmulas de ultrassonografia.</div><button class="rail-cta" onclick="setView('calc')">Abrir calculadoras</button></div>`;
  return `<aside class="detail-rail">${rel}${fav}${calc}</aside>`;
}
function tableHTML(t,key){
  const rows = t.rows||[]; if(!rows.length) return '';
  const ncols = Math.max.apply(null, rows.map(r=>r.length));
  let table='';
  const minWidth = ncols > 3 ? Math.max(620, ncols*126) : 0;
  table+=`<div class="table-scroll"><table class="mtable"${minWidth?` style="min-width:${minWidth}px"`:''}><tbody>`;
  rows.forEach((r,ri)=>{
    const head = ri===0 && rows.length>1;
    table+=`<tr>`;
    for(let c=0;c<ncols;c++){
      const cell = r[c]==null?'':r[c];
      const cls = head ? 'head' : (c===0 ? 'lbl' : '');
      table+=`<td class="${cls}">${nl2br(cell)}</td>`;
    }
    table+=`</tr>`;
  });
  table+=`</tbody></table></div>`;
  if(!t.collapsible){
    return (t.title?`<div class="tb-title">${esc(t.title)}</div>`:'')
      +(t.source?`<div class="tb-source">${esc(t.source)}</div>`:'')+table;
  }
  const safeKey = String(key||'table').replace(/[^a-zA-Z0-9_-]/g,'-');
  const bodyId = 'table-body-'+safeKey;
  const chevId = 'table-chev-'+safeKey;
  const open = !!t.defaultOpen;
  return `<section class="table-acc">
    <button class="table-acc-head" type="button" aria-expanded="${open?'true':'false'}"
      aria-controls="${bodyId}" onclick="toggleTableAcc('${bodyId}','${chevId}',this)">
      <span class="table-acc-copy">
        <span class="table-acc-source">${esc(t.source||'Critério')}</span>
        <span class="table-acc-title">${esc(t.title||'Tabela')}</span>
      </span>
      <span class="table-acc-chev" id="${chevId}">${open?'⌃':'⌄'}</span>
    </button>
    <div class="table-acc-body ${open?'open':''}" id="${bodyId}">${table}</div>
  </section>`;
}
function refsAccHTML(d){
  if(!d.refs||!d.refs.length) return '';
  return `<div class="acc-head" onclick="toggleAcc('refsbody','refchev')"><span>Referências</span><span id="refchev">⌄</span></div>
    <div class="acc-body" id="refsbody">`+d.refs.map(r=>`<div class="ref">${nl2br(r)}</div>`).join('')+`</div>`;
}
function chartCalculatorHTML(d){
  const ch = d.chart;
  if(!ch||!ch.rows||!ch.rows.length) return '';
  const label = 'Informe '+((ch.header&&ch.header[0])||'o valor');
  return `<div class="calc-wrap">
    <div class="calc-title">Consulta rápida</div>
    <div class="calc-label">${esc(label)}</div>
    <div class="calc-in">
      <input id="chart-value" type="number" inputmode="decimal" placeholder="0">
      <button class="calc-btn" onclick="runReferenceCalculator('chart')">Consultar</button>
    </div>
    <div id="reference-calc-output"></div>
  </div>`;
}
function calcFieldHTML(id, label, unit){
  return `<label class="refcalc-field" for="${id}">
    <span>${esc(label)}</span>
    <div class="refcalc-input"><input id="${id}" type="number" inputmode="decimal" min="0" placeholder="0"><b>${esc(unit)}</b></div>
  </label>`;
}
function customCalculatorHTML(calc){
  if(calc.kind==='carotid-brazil-2023'){
    return `<div class="calc-wrap refcalc">
      <div class="calc-title">${esc(calc.title)}</div>
      <div class="calc-source">${esc(calc.source||'')}</div>
      <div class="refcalc-grid">
        ${calcFieldHTML('car-ica-psv','VPS da ACI','cm/s')}
        ${calcFieldHTML('car-ica-edv','VDF da ACI','cm/s')}
        ${calcFieldHTML('car-cca-psv','VPS da ACC','cm/s')}
        ${calcFieldHTML('car-cca-edv','VDF da ACC','cm/s')}
      </div>
      <button class="calc-btn refcalc-btn" onclick="runReferenceCalculator('carotid-brazil-2023')">Calcular</button>
      <div id="reference-calc-output"></div>
    </div>`;
  }
  if(calc.kind==='lindegaard'){
    return `<div class="calc-wrap refcalc">
      <div class="calc-title">${esc(calc.title)}</div>
      <div class="calc-source">${esc(calc.source||'')}</div>
      <div class="refcalc-grid">
        ${calcFieldHTML('lind-mca','Velocidade média da ACM','cm/s')}
        ${calcFieldHTML('lind-ica','Velocidade média da ACI extracraniana','cm/s')}
      </div>
      <button class="calc-btn refcalc-btn" onclick="runReferenceCalculator('lindegaard')">Calcular</button>
      <div id="reference-calc-output"></div>
    </div>`;
  }
  if(calc.kind==='lower-limb-native-stenosis'||calc.kind==='upper-limb-native-stenosis'){
    const fieldPrefix=calc.kind==='upper-limb-native-stenosis'?'uli':'lli';
    return `<div class="calc-wrap refcalc">
      <div class="calc-title">${esc(calc.title)}</div>
      <div class="calc-source">${esc(calc.source||'')}</div>
      <div class="refcalc-grid">
        ${calcFieldHTML(fieldPrefix+'-v2','VPS no ponto da lesão (V2)','cm/s')}
        ${calcFieldHTML(fieldPrefix+'-v1','VPS proximal à lesão (V1)','cm/s')}
      </div>
      <button class="calc-btn refcalc-btn" onclick="runReferenceCalculator('${esc(calc.kind)}')">Calcular</button>
      <div id="reference-calc-output"></div>
    </div>`;
  }
  if(calc.kind==='lower-limb-intervention'){
    return `<div class="calc-wrap refcalc">
      <div class="calc-title">${esc(calc.title)}</div>
      <div class="calc-source">${esc(calc.source||'')}</div>
      <div class="refcalc-grid">
        ${calcFieldHTML('lli-ctrl-v2','Maior VPS no segmento tratado','cm/s')}
        ${calcFieldHTML('lli-ctrl-v1','VPS no segmento proximal','cm/s')}
      </div>
      <button class="calc-btn refcalc-btn" onclick="runReferenceCalculator('lower-limb-intervention')">Calcular</button>
      <div id="reference-calc-output"></div>
    </div>`;
  }
  return '';
}
function referenceCalculatorHTML(d){
  if(d.calculator) return customCalculatorHTML(d.calculator);
  if(d.chart) return chartCalculatorHTML(d);
  return '';
}

function calcNumber(id){
  const el=$(id);
  const raw=el&&String(el.value).trim().replace(',','.');
  const value=parseFloat(raw);
  return Number.isFinite(value)?value:null;
}
function calcFmt(value,digits){
  return Number(value).toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
}
function calcMetricHTML(label,value){
  return `<div class="refcalc-metric"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
}
function calcSourceResultHTML(source,title,note,tone){
  return `<div class="refcalc-result ${tone||'ok'}">
    <div class="refcalc-result-kicker">${esc(source)}</div>
    <div class="refcalc-result-title">${esc(title)}</div>
    ${note?`<div class="refcalc-result-note">${esc(note)}</div>`:''}
  </div>`;
}
function renderReferenceCalc(html){
  const out=$('reference-calc-output');
  if(out) out.innerHTML=html;
}
function calcErrorHTML(message){
  return `<div class="refcalc-result error"><div class="refcalc-result-title">Revise os dados</div><div class="refcalc-result-note">${esc(message)}</div></div>`;
}
function runReferenceCalculator(kind){
  if(kind==='carotid-brazil-2023'){
    const psv=calcNumber('car-ica-psv'), edv=calcNumber('car-ica-edv');
    const ccaPsv=calcNumber('car-cca-psv'), ccaEdv=calcNumber('car-cca-edv');
    if([psv,edv,ccaPsv,ccaEdv].some(v=>v===null||v<0)){
      renderReferenceCalc(calcErrorHTML('Preencha as quatro velocidades com valores válidos.'));
      return;
    }
    if(ccaPsv<=0||ccaEdv<=0){
      renderReferenceCalc(calcErrorHTML('As velocidades da ACC devem ser maiores que zero para calcular as relações.'));
      return;
    }
    if(psv===0&&edv===0){
      renderReferenceCalc(`<div class="refcalc-result warn">
        <div class="refcalc-result-kicker">Tabela brasileira</div>
        <div class="refcalc-result-title">Não classificável automaticamente</div>
        <div class="refcalc-result-note">Suboclusão e oclusão exigem avaliação do lúmen e do fluxo; confira diretamente a tabela.</div>
      </div>`);
      return;
    }
    const psvRatio=psv/ccaPsv, stMary=psv/ccaEdv, edvRatio=edv/ccaEdv;
    let grade='Critérios discordantes';
    let tone='warn';
    if(psv>400&&psvRatio>5&&stMary>30){ grade='> 90%'; tone='ok'; }
    else if(psv>230&&edv>140){ grade='80–89%'; tone='ok'; }
    else if(psv>230&&edv>100&&edv<=140){ grade='70–79%'; tone='ok'; }
    else if(psv>=140&&psv<=230&&edv>=70&&edv<=100){ grade='60–69%'; tone='ok'; }
    else if(psv>=140&&psv<=230&&edv>=40&&edv<70){ grade='50–59%'; tone='ok'; }
    else if(psv<140&&edv<40){ grade='< 50%'; tone='ok'; }
    const note=tone==='ok'
      ? 'Estimativa pela combinação de VPS e VDF. Confirme a coerência nas relações e na avaliação morfológica.'
      : 'VPS e VDF não apontam para a mesma faixa. Não force uma classificação automática; confronte todos os parâmetros na tabela.';
    renderReferenceCalc(`<div class="refcalc-result ${tone}">
      <div class="refcalc-result-kicker">Estimativa pela DIC/CBR/SABCV 2023</div>
      <div class="refcalc-result-title">${esc(grade)}</div>
      <div class="refcalc-metrics">
        ${calcMetricHTML('VPS ACI / VPS ACC',calcFmt(psvRatio,2))}
        ${calcMetricHTML('VPS ACI / VDF ACC',calcFmt(stMary,1))}
        ${calcMetricHTML('VDF ACI / VDF ACC',calcFmt(edvRatio,2))}
      </div>
      <div class="refcalc-result-note">${esc(note)}</div>
    </div>`);
    return;
  }
  if(kind==='lindegaard'){
    const mca=calcNumber('lind-mca'), ica=calcNumber('lind-ica');
    if(mca===null||ica===null||mca<0||ica<=0){
      renderReferenceCalc(calcErrorHTML('Preencha as duas velocidades; a velocidade da ACI deve ser maior que zero.'));
      return;
    }
    const ratio=mca/ica;
    let grade='Critérios discordantes', note='Confira separadamente a velocidade média da ACM e o índice na tabela.';
    if(mca<120&&ratio<3){ grade='Vasoespasmo ausente'; note='Velocidade média da ACM < 120 cm/s e índice < 3.'; }
    else if(mca>=120&&ratio<3){ grade='Hiperemia'; note='Velocidade média elevada com índice < 3.'; }
    else if(mca>=120&&mca<150&&ratio>=3&&ratio<=6){ grade='Vasoespasmo leve'; note='Velocidade média de 120–149 cm/s e índice entre 3 e 6.'; }
    else if(mca>=150&&mca<200&&ratio>=3&&ratio<=6){ grade='Vasoespasmo moderado'; note='Velocidade média de 150–199 cm/s e índice entre 3 e 6.'; }
    else if(mca>=200&&ratio>6){ grade='Vasoespasmo grave'; note='Velocidade média ≥ 200 cm/s e índice > 6.'; }
    renderReferenceCalc(`<div class="refcalc-result ${grade==='Critérios discordantes'?'warn':'ok'}">
      <div class="refcalc-result-kicker">Índice de Lindegaard</div>
      <div class="refcalc-result-title">${esc(grade)}</div>
      <div class="refcalc-metrics">${calcMetricHTML('ACM / ACI extracraniana',calcFmt(ratio,2))}</div>
      <div class="refcalc-result-note">${esc(note)}</div>
    </div>`);
    return;
  }
  if(kind==='lower-limb-native-stenosis'||kind==='upper-limb-native-stenosis'){
    const upper=kind==='upper-limb-native-stenosis';
    const fieldPrefix=upper?'uli':'lli';
    const v2=calcNumber(fieldPrefix+'-v2'), v1=calcNumber(fieldPrefix+'-v1');
    if(v2===null||v1===null||v2<0||v1<=0){
      renderReferenceCalc(calcErrorHTML('Preencha as duas velocidades; a VPS proximal deve ser maior que zero.'));
      return;
    }
    if(v2===0){
      renderReferenceCalc(`<div class="refcalc-result warn">
        <div class="refcalc-result-kicker">${upper?'Membro superior — critérios periféricos':'DIC/SBC 2019'}</div>
        <div class="refcalc-result-title">Não classificável automaticamente</div>
        <div class="refcalc-result-note">Velocidade zero isolada não confirma oclusão. Confira a ausência de fluxo com os ajustes apropriados.</div>
      </div>`);
      return;
    }
    const ratio=v2/v1;
    let grade;
    if(upper){
      grade='Normal';
      if(ratio>4) grade='> 75%';
      else if(ratio>=2) grade='50–75%';
      else if(ratio>=1.5) grade='1–49%';
    } else {
      grade='< 50%';
      if(ratio>=4) grade='≥ 70%';
      else if(ratio>=2) grade='≥ 50% e < 70%';
    }
    renderReferenceCalc(`<div class="refcalc-result ok">
      <div class="refcalc-result-kicker">${upper?'Artéria do membro superior — critérios convencionais':'Artéria nativa — DIC/SBC 2019'}</div>
      <div class="refcalc-result-title">${esc(grade)}</div>
      <div class="refcalc-metrics">${upper?calcMetricHTML('VPS na lesão',calcFmt(v2,0)+' cm/s'):''}${calcMetricHTML('Razão VPS V2 / V1',calcFmt(ratio,2))}</div>
      <div class="refcalc-result-note">${upper?'Critérios periféricos extrapolados por falta de limiares específicos; confronte com a morfologia e a curva distal.':'Classificação baseada somente na razão de velocidades; confronte com a morfologia e a curva distal.'}</div>
    </div>`);
    return;
  }
  if(kind==='lower-limb-intervention'){
    const v2=calcNumber('lli-ctrl-v2'), v1=calcNumber('lli-ctrl-v1');
    if(v2===null||v1===null||v2<0||v1<=0){
      renderReferenceCalc(calcErrorHTML('Preencha as duas velocidades; a VPS proximal deve ser maior que zero.'));
      return;
    }
    if(v2===0){
      renderReferenceCalc(calcErrorHTML('Ausência de fluxo exige avaliação direta e não pode ser classificada apenas pela razão.'));
      return;
    }
    const ratio=v2/v1;

    let graft='Critérios discordantes', graftTone='warn';
    if(v2>300&&ratio>3.5){ graft='Critério de alta velocidade presente'; graftTone='ok'; }
    else if(v2>=180&&v2<=300&&ratio>2){ graft='Faixa de risco moderado'; graftTone='ok'; }
    else if(v2<180&&ratio<2){ graft='Faixa de baixo risco'; graftTone='ok'; }

    let angioplasty='Critérios discordantes', angioplastyTone='warn';
    if(v2>300&&ratio>3.5){ angioplasty='Estenose > 70%'; angioplastyTone='ok'; }
    else if(v2>=180&&v2<=300&&ratio>=2&&ratio<=3.5){ angioplasty='Estenose > 50%'; angioplastyTone='ok'; }
    else if(v2<180&&ratio<2){ angioplasty='Estenose < 50%'; angioplastyTone='ok'; }

    let stent='Critérios discordantes', stentTone='warn';
    if(v2>=275&&ratio>=3.5){ stent='Reestenose ≥ 80%'; stentTone='ok'; }
    else if(v2>=190&&ratio>=1.5){ stent='Reestenose ≥ 50%'; stentTone='ok'; }
    else if(v2<190&&ratio<1.5){ stent='Abaixo dos limiares de 50%'; stentTone='ok'; }

    renderReferenceCalc(`<div class="refcalc-result ok">
      <div class="refcalc-result-kicker">Cálculo comum</div>
      <div class="refcalc-result-title">Razão ${esc(calcFmt(ratio,2))}</div>
      <div class="refcalc-metrics">${calcMetricHTML('VPS no segmento',calcFmt(v2,0)+' cm/s')}${calcMetricHTML('VPS segmento / proximal',calcFmt(ratio,2))}</div>
    </div>
    ${calcSourceResultHTML('Enxerto venoso infrainguinal — SVS 2018',graft,'Velocidade global do enxerto e variação do ITB completam a estratificação.',graftTone)}
    ${calcSourceResultHTML('Angioplastia femoropoplítea — UCSD / SVS 2018',angioplasty,'Use somente para o sítio e o segmento correspondentes.',angioplastyTone)}
    ${calcSourceResultHTML('Stent da artéria femoral superficial — Baril et al. 2009',stent,'Critérios validados especificamente para stent na AFS.',stentTone)}`);
    return;
  }
  if(kind==='chart'){
    const value=calcNumber('chart-value');
    const ch=state.item&&state.item.chart;
    if(value===null||!ch||!ch.rows||!ch.rows.length){
      renderReferenceCalc(calcErrorHTML('Informe um valor válido.'));
      return;
    }
    const numericRows=ch.rows.map(row=>({row,value:parseFloat(String(row[0]).replace(',','.'))})).filter(x=>Number.isFinite(x.value));
    if(!numericRows.length){
      renderReferenceCalc(calcErrorHTML('Esta tabela não permite consulta numérica automática.'));
      return;
    }
    const match=numericRows.reduce((best,current)=>Math.abs(current.value-value)<Math.abs(best.value-value)?current:best);
    const header=ch.header||[];
    const metrics=match.row.map((cell,i)=>calcMetricHTML(header[i]||('Campo '+(i+1)),String(cell))).join('');
    renderReferenceCalc(`<div class="refcalc-result ok">
      <div class="refcalc-result-kicker">Linha mais próxima</div>
      <div class="refcalc-result-title">${esc(String(match.row[0]))}</div>
      <div class="refcalc-metrics">${metrics}</div>
    </div>`);
  }
}

/* ---- 4a. CALCULADORAS — lista ---- */
function calcViewHTML(){
  if(state.calcId === 'tfg') return calcTFGHTML();
  if(state.calcId === 'tirads') return calcTiradsHTML();
  if(state.calcId === 'orads') return calcOradsHTML();
  if(state.calcId === 'tri') return calcTrisomiasHTML();
  if(state.calcId === 'pe') return calcPreeclampsiaHTML();
  if(state.calcId === 'sga') return calcSgaHTML();
  if(state.calcId === 'gdm') return calcGdmHTML();
  if(state.calcId === 'ptb') return calcPtbHTML();
  if(typeof FETAL_CALC_MAP!=='undefined' && FETAL_CALC_MAP[state.calcId]) return fetalCalcHTML(state.calcId);
  return calcListHTML();
}
/* Catálogo de calculadoras por especialidade (mesmos ids de SPECIALTIES). */
const CALCS = [
  {id:'tirads', spec:'neurocab',  title:'TI-RADS',              desc:'Classificação de nódulos tireoidianos (ACR)', badge:'TR'},
];
/* Calculadoras gerais (Outras Ferramentas), fora da ultrassonografia. */
const GENERAL_CALCS = [
  {id:'tfg', title:'Taxa de Filtração Glomerular', desc:'Fórmula MDRD — estimativa da função renal'},
];
function calcCardHTML(c){
  const icon = c.badge
    ? `<div class="si acc" style="font-weight:800;font-size:13px;letter-spacing:-.01em">${esc(c.badge)}</div>`
    : `<div class="si acc">${svgIcon(P.calc,22)}</div>`;
  const isFav = state.favCalcs.indexOf(c.id)>=0;
  return `<div class="lc-short" onclick="openCalc('${esc(c.id)}')">
    ${icon}
    <div class="st">
      <div class="t">${esc(c.title)}</div>
      <div class="d">${esc(c.desc)}</div>
    </div>
    <div class="star-btn ${isFav?'on':''}" onclick="event.stopPropagation();toggleFavCalc('${esc(c.id)}')" aria-label="Favoritar">${svgIcon(P.star,20,{fill:isFav?'currentColor':'none'})}</div>
    <div class="chev">${svgIcon(P.chev,18,{sw:2})}</div>
  </div>`;
}
/* Todas as calculadoras (US + gerais) para busca por id. */
function allCalcs(){ return CALCS.concat(GENERAL_CALCS); }
function findCalc(id){ return allCalcs().find(c=>c.id===id); }
function toggleFavCalc(id){
  const i = state.favCalcs.indexOf(id);
  if(i<0) state.favCalcs.push(id); else state.favCalcs.splice(i,1);
  persist('radref_favcalcs', state.favCalcs);
  render(true);
}
function openFavCalc(id){
  const c = findCalc(id); if(!c) return;
  navPush();
  if(c.spec){ state.modalityId='us'; state.calcSpec=c.spec; }
  else { state.modalityId=null; }
  state.calcId=id; state.view='calc'; render();
}
function calcListHTML(){
  // Fora da ultrassonografia (Outras Ferramentas): calculadoras gerais.
  if(state.modalityId !== 'us'){
    const gerais = GENERAL_CALCS.length
      ? GENERAL_CALCS.map(c=>calcCardHTML(c)).join('')
      : `<div class="empty"><div class="msg">Nenhuma calculadora disponível ainda.</div></div>`;
    return `<div class="calc-list-wrap">
      <div class="calc-intro-lbl">Calculadoras disponíveis</div>
      ${gerais}
    </div>`;
  }
  const specChips = SPECIALTIES.map(s=>
    `<div class="chip ${state.calcSpec===s.id?'on':''}" onclick="setCalcSpec('${s.id}')">${esc(s.name)}</div>`
  ).join('');
  const items = CALCS.filter(c=>c.spec===state.calcSpec);
  const cards = items.length ? items.map(c=>calcCardHTML(c)).join('')
  : `<div class="empty"><div class="msg">Ainda não há calculadoras nesta especialidade.</div></div>`;
  return `<div class="calc-list-wrap">
    <div class="sec-label spec-label">Especialidades</div>
    <div class="bandzone">
      <div class="bandrow" id="bandrow">${specChips}</div>
      <div class="band-fade"><div class="band-arrow" onclick="scrollBandMore()">»</div></div>
    </div>
    <div class="calc-intro-lbl">Calculadoras disponíveis</div>
    ${cards}
  </div>`;
}
function setCalcSpec(id){ state.calcSpec=id; render(); }

/* ---- 4b. TFG (MDRD) com drum picker ---- */
function drumHTML(id, values, selected){
  const items = values.map(v=>`<div class="drum-item">${esc(v)}</div>`).join('');
  return `<div class="drum-shell">
    <div class="drum-sel"></div>
    <div class="drum-scroller" id="drum-${id}" onscroll="onDrumScroll('${id}',this)">
      <div class="drum-pad"></div>
      ${items}
      <div class="drum-pad"></div>
    </div>
    <div class="drum-fade-top"></div>
    <div class="drum-fade-bot"></div>
  </div>`;
}
function calcTFGHTML(){
  const sexo = state.tfgSexo;
  return `<div class="tfg-wrap">
    <div class="tfg-card">
      <div class="tfg-sec-lbl">Dados do Paciente</div>
      <div class="drum-row">
        <div class="drum-col">
          <div class="drum-label">Creatinina</div>
          ${drumHTML('cr', CR_VALUES, state.tfgCr)}
          <div class="drum-unit">mg/dL</div>
        </div>
        <div class="drum-col">
          <div class="drum-label">Idade</div>
          ${drumHTML('age', AGE_VALUES, state.tfgAge)}
          <div class="drum-unit">anos</div>
        </div>
      </div>
      <div class="tfg-field">
        <div class="tfg-field-lbl">Sexo</div>
        <div class="tfg-toggle">
          <div class="tfg-opt ${sexo==='M'?'on':''}" onclick="state.tfgSexo='M';render();setTimeout(autoCalcTFG,180)">Masculino</div>
          <div class="tfg-opt ${sexo==='F'?'on':''}" onclick="state.tfgSexo='F';render();setTimeout(autoCalcTFG,180)">Feminino</div>
        </div>
      </div>
    </div>
    <div id="tfg-result-area">${tfgResultHTML(state.tfgResult)}</div>
    <div class="tfg-card">
      <div class="tfg-sec-lbl">Fórmula MDRD</div>
      <div class="tfg-formula">TFG = 175 × Cr⁻¹·¹⁵⁴ × Idade⁻⁰·²⁰³ × (0,742 se Feminino)
        <small>Resultado em mL/min/1,73 m² — sem ajuste étnico (Vyas et al. 2020)</small>
      </div>
    </div>
    <div class="tfg-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${TFG_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* =========================================================================
   TI-RADS — classificação de nódulos tireoidianos (ACR TI-RADS 2017).
   Multi-nódulo numa sessão. Pontuação aditiva; os focos ecogênicos somam
   todos os tipos presentes. Estado em state.tirads (sessão, sem persistência).
   Ref.: Tessler FN et al. J Am Coll Radiol. 2017;14(5):587-595.
   ========================================================================= */
const TIRADS_CATS = {
  comp:  {label:'Composição',    opts:[['Cístico',0],['Espongiforme',0],['Misto cístico-sólido',1],['Sólido',2]]},
  echo:  {label:'Ecogenicidade', opts:[['Anecoico',0],['Hiper / isoecoico',1],['Hipoecoico',2],['Muito hipoecoico',3]]},
  shape: {label:'Formato',       opts:[['Mais largo que alto',0],['Mais alto que largo',3]]},
  margin:{label:'Margens',       opts:[['Regular / lisa',0],['Mal definida',0],['Lobulada / irregular',2],['Ext. extratireoidiana',3]]},
};
const TIRADS_FOCI = [['Nenhum / cauda de cometa',0,'Nenhum'],['Macrocalcificações',1,'Macrocalc.'],['Calcificação periférica',2,'Calc. perif.'],['Focos puntiformes',3,'Puntiformes']];
const TIRADS_TRC = {
  1:{c:'#138a5b',bg:'#138a5b22',name:'Benigno'},
  2:{c:'#3f8c1f',bg:'#3f8c1f22',name:'Não suspeito'},
  3:{c:'#a9790a',bg:'#a9790a22',name:'Levemente suspeito'},
  4:{c:'#d9540a',bg:'#d9540a22',name:'Moderadamente suspeito'},
  5:{c:'#cf2020',bg:'#cf202022',name:'Altamente suspeito'},
};
const TIRADS_THR = {1:null,2:null,3:{fna:2.5,fu:1.5},4:{fna:1.5,fu:1.0},5:{fna:1.0,fu:0.5}};
const TIRADS_REFS = [
  'Tessler FN, Middleton WD, Grant EG, et al. ACR Thyroid Imaging, Reporting and Data System (TI-RADS): White Paper of the ACR TI-RADS Committee. J Am Coll Radiol. 2017;14(5):587–595.',
  'Grant EG, Tessler FN, Hoang JK, et al. Thyroid Ultrasound Reporting Lexicon: White Paper of the ACR TI-RADS Committee. J Am Coll Radiol. 2015;12(12 Pt A):1272–1279.',
];

function tiradsNewNodule(){ return {comp:null,echo:null,shape:null,margin:null,foci:[0],size:'',name:''}; }
function tiradsState(){ if(!state.tirads) state.tirads={nodules:[tiradsNewNodule()]}; return state.tirads; }
function tiradsTrLevel(p){ if(p<=0)return 1; if(p<=2)return 2; if(p===3)return 3; if(p<=6)return 4; return 5; }
function tiradsFociPts(arr){ return (arr||[]).reduce((a,i)=>a+TIRADS_FOCI[i][1],0); }
function tiradsEval(n){
  let pts=0, filled=0;
  ['comp','echo','shape','margin'].forEach(k=>{ if(n[k]!=null){ pts+=TIRADS_CATS[k].opts[n[k]][1]; filled++; } });
  pts += tiradsFociPts(n.foci);
  const auto = (n.comp===0 || n.comp===1);
  return { pts, tr: auto?1:tiradsTrLevel(pts), auto, complete: filled===4 };
}
function tiradsCm(v){ return String(v).replace('.',',')+' cm'; }
function tiradsRec(tr,size,auto){
  const t=TIRADS_THR[tr]; const s=parseFloat(String(size).replace(',','.'));
  if(!t) return {a:auto?'Cístico / espongiforme → TR1':'Conduta benigna', b:'Sem PAAF · sem seguimento'};
  if(!s||isNaN(s)) return {a:'Informe o tamanho', b:`PAAF ≥ ${tiradsCm(t.fna)} · seguimento ≥ ${tiradsCm(t.fu)}`};
  if(s>=t.fna) return {a:'PAAF recomendada', b:`${tiradsCm(s)} ≥ limiar de ${tiradsCm(t.fna)}`};
  if(s>=t.fu)  return {a:'Seguimento ecográfico', b:`abaixo do limiar de PAAF (${tiradsCm(t.fna)})`};
  return {a:'Sem conduta adicional', b:`abaixo do limiar de seguimento (${tiradsCm(t.fu)})`};
}
function calcTiradsHTML(){
  const ts=tiradsState();
  const cards = tiradsCardHTML(ts.nodules[0], 0);

  const legend = Object.keys(TIRADS_TRC).map(k=>{
    const tc=TIRADS_TRC[k]; const thr=TIRADS_THR[k];
    const cond = thr ? `${t('PAAF ≥')} ${tiradsCm(thr.fna)} · ${t('seguir ≥')} ${tiradsCm(thr.fu)}` : t('Sem PAAF / seguimento');
    return `<div class="ti-legend-row"><span class="lk" style="background:${tc.c}">TR${k}</span><span class="lt">${esc(t(tc.name))} — ${cond}</span></div>`;
  }).join('');

  return `<div class="ti-wrap">
    <div id="ti-list">${cards}</div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Níveis e conduta (por maior eixo)</div>
      <div class="ti-legend">${legend}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${TIRADS_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
    <div class="disc"><b>Ferramenta educacional baseada no ACR TI-RADS 2017. Os focos ecogênicos somam todos os tipos presentes. Não substitui o julgamento clínico.</b></div>
  </div>`;
}

function tiradsCardHTML(n,i){
  const ts=tiradsState(); const ns=ts.nodules; const ev=tiradsEval(n);
  const show=ev.complete||ev.auto; const tc=TIRADS_TRC[ev.tr];
  let fields='';
  ['comp','echo','shape','margin'].forEach(key=>{
    const c=TIRADS_CATS[key]; const cur=n[key];
    const openDD = ts.open===(i+':'+key);
    const valTxt = cur!=null ? (c.opts[cur][0]+' · '+c.opts[cur][1]+' pt') : 'Selecionar…';
    const ptv = cur!=null ? c.opts[cur][1] : '–';
    let menu='';
    if(openDD){
      let rows = `<div class="ti-dd-opt clear" onclick="tiradsPickOpt(${i},'${key}','')">Selecionar…</div>`;
      c.opts.forEach((o,oi)=>{ rows += `<div class="ti-dd-opt ${cur===oi?'on':''}" onclick="tiradsPickOpt(${i},'${key}',${oi})"><span class="ol">${esc(o[0])}</span><span class="op">${o[1]} pt</span></div>`; });
      menu = `<div class="ti-dd-menu">${rows}</div>`;
    }
    fields += `<div class="ti-field ti-field-dd">
      <label>${esc(c.label)}</label>
      <div class="ti-dd">
        <div class="ti-dd-trigger ${openDD?'open':''} ${cur==null?'empty':''}" onclick="tiradsToggleDD(${i},'${key}')"><span class="ddv">${esc(valTxt)}</span><span class="ddc">⌄</span></div>
        ${menu}
      </div>
      <div class="ti-fp">${ptv}</div>
    </div>`;
  });
  const fpts = tiradsFociPts(n.foci);
  const fociChips = TIRADS_FOCI.map((o,oi)=>{
    const on=(n.foci||[]).indexOf(oi)>=0;
    return `<div class="ti-ftog ${on?'on':''}" onclick="tiradsToggleFoci(${i},${oi})">${esc(o[2])}<span class="n">${o[1]}</span></div>`;
  }).join('');
  const fociField = `<div class="ti-field ti-field-foci">
    <label>Focos<br>ecogênicos</label>
    <div class="ti-foci">${fociChips}</div>
    <div class="ti-fp">${fpts}</div>
  </div>`;
  const sizeField = `<div class="ti-field">
    <label>Maior eixo</label>
    <div class="ti-szwrap"><div class="ti-szf"><input type="number" inputmode="decimal" step="0.1" placeholder="0,0" value="${esc(n.size)}" oninput="tiradsSetSize(${i},this.value)"><span>cm</span></div></div>
  </div>`;
  let result='';
  if(show){ const r=tiradsRec(ev.tr,n.size,ev.auto);
    result = `<div class="ti-res" style="background:${tc.bg}">
      <div class="lv" style="color:${tc.c}">TR${ev.tr}</div>
      <div class="meta"><div class="a">${esc(r.a)}</div><div class="b">${esc(r.b)}</div></div>
      <div class="pts" style="background:${tc.c}">${ev.pts} pt${ev.pts!==1?'s':''}</div>
    </div>`;
  }
  return `<div class="ti-card2" id="ti-card-${i}">
    <div class="ti-stripe" style="background:${show?tc.c:'var(--line)'}"></div>
    <div class="ti-grid">${fields}${fociField}${sizeField}</div>
    ${result}
  </div>`;
}

function tiradsRerender(){ const s=$('scroll'); if(!s) return; const top=s.scrollTop; s.innerHTML=translateHTML(calcTiradsHTML()); s.scrollTop=top; }
function tiradsToggleDD(i,key){ const ts=tiradsState(); const id=i+':'+key; ts.open = ts.open===id ? null : id; tiradsRerender(); }
function tiradsPickOpt(i,key,oi){ const ts=tiradsState(); ts.nodules[i][key] = (oi===''?null:parseInt(oi,10)); ts.open=null; tiradsRerender(); }
function tiradsToggleFoci(i,oi){
  const ts=tiradsState(); const n=ts.nodules[i]; let f=(n.foci||[]).slice();
  if(oi===0){ f=[0]; }
  else{ f=f.filter(x=>x!==0); const p=f.indexOf(oi); if(p>=0) f.splice(p,1); else f.push(oi); if(!f.length) f=[0]; }
  f.sort((a,b)=>a-b); n.foci=f; ts.open=null; tiradsRerender();
}
function tiradsSetSize(i,val){
  const ts=tiradsState(); const n=ts.nodules[i]; n.size=val; const ev=tiradsEval(n);
  if(!(ev.complete||ev.auto)) return;
  const r=tiradsRec(ev.tr,val,ev.auto); const card=$('ti-card-'+i); if(!card) return;
  const res=card.querySelector('.ti-res'); if(res){ const a=res.querySelector('.a'),b=res.querySelector('.b'); if(a)a.textContent=r.a; if(b)b.textContent=r.b; }
}

/* ---- 5. FAVORITOS ---- */
function favHTML(){
  const refs = state.favs.map(id=>DATA.find(d=>d.id===id)).filter(Boolean);
  const calcs = state.favCalcs.map(id=>findCalc(id)).filter(Boolean);
  if(!refs.length && !calcs.length){
    return `<div class="empty">
      <div class="ico" style="color:var(--star)">${svgIcon(P.star,46,{sw:1.4})}</div>
      <div class="msg" style="font-size:16px;font-weight:650;color:var(--tx)">Nada favoritado ainda</div>
      <div class="msg" style="margin-top:6px">Toque na estrela ★ de qualquer referência ou calculadora para guardá-la aqui.</div>
    </div>`;
  }
  let h = '';
  if(calcs.length){
    h += `<div class="grp">Calculadoras</div>`;
    h += calcs.map(c=>`<div class="row" onclick="openFavCalc('${esc(c.id)}')">
      <div class="ic star">${svgIcon(P.calc,19)}</div>
      <div class="tx"><div class="nm">${esc(c.title)}</div><div class="meta">${esc(c.desc)}</div></div>
      <div class="star-btn on" onclick="event.stopPropagation();toggleFavCalc('${esc(c.id)}')">${svgIcon(P.star,20,{fill:'currentColor'})}</div>
    </div>`).join('');
  }
  if(refs.length){
    h += `<div class="grp">Referências</div>`;
    h += refs.map(d=>`<div class="row" onclick="openItem('${esc(d.id)}')">
      <div class="ic star">${svgIcon(P.star,19,{fill:'currentColor',noStroke:true})}</div>
      <div class="tx"><div class="nm">${esc(d.name)}</div><div class="meta">${esc(metaOf(d))}</div></div>
      <div class="star-btn on" onclick="event.stopPropagation();toggleFav('${esc(d.id)}')">${svgIcon(P.star,20,{fill:'currentColor'})}</div>
    </div>`).join('');
  }
  return h;
}

/* ---- 6.5 EM CONSTRUÇÃO ---- */
function constructionHTML(){
  const m = MODALITIES.find(x=>x.id===state.modalityId)||{};
  return `<div class="constr-screen">
    <div class="constr-icon">${svgIcon(m.icon||'<circle cx="12" cy="12" r="8"/>',40)}</div>
    <div class="constr-name">${esc(m.name||'')}</div>
    <div class="constr-sub">Este módulo está em desenvolvimento e estará disponível em breve.</div>
    <div class="constr-badge">Em construção</div>
  </div>`;
}

/* ---- 6. NOVA LISTA ---- */
function listsHTML(){
  if(state.composingId){
    const cl = state.lists.find(x=>x.id===state.composingId) || {id:state.composingId, items:[]};
    const inIds = cl.items;
    const itemsIn = inIds.map(id=>DATA.find(d=>d.id===id)).filter(Boolean);
    let h='';
    if(itemsIn.length){
      h += itemsIn.map(d=>`<div class="row" onclick="openItem('${esc(d.id)}')">
        <div class="ic">${d.icon||ICONS.organ}</div>
        <div class="tx"><div class="nm">${esc(d.name)}</div><div class="meta">${esc(metaOf(d))}</div></div>
        <div class="star-btn" onclick="event.stopPropagation();toggleInList('${cl.id}','${esc(d.id)}')">${svgIcon(P.minus,18,{sw:2})}</div>
      </div>`).join('');
    } else {
      h += `<div class="compose-empty">Lista vazia. Adicione referências abaixo.</div>`;
    }
    h += `<div class="pick-label">Adicionar referências</div>`;
    h += DATA.map(d=>{
      const inside = inIds.indexOf(d.id)>=0;
      return `<div class="pick-row" onclick="toggleInList('${cl.id}','${esc(d.id)}')">
        <div class="pick-box ${inside?'on':''}">${inside?'✓':''}</div>
        <div class="tx" style="flex:1;min-width:0"><div class="nm">${esc(d.name)}</div><div class="meta">${esc(metaOf(d))}</div></div>
      </div>`;
    }).join('');
    h += `<div style="height:20px"></div>`;
    return h;
  }

  let h = `<div class="create">
    <div class="create-bar">
      <input id="newname" value="${esc(state.newName)}" oninput="onNewName(this.value)" placeholder="Nome da lista (ex.: Plantão tireoide)">
      <button onclick="createList()">Criar</button>
    </div>
    <div class="create-hint">Monte um pacote com as referências e calculadoras que você mais usa, como uma playlist.</div>
  </div>`;
  if(state.lists.length){
    h += `<div class="lists">`+state.lists.map(l=>`<div class="list-card" onclick="openCompose('${l.id}')">
      <div class="li">${svgIcon(P.listplus,22)}</div>
      <div class="tx" style="flex:1;min-width:0"><div class="nm">${esc(l.name)}</div><div class="cnt">${l.items.length} ${l.items.length===1?'item':'itens'}</div></div>
      <div class="del" onclick="event.stopPropagation();delList('${l.id}')">${svgIcon(P.trash,18,{sw:1.8})}</div>
    </div>`).join('')+`</div>`;
  } else {
    h += `<div class="empty"><div class="ico" style="color:var(--accent)">${svgIcon(P.listplus,44,{sw:1.4})}</div><div class="msg">Crie sua primeira lista acima.</div></div>`;
  }
  return h;
}

/* =========================================================================
   AÇÕES
   ========================================================================= */
/* ---- Navegação: pilha de telas, para o Voltar sempre desfazer o último passo ---- */
const NAV_KEYS = ['view','calcId','calcSpec','modalityId','item','sub','composingId','specialty','subBand','query'];
function navSnapshot(){ const s={}; NAV_KEYS.forEach(k=>s[k]=state[k]); return s; }
function navPush(){
  state.nav.push(navSnapshot());
  if(state.nav.length>40) state.nav.shift();
}
function setView(v){
  navPush();
  state.view=v; state.composingId=null; if(v!=='calc') state.calcId=null;
  render();
}
function goBack(){
  const prev = state.nav.pop();
  if(prev){ NAV_KEYS.forEach(k=>state[k]=prev[k]); render(); return; }
  state.view='modality'; render();  // fallback: tela inicial
}
function setSpecialty(id){ state.specialty=id; render(); }
function setSubBand(b){ state.subBand=b; render(); }
function onSearch(v){ state.query=v; const el=$('reflist'); if(el) el.innerHTML=refsListHTML(); }
function scrollBandMore(){ const el=$('bandrow'); if(el) el.scrollBy({left:170, behavior:'smooth'}); }

function openItem(id){
  const d = DATA.find(x=>x.id===id); if(!d) return;
  navPush();
  state.item=d; state.view='detail'; state.sub='tabela'; render();
}
function openCalc(id){ navPush(); state.calcId=id; render(); }
/* Limpa a calculadora aberta. As fetais não guardam estado: o render()
   recria os campos vazios e some com o resultado. */
function resetCalc(){
  if(state.calcId==='tirads') state.tirads=null;
  else if(state.calcId==='orads') state.orads=null;
  else if(state.calcId==='pe') state.pe=null;
  else if(state.calcId==='sga') state.sga=null;
  else if(state.calcId==='gdm') state.gdm=null;
  else if(state.calcId==='ptb') state.ptb=null;
  else if(state.calcId==='tfg'){
    state.tfgCr='1.0'; state.tfgAge='45'; state.tfgSexo='M'; state.tfgResult=null;
  }
  render();
}
function openGeneralCalcs(){ navPush(); state.modalityId=null; state.calcId=null; state.view='calc'; render(); }
function setSub(s){ state.sub=s; render(); }
function toggleAcc(bodyId, chevId){
  const b = $(bodyId); if(!b) return;
  const open = b.classList.toggle('open');
  const c = $(chevId); if(c) c.textContent = open ? '⌃' : '⌄';
}
function toggleTableAcc(bodyId,chevId,button){
  const b=$(bodyId); if(!b) return;
  const open=b.classList.toggle('open');
  const c=$(chevId); if(c) c.textContent=open?'⌃':'⌄';
  if(button) button.setAttribute('aria-expanded',open?'true':'false');
}
function onDrumScroll(id, el){
  const ITEM_H = 44;
  const idx = Math.round(el.scrollTop / ITEM_H);
  if(id==='cr'){ state.tfgCr = CR_VALUES[Math.max(0,Math.min(idx,CR_VALUES.length-1))]; }
  else if(id==='age'){ state.tfgAge = AGE_VALUES[Math.max(0,Math.min(idx,AGE_VALUES.length-1))]; }
  clearTimeout(_tfgTimer);
  _tfgTimer = setTimeout(autoCalcTFG, 350);
}
function autoCalcTFG(){
  const ITEM_H = 44;
  const crEl = document.getElementById('drum-cr');
  const ageEl = document.getElementById('drum-age');
  if(crEl){ const i=Math.round(crEl.scrollTop/ITEM_H); state.tfgCr=CR_VALUES[Math.max(0,Math.min(i,CR_VALUES.length-1))]; }
  if(ageEl){ const i=Math.round(ageEl.scrollTop/ITEM_H); state.tfgAge=AGE_VALUES[Math.max(0,Math.min(i,AGE_VALUES.length-1))]; }
  const cr=parseFloat(state.tfgCr), age=parseInt(state.tfgAge);
  if(isNaN(cr)||cr<=0||isNaN(age)||age<=0) return;
  let tfg = 175 * Math.pow(cr,-1.154) * Math.pow(age,-0.203);
  if(state.tfgSexo==='F') tfg *= 0.742;
  state.tfgResult = tfg;
  const el = document.getElementById('tfg-result-area');
  if(el) el.innerHTML = tfgResultHTML(tfg);
}
function initDrums(){
  const ITEM_H = 44;
  const crEl = document.getElementById('drum-cr');
  if(crEl){ crEl.scrollTop = Math.max(0, CR_VALUES.indexOf(state.tfgCr)) * ITEM_H; }
  const ageEl = document.getElementById('drum-age');
  if(ageEl){ ageEl.scrollTop = Math.max(0, AGE_VALUES.indexOf(state.tfgAge)) * ITEM_H; }
  clearTimeout(_tfgTimer);
  _tfgTimer = setTimeout(autoCalcTFG, 400);
}
function calcTFG(){ autoCalcTFG(); }
function openModality(id){
  const m = MODALITIES.find(x=>x.id===id); if(!m) return;
  navPush();
  state.modalityId=id;
  state.view = m.active ? 'home' : 'construction';
  render();
}

function toggleFav(id){
  const i = state.favs.indexOf(id);
  if(i<0) state.favs.push(id); else state.favs.splice(i,1);
  persist('radref_favs', state.favs);
  if(state.view==='refs'){ const el=$('reflist'); if(el) el.innerHTML=refsListHTML(); }
  else if(state.view==='detail'){ renderHeader(); }
  else render(true);   // favoritos: item entra/sai da lista
}

function onNewName(v){ state.newName=v; }   // sem render: preserva foco do input
function createList(){
  const n = (state.newName||'').trim(); if(!n) return;
  state.lists.push({id:'l'+Date.now(), name:n, items:[]});
  state.newName='';
  persist('radref_lists', state.lists);
  render(true);
}
function delList(id){
  state.lists = state.lists.filter(x=>x.id!==id);
  persist('radref_lists', state.lists);
  render(true);
}
function openCompose(id){ navPush(); state.composingId=id; render(); }
function toggleInList(listId, itemId){
  const l = state.lists.find(x=>x.id===listId); if(!l) return;
  const i = l.items.indexOf(itemId);
  if(i<0) l.items.push(itemId); else l.items.splice(i,1);
  persist('radref_lists', state.lists);
  render(true);
}

/* ---- BOOT ---- */
// Modo ESTÁTICO/ABERTO (padrão do relançamento): sem login e sem backend.
// O conteúdo já está em memória (window.SEED via initialData), então é só
// carregar as preferências e montar a tela.
if(window.CONFIG && CONFIG.STATIC_MODE){
  loadState();
  // No desktop, abre direto no guia (referências) — a sidebar é a navegação.
  // No celular, mantém a tela inicial de modalidades.
  if(state.termsAccepted && window.matchMedia && window.matchMedia('(min-width:900px)').matches){
    state.view='refs';
  }
  render();
} else
// (fase 2) /app como área com login: a sessão é conferida ANTES de montar a
// tela — renderizar antes mostraria a casca a quem não tem acesso.
KlugSessao.exigir().then(function(sessao){
  if(!sessao) return;                                  // já redirecionou para /login
  loadState();
  if(sessao.erro === 'offline'){ mostrarSemConexao(); return; }
  state.user = sessao.user || null;                    // liga a area de Conta na sessao real
  render();
  syncData();
  // Assume a sessão para este aparelho (derrubando qualquer outro) e passa
  // a vigiar. A ordem importa: assumir primeiro, senão a própria vigilância
  // veria "inexistente" e ficaria conferindo à toa.
  // Ao perder contato com o servidor, o app bloqueia a tela e apaga os
  // dados da memoria. Ficar mostrando o conteudo enquanto ninguem consegue
  // confirmar nada era a brecha que permitia usar a mesma conta em varios
  // aparelhos: bastava abrir e desligar a internet.
  // 1-aparelho-por-vez era proteção de conteúdo pago. No modelo grátis vira
  // atrito (o celular derrubaria o desktop da mesma pessoa), então fica atrás
  // de um flag, DESLIGADO por padrão. Para religar (ex.: se voltar a cobrar),
  // defina CONFIG.UM_APARELHO_POR_VEZ = true em js/config.js.
  if(window.CONFIG && CONFIG.UM_APARELHO_POR_VEZ){
    KlugSessao.assumirAparelho().then(function(){
      KlugSessao.vigiarAparelho(function(){
        DATA = [];
        mostrarSemConexao();
      });
    });
  }
  carregarDadosDaConta();
});
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{})); }
