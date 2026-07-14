import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import {
  Film, Newspaper, CalendarClock, Gauge, RefreshCw, ShieldCheck, Sparkles,
  Youtube, Instagram, Facebook, Music2, Radio, Globe,
} from "lucide-react";

export const metadata: Metadata = { title: "Pulse Field" };

const PLATFORMS = [
  { name: "Własne medium", Icon: Globe, color: "#38bdf8" },
  { name: "Newsletter", Icon: Newspaper, color: "#a78bfa" },
  { name: "YouTube", Icon: Youtube, color: "#ff2d2d" },
  { name: "TikTok", Icon: Music2, color: "#22d3ee" },
  { name: "Instagram", Icon: Instagram, color: "#ec4899" },
  { name: "Facebook", Icon: Facebook, color: "#3b82f6" },
];

const CAPS = [
  { Icon: Film, title: "Generator multimediów", desc: "Reelsy, wideo pionowe, karty cytatowe i karuzele z zatwierdzonego przekazu, w formacie każdej platformy." },
  { Icon: Globe, title: "Własne medium", desc: "Serwis pod własną domeną i newsletter. Kanał, którego nikt nie wyłączy i który nie zależy od cudzego algorytmu." },
  { Icon: Radio, title: "Dystrybucja wielokanałowa", desc: "YouTube, TikTok, Instagram, Facebook. Pakiet skrojony pod każdy kanał, z podglądem przed emisją." },
  { Icon: CalendarClock, title: "Kalendarz i reżyseria emisji", desc: "Teaser, przekaz główny, follow-up, riposta. Kolejność, kanały i najlepsze okna czasowe, per sprawa." },
  { Icon: Gauge, title: "Panel skuteczności", desc: "Co zadziałało, a co nie: kanał, godzina, grupa. Zestawione z prognozą e-Media i reakcją z e-Wyborcy." },
  { Icon: RefreshCw, title: "Pętla zwrotna", desc: "Efekt emisji wraca do Narrative Scope jako nowy sygnał i domyka kokpit sprawy: sygnał, decyzja, komunikat, publikacja, efekt." },
];

export default function PulseFieldPage() {
  return (
    <div className="min-h-screen bg-[#04060d] text-slate-200">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.08),transparent_38%),radial-gradient(circle_at_82%_100%,rgba(124,58,237,0.14),transparent_42%)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-5 py-8">
        <PageHeader
          title="Pulse Field"
          subtitle="Emisja i dystrybucja. Własne medium plus silnik multimediów, który zamienia zatwierdzony przekaz w wideo, grafiki i publikacje na wszystkich kanałach."
          logo="/logos/pulse-field.png"
          status="w budowie"
        />

        <div className="mt-2 text-center">
          <h2 className="pf-shine bg-gradient-to-r from-sky-300 via-violet-300 to-fuchsia-300 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
            Tu przekaz staje się emisją.
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
            Ostatni moduł ekosystemu, w zaawansowanej fazie developerskiej. Oto co spina.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-sky-400/15 bg-slate-950/40 p-3 shadow-[0_0_60px_rgba(37,99,235,0.12)]">
          <svg viewBox="0 0 1000 430" className="w-full" style={{ overflow: "visible" }}>
            <defs>
              <radialGradient id="pfCore" cx="38%" cy="32%" r="75%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </radialGradient>
              <linearGradient id="pfLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#38bdf8" />
                <stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
            </defs>

            {PLATFORMS.map((p, i) => {
              const y = 40 + i * 70;
              return <path key={i} d={`M520 215 C 660 215, 700 ${y + 20}, 792 ${y + 20}`} fill="none" stroke={p.color} strokeOpacity="0.5" strokeWidth="2" className="pf-flow" />;
            })}
            <path d="M210 215 C 300 215, 360 215, 452 215" fill="none" stroke="url(#pfLine)" strokeWidth="3" className="pf-flow" />
            <path d="M890 400 C 500 470, 120 430, 120 300" fill="none" stroke="#34d399" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="2 8" />
            <text x="150" y="295" fill="#6ee7b7" fontSize="12" fontWeight="700">pętla zwrotna → Narrative Scope</text>

            <g>
              <rect x="30" y="188" width="180" height="54" rx="12" fill="#0b1220" stroke="#38bdf8" strokeOpacity="0.5" />
              <text x="120" y="212" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="800">PRZEKAZ</text>
              <text x="120" y="230" textAnchor="middle" fill="#94a3b8" fontSize="11">zatwierdzony z Volt Stream</text>
            </g>

            <circle cx="486" cy="215" r="66" fill="none" stroke="#7c3aed" strokeOpacity="0.4" strokeWidth="2" className="pf-ring" style={{ transformOrigin: "486px 215px" }} />
            <circle cx="486" cy="215" r="58" fill="url(#pfCore)" className="pf-core" style={{ transformOrigin: "486px 215px", filter: "drop-shadow(0 0 26px rgba(124,58,237,0.7))" }} />
            <text x="486" y="211" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="900">PULSE FIELD</text>
            <text x="486" y="229" textAnchor="middle" fill="#e9d5ff" fontSize="10.5">silnik multimediów</text>

            {PLATFORMS.map((p, i) => {
              const y = 40 + i * 70;
              return (
                <g key={i} className="pf-float" style={{ animationDelay: `${i * 0.35}s` }}>
                  <rect x="792" y={y} width="188" height="40" rx="10" fill="#0b1220" stroke={p.color} strokeOpacity="0.55" />
                  <circle cx="814" cy={y + 20} r="7" fill={p.color} />
                  <text x="834" y={y + 25} fill="#e2e8f0" fontSize="13" fontWeight="700">{p.name}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {PLATFORMS.map((p) => (
            <span key={p.name} className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold text-white" style={{ borderColor: p.color + "66", background: p.color + "14" }}>
              <p.Icon size={15} style={{ color: p.color }} /> {p.name}
            </span>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAPS.map((c) => (
            <div key={c.title} className="group rounded-xl border border-sky-400/15 bg-slate-900/50 p-4 transition-colors hover:border-sky-400/35">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg">
                <c.Icon size={20} className="text-white" />
              </div>
              <div className="text-sm font-bold text-white">{c.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{c.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.04] p-4 sm:flex-row sm:items-center">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-sky-600 shadow-lg">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div className="text-sm text-slate-300">
            <span className="font-bold text-white">Bramka człowieka i uczciwość.</span> Nic nie wychodzi bez zatwierdzenia. Żadnych botów, fałszywych kont ani syntetycznego głosu czy twarzy polityka. AI produkuje montaż, grafiki i napisy, publikuje człowiek.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
          <Sparkles size={13} className="text-violet-400" />
          Moduł w zaawansowanej fazie developerskiej. Obecny etap: kalibracja i spięcie z Volt Stream oraz z pętlą zwrotną.
        </div>
      </div>
    </div>
  );
}
