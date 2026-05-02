# Story: UI-5 - Correção de Sobreposição do Botão de Operação

**Status:** Done
**Agent Responsável:** @dev (Dex)

## Contexto
O botão principal de ação "NOVA OPERAÇÃO" no Dashboard está sendo parcialmente coberto pela `BottomNav` em dispositivos móveis. Embora exista um padding inferior, ele não está sendo suficiente para garantir que o botão fique totalmente visível e clicável acima da navegação fixa.

## Objetivos
1.  **Visibilidade Total:** Garantir que o botão "NOVA OPERAÇÃO" termine antes do início visual da `BottomNav`.
2.  **Ajuste de Scroll:** Permitir que o usuário consiga scrollar até o fim e ver o botão completo, sem interferência de transparência da barra inferior.

## Critérios de Aceitação

### 1. Dashboard (app/page.tsx)
- [x] Aumentar o `pb-32` no container principal para `pb-44` ou superior, garantindo folga para a `BottomNav` (que tem ~20rem de altura + padding).
- [x] Opcionalmente, adicionar uma `div` de respiro (`h-24`) após o botão para garantir o empurrão visual.

### 2. Estilo do Botão (app/page.tsx)
- [x] Adicionar um `z-index` relativo ao container do botão para garantir que ele não sofra interferências visuais de outros elementos de fundo, embora a `BottomNav` deva continuar com o maior `z-index` (`z-100`).

## Instruções Técnicas
- Verifique o impacto em telas menores. O objetivo é que o botão "NOVA OPERAÇÃO" apareça como o item final da lista, mas com espaço suficiente para não "mergulhar" atrás da barra de navegação.

## Próximos Passos
- @dev deve editar `appdevendas/src/app/page.tsx`.
