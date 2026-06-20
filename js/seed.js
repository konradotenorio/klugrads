/* =========================================================================
   UltraRef — SEED de dados (fonte da verdade + fallback OFFLINE)
   ---------------------------------------------------------------------------
   Este array é:
     1) a cópia embarcada que faz o app funcionar SEM internet (PWA offline);
     2) a fonte usada para popular a tabela `referencias` no Supabase.
   O conteúdo aqui deve ser JSON-serializável (sem funções). As funções de
   cálculo ficam em app.js (CALC_FNS), ligadas a cada item pelo `id`.
   Os ícones ficam em app.js (ICONS), ligados pelo `iconKey`.
   ========================================================================= */
;(function (root) {
  root.SEED_DATA = [
  /* ====================== FETAL ====================== */
  {
    id:'fetal-sg', group:'Fetal', region:'1º Trimestre', name:'Saco Gestacional', abbr:'SG', iconKey:'drop',
    age:'Fetal — 1º trimestre',
    table:{cols:['Estrutura','Achado esperado'],rows:[
      ['Visível à USG TV','a partir de SG médio ~2–3 mm (≈4,5–5 sem)'],
      ['Vesícula vitelínica presente','SG médio ≥ 8–10 mm'],
      ['Embrião com BCF presente','SG médio ≥ 16–25 mm'],
      ['Crescimento normal','~1,1 mm/dia no diâmetro médio'],
    ]},
    note:'Diâmetro médio do SG = média dos 3 diâmetros ortogonais. SG médio ≥ 25 mm sem embrião sugere gestação anembrionada.',
    exam:{points:[
      'Avaliar implantação, forma e contorno do saco gestacional.',
      'Pesquisar vesícula vitelínica e eco embrionário.',
      'Sinal do duplo saco decidual / sinal intradecidual apoiam tópica.',
    ],prep:'Bexiga moderadamente cheia (via abdominal) ou vazia (via transvaginal).',
     position:'Decúbito dorsal.',
     technique:'Via transvaginal (5–9 MHz) é preferencial no 1º trimestre pela maior resolução.'},
    refs:[
      'Doubilet PM, et al. Diagnostic criteria for nonviable pregnancy early in the first trimester. <i>N Engl J Med</i>. 2013;369(15):1443-1451.',
      'Hadlock FP, et al. Sonography of early pregnancy. <i>Radiology</i>. 1990;176(1):71-74.',
    ]
  },
  {
    id:'fetal-vv', group:'Fetal', region:'1º Trimestre', name:'Vesícula Vitelínica', abbr:'VV', iconKey:'drop',
    age:'Fetal — 1º trimestre',
    meas:[
      ['Diâmetro normal','3 – 5 mm'],
      ['Limite superior','< 6 mm'],
      ['Visível a partir de','SG médio ≥ 8–10 mm'],
    ],
    note:'VV > 6 mm ou ausente/calcificada associa-se a maior risco de perda gestacional. Deve ser arredondada, anecoica e de parede fina.',
    refs:[
      'Berdahl DM, et al. Yolk sac diameter and pregnancy outcome. <i>Fertil Steril</i>. 2010;94(4):1535-1537.',
    ]
  },
  {
    id:'fetal-ccn', group:'Fetal', region:'1º Trimestre', name:'Comprimento Cabeça-Nádega', abbr:'CCN', iconKey:'baby',
    age:'Fetal — 1º trimestre',
    calc:{ label:'CCN', unit:'mm', input:'ccn' },
    note:'Método mais acurado para datar a gestação entre 7 e 13s6d. Medir corte sagital mediano, feto em posição neutra, calipers nas extremidades cefálica e caudal.',
    refs:[
      'Robinson HP, Fleming JEE. A critical evaluation of sonar crown-rump length measurements. <i>BJOG</i>. 1975;82(9):702-710.',
      'Papageorghiou AT, et al. INTERGROWTH-21st crown-rump length standards. <i>Ultrasound Obstet Gynecol</i>. 2014;44(6):641-648.',
    ]
  },
  {
    id:'fetal-fce', group:'Fetal', region:'1º Trimestre', name:'Frequência Cardíaca Embrionária', abbr:'FCE', iconKey:'heart',
    age:'Fetal — 1º trimestre',
    table:{cols:['Idade / CCN','FC esperada (bpm)'],rows:[
      ['CCN < 5 mm (~6 sem)','100 – 115'],
      ['CCN 5–9 mm (~6–7 sem)','120 – 150'],
      ['CCN ≥ 10 mm (~8–9 sem)','150 – 170'],
      ['≥ 9 semanas','140 – 170'],
    ]},
    note:'Bradicardia < 100 bpm antes de 6s3d ou < 110 bpm associa-se a pior prognóstico. Medir com Doppler em modo M (evitar Doppler espectral no 1º tri).',
    refs:[
      'Doubilet PM, Benson CB. Embryonic heart rate in the early first trimester. <i>J Ultrasound Med</i>. 2005;24(6):825-830.',
    ]
  },
  {
    id:'fetal-tn', group:'Fetal', region:'1º Trimestre', name:'Translucência Nucal', abbr:'TN', iconKey:'baby',
    age:'Fetal — 1º trimestre',
    tnTable:true,
    calc:{label:'CCN', unit:'mm', input:'ccn', tn:true},
    exam:{points:[
      'Idade gestacional ótima: 11s0d a 13s6d.',
      'CCN mínimo 45 mm e máximo 84 mm.',
    ],prep:'—',position:'—',
     technique:'Corte longitudinal mediano, feto em posição neutra. Apenas cabeça e tórax superior na imagem, com ampliação máxima (cada incremento do caliper = 0,1 mm). Medir a maior espessura entre pele e tecido subcutâneo sobre a coluna cervical; calipers on-to-on sobre as linhas. Realizar mais de uma medida e usar a maior.'},
    refs:[
      'Nicolaides KH, et al. Fetal nuchal translucency: ultrasound screening for chromosomal defects in first trimester. <i>BMJ</i>. 1992;304:867-869.',
      'Snijders RJM, et al. UK multicentre project on assessment of risk of trisomy 21 by NT. <i>Lancet</i>. 1998;352:343-346.',
    ]
  },
  {
    id:'fetal-dbp-cc', group:'Fetal', region:'2º e 3º Trimestres', name:'Diâmetro Biparietal e Circunferência Cefálica', abbr:'DBP / CC', iconKey:'head',
    age:'Fetal — 2º/3º trimestres',
    note:'Medir em corte axial transtalâmico (tálamos e cavo do septo pelúcido). DBP: da tábua externa proximal à tábua interna distal. CC: elipse sobre a borda externa da calota. Parâmetro robusto para idade gestacional no 2º trimestre.',
    meas:[
      ['Plano','Axial transtalâmico'],
      ['DBP — técnica','tábua externa → tábua interna'],
      ['CC — técnica','elipse na borda externa do crânio'],
    ],
    refs:[
      'Hadlock FP, et al. Estimating fetal age: computer-assisted analysis of multiple fetal growth parameters. <i>Radiology</i>. 1984;152(2):497-501.',
      'Papageorghiou AT, et al. INTERGROWTH-21st fetal growth standards. <i>Lancet</i>. 2014;384:869-879.',
    ]
  },
  {
    id:'fetal-ca', group:'Fetal', region:'2º e 3º Trimestres', name:'Circunferência Abdominal', abbr:'CA', iconKey:'ruler',
    age:'Fetal — 2º/3º trimestres',
    note:'Corte axial do abdome ao nível da junção da veia umbilical com o seio porta e bolha gástrica, com costelas simétricas. Parâmetro mais sensível para crescimento fetal e mais variável para datação.',
    meas:[
      ['Plano','Axial — seio porta + bolha gástrica'],
      ['Técnica','elipse na borda externa da pele'],
    ],
    refs:[
      'Hadlock FP, et al. <i>Radiology</i>. 1984;152(2):497-501.',
    ]
  },
  {
    id:'fetal-cf', group:'Fetal', region:'2º e 3º Trimestres', name:'Comprimento do Fêmur', abbr:'CF', iconKey:'bone',
    age:'Fetal — 2º/3º trimestres',
    note:'Medir a diáfise femoral em seu maior eixo, com transdutor perpendicular, sem incluir epífises. Útil para idade gestacional e para estimativa de peso (Hadlock).',
    meas:[
      ['Técnica','diáfise no maior eixo, sem epífises'],
      ['Uso','idade gestacional + peso fetal estimado'],
    ],
    refs:[
      'Hadlock FP, et al. Estimation of fetal weight with the use of head, body, and femur measurements. <i>Am J Obstet Gynecol</i>. 1985;151(3):333-337.',
    ]
  },

  /* ====================== ADULTOS ====================== */
  {
    id:'adulto-figado', group:'Adultos', region:'Abdome superior', name:'Fígado', abbr:'', iconKey:'organ',
    age:'Adultos',
    meas:[
      ['Diâmetro longitudinal — lobo direito','< 16,0 cm'],
      ['Diâmetro longitudinal — lobo esquerdo','< 11,0 cm'],
      ['Lobo caudado / lobo direito','< 0,65'],
    ],
    note:'A medida do lobo direito é dependente de sexo, idade, altura e IMC. Parênquima homogêneo, ecogenicidade ≥ córtex renal e < baço.',
    exam:{points:[
      'Avaliar dimensões, contornos, ecotextura e ecogenicidade.',
      'Pesquisar esteatose, lesões focais e vascularização.',
    ],prep:'Jejum de 6–8 horas.',position:'Decúbito dorsal e/ou oblíquo anterior direito.',
     technique:'Transdutor convexo multifrequencial (2–5 MHz). Medir os diâmetros longitudinais dos lobos na linha médio-esternal (LE) e médio-clavicular direita (LD), com inspiração profunda e angulação cranial do transdutor.'},
    refs:[
      'Kratzer W, et al. Factors affecting liver size: a sonographic survey of 2080 subjects. <i>J Ultrasound Med</i>. 2003;22(11):1155-1161.',
      'Niederau C, et al. Sonographic measurements of the normal liver, spleen, pancreas, and portal vein. <i>Radiology</i>. 1983;149(2):537-540.',
    ]
  },
  {
    id:'adulto-baco', group:'Adultos', region:'Abdome superior', name:'Baço', abbr:'', iconKey:'organ',
    age:'Adultos',
    meas:[
      ['Comprimento (maior eixo)','≤ 12,0 cm'],
      ['Espessura','≤ 5,0 cm'],
      ['Esplenomegalia','> 13 cm'],
    ],
    note:'Medir o maior eixo longitudinal no corte coronal pela linha axilar média esquerda.',
    refs:[
      'Lamb PM, et al. Spleen size: how well do linear ultrasound measurements correlate with three-dimensional CT volume? <i>Br J Radiol</i>. 2002;75(895):573-577.',
    ]
  },
  {
    id:'adulto-pancreas', group:'Adultos', region:'Abdome superior', name:'Pâncreas', abbr:'', iconKey:'organ',
    age:'Adultos',
    meas:[
      ['Cabeça','≤ 2,5 – 3,0 cm'],
      ['Corpo','≤ 2,0 – 2,5 cm'],
      ['Cauda','≤ 2,0 – 2,8 cm'],
      ['Ducto de Wirsung','≤ 2 – 3 mm'],
    ],
    note:'Ecogenicidade habitualmente ≥ fígado, aumentando com a idade (involução gordurosa). Medir no plano axial usando a veia esplênica como referência.',
    refs:[
      'Niederau C, et al. <i>Radiology</i>. 1983;149(2):537-540.',
    ]
  },
  {
    id:'adulto-vesicula-biliar', group:'Adultos', region:'Abdome superior', name:'Vesícula Biliar', abbr:'', iconKey:'organ',
    age:'Adultos',
    meas:[
      ['Espessura da parede (em jejum)','≤ 3 mm'],
      ['Diâmetro transverso','< 4 – 5 cm'],
      ['Comprimento','< 10 cm'],
    ],
    note:'Avaliar em jejum. Parede > 3 mm: colecistite, hepatopatia, hipoalbuminemia. Pesquisar cálculos com sombra acústica e mobilidade.',
    refs:[
      'Engel JM, et al. Gallbladder wall thickness: sonographic accuracy and relation to disease. <i>AJR</i>. 1980;134(5):907-909.',
    ]
  },
  {
    id:'adulto-trato-biliar', group:'Adultos', region:'Abdome superior', name:'Trato Biliar', abbr:'', iconKey:'organ',
    age:'Adultos',
    meas:[
      ['Colédoco (ducto biliar comum)','≤ 6 mm'],
      ['Colédoco — pós-colecistectomia','até ~10 mm'],
      ['Acréscimo fisiológico','+1 mm por década após 60 anos'],
      ['Vias intra-hepáticas','não dilatadas (< 40% da veia adjacente)'],
    ],
    note:'Medir o colédoco no seu maior calibre, geralmente anterior à veia porta. Dilatação sugere obstrução.',
    refs:[
      'Horrow MM, et al. Sonographic measurement of the common bile duct. <i>Ultrasound Q</i>. 2010;26(2):103-107.',
    ]
  },
  {
    id:'adulto-veia-porta', group:'Adultos', region:'Abdome superior', name:'Veia Porta', abbr:'', iconKey:'drop',
    age:'Adultos',
    meas:[
      ['Calibre','≤ 13 mm'],
      ['Velocidade média','15 – 40 cm/s'],
      ['Fluxo','hepatopetal (em direção ao fígado)'],
    ],
    note:'Medir no hilo hepático, durante respiração tranquila. Calibre > 13 mm e perda da variação respiratória sugerem hipertensão portal.',
    refs:[
      'Weinreb J, et al. Portal vein measurements by real-time sonography. <i>AJR</i>. 1982;139(3):497-499.',
    ]
  },
  {
    id:'adulto-aorta-iliacas', group:'Adultos', region:'Retroperitônio', name:'Aorta e Ilíacas', abbr:'', iconKey:'drop',
    age:'Adultos',
    meas:[
      ['Aorta abdominal — diâmetro','< 3,0 cm'],
      ['Aneurisma','≥ 3,0 cm'],
      ['Artérias ilíacas comuns','< 1,5 cm'],
    ],
    note:'Medir parede externa a parede externa (outer-to-outer), em corte transverso. Aneurisma ≥ 5,5 cm: avaliar correção. Pesquisar trombo mural.',
    refs:[
      'Wanhainen A, et al. ESVS 2019 Clinical Practice Guidelines on the Management of Abdominal Aorto-iliac Artery Aneurysms. <i>Eur J Vasc Endovasc Surg</i>. 2019;57(1):8-93.',
    ]
  },
  {
    id:'adulto-rim', group:'Adultos', region:'Trato urinário', name:'Rim', abbr:'', iconKey:'kidney',
    age:'Adultos',
    meas:[
      ['Comprimento','10 – 12 cm'],
      ['Largura','5 – 7 cm'],
      ['Espessura do parênquima','≥ 1,3 – 1,5 cm'],
      ['Assimetria entre os rins','< 2 cm'],
    ],
    note:'Ecogenicidade cortical < fígado/baço. Pesquisar dilatação pielocalicinal, cálculos e cistos. O rim esquerdo costuma ser discretamente maior.',
    refs:[
      'Emamian SA, et al. Kidney dimensions at sonography: correlation with age, sex, and habitus in 665 adult volunteers. <i>AJR</i>. 1993;160(1):83-86.',
    ]
  },
  {
    id:'adulto-prostata', group:'Adultos', region:'Trato genital — masculino', name:'Próstata', abbr:'', iconKey:'organ',
    age:'Adultos',
    calc:{ label:'Volume', unit:'cm³', three:true },
    meas:[
      ['Volume normal','≤ 25 – 30 cm³'],
      ['Fórmula','L × A × T × 0,52'],
      ['PSA density','PSA ÷ volume'],
    ],
    note:'Volume estimado pela fórmula do elipsoide. Pode ser medido por via abdominal (bexiga cheia) ou transretal (maior acurácia).',
    refs:[
      'Terris MK, Stamey TA. Determination of prostate volume by transrectal ultrasound. <i>J Urol</i>. 1991;145(5):984-987.',
    ]
  },
  {
    id:'adulto-testiculos', group:'Adultos', region:'Trato genital — masculino', name:'Testículos', abbr:'', iconKey:'organ',
    age:'Adultos',
    calc:{ label:'Volume', unit:'cm³', three:true },
    meas:[
      ['Comprimento','3 – 5 cm'],
      ['Volume','12 – 25 cm³'],
      ['Epidídimo — cabeça','5 – 12 mm'],
    ],
    note:'Avaliação comparativa bilateral com Doppler. Pesquisar simetria de ecotextura e fluxo. Volume < 12 cm³ sugere hipotrofia.',
    refs:[
      'Sakamoto H, et al. Testicular volume measurement: comparison of ultrasonography, orchidometry, and water displacement. <i>Urology</i>. 2007;69(1):152-157.',
    ]
  },
  {
    id:'adulto-tireoide', group:'Adultos', region:'Pequenas partes', name:'Tireóide', abbr:'', iconKey:'organ',
    age:'Adultos',
    calc:{ label:'Volume lobo', unit:'cm³', three:true },
    meas:[
      ['Volume total (mulheres)','≤ 18 mL'],
      ['Volume total (homens)','≤ 25 mL'],
      ['Lobo — diâmetro AP','< 2 cm'],
      ['Istmo','< 3 – 4 mm'],
    ],
    note:'Volume de cada lobo pela fórmula do elipsoide; volume total = soma dos lobos. Classificar nódulos por TI-RADS.',
    refs:[
      'Tessler FN, et al. ACR TI-RADS: White Paper of the ACR TI-RADS Committee. <i>J Am Coll Radiol</i>. 2017;14(5):587-595.',
    ]
  },
  ];
})(typeof globalThis !== 'undefined' ? globalThis : this);
