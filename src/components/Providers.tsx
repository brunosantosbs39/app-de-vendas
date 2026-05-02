"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "sonner";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#1A1A1A',
            color: '#F8F8F8',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1.25rem',
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 'bold',
          },
          className: 'font-sans',
        }}
      />
      {children}
    </AuthProvider>
  );
}
