# Story: UI-3 - Refinamento de Ícones e Funcionalidade de Meta

**Status:** Ready for Dev
**Agent Responsável:** @dev (Dex)

## Contexto
O usuário solicitou a correção visual do ícone de Finanças para refletir melhor sua categoria (dinheiro em vez de chat) e a adição de interatividade na seção de Meta de Vendas para permitir alterações.

## Objetivos
1.  **Atualização de Iconografia:** Substituir o ícone de "Finanças" no `BottomNav` por uma representação de cédula/dinheiro.
2.  **Interatividade de Meta:** Adicionar um botão de edição na seção de Meta do Dashboard.

## Critérios de Aceitação

### 1. Navegação (components/layout/BottomNav.tsx)
- [ ] Trocar o ícone do item "Finanças" de `MessageCircle` para `Banknote` (ou `DollarSign` se preferir).
- [ ] Garantir que o rótulo continue sendo "Finanças".

### 2. Dashboard (app/page.tsx)
- [ ] Na seção "Meta de Vendas", adicionar um `Button` (variante `ghost` ou `outline` pequena) com o ícone `Settings2` ou `Edit3` para permitir a alteração da meta.
- [ ] O botão deve estar posicionado de forma elegante ao lado do título "Meta de Vendas".

## Instruções Técnicas
- Utilize os ícones da biblioteca `lucide-react`.
- Para o botão de meta, mantenha o estilo luxuoso do dashboard: `text-primary` e `hover:bg-primary/10`.

## Próximos Passos
- @dev deve editar `appdevendas/src/components/layout/BottomNav.tsx` e `appdevendas/src/app/page.tsx`.
