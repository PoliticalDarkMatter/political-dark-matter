"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type ModuleStatus = "live" | "building";

interface ModuleDef {
  key: string;
  name: string;
  tagline: string;
  logo: string;
  href: string;
  status: ModuleStatus;
  angle: number; // stopnie, 0 = prawo, idąc zgodnie z ruchem wskazówek zegara
}

const MODULES: ModuleDef[] = [
  {
    key: "narrative-scope",
    name: "Narrative Scope",
    tagline: "Słuchanie",
    logo: "/modules/narrative-scope.png",
    href: "/dashboard",
    status: "live",
    angle: -90, // góra
  },
  {
    key: "apex-grid",
    name: "Apex Grid",
    tagline: "Analiza",
    logo: "/modules/apex-grid.png",
    href: "/apex-grid",
    status: "building",
    angle: 0, // prawo
  },
  {
    key: "volt-stream",
    name: "Volt Stream",
    tagline: "Przekaz",
    logo: "/modules/volt-stream.png",
    href: "/volt-stream",
    status: "building",
    angle: 90, // dół
  },
  {
    key: "pulse-field",
    name: "Pulse Field",
    tagline: "Emisja",
    logo: "/modules/pulse-field.png",
    href: "/pulse-field",
    status: "building",
    angle: 180, // lewo
  },
];

const CENTER = 400;
const RADIUS = 300;
const ARC_R = 345;

function pointOnCircle(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function arcPath(fromAngle: number, toAngle: number) {
  const from = pointOnCircle(fromAngle, RADIUS);
  const to = pointOnCircle(toAngle, RADIUS);
  const mid = (fromAngle + toAngle) / 2;
  const ctrl = pointOnCircle(mid, ARC_R);
  return `M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`;
}

// kolejność pętli: Narrative Scope -> Apex Grid -> Volt Stream -> Pulse Field -> (z powrotem) Narrative Scope
const FLOWS = [
  { from: MODULES[0], to: MODULES[1], feedback: false },
  { from: MODULES[1], to: MODULES[2], feedback: false },
  { from: MODULES[2], to: MODULES[3], feedback: false },
  { from: MODULES[3], to: MODULES[0], feedback: true },
];

export default function OrbitHub() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05060f] text-white">
      {/* Gwiazdy w tle — trzy warstwy o różnej wielkości i gęstości, dla wrażenia głębi */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(0.6px_0.6px_at_15px_25px,#fff,transparent),radial-gradient(0.6px_0.6px_at_75px_95px,#fff,transparent),radial-gradient(0.6px_0.6px_at_130px_45px,#fff,transparent),radial-gradient(0.6px_0.6px_at_190px_150px,#fff,transparent),radial-gradient(0.6px_0.6px_at_250px_70px,#fff,transparent),radial-gradient(0.6px_0.6px_at_310px_190px,#fff,transparent),radial-gradient(0.6px_0.6px_at_20px_210px,#fff,transparent)] [background-size:340px_340px] [background-repeat:repeat]" />
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(1.4px_1.4px_at_40px_60px,#fff,transparent),radial-gradient(1.3px_1.3px_at_160px_20px,#fff,transparent),radial-gradient(1.5px_1.5px_at_100px_180px,#fff,transparent),radial-gradient(1.3px_1.3px_at_230px_120px,#fff,transparent),radial-gradient(1.4px_1.4px_at_300px_240px,#fff,transparent)] [background-size:460px_460px] [background-repeat:repeat]" />
      <div className="pointer-events-none absolute inset-0 opacity-90 [background-image:radial-gradient(2.4px_2.4px_at_70px_130px,#fff,transparent),radial-gradient(2.6px_2.6px_at_260px_50px,#fff,transparent),radial-gradient(2.2px_2.2px_at_340px_230px,#fff,transparent),radial-gradient(2.5px_2.5px_at_50px_300px,#fff,transparent)] [background-size:620px_620px] [background-repeat:repeat]" />

      {/* Komety — rzadko przelatują po niebie */}
      <div className="pdm-comet pdm-comet--a" />
      <div className="pdm-comet pdm-comet--b" />
      <div className="pdm-comet pdm-comet--c" />

      {/* Poświata centralna */}
      <div className="pointer-events-none absolute left-1/2 top-[38%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.25)_0%,rgba(147,51,234,0.12)_35%,transparent_70%)] blur-2xl" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-16">
        {/* Wordmark */}
        <div
          className={`text-center transition-all duration-1000 ease-out ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-300/80">
            Ekosystem AI dla polityki
          </p>
          <h1 className="bg-gradient-to-r from-indigo-300 via-blue-300 to-fuchsia-300 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
            Political Dark Matter
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-400 sm:text-base">
            Niewidoczna warstwa, która decyduje o tym, kto wygrywa.
          </p>
        </div>

        {/* Orbit diagram */}
        <div className="relative mt-12 w-full max-w-[720px]">
          <svg
            viewBox="0 0 800 800"
            className="w-full"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <linearGradient id="feedbackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4338ca" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#1e1b4b" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#05060f" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* orbita — pierścień prowadzący */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="#312e81"
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray="2 8"
            />

            {/* rdzeń: profil projektu */}
            <circle cx={CENTER} cy={CENTER} r={130} fill="url(#coreGlow)" />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={54}
              fill="#0b0f2e"
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeOpacity={0.7}
            />
            <text
              x={CENTER}
              y={CENTER - 4}
              textAnchor="middle"
              className="fill-indigo-200"
              style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}
            >
              Profil
            </text>
            <text
              x={CENTER}
              y={CENTER + 14}
              textAnchor="middle"
              className="fill-indigo-300/70"
              style={{ fontSize: 10 }}
            >
              projektu
            </text>

            {/* przepływy między modułami */}
            {FLOWS.map((f, i) => (
              <path
                key={i}
                d={arcPath(f.from.angle, f.to.angle)}
                fill="none"
                stroke={f.feedback ? "url(#feedbackGrad)" : "url(#flowGrad)"}
                strokeWidth={f.feedback ? 2.5 : 2}
                strokeLinecap="round"
                strokeDasharray="6 10"
                className={f.feedback ? "orbit-flow orbit-flow--feedback" : "orbit-flow"}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}

            {/* etykieta pętli zwrotnej */}
            <text
              x={CENTER - 40}
              y={CENTER - 210}
              textAnchor="middle"
              className="fill-fuchsia-300/80"
              style={{ fontSize: 10, fontStyle: "italic" }}
            >
              pętla zwrotna
            </text>
          </svg>

          {/* Węzły modułów — nakładka HTML nad SVG, pozycjonowana procentowo */}
          {MODULES.map((m, i) => {
            const pos = pointOnCircle(m.angle, RADIUS);
            const leftPct = (pos.x / 800) * 100;
            const topPct = (pos.y / 800) * 100;
            return (
              <Link
                key={m.key}
                href={m.href}
                className={`group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-700 ease-out ${
                  mounted ? "scale-100 opacity-100" : "scale-75 opacity-0"
                }`}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transitionDelay: `${300 + i * 120}ms`,
                }}
              >
                <div
                  className={`relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border bg-[radial-gradient(circle_at_32%_28%,#ffffff_0%,#f2f4fb_42%,#dadfec_75%,#b7bdd1_100%)] p-3 shadow-[inset_-10px_-10px_22px_rgba(15,23,42,0.3),inset_7px_7px_16px_rgba(255,255,255,0.95),0_0_40px_rgba(99,102,241,0.2)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[inset_-10px_-10px_22px_rgba(15,23,42,0.3),inset_7px_7px_16px_rgba(255,255,255,0.95),0_0_60px_rgba(147,51,234,0.4)] ${
                    m.status === "live"
                      ? "border-indigo-400/60"
                      : "border-slate-300/60"
                  }`}
                >
                  <Image
                    src={m.logo}
                    alt={m.name}
                    width={300}
                    height={280}
                    className={`h-auto w-full object-contain ${
                      m.status === "building" ? "opacity-70" : ""
                    }`}
                  />
                  <span
                    className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#05060f] ${
                      m.status === "live" ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                    }`}
                  />
                </div>
                <div className="mt-2 text-center">
                  <div className="text-[11px] font-semibold text-slate-200">{m.tagline}</div>
                  <div
                    className={`text-[10px] uppercase tracking-wide ${
                      m.status === "live" ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {m.status === "live" ? "aktywny" : "w budowie"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pasek opisu ekosystemu */}
        <div
          className={`mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 transition-all duration-1000 sm:grid-cols-4 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
          style={{ transitionDelay: "700ms" }}
        >
          {[
            ["Słuchanie", "monitoring narracji w czasie rzeczywistym"],
            ["Analiza", "scenariusze i rekomendacje strategiczne"],
            ["Przekaz", "komunikacja skrojona pod projekt"],
            ["Emisja", "własne medium i dystrybucja"],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                {title}
              </div>
              <div className="mt-1 text-[11px] leading-snug text-slate-400">{desc}</div>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-lg text-center text-[11px] text-slate-600">
          Cztery autonomiczne moduły. Jeden ekosystem. Kliknij aktywny moduł, żeby
          wejść do panelu — pozostałe są w fazie developerskiej.
        </p>
      </div>

      <style>{`
        @keyframes orbit-flow-dash {
          to { stroke-dashoffset: -160; }
        }
        .orbit-flow {
          animation: orbit-flow-dash 3.5s linear infinite;
          opacity: 0.85;
        }
        .orbit-flow--feedback {
          animation-duration: 2.6s;
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
        /* Uwaga: pozycje w vmin (nie vw/vh), żeby oś X i Y skalowały się identycznie —
           dzięki temu kąt rotate() zawsze pokrywa się z realnym kierunkiem lotu,
           niezależnie od proporcji okna, a ogon komety leży dokładnie na torze lotu. */
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
    </div>
  );
}
