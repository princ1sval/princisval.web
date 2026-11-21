// =========================================================
// A esfera de caracteres (e o big bang)
// Um <canvas> fixo atrás da página inteira. No topo, ele desenha
// uma esfera de caracteres de "código" (< > / { } ; 0 1 ...)
// girando devagar atrás do título, em tons próximos da grade.
// Perto do cursor eles se agitam, trocam de símbolo e acendem
// em lima. No celular, uma "luz" passeia sozinha e o toque leva
// a luz para onde o dedo tocou.
//
// Big bang: o depth-scroll.js leva esfera.explosao de 0 a 1
// conforme a pessoa rola. Nesse caminho os caracteres:
//   0 → JUNTA: saem da esfera e se juntam no ponteiro do mouse
//   JUNTA → ESTOURA: viram uma bolinha apertada que pulsa, em lima
//   ESTOURA → 1: explodem e se espalham pela tela, apagando
// Em 1, ficam espalhados como um fundo discreto do resto do site
// (as seções de fundo liso cobrem; as de grade deixam ver).
// Rolou para cima, tudo volta.
//
// Cuidados de desempenho:
// - cada símbolo é desenhado UMA vez num "atlas" (uma folha
//   com todos os símbolos em todas as cores); a cada quadro
//   só copiamos pedaços dele (drawImage), que é bem rápido
// - no máximo FPS quadros por segundo
// - depois da explosão, só redesenha quando algo muda (o cursor
//   passou, a rolagem voltou): parado, o fundo não gasta nada
// - para com a aba escondida
// - com movimento reduzido: esfera parada, sem explosão
// =========================================================

import { introCortou } from './loader.js'

// Estado compartilhado: o depth-scroll.js anima esfera.explosao (0 → 1)
export const esfera = { explosao: 0 }

// ---------- Ajustes: mude aqui ----------
const CARACTERES = ['<', '>', '/', '{', '}', ';', '0', '1', '+', '=', '*', ':', '.']
const PONTOS = 1600 // quantos caracteres (computador)
const PONTOS_CELULAR = 750 // no celular
const FPS = 40 // limite de quadros por segundo (computador)
const FPS_CELULAR = 30
const LETRA = 13 // tamanho do caractere na frente da esfera, em px (computador)
const LETRA_CELULAR = 11
const GIRO = 0.06 // velocidade do giro, em radianos por segundo (uma volta a cada ~1min45)
const INCLINACAO = -0.38 // o quanto a esfera está inclinada para a frente (radianos)
const SEGUE_MOUSE = 0.18 // o quanto a esfera vira na direção do cursor (radianos)
const PERSPECTIVA = 3.2 // maior = mais "chapada"; menor = mais profundidade

// Posição e tamanho, em frações da área da abertura
const ESFERA = { centroY: 0.56, raio: 0.44 } // computador: atrás do título
const ESFERA_CELULAR = { centroY: 0.48, raio: 0.62 } // celular: um pouco maior que a largura

// A luz do cursor
const ALCANCE = 130 // raio da área que acende, em px
const ALCANCE_CELULAR = 95
const APAGA = 1.6 // quanto do brilho some por segundo depois que o cursor passa
const TREME = 3 // px que o caractere aceso treme
const TROCA = 0.22 // chance (por quadro) de um caractere aceso trocar de símbolo
const TOQUE_DURA = 1600 // ms que a luz fica onde o dedo tocou, antes de voltar a passear

// Big bang (frações do caminho de esfera.explosao, que vai de 0 a 1)
const JUNTA = 0.42 // até aqui, os caracteres se juntam no ponteiro
const ESTOURA = 0.55 // daqui em diante, explodem
const BOLINHA = 34 // raio da bolinha apertada, em px
const ESPALHA = 0.95 // o quanto se espalham: 1 = até as bordas da tela (alguns passam e somem)
const FUNDO_TOM_MAX = 4 // espalhados, usam só os tons mais apagados (0 a este)

// Cores: tons de "grade" (do fundo para a frente) e o lima
const TOM_FUNDO = '#151A1A' // atrás da esfera, quase sumindo
const TOM_FRENTE = '#39413F' // na frente, ainda discreto (o texto continua legível)
const LIMA = '#C6F432'
const NIVEIS_TOM = 8 // degraus de profundidade
const NIVEIS_LIMA = 7 // degraus do acender

/** Liga a esfera. Precisa de um <canvas class="esfera"> e da seção .abertura. */
export function iniciarEsfera() {
  const canvas = document.querySelector('canvas.esfera')
  const secao = document.querySelector('.abertura')
  if (!canvas || !secao || !canvas.getContext) return

  const parada = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const semMouse = window.matchMedia('(hover: none)').matches // celular e tablet
  const ctx = canvas.getContext('2d')

  // ---------- Estado ----------
  let largura = 0 // tamanho da tela (o canvas é fixo e cobre a tela)
  let altura = 0
  let raio = 0 // raio da esfera, em px
  let escala = 1 // escala do site (base.css: 80% no computador), para os caracteres acompanharem
  let dpr = 1
  let celular = false
  let pontos = []
  let atlas = null
  let angulo = 0
  let viraX = 0 // o quanto a esfera está virada na direção do cursor (suavizado)
  let viraY = 0
  let cursor = null // { x, y } na tela, ou null
  let foco = null // onde os caracteres se juntam (segue o cursor, suavizado)
  let toqueAte = 0 // até quando vale o último toque (celular)
  let rodando = false
  let ultimo = 0
  let relogio = 0 // tempo da animação em segundos (só anda enquanto roda)
  let sujo = true // algo mudou e precisa redesenhar
  let ultimaExplosao = -1

  // ---------- Tamanho do canvas (e do atlas) ----------
  function medir() {
    largura = document.documentElement.clientWidth // sem a barra de rolagem
    altura = window.innerHeight
    const eraCelular = celular
    celular = largura < 768 || semMouse
    escala = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1

    const conf = celular ? ESFERA_CELULAR : ESFERA
    raio = Math.min(largura, secao.offsetHeight * 1.6) * conf.raio

    dpr = Math.min(window.devicePixelRatio || 1, celular ? 1.5 : 2)
    canvas.width = Math.round(largura * dpr)
    canvas.height = Math.round(altura * dpr)
    if (!pontos.length || eraCelular !== celular) pontos = criarPontos(celular ? PONTOS_CELULAR : PONTOS)
    atlas = montarAtlas(dpr)
    sujo = true
    if (parada || !rodando) desenhar(0)
  }

  // ---------- Os pontos ----------
  // Na esfera: espalhados por igual (espiral de Fibonacci).
  // Cada um também sorteia seu lugar na bolinha e seu destino na explosão.
  function criarPontos(total) {
    const lista = []
    const ouro = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < total; i++) {
      const y = 1 - (i / (total - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const a = ouro * i
      const bolaA = Math.random() * Math.PI * 2
      const bolaR = Math.sqrt(Math.random())
      const fugaA = Math.random() * Math.PI * 2
      const fugaR = 0.08 + Math.sqrt(Math.random()) // mais longe = mais rápido, como numa explosão
      lista.push({
        x: Math.cos(a) * r,
        y,
        z: Math.sin(a) * r,
        bolaX: Math.cos(bolaA) * bolaR, // lugar na bolinha (disco de raio 1)
        bolaY: Math.sin(bolaA) * bolaR,
        fugaX: Math.cos(fugaA) * fugaR, // destino da explosão, a partir do meio da tela
        fugaY: Math.sin(fugaA) * fugaR,
        tom: Math.floor(Math.random() * (FUNDO_TOM_MAX + 1)), // cor depois de espalhado
        simbolo: Math.floor(Math.random() * CARACTERES.length),
        brilho: 0, // 0 = apagado; 1 = lima forte
      })
    }
    return lista
  }

  // ---------- O atlas: todos os símbolos em todas as cores, desenhados uma vez ----------
  const CELULA = 28 // tamanho de cada quadradinho do atlas, em px (antes do dpr)
  const cores = [
    ...degraus(TOM_FUNDO, TOM_FRENTE, NIVEIS_TOM),
    ...degraus(TOM_FRENTE, LIMA, NIVEIS_LIMA + 1).slice(1),
  ]

  function montarAtlas(ampliacao) {
    const lado = Math.ceil(CELULA * ampliacao)
    const folha = document.createElement('canvas')
    folha.width = lado * CARACTERES.length
    folha.height = lado * cores.length
    const f = folha.getContext('2d')
    f.font = `400 ${Math.round(lado * 0.72)}px "JetBrains Mono", ui-monospace, monospace`
    f.textAlign = 'center'
    f.textBaseline = 'middle'
    cores.forEach((cor, linha) => {
      f.fillStyle = cor
      CARACTERES.forEach((c, coluna) => f.fillText(c, coluna * lado + lado / 2, linha * lado + lado / 2))
    })
    return { folha, lado }
  }

  // ---------- Um quadro ----------
  // Devolve true se algum caractere ainda está aceso (para saber se precisa redesenhar)
  function desenhar(dt) {
    const conf = celular ? ESFERA_CELULAR : ESFERA
    const caixa = secao.getBoundingClientRect() // a esfera acompanha a abertura na tela
    const cx = largura / 2
    const cy = caixa.top + caixa.height * conf.centroY
    const letra = (celular ? LETRA_CELULAR : LETRA) * escala
    const alcance = (celular ? ALCANCE_CELULAR : ALCANCE) * escala
    const e = parada ? 0 : esfera.explosao

    // Onde os caracteres se juntam: no cursor; sem cursor, no meio do título
    const alvoFoco = cursor && !semMouse ? cursor : { x: cx, y: altura * 0.45 }
    if (!foco) foco = { ...alvoFoco }
    const segue = 1 - Math.exp(-dt * 6)
    foco.x += (alvoFoco.x - foco.x) * segue
    foco.y += (alvoFoco.y - foco.y) * segue

    // As três fases do big bang (cada uma de 0 a 1)
    const junta = suavizar(Math.min(1, e / JUNTA)) // esfera → bolinha
    const estoura = e <= ESTOURA ? 0 : saidaRapida((e - ESTOURA) / (1 - ESTOURA)) // bolinha → espalhados
    const naBolinha = e > JUNTA && e < ESTOURA
    // a bolinha pulsa um pouco enquanto está apertada
    const pulso = naBolinha ? 1 + 0.12 * Math.sin(relogio * 22) : 1
    const bolinha = BOLINHA * escala * pulso
    const calorBigBang = e < ESTOURA ? junta : 1 - estoura // acende ao juntar, apaga ao espalhar

    // De onde vem a luz: o cursor, o último toque ou o passeio sozinho (celular)
    let luz = cursor
    if (semMouse && !parada && performance.now() > toqueAte) {
      luz = {
        x: cx + raio * 0.55 * Math.sin(relogio * 0.31),
        y: cy - raio * 0.35 + raio * 0.3 * Math.sin(relogio * 0.19 + 1.3),
      }
    }

    // A esfera vira um pouco na direção do cursor (só no computador)
    const alvoX = cursor && !semMouse ? ((cursor.y - cy) / altura) * SEGUE_MOUSE : 0
    const alvoY = cursor && !semMouse ? ((cursor.x - cx) / largura) * SEGUE_MOUSE : 0
    const suave = 1 - Math.exp(-dt * 3)
    viraX += (alvoX - viraX) * suave
    viraY += (alvoY - viraY) * suave

    const giro = angulo + viraY
    const inclina = INCLINACAO + viraX
    const cg = Math.cos(giro)
    const sg = Math.sin(giro)
    const ci = Math.cos(inclina)
    const si = Math.sin(inclina)
    const { folha, lado } = atlas
    let aceso = false

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, largura, altura)

    for (const p of pontos) {
      // 1. Onde o ponto está na esfera: gira em volta do eixo vertical e inclina para a frente
      const x1 = p.x * cg + p.z * sg
      const z1 = -p.x * sg + p.z * cg
      const y2 = p.y * ci - z1 * si
      const z2 = p.y * si + z1 * ci // -1 = atrás, 1 = na frente
      const perto = PERSPECTIVA / (PERSPECTIVA - z2)
      let sx = cx + x1 * raio * perto
      let sy = cy + y2 * raio * perto

      // 2. Big bang: da esfera para a bolinha, e da bolinha para o destino espalhado
      const bx = foco.x + p.bolaX * bolinha
      const by = foco.y + p.bolaY * bolinha
      if (estoura > 0) {
        const fx = largura / 2 + p.fugaX * (largura / 2) * ESPALHA * 1.15
        const fy = altura / 2 + p.fugaY * (altura / 2) * ESPALHA * 1.15
        sx = bx + (fx - bx) * estoura
        sy = by + (fy - by) * estoura
      } else if (junta > 0) {
        sx += (bx - sx) * junta
        sy += (by - sy) * junta
      }
      if (sx < -20 || sx > largura + 20 || sy < -20 || sy > altura + 20) continue

      // 3. Luz do cursor: acende quem está perto (na esfera, só a metade da frente)
      if (!parada) {
        let alvo = 0
        if (luz && (e > 0 || z2 > -0.1)) {
          const d = Math.hypot(sx - luz.x, sy - luz.y)
          if (d < alcance) {
            const t = 1 - d / alcance
            alvo = t * t * (3 - 2 * t) // suaviza a borda
          }
        }
        p.brilho = Math.max(alvo, p.brilho - APAGA * dt)
      }

      // 4. Cor e tamanho
      const b = Math.max(p.brilho, calorBigBang)
      let cor
      if (b > 0.06) {
        aceso = aceso || p.brilho > 0.01
        cor = NIVEIS_TOM + Math.min(NIVEIS_LIMA - 1, Math.floor(b * NIVEIS_LIMA))
        // agitado: treme e troca de símbolo
        sx += (Math.random() - 0.5) * TREME * 2 * b
        sy += (Math.random() - 0.5) * TREME * 2 * b
        if (Math.random() < TROCA * b) p.simbolo = Math.floor(Math.random() * CARACTERES.length)
      } else if (e >= ESTOURA) {
        cor = p.tom // espalhado: tom apagado, de fundo
      } else {
        cor = Math.min(NIVEIS_TOM - 1, Math.floor(((z2 + 1) / 2) * NIVEIS_TOM)) // profundidade na esfera
      }

      // apertados na bolinha, ficam menores; espalhados, voltam ao normal
      const encolhe = e < ESTOURA ? 1 - junta * 0.45 : 0.55 + 0.45 * estoura
      const profundidade = e < ESTOURA ? perto + (1 - perto) * junta : 1
      const tam = (letra / 0.72) * profundidade * encolhe * (1 + p.brilho * 0.25)
      ctx.drawImage(folha, p.simbolo * lado, cor * lado, lado, lado, sx - tam / 2, sy - tam / 2, tam, tam)
    }
    return aceso
  }

  // ---------- O laço da animação ----------
  let aceso = false
  function quadro(agora) {
    if (!rodando) return
    requestAnimationFrame(quadro)
    const intervalo = 1000 / (celular ? FPS_CELULAR : FPS)
    if (agora - ultimo < intervalo - 2) return // ainda não deu a hora do próximo quadro
    const dt = Math.min((agora - ultimo) / 1000, 0.1) // se travar, não dá um salto
    ultimo = agora
    relogio += dt

    // Depois da explosão, os caracteres ficam parados: só redesenha se algo mudou
    const e = esfera.explosao
    const parado = e >= 0.999 && ultimaExplosao >= 0.999 && !sujo && !aceso
    ultimaExplosao = e
    if (parado) return
    if (e < 0.999) angulo += GIRO * dt // a esfera só gira enquanto existe
    sujo = false
    aceso = desenhar(dt)
  }

  function ligar() {
    if (rodando || parada || document.hidden) return
    rodando = true
    ultimo = performance.now()
    requestAnimationFrame(quadro)
  }

  function desligar() {
    rodando = false
  }

  // ---------- Começo ----------
  // Espera a fonte dos caracteres para o atlas não sair com a fonte reserva
  const fonte = document.fonts ? document.fonts.load('400 16px "JetBrains Mono"').catch(() => {}) : Promise.resolve()
  fonte.then(() => {
    medir()
    window.addEventListener('resize', medir)

    if (parada) {
      // Movimento reduzido: esfera parada, redesenhada só quando a página rola
      // (o canvas é fixo, então a esfera precisa acompanhar a abertura)
      canvas.classList.add('esfera--ativa')
      let pedido = 0
      window.addEventListener(
        'scroll',
        () => {
          cancelAnimationFrame(pedido)
          pedido = requestAnimationFrame(() => desenhar(0))
        },
        { passive: true },
      )
      return
    }

    // Pausa com a aba escondida
    document.addEventListener('visibilitychange', () => (document.hidden ? desligar() : ligar()))
    // Rolar a página muda a posição da esfera: precisa redesenhar
    window.addEventListener('scroll', () => (sujo = true), { passive: true })

    // Cursor (computador) e toque (celular)
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
      cursor = { x: e.clientX, y: e.clientY }
      sujo = true
    })
    document.documentElement.addEventListener('pointerleave', () => {
      cursor = null // o mouse saiu da janela
      sujo = true
    })
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return
      cursor = { x: e.clientX, y: e.clientY }
      toqueAte = performance.now() + TOQUE_DURA
      sujo = true
    })

    // Aparece junto com a abertura (depois do corte da tela de carregamento)
    introCortou().then(() => canvas.classList.add('esfera--ativa'))
    ligar()
  })
}

// Curvas: começa e termina devagar / sai rápido e freia no fim (como uma explosão)
function suavizar(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function saidaRapida(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

// Cores intermediárias entre duas cores hex, em "total" degraus (inclui as duas pontas)
function degraus(de, ate, total) {
  const a = hexParaRgb(de)
  const b = hexParaRgb(ate)
  return Array.from({ length: total }, (_, i) => {
    const t = total === 1 ? 1 : i / (total - 1)
    const c = a.map((v, k) => Math.round(v + (b[k] - v) * t))
    return `rgb(${c[0]} ${c[1]} ${c[2]})`
  })
}

function hexParaRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
