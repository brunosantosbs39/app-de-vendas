# Story: UI-4 - Funcionalidade de Edição de Meta no Dashboard

**Status:** Done
**Agent Responsável:** @dev (Dex)

## Contexto
O botão "Alterar Meta" no Dashboard foi adicionado visualmente, mas não possui funcionalidade. O usuário deseja que o botão permita alterar o valor da meta real (R$ 10.000) de forma interativa.

## Objetivos
1.  **Estado da Meta:** Criar um estado local (`useState`) para gerenciar o valor da meta e o valor atual de vendas.
2.  **Diálogo de Edição:** Implementar um Modal (Dialog) que abra ao clicar no botão "Alterar Meta", com campos para o usuário inserir o novo valor da meta.
3.  **Atualização Dinâmica:** Garantir que o progresso (porcentagem e barra) seja recalculado automaticamente ao alterar os valores.

## Critérios de Aceitação

### 1. Dashboard (app/page.tsx)
- [x] Refatorar a Meta de Vendas para usar um estado `goalValue` (ex: 10000) e `currentSales` (ex: 7500).
- [x] O componente `Dialog` deve conter um `Label` ("Nova Meta"), um `Input` (tipo numérico) e um `Button` ("Salvar").
- [x] Ao salvar no Dialog, o estado `goalValue` deve ser updated e o modal fechado.
- [x] A porcentagem exibida (ex: 75%) e a barra de progresso do Framer Motion devem refletir a nova proporção `(currentSales / goalValue) * 100`.

## Instruções Técnicas
- Utilize os componentes de `src/components/ui/dialog.tsx`, `input.tsx` e `label.tsx`.
- Formate os valores monetários no Dashboard usando `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Certifique-se de que o input aceite apenas números válidos.

## Próximos Passos
- @dev deve editar `appdevendas/src/app/page.tsx`.
