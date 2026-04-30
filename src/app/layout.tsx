import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema Elite | CRM Consultor de Vendas",
  description: "A plataforma definitiva para gestão de estoque, clientes, agendamentos e performance de vendas.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sistema Elite",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Sistema Elite | CRM Consultor",
    description: "Gestão completa de vendas e performance em um só lugar.",
    url: "https://sistema-elite.app",
    siteName: "Sistema Elite",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F0F0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="pt-BR" 
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body 
        className="min-h-full flex flex-col bg-[#0F0F0F] text-[#F8F8F8] font-sans"
        suppressHydrationWarning
      >
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
          <main className="flex-1 overflow-x-hidden pt-20 md:pt-24">{children}</main>
          <BottomNav />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(
                      function(registration) {
                        console.log('ServiceWorker registration successful');
                      },
                      function(err) {
                        console.log('ServiceWorker registration failed', err);
                      }
                    );
                  });
                }
              `,
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
