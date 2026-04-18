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
