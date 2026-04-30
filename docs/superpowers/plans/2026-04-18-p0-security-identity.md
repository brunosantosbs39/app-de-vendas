# P0 — Segurança & Identidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Destravar o P0 do audit — app passa a ter autenticação real, identidade correta por usuário e RLS em todas as tabelas, eliminando o risco de vazamento multi-tenant.

**Architecture:** Validação de env fail-fast → Supabase client central → `AuthProvider` de contexto com React Context → login real via `useAuth` → middleware SSR reativado → substituição de `"user-123"` pelo `user.id` real → migration de RLS nas 6 tabelas faltantes. Cada task é incremental e deixa o app funcional ao final.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Supabase (`@supabase/supabase-js`, `@supabase/ssr`) + Tailwind v4. Sem framework de testes instalado — usamos verificação manual estruturada (dev server + fluxos de usuário) com expected outputs explícitos.

**Referência:** audit em [docs/superpowers/audits/2026-04-17-app-vendas-audit.md](docs/superpowers/audits/2026-04-17-app-vendas-audit.md) seções §3 e §4.1 (itens #1–#4 do backlog).

**Pré-requisitos:**
- `.env.local` na raiz com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` válidos.
- Acesso ao Supabase dashboard (ou CLI `supabase`) para aplicar a migration.
- Pelo menos 2 usuários de teste criados no Supabase Auth para validar RLS multi-tenant.

---

## File Structure

### Criar
- `src/lib/env.ts` — validação fail-fast das env vars, export de constantes tipadas.
- `src/components/auth/AuthProvider.tsx` — React Context Provider que expõe `user`, `loading`, `signIn`, `signUp`, `signOut`, `signInWithOAuth`.
- `supabase/migrations/20260418_enable_rls_missing_tables.sql` — habilita RLS + policies nas 6 tabelas faltantes.

### Modificar
- `src/lib/supabase.ts` — usar constantes de `env.ts`, tipar createClient.
- `src/hooks/useAuth.ts` — re-exportar do AuthProvider (compat) + adicionar `signInWithOAuth`.
- `src/app/layout.tsx` — envolver children com `<AuthProvider>`.
- `src/app/login/page.tsx` — ligar handlers reais, tratar erros, controlar senha + cadastro.
- `src/middleware.ts` — reativar lógica SSR, remover bloco comentado.
- `src/app/page.tsx` — remover `MOCK_USER`, ler `user` do contexto.
- `src/app/clientes/page.tsx` — substituir `"user-123"` pelo `user.id`.
- `src/components/jarvis/JarvisCommandCenter.tsx` — idem.
- `src/hooks/useProducts.ts` — idem.
- `src/hooks/useTrainings.ts` — idem.
- `src/app/comunidade/page.tsx` — identificar "você" por `user.id` em vez de string `.includes("(Você)")`.

---

## Task 1: Env validation fail-fast

**Files:**
- Create: `src/lib/env.ts`
- Modify: `src/lib/supabase.ts`

**Objetivo:** Se `.env.local` estiver faltando/errado, a aplicação falha no boot com mensagem clara (não silenciosamente com URL vazia).

- [ ] **Step 1: Criar `src/lib/env.ts`**

```ts
/**
 * Validated environment variables. Fails fast at module load if required
 * vars are missing so misconfigured deploys blow up immediately instead
 * of producing obscure Supabase errors later.
 */

const requiredPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

const missing = Object.entries(requiredPublicEnv)
  .filter(([, value]) => !value || value.trim() === "")
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(
    `[env] Missing required environment variables: ${missing.join(", ")}. ` +
      `Check your .env.local — see .env.example for the expected keys.`,
  );
}

export const env = {
  SUPABASE_URL: requiredPublicEnv.NEXT_PUBLIC_SUPABASE_URL as string,
  SUPABASE_ANON_KEY: requiredPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
};
```

- [ ] **Step 2: Atualizar `src/lib/supabase.ts` para consumir `env`**

```ts
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
```

- [ ] **Step 3: Verificação manual — caminho feliz**

Run: `npm run dev`
Expected: servidor sobe em `http://localhost:3000` sem erro; console do browser não reporta falha do Supabase.

- [ ] **Step 4: Verificação manual — caminho de erro**

1. Renomeie temporariamente `.env.local` para `.env.local.bak`.
2. Rode `npm run build`.
3. Expected: build falha com mensagem `[env] Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your .env.local — see .env.example for the expected keys.`
4. Restaurar `.env.local.bak` → `.env.local`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/env.ts src/lib/supabase.ts
git commit -m "feat(env): fail-fast validation of required Supabase env vars"
```

---

## Task 2: AuthProvider + React Context

**Files:**
- Create: `src/components/auth/AuthProvider.tsx`
- Modify: `src/hooks/useAuth.ts`
- Modify: `src/app/layout.tsx`

**Objetivo:** Um único ponto de verdade para `user`/`session` compartilhado por toda a árvore. Hoje `useAuth` faz `supabase.auth.getSession()` a cada mount de cada consumidor — wasteful e source of truth fragmentado.

- [ ] **Step 1: Criar `src/components/auth/AuthProvider.tsx`**

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type OAuthProvider = "google" | "github" | "facebook";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const signInWithOAuth: AuthContextValue["signInWithOAuth"] = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signInWithOAuth, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used inside <AuthProvider>");
  }
  return ctx;
}
```

- [ ] **Step 2: Substituir `src/hooks/useAuth.ts` por re-export (mantém backward compat)**

```ts
export { useAuthContext as useAuth } from "@/components/auth/AuthProvider";
```

- [ ] **Step 3: Envolver `src/app/layout.tsx` com `<AuthProvider>`**

Abrir `src/app/layout.tsx`, localizar o `<body>` e envolver `{children}`:

```tsx
import { AuthProvider } from "@/components/auth/AuthProvider";

// ...dentro do return:
<body className={/* existing classes */}>
  <AuthProvider>{children}</AuthProvider>
</body>
```

(Manter todo o restante do layout inalterado. Se o layout já importa fontes/metadata, não mexer.)

- [ ] **Step 4: Verificação manual**

Run: `npm run dev`
Expected:
1. `http://localhost:3000/` carrega (ainda sem redirect — middleware ainda não foi reativado).
2. Console do browser sem erros de Provider.
3. Em qualquer componente, adicionar temporariamente `console.log(useAuth())` e ver `{ user: null, session: null, loading: false, signIn, signUp, signInWithOAuth, signOut }`. Remover o log após validar.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/AuthProvider.tsx src/hooks/useAuth.ts src/app/layout.tsx
git commit -m "feat(auth): add AuthProvider context with session + oauth"
```

---

## Task 3: Login real via useAuth

**Files:**
- Modify: `src/app/login/page.tsx`

**Objetivo:** Eliminar o `setTimeout` + `window.location.href` mockado. Login por email/senha real, OAuth Google real, feedback visual de erro.

- [ ] **Step 1: Reescrever `src/app/login/page.tsx`**

Substituir o arquivo inteiro por:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Mail, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, signInWithOAuth } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithOAuth("google");
      // Supabase redireciona automaticamente — nada mais a fazer aqui.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar com Google.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F] p-6 text-[#F8F8F8] overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-10 space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="h-20 w-20 rounded-[2rem] bg-primary flex items-center justify-center shadow-[0_0_50px_rgba(93,214,44,0.4)] mb-2"
          >
            <Zap className="h-10 w-10 text-background fill-background" />
          </motion.div>
          <h1 className="text-5xl font-black tracking-tighter leading-none">
            {isLogin ? "SISTEMA ELITE" : "CRIAR CONTA"}
          </h1>
          <p className="text-slate-500 text-xl font-medium tracking-tight">
            Seus dados sempre seguros, com backup na nuvem.
          </p>
        </div>

        <Card className="glass border-none card-morph p-2 overflow-hidden">
          <CardContent className="p-8 space-y-8">
            <div className="space-y-4">
              <Button
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                variant="outline"
                className="w-full h-14 bg-white text-black hover:bg-slate-200 font-black rounded-xl border-none"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                CONTINUAR COM GOOGLE
              </Button>

              <Button
                type="button"
                disabled
                variant="outline"
                className="w-full h-14 bg-[#25D366]/40 text-white/60 font-black rounded-xl border-none cursor-not-allowed"
                aria-label="Entrar com WhatsApp — em breve"
              >
                <Phone className="w-5 h-5 mr-3 fill-white" />
                WHATSAPP (EM BREVE)
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-black tracking-widest">
                <span className="bg-[#1A1A1A] px-4 text-slate-500">Ou use e-mail</span>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-slate-400 font-black uppercase text-[10px] tracking-widest ml-1">
                    Nome Completo
                  </Label>
                  <Input
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="h-16 pl-4 pr-6 rounded-2xl border-none bg-[#0F0F0F] text-lg font-medium focus-visible:ring-primary transition-all"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-400 font-black uppercase text-[10px] tracking-widest ml-1">
                  Seu E-mail
                </Label>
                <div className="relative group">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-700 group-focus-within:text-primary transition-colors" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    className="h-16 pl-6 pr-14 rounded-2xl border-none bg-[#0F0F0F] text-lg font-medium focus-visible:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-400 font-black uppercase text-[10px] tracking-widest ml-1">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="h-16 pl-6 pr-14 rounded-2xl border-none bg-[#0F0F0F] text-lg font-medium focus-visible:ring-primary transition-all"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm font-bold text-red-400">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={isLoading} className="btn-primary w-full gap-4 group h-16">
                {isLoading ? "CARREGANDO..." : isLogin ? "ACESSAR AGORA" : "FINALIZAR CADASTRO"}
              </Button>
            </form>

            <div className="text-center pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="text-slate-500 hover:text-primary font-bold transition-colors text-sm"
              >
                {isLogin ? "Não tem conta? Crie grátis" : "Já possui conta? Faça login"}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-2 text-primary">
          <ShieldCheck size={16} aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-widest">Backup em Nuvem Automático Ativado</span>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Verificação manual — caminho feliz**

1. Rode `npm run dev`.
2. Crie um usuário de teste no Supabase Dashboard (Authentication → Users → Add user → email+senha confirmado).
3. Acesse `http://localhost:3000/login`.
4. Preencha email/senha do usuário criado e clique "ACESSAR AGORA".
5. Expected: redirect para `/`. No Supabase Dashboard, a coluna "Last sign in" do usuário atualiza.

- [ ] **Step 3: Verificação manual — caminho de erro**

1. Mesma tela de login, preencha senha errada.
2. Expected: aparece mensagem `Invalid login credentials` (ou equivalente) em vermelho. Nenhum redirect acontece.

- [ ] **Step 4: Verificação manual — cadastro**

1. Clique em "Não tem conta? Crie grátis".
2. Preencha nome, email novo, senha com 8+ chars.
3. Expected: cadastro cria usuário no Supabase e redireciona para `/`. Se "confirm email" estiver ON no Supabase Auth settings, deve mostrar erro dizendo que precisa confirmar — comportamento esperado.

- [ ] **Step 5: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat(login): wire email/oauth login to real useAuth flow"
```

---

## Task 4: Reativar middleware SSR

**Files:**
- Modify: `src/middleware.ts`

**Objetivo:** Retomar o guard que já existia (hoje comentado). Rotas não-`/login` sem sessão → redirect `/login`. Rota `/login` com sessão → redirect `/`.

- [ ] **Step 1: Substituir `src/middleware.ts` inteiro**

```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
```

- [ ] **Step 2: Verificação manual — acesso deslogado**

1. Pare o servidor, `npm run dev`.
2. Em aba anônima (sem cookies), acesse `http://localhost:3000/clientes`.
3. Expected: redirect imediato para `http://localhost:3000/login?redirectTo=/clientes`.

- [ ] **Step 3: Verificação manual — acesso logado**

1. Faça login com o usuário de teste (fluxo da Task 3).
2. Acesse `http://localhost:3000/login` manualmente pelo URL bar.
3. Expected: redirect para `/`.

- [ ] **Step 4: Verificação manual — rotas protegidas funcionam logado**

1. Logado, navegue entre `/`, `/clientes`, `/estoque`, `/comunidade`, `/treinamentos`.
2. Expected: todas carregam normalmente, sem redirect loop.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(middleware): reactivate SSR auth guard with redirectTo"
```

---

## Task 5: Eliminar `user-123` — identidade real do usuário

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/clientes/page.tsx`
- Modify: `src/app/comunidade/page.tsx`
- Modify: `src/components/jarvis/JarvisCommandCenter.tsx`
- Modify: `src/hooks/useProducts.ts`
- Modify: `src/hooks/useTrainings.ts`

**Objetivo:** Zero strings `"user-123"`. Todos os escritores usam `user.id` real do `useAuth`. Quando `user` é `null` (ainda carregando), o escritor aborta com mensagem.

- [ ] **Step 1: `src/app/page.tsx` — usar user do contexto**

No topo do componente `Home` (ou equivalente), logo após os imports:

```tsx
import { useAuth } from "@/hooks/useAuth";
```

Dentro do componente, remover a linha 58 `const MOCK_USER = { id: "user-123", name: "Bruno Silva (Você)" };` e substituir por:

```tsx
const { user, loading: authLoading } = useAuth();

if (authLoading) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F] text-slate-500">
      Carregando...
    </div>
  );
}

if (!user) {
  // Middleware já protege, mas este guard evita crash durante hydration edge cases.
  return null;
}

const currentUser = {
  id: user.id,
  name: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Consultor",
};
```

Em toda chamada a `gamificationService.recordAction(MOCK_USER.id, MOCK_USER.name, ...)` substituir por `gamificationService.recordAction(currentUser.id, currentUser.name, ...)`. Em toda referência a `{MOCK_USER.name}` no JSX, substituir por `{currentUser.name}`.

- [ ] **Step 2: `src/app/clientes/page.tsx` — localizar linhas 90-91**

Procurar:

```tsx
"user-123",
"Bruno Silva (Você)",
```

Substituir por: primeiro adicionar `import { useAuth } from "@/hooks/useAuth";` no topo. Dentro do componente (antes de `handleApproach`):

```tsx
const { user } = useAuth();
```

Em `handleApproach`, substituir as duas linhas por:

```tsx
if (!user) return;
const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Consultor";
await gamificationService.recordAction(user.id, displayName, "approach", `abordou ${client.name}`, 10);
```

Também tipar o parâmetro `client`: trocar `handleApproach(client: any)` por `handleApproach(client: { id: string; name: string })` (ou o tipo real do hook — se houver, importar; se não, esse shape mínimo basta).

- [ ] **Step 3: `src/app/comunidade/page.tsx` — identificar "você" por id**

Localizar a linha ~237 `"Bruno Silva (Você)"` e o `board?.find((u: any) => u.user_name.includes("(Você)"))`. Substituir:

Adicionar no topo `import { useAuth } from "@/hooks/useAuth";`. Dentro do componente:

```tsx
const { user } = useAuth();
const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Consultor";
```

Trocar o `find` frágil por:

```tsx
const currentUserEntry = board?.find((u) => u.user_id === user?.id);
```

Em qualquer post que hoje inline `"Bruno Silva (Você)"`, usar `displayName`. Corrigir também o acesso ao nível: onde hoje lê `user.level` (campo inexistente), trocar por `currentUserEntry?.level_number ?? 1`. Renomear variável local de `user` (leaderboard entry) para `currentUserEntry` para não colidir com `user` do auth.

- [ ] **Step 4: `src/components/jarvis/JarvisCommandCenter.tsx` linha 163**

No topo: `import { useAuth } from "@/hooks/useAuth";`. Dentro do componente:

```tsx
const { user } = useAuth();
```

Substituir a linha 163 `gamificationService.recordAction("user-123", "Bruno Silva (Você)", 'sale', "Venda Vocal Real", 60);` por:

```tsx
if (!user) return;
const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Consultor";
await gamificationService.recordAction(user.id, displayName, "sale", "Venda Vocal Real", 60);
```

- [ ] **Step 5: `src/hooks/useProducts.ts` linha 50**

Adicionar no topo: `import { useAuth } from "@/hooks/useAuth";`. Dentro do hook `useProducts`, logo no início:

```ts
const { user } = useAuth();
```

Na função `addProduct` (ou equivalente que hoje tem `user_id: 'user-123'`), trocar a linha por:

```ts
if (!user) throw new Error("Sessão expirada. Faça login novamente.");
// ...
user_id: user.id,
```

Remover o comentário `// Mock user_id`.

- [ ] **Step 6: `src/hooks/useTrainings.ts` linha 78**

Mesmo padrão da Task 5.5: `import { useAuth }`, pegar `user` no início do hook, e na função de create:

```ts
if (!user) throw new Error("Sessão expirada. Faça login novamente.");
// ...
creator_id: user.id,
```

- [ ] **Step 7: Verificação de erradicação**

Rodar busca final. Expected: zero ocorrências.

```bash
git grep -n "user-123" -- 'src/**/*.ts' 'src/**/*.tsx'
```

Expected output: (nada — exit code 1 do grep).

- [ ] **Step 8: Verificação manual multi-usuário**

1. Crie um segundo usuário no Supabase Dashboard.
2. Logue com o usuário A, cadastre um produto `Produto-A` em `/estoque`.
3. Deslogue (implementar botão sair se já não existir; se a Sidebar tem "Sair do Sistema" sem handler, o fix completo fica pra P1 — por ora, apagar cookies manualmente no DevTools → Application → Cookies).
4. Logue com usuário B.
5. Expected: `/estoque` NÃO mostra `Produto-A` (depende da RLS — na Task 6 isso é confirmado).
6. Cadastre `Produto-B` como usuário B. Deslogue e volte para A.
7. Expected: A vê apenas `Produto-A`, B vê apenas `Produto-B`.

Nota: se essa verificação falhar antes da Task 6, é porque RLS ainda não está em `products` — OK, confirma que a Task 6 é necessária.

- [ ] **Step 9: Commit**

```bash
git add src/app/page.tsx src/app/clientes/page.tsx src/app/comunidade/page.tsx \
        src/components/jarvis/JarvisCommandCenter.tsx \
        src/hooks/useProducts.ts src/hooks/useTrainings.ts
git commit -m "feat(auth): replace user-123 mocks with real auth user.id"
```

---

## Task 6: Migration — habilitar RLS nas tabelas faltantes

**Files:**
- Create: `supabase/migrations/20260418_enable_rls_missing_tables.sql`

**Objetivo:** Fechar o vazamento multi-tenant em `clients`, `products`, `orders`, `order_items`, `appointments`, `whatsapp_templates`. Policies usam `auth.uid() = user_id`. Para `order_items` (não tem `user_id` direto), policies encadeiam via `orders`.

- [ ] **Step 1: Criar `supabase/migrations/20260418_enable_rls_missing_tables.sql`**

```sql
-- P0 — Enable RLS on tables that were missing it and define owner-scoped
-- policies. Scope rule: a row belongs to a user when user_id = auth.uid().
-- order_items has no user_id; ownership is derived from parent order.

-- 1. clients ----------------------------------------------------------------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select_own" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clients_insert_own" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_update_own" ON clients
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_delete_own" ON clients
  FOR DELETE USING (auth.uid() = user_id);

-- 2. products ---------------------------------------------------------------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_own" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "products_insert_own" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_delete_own" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- 3. orders -----------------------------------------------------------------
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "orders_insert_own" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_update_own" ON orders
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_delete_own" ON orders
  FOR DELETE USING (auth.uid() = user_id);

-- 4. order_items (ownership via parent order) ------------------------------
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_own" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_insert_own" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_update_own" ON order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_delete_own" ON order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

-- 5. appointments -----------------------------------------------------------
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_own" ON appointments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "appointments_insert_own" ON appointments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appointments_update_own" ON appointments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appointments_delete_own" ON appointments
  FOR DELETE USING (auth.uid() = user_id);

-- 6. whatsapp_templates -----------------------------------------------------
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_templates_select_own" ON whatsapp_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "whatsapp_templates_insert_own" ON whatsapp_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "whatsapp_templates_update_own" ON whatsapp_templates
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "whatsapp_templates_delete_own" ON whatsapp_templates
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Complete missing policies for tables that had RLS but incomplete policies
-- expenses: had SELECT/INSERT by user_id; add UPDATE/DELETE
CREATE POLICY "expenses_update_own" ON expenses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_delete_own" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- scheduled_sales: add missing SELECT/UPDATE/DELETE
CREATE POLICY "scheduled_sales_select_own" ON scheduled_sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "scheduled_sales_insert_own" ON scheduled_sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scheduled_sales_update_own" ON scheduled_sales
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scheduled_sales_delete_own" ON scheduled_sales
  FOR DELETE USING (auth.uid() = user_id);

-- daily_goals: had INSERT/UPDATE; add SELECT/DELETE
CREATE POLICY "daily_goals_select_own" ON daily_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_goals_delete_own" ON daily_goals
  FOR DELETE USING (auth.uid() = user_id);
```

- [ ] **Step 2: Aplicar a migration no Supabase**

Opção A — via Supabase Dashboard:
1. Projeto → SQL Editor → New query.
2. Cole o conteúdo do arquivo e clique "Run".
3. Expected: `Success. No rows returned` (ou equivalente). Cada `CREATE POLICY` confirma criação.

Opção B — via Supabase CLI (se já estiver configurado):

```bash
supabase db push
```

Expected: log mostra a migration `20260418_enable_rls_missing_tables.sql` aplicada.

- [ ] **Step 3: Verificação manual — isolamento entre usuários A e B**

1. Como usuário A, `http://localhost:3000/estoque`, cadastre um produto (nome `RLS-Test-A`).
2. Deslogue (ou abra aba anônima com usuário B logado).
3. Como usuário B, acesse `/estoque`.
4. Expected: `RLS-Test-A` NÃO aparece. A lista está vazia ou só mostra produtos próprios de B.
5. Faça o mesmo teste em `/clientes` (cadastrar como A, verificar ausência como B).

- [ ] **Step 4: Verificação manual — UPDATE/DELETE não atravessa user**

Pela SQL Editor do Supabase (logado como usuário B via JWT impersonation, ou usando o token anon com setAuth do usuário B):

```sql
-- Deve retornar 0 rows (não vê produtos de A)
SELECT count(*) FROM products WHERE name = 'RLS-Test-A';

-- Tentativa de DELETE em produto alheio
DELETE FROM products WHERE name = 'RLS-Test-A';
-- Expected: "DELETE 0" (zero linhas afetadas — RLS bloqueou)
```

Observação: essa validação é mais rigorosa se feita pelo frontend logado como B tentando editar um produto de A via URL manipulada (ex. PATCH direto) — se não for prático, basta a verificação de leitura da Step 3.

- [ ] **Step 5: Verificação de regressão — app continua funcional logado**

1. Logado como usuário A, navegue por todas as rotas: `/`, `/clientes`, `/estoque`, `/agenda` (mock ainda), `/financeiro` (mock ainda), `/comunidade`, `/treinamentos`, `/whatsapp` (mock ainda), `/jarvis`.
2. Expected: nenhuma rota mostra erro 401/403 ou tela em branco. As rotas que usam dados reais (`/clientes`, `/estoque`, `/comunidade`, `/treinamentos`) mostram os dados próprios de A.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260418_enable_rls_missing_tables.sql
git commit -m "feat(db): enable RLS + owner policies on 6 unprotected tables"
```

---

## Task 7: Validação final integrada

**Files:** nenhum — só verificação manual.

**Objetivo:** Confirmar que os 4 itens do P0 do audit foram destravados.

- [ ] **Step 1: Checklist do backlog P0**

| Audit item | Evidência |
|------------|-----------|
| #1 Middleware reativado | Task 4 — `/clientes` sem sessão redireciona. |
| #2 RLS nas 6 tabelas | Task 6 — usuário B não vê produtos de A. |
| #3 `user-123` substituído | Task 5 — `git grep user-123` retorna vazio. |
| #4 Env validation | Task 1 — build falha sem env, passa com env. |

- [ ] **Step 2: Lint + typecheck**

```bash
npm run lint
```

Expected: sem erros novos introduzidos. Avisos antigos de `any` ainda existem (serão limpos na sprint P1) — OK.

- [ ] **Step 3: Smoke test end-to-end**

1. Inicie `npm run dev`.
2. Em aba anônima: acesse `/estoque` → redirect `/login?redirectTo=/estoque`.
3. Faça login com usuário A → redirect automático para `/estoque`.
4. Cadastre produto, volte para `/` → dashboard mostra nome real do usuário A no lugar de "Bruno Silva (Você)".
5. Deslogue, entre como usuário B → não vê produtos de A.

- [ ] **Step 4: Commit final do plan**

```bash
git add docs/superpowers/plans/2026-04-18-p0-security-identity.md
git commit -m "docs(plans): add P0 security & identity implementation plan"
```

---

## Self-review

**Spec coverage (audit §9, P0 #1-#4):**
- #1 Reativar middleware → Task 4 ✅
- #2 Habilitar RLS + policies → Task 6 ✅
- #3 Conectar useAuth + substituir user-123 → Tasks 2, 3, 5 ✅
- #4 Validar env vars → Task 1 ✅

Bônus do audit destravados pelo P0:
- §3.3 env silencioso → Task 1
- §3.4 login mockado → Task 3
- §3.5 useAuth órfão → Tasks 2, 5
- §4.2 bug `user.level` em comunidade → Task 5 Step 3
- §5.1 `client: any` em clientes → Task 5 Step 2

**Placeholder scan:** nenhum "TBD", "TODO later", "similar to task N" sem código. Código completo em cada step.

**Type consistency:** `currentUser`, `displayName`, `user`, `session` mantêm mesmo shape em todos os pontos. `OAuthProvider = "google" | "github" | "facebook"` definido em AuthProvider e referenciado.

**Itens que propositalmente NÃO entram neste plano (por dependência ou escopo):**
- `useExpenses/useScheduledSales/useDailyGoals` (P1) — precisam do user real que esta sprint entrega.
- Instalar Vitest (P3 item #24) — escopo; este plano usa verificação manual.
- Página `/equipe` (P3 item #23) — polimento.
- Remover `console.*` (P3 item #25) — polimento.

---

**Próximas sprints (serão planos separados):**
- `docs/superpowers/plans/YYYY-MM-DD-p1-dados-reais.md` — Agenda, Financeiro, WhatsApp com dados reais.
- `docs/superpowers/plans/YYYY-MM-DD-p2-ux-acessibilidade.md` — ARIA, AsyncState, toasts, bottom nav.
- `docs/superpowers/plans/YYYY-MM-DD-p3-polimento.md` — Vitest, Sentry, bundle, PWA.
