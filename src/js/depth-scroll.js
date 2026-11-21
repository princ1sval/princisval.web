// =========================================================
// Rolagem com profundidade
// No computador, a cena (abertura + prints) fica presa na tela
// enquanto a pessoa rola: o título encolhe e sobe, o resto da
// abertura some, a esfera recua e os prints vêm de longe, por
// trás do título, como se estivessem se aproximando. Depois a
// página volta a rolar normal.
// No celular: sem prender a tela, os prints só crescem um pouco
// ao entrar na tela (mais leve e não "trava" o dedo).
// Com movimento reduzido: nada, a página rola normal.
//
// GSAP ScrollTrigger: "scrub" liga a animação à barra de rolagem
// (rolou metade do trecho = animação na metade; rolou para cima,
// ela volta). "pin" prende a cena na tela durante esse trecho.
// =========================================================

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { introCortou } from './loader.js'

gsap.registerPlugin(ScrollTrigger)

// ---------- Ajustes: mude aqui ----------
const DURACAO = 1.2 // quanto se rola com a cena presa, em alturas de tela (1.2 = 120%)
const SUAVE = 0.6 // segundos que a animação leva para alcançar a rolagem (0 = colada nela)
const TITULO_ESCALA = 0.55 // tamanho final do título
const TITULO_TOPO = 0.1 // onde o título termina: fração da altura da tela, a partir do topo
const PRINTS_ESCALA_INICIAL = 0.35 // os prints começam pequenos, "lá longe"
const PRINTS_DESCE = 140 // px: e um pouco mais para baixo
const PRINTS_ABRE = 6 // % que os prints laterais se afastam do centro ao chegar

/** Liga a rolagem com profundidade. */
export function iniciarProfundidade() {
  const cena = document.querySelector('.cena')
  if (!cena) return
  const titulo = cena.querySelector('.abertura h1')
  const resto = cena.querySelectorAll('.abertura > :not(h1):not(.abertura__esfera)') // pílula, rótulo, subtítulo, botões
  const palco = cena.querySelector('.profundidade')
  const [principal, esquerda, direita] = palco.querySelectorAll('.print')

  const telas = gsap.matchMedia()

  // ---------- Computador ----------
  telas.add('(min-width: 64rem) and (prefers-reduced-motion: no-preference)', () => {
    cena.classList.add('cena--animada')

    // Os prints começam pequenos, transparentes e mais baixos (e centralizados com -50%)
    gsap.set(palco, { xPercent: -50, yPercent: -50 })

    const linha = gsap.timeline({
      defaults: { ease: 'none' }, // com scrub, quem dá o ritmo é a rolagem
      scrollTrigger: {
        trigger: cena,
        start: 'top top',
        end: () => `+=${window.innerHeight * DURACAO}`,
        pin: true,
        scrub: SUAVE,
        invalidateOnRefresh: true, // recalcula as posições quando a janela muda de tamanho
      },
    })

    // 1. O resto da abertura some primeiro, subindo um pouco
    linha.to(resto, { autoAlpha: 0, y: -40, duration: 0.35, stagger: 0.04 }, 0)

    // 2. O título encolhe e sobe até perto do topo
    linha.to(
      titulo,
      {
        scale: TITULO_ESCALA,
        y: () => {
          // distância entre onde o título está e onde ele deve terminar.
          // offsetTop/offsetHeight ignoram a animação (a escala e o y), então a
          // conta dá certo mesmo se a janela mudar de tamanho no meio da rolagem
          const abertura = titulo.offsetParent
          const altura = titulo.offsetHeight
          const alturaFinal = altura * TITULO_ESCALA
          const centroAgora = abertura.offsetTop + titulo.offsetTop + altura / 2
          const centroFinal = window.innerHeight * TITULO_TOPO + alturaFinal / 2
          return centroFinal - centroAgora
        },
        duration: 1,
      },
      0,
    )

    // 3. A esfera recua (a variável --recuo é lida pelo CSS da esfera)
    linha.to(cena, { '--recuo': 1, duration: 0.8 }, 0)

    // 4. Os prints chegam de longe, por trás do título
    linha.fromTo(
      palco,
      { scale: PRINTS_ESCALA_INICIAL, y: PRINTS_DESCE, autoAlpha: 0 },
      { scale: 1, y: 0, autoAlpha: 1, duration: 1 },
      0.15,
    )
    // os laterais se abrem um pouco para os lados, e o do centro chega por último
    linha.fromTo(esquerda, { xPercent: PRINTS_ABRE }, { xPercent: 0, duration: 1 }, 0.15)
    linha.fromTo(direita, { xPercent: -PRINTS_ABRE }, { xPercent: 0, duration: 1 }, 0.15)
    linha.fromTo(principal, { scale: 0.85, y: 40 }, { scale: 1, y: 0, duration: 0.9 }, 0.3)

    // Desfaz tudo se a tela mudar para celular (o matchMedia chama isto)
    return () => cena.classList.remove('cena--animada')
  })

  // ---------- Celular e tablet ----------
  telas.add('(max-width: 63.99rem) and (prefers-reduced-motion: no-preference)', () => {
    gsap.fromTo(
      palco,
      { scale: 0.86, y: 60, autoAlpha: 0.4 },
      {
        scale: 1,
        y: 0,
        autoAlpha: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: palco,
          start: 'top bottom', // quando o topo dos prints aparece embaixo da tela...
          end: 'center center', // ...até o meio deles chegar no meio da tela
          scrub: SUAVE,
        },
      },
    )
  })

  // As medidas mudam quando as fontes carregam e a abertura termina de entrar:
  // recalcula onde a cena começa e termina
  introCortou().then(() => ScrollTrigger.refresh())
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh())
}
