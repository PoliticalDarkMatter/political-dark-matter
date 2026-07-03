"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, Radio, TrendingUp, Network, FileText, Settings, X,
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
    <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200 h-screen shadow-sm">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/logo.png"
            alt="NarrativeScope"
            width={200}
            height={158}
            className="h-12 w-auto object-contain"
            priority
          />
        </Link>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Zamknij menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Label + powrót do ekosystemu */}
      <div className="px-5 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase">
          Narrative Intelligence
        </span>
        <Link
          href="/"
          className="text-[10px] font-medium text-brand-600 hover:text-brand-700 transition-colors"
          title="Wróć do Political Dark Matter"
        >
          Ekosystem
        </Link>
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
                  ? "bg-brand-500/10 text-brand-600 font-semibold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3">
        <Link
          href="/settings"
          onClick={onClose}
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            pathname === "/settings"
              ? "bg-brand-500/10 text-brand-600 font-semibold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          )}
        >
          <Settings size={16} />
          Ustawienia
        </Link>
        <div className="mt-3 mx-2">
          <div className="text-[10px] text-slate-300 text-center">© 2026 NarrativeScope</div>
        </div>
      </div>
    </aside>
  );
}
