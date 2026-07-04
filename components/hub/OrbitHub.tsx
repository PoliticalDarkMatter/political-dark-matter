import Image from "next/image";
import Link from "next/link";

interface ModuleDef {
  key: string;
  name: string;
  logo: string;
  role: string;
  status: string;
  active: boolean;
  angle: number; // stopnie: -90 góra, 0 prawo, 90 dół, 180 lewo
  href: string;
}

const modules: ModuleDef[] = [
  {
    key: "narrative",
    name: "Narrative Scope",
    logo: "/logos/narrative-scope.png",
    role: "Słuchanie",
    status: "AKTYWNY",
    active: true,
    angle: -90,
    href: "/dashboard",
  },
  {
    key: "apex",
    name: "Apex Grid",
    logo: "/logos/apex-grid.png",
    role: "Analiza",
    status: "W BUDOWIE",
    active: false,
    angle: 0,
    href: "/apex-grid",
  },
  {
    key: "volt",
    name: "Volt Stream",
    logo: "/logos/volt-stream.png",
    role: "Przekaz",
    status: "W BUDOWIE",
    active: false,
    angle: 90,
    href: "/volt-stream",
  },
  {
    key: "pulse",
    name: "Pulse Field",
    logo: "/logos/pulse-field.png",
    role: "Emisja",
    status: "W BUDOWIE",
    active: false,
    angle: 180,
    href: "/pulse-field",
  },
];

const bottomCards = [
  {
    title: "SŁUCHANIE",
    text: ["monitoring narracji", "w czasie rzeczywistym"],
    icon: "wave",
  },
  {
    title: "ANALIZA",
    text: ["scenariusze i rekomendacje", "strategiczne"],
    icon: "chart",
  },
  {
    title: "PRZEKAZ",
    text: ["komunikacja skrojona", "pod projekt"],
    icon: "message",
  },
  {
    title: "EMISJA",
    text: ["własne medium i", "dystrybucja"],
    icon: "broadcast",
  },
];

// Geometria orbity — elipsa szeroka i płaska (jak we wzorcu), nie okrąg.
// viewBox 1000x600 (proporcja 5:3), moduły leżą na elipsie RX/RY,
// łuki łączące moduły wybrzuszają się na większej elipsie ARC_RX/ARC_RY.
const VB_W = 1000;
const VB_H = 600;
const CX = 500;
const CY = 300;
const RX = 200;
const RY = 115;
const ARC_RX = 235;
const ARC_RY = 148;

function pointOnEllipse(angleDeg: number, rx: number, ry: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + rx * Math.cos(rad), y: CY + ry * Math.sin(rad) };
}

function arcPath(fromAngle: number, toAngle: number) {
  const from = pointOnEllipse(fromAngle, RX, RY);
  const to = pointOnEllipse(toAngle, RX, RY);
  const mid = (fromAngle + toAngle) / 2;
  const ctrl = pointOnEllipse(mid, ARC_RX, ARC_RY);
  return `M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`;
}

// kolejność pętli: Narrative Scope -> Apex Grid -> Volt Stream -> Pulse Field -> z powrotem
const FLOWS = [
  { from: modules[0], to: modules[1] },
  { from: modules[1], to: modules[2] },
  { from: modules[2], to: modules[3] },
  { from: modules[3], to: modules[0] },
];

function NeonIcon({ type }: { type: string }) {
  if (type === "chart") {
    return (
      <svg viewBox="0 0 64 64" className="h-9 w-9">
        <path d="M10 50V36M24 50V25M38 50V16M52 50V9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M10 38L24 27L38 32L52 13" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "message") {
    return (
      <svg viewBox="0 0 64 64" className="h-9 w-9">
        <rect x="10" y="14" width="34" height="26" rx="5" stroke="currentColor" strokeWidth="4" fill="none" />
        <rect x="22" y="25" width="32" height="25" rx="5" stroke="currentColor" strokeWidth="4" fill="none" />
        <path d="M29 50L25 58L39 50" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "broadcast") {
    return (
      <svg viewBox="0 0 64 64" className="h-9 w-9">
        <circle cx="32" cy="32" r="5" fill="currentColor" />
        <path d="M22 22a14 14 0 000 20M42 22a14 14 0 010 20" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M14 14a26 26 0 000 36M50 14a26 26 0 010 36" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".65" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-9 w-9">
      <path d="M8 34h7l5-13 8 27 8-34 8 20h12" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 46h34" stroke="currentColor" strokeWidth="3" opacity=".35" strokeLinecap="round" />
    </svg>
  );
}

function HudPanel({
  title,
  className,
  type,
}: {
  title: string;
  className: string;
  type: "line" | "bars" | "map" | "radar";
}) {
  return (
    <div
      className={[
        "absolute hidden lg:block rounded-xl border border-sky-400/15 bg-slate-950/30 p-4",
        "shadow-[0_0_40px_rgba(59,130,246,0.08)] backdrop-blur-md",
        className,
      ].join(" ")}
    >
      <div className="mb-3 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200/45">
        {title}
      </div>
      {type === "line" && (
        <svg viewBox="0 0 180 54" className="h-14 w-44 text-sky-400/70">
          <path d="M5 38L24 21L42 34L61 18L83 30L105 15L126 35L146 20L172 31" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M5 46H175" stroke="currentColor" strokeOpacity=".2" />
        </svg>
      )}
      {type === "bars" && (
        <svg viewBox="0 0 180 54" className="h-14 w-44 text-violet-400/70">
          {Array.from({ length: 16 }).map((_, i) => (
            <rect
              key={i}
              x={8 + i * 10}
              y={44 - ((i * 7) % 32)}
              width="5"
              height={12 + ((i * 7) % 32)}
              rx="2"
              fill="currentColor"
              opacity={i % 3 === 0 ? 1 : 0.45}
            />
          ))}
        </svg>
      )}
      {type === "map" && (
        <div className="relative h-14 w-44 overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(56,189,248,.35),transparent_2px),radial-gradient(circle_at_60%_35%,rgba(124,58,237,.35),transparent_2px),radial-gradient(circle_at_70%_70%,rgba(56,189,248,.25),transparent_2px)] bg-[length:18px_18px]" />
          <div className="absolute bottom-2 left-2 h-1 w-20 rounded-full bg-sky-500/70" />
          <div className="pdm-pulse-bar absolute bottom-2 left-24 h-1 w-10 rounded-full bg-violet-500/70" />
        </div>
      )}
      {type === "radar" && (
        <svg viewBox="0 0 90 54" className="h-14 w-44 text-sky-400/60">
          <circle cx="28" cy="27" r="20" fill="none" stroke="currentColor" strokeWidth="1" opacity=".4" />
          <circle cx="28" cy="27" r="11" fill="none" stroke="currentColor" strokeWidth="1" opacity=".6" />
          <path d="M28 27L44 15" stroke="currentColor" strokeWidth="2" />
          <circle cx="28" cy="27" r="3" fill="currentColor" className="pdm-radar-dot" />
          <path d="M65 14H88M65 27H82M65 40H90" stroke="currentColor" strokeWidth="2" opacity=".45" />
        </svg>
      )}
    </div>
  );
}

function ModuleOrb({ module: m }: { module: ModuleDef }) {
  const pos = pointOnEllipse(m.angle, RX, RY);
  const leftPct = (pos.x / VB_W) * 100;
  const topPct = (pos.y / VB_H) * 100;
  return (
    <Link
      href={m.href}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
    >
      <div className="group flex flex-col items-center">
        <div
          className={[
            "relative flex h-28 w-28 items-center justify-center rounded-full",
            "bg-[radial-gradient(circle_at_35%_25%,#ffffff,#dbeafe_55%,#b8c7e8)]",
            "shadow-[0_0_34px_rgba(96,165,250,0.45)]",
            m.active
              ? "ring-2 ring-sky-300/80 shadow-[0_0_60px_rgba(59,130,246,0.75)]"
              : "ring-1 ring-sky-300/35",
          ].join(" ")}
        >
          <div className="absolute -inset-3 rounded-full border border-sky-400/25" />
          <div className="absolute -inset-5 rounded-full border border-violet-500/15 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <Image
            src={m.logo}
            alt={m.name}
            width={92}
            height={92}
            className="h-[74px] w-[74px] object-contain"
          />
        </div>
        <div
          className={[
            "mt-3 min-w-[120px] rounded-lg border px-4 py-2 text-center backdrop-blur-md",
            "bg-slate-950/70 shadow-[0_0_28px_rgba(15,23,42,0.9)]",
            m.active ? "border-sky-300/40" : "border-sky-300/20",
          ].join(" ")}
        >
          <div className="text-sm font-semibold text-white">{m.role}</div>
          <div
            className={[
              "mt-0.5 text-[11px] font-bold tracking-wide",
              m.active ? "text-emerald-400" : "text-blue-400",
            ].join(" ")}
          >
            {m.status}
            <span
              className={[
                "ml-2 inline-block h-2 w-2 rounded-full",
                m.active ? "bg-emerald-400 animate-pulse" : "bg-blue-500",
              ].join(" ")}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function OrbitHub() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070d] text-white">
      {/* Tło bazowe — gradienty pod mapą świata (gradient jest nieprzezroczysty,
          więc mapa musi być narysowana NAD nim, inaczej znika pod spodem) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(79,70,229,0.34),transparent_30%),radial-gradient(circle_at_50%_15%,rgba(14,165,233,0.18),transparent_24%),linear-gradient(180deg,#05070d_0%,#07101f_52%,#05070d_100%)]" />

      {/* Mapa świata z kropek — jak we wzorcu, pełna szerokość górnej sekcji */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px] opacity-[0.28]"
        style={{
          backgroundImage: "url(/world-map-dots.svg)",
          backgroundSize: "100% auto",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,.55)_1px,transparent_1.4px),radial-gradient(circle_at_70%_30%,rgba(147,197,253,.55)_1px,transparent_1.5px),radial-gradient(circle_at_85%_70%,rgba(255,255,255,.45)_1px,transparent_1.3px)] [background-size:140px_140px,220px_220px,180px_180px]" />

      {/* Cztery narożne widgety — kotwiczone do krawędzi całej sekcji, jak we wzorcu */}
      <div className="pointer-events-none absolute inset-0 z-[6]">
        <HudPanel title="DANE NARRACYJNE" type="line" className="left-[4%] top-[30%]" />
        <HudPanel title="ANALIZA SCENARIUSZOWA" type="bars" className="right-[4%] top-[30%]" />
        <HudPanel title="AKTYWNOŚĆ W SIECI" type="map" className="left-[2%] top-[64%]" />
        <HudPanel title="ZASIĘG I DYSTRYBUCJA" type="radar" className="right-[2%] top-[64%]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-8 pt-8">
        <header className="mx-auto max-w-4xl text-center">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.48em] text-blue-300/80">
            EKOSYSTEM AI DLA POLITYKI
          </div>
          <h1 className="bg-gradient-to-r from-blue-400 via-sky-200 to-fuchsia-300 bg-clip-text text-5xl font-black tracking-tight text-transparent drop-shadow-[0_0_30px_rgba(99,102,241,0.35)] md:text-7xl">
            Political Dark Matter
          </h1>
          <p className="mt-4 text-xl font-medium text-slate-100/90">
            Niewidoczna infrastruktura zwycięskiej komunikacji politycznej.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300/75">
            Monitoring narracji, analiza scenariuszowa, generowanie przekazu
            <br className="hidden sm:block" />
            i dystrybucja w jednym systemie wspieranym przez AI.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="pdm-cta-glow group rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-3 text-sm font-bold text-white ring-1 ring-white/20 transition hover:scale-[1.02]"
            >
              Uruchom prototyp
              <span className="ml-5 inline-block transition group-hover:translate-x-1">→</span>
            </Link>
            <a
              href="#modules"
              className="group rounded-lg border border-slate-400/20 bg-slate-950/40 px-8 py-3 text-sm font-bold text-slate-100 backdrop-blur-md transition hover:border-sky-300/40 hover:bg-slate-900/60"
            >
              Zobacz moduły
              <span className="ml-5 inline-block transition group-hover:translate-x-1">→</span>
            </a>
          </div>
        </header>

        {/* Orbita — elipsa proporcjonalna do wzorca (VB_W x VB_H), z animowanymi
            przepływami między modułami i pulsującym centrum */}
        <div id="modules" className="relative mx-auto mt-10 w-full max-w-[1100px] aspect-[5/3] scroll-mt-10">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="absolute inset-0 h-full w-full"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>

            {/* statyczny pierścień prowadzący — cienka, szeroka elipsa */}
            <ellipse
              cx={CX}
              cy={CY}
              rx={RX + 22}
              ry={RY + 22}
              fill="none"
              stroke="#818cf8"
              strokeOpacity={0.3}
              strokeWidth={1}
              strokeDasharray="2 7"
            />

            {/* przepływy między modułami — animowana przerywana linia */}
            {FLOWS.map((f, i) => (
              <path
                key={i}
                d={arcPath(f.from.angle, f.to.angle)}
                fill="none"
                stroke="url(#flowGrad)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="6 10"
                className="orbit-flow"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </svg>

          {/* Centrum — Profil projektu, tętniące */}
          <div className="absolute left-1/2 top-1/2 z-10 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-violet-300/70 bg-slate-950/80 text-center shadow-[0_0_75px_rgba(124,58,237,0.9)]">
            <div className="pdm-core-breathe absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.55)_0%,transparent_70%)]" />
            <div className="pdm-ping absolute -inset-5 rounded-full border border-violet-400/40" />
            <div className="pdm-ping absolute -inset-5 rounded-full border border-sky-400/30" style={{ animationDelay: "1.5s" }} />
            <div className="relative">
              <div className="text-lg font-bold text-white">Profil</div>
              <div className="text-sm text-slate-300/70">projektu</div>
            </div>
          </div>

          {modules.map((m) => (
            <ModuleOrb key={m.key} module={m} />
          ))}
        </div>

        <div className="mx-auto mt-16 grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {bottomCards.map((card) => (
            <div
              key={card.title}
              className="group rounded-2xl border border-sky-300/20 bg-slate-950/50 p-5 shadow-[0_0_32px_rgba(59,130,246,0.12)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-300/45 hover:shadow-[0_0_50px_rgba(124,58,237,0.22)]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-950/80 to-violet-950/70 text-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.2)]">
                  <NeonIcon type={card.icon} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-wide text-slate-100">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300/70">
                    {card.text[0]}
                    <br />
                    {card.text[1]}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @keyframes orbit-flow-dash {
          to { stroke-dashoffset: -160; }
        }
        .orbit-flow {
          animation: orbit-flow-dash 3.5s linear infinite;
          opacity: 0.9;
        }
        .pdm-core-breathe {
          animation: pdm-core-breathe 3.2s ease-in-out infinite;
        }
        @keyframes pdm-core-breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.18); opacity: 1; }
        }
        .pdm-ping {
          animation: pdm-ping 3s ease-out infinite;
          animation-fill-mode: both;
        }
        @keyframes pdm-ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .pdm-cta-glow {
          animation: pdm-cta-glow 3s ease-in-out infinite;
        }
        @keyframes pdm-cta-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(37,99,235,0.45); }
          50% { box-shadow: 0 0 34px rgba(124,58,237,0.7); }
        }
        .pdm-pulse-bar {
          animation: pdm-pulse-bar 2.4s ease-in-out infinite;
        }
        @keyframes pdm-pulse-bar {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .pdm-radar-dot {
          transform-origin: center;
          transform-box: fill-box;
          animation: pdm-radar-dot 2s ease-in-out infinite;
        }
        @keyframes pdm-radar-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
      `}</style>
    </main>
  );
}
