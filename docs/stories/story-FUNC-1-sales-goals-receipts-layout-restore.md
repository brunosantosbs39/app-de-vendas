# Story: FUNC-1 - Restaurar Fluxos de Meta, Venda no Cliente e Recibo

**Status:** Done
**Agent Responsavel:** @dev (Codex)

## Contexto
O usuario informou que o app estava sem funcoes importantes que existiam no layout esperado: definir meta do usuario, adicionar venda dentro do cliente, gerar recibo PDF de vendas programadas e manter visual proximo aos prints enviados.

## Objetivos
1. Reativar meta mensal no dashboard.
2. Reativar perfil/detalhe do cliente com historico financeiro.
3. Permitir adicionar venda diretamente no cliente.
4. Gerar recibo PDF para venda comum ou programada.
5. Aproximar Comunidade do layout visual dos prints.

## Criterios de Aceitacao

- [x] Dashboard permite definir/salvar meta mensal.
- [x] Dashboard exibe progresso da meta.
- [x] Cliente abre modal de detalhe com LTV, saldo devedor e historico.
- [x] Cliente permite registrar venda e parcelas pendentes.
- [x] Venda gera recibo PDF usando `pdfGenerator`.
- [x] Historico do cliente permite gerar recibo PDF novamente.
- [x] Comunidade recebeu layout com header de tribo, stories e CTA flutuante.

## File List

- [x] `docs/stories/story-FUNC-1-sales-goals-receipts-layout-restore.md`
- [x] `src/app/DashboardClient.tsx`
- [x] `src/app/clientes/ClientesClient.tsx`
- [x] `src/app/comunidade/ComunidadeClient.tsx`

