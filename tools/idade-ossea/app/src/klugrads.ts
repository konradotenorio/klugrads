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

// ---- Tema claro/escuro (mesma chave e mesmo padrão do app: escuro por padrão) ----
const THEME_KEY = "radref_theme";
const root = document.documentElement;
function readTheme(): "dark" | "light" {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
function applyTheme(theme: "dark" | "light") {
  root.setAttribute("data-theme", theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? "#eceff3" : "#0e1216");
}
applyTheme(readTheme());
document.getElementById("theme-toggle")?.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
});
