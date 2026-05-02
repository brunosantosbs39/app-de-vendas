# Story: UI-1 - Refinamento de Layout, Responsividade e Acessibilidade Mobile

**Status:** Done
**Agent Responsável:** @dev (Dex)

## Contexto
O usuário reportou problemas de layout, responsividade em dispositivos móveis, tamanhos de tipografia inadequados e falta de contraste/visibilidade. O app atual mistura elementos muito grandes (fontes 6xl) com espaçamentos fixos que não se adaptam bem a telas pequenas, além de problemas de contraste no Header e em textos auxiliares.

## Objetivos
1.  **Harmonização de Cores e Contraste:** Ajustar o Header para o modo escuro e melhorar a legibilidade de textos secundários.
2.  **Escala Tipográfica Responsiva:** Reduzir tamanhos de fonte em mobile para evitar quebras de layout.
3.  **Otimização de Espaçamento:** Ajustar paddings e gaps para mobile (ex: de p-10 para p-6).
4.  **Acessibilidade:** Garantir que o contraste atenda aos padrões WCAG para textos críticos.

## Critérios de Aceitação

### 1. Header (Acessibilidade e Contraste)
- [x] Mudar o fundo do `Header.tsx` de `bg-white/80` para `bg-[#0F0F0F]/80`.
- [x] Alterar o texto e ícones do Header para `text-[#F8F8F8]`.
- [x] Remover a borda inferior clara ou trocar por `border-white/10`.
- [x] O ícone do dashboard deve usar a cor `primary` (#5DD62C) em vez de `blue-600`.

### 2. Dashboard (Responsividade e Tipografia)
- [x] **Visão Geral (h2):** Mudar de `text-5xl` para `text-3xl` em mobile e `text-5xl` em desktop.
- [x] **Lucro Líquido (Valor):** Mudar de `text-6xl` para `text-4xl` em mobile.
- [x] **Textos Secundários:** Mudar classes `text-slate-500` e `text-slate-400` para cores com mais contraste onde necessário (ex: `text-slate-400` ou `text-slate-300`).
- [x] **Paddings:** Reduzir `p-10` e `p-8` nos cards para `p-6` em dispositivos móveis (`sm:p-10 p-6`).

### 3. Global CSS
- [x] Revisar a classe `.btn-primary`: reduzir altura (`h-16` para `h-14`) e tamanho da fonte em mobile.
- [x] Revisar `.card-morph`: ajustar padding para ser responsivo.

## Instruções Técnicas
- Use as variantes responsivas do Tailwind (`sm:`, `md:`, `lg:`).
- Mantenha a estética "Dark Luxury", mas prioritize a leitura.
- Teste a visibilidade das "letras" (font-weight e contrast-ratio).

## Próximos Passos
- @dev deve executar as alterações em `appdevendas/src/components/layout/Header.tsx`, `appdevendas/src/app/page.tsx` e `appdevendas/src/app/globals.css`.
