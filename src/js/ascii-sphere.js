// =========================================================
// Abertura: a esfera de caracteres
// Um <canvas> atrás do título com caracteres de "código"
// (< > / { } ; 0 1 ...) espalhados numa esfera que gira
// devagar, em tons próximos da grade. Perto do cursor eles
// se agitam, trocam de símbolo e acendem em lima.
// No celular: menos caracteres, uma "luz" que passeia sozinha
// e, ao tocar, a luz vai para onde o dedo tocou.
//
// Cuidados de desempenho:
// - cada símbolo é desenhado UMA vez num "atlas" (uma folha
//   com todos os símbolos em todas as cores); a cada quadro
//   só copiamos pedaços dele (drawImage), que é bem rápido
// - no máximo FPS quadros por segundo
// - para quando a abertura sai da tela ou a aba fica escondida
// - com movimento reduzido: desenha a esfera parada, uma vez
// =========================================================

import { introCortou } from './loader.js'

// ---------- Ajustes: mude aqui ----------
const CARACTERES = ['<', '>', '/', '{', '}', ';', '0', '1', '+', '=', '*', ':', '.']
const PONTOS = 1600 // quantos caracteres na esfera (computador)
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
const ESFERA = { centroY: 0.56, raio: 0.44 } // computador: atrás do título, metade da altura
const ESFERA_CELULAR = { centroY: 0.48, raio: 0.62 } // celular: um pouco maior que a largura, as bordas cortadas

// A luz do cursor
const ALCANCE = 130 // raio da área que acende, em px
const ALCANCE_CELULAR = 95
const APAGA = 1.6 // quanto do brilho some por segundo depois que o cursor passa
const TREME = 3 // px que o caractere aceso treme
const TROCA = 0.22 // chance (por quadro) de um caractere aceso trocar de símbolo
const TOQUE_DURA = 1600 // ms que a luz fica onde o dedo tocou, antes de voltar a passear

// Cores: tons de "grade" (do fundo para a frente) e o lima
const TOM_FUNDO = '#151A1A' // atrás da esfera, quase sumindo
const TOM_FRENTE = '#39413F' // na frente, ainda discreto (o texto continua legível)
const LIMA = '#C6F432'
const NIVEIS_TOM = 8 // degraus de profundidade
const NIVEIS_LIMA = 7 // degraus do acender

/** Liga a esfera. Precisa de um <canvas class="abertura__esfera"> dentro da .abertura. */
export function iniciarEsfera() {
  const canvas = document.querySelector('.abertura__esfera')
  const secao = canvas && canvas.closest('.abertura')
  if (!canvas || !secao || !canvas.getContext) return

  const parada = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const semMouse = window.matchMedia('(hover: none)').matches // celular e tablet
  const ctx = canvas.getContext('2d')

  // ---------- Estado ----------
  let largura = 0 // tamanho do canvas, em px
  let altura = 0
  let cx = 0 // centro e raio da esfera, em px dentro do canvas
  let cy = 0
  let raio = 0
  let escala = 1 // escala do site (base.css: 90% no computador), para os caracteres acompanharem
  let dpr = 1
  let celular = false
  let pontos = []
  let atlas = null
  let angulo = 0
  let viraX = 0 // o quanto a esfera está virada na direção do cursor (suavizado)
  let viraY = 0
  let cursor = null // { x, y } em px dentro do canvas, ou null
  let toqueAte = 0 // até quando vale o último toque (celular)
  let rodando = false
  let visivel = true
  let ultimo = 0
  let relogio = 0 // tempo da animação em segundos (só anda enquanto roda)

  // ---------- Tamanho do canvas (e do atlas) ----------
  // A esfera é posicionada pela abertura, mas o canvas pode passar dela:
  // sobe por trás do menu (até o topo da página) e desce sobre o espaço
  // dos prints, o quanto a esfera precisar. A parte de baixo esmaece (CSS).
  function medir() {
    const caixa = secao.getBoundingClientRect()
    const alturaSecao = caixa.height
    largura = caixa.width
    const eraCelular = celular
    celular = largura < 768 || semMouse
    escala = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1

    const conf = celular ? ESFERA_CELULAR : ESFERA
    raio = Math.min(largura, alturaSecao * 1.6) * conf.raio
    const centroNaSecao = alturaSecao * conf.centroY
    const folga = raio * 1.06 + LETRA * 2 // a perspectiva aumenta um pouco a borda
    const acima = Math.max(0, Math.min(caixa.top + window.scrollY, folga - centroNaSecao))
    const abaixo = Math.max(0, centroNaSecao + folga - alturaSecao)
    altura = acima + alturaSecao + abaixo
    cx = largura / 2
    cy = acima + centroNaSecao
    canvas.style.top = `${-acima}px`
    canvas.style.height = `${altura}px`
    // o esmaecer começa um pouco antes do fim da abertura e vai até o pé do canvas
    canvas.style.setProperty('--esfera-esmaece', `${((acima + alturaSecao * 0.85) / altura) * 100}%`)

    dpr = Math.min(window.devicePixelRatio || 1, celular ? 1.5 : 2)
    canvas.width = Math.round(largura * dpr)
    canvas.height = Math.round(altura * dpr)
    if (!pontos.length || eraCelular !== celular) pontos = criarPontos(celular ? PONTOS_CELULAR : PONTOS)
    atlas = montarAtlas(dpr)
    if (parada || !rodando) desenhar(0)
  }

  // ---------- Os pontos: espalhados por igual na esfera (espiral de Fibonacci) ----------
  function criarPontos(total) {
    const lista = []
    const ouro = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < total; i++) {
      const y = 1 - (i / (total - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const a = ouro * i
      lista.push({
        x: Math.cos(a) * r,
        y,
        z: Math.sin(a) * r,
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

  function montarAtlas(escala) {
    const lado = Math.ceil(CELULA * escala)
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
  function desenhar(dt) {
    const letra = (celular ? LETRA_CELULAR : LETRA) * escala
    const alcance = (celular ? ALCANCE_CELULAR : ALCANCE) * escala

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

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, largura, altura)

    for (const p of pontos) {
      // gira em volta do eixo vertical e depois inclina para a frente
      const x1 = p.x * cg + p.z * sg
      const z1 = -p.x * sg + p.z * cg
      const y2 = p.y * ci - z1 * si
      const z2 = p.y * si + z1 * ci // -1 = atrás, 1 = na frente

      const perto = PERSPECTIVA / (PERSPECTIVA - z2)
      let sx = cx + x1 * raio * perto
      let sy = cy + y2 * raio * perto
      if (sx < -20 || sx > largura + 20 || sy < -20 || sy > altura + 20) continue

      // Luz: acende quem está perto dela (só a metade da frente) e vai apagando devagar
      if (!parada) {
        let alvo = 0
        if (luz && z2 > -0.1) {
          const d = Math.hypot(sx - luz.x, sy - luz.y)
          if (d < alcance) {
            const t = 1 - d / alcance
            alvo = t * t * (3 - 2 * t) // suaviza a borda
          }
        }
        p.brilho = Math.max(alvo, p.brilho - APAGA * dt)
      }

      const b = p.brilho
      let cor
      if (b > 0.06) {
        cor = NIVEIS_TOM + Math.min(NIVEIS_LIMA - 1, Math.floor(b * NIVEIS_LIMA))
        // agitado: treme e troca de símbolo
        sx += (Math.random() - 0.5) * TREME * 2 * b
        sy += (Math.random() - 0.5) * TREME * 2 * b
        if (Math.random() < TROCA * b) p.simbolo = Math.floor(Math.random() * CARACTERES.length)
      } else {
        cor = Math.min(NIVEIS_TOM - 1, Math.floor(((z2 + 1) / 2) * NIVEIS_TOM))
      }

      const tam = (letra / 0.72) * perto * (1 + b * 0.25) // tamanho do quadradinho na tela
      ctx.drawImage(folha, p.simbolo * lado, cor * lado, lado, lado, sx - tam / 2, sy - tam / 2, tam, tam)
    }
  }

  // ---------- O laço da animação ----------
  function quadro(agora) {
    if (!rodando) return
    requestAnimationFrame(quadro)
    const intervalo = 1000 / (celular ? FPS_CELULAR : FPS)
    if (agora - ultimo < intervalo - 2) return // ainda não deu a hora do próximo quadro
    const dt = Math.min((agora - ultimo) / 1000, 0.1) // se travar, não dá um salto
    ultimo = agora
    relogio += dt
    angulo += GIRO * dt
    desenhar(dt)
  }

  function ligar() {
    if (rodando || parada || !visivel || document.hidden) return
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
    new ResizeObserver(() => medir()).observe(secao)

    if (parada) {
      canvas.classList.add('abertura__esfera--ativa')
      return
    }

    // Pausa quando a esfera sai da tela ou a aba fica escondida
    new IntersectionObserver(([item]) => {
      visivel = item.isIntersecting
      visivel ? ligar() : desligar()
    }).observe(canvas)
    document.addEventListener('visibilitychange', () => (document.hidden ? desligar() : ligar()))

    // Cursor (computador) e toque (celular). Ouve a janela toda, porque a
    // esfera passa da abertura (o menu e o espaço dos prints também contam).
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') cursor = posicao(e)
    })
    document.documentElement.addEventListener('pointerleave', () => {
      cursor = null // o mouse saiu da janela
    })
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return
      cursor = posicao(e)
      toqueAte = performance.now() + TOQUE_DURA
    })

    // Aparece junto com a abertura (depois do corte da tela de carregamento)
    introCortou().then(() => canvas.classList.add('abertura__esfera--ativa'))
    ligar()
  })

  function posicao(e) {
    const caixa = canvas.getBoundingClientRect()
    return { x: e.clientX - caixa.left, y: e.clientY - caixa.top }
  }
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
