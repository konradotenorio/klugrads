// KlugRads: a ferramenta baixa e executa um modelo de IA no próprio aparelho (mais de 100 MB
// e bastante memória), então só é oferecida em computador. Em celular/tablet o CSS
// (ver style.css) esconde o app e mostra a explicação; main.ts não registra o service
// worker, para não baixar nada em segundo plano.
const ua = navigator.userAgent || "";
const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } })
  .userAgentData;
export const klugMobile =
  !!uaData?.mobile ||
  /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua) ||
  // iPadOS se apresenta como Mac, mas tem tela de toque.
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
if (klugMobile) document.documentElement.classList.add("klug-mobile");
