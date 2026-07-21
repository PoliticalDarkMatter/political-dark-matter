"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, FileSearch, ImageIcon, Radar, ScanSearch } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

// ── Narrative Scope — hub wewnętrzny modułu ───────────────────────────
// Ten sam język wizualny co components/hub/OrbitHub.tsx (top-level hub
// IMPACT CENTER): głęboki navy, gwiazdy, komety, poświata,
// szklane karty. To NIE jest orbita 4 modułów PDM, tylko wejściowy
// ekran samego Narrative Scope.
//
// Cztery narzędzia (Jan, 2026-07-07 — zastąpienie wcześniejszego układu
// z "Dashboardem" jako osobną kategorią): dwie pary "sprawdź naprawdę"
// vs "przewiduj z wyprzedzeniem", jedna dla tekstu/faktu, jedna dla
// zdjęcia/mema. "Reakcja na..." to NOWA kategoria (post factum, realne
// dane z buildFeed) — "Symulator..." to istniejące moduły (AI, hipoteza
// przed publikacją). Świadomie brak tu wejścia opisanego jako
// "Dashboard" — ogólny wolny monitoring (dawny app/dashboard) zostaje
// dostępny tylko przez "Projekty" w Sidebar, nie jako jedna z czterech
// głównych planet.

interface ToolDef {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: typeof Radar;
  accent: string; // kolor akcentu orbity/glow
}

const TOOLS: ToolDef[] = [
  {
    key: "reaction-check-text",
    title: "Reakcja na przekaz/fakt",
    subtitle: "Realne dane, nie symulacja",
    description: "Sprawdź, co NAPRAWDĘ działo się w sieci wokół wypowiedzi albo zdarzenia, które już zaszło.",
    href: "/reaction-check",
    icon: FileSearch,
    accent: "#38bdf8",
  },
  {
    key: "reaction-check-image",
    title: "Reakcja na zdjęcie/mem",
    subtitle: "Realne dane, nie symulacja",
    description: "Sprawdź, co NAPRAWDĘ piszą media i sieć o zdjęciu/memie, który już krąży.",
    href: "/image-reaction-check",
    icon: ScanSearch,
    accent: "#34d399",
  },
  {
    key: "reaction-words",
    title: "Symulator reakcji na przekaz/fakt",
    subtitle: "Narrative Impact Lab",
    description: "Przewiduj reakcję na wypowiedź PRZED publikacją — ryzyko, segmenty, media, przeciwnicy.",
    href: "/reaction-lab",
    icon: Radar,
    accent: "#a78bfa",
  },
  {
    key: "reaction-image",
    title: "Symulator reakcji na zdjęcie/mem",
    subtitle: "Visual Narrative Lab",
    description: "Przewiduj reakcję na zdjęcie PRZED publikacją — memiczność, hotspoty ryzyka, media.",
    href: "/image-lab",
    icon: ImageIcon,
    accent: "#f472b6",
  },
];

function ToolOrb({ tool }: { tool: ToolDef }) {
  const Icon = tool.icon;
  return (
    <Link href={tool.href} className="group flex flex-col items-center" style={{ minWidth: 200 }}>
      <div
        className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_25%,#ffffff,#dbeafe_55%,#b8c7e8)] ring-2 transition-transform duration-200 group-hover:scale-[1.05]"
        style={{ boxShadow: `0 0 55px ${tool.accent}88`, borderColor: tool.accent }}
      >
        <div className="absolute -inset-2 sm:-inset-3 rounded-full border" style={{ borderColor: tool.accent + "40" }} />
        <div
          className="absolute -inset-3 sm:-inset-5 rounded-full border opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ borderColor: tool.accent + "30" }}
        />
        <Icon size={44} strokeWidth={1.8} color="#1e293b" />
      </div>
      <div
        className="mt-3 w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-center backdrop-blur-md shadow-[0_0_28px_rgba(15,23,42,0.9)] transition-colors"
        style={{ borderColor: tool.accent + "35" }}
      >
        <div className="text-sm sm:text-[15px] font-bold text-white leading-tight">{tool.title}</div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: tool.accent }}>{tool.subtitle}</div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">{tool.description}</p>
      </div>
    </Link>
  );
}

export default function NarrativeScopeHub() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_50%_85%,rgba(124,58,237,0.30),transparent_34%),linear-gradient(180deg,#03050b_0%,#07101f_52%,#03050b_100%)]" />

      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(0.6px_0.6px_at_15px_25px,#fff,transparent),radial-gradient(0.6px_0.6px_at_75px_95px,#fff,transparent),radial-gradient(0.6px_0.6px_at_130px_45px,#fff,transparent),radial-gradient(0.6px_0.6px_at_190px_150px,#fff,transparent),radial-gradient(0.6px_0.6px_at_250px_70px,#fff,transparent),radial-gradient(0.6px_0.6px_at_310px_190px,#fff,transparent)] [background-size:340px_340px]" />
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(1.4px_1.4px_at_40px_60px,#fff,transparent),radial-gradient(1.3px_1.3px_at_160px_20px,#fff,transparent),radial-gradient(1.5px_1.5px_at_100px_180px,#fff,transparent),radial-gradient(1.3px_1.3px_at_230px_120px,#fff,transparent),radial-gradient(1.4px_1.4px_at_300px_240px,#fff,transparent)] [background-size:460px_460px]" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-14 pt-8 sm:px-8">
        <PageHeader title="Narrative Scope" subtitle="Radar narracyjny: co NAPRAWDĘ już się wydarzyło w sieci i co MOŻE się wydarzyć, zanim cokolwiek zostanie opublikowane." logo="/logos/narrative-scope.png" status="AKTYWNY" />

        <div className="relative mx-auto mt-16 grid w-full max-w-3xl grid-cols-1 place-items-center gap-x-10 gap-y-12 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <ToolOrb key={tool.key} tool={tool} />
          ))}
        </div>
      </section>
    </main>
  );
}
