/* =========================================================================
   KlugRads — Laudos estruturados: OCT de mácula (Oftalmologia)
   ---------------------------------------------------------------------------
   Frases de alteração por item (um bloco por olho) e a conclusão por olho.
   Redação baseada no manual de laudos de OCT enviado pelo usuário
   (linguagem morfológica e cautelosa, correlação clínica/multimodal).
   Campos extras das frases:
     c    fragmento da conclusão ("Olho direito com …")
     cat  'fundo' → correlacionar com exame fundoscópico;
          'multi' → sugerir avaliação multimodal (OCT-A / angiografia)
     sup  itens do mesmo olho que a frase substitui (ex.: MER com perda da
          depressão foveal oculta "Sem alterações na depressão foveal.")
   Carregar depois de laudos.js e laudos-frases.js.
   ========================================================================= */

const LAU_FRASE_ORGAOS_OCT = [
  ['octqual',  /^qualidade/],
  ['octinter', /^interface vitreorretiniana/],
  ['octhial',  /^hialoide/],
  ['octfov',   /^contorno foveal/],
  ['octesp',   /^espessura macular/],
  ['octperf',  /^perfil retiniano/],
  ['octdep',   /^depressao foveal/],
  ['octedema', /^edema macular/],
  ['octcor',   /^complexo coriocapilar/],
];

const LAU_OCT_FRASES = [
  /* ---- qualidade / aquisição ---- */
  {o:'octqual', n:'Baixa qualidade de sinal (dificultando)', m:'add',
   t:'Exame com baixa qualidade de aquisição do sinal tomográfico, dificultando a adequada avaliação da retina neurossensorial.',
   c:'exame com baixa qualidade de sinal'},
  {o:'octqual', n:'Baixa qualidade de sinal (impedindo)', m:'add',
   t:'Exame com baixa qualidade de aquisição do sinal tomográfico, impedindo a adequada avaliação da retina neurossensorial.',
   c:'exame com baixa qualidade de sinal, impedindo a adequada avaliação da retina neurossensorial'},
  {o:'octqual', n:'Artefato localizado', m:'add',
   t:'Artefato de aquisição em topografia XXX, limitando a avaliação desta região.', c:''},
  {o:'octqual', n:'Exame descentrado', m:'add',
   t:'Exame descentrado em relação à fóvea; a espessura macular central deve ser interpretada com cautela devido à descentração do exame.', c:''},

  /* ---- interface vitreorretiniana ---- */
  {o:'octinter', n:'MER — baixo impacto (Govetto 1)', m:'sub', sup:['depressao foveal'],
   t:'Interface vitreorretiniana com hiper-refletividade ao nível da membrana limitante interna, podendo corresponder a membrana epirretiniana de baixo impacto anatômico, sem distorção significativa da arquitetura foveal.\nDepressão foveal preservada (Govetto estágio 1).',
   c:'membrana epirretiniana de baixo impacto anatômico (Govetto estágio 1)'},
  {o:'octinter', n:'MER — sem depressão, sem EIFL (Govetto 2)', m:'sub', sup:['depressao foveal','contorno foveal'],
   t:'Interface vitreorretiniana com hiper-refletividade ao nível da membrana limitante interna, podendo corresponder a membrana epirretiniana.\nAssociada à ausência da depressão foveal e à distorção da arquitetura macular, sem camada interna foveal ectópica (Govetto estágio 2).',
   c:'membrana epirretiniana com ausência da depressão foveal (Govetto estágio 2)'},
  {o:'octinter', n:'MER — com EIFL (Govetto 3)', m:'sub', sup:['depressao foveal','contorno foveal'],
   t:'Interface vitreorretiniana com hiper-refletividade ao nível da membrana limitante interna, podendo corresponder a membrana epirretiniana.\nAssociada à ausência da depressão foveal.\nObserva-se presença de camada interna foveal ectópica, associada à alteração da arquitetura foveal (Govetto estágio 3).',
   c:'membrana epirretiniana com camada interna foveal ectópica (Govetto estágio 3)'},
  {o:'octinter', n:'MER — EIFL e desorganização (Govetto 4)', m:'sub', sup:['depressao foveal','contorno foveal'],
   t:'Interface vitreorretiniana com hiper-refletividade ao nível da membrana limitante interna, podendo corresponder a membrana epirretiniana.\nAssociada à ausência da depressão foveal.\nObserva-se presença de camada interna foveal ectópica, associada à desorganização importante das camadas internas da retina (Govetto estágio 4).',
   c:'membrana epirretiniana com camada interna foveal ectópica e desorganização das camadas internas (Govetto estágio 4)'},
  {o:'octinter', n:'Cistos / cavitações secundários à MER', m:'add',
   t:'Cavidades hiporrefletivas intrarretinianas secundárias às alterações tracionais.', c:''},
  {o:'octinter', n:'DONFL', m:'sub',
   t:'Interface vitreorretiniana com irregularidade ao nível da membrana limitante interna/camada de fibras nervosas da retina.\nAchado podendo corresponder a dissociação da camada de fibras nervosas da retina (DONFL), a depender do contexto clínico e da realização prévia de vitrectomia posterior com peeling da membrana limitante interna.',
   c:'irregularidade da camada de fibras nervosas, podendo corresponder a DONFL (conforme contexto cirúrgico)'},

  /* ---- hialoide posterior ---- */
  {o:'octhial', n:'Aderida à mácula', m:'sub', t:'Hialoide posterior visualizada, mantendo aderência à região macular.', c:''},
  {o:'octhial', n:'Adesão vitreomacular sem tração', m:'sub', t:'Hialoide posterior visualizada, mantendo adesão vitreomacular, sem sinais de tração vitreomacular.', c:''},
  {o:'octhial', n:'Tração vitreomacular', m:'sub', sup:['contorno foveal','depressao foveal'],
   t:'Hialoide posterior visualizada, aderida à região macular, determinando tração vitreomacular com distorção do contorno foveal.',
   c:'tração vitreomacular'},
  {o:'octhial', n:'Descolada (não aderida)', m:'sub', t:'Hialoide posterior visualizada, não aderida à retina nas imagens avaliadas.', c:''},
  {o:'octhial', n:'Aderida só à papila', m:'sub', t:'Hialoide posterior aderida à região peripapilar, não aderida sobre a região macular.', c:''},

  /* ---- contorno foveal ---- */
  {o:'octfov', n:'Buraco macular de espessura total', m:'sub', sup:['depressao foveal'],
   t:'Observa-se solução de continuidade foveal envolvendo toda a espessura da retina neurossensorial, achado compatível com buraco macular de espessura total.',
   c:'buraco macular de espessura total'},
  {o:'octfov', n:'Bordas do buraco com cistos', m:'add',
   t:'As bordas do buraco macular apresentam cavidades hiporrefletivas intrarretinianas de aspecto cístico.', c:''},
  {o:'octfov', n:'Buraco lamelar', m:'sub', sup:['depressao foveal'],
   t:'Observa-se imagem sugestiva de buraco lamelar.', c:'imagem sugestiva de buraco lamelar'},
  {o:'octfov', n:'Buraco lamelar degenerativo / LHEP', m:'sub', sup:['depressao foveal'],
   t:'Observa-se imagem sugestiva de buraco lamelar, com características degenerativas, associado a proliferação epirretiniana (LHEP).',
   c:'imagem sugestiva de buraco lamelar degenerativo, com proliferação epirretiniana (LHEP)'},
  {o:'octfov', n:'Pseudoburaco macular', m:'sub', sup:['depressao foveal'],
   t:'Perda parcial da anatomia habitual do contorno foveal, com aspecto sugestivo de pseudoburaco macular, sem solução de continuidade de espessura total.',
   c:'aspecto sugestivo de pseudoburaco macular'},
  {o:'octfov', n:'Dome-shaped macula', m:'sub',
   t:'Observa-se discreto abaulamento macular, configurando aspecto tipo dome-shaped.', c:'mácula de aspecto dome-shaped'},
  {o:'octfov', n:'Dome-shaped + coroide afinada', m:'sub',
   t:'Observa-se discreto abaulamento macular, configurando aspecto tipo dome-shaped, associado a afinamento da coroide subjacente à região macular.', c:'mácula de aspecto dome-shaped, com afinamento coroideano'},
  {o:'octfov', n:'Dome-shaped + líquido subretiniano', m:'sub',
   t:'Observa-se discreto abaulamento macular, configurando aspecto tipo dome-shaped, associado a líquido subretiniano/descolamento seroso da retina neurossensorial.', c:'mácula de aspecto dome-shaped, com líquido subretiniano'},

  /* ---- espessura ---- */
  {o:'octesp', n:'Espessura não informada', m:'sub', t:'Espessura macular central não informada no presente exame.', c:''},
  {o:'octesp', n:'Abaixo do percentil 5%', m:'add',
   t:'A espessura retiniana na região macular encontra-se globalmente menor que o percentil 5% para as normatizações de sexo e idade do aparelho.',
   c:'espessura retiniana macular globalmente menor que o percentil 5% da normatização do aparelho'},
  {o:'octesp', n:'Espessamento macular importante', m:'add',
   t:'Importante espessamento da retina neurossensorial na região macular.', c:'espessamento macular importante'},

  /* ---- perfil retiniano (camadas) ---- */
  {o:'octperf', n:'IHRF', m:'add', t:'Notam-se focos hiper-refletivos intrarretinianos (IHRF), de caráter inespecífico.', c:'focos hiper-refletivos intrarretinianos (IHRF)'},
  {o:'octperf', n:'Exsudatos duros (suspeita)', m:'add', cat:'fundo',
   t:'Observam-se pontos/lesões hiper-refletivas com sombreamento posterior, podendo corresponder a depósitos exsudativos/exsudatos duros, conforme correlação com exame fundoscópico.',
   c:'lesões hiper-refletivas podendo corresponder a exsudatos duros'},
  {o:'octperf', n:'DRIL', m:'add', t:'Observa-se desorganização das camadas internas da retina, podendo corresponder a DRIL.', c:'desorganização das camadas internas da retina (DRIL)'},
  {o:'octperf', n:'TelCap', m:'add',
   t:'Observa-se lesão circular hiporrefletiva, de bordas hiper-refletivas, localizada ao nível da camada nuclear interna, associada a cavidades hiporrefletivas adjacentes.\nAchado podendo corresponder a alteração aneurismática do plexo capilar retiniano profundo, como TelCap, em contexto clínico compatível.',
   c:'lesão podendo corresponder a alteração aneurismática do plexo capilar profundo (TelCap); correlacionar com história clínica e fundoscopia'},
  {o:'octperf', n:'Pseudodrusas', m:'add', t:'Imagens hiper-refletivas subretinianas, sugestivas de pseudodrusas retinianas.', c:'pseudodrusas retinianas'},
  {o:'octperf', n:'Pseudodrusas (aspecto piramidal)', m:'add', t:'Imagens hiper-refletivas subretinianas, algumas de aspecto piramidal, sugestivas de pseudodrusas retinianas.', c:'pseudodrusas retinianas'},
  {o:'octperf', n:'SHRM', m:'add', cat:'multi',
   t:'Observa-se material hiper-refletivo subretiniano (SHRM) em região macular, podendo corresponder a processo neovascular de coroide, conforme correlação clínica e avaliação multimodal.',
   c:'material hiper-refletivo subretiniano (SHRM), podendo corresponder a processo neovascular de coroide'},
  {o:'octperf', n:'SHRM sem fluido (sem atividade)', m:'add', cat:'multi',
   t:'Observa-se material hiper-refletivo subretiniano (SHRM) em região macular, sem sinais tomográficos evidentes de atividade exsudativa no presente exame.',
   c:'material hiper-refletivo subretiniano (SHRM), sem sinais tomográficos evidentes de atividade'},
  {o:'octperf', n:'Imagem inespecífica', m:'add', t:'Imagem de aspecto inespecífico em topografia XXX.', c:''},

  /* ---- depressão foveal ---- */
  {o:'octdep', n:'Depressão atenuada', m:'sub', t:'Atenuação da depressão foveal.', c:'atenuação da depressão foveal'},
  {o:'octdep', n:'Depressão ausente', m:'sub', t:'Ausência da depressão foveal.', c:'ausência da depressão foveal'},

  /* ---- edema / fluido ---- */
  {o:'octedema', n:'Edema macular cistoide', m:'sub',
   t:'Observam-se múltiplos espaços hiporrefletivos intrarretinianos, podendo corresponder a cavidades císticas/edema macular de aspecto cistoide.',
   c:'edema macular de aspecto cistoide'},
  {o:'octedema', n:'Edema cistoide importante', m:'sub', sup:['depressao foveal'],
   t:'Observam-se múltiplos espaços hiporrefletivos intrarretinianos, podendo corresponder a cavidades císticas/edema macular de aspecto cistoide, com importante espessamento da retina neurossensorial e importante distorção da arquitetura macular.',
   c:'edema macular de aspecto cistoide importante'},
  {o:'octedema', n:'Cavitações foveais', m:'sub', t:'Presença de cavitações hiporrefletivas sobre a região foveal.', c:'cavitações hiporrefletivas foveais'},
  {o:'octedema', n:'Líquido subretiniano', m:'add',
   t:'Observa-se líquido subretiniano em região macular, compatível com descolamento seroso da retina neurossensorial.',
   c:'líquido subretiniano (descolamento seroso da retina neurossensorial)'},

  /* ---- complexo EPR / coriocapilar / coroide ---- */
  {o:'octcor', n:'Drusas', m:'sub',
   t:'Depósitos de material hiper-refletivo subjacentes ao epitélio pigmentado da retina, determinando elevações focais do mesmo, podendo corresponder a drusas.',
   c:'depósitos sub-EPR podendo corresponder a drusas'},
  {o:'octcor', n:'DEP', m:'sub', t:'Observa-se descolamento do epitélio pigmentado da retina.', c:'descolamento do epitélio pigmentado da retina'},
  {o:'octcor', n:'DEP heterogêneo', m:'sub', t:'Observa-se descolamento do epitélio pigmentado da retina, com conteúdo heterogêneo em seu interior.', c:'descolamento do epitélio pigmentado da retina de conteúdo heterogêneo'},
  {o:'octcor', n:'DEP drusenoide', m:'sub', t:'Observa-se descolamento do epitélio pigmentado da retina de aspecto drusenoide.', c:'descolamento do epitélio pigmentado da retina de aspecto drusenoide'},
  {o:'octcor', n:'DEP sem fluido associado', m:'add', t:'Sem sinais de fluido intra ou subretiniano associado.', c:''},
  {o:'octcor', n:'SIRE sem fluido (quiescente)', m:'sub', cat:'multi',
   t:'Observa-se elevação irregular rasa do epitélio pigmentado da retina, com configuração sugestiva de sinal da dupla camada (SIRE), sem líquido intra ou subretiniano associado, podendo sugerir membrana neovascular quiescente, conforme correlação clínica e avaliação multimodal.',
   c:'elevação irregular rasa do EPR (sinal da dupla camada), podendo sugerir membrana neovascular quiescente'},
  {o:'octcor', n:'SIRE com fluido (atividade)', m:'sub', cat:'multi',
   t:'Observa-se elevação irregular rasa do epitélio pigmentado da retina, com configuração sugestiva de sinal da dupla camada (SIRE), podendo estar relacionada a processo neovascular de coroide em atividade.',
   c:'sinal da dupla camada, podendo estar relacionado a processo neovascular de coroide em atividade'},
  {o:'octcor', n:'Atrofia da retina externa / cRORA', m:'sub',
   t:'Atrofia da retina externa envolvendo zona elipsoide e epitélio pigmentado da retina.\nObserva-se hipertransmissão posterior do sinal tomográfico nas áreas correspondentes.',
   c:'achados que podem sugerir pontos focais de atrofia da retina externa'},
  {o:'octcor', n:'Atrofia completa (cRORA)', m:'sub',
   t:'Atrofia da retina externa envolvendo zona elipsoide e epitélio pigmentado da retina, com hipertransmissão posterior do sinal tomográfico nas áreas correspondentes, podendo corresponder a atrofia completa da retina externa e do epitélio pigmentado da retina (cRORA).',
   c:'atrofia podendo corresponder a cRORA'},
  {o:'octcor', n:'Coroide espessada', m:'add', t:'Nota-se aumento da espessura coroideana em topografia subfoveal.', c:'aumento da espessura coroideana subfoveal'},
  {o:'octcor', n:'Coroide afinada', m:'add', t:'Nota-se redução da espessura coroideana na região avaliada.', c:'redução da espessura coroideana'},
  {o:'octcor', n:'Coroide não mensurável', m:'add', t:'Pelo método do exame, não é possível determinar adequadamente a espessura total da coroide.', c:''},
  {o:'octcor', n:'Sem paquivasos', m:'add', t:'Nas imagens avaliáveis, não se observam sinais evidentes de paquivasos coroideanos.', c:''},
  {o:'octcor', n:'Estafiloma posterior', m:'add',
   t:'Observa-se alteração do contorno posterior do globo ocular/esclera, podendo sugerir estafiloma posterior, conforme correlação clínica e refracional.',
   c:'alteração do contorno posterior podendo sugerir estafiloma posterior'},
];
LAU_OCT_FRASES.forEach(f=>LAU_FRASES.push(f));

/* ---- conclusão por olho ---- */
function lauOctOlho(it){ return /esquerd/i.test(it.grp||'') ? 'e' : 'd'; }
/* itens ocultados por frases do mesmo olho (ex.: MER oculta a linha da depressão foveal) */
/* Um campo por item no painel (item do olho direito = "mestre"); cada frase
   escolhida recebe o olho afetado (d.olho: 'd' | 'e' | 'a' = ambos). Sem olho
   escolhido, vale o olho do exame quando só um olho foi examinado. */
function lauOctMestre(m, it){ return lauOctOlho(it)==='d' ? it : (m.items.find(x=>x.label===it.label && lauOctOlho(x)==='d') || it); }
function lauOctGemeo(m, it){ return m.items.find(x=>x.label===it.label && lauOctOlho(x)==='e'); }
function lauOctOlhoDe(d){ const L=state.lau; return (d&&d.olho) || ((L.lado==='d'||L.lado==='e') ? L.lado : null); }
function lauOctLista(m, it){
  const L=state.lau, mm=lauOctMestre(m,it), sm=L.v[mm.k], o=lauOctOlho(it);
  return (sm.__f||[]).filter(id=>{ const e=lauOctOlhoDe(sm.__v['d'+id]); return e==='a' || e===o; });
}
/* "sombra" do estado do item com as frases do mestre que valem para este olho */
function lauOctShadow(m, it){
  const L=state.lau, s=L.v[it.k], mm=lauOctMestre(m,it), sm=L.v[mm.k];
  return Object.assign({}, s, {__f: lauOctLista(m,it), __v: Object.assign({}, sm.__v, {n: s.__v.n, l: s.__v.l})});
}
function lauOctSup(m){
  const sup={d:{}, e:{}};
  m.items.forEach(it=>{ lauOctLista(m,it).forEach(id=>{ const f=lauFI(id); (f&&f.sup||[]).forEach(x=>sup[lauOctOlho(it)][x]=1); }); });
  return sup;
}
function lauOctItemOculto(m, it){ return !!lauOctSup(m)[lauOctOlho(it)][lauNorm(it.label)]; }
function lauOctConcs(m){
  const L=state.lau, frag={d:[], e:[]}; let cat='';
  m.items.forEach(it=>{
    if(lauItemOutroLado(m,it)) return;
    const s=lauOctShadow(m,it), o=lauOctOlho(it);
    (s.__f||[]).forEach(id=>{ const f=lauFI(id); if(!f) return;
      if(f.cat==='multi') cat='multi'; else if(f.cat==='fundo' && cat!=='multi') cat='fundo';
      const c=lauFraseConcHTML(f, s.__v['f'+id], ''); if(c && frag[o].indexOf(c)<0) frag[o].push(c); });
  });
  if(!frag.d.length && !frag.e.length) return [];
  const um = L.lado==='d' ? ['d'] : L.lado==='e' ? ['e'] : ['d','e'];
  const nome={d:'Olho direito', e:'Olho esquerdo'};
  const junta = a => a.length<2 ? a[0] : a.slice(0,-1).join(', ')+' e '+a[a.length-1];
  const out=[];
  if(um.length===2 && frag.d.length && frag.d.join('|')===frag.e.join('|')) out.push(`Ambos os olhos com ${junta(frag.d)}.`);
  else um.forEach(o=> out.push(frag[o].length ? `${nome[o]} com ${junta(frag[o])}.` : `${nome[o]} dentro dos parâmetros de normalidade.`));
  if(cat==='multi') out.push('Sugere-se correlação com avaliação multimodal, podendo incluir OCT-A e/ou angiografia fluoresceínica, para melhor elucidação diagnóstica.');
  out.push(cat==='multi' ? 'Correlacionar com dados clínicos e avaliação multimodal para definição diagnóstica.'
         : cat==='fundo' ? 'Correlacionar com dados clínicos e exame fundoscópico para definição diagnóstica.'
         : 'Correlacionar com dados clínicos para definição diagnóstica.');
  return out.map(h=>({html:h}));
}
