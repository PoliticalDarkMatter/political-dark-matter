"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, FileSearch, ImageIcon, Radar } from "lucide-react";

// ── Narrative Scope — hub wewnętrzny modułu ───────────────────────────
// Ten sam język wizualny co components/hub/OrbitHub.tsx (top-level hub
// Political Dark Matter): głęboki navy, gwiazdy, komety, poświata,
// szklane karty. Różnica: to NIE jest orbita 4 modułów PDM, tylko
// wejściowy ekran samego Narrative Scope z trzema konkretnymi
// narzędziami — Jan poprosił wprost o "centralny pulpit i trzy
// przyciski / rodzaj planet z napisami" przy wejściu w moduł.
// Podpięty w AppShell.tsx jako trasa standalone (bez Sidebar/Header),
// dokładnie jak "/" — to jest ekran wyboru, nie treść robocza.

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
    key: "post-factum",
    title: "Analiza post factum",
    subtitle: "Dashboard",
    description: "Co już się wydarzyło w sieci: narracje, sentyment, aktorzy, oś czasu.",
    href: "/dashboard",
    icon: FileSearch,
    accent: "#38bdf8",
  },
  {
    key: "reaction-words",
    title: "Symulator reakcji na słowa",
    subtitle: "Narrative Impact Lab",
    description: "Testuj wypowiedź przed publikacją — ryzyko, segmenty, media, przeciwnicy.",
    href: "/reaction-lab",
    icon: Radar,
    accent: "#a78bfa",
  },
  {
    key: "reaction-image",
    title: "Symulator reakcji na obraz",
    subtitle: "Visual Narrative Lab",
    description: "Testuj zdjęcie przed publikacją — memiczność, hotspoty ryzyka, media.",
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
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-sky-400/15 bg-slate-900/40 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-sky-400/30 hover:bg-slate-900/80 hover:text-white"
          >
            <ArrowLeft size={13} className="text-sky-400" />
            Panel główny Political Dark Matter
          </Link>
          <div className="flex items-center gap-2.5">
            <div
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_25%,#ffffff,#dbeafe_55%,#b8c7e8)] ring-1 ring-sky-300/70"
              style={{ boxShadow: "0 0 16px rgba(56,189,248,.45)" }}
            >
              <Image src="/logos/narrative-scope.png" alt="NarrativeScope" width={30} height={30} className="h-[26px] w-[26px] object-contain" priority />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">NarrativeScope</span>
          </div>
        </div>

        <header className="mx-auto mt-14 max-w-3xl text-center">
          <div className="mb-3 font-bold uppercase text-blue-300/80" style={{ fontSize: "12px", letterSpacing: "0.36em" }}>
            Political Dark Matter · Moduł 1
          </div>
          <h1
            className="bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(99,102,241,0.35)]"
            style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 900, letterSpacing: "-0.03em", fontSize: "clamp(40px, 5vw, 60px)", lineHeight: 1.08, backgroundImage: "linear-gradient(90deg, #60a5fa, #93c5fd, #e879f9)" }}
          >
            Narrative Scope
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-300/80">
            Radar narracyjny: co już się wydarzyło w sieci i co może się wydarzyć, zanim polityk cokolwiek opublikuje.
          </p>
        </header>

        <div className="relative mx-auto mt-16 flex w-full max-w-4xl flex-col items-center gap-10 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
          {/* Belka łącząca trzy narzędzia — czysto dekoracyjna, spójna z orbitą PDM */}
          <div className="pointer-events-none absolute left-0 right-0 top-14 hidden h-px sm:block" style={{ background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.4), rgba(167,139,250,0.4), rgba(244,114,182,0.4), transparent)" }} />
          {TOOLS.map((tool) => (
            <ToolOrb key={tool.key} tool={tool} />
          ))}
        </div>
      </section>
    </main>
  );
}
