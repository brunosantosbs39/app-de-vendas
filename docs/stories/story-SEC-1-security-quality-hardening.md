# Story: SEC-1 - Hardening de Seguranca e Quality Gates

**Status:** Done
**Agent Responsavel:** @dev (Codex)

## Contexto
Analise do app identificou riscos em isolamento multi-tenant, endpoint JARVIS confiando em `userId` vindo do cliente, cache offline compartilhado entre usuarios e quality gates incompletos.

## Objetivos
1. Fortalecer autenticacao server-side do endpoint JARVIS.
2. Escopar leituras, updates, deletes e cache offline por usuario autenticado.
3. Corrigir os quality gates (`lint`, `typecheck`, `test`) para serem executaveis.
4. Manter build de producao funcionando.

## Criterios de Aceitacao

- [x] `POST /api/jarvis` deriva o usuario da sessao Supabase no servidor.
- [x] Consultas client-side sensiveis usam `user_id` quando ha usuario autenticado.
- [x] Mutacoes de estoque combinam `id` e `user_id` em update/delete.
- [x] Cache offline e fila de sincronizacao sao filtrados por usuario.
- [x] `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` executam sem falhas.

## File List

- [x] `package.json`
- [x] `eslint.config.mjs`
- [x] `docs/stories/story-SEC-1-security-quality-hardening.md`
- [x] `src/app/api/jarvis/route.ts`
- [x] `src/app/layout.tsx`
- [x] `src/app/estoque/EstoqueClient.tsx`
- [x] `src/components/layout/Sidebar.tsx`
- [x] `src/hooks/useClients.ts`
- [x] `src/hooks/useFinance.ts`
- [x] `src/hooks/useIntelligence.ts`
- [x] `src/hooks/useOrders.ts`
- [x] `src/hooks/useProducts.ts`
- [x] `src/hooks/useSyncManager.ts`
- [x] `src/lib/offlineStore.ts`
- [x] `src/types/framer-motion.d.ts`
