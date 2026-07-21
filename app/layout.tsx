import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/lang-context";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: { default: "IMPACT CENTER", template: "%s · IMPACT CENTER" },
  description: "Ekosystem AI dla polityki",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className="bg-slate-100" style={{ colorScheme: "light" }}>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className="bg-slate-100 text-slate-800 antialiased">
        <LangProvider>
          <AppShell>{children}</AppShell>
        </LangProvider>
      </body>
    </html>
  );
}
