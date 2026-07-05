"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, Radio, TrendingUp, Network, FileText, Settings, X, ArrowLeft,
} from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
  { href: "/monitoring", icon: Radio,            label: "Projekty" },
  { href: "/trends",     icon: TrendingUp,       label: "Trendy" },
  { href: "/network",    icon: Network,          label: "Źródła" },
  { href: "/reports",    icon: FileText,         label: "Raporty" },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-[#080b14] border-r border-sky-400/10 h-screen">
      {/* Logo — planeta, spójna z hubem */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-sky-400/10">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_25%,#ffffff,#dbeafe_55%,#b8c7e8)] ring-1 ring-sky-300/70"
            style={{ boxShadow: "0 0 16px rgba(56,189,248,.45)" }}>
            <Image
              src="/logos/narrative-scope.png"
              alt="NarrativeScope"
              width={30}
              height={30}
              className="h-[26px] w-[26px] object-contain"
              priority
            />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">NarrativeScope</span>
        </Link>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Zamknij menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Powrót do głównego panelu Political Dark Matter — zawsze widoczny, na górze */}
      <div className="px-3 pt-3">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-sky-400/15 bg-slate-900/40 hover:bg-slate-900/80 hover:border-sky-400/30 transition-colors text-xs font-medium text-slate-300 hover:text-white group"
          title="Wróć do Political Dark Matter"
        >
          <ArrowLeft size={13} className="text-sky-400 group-hover:-translate-x-0.5 transition-transform" />
          Panel główny Political Dark Matter
        </Link>
      </div>

      {/* Label sekcji */}
      <div className="px-5 pt-3 pb-1">
        <span className="text-[10px] font-semibold text-blue-200/40 tracking-widest uppercase">
          Narrative Intelligence
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-3 space-y-0.5">
        {NAV_ITEMS.map(function ({ href, icon: Icon, label }) {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-sky-400/10 text-sky-300 font-semibold shadow-[0_0_18px_rgba(56,189,248,0.1)] ring-1 ring-sky-400/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-sky-400/10 pt-3">
        <Link
          href="/settings"
          onClick={onClose}
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            pathname === "/settings"
              ? "bg-sky-400/10 text-sky-300 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Settings size={16} />
          Ustawienia
        </Link>
        <div className="mt-3 mx-2">
          <div className="text-[10px] text-slate-600 text-center">© 2026 NarrativeScope</div>
        </div>
      </div>
    </aside>
  );
}
