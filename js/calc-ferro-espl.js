/* =========================================================================
   KlugRads — Ferro Esplênico por R2* (RM)
   ---------------------------------------------------------------------------
   Método: RM · Subespecialidade: Fígado.
   Seletor de campo magnético (1,5 T / 3,0 T). A partir do R2* do baço (s⁻¹ = Hz),
   classifica o resultado em relação ao limiar de normalidade do campo e mostra o
   T2* (ms) correspondente.

   Limiares (R2* esplênico):
     1,5 T:  normal < 70 s⁻¹ · ≥ 100 s⁻¹ = patológico
             (Henninger 2020, a partir da coorte saudável de Schwenzer 2008, 1,5 T:
              baço 8,8–69 s⁻¹, média 22,8 s⁻¹)
     3,0 T:  normal < 137 s⁻¹ (valor adotado pelo Konrado; NÃO consta nos artigos de
              referência — ver ESPL_NOTA_3T; o limite de 100 s⁻¹ só é descrito em 1,5 T)

   Não existe calibração que converta o R2* do baço em concentração de ferro
   tecidual (Henninger 2020) — por isso o resultado é uma classificação, sem mg/g.

   Reaproveita os auxiliares ferroNum / ferroR / ferroFmt de calc-ferro-r2.js
   (carregar DEPOIS dele). Segue o layout do Ferro Hepático (classes ti-*).
   Ferramenta educacional. Sem frase de laudo (a redação depende de aprovação dele).
   ========================================================================= */

const ESPL_LIM = {
  '15':{nome:'1,5 T', lim:70,  pat:100},
  '30':{nome:'3,0 T', lim:137, pat:null},
};
/* Nota exibida na tela sobre a origem do valor de 3,0 T (apagar quando houver fonte). */
const ESPL_NOTA_3T = 'O limiar de 3,0 T (137 s⁻¹) é o valor de referência adotado no KlugRads; não consta nos artigos listados abaixo.';

const ESPL_C = {
  0:{c:'#1f9d55', name:'Normal'},
  1:{c:'#e07a1f', name:'Acima do limiar'},
  2:{c:'#cf2020', name:'Patológico'},
};

const ESPL_REFS = [
  'Henninger B, Alustiza J, Garbowski M, Gandon Y. Practical guide to quantification of hepatic iron with MRI. Eur Radiol. 2020;30(1):383–393.',
  'Tipirneni-Sajja A, Shrestha U, Esparza J, et al. State-of-the-Art Quantification of Liver Iron With MRI — Vendor Implementation and Available Tools. J Magn Reson Imaging. 2025;61(3):1110–1132.',
  'Hernando D, Levin YS, Sirlin CB, Reeder SB. Quantification of liver iron with MRI: state of the art and remaining challenges. J Magn Reson Imaging. 2014;40(5):1003–1021.',
  'Schwenzer NF, Machann J, Haap MM, et al. T2* relaxometry in liver, pancreas, and spleen in a healthy cohort of one hundred twenty-nine subjects — correlation with age, gender, and serum ferritin. Invest Radiol. 2008;43(12):854–860.',
];

function esplState(){
  if(!state.ferroEspl) state.ferroEspl={campo:'15', r2:''};
  if(!state.ferroEspl.campo) state.ferroEspl.campo='15';
  return state.ferroEspl;
}
/* 0 = normal (< limiar) · 1 = acima do limiar · 2 = patológico (só definido em 1,5 T) */
function esplGrade(campo, v){
  const L = ESPL_LIM[campo];
  if(v < L.lim) return 0;
  if(L.pat!=null && v >= L.pat) return 2;
  return 1;
}

/* ---- UI ---- */
function esplField(s){
  return `<div class="ti-field">
    <label>R2* esplênico</label>
    <div class="ti-szwrap"><div class="ti-szf">
      <input type="text" inputmode="decimal" placeholder="ex.: 45" value="${esc(s.r2)}" oninput="esplSet(this.value)">
      <span>s⁻¹</span>
    </div></div>
  </div>`;
}

function esplResHTML(){
  const s = esplState();
  const v = ferroNum(s.r2);
  if(v==null || v<=0) return '';
  const L = ESPL_LIM[s.campo], g = ESPL_C[esplGrade(s.campo, v)];
  const t = ferroR(1000/v);
  const ref = `Referência (${L.nome}): normal &lt; ${L.lim} s⁻¹` + (L.pat!=null ? ` · patológico ≥ ${L.pat} s⁻¹` : '');
  return `<div class="ti-legend-row" style="margin-top:12px"><span class="lt">T2* (${L.nome}): <b>${ferroFmt(t)} ms</b></span></div>
    <div class="ti-res" style="background:${g.c}22;margin-top:10px">
      <div class="lv" style="color:${g.c}">${ferroFmt(ferroR(v))}</div>
      <div class="meta">
        <div class="a">R2* esplênico · ${esc(g.name)}</div>
        <div class="b">${ref}</div>
      </div>
      <div class="pts" style="background:${g.c}">s⁻¹</div>
    </div>`;
}

function calcFerroEsplHTML(){
  const s = esplState();
  const chip = (id,txt)=>`<div class="ti-ftog ${s.campo===id?'on':''}" onclick="esplSetCampo('${id}')">${esc(txt)}</div>`;
  const leg = (k,txt)=>`<div class="ti-legend-row"><span class="lk" style="background:${ESPL_C[k].c}"> </span><span class="lt"><b>${esc(ESPL_C[k].name)}</b> — ${txt}</span></div>`;
  return `<div class="ti-wrap">
    <div class="ti-card">
      <div class="tfg-sec-lbl">Campo magnético</div>
      <div class="ti-foci" style="margin-top:8px">${chip('15','1,5 T')}${chip('30','3,0 T')}</div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Selecione o campo do exame. O limiar de normalidade depende do campo.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">R2* esplênico (${ESPL_LIM[s.campo].nome})</div>
      <div class="ti-fields">${esplField(s)}</div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">Informe o R2* medido no baço (mesma técnica do fígado), em s⁻¹ (Hz).</span></div>
      <div id="espl-res">${esplResHTML()}</div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Valores de referência (R2* do baço)</div>
      <div class="ti-legend">
        ${leg(0,'1,5 T: &lt; 70 s⁻¹ · 3,0 T: &lt; 137 s⁻¹')}
        ${leg(1,'R2* ≥ 70 s⁻¹ (1,5 T) · ≥ 137 s⁻¹ (3,0 T)')}
        ${leg(2,'R2* ≥ 100 s⁻¹ (1,5 T) — patamar patológico descrito apenas para 1,5 T')}
      </div>
      <div class="ti-legend-row" style="margin-top:6px"><span class="lt">${esc(ESPL_NOTA_3T)}</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Como interpretar</div>
      <div class="tfg-ref-list">
        <div class="tfg-ref-item">Não há calibração que converta o R2* do baço em concentração de ferro tecidual; o valor é classificado em relação ao limiar, sem mg/g. T2* (ms) = 1000 ÷ R2* (s⁻¹).</div>
        <div class="tfg-ref-item">Baço normal com fígado de R2* elevado: padrão de depósito parenquimatoso (hemocromatose hereditária) — os órgãos do sistema reticuloendotelial (baço, medula, linfonodos) são relativamente poupados, exceto em sobrecargas muito graves.</div>
        <div class="tfg-ref-item">Baço com R2* elevado: depósito no sistema reticuloendotelial, típico da sobrecarga transfusional (hemossiderose transfusional).</div>
        <div class="tfg-ref-item">Faixa observada em 129 voluntários saudáveis a 1,5 T: 8,8–69 s⁻¹ (média 22,8 s⁻¹), medida com sequência multieco gradiente-eco.</div>
      </div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${ESPL_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* Troca de campo = re-render (muda o limiar). */
function esplSetCampo(id){ esplState().campo=id; render(true); }
/* Atualiza só o resultado enquanto digita (sem recriar o campo). */
function esplSet(v){ esplState().r2=v; esplRefresh(); }
function esplRefresh(){ const el=document.getElementById('espl-res'); if(el) el.innerHTML=translateHTML(esplResHTML()); }

/* registra no catálogo (CALCS de app.js) — método RM, subespecialidade Fígado */
CALCS.push({id:'ferro-espl', modality:'rm', subspec:'figado', badge:'Fe',
  title:'Ferro Esplênico (R2*)',
  desc:'Avaliação do ferro esplênico por R2* em relação ao limiar - 1,5T e 3,0T'});
