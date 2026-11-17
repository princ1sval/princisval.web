// =========================================================
// Ponto de entrada do site: o Vite começa por aqui.
// Nesta etapa só carrega fontes e estilos. Os efeitos
// (loader, esfera, profundidade, portfólio) entram depois.
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
import './styles/components.css' // botões, pílula, cards (próxima etapa)
import './styles/sections.css' // estilos de cada seção (próxima etapa)
