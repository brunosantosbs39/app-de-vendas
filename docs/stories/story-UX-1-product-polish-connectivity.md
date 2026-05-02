# Story: UX-1 - Polimento Geral de UI, Conexao e Fluxos Essenciais

**Status:** Done
**Agent Responsavel:** @dev (Codex)

## Contexto
O app voltou a renderizar estilos, mas paginas essenciais ainda estao pouco ergonomicas: dashboard com poucos indicadores, clientes sem cadastro rapido, ausencia de status claro de conexao e estados vazios pouco acionaveis.

## Objetivos
1. Melhorar shell global com indicacao de online/offline/sincronizacao.
2. Deixar Dashboard mais util para decisao diaria.
3. Melhorar Clientes com busca, KPIs, estado vazio e cadastro rapido.
4. Preservar escopo existente de vendas/CRM sem inventar modulos novos.

## Criterios de Aceitacao

- [x] Header mostra status de conexao de forma discreta.
- [x] Dashboard exibe KPIs adicionais derivados dos dados existentes.
- [x] Dashboard tem lista de ultimas vendas e estado vazio acionavel.
- [x] Clientes permite buscar e cadastrar cliente basico.
- [x] Clientes exibe KPIs, cards informativos e estado vazio.
- [x] `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` passam.

## File List

- [x] `docs/stories/story-UX-1-product-polish-connectivity.md`
- [x] `src/components/layout/ConnectionStatus.tsx`
- [x] `src/components/layout/Header.tsx`
- [x] `src/app/DashboardClient.tsx`
- [x] `src/app/clientes/ClientesClient.tsx`
