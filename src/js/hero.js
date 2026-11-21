// =========================================================
// Abertura: o título acendendo letra por letra
// "Seu trabalho merece um endereço à altura." começa apagado
// (só um vulto, decidido no <head> do index.html) e cada
// letra acende em sequência. "à altura." acende por último,
// um pouco mais devagar, já em lima.
// Só anima a opacidade: o navegador faz isso fora da linha
// principal, então não pesa no celular.
// =========================================================

import { introCortou } from './loader.js'

// ---------- Tempos (ms): mude aqui para ajustar ----------
const ESPERA = 80 // depois do corte da tela de carregamento (ou do carregamento da página)
const PASSO = 24 // de uma letra para a próxima
const ACENDE = 220 // quanto cada letra leva para acender
const PAUSA_DESTAQUE = 140 // respiro antes do "à altura."
const PASSO_DESTAQUE = 45 // as letras do destaque vêm mais devagar...
const ACENDE_DESTAQUE = 360 // ...e acendem com mais calma
// O quanto a letra apagada aparece fica no CSS (--hero-apagada, no <head> do index.html)

const ENTRA = 'cubic-bezier(0.16, 1, 0.3, 1)' // mesma curva de entrada da tela de carregamento

/** Começa o efeito do título. Sem html.hero-anima (movimento reduzido ou navegador antigo), não faz nada. */
export function iniciarHero() {
  const titulo = document.querySelector('#abertura-titulo')
  const raiz = document.documentElement
  if (!titulo || !raiz.classList.contains('hero-anima')) return

  introCortou().then(() => acender(titulo, raiz))
}

function acender(titulo, raiz) {
  // ?intro=0.25 (câmera lenta da tela de carregamento) também deixa o título mais lento
  const lento = 1 / (parseFloat(raiz.style.getPropertyValue('--intro-velocidade')) || 1)
  const apagada = parseFloat(getComputedStyle(titulo).getPropertyValue('--hero-apagada')) || 0.14

  // O texto completo para leitores de tela, enquanto as letras estão separadas
  titulo.setAttribute('aria-label', titulo.textContent.replace(/\s+/g, ' ').trim())

  const letras = separarLetras(titulo)
  const animacoes = []
  let tempo = ESPERA
  let entrouNoDestaque = false

  letras.forEach(({ el, destaque }) => {
    if (destaque && !entrouNoDestaque) {
      tempo += PAUSA_DESTAQUE
      entrouNoDestaque = true
    }
    animacoes.push(
      el.animate([{ opacity: apagada }, { opacity: 1 }], {
        delay: tempo * lento,
        duration: (destaque ? ACENDE_DESTAQUE : ACENDE) * lento,
        easing: ENTRA,
        fill: 'backwards', // apagada até chegar a vez dela
      }),
    )
    tempo += destaque ? PASSO_DESTAQUE : PASSO
  })

  // Agora as letras cuidam do "apagado": o título inteiro volta ao normal.
  // Acontece no mesmo quadro em que as animações começam, então não pisca.
  titulo.classList.add('hero-pronto')

  // No fim, desfaz os <span> e o título volta a ser texto puro
  Promise.all(animacoes.map((a) => a.finished))
    .catch(() => {})
    .then(() => {
      letras.forEach(({ el }) => el.replaceWith(el.firstChild))
      titulo.normalize()
      titulo.removeAttribute('aria-label')
    })
}

// Troca cada letra do título por um <span class="hero-letra">. Os espaços
// continuam texto comum, então as quebras de linha ficam iguais.
function separarLetras(titulo) {
  const textos = []
  const andar = document.createTreeWalker(titulo, NodeFilter.SHOW_TEXT)
  while (andar.nextNode()) textos.push(andar.currentNode)

  const letras = []
  textos.forEach((no) => {
    const destaque = Boolean(no.parentElement.closest('.destaque'))
    const pedacos = document.createDocumentFragment()
    for (const caractere of no.nodeValue) {
      if (/\s/.test(caractere)) {
        pedacos.appendChild(document.createTextNode(caractere))
        continue
      }
      const el = document.createElement('span')
      el.className = 'hero-letra'
      el.setAttribute('aria-hidden', 'true')
      el.textContent = caractere
      pedacos.appendChild(el)
      letras.push({ el, destaque })
    }
    no.parentNode.replaceChild(pedacos, no)
  })
  return letras
}
