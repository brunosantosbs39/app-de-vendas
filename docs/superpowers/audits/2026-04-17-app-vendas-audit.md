# Auditoria — App de Vendas (Sistema Elite)

**Data:** 2026-04-17
**Branch:** master
**Escopo:** Varredura completa do repositório `appdevendas` com ênfase em UI/UX.
**Status:** DRAFT — Fase 1 (audit). Fase 2 (implementação) será destrinchada em stories após aprovação.

---

## 1. Sumário executivo

O app é um CRM de campo para consultores de venda direta (cosméticos/nutrição), com dashboard, agenda, clientes, estoque, financeiro, comunidade, treinamentos, WhatsApp e um assistente de voz ("Jarvis"). A stack (Next.js 16, React 19, Tailwind v4, Supabase, Framer Motion) está moderna e a identidade visual (dark + neon `#5DD62C`) tem personalidade. Porém o app **não está pronto para produção** — abaixo os três blockers críticos:

### Top 3 P0 (blockers)

| # | Problema | Arquivo | Risco |
|---|----------|---------|-------|
| P0-1 | **Middleware de autenticação desativado** — todas as rotas protegidas acessíveis sem login. | [src/middleware.ts](src/middleware.ts) | Qualquer usuário acessa `/clientes`, `/financeiro`, `/comunidade` sem credencial. |
| P0-2 | **RLS inconsistente no Supabase** — `clients`, `products`, `orders`, `order_items`, `appointments`, `whatsapp_templates` **sem Row Level Security**. | [supabase_schema.sql](supabase_schema.sql) | Com `anon key` no client, qualquer sessão lê/escreve dados de outros consultores. |
| P0-3 | **Mock user "user-123" em 13 pontos de escrita** — gamification, estoque, trainings, clientes gravam dados com ID fake. | [src/app/page.tsx:58](src/app/page.tsx), [src/hooks/useProducts.ts:50](src/hooks/useProducts.ts), [src/hooks/useTrainings.ts:78](src/hooks/useTrainings.ts), entre outros | Corrompe dados multi-tenant. Leaderboard, XP e estoque são inutilizáveis no mundo real. |

### Visão geral de saúde

| Eixo | Nota (0-10) | Observação |
|------|-------------|------------|
| Segurança & Auth | 2 | Middleware desligado, RLS parcial, `useAuth` existe mas ninguém usa. |
| Correção funcional | 4 | Metade das telas está hardcoded (Agenda, Financeiro, WhatsApp). |
| Qualidade de código | 5 | 17 `any`, 22 `console.*`, 1 `alert()`, hooks com IDs fake. |
| Performance | 6 | Bundle não otimizado, Jarvis renderiza 500 partículas em sequência. |
| UX / UI visual | 7 | Design forte, mas empty/error states inconsistentes. |
| Acessibilidade | 2 | 11 atributos `aria-*` / `role` em todo o app; contraste baixo em vários pontos. |
| Observabilidade | 3 | `console.error` disperso, sem logger estruturado, sem Sentry/equivalente. |
| Documentação | 4 | Boa organização AIOX, mas `/equipe` linkado no menu sem existir. |

**Recomendação:** destravar P0-1..P0-3 em uma primeira sprint de "segurança + identidade real do usuário" antes de qualquer outra melhoria. Sem isso, toda evolução de UX fica pendurada em mocks.

---

## 2. Inventário

### 2.1 Stack declarada vs real

| Camada | Declarado (package.json) | Observado |
|--------|--------------------------|-----------|
| Framework | Next.js 16.2.4 (App Router) | Confirmado — `src/app/`. |
| UI runtime | React 19.2.4 | Confirmado. |
| Styling | Tailwind v4 (`@theme inline`) + shadcn | Confirmado em `src/app/globals.css` e `src/components/ui/*`. |
| Auth + DB | `@supabase/supabase-js`, `@supabase/ssr` | Client existe em [src/lib/supabase.ts](src/lib/supabase.ts); SSR helper **não** utilizado. |
| Motion | `framer-motion` | Amplamente usado (dashboard, sidebar, jarvis). |
| Icons | `lucide-react` + `@phosphor-icons/react` | Duas libs concorrentes — simplificar. |
| Forms | Nada específico (useState puro) | Nenhuma lib de form; sem validação declarativa (zod/yup). |
| Testes | — | **Nenhum teste instalado.** `npm test` não está definido. |

### 2.2 Superfície do app

| Módulo | Rota | Linhas aprox. | Status atual |
|--------|------|---------------|--------------|
| Dashboard | `/` | ~500 | Real + alguns mocks (territórios, `user-123`) |
| Agenda | `/agenda` | ~250 | 100% mock (`MOCK_APPOINTMENTS`) |
| Clientes | `/clientes` | ~350 | Real (useClients) + `user-123` |
| Comunidade | `/comunidade` | ~300 | Real + realtime; detecção de user frágil |
| Estoque | `/estoque` | ~400 | Real (useProducts) + `user-123` |
| Financeiro | `/financeiro` | ~300 | **100% hardcoded** |
| Jarvis | `/jarvis` | ~250 | Real STT; perf/alert issues |
| Login | `/login` | ~200 | **Mock auth** (`setTimeout` + redirect) |
| Treinamentos | `/treinamentos` | ~300 | Real + upload Supabase Storage; `IS_CREATOR = true` hardcoded |
| WhatsApp | `/whatsapp` | ~300 | **100% hardcoded** |

**Total estimado:** ~3.200 linhas em `src/`, 14 componentes UI em `components/ui/`, 5 componentes de domínio (`jarvis`, `layout`, `maps`, `sales`), 7 hooks customizados.

### 2.3 Integração Supabase

Tabelas no schema: `clients`, `products`, `orders`, `order_items`, `appointments`, `expenses`, `scheduled_sales`, `daily_goals`, `community_posts`, `leaderboard`, `team_trainings`, `whatsapp_templates`.

Hooks existentes: `useAuth`, `useClients`, `useProducts`, `useOrders`, `useAppointments`, `useTrainings`, `useIntelligence`.

**Gap:** sem hooks para `expenses`, `scheduled_sales`, `daily_goals`, `whatsapp_templates` — exatamente as telas que estão hardcoded.

### 2.4 Linkagem de navegação

Sidebar aponta para `/equipe` ([src/components/layout/Sidebar.tsx:34](src/components/layout/Sidebar.tsx)), mas **não existe** `src/app/equipe/`. Link quebrado no menu.

---

## 3. Segurança & Auth

### 3.1 P0-1 — Middleware desativado

[src/middleware.ts](src/middleware.ts) tem toda a lógica de guard comentada com nota "DESATIVADO TEMPORARIAMENTE PARA PERMITIR A NAVEGAÇÃO DURANTE A PRÉ-VISUALIZAÇÃO". Consequências:

- `/clientes`, `/estoque`, `/financeiro`, `/comunidade`, `/whatsapp`, `/treinamentos`, `/agenda` acessíveis sem sessão.
- Dados sensíveis (pipeline, receitas, clientes) visíveis a qualquer visitante.
- Não há camada compensatória em server components — o app usa `"use client"` quase em tudo.

**Ação:** reativar o middleware com `createServerClient` (`@supabase/ssr`), fazer redirect para `/login` quando `session == null`, e remover a nota temporária.

### 3.2 P0-2 — RLS incompleto

Do `supabase_schema.sql`:

| Tabela | RLS habilitado? | Políticas definidas |
|--------|-----------------|---------------------|
| `clients` | **NÃO** | — |
| `products` | **NÃO** | — |
| `orders` | **NÃO** | — |
| `order_items` | **NÃO** | — |
| `appointments` | **NÃO** | — |
| `whatsapp_templates` | **NÃO** | — |
| `expenses` | Sim | SELECT/INSERT por `user_id` |
| `daily_goals` | Sim | INSERT/UPDATE por `user_id` |
| `scheduled_sales` | Sim | parcial |
| `community_posts` | Sim | SELECT público + INSERT autenticado |
| `leaderboard` | Sim | SELECT público + UPSERT próprio |
| `team_trainings` | Sim | parcial |

Como a chave `anon` do Supabase é exposta no bundle (design correto do Supabase — mas **exige RLS**), qualquer pessoa com as credenciais públicas pode ler/escrever nas tabelas sem RLS.

**Ação:** habilitar RLS em todas as tabelas e escrever policies `auth.uid() = user_id` para SELECT/INSERT/UPDATE/DELETE. Criar migration numerada em `supabase/migrations/`.

### 3.3 P1 — Cliente Supabase sem validação de env

[src/lib/supabase.ts](src/lib/supabase.ts) defaults para string vazia silenciosamente:

```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
```

Se o `.env` não carregar, o cliente é instanciado com URL vazia e falha em runtime com mensagem obscura. Trocar por validação via `zod` ou `throw new Error('...')` quando faltar.

### 3.4 P1 — Login mockado

[src/app/login/page.tsx](src/app/login/page.tsx) faz `setTimeout(() => window.location.href = "/", 1500)`. O `useAuth` existe mas nunca é chamado. Isso explica porque o middleware foi "desativado para pré-visualização" — um depende do outro.

**Ação:** ligar handlers em `useAuth.signIn(email, senha)` e `signInWithOAuth(provider)`.

### 3.5 P2 — `useAuth` órfão

Nenhum arquivo importa `useAuth` ([src/hooks/useAuth.ts](src/hooks/useAuth.ts)). Ele está pronto mas não consumido — qualquer `user.id` real precisa vir dele. É o pivô para resolver o P0-3 (mock IDs).

### 3.6 P2 — Secrets e `.gitignore`

Existem `.env`, `.env.example`, `.env.local`. Verificar se `.env` / `.env.local` estão em `.gitignore` (o status git mostra `.gitignore` como "AM" — assume que sim, mas confirmar antes de qualquer push).

---

## 4. Correção funcional

### 4.1 Mocks que quebram o produto

| Arquivo | Linha | Mock |
|---------|-------|------|
| [src/app/page.tsx](src/app/page.tsx) | 58 | `MOCK_USER = { id: "user-123", name: "Bruno Silva (Você)" }` |
| [src/app/page.tsx](src/app/page.tsx) | 197-199 | Territórios (regiões) hardcoded no JSX |
| [src/app/agenda/page.tsx](src/app/agenda/page.tsx) | — | `MOCK_APPOINTMENTS` (array inteiro) |
| [src/app/financeiro/page.tsx](src/app/financeiro/page.tsx) | todo | KPIs, timeline, pendências hardcoded |
| [src/app/whatsapp/page.tsx](src/app/whatsapp/page.tsx) | todo | Templates, sugestões, datas-chave hardcoded |
| [src/app/clientes/page.tsx](src/app/clientes/page.tsx) | `handleApproach` | `gamificationService.recordAction("user-123", …)` |
| [src/app/comunidade/page.tsx](src/app/comunidade/page.tsx) | — | `board?.find(u => u.user_name.includes("(Você)"))` — detecção frágil |
| [src/app/treinamentos/page.tsx](src/app/treinamentos/page.tsx) | — | `IS_CREATOR = true` |
| [src/hooks/useProducts.ts](src/hooks/useProducts.ts) | 50 | `user_id: 'user-123'` em INSERT |
| [src/hooks/useTrainings.ts](src/hooks/useTrainings.ts) | 78 | `creator_id: 'user-123'` em INSERT |
| [src/components/sales/VoiceRegistration.tsx](src/components/sales/VoiceRegistration.tsx) | todo | Retorna `mockParsedData` (ironia: Jarvis usa STT real) |
| [src/components/jarvis/JarvisCommandCenter.tsx](src/components/jarvis/JarvisCommandCenter.tsx) | 163 | `gamificationService.recordAction("user-123", …)` |

### 4.2 Bugs observados

- **[src/hooks/useIntelligence.ts](src/hooks/useIntelligence.ts):55** — `Object.keys(regions).reduce((a, b) => regions[a] > regions[b] ? a : b, "São Paulo")`. O valor inicial `"São Paulo"` pode não existir em `regions`, levando a `regions["São Paulo"] === undefined` no primeiro compare. Corrigir passando um `keys[0]` como acc ou usando `entries().sort`.

- **[src/app/comunidade/page.tsx](src/app/comunidade/page.tsx)** — Cálculo de progresso de nível lê `user.level`, mas o campo no schema é `level_number`. Barra de progresso fica quebrada.

- **[src/components/jarvis/JarvisCommandCenter.tsx](src/components/jarvis/JarvisCommandCenter.tsx)** — `useEffect` com deps `[status]` reinstala handlers do `SpeechRecognition` a cada mudança de status, potencialmente causando listeners duplicados. Usar ref para o recognizer.

- **[src/lib/offlineSync.ts](src/lib/offlineSync.ts):15-33** — `saveAction` acessa `localStorage` sem guard `typeof window !== 'undefined'`. Se chamado em qualquer código server/edge, quebra o build.

- **[src/app/page.tsx](src/app/page.tsx)** — `SalesFunnel` recebe `[]` direto; sem dados = componente renderiza vazio sem skeleton ou mensagem.

### 4.3 Consistência de estado

Em `/clientes` o componente atualiza localmente (optimistic) mas ao remontar o hook `useClients` refaz o fetch — qualquer erro de network silenciosamente descarta o optimistic update. Sem `react-query`/`SWR`, a camada de cache é manual e frágil.

---

## 5. Qualidade de código

### 5.1 `any` disseminado (17 ocorrências em 11 arquivos)

| Arquivo | Contexto |
|---------|----------|
| [src/lib/gamification.ts](src/lib/gamification.ts):52 | `const updates: any = {…}` |
| [src/lib/offlineSync.ts](src/lib/offlineSync.ts) | `payload: any` |
| [src/app/clientes/page.tsx](src/app/clientes/page.tsx) | `handleApproach(client: any)` |
| [src/app/comunidade/page.tsx](src/app/comunidade/page.tsx) | `board?.find((u: any) => …)` |
| `useProducts`, `useOrders`, `useClients` (tipagem de retorno) | shape livre |

**Ação:** gerar tipos do Supabase (`supabase gen types typescript`) e plugar em `createClient<Database>()`.

### 5.2 Logs e alertas inadequados

- **22 `console.log`/`console.error`** em 9 arquivos — remover ou rotear para logger central.
- **1 `alert()`** em [src/components/jarvis/JarvisCommandCenter.tsx:147](src/components/jarvis/JarvisCommandCenter.tsx) — substituir por toast (shadcn `Sonner` já é tendência natural).

### 5.3 Duplicação

- **Ícones:** `lucide-react` + `@phosphor-icons/react` instalados — padronizar em uma só.
- **Botão "back" e layout de header:** reimplementado em várias páginas com estilos quase idênticos — extrair `<PageHeader title back />`.
- **Glass cards:** `.glass` / `.glass-green` em `globals.css`, mas classes inline `bg-white/5 border-white/10 rounded-3xl` reaparecem — promover a utilitário.

### 5.4 Ausência de testes

Nenhum `*.test.ts`, nenhum script `test` em `package.json`, sem Vitest/Jest/Playwright configurado. Apesar da Constitution AIOX exigir "Quality First", não há gate automático.

### 5.5 Lint / typecheck

AGENTS.md lista `npm run lint`, `npm run typecheck`, `npm test`. Validar se os scripts existem no `package.json` e se passam no estado atual — suspeita: `any` e hooks órfãos devem emitir avisos.

### 5.6 Organização

Estrutura limpa e previsível:

```
src/
├── app/             # Rotas (App Router)
├── components/
│   ├── ui/          # shadcn
│   ├── layout/      # Header, Sidebar
│   ├── jarvis/      # Command center
│   ├── maps/        # Território
│   └── sales/       # Funnel, VoiceRegistration
├── hooks/           # Supabase hooks
├── lib/             # supabase, utils, gamification, offlineSync
└── middleware.ts
```

Sugestão: criar `src/features/<domínio>/` para co-localizar componentes + hooks de uma área (ex. `features/clientes/`) quando o app crescer. Hoje está bem.

---

## 6. Performance

### 6.1 Bundle & config

- **[next.config.ts](next.config.ts) vazio.** Sem `images.domains`, sem `experimental.optimizePackageImports` para `lucide-react` / `framer-motion` (ambos grandes). Pode economizar >100KB no bundle inicial com `optimizePackageImports: ['lucide-react', 'framer-motion', '@phosphor-icons/react']`.

- **Sem `output: 'standalone'`** — se o deploy for container (Vercel/Fly/Railway), dobra o tamanho da imagem.

- **Sem análise de bundle** (`@next/bundle-analyzer`). Adicionar para visibilidade.

### 6.2 Hotspots específicos

- **[src/components/jarvis/JarvisCommandCenter.tsx](src/components/jarvis/JarvisCommandCenter.tsx)** — renderiza **500 partículas** com `framer-motion` (cada uma um `<motion.div>` com animação infinita). Em mobile de entrada isso derruba FPS e esquenta bateria. Trocar por canvas 2D ou limitar a 50 com `willChange: transform`.

- **Uso amplo de `"use client"`** — quase todas as páginas são client components. Oportunidade de promover skeletons, cards estáticos e data-fetch para Server Components + Suspense.

- **Framer Motion sem `LazyMotion`** — carrega a bundle inteira; `LazyMotion + domAnimation` corta ~60%.

### 6.3 Dados

- `useClients`, `useProducts` fazem `.select('*')` sem paginação. Em escala (>1k linhas) o app trava. Adicionar `range(from, to)` e virtualizar listas.

- Sem `react-query` / `SWR` significa refetch a cada mount. Caching explícito resolve.

### 6.4 PWA

[public/manifest.json](public/manifest.json):

- `"background_color": "#ffffff"` — conflita com tema dark; splash screen aparece branca. Trocar para `#0F0F0F`.
- Sem `"shortcuts"` (Android expõe atalhos rápidos — ex. "Nova venda", "Novo cliente").
- Sem `"screenshots"` (iOS/Android store install UI).
- Sem `"categories": ["business", "productivity"]`.

---

## 7. UX & Acessibilidade (ênfase solicitada)

### 7.1 Avaliação por heurísticas de Nielsen

| Heurística | Nota | Observação |
|-----------|------|-----------|
| 1. Visibilidade do estado | 4 | Muitas ações (salvar, excluir) não dão feedback visível (sem toast global). Login "spinneia" mas só redireciona via `setTimeout`. |
| 2. Correspondência com o mundo real | 8 | Linguagem boa em PT-BR ("Consultora", "Aproximar", "Ronda"). |
| 3. Controle do usuário | 5 | Não há "desfazer" em ações destrutivas; `confirm()` do browser em vários pontos. |
| 4. Consistência e padrões | 5 | Cards glass repetidos mas com pequenas variações; botões ora `bg-primary`, ora `bg-[#5DD62C]`. |
| 5. Prevenção de erros | 3 | Formulários sem validação client-side robusta (sem zod/react-hook-form). |
| 6. Reconhecer > lembrar | 7 | Sidebar com rótulos claros, ícones + texto. |
| 7. Flexibilidade & eficiência | 5 | Sem atalhos de teclado, sem command palette (apesar de Jarvis poder virar isso). |
| 8. Estética & design minimalista | 8 | Dark+neon coeso e distintivo. |
| 9. Reconhecer e recuperar erros | 3 | Erros de rede caem em `console.error`; UI não muda. |
| 10. Ajuda & documentação | 4 | Sem onboarding, sem tooltips explicativos, sem empty-state instrutivo. |

### 7.2 Acessibilidade (WCAG 2.1)

Problemas críticos:

- **11 atributos `aria-*`/`role` em todo o repositório.** Botões de ícone-only (search, bell, hamburger, X, …) sem `aria-label`. Ex.: [src/components/layout/Header.tsx:19-25](src/components/layout/Header.tsx) — dois botões sem label.

- **Contraste**: texto `text-slate-500` e `text-slate-600` sobre `#0F0F0F` falha WCAG AA em vários contextos (menos de 4.5:1). Levantar com ferramenta (ex. axe) e ajustar.

- **Botões hamburger e X no Sidebar** — sem `aria-expanded`, sem `aria-controls`. Screen readers não sabem o estado.

- **Modal/Drawer do Sidebar** — overlay sem `role="dialog"`, sem focus-trap, sem `aria-modal="true"`. `Esc` para fechar não testado.

- **Motion reduzido** — usar `useReducedMotion()` do Framer Motion para usuários com `prefers-reduced-motion: reduce`. Hoje animações são sempre aplicadas.

- **Toque** (mobile-first) — alvos < 44×44px em alguns botões secundários (ex. "X" fechar no Sidebar é 40×40 — borderline).

- **Hierarquia de `<h1>`** — múltiplos `<h1>` por página (cada `<Header title>` gera um). Deveria haver apenas um `<h1>` por rota.

- **Form labels** — inputs de busca usam `placeholder` sem `<label>` associado.

- **Lang attr** — `<html lang="pt-BR">` — verificar em [src/app/layout.tsx](src/app/layout.tsx). Caso esteja `en`, corrigir.

### 7.3 Empty, loading e error states por módulo

| Módulo | Empty | Loading | Error |
|--------|-------|---------|-------|
| Dashboard | Faltam estados individuais (territórios, funil, leaderboard). Tudo renderiza vazio quando sem dado. | — | — |
| Agenda | **Não aplica** (mock). Ao migrar, precisa dos três. | — | — |
| Clientes | Existe empty state | Skeleton ausente | Silencioso |
| Comunidade | Existe | Parcial | Silencioso |
| Estoque | Bom (empty + loading) | Skeleton | Silencioso |
| Financeiro | Todo mock | — | — |
| WhatsApp | Todo mock | — | — |
| Treinamentos | Parcial | Parcial | Silencioso |

**Padrão sugerido:** componente `<AsyncState status="loading|empty|error" retry={fn}>` reutilizável.

### 7.4 Motion & micro-interações

- Transição entre rotas inexistente — App Router default. Adicionar `<motion.main key={pathname}>` com fade/slide.
- Haptic feedback em mobile (quando PWA instalado) não explorado — `navigator.vibrate(10)` em ações-chave melhora percepção.
- Spring animations do sidebar estão lentas (`damping: 25, stiffness: 200`) — `stiffness: 350` responde melhor.
- `whileTap={{ scale: 0.97 }}` em botões primários reforça feedback.

### 7.5 Mobile-first — pontos específicos

- Header com padding `p-8` (32px) — em tela < 380px consome muito espaço. Escalar com `px-4 sm:px-8`.
- Texto `text-3xl` no título do header — em mobile pequeno quebra em 2 linhas e empurra ações. Usar `text-2xl sm:text-3xl`.
- Tabelas em `/estoque` — horizontal scroll não anunciado; adicionar indicador.
- Bottom nav? App não tem barra inferior fixa mobile — apenas hamburger. Em sales apps de campo, bottom-tab reduz cliques. Avaliar.

### 7.6 Fluxos críticos para revisar

1. **Registrar venda por voz** (Jarvis) — hoje termina em `alert()`. Deveria dar preview estruturado + "Confirmar" antes de persistir.
2. **Criar cliente** — formulário não valida telefone/CEP; sem máscara.
3. **Aproximar cliente** (`handleApproach`) — ação dispara XP + atualiza estado, mas não há feedback visual (confetti, som, toast).
4. **Upload de treinamento** — sem indicador de progresso de upload em `useTrainings`.
5. **Offline → online sync** — lógica existe em `offlineSync.ts` mas não há UI que informe "3 ações pendentes, sincronizando…".

### 7.7 Design system

- Tokens em `globals.css` bem definidos (`--primary: #5DD62C`, etc.).
- Falta: token de elevação (sombras), escala de tipografia semântica (`--text-display`, `--text-title`, `--text-body`), grid de spacing explícito.
- Storybook / MDX de componentes ausentes — componentes UI não têm exemplos documentados.

---

## 8. Dívidas por módulo

Scores são avaliações holísticas (correção × UX × perf × a11y). 10 = pronto para produção.

### 8.1 Dashboard (`/`) — **6.5/10**
- ✅ Layout forte, hierarquia visual clara.
- ❌ MOCK_USER, territórios hardcoded, SalesFunnel vazio.
- ❌ Sem skeleton em cards principais; ao carregar aparece tudo zerado.
- 🎯 Conectar `useAuth` → `user.id`, mapear territórios de `useIntelligence`, adicionar empty states individuais.

### 8.2 Agenda (`/agenda`) — **3/10**
- ❌ 100% mock.
- ❌ Sem integração com `appointments` (tabela existe).
- 🎯 Criar `useAppointments` CRUD, view dia/semana/mês (ex. `react-day-picker`), notificação de próximo compromisso.

### 8.3 Clientes (`/clientes`) — **6/10**
- ✅ CRUD real via `useClients`.
- ❌ `user-123` em gamification, `client: any`, sem máscara de telefone.
- ❌ Sem filtro por status de pipeline, sem busca.
- 🎯 Tipar, adicionar filtros, máscara, vincular XP ao user real.

### 8.4 Comunidade (`/comunidade`) — **6.5/10**
- ✅ Realtime Supabase excelente.
- ❌ Detecção de "você" por string `.includes("(Você)")` — frágil; `level` vs `level_number` quebra barra.
- 🎯 Identificar via `user.id`, corrigir field, adicionar moderação de post.

### 8.5 Estoque (`/estoque`) — **7/10**
- ✅ CRUD completo, cálculo de margem em tempo real, empty/loading.
- ❌ `user_id` hardcoded, sem paginação, sem categorização.
- 🎯 Paginar, filtros, badge "estoque baixo" em card.

### 8.6 Financeiro (`/financeiro`) — **2/10**
- ❌ 100% hardcoded. Esconde que as tabelas `expenses`/`scheduled_sales`/`daily_goals` estão prontas no backend.
- 🎯 Criar `useExpenses`, `useScheduledSales`, `useDailyGoals`; KPIs calculados; gráficos (Recharts/Visx).

### 8.7 Jarvis (`/jarvis`) — **5/10**
- ✅ Web Speech API real, UX de comando central é um diferencial.
- ❌ 500 partículas (perf), `alert()`, `user-123`, useEffect com deps erradas.
- 🎯 Trocar alert por preview + toast, reduzir partículas para canvas, ligar user real.

### 8.8 Login (`/login`) — **2/10**
- ❌ Mock auth.
- 🎯 Plugar `useAuth`, validação, "esqueci a senha", OAuth real (Google).

### 8.9 Treinamentos (`/treinamentos`) — **6/10**
- ✅ Upload para Supabase Storage funciona.
- ❌ `IS_CREATOR = true`, `creator_id = "user-123"`, sem progresso de upload.
- 🎯 Role via `user.app_metadata.role`, barra de upload, playlist/favoritos.

### 8.10 WhatsApp (`/whatsapp`) — **2/10**
- ❌ 100% hardcoded. Tabela `whatsapp_templates` existe mas não é usada.
- 🎯 Criar `useWhatsappTemplates`, editor Markdown, variáveis dinâmicas (`{{nome}}`), histórico de envios.

---

## 9. Backlog priorizado

Severidade: **P0** = bloqueia produção · **P1** = grave, impacta valor · **P2** = moderado · **P3** = polimento.
Esforço: **S** = < 0.5 dia · **M** = 0.5–2 dias · **L** = > 2 dias.

### P0 — Sprint "Segurança & Identidade"

| # | Item | Esforço | Resultado |
|---|------|---------|-----------|
| 1 | Reativar middleware com `@supabase/ssr`; redirect para `/login` sem sessão. | M | Rotas protegidas de fato. |
| 2 | Habilitar RLS em `clients`, `products`, `orders`, `order_items`, `appointments`, `whatsapp_templates` + policies `auth.uid()`. | M | Dados multi-tenant isolados. |
| 3 | Conectar `useAuth` no login real + substituir todos os `"user-123"` por `user.id` do hook. | L | Gamification/estoque/trainings corretos por usuário. |
| 4 | Validar env vars (`NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`) com erro explícito se faltar. | S | Falha clara em setup errado. |

### P1 — Sprint "Dados Reais"

| # | Item | Esforço | Resultado |
|---|------|---------|-----------|
| 5 | Criar `useExpenses`, `useScheduledSales`, `useDailyGoals` e ligar `/financeiro`. | L | Financeiro deixa de ser mock. |
| 6 | Criar `useAppointments` e ligar `/agenda` (view dia/semana). | L | Agenda funcional. |
| 7 | Criar `useWhatsappTemplates` e ligar `/whatsapp` com editor + variáveis. | L | Templates persistidos por usuário. |
| 8 | Corrigir `useIntelligence.ts:55` (reduce com acc errado) e `level_number` em `/comunidade`. | S | Bugs silenciosos sumiram. |
| 9 | Guardar `saveAction` com `typeof window !== 'undefined'` e tipar `payload`. | S | SSR safe. |
| 10 | Gerar types do Supabase, remover `any`. | M | Typesafety real. |

### P2 — Sprint "UX & Acessibilidade"

| # | Item | Esforço | Resultado |
|---|------|---------|-----------|
| 11 | Adicionar `aria-label` em todos os botões ícone-only; `aria-expanded/controls` no Sidebar; `role="dialog"` + focus-trap no drawer; `useReducedMotion`. | M | WCAG AA em navegação principal. |
| 12 | Criar `<AsyncState status>` e aplicar em todos os módulos com fetch. | M | Empty/loading/error consistentes. |
| 13 | Substituir `alert()` + `confirm()` por toasts/modais (shadcn `sonner` + `alert-dialog`). | S | Feedback moderno. |
| 14 | Extrair `<PageHeader>`, `<GlassCard>`, `<NeonButton>` + Storybook. | M | DS documentado. |
| 15 | Adicionar react-hook-form + zod; máscaras (telefone, CPF, CEP, moeda). | M | Validação robusta. |
| 16 | Otimizar Jarvis: canvas 2D para partículas, limitar a 60-100 nodes, `LazyMotion` global. | M | FPS alto em mobile médio. |
| 17 | Bottom nav mobile (Dashboard, Clientes, Jarvis, Agenda, Menu). | M | UX de app nativo. |
| 18 | Contraste AA — ajustar `text-slate-500`/`text-slate-600` para `text-slate-400`/`text-slate-300` onde usado como texto corrente. | S | Legibilidade. |
| 19 | Implementar micro-interações (confetti em venda, toast de XP ganho, haptic). | M | Dopamina. |

### P3 — Polimento & crescimento

| # | Item | Esforço | Resultado |
|---|------|---------|-----------|
| 20 | Configurar `next.config.ts`: `optimizePackageImports`, `images.remotePatterns`, `output: 'standalone'`, bundle analyzer. | S | Bundle menor. |
| 21 | Padronizar icones em `lucide-react` (remover `@phosphor-icons/react`). | M | –1 lib. |
| 22 | Manifest.json: `background_color #0F0F0F`, shortcuts, categories, screenshots. | S | PWA install UX. |
| 23 | Criar página `/equipe` (ou remover link). | S | Nav sem link morto. |
| 24 | Setup Vitest + Playwright; testar gamification, hooks, fluxo de login. | L | QA automatizado (Article V). |
| 25 | Adicionar Sentry/Axiom para observabilidade; remover `console.*`. | M | Visibilidade em prod. |
| 26 | Page transitions (`<motion.main key={pathname}>`). | S | Polimento. |
| 27 | Onboarding guiado (primeiro login) + tooltips contextuais. | M | Adoção. |
| 28 | Command palette (`cmd-k`) usando Jarvis como motor. | L | Poder-usuário. |
| 29 | Paginação + virtualização em listas (`react-virtual`) de Clientes/Estoque. | M | Escala. |

---

## Anexo A — Métricas de varredura (2026-04-17)

- `user-123` / MOCK occurrences: **13** (em 8 arquivos).
- Tipos `any`: **17** (em 11 arquivos).
- `console.log`/`console.error`: **22** (em 9 arquivos).
- `alert()`: **1** ([JarvisCommandCenter.tsx](src/components/jarvis/JarvisCommandCenter.tsx)).
- Atributos `aria-*` / `role`: **11** em todo o código.
- Hooks `useEffect`: **9** (alguns com deps a revisar).
- Tabelas sem RLS: **6** de 12.
- Telas 100% hardcoded: **3** (`/agenda`, `/financeiro`, `/whatsapp`).
- Hooks Supabase existentes: **7** · faltantes: **4** (expenses, scheduled_sales, daily_goals, whatsapp_templates).
- Links mortos no menu: **1** (`/equipe`).

---

## Anexo B — Próximos passos (processo)

1. **Você revisa este audit.** Aponte o que tira, o que adiciona, o que re-prioriza.
2. Ao aprovar, eu aciono o skill `superpowers:writing-plans` para transformar o backlog em **stories executáveis** (uma por P0/P1, depois P2/P3 por lotes temáticos).
3. Stories entram em `docs/stories/` seguindo o ciclo SDC do AIOX (SM → PO → Dev → QA).
4. Implementação começa pelo bloco P0 (sprint "Segurança & Identidade") — é pré-requisito para tudo.

---

*Audit produzido em Fase 1 — nenhum código do app foi modificado nesta etapa.*
