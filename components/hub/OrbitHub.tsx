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
    href: "/narrative-scope",
  },
  {
    key: "apex",
    name: "Apex Grid",
    logo: "/logos/apex-grid.png",
    role: "Analiza",
    status: "AKTYWNY",
    active: true,
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

// Każda karta to odzwierciedlenie jednej z czterech planet (ten sam href
// co w modules powyżej) — kliknięcie w kartę na dole ma prowadzić do tego
// samego modułu co kliknięcie w odpowiadającą jej planetę na orbicie.
const bottomCards = [
  {
    title: "SŁUCHANIE",
    text: ["monitoring narracji", "w czasie rzeczywistym"],
    icon: "wave",
    href: "/narrative-scope",
  },
  {
    title: "ANALIZA",
    text: ["scenariusze i rekomendacje", "strategiczne"],
    icon: "chart",
    href: "/apex-grid",
  },
  {
    title: "PRZEKAZ",
    text: ["komunikacja skrojona", "pod projekt"],
    icon: "message",
    href: "/volt-stream",
  },
  {
    title: "EMISJA",
    text: ["własne medium i", "dystrybucja"],
    icon: "broadcast",
    href: "/pulse-field",
  },
];

// Geometria dokładnie wg wzorca: układ diamentowy (góra/dół/lewo/prawo
// w tych samych odległościach od centrum, lewo/prawo na wysokości centrum),
// zmierzone proporcje z obrazu: RX:RY ≈ 1.94. RY powiększone względem
// promieni "planet", żeby sfera centrum nigdy nie zachodziła na moduły.
const VB_W = 940;
const VB_H = 620;
const CX = 470;
const CY = 310;
const RX = 350;
const RY = 180;

function pointOnEllipse(angleDeg: number, rx: number, ry: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + rx * Math.cos(rad), y: CY + ry * Math.sin(rad) };
}

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
            "relative flex h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 items-center justify-center rounded-full",
            "bg-[radial-gradient(circle_at_35%_25%,#ffffff,#dbeafe_55%,#b8c7e8)]",
            m.active ? "ring-2 ring-sky-300/80" : "ring-1 ring-sky-300/35",
          ].join(" ")}
          style={{
            boxShadow: m.active
              ? "0 0 55px rgba(56,189,248,.75)"
              : "0 0 34px rgba(96,165,250,0.45)",
          }}
        >
          <div className="absolute -inset-2 lg:-inset-3 rounded-full border border-sky-400/25" />
          <div className="absolute -inset-3 lg:-inset-5 rounded-full border border-violet-500/15 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <Image
            src={m.logo}
            alt={m.name}
            width={92}
            height={92}
            className="h-[52px] w-[52px] sm:h-[62px] sm:w-[62px] lg:h-[74px] lg:w-[74px] object-contain"
          />
        </div>
        <div
          className={[
            "mt-2 sm:mt-2.5 lg:mt-3 min-w-[80px] sm:min-w-[96px] lg:min-w-[120px] rounded-md sm:rounded-lg border px-2.5 py-1 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 text-center backdrop-blur-md",
            "bg-slate-950/70 shadow-[0_0_28px_rgba(15,23,42,0.9)]",
            m.active ? "border-sky-300/40" : "border-sky-300/20",
          ].join(" ")}
        >
          <div className="text-[11px] sm:text-xs lg:text-sm font-semibold text-white whitespace-nowrap">{m.role}</div>
          <div
            className={[
              "mt-0.5 text-[8px] sm:text-[9px] lg:text-[11px] font-bold tracking-wide whitespace-nowrap",
              m.active ? "text-emerald-400" : "text-blue-400",
            ].join(" ")}
          >
            {m.status}
            <span
              className={[
                "ml-1.5 sm:ml-2 inline-block h-1.5 w-1.5 lg:h-2 lg:w-2 rounded-full",
                m.active ? "bg-emerald-400 animate-pulse" : "bg-blue-500",
              ].join(" ")}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

// e-wyborcy nie jest piątym modułem operacyjnym, tylko warstwą danych pod
// spodem, dlatego nie orbituje jak cztery planety: to nieruchomy punkt z boku,
// osobny kształt (wydłużona kometa, nie koło) i bez pulsującej animacji "aktywności".
function InsightBaseIcon() {
  return (
    <svg viewBox="0 0 64 40" className="h-7 w-11 text-indigo-700">
      <ellipse cx="20" cy="12" rx="16" ry="5" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M4 12v10c0 2.8 7.2 5 16 5s16-2.2 16-5V12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M4 17c0 2.8 7.2 5 16 5s16-2.2 16-5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".55" />
      <path d="M46 8l3 6 6 1.5-6 1.5-3 6-3-6-6-1.5 6-1.5z" fill="currentColor" opacity=".85" />
    </svg>
  );
}

function InsightBaseComet() {
  return (
    <Link
      href="/insight-base"
      className="absolute z-20 hidden -translate-x-1/2 flex-col items-center sm:flex"
      style={{ left: "6%", top: "94%" }}
    >
      <div className="group flex flex-col items-center">
        {/* ogon komety — statyczna smuga, nie animacja przelotu jak tło komety w tle sceny */}
        <div className="pointer-events-none absolute right-full top-1/2 h-[2px] w-16 -translate-y-1/2 bg-gradient-to-r from-transparent to-indigo-200/70 opacity-70 sm:w-20" />
        <div
          className="relative flex h-12 w-20 items-center justify-center rounded-full ring-1 ring-indigo-200/50 sm:h-14 sm:w-24"
          style={{
            background: "radial-gradient(circle at 35% 30%, #ffffff, #e0e7ff 55%, #c7d2fe)",
            boxShadow: "0 0 26px rgba(129,140,248,0.4)",
          }}
        >
          <InsightBaseIcon />
        </div>
        <div className="mt-2 min-w-[92px] rounded-md border border-indigo-300/25 bg-slate-950/70 px-2.5 py-1 text-center backdrop-blur-md shadow-[0_0_20px_rgba(15,23,42,0.9)] sm:min-w-[104px]">
          <div className="text-[10px] font-semibold text-white whitespace-nowrap sm:text-[11px]">e-wyborcy</div>
          <div className="mt-0.5 text-[7px] font-bold tracking-wide text-indigo-300 whitespace-nowrap sm:text-[8px]">
            opinie społeczne
          </div>
        </div>
      </div>
    </Link>
  );
}

// Konsylium, tak jak e-wyborcy, nie jest piątym modułem operacyjnym z
// czwórki planet — to osobna, pomocnicza warstwa (narada ekspercka, nie
// monitoring/analiza/przekaz/emisja), więc dostaje ten sam wzorzec komety:
// nieruchomy punkt z boku, bez orbitowania i bez pulsującej animacji
// "aktywności". e-wyborcy wisi nad pierwszą kartą na dole (SŁUCHANIE,
// left: 6%) — Konsylium ma wisieć nad DRUGĄ kartą na dole (ANALIZA, ta sama
// logika pozycjonowania, tylko przesunięta o jedną kolumnę w prawo w tym
// samym układzie 4-kolumnowym), NIE nad orbitującą planetą Apex Grid.
// Inny kolor (bursztyn zamiast indygo), żeby dało się je rozróżnić na
// pierwszy rzut oka. Ogon komety skierowany w lewo, tak jak w e-wyborcy
// — ten sam kierunek lotu dla obu komet, nie lustrzane odbicie.
// e-Petru, jak e-wyborcy i Konsylium, to warstwa pomocnicza (wzorzec języka i
// sposobu myślenia Ryszarda Petru wspierający PRZEKAZ), nie piąta planeta.
// Ten sam wzorzec komety, wisi nad TRZECIĄ kartą na dole (PRZEKAZ), kolor
// szmaragdowy dla odróżnienia od indygo (e-wyborcy) i bursztynu (Konsylium).
function PetruIcon() {
  return (
    <svg viewBox="0 0 64 40" className="h-7 w-11 text-emerald-700">
      <circle cx="26" cy="16" r="7" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M14 34c2-6 8-9 12-9s10 3 12 9" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M44 10c4 2 6 5 6 9s-2 7-6 9" stroke="currentColor" strokeWidth="2.5" fill="none" opacity=".7" />
      <path d="M49 6c6 3 9 8 9 13s-3 10-9 13" stroke="currentColor" strokeWidth="2" fill="none" opacity=".45" />
    </svg>
  );
}

function PetruComet() {
  return (
    <Link
      href="/e-petru"
      className="absolute z-20 hidden -translate-x-1/2 flex-col items-center sm:flex"
      style={{ left: "64%", top: "94%" }}
    >
      <div className="group flex flex-col items-center">
        <div className="pointer-events-none absolute right-full top-1/2 h-[2px] w-16 -translate-y-1/2 bg-gradient-to-r from-transparent to-emerald-200/70 opacity-70 sm:w-20" />
        <div
          className="relative flex h-12 w-20 items-center justify-center rounded-full ring-1 ring-emerald-200/50 sm:h-14 sm:w-24"
          style={{
            background: "radial-gradient(circle at 35% 30%, #ffffff, #d1fae5 55%, #a7f3d0)",
            boxShadow: "0 0 26px rgba(16,185,129,0.4)",
          }}
        >
          <PetruIcon />
        </div>
        <div className="mt-2 min-w-[92px] rounded-md border border-emerald-300/25 bg-slate-950/70 px-2.5 py-1 text-center backdrop-blur-md shadow-[0_0_20px_rgba(15,23,42,0.9)] sm:min-w-[104px]">
          <div className="text-[10px] font-semibold text-white whitespace-nowrap sm:text-[11px]">e-Petru</div>
          <div className="mt-0.5 text-[7px] font-bold tracking-wide text-emerald-300 whitespace-nowrap sm:text-[8px]">
            wirtualny polityk
          </div>
        </div>
      </div>
    </Link>
  );
}

// e-Media, jak pozostałe komety, to warstwa pomocnicza pod EMISJĘ: wirtualna
// redakcja przewidująca, jak media zatytułują i zramują przekaz. Kolor
// pomarańczowo-czerwony, wisi nad CZWARTĄ kartą na dole (EMISJA).
function MediaIcon() {
  return (
    <svg viewBox="0 0 64 40" className="h-7 w-11 text-rose-700">
      <rect x="10" y="8" width="34" height="26" rx="3" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M44 16h9v14a4 4 0 0 1-4 4h-5" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M16 15h16M16 21h16M16 27h10" stroke="currentColor" strokeWidth="2.5" opacity=".7" />
    </svg>
  );
}

function MediaComet() {
  return (
    <Link
      href="/e-media"
      className="absolute z-20 hidden -translate-x-1/2 flex-col items-center sm:flex"
      style={{ left: "92%", top: "94%" }}
    >
      <div className="group flex flex-col items-center">
        <div className="pointer-events-none absolute right-full top-1/2 h-[2px] w-16 -translate-y-1/2 bg-gradient-to-r from-transparent to-rose-200/70 opacity-70 sm:w-20" />
        <div
          className="relative flex h-12 w-20 items-center justify-center rounded-full ring-1 ring-rose-200/50 sm:h-14 sm:w-24"
          style={{
            background: "radial-gradient(circle at 35% 30%, #ffffff, #ffe4e6 55%, #fecdd3)",
            boxShadow: "0 0 26px rgba(244,63,94,0.4)",
          }}
        >
          <MediaIcon />
        </div>
        <div className="mt-2 min-w-[92px] rounded-md border border-rose-300/25 bg-slate-950/70 px-2.5 py-1 text-center backdrop-blur-md shadow-[0_0_20px_rgba(15,23,42,0.9)] sm:min-w-[104px]">
          <div className="text-[10px] font-semibold text-white whitespace-nowrap sm:text-[11px]">e-Media</div>
          <div className="mt-0.5 text-[7px] font-bold tracking-wide text-rose-300 whitespace-nowrap sm:text-[8px]">
            wirtualna redakcja
          </div>
        </div>
      </div>
    </Link>
  );
}

function KonsyliumIcon() {
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

function KonsyliumComet() {
  return (
    <Link
      href="/konsylium"
      className="absolute z-20 hidden -translate-x-1/2 flex-col items-center sm:flex"
      style={{ left: "35%", top: "94%" }}
    >
      <div className="group flex flex-col items-center">
        {/* ogon komety w lewo — ten sam kierunek co e-wyborcy */}
        <div className="pointer-events-none absolute right-full top-1/2 h-[2px] w-16 -translate-y-1/2 bg-gradient-to-r from-transparent to-amber-200/70 opacity-70 sm:w-20" />
        <div
          className="relative flex h-12 w-20 items-center justify-center rounded-full ring-1 ring-amber-200/50 sm:h-14 sm:w-24"
          style={{
            background: "radial-gradient(circle at 35% 30%, #ffffff, #fef3c7 55%, #fde68a)",
            boxShadow: "0 0 26px rgba(251,191,36,0.4)",
          }}
        >
          <KonsyliumIcon />
        </div>
        <div className="mt-2 min-w-[92px] rounded-md border border-amber-300/25 bg-slate-950/70 px-2.5 py-1 text-center backdrop-blur-md shadow-[0_0_20px_rgba(15,23,42,0.9)] sm:min-w-[104px]">
          <div className="text-[10px] font-semibold text-white whitespace-nowrap sm:text-[11px]">Konsylium</div>
          <div className="mt-0.5 text-[7px] font-bold tracking-wide text-amber-300 whitespace-nowrap sm:text-[8px]">
            10 EKSPERTÓW AI
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function OrbitHub() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070d] text-white">
      {/* Tło bazowe — mgławice/poświata wg ustalonych wartości, żadnej geografii */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(124,58,237,0.45),transparent_30%),radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.18),transparent_28%),linear-gradient(180deg,#03050b_0%,#07101f_52%,#03050b_100%)]" />

      {/* Gwiazdy — trzy warstwy o różnej wielkości i gęstości, dla wrażenia głębi kosmosu */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(0.6px_0.6px_at_15px_25px,#fff,transparent),radial-gradient(0.6px_0.6px_at_75px_95px,#fff,transparent),radial-gradient(0.6px_0.6px_at_130px_45px,#fff,transparent),radial-gradient(0.6px_0.6px_at_190px_150px,#fff,transparent),radial-gradient(0.6px_0.6px_at_250px_70px,#fff,transparent),radial-gradient(0.6px_0.6px_at_310px_190px,#fff,transparent)] [background-size:340px_340px]" />
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(1.4px_1.4px_at_40px_60px,#fff,transparent),radial-gradient(1.3px_1.3px_at_160px_20px,#fff,transparent),radial-gradient(1.5px_1.5px_at_100px_180px,#fff,transparent),radial-gradient(1.3px_1.3px_at_230px_120px,#fff,transparent),radial-gradient(1.4px_1.4px_at_300px_240px,#fff,transparent)] [background-size:460px_460px]" />
      <div className="pointer-events-none absolute inset-0 opacity-90 [background-image:radial-gradient(2.2px_2.2px_at_70px_130px,#a5b4fc,transparent),radial-gradient(2.4px_2.4px_at_260px_50px,#c4b5fd,transparent),radial-gradient(2px_2px_at_340px_230px,#a5b4fc,transparent),radial-gradient(2.3px_2.3px_at_50px_300px,#c4b5fd,transparent)] [background-size:620px_620px]" />

      {/* Komety — rzadko przelatują przez pole widzenia */}
      <div className="pdm-comet pdm-comet--a" />
      <div className="pdm-comet pdm-comet--b" />
      <div className="pdm-comet pdm-comet--c" />


      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 pb-8 pt-8 sm:px-6">
        <header className="mx-auto max-w-4xl text-center">
          <div
            className="mb-3 font-bold uppercase text-blue-300/80"
            style={{ fontSize: "12px", letterSpacing: "0.42em" }}
          >
            EKOSYSTEM AI DLA POLITYKI
          </div>
          <h1
            className="bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(99,102,241,0.35)]"
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              fontSize: "clamp(56px, 6vw, 88px)",
              lineHeight: 1.05,
              backgroundImage: "linear-gradient(90deg, #60a5fa, #93c5fd, #e879f9)",
            }}
          >
            Political Dark Matter
          </h1>
          <p className="mt-4 font-medium text-slate-100/90" style={{ fontSize: "22px" }}>
            Niewidoczna infrastruktura zwycięskiej komunikacji politycznej.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300/75">
            Monitoring narracji, analiza scenariuszowa, generowanie przekazu
            <br className="hidden sm:block" />
            i dystrybucja w jednym systemie wspieranym przez AI.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/zalozenia"
              className="pdm-cta-glow group rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-10 py-4 text-base font-bold text-white ring-1 ring-white/25 shadow-[0_0_45px_rgba(37,99,235,0.55)] transition hover:scale-[1.03]"
            >
              Założenia strategiczne
              <span className="ml-4 inline-block transition group-hover:translate-x-1">→</span>
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs sm:hidden">
            <Link href="/insight-base" className="rounded-lg border border-indigo-300/30 bg-slate-950/50 px-3 py-1.5 font-semibold text-slate-100">e-wyborcy</Link>
            <Link href="/konsylium" className="rounded-lg border border-amber-300/30 bg-slate-950/50 px-3 py-1.5 font-semibold text-slate-100">Konsylium</Link>
            <Link href="/e-petru" className="rounded-lg border border-emerald-300/30 bg-slate-950/50 px-3 py-1.5 font-semibold text-slate-100">e-Petru</Link>
            <Link href="/e-media" className="rounded-lg border border-rose-300/30 bg-slate-950/50 px-3 py-1.5 font-semibold text-slate-100">e-Media</Link>
          </div>
        </header>

        {/* Orbita — elipsa proporcjonalna do wzorca (VB_W x VB_H), z animowanymi
            przepływami między modułami i pulsującym centrum */}
        <div
          id="modules"
          className="relative mx-auto mt-8 sm:mt-10 w-full max-w-[980px] scroll-mt-10 aspect-[3/4] sm:aspect-[940/620]"
        >
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
              <linearGradient id="hBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0} />
                <stop offset="15%" stopColor="#38bdf8" stopOpacity={0.9} />
                <stop offset="50%" stopColor="#e0e7ff" stopOpacity={1} />
                <stop offset="85%" stopColor="#a78bfa" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
              <filter id="hBeamBlur" x="-20%" y="-200%" width="140%" height="500%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>

            {/* pierścień orbity — jedna, płynąca (animowana) przerywana elipsa spajająca wszystkie moduły, jak we wzorcu */}
            <ellipse
              cx={CX}
              cy={CY}
              rx={RX}
              ry={RY}
              fill="none"
              stroke="url(#flowGrad)"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              strokeDasharray="6 10"
              className="orbit-flow"
            />

            {/* świecąca belka pozioma — łączy Pulse Field, Profil projektu i Apex Grid (ta sama wysokość) */}
            <line
              x1={CX - RX}
              y1={CY}
              x2={CX + RX}
              y2={CY}
              stroke="url(#hBeamGrad)"
              strokeWidth={10}
              filter="url(#hBeamBlur)"
              opacity={0.8}
              className="pdm-hbeam-glow"
            />
            <line
              x1={CX - RX}
              y1={CY}
              x2={CX + RX}
              y2={CY}
              stroke="url(#hBeamGrad)"
              strokeWidth={2}
              className="pdm-hbeam-glow"
            />
          </svg>

          {/* Centrum — Profil projektu, tętniące */}
          <Link
            href="/sprawy"
            className="group absolute left-1/2 top-1/2 z-10 flex h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-violet-300/70 bg-slate-950/80 text-center transition hover:scale-105"
            style={{ boxShadow: "0 0 70px rgba(124,58,237,.8), 0 0 120px rgba(37,99,235,.35)" }}
          >
            <div className="pdm-core-breathe absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.55)_0%,transparent_70%)]" />
            <div className="pdm-ping absolute -inset-3 sm:-inset-4 lg:-inset-5 rounded-full border border-violet-400/40" />
            <div className="pdm-ping absolute -inset-3 sm:-inset-4 lg:-inset-5 rounded-full border border-sky-400/30" style={{ animationDelay: "1.5s" }} />
            <div className="relative">
              <div className="text-sm sm:text-base lg:text-lg font-bold text-white whitespace-nowrap">Ryszard</div>
              <div className="text-[11px] sm:text-xs lg:text-sm text-slate-300/70 whitespace-nowrap">Petru</div>
            </div>
          </Link>

          {modules.map((m) => (
            <ModuleOrb key={m.key} module={m} />
          ))}

          <InsightBaseComet />
          <KonsyliumComet />
          <PetruComet />
          <MediaComet />
        </div>

        <div className="mx-auto mt-16 grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {bottomCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
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
            </Link>
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
        .pdm-hbeam-glow {
          animation: pdm-hbeam-glow 3.4s ease-in-out infinite;
        }
        @keyframes pdm-hbeam-glow {
          0%, 100% { opacity: 0.55; }
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

        .pdm-comet {
          position: absolute;
          top: 0;
          left: 0;
          width: 140px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 85%, #ffffff 100%);
          box-shadow: 0 0 6px 1px rgba(255,255,255,0.7);
          opacity: 0;
          pointer-events: none;
          will-change: transform, opacity;
        }
        .pdm-comet--a { animation: pdm-comet-a 16s ease-in infinite; animation-delay: 2s; }
        .pdm-comet--b { animation: pdm-comet-b 23s ease-in infinite; animation-delay: 9s; }
        .pdm-comet--c { animation: pdm-comet-c 31s ease-in infinite; animation-delay: 17s; }
        /* Pozycje w vmin (nie vw/vh) — X i Y skalują się identycznie, więc kąt rotate()
           zawsze pokrywa się z realnym kierunkiem lotu, a ogon leży dokładnie na torze. */
        @keyframes pdm-comet-a {
          0%, 88%, 100% { opacity: 0; transform: translate(-15vmin, -45vmin) rotate(12.85deg); }
          89% { opacity: 1; }
          93% { opacity: 1; transform: translate(95vmin, -20vmin) rotate(12.85deg); }
          94% { opacity: 0; transform: translate(102.8vmin, -18.2vmin) rotate(12.85deg); }
        }
        @keyframes pdm-comet-b {
          0%, 91%, 100% { opacity: 0; transform: translate(115vmin, -40vmin) rotate(148deg); }
          92% { opacity: 1; }
          96% { opacity: 1; transform: translate(-5vmin, 35vmin) rotate(148deg); }
          97% { opacity: 0; transform: translate(-11.8vmin, 39.2vmin) rotate(148deg); }
        }
        @keyframes pdm-comet-c {
          0%, 93%, 100% { opacity: 0; transform: translate(-10vmin, -70vmin) rotate(53.6deg); }
          94% { opacity: 1; }
          97% { opacity: 1; transform: translate(60vmin, 25vmin) rotate(53.6deg); }
          98% { opacity: 0; transform: translate(64.75vmin, 31.43vmin) rotate(53.6deg); }
        }
      `}</style>
    </main>
  );
}
