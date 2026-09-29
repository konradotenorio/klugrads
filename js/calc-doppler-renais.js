/* =========================================================================
   KlugRads — Estenose de Artéria Renal (Doppler, bilateral)
   ---------------------------------------------------------------------------
   Método: US · Especialidade: Doppler.
   Reaproveita o formulário e o cálculo de app.js (customCalculatorHTML /
   runReferenceCalculator 'renal-artery-stenosis' / renalArteryCalc):
     por lado — VPS >= 180/200 cm/s e RAR >= 3,5 -> >= 60%; VDF > 150 -> > 80%;
     TA >= 70 ms -> tardus-parvus; bilateral — diferença de IR > 0,05.
   Fontes: Granata et al. J Ultrasound 2009; StatPearls (NBK572135).
   Ferramenta educacional.
   ========================================================================= */

const RAS_REFS = [
  'Granata A, Fiorini F, Andrulli S, Logias F, Gallieni M, Romano G, Sicurezza E, Fiore CE. Doppler ultrasound and renal artery stenosis: An overview. J Ultrasound. 2009;12:133-143.',
  'Trunz LM, Balasubramanya R. Renal Doppler Ultrasonography. In: StatPearls. Treasure Island (FL): StatPearls Publishing; 2023.',
];

function calcDopplerRenaisHTML(){
  const form = customCalculatorHTML({kind:'renal-artery-stenosis', title:'Estenose de artéria renal',
    source:'Critérios diretos e intrarrenais — Granata 2009 / StatPearls'});
  return `<div class="ti-wrap">
    ${form}
    <div class="ti-card">
      <div class="tfg-sec-lbl">Critérios usados</div>
      <div class="ti-legend">
        <div class="ti-legend-row"><span class="lk" style="background:#1f9d55">N</span><span class="lt"><b>Sem critérios diretos</b>: VPS &lt; 180 cm/s e RAR &lt; 3,5</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#e07a1f">≥60</span><span class="lt"><b>Estenose ≥ 60%</b>: VPS ≥ 180–200 cm/s e RAR ≥ 3,5</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#cf2020">&gt;80</span><span class="lt"><b>Estenose &gt; 80%</b>: VDF &gt; 150 cm/s com VPS e/ou RAR elevadas</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#d9a520">TA</span><span class="lt"><b>Tardus-parvus</b>: TA intrarrenal ≥ 70 ms</span></div>
        <div class="ti-legend-row"><span class="lk" style="background:#d9a520">IR</span><span class="lt"><b>Assimetria</b>: diferença de IR entre os rins &gt; 0,05 (menor IR do lado estenótico)</span></div>
      </div>
      <div class="ti-legend-row" style="margin-top:8px"><span class="lt">RAR = VPS da artéria renal ÷ VPS da aorta no nível das renais. Ângulo Doppler sempre ≤ 60°.</span></div>
    </div>
    <div class="ti-card">
      <div class="tfg-sec-lbl">Referências</div>
      <div class="tfg-ref-list">${RAS_REFS.map(r=>`<div class="tfg-ref-item">${esc(r)}</div>`).join('')}</div>
    </div>
  </div>`;
}

/* registra no catálogo (CALCS de app.js) — US, especialidade Doppler */
CALCS.push({id:'doppler-renais', spec:'doppler', badge:'AR',
  title:'Estenose de Artéria Renal',
  desc:'Doppler bilateral — VPS, RAR, TA e IR (direito e esquerdo)'});
