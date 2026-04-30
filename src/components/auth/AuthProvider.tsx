"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useSyncManager } from "@/hooks/useSyncManager";
import { RefreshCw, CloudOff } from "lucide-react";

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
  const { isSyncing, pendingItems } = useSyncManager();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
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

      {/* Indicador de Status Offline/Sincronização */}
      <div className="fixed top-24 right-6 z-[200] flex flex-col items-end gap-2 pointer-events-none">
        {pendingItems > 0 && (
          <div className="bg-orange-500/20 text-orange-500 border border-orange-500/30 px-4 py-2 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
            <CloudOff size={14} /> {pendingItems} pendentes
          </div>
        )}
        {isSyncing && (
          <div className="bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
            <RefreshCw size={14} className="animate-spin" /> Sincronizando...
          </div>
        )}
      </div>
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
