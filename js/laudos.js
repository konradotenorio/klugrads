/* =========================================================================
   KlugRads — Laudos estruturados
   ---------------------------------------------------------------------------
   Área nova (ao lado do Visualizador DICOM). Métodos: Radiografia,
   Mamografia, Densitometria óssea, Ultrassonografia, TC e RM.
   Fase 1: estrutura de navegação; Ultrassonografia é o primeiro método a
   receber modelos. Os textos dos modelos são próprios do KlugRads.
   ========================================================================= */

const LAUDO_MODS = [
  {id:'rx',   nome:'Radiografia',               ativo:false},
  {id:'mmg',  nome:'Mamografia',                ativo:false},
  {id:'dmo',  nome:'Densitometria óssea',       ativo:false},
  {id:'us',   nome:'Ultrassonografia',          ativo:true},
  {id:'tc',   nome:'Tomografia computadorizada',ativo:false},
  {id:'rm',   nome:'Ressonância magnética',     ativo:false},
];
/* Modelos por método (preenchidos nas próximas etapas). */
const LAUDO_MODELOS = {
  us: [
    {id:'us-abdome-total', nome:'Abdome total (modo B)', pronto:false},
  ],
};

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
    <div class="disc"><b>Ferramenta de apoio. O laudo final é de responsabilidade do médico que o assina.</b></div>
  </div>`;
}

function laudoModHTML(){
  const m = laudoMod(state.laudoMod);
  if(!m || !m.ativo) return `<div class="calc-list-wrap"><div class="empty"><div class="msg">${esc(m?m.nome:'Método')} — modelos <b>em breve</b>.</div></div></div>`;
  const modelos = LAUDO_MODELOS[m.id] || [];
  const cards = modelos.length ? modelos.map(x=>`<div class="lc-short ${x.pronto?'':'locked'}">
      <div class="si acc">${svgIcon(P.laudo,22)}</div>
      <div class="st"><div class="t">${esc(x.nome)}</div><div class="d">${x.pronto?'Abrir modelo':'Em construção'}</div></div>
    </div>`).join('')
    : `<div class="empty"><div class="msg">Modelos <b>em breve</b>.</div></div>`;
  return `<div class="calc-list-wrap">
    <div class="calc-intro-lbl">Modelos — ${esc(m.nome)}</div>
    ${cards}
  </div>`;
}

function openLaudos(){ navPush(); state.view='laudos'; render(); }
function openLaudoMod(id){ navPush(); state.laudoMod=id; state.view='laudoMod'; render(); }
