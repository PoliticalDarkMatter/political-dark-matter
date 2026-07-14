import Image from "next/image";
import type { ReactNode } from "react";

// ── Ikony komet (te same co na hubie, OrbitHub) ────────────────────────
export function InsightBaseIcon() {
  return (
    <svg viewBox="0 0 64 40" className="h-7 w-11 text-indigo-700">
      <ellipse cx="20" cy="12" rx="16" ry="5" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M4 12v10c0 2.8 7.2 5 16 5s16-2.2 16-5V12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M4 17c0 2.8 7.2 5 16 5s16-2.2 16-5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".55" />
      <path d="M46 8l3 6 6 1.5-6 1.5-3 6-3-6-6-1.5 6-1.5z" fill="currentColor" opacity=".85" />
    </svg>
  );
}
export function KonsyliumIcon() {
  return (
    <svg viewBox="0 0 64 40" className="h-7 w-11 text-amber-700">
      <circle cx="32" cy="20" r="6" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="3" fill="none" opacity=".85" />
      <circle cx="52" cy="12" r="4" stroke="currentColor" strokeWidth="3" fill="none" opacity=".85" />
      <circle cx="12" cy="30" r="4" stroke="currentColor" strokeWidth="3" fill="none" opacity=".85" />
      <circle cx="52" cy="30" r="4" stroke="currentColor" strokeWidth="3" fill="none" opacity=".85" />
      <path d="M17 14L27 18M47 14L37 18M17 28L27 22M47 28L37 22" stroke="currentColor" strokeWidth="2" opacity=".55" />
      <path d="M46 8l3 6 6 1.5-6 1.5-3 6-3-6-6-1.5 6-1.5z" fill="currentColor" opacity=".85" />
    </svg>
  );
}
export function PetruIcon() {
  return (
    <svg viewBox="0 0 64 40" className="h-7 w-11 text-emerald-700">
      <circle cx="26" cy="16" r="7" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M14 34c2-6 8-9 12-9s10 3 12 9" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M44 10c4 2 6 5 6 9s-2 7-6 9" stroke="currentColor" strokeWidth="2.5" fill="none" opacity=".7" />
      <path d="M49 6c6 3 9 8 9 13s-3 10-9 13" stroke="currentColor" strokeWidth="2" fill="none" opacity=".45" />
    </svg>
  );
}
export function MediaIcon() {
  return (
    <svg viewBox="0 0 64 40" className="h-7 w-11 text-rose-700">
      <rect x="10" y="8" width="34" height="26" rx="3" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M44 16h9v14a4 4 0 0 1-4 4h-5" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M16 15h16M16 21h16M16 27h10" stroke="currentColor" strokeWidth="2.5" opacity=".7" />
    </svg>
  );
}

export type CometKind = "ewyborcy" | "konsylium" | "epetru" | "emedia";
const COMET: Record<CometKind, { bg: string; ring: string; glow: string; Icon: () => ReactNode }> = {
  ewyborcy: { bg: "radial-gradient(circle at 35% 30%, #ffffff, #e0e7ff 55%, #c7d2fe)", ring: "ring-indigo-200/60", glow: "0 0 24px rgba(129,140,248,0.5)", Icon: InsightBaseIcon },
  konsylium: { bg: "radial-gradient(circle at 35% 30%, #ffffff, #fef3c7 55%, #fde68a)", ring: "ring-amber-200/60", glow: "0 0 24px rgba(251,191,36,0.5)", Icon: KonsyliumIcon },
  epetru: { bg: "radial-gradient(circle at 35% 30%, #ffffff, #d1fae5 55%, #a7f3d0)", ring: "ring-emerald-200/60", glow: "0 0 24px rgba(16,185,129,0.5)", Icon: PetruIcon },
  emedia: { bg: "radial-gradient(circle at 35% 30%, #ffffff, #ffe4e6 55%, #fecdd3)", ring: "ring-rose-200/60", glow: "0 0 24px rgba(244,63,94,0.5)", Icon: MediaIcon },
};

// Kometa (submoduł): głowa komety z ikoną, tak jak na hubie
export function CometBadge({ kind }: { kind: CometKind }) {
  const c = COMET[kind];
  const Icon = c.Icon;
  return (
    <div className="group relative flex flex-col items-center">
      <div className="pointer-events-none absolute right-full top-1/2 h-[2px] w-8 -translate-y-1/2 bg-gradient-to-r from-transparent to-white/40 opacity-70" />
      <div className={`relative flex h-14 w-16 items-center justify-center rounded-full ring-1 ${c.ring}`} style={{ background: c.bg, boxShadow: c.glow }}>
        <Icon />
      </div>
    </div>
  );
}

// Planeta (moduł): świecąca kula z logo, tak jak na hubie
export function PlanetBadge({ logo, alt }: { logo: string; alt: string }) {
  return (
    <div
      className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_25%,#ffffff,#dbeafe_55%,#b8c7e8)] ring-1 ring-sky-300/70"
      style={{ boxShadow: "0 0 24px rgba(56,189,248,0.5)" }}
    >
      <Image src={logo} alt={alt} width={40} height={40} className="h-9 w-9 object-contain" priority />
    </div>
  );
}
