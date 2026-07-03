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
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(1px_1px_at_20px_30px,#fff,transparent),radial-gradient(1px_1px_at_140px_80px,#fff,transparent),radial-gradient(1px_1px_at_90px_180px,#fff,transparent)] [background-size:400px_400px]" />
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
        <div className="mb-6 flex h-36 w-36 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_0_60px_rgba(99,102,241,0.15)]">
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
    </div>
  );
}
