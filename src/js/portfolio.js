// =========================================================
// Portfólio: entrada, faixa horizontal, setas e contador
//
// Entrada: quando a seção chega na tela, o rótulo, o título e
// os controles sobem, e os cards entram deslizando da direita,
// um depois do outro.
//
// Computador: a seção fica presa na tela e a rolagem do mouse
// leva a faixa de cards para o lado (GSAP ScrollTrigger com pin
// e scrub). As setas rolam a página até o card certo, e o
// contador acompanha.
//
// Celular, tablet e movimento reduzido: a faixa rola para o lado
// sozinha (arrastar com o dedo, CSS overflow-x). As setas rolam
// a faixa e o contador acompanha.
// =========================================================

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ---------- Ajustes: mude aqui ----------
const SUAVE = 0.6 // segundos que a faixa leva para alcançar a rolagem
const VELOCIDADE = 1 // rolagem vertical por px de faixa (1 = um px para baixo anda um px para o lado)
const CARDS_VEM_DE = 160 // px à direita de onde os cards começam a entrada
const ENTRADA_SOBE = 40 // px que o título e os controles sobem na entrada

/** Liga o portfólio. */
export function iniciarPortfolio() {
  const secao = document.querySelector('.portfolio')
  if (!secao) return
  const lista = secao.querySelector('.portfolio__lista')
  const cards = [...lista.querySelectorAll('.projeto')]
  const contador = secao.querySelector('.portfolio__contador')
  const [anterior, proximo] = secao.querySelectorAll('.portfolio__controles .botao-redondo')
  const topo = secao.querySelectorAll('.portfolio__topo .rotulo, .portfolio__topo h2, .portfolio__controles')
  const total = cards.length
  const parada = window.matchMedia('(prefers-reduced-motion: reduce)')

  let atual = -1 // card da frente (-1 = ainda não calculado)
  let irPara = () => {} // cada modo (computador ou celular) diz como ir até um card

  // Quanto a faixa anda do começo ao fim: até o último card encostar na margem direita.
  // (offsetLeft conta a partir da própria faixa, que tem position: relative no CSS)
  function maximo() {
    const recuo = parseFloat(getComputedStyle(lista).paddingRight) || 0
    const ultimo = cards[total - 1]
    return Math.max(0, ultimo.offsetLeft + ultimo.offsetWidth + recuo - lista.clientWidth)
  }

  // Quanto a faixa precisa andar para o card i encostar na margem esquerda.
  // Os últimos não chegam lá: param quando a faixa acaba.
  function posicao(i) {
    const recuo = parseFloat(getComputedStyle(lista).paddingLeft) || 0
    return Math.min(cards[i].offsetLeft - recuo, maximo())
  }

  // Qual card está "na frente", dado quanto a faixa já andou
  function atualizar(andou) {
    let i = 0
    for (let n = 0; n < total; n++) if (posicao(n) <= andou + 8) i = n
    if (i === atual) return
    atual = i
    contador.textContent = `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
    anterior.disabled = i === 0
    proximo.disabled = i === total - 1
  }

  anterior.addEventListener('click', () => irPara(Math.max(0, atual - 1)))
  proximo.addEventListener('click', () => irPara(Math.min(total - 1, atual + 1)))

  const telas = gsap.matchMedia()

  // ---------- Entrada (todas as telas, menos movimento reduzido) ----------
  telas.add('(prefers-reduced-motion: no-preference)', () => {
    const entrada = gsap.timeline({
      scrollTrigger: {
        trigger: secao,
        start: 'top 90%', // começa quando o topo da seção aparece embaixo da tela
        end: 'top 40%',
        scrub: SUAVE,
      },
    })
    entrada.from(topo, { y: ENTRADA_SOBE, autoAlpha: 0, stagger: 0.1, ease: 'power2.out' }, 0)
    entrada.from(cards, { x: CARDS_VEM_DE, autoAlpha: 0, stagger: 0.12, ease: 'power2.out' }, 0.1)
  })

  // ---------- Computador: a rolagem leva a faixa para o lado ----------
  telas.add('(min-width: 64rem) and (prefers-reduced-motion: no-preference)', () => {
    secao.classList.add('portfolio--animado')
    const distancia = maximo

    const faixa = gsap.to(lista, {
      x: () => -distancia(),
      ease: 'none',
      scrollTrigger: {
        trigger: secao,
        start: 'center center', // presa no meio da tela
        end: () => `+=${distancia() * VELOCIDADE}`,
        pin: true,
        scrub: SUAVE,
        invalidateOnRefresh: true,
        onUpdate: (gatilho) => atualizar(gatilho.progress * distancia()),
      },
    })

    // Setas: rola a página até o ponto em que a faixa mostra o card i
    irPara = (i) => {
      const gatilho = faixa.scrollTrigger
      const fracao = distancia() ? posicao(i) / distancia() : 0
      window.scrollTo({ top: gatilho.start + fracao * (gatilho.end - gatilho.start), behavior: 'smooth' })
    }

    return () => secao.classList.remove('portfolio--animado')
  })

  // ---------- Celular, tablet e movimento reduzido: a faixa rola sozinha ----------
  telas.add('(max-width: 63.99rem), (prefers-reduced-motion: reduce)', () => {
    let pedido = 0
    const aoRolar = () => {
      cancelAnimationFrame(pedido)
      pedido = requestAnimationFrame(() => atualizar(lista.scrollLeft))
    }
    lista.addEventListener('scroll', aoRolar, { passive: true })
    irPara = (i) => lista.scrollTo({ left: posicao(i), behavior: parada.matches ? 'auto' : 'smooth' })
    atualizar(lista.scrollLeft)

    return () => lista.removeEventListener('scroll', aoRolar)
  })

  atualizar(0)
}
