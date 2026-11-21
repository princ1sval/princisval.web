// =========================================================
// Ponto de entrada do site: o Vite começa por aqui.
// Carrega fontes e estilos e inicia os efeitos.
// =========================================================

// ---------- Fontes (Fontsource) ----------
// Cada arquivo traz um peso só. Importar só os usados
// deixa o site mais leve.
import '@fontsource/space-grotesk/600.css' // títulos
import '@fontsource/inter/400.css' // texto
import '@fontsource/inter/500.css' // texto médio (botão secundário)
import '@fontsource/inter/600.css' // texto forte (botões, perguntas)
import '@fontsource/jetbrains-mono/400.css' // // comentários, numeração
import '@fontsource/jetbrains-mono/500.css' // símbolo <P/> do logo

// ---------- Estilos ----------
// A ordem importa: cada arquivo usa o que veio antes.
import './styles/tokens.css' // variáveis da marca
import './styles/base.css' // reset, tipografia, grade de fundo
import './styles/components.css' // botões, pílula, cards, botão flutuante
import './styles/sections.css' // estilos de cada seção

// ---------- Efeitos ----------
// 1. Tela de carregamento: roda direto do index.html (precisa estar na
//    tela antes deste arquivo baixar). Os efeitos da abertura esperam
//    o corte dela com introCortou(), do ./js/loader.js.
import { iniciarHero } from './js/hero.js'
import { iniciarEsfera } from './js/ascii-sphere.js'
import { iniciarProfundidade } from './js/depth-scroll.js'
import { iniciarPortfolio } from './js/portfolio.js'

// 2. Título acendendo letra por letra (começa junto com o corte da tela)
iniciarHero()

// 3. Esfera de caracteres ao fundo da abertura (aparece junto com o corte)
iniciarEsfera()

// 4. Rolagem com profundidade: o título encolhe e os prints se aproximam
iniciarProfundidade()

// 5. Portfólio: entrada, faixa que anda para o lado com a rolagem, setas e contador
//    (depois da profundidade: o ScrollTrigger calcula na ordem em que foi criado)
iniciarPortfolio()
