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
import { iniciarLoader } from './js/loader.js'

// 1. Tela de carregamento (só na primeira visita da sessão)
iniciarLoader()
