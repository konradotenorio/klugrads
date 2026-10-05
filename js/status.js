/* =========================================================================
   STATUS DOS ITENS — 🚜 em construção · ✅ concluído (revisado)
   -------------------------------------------------------------------------
   Todo item do site aparece com 🚜 antes do nome. Quando o item estiver
   concluído e revisado (Konrado ou Valdemar), coloque a CHAVE dele na lista
   ST_OK abaixo — o 🚜 vira ✅ em todos os lugares onde o nome aparece
   (início, menu lateral, listas, busca, favoritos e título da tela).

   Chaves (prefixo:id):
     mod:<método>        métodos da tela inicial        mod:rx  mod:us  mod:tc  mod:rm  mod:dxa  mod:mamo
     home:<atalho>       atalhos da tela inicial        home:ferramentas  home:favoritos  home:novalista
                                                        home:dicom  home:laudos  home:config  home:mapa
                                                        home:calcgerais  home:contraste  home:calcus
     sec:<método>:<tipo> cartões dentro de um método    sec:tc:proto  sec:tc:ref  sec:tc:calc  sec:tc:laudos
     calc:<id>           calculadoras, referências e protocolos (id do CALCS)
     ref:<id>            referências de US (id do item em DATA)
     lmod:<id>           métodos de laudo               lmod:us  lmod:tc  lmod:mmg  lmod:dmo  lmod:cfg
     laudo:<id>          modelos de laudo (id do modelo)
     cont:<id>           tópicos de Meios de Contraste
     mapa:<órgão>        itens do Mapa Setorial Lesional  mapa:prostata  mapa:endometriose (PELVE)
   ========================================================================= */
const ST_OK = [
  'home:mapa',             // MAPA SETORIAL LESIONAL
  'mapa:prostata',         //   PRÓSTATA (PI-RADS)
  'mapa:endometriose',     //   PELVE (Endometriose)
];

function stOk(key){ return ST_OK.indexOf(key) >= 0; }
/* Marca em HTML (antes do nome). Sem chave → string vazia. */
function stMark(key){
  if(!key) return '';
  const ok = stOk(key), t = ok ? 'Concluído e revisado' : 'Em construção';
  return `<span class="stm" role="img" aria-label="${t}" title="${t}">${ok?'✅':'🚜'}</span>`;
}
