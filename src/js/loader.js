// =========================================================
// Tela de carregamento
// Símbolos de código trocam no centro da grade e formam o
// <P/>. A sequência se repete por 2,5 s, termina no logo,
// e então a tela é recortada e a página aparece.
// No modo infinito (página "em breve"), ela repete para sempre.
// =========================================================

import { gsap } from 'gsap'

// ---------- Tempos (em segundos): mude aqui para ajustar ----------
const PASSO = 0.15 // quanto tempo cada símbolo fica na tela
const SEGURA_LOGO = 0.2 // quanto tempo o logo fica antes de recomeçar
const DURACAO = 2.5 // quanto tempo a sequência roda antes do corte
const CORTE = 0.25 // duração do corte final

// Os símbolos de cada volta, na ordem
const SIMBOLOS = ['&lt;', '{ }', ';', '&lt;/&gt;']

// O fim de cada volta: o <P/> com as cores do logo
const LOGO =
  '<span class="logo__seta">&lt;</span>P<span class="logo__barra">/</span><span class="logo__seta">&gt;</span>'

/**
 * Roda a tela de carregamento, se o <html> tiver a classe "carregando".
 * Devolve uma Promise (uma "promessa" de aviso) que se cumpre quando a página
 * está visível. O próximo efeito, o título letra por letra, vai esperar por ela.
 *
 * @param {object} opcoes
 * @param {boolean} opcoes.infinito  true = repete para sempre, sem corte
 *                                   (página "em breve")
 */
export function iniciarLoader({ infinito = false } = {}) {
  const raiz = document.documentElement
  const loader = document.querySelector('.loader')

  // Sem a classe "carregando" (já viu nesta sessão, ou pediu menos movimento):
  // não há nada a fazer, a promessa já se cumpre na hora
  if (!raiz.classList.contains('carregando') || !loader) {
    return Promise.resolve()
  }

  const simbolo = loader.querySelector('.loader__simbolo')
  const nome = loader.querySelector('.loader__nome')

  // Mostra um símbolo cinza (e esconde o logo da volta anterior)
  function mostrarSimbolo(texto) {
    simbolo.innerHTML = texto
    simbolo.classList.remove('loader__simbolo--logo')
    nome.style.visibility = 'hidden'
  }

  // Mostra o <P/> nas cores do logo, com o nome embaixo
  function mostrarLogo() {
    simbolo.innerHTML = LOGO
    simbolo.classList.add('loader__simbolo--logo')
    nome.style.visibility = 'visible'
  }

  // Coloca uma volta (4 símbolos + logo) na linha do tempo, a partir de "inicio"
  function adicionarVolta(linha, inicio) {
    SIMBOLOS.forEach((texto, i) => {
      linha.call(mostrarSimbolo, [texto], inicio + i * PASSO)
    })
    linha.call(mostrarLogo, null, inicio + SIMBOLOS.length * PASSO)
  }

  // ---------- Modo infinito (página "em breve") ----------
  if (infinito) {
    // Quem pediu menos movimento vê o logo parado
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      mostrarLogo()
      return Promise.resolve()
    }

    // Uma volta só, com repeat: -1 (repetir para sempre)
    const linha = gsap.timeline({ repeat: -1 })
    adicionarVolta(linha, 0)
    // Um "tempo vazio" depois do logo, para ele ficar na tela antes de recomeçar
    linha.to({}, { duration: SEGURA_LOGO }, SIMBOLOS.length * PASSO)

    // A tela nunca sai, então a promessa nunca se cumpre
    return new Promise(() => {})
  }

  // ---------- Modo normal (site completo) ----------

  // Marca que esta sessão já viu a tela
  try {
    sessionStorage.setItem('principio-loader', 'visto')
  } catch {
    // Navegador bloqueou o armazenamento: a tela só aparece de novo na próxima visita
  }

  return new Promise((cumprir) => {
    // A timeline é uma linha do tempo: cada passo recebe o segundo em que acontece
    const linha = gsap.timeline({
      onComplete() {
        raiz.classList.remove('carregando') // esconde a tela e libera a rolagem
        cumprir()
      },
    })

    // Cada volta: 4 símbolos + o logo = 0,8 s.
    // Enquanto couber mais uma volta terminando no logo antes dos 2,5 s,
    // ela entra na linha do tempo. Com os tempos atuais, são 3 voltas
    // (logo em 0,6 s, 1,4 s e 2,2 s), e o último logo fica até o corte.
    const volta = SIMBOLOS.length * PASSO + SEGURA_LOGO
    for (let inicio = 0; inicio + SIMBOLOS.length * PASSO <= DURACAO; inicio += volta) {
      adicionarVolta(linha, inicio)
    }

    // 2,5 s: corte rápido. O clip-path recorta a tela de baixo para cima
    // (inset = quanto cortar de cima, direita, baixo, esquerda), e a página
    // que estava por baixo aparece.
    linha.fromTo(
      loader,
      { clipPath: 'inset(0% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 100% 0%)', duration: CORTE, ease: 'power3.inOut' },
      DURACAO,
    )
  })
}
