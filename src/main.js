// =========================================================
// Ponto de entrada da página "em breve" (branch em-breve).
// Só a tela de carregamento, rodando sem parar, e o texto fixo.
// O site completo está na branch main.
// =========================================================

// ---------- Fontes (Fontsource): só as usadas nesta página ----------
import '@fontsource/space-grotesk/600.css' // nome "princípio.web"
import '@fontsource/jetbrains-mono/400.css' // texto "// em breve", @ e e-mail
import '@fontsource/jetbrains-mono/500.css' // símbolos e o <P/>

// ---------- Estilos ----------
import './styles/tokens.css' // variáveis da marca
import './styles/base.css' // reset, tipografia, grade de fundo
import './styles/components.css' // cores do logo (.logo__seta, .logo__barra)
import './styles/sections.css' // tela de carregamento e página "em breve"

// ---------- Efeito ----------
import { iniciarLoader } from './js/loader.js'

iniciarLoader()
