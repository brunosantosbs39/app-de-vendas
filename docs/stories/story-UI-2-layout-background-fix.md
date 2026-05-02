# Story: UI-2 - Correção de Fundo do Layout e Visibilidade da Navegação

**Status:** Done
**Agent Responsável:** @dev (Dex)

## Contexto
O app apresenta uma barra branca indesejada no rodapé (vazamento do fundo do body) e a navegação inferior (BottomNav) está visível em locais inadequados ou sem o devido isolamento após o login.

## Objetivos
1.  **Unificação do Tema de Fundo:** Garantir que o fundo do `body` seja o mesmo preto absoluto do app (#0F0F0F) para eliminar a "área sobrando" branca.
2.  **Controle de Visibilidade:** Garantir que a `BottomNav` apareça somente nas rotas internas do aplicativo.

## Critérios de Aceitação

### 1. Layout Global (app/layout.tsx)
- [x] Alterar `bg-slate-50` para `bg-[#0F0F0F]` no `body`.
- [x] Ajustar `text-slate-900` para `text-[#F8F8F8]` para manter a compatibilidade com o modo escuro globalmente.
- [x] Remover ou ajustar o `pb-16` do body se estiver causando espaçamento indesejado com a navegação fixa.

### 2. Navegação (components/layout/BottomNav.tsx)
- [x] Refinar a lógica de ocultação: Atualmente só oculta em `/login`. Deve-se garantir que não apareça em nenhuma tela de "boas-vindas" ou "auth" caso existam.
- [x] Ajustar o posicionamento para garantir que não haja "gap" entre o conteúdo e a barra de navegação.

## Instruções Técnicas
- O fundo branco visto na screenshot é o `bg-slate-50` do `RootLayout`.
- Verifique se a `BottomNav` possui um `z-index` adequado e se o `pb-16` no body é necessário para que o conteúdo não fique escondido atrás da barra fixa (se sim, o padding deve ter a cor correta).

## Próximos Passos
- @dev deve editar `appdevendas/src/app/layout.tsx` e `appdevendas/src/components/layout/BottomNav.tsx`.
