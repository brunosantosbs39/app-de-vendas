import type { Metadata } from "next";
import "./globals.css";
import { RootClientLayout } from "@/components/layout/RootClientLayout";

export const metadata: Metadata = {
  title: "Sistema Elite",
  description: "App de vendas e relacionamento com clientes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <RootClientLayout>{children}</RootClientLayout>
      </body>
    </html>
  );
}
