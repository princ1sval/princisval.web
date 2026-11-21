// =========================================================
// Tela de carregamento: o aviso de "terminou"
// A animação em si fica no index.html (CSS no <head> e script
// logo no começo do <body>), para aparecer já no primeiro
// quadro, antes deste arquivo baixar. Aqui fica só a ponte
// para os próximos efeitos da abertura esperarem o corte.
// =========================================================

/**
 * Promessa que se cumpre quando a tela de carregamento termina e a
 * abertura já entrou. Se a tela não rodou (segunda visita ou movimento
 * reduzido), se cumpre na hora.
 *
 * Uso: introTerminou().then(() => iniciarHero())
 */
export function introTerminou() {
  return window.principioIntro ? window.principioIntro.fim : Promise.resolve()
}

/**
 * Promessa que se cumpre quando o corte começa (o logo sai e a abertura
 * aparece por baixo), ou na hora em que a pessoa pula a tela. Se a tela
 * não rodou, se cumpre na hora. É o momento em que o título começa a acender.
 */
export function introCortou() {
  return (window.principioIntro && window.principioIntro.corte) || Promise.resolve()
}
