"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface ComingSoonProps {
  name: string;
  tagline: string;
  logo: string;
  description: string;
  startsAround: string;
  accent: string; // klasa tailwind gradientu akcentu
}

export default function ComingSoon({
  name,
  tagline,
  logo,
  description,
  startsAround,
  accent,
}: ComingSoonProps) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#05060f] px-6 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(0.6px_0.6px_at_20px_30px,#fff,transparent),radial-gradient(0.6px_0.6px_at_140px_80px,#fff,transparent),radial-gradient(0.6px_0.6px_at_90px_180px,#fff,transparent),radial-gradient(0.6px_0.6px_at_260px_60px,#fff,transparent)] [background-size:340px_340px]" />
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(1.4px_1.4px_at_60px_120px,#fff,transparent),radial-gradient(1.3px_1.3px_at_200px_40px,#fff,transparent),radial-gradient(1.5px_1.5px_at_320px_200px,#fff,transparent)] [background-size:460px_460px]" />
      <div className="pointer-events-none absolute inset-0 opacity-90 [background-image:radial-gradient(2.4px_2.4px_at_110px_60px,#fff,transparent),radial-gradient(2.6px_2.6px_at_280px_180px,#fff,transparent)] [background-size:620px_620px]" />
      <div className="pdm-comet pdm-comet--cs" />
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full ${accent} opacity-20 blur-3xl`}
      />

      <Link
        href="/"
        className="absolute left-6 top-6 flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Wróć do ekosystemu
      </Link>

      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-[radial-gradient(circle_at_32%_28%,#ffffff_0%,#f2f4fb_42%,#dadfec_75%,#b7bdd1_100%)] p-4 shadow-[inset_-12px_-12px_26px_rgba(15,23,42,0.3),inset_9px_9px_20px_rgba(255,255,255,0.95),0_0_60px_rgba(99,102,241,0.15)]">
          <Image src={logo} alt={name} width={300} height={280} className="h-auto w-full object-contain" />
        </div>

        <span className="mb-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Warstwa: {tagline} · w fazie developerskiej
        </span>

        <h1 className="text-3xl font-bold tracking-tight text-white">{name}</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">{description}</p>

        <div className="mt-8 w-full rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Wchodzi w budowę</div>
          <div className="mt-1 text-sm font-semibold text-indigo-300">{startsAround}</div>
        </div>
      </div>

      <style>{`
        .pdm-comet {
          position: absolute;
          top: 0;
          left: 0;
          width: 130px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 85%, #ffffff 100%);
          box-shadow: 0 0 6px 1px rgba(255,255,255,0.7);
          opacity: 0;
          pointer-events: none;
          will-change: transform, opacity;
        }
        .pdm-comet--cs {
          animation: pdm-comet-cs 20s ease-in infinite;
          animation-delay: 4s;
        }
        @keyframes pdm-comet-cs {
          0%, 90%, 100% { opacity: 0; transform: translate(-15vmin, -55vmin) rotate(33deg); }
          91% { opacity: 1; }
          95% { opacity: 1; transform: translate(85vmin, 10vmin) rotate(33deg); }
          96% { opacity: 0; transform: translate(91.71vmin, 14.36vmin) rotate(33deg); }
        }
      `}</style>
    </div>
  );
}
