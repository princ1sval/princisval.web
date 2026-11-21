// =========================================================
// Página "em breve": a tela de carregamento em looping
// A mesma animação da main (< → { } → ; → </> → <P/> com
// "princípio.web"), só que em vez do corte ela some e
// recomeça, para sempre. Usa a Web Animations API
// (elemento.animate): o navegador anima fora da linha
// principal, então o ritmo não engasga.
// =========================================================

// ---------- Tempos (ms): mude aqui para ajustar ----------
const BATIDA = 150 // de quanto em quanto tempo o símbolo troca
const POP = 90 // duração do "pop" de cada símbolo novo...
const POP_ESCALA = 0.94 // ...que nasce com 94% do tamanho
const POP_OPACIDADE = 0.6 // ...e 60% de opacidade
const LUZ = 140 // a célula do centro acende e apaga a cada batida
const ABRE = 260 // o </> se abrindo em <P/>
const P_ATRASO = 50 // o P espera o < e o /> abrirem espaço
const P_SOBE = 8 // px que o P sobe ao entrar
const P_DURACAO = 280
const NOME_ATRASO = 60 // o "princípio.web" entra logo depois do P
const NOME_SOBE = 6 // px
const NOME_DURACAO = 400
const SEGURA = 1200 // quanto tempo o logo fica na tela antes de recomeçar
const SAI = 300 // o logo sumindo antes da próxima volta

// ---------- Curvas ----------
const ENTRA = 'cubic-bezier(0.16, 1, 0.3, 1)' // entradas
const MOVE = 'cubic-bezier(0.65, 0, 0.35, 1)' // movimentos que começam e terminam parados
const ENCAIXA = 'cubic-bezier(0.34, 1.56, 0.64, 1)' // encaixes, com overshoot sutil

/** Liga a animação em looping. Com movimento reduzido, o CSS já mostra o logo parado. */
export function iniciarLoader() {
  const palco = document.querySelector('.intro__palco')
  if (!palco || !palco.animate) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const celula = palco.querySelector('.intro__celula')
  const simbolos = palco.querySelectorAll('.intro__simbolo') // <, { }, ;
  const tag = palco.querySelector('.intro__tag')
  const nome = palco.querySelector('.intro__nome')
  const abre = tag.querySelector('.intro__abre')
  const p = tag.querySelector('.intro__p')
  const fecha = tag.querySelector('.intro__fecha')
  const barra = tag.querySelector('.intro__barra')

  // Na 1ª volta o "<" já está na tela (CSS); depois ele passa a ser animado
  simbolos[0].classList.remove('intro__simbolo--primeiro')

  // Uma volta: < (0) → { } (150) → ; (300) → </> (450) → <P/> (600) → segura → some
  function volta() {
    const tTag = 3 * BATIDA
    const tLogo = tTag + BATIDA
    const tSai = tLogo + SEGURA
    const animacoes = []
    const anima = (el, quadros, tempo) => {
      // fill 'forwards': antes da vez dele, vale o CSS (escondido / o </> fechado);
      // depois, fica no último quadro até a volta acabar
      animacoes.push(el.animate(quadros, { fill: 'forwards', ...tempo }))
    }

    // Os três símbolos, um em cada batida: surge com o pop e some seco na troca
    simbolos.forEach((el, n) => {
      anima(el, [
        { opacity: POP_OPACIDADE, transform: `scale(${POP_ESCALA})`, easing: ENTRA },
        { opacity: 1, transform: 'none', offset: POP / BATIDA },
        { opacity: 1, transform: 'none' },
      ], { delay: n * BATIDA, duration: BATIDA, fill: 'none' })
    })

    // A célula atrás do símbolo acende de leve a cada batida (inclusive no </> e no logo)
    for (let t = 0; t <= tLogo; t += BATIDA) {
      anima(celula, [{ opacity: 1, easing: MOVE }, { opacity: 0 }], { delay: t, duration: LUZ, fill: 'none' })
    }

    // </>: o < e o /> ainda juntos (o P escondido no meio)
    anima(tag, [
      { opacity: POP_OPACIDADE, transform: `scale(${POP_ESCALA})` },
      { opacity: 1, transform: 'none' },
    ], { delay: tTag, duration: POP, easing: ENTRA })

    // O </> se abre: < para a esquerda, /> para a direita, a barra estica e o P sobe
    const abrir = { delay: tLogo, duration: ABRE, easing: ENCAIXA }
    const fechado = getComputedStyle(palco).getPropertyValue('--intro-fechado').trim()
    anima(abre, [{ transform: `translateX(${fechado})` }, { transform: 'none' }], abrir)
    anima(fecha, [{ transform: `translateX(-${fechado})` }, { transform: 'none' }], abrir)
    anima(barra, [{ transform: 'none' }, { transform: 'scaleY(1.18) skewX(-8deg)' }], abrir)
    anima(p, [
      { opacity: 0, transform: `translateY(${P_SOBE}px)` },
      { opacity: 1, transform: 'none' },
    ], { delay: tLogo + P_ATRASO, duration: P_DURACAO, easing: ENTRA })
    anima(nome, [
      { opacity: 0, transform: `translateY(${NOME_SOBE}px)` },
      { opacity: 1, transform: 'none' },
    ], { delay: tLogo + P_ATRASO + NOME_ATRASO, duration: NOME_DURACAO, easing: ENTRA })

    // Depois de um tempo, o logo some de uma vez e a volta recomeça
    const saida = palco.animate([{ opacity: 1 }, { opacity: 0 }], { delay: tSai, duration: SAI, easing: MOVE })
    saida.finished.then(() => {
      animacoes.forEach((a) => a.cancel()) // volta tudo ao estado do CSS (o </> fechado)
      volta()
    })
  }

  volta()
}
