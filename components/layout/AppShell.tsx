"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const STANDALONE_PREFIXES = ["/login", "/apex-grid", "/volt-stream", "/pulse-field", "/narrative-scope"];
  const isStandalone = pathname === "/" || STANDALONE_PREFIXES.some((p) => pathname.startsWith(p));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#05070d]">
      {/* Poświata tła — spójna z hubem, dyskretna, żeby nie przeszkadzać w czytaniu danych */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.06),transparent_35%),radial-gradient(circle_at_85%_100%,rgba(124,58,237,0.08),transparent_38%)]" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={function () { setSidebarOpen(false); }}
        />
      )}

      {/* Sidebar */}
      <div
        className={[
          "relative z-50 fixed inset-y-0 left-0 transition-transform duration-200 ease-in-out",
          "lg:relative lg:translate-x-0 lg:flex lg:flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar onClose={function () { setSidebarOpen(false); }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuClick={function () { setSidebarOpen(true); }} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
