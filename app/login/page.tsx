"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Eye, EyeOff, Loader2, BarChart2, Globe2, TrendingUp } from "lucide-react";

const FEATURES = [
  { icon: BarChart2,  label: "Analiza sentymentu",  desc: "Real-time monitoring mediów i social mediów" },
  { icon: Globe2,     label: "Sieci powiązań",      desc: "Mapa narracji i aktorów w przestrzeni informacyjnej" },
  { icon: TrendingUp, label: "Trendy i zmiany",     desc: "Wykrywanie przełomów narracyjnych w czasie rzeczywistym" },
];

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError("Nieprawidłowe hasło. Spróbuj ponownie.");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#05070d] text-white">
      {/* Tło kosmiczne — spójne z hubem: mgławice + trzy warstwy gwiazd */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(124,58,237,0.22),transparent_34%),linear-gradient(180deg,#03050b_0%,#070c18_55%,#03050b_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(0.6px_0.6px_at_15px_25px,#fff,transparent),radial-gradient(0.6px_0.6px_at_75px_95px,#fff,transparent),radial-gradient(0.6px_0.6px_at_130px_45px,#fff,transparent),radial-gradient(0.6px_0.6px_at_190px_150px,#fff,transparent),radial-gradient(0.6px_0.6px_at_250px_70px,#fff,transparent)] [background-size:340px_340px]" />
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(1.4px_1.4px_at_40px_60px,#fff,transparent),radial-gradient(1.3px_1.3px_at_160px_20px,#fff,transparent),radial-gradient(1.5px_1.5px_at_100px_180px,#fff,transparent),radial-gradient(1.3px_1.3px_at_230px_120px,#fff,transparent)] [background-size:460px_460px]" />
      <div className="pointer-events-none absolute inset-0 opacity-90 [background-image:radial-gradient(2.2px_2.2px_at_70px_130px,#a5b4fc,transparent),radial-gradient(2.4px_2.4px_at_260px_50px,#c4b5fd,transparent),radial-gradient(2px_2px_at_340px_230px,#a5b4fc,transparent)] [background-size:620px_620px]" />

      {/* ── Panel lewy — planeta modułu, nazwa, cechy ── */}
      <div className="relative z-10 hidden lg:flex flex-col justify-between w-[52%] px-14 py-12">
        {/* Planeta Narrative Scope — dokładnie ta sama stylistyka co orby na hubie */}
        <div>
          <div className="relative inline-flex h-36 w-36 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_25%,#ffffff,#dbeafe_55%,#b8c7e8)] ring-2 ring-sky-300/80"
            style={{ boxShadow: "0 0 60px rgba(56,189,248,.55), 0 0 110px rgba(124,58,237,.3)" }}>
            <div className="pdm-login-ping absolute -inset-4 rounded-full border border-sky-400/30" />
            <div className="pdm-login-ping absolute -inset-4 rounded-full border border-violet-400/25" style={{ animationDelay: "1.4s" }} />
            <Image src="/logos/narrative-scope.png" alt="NarrativeScope" width={110} height={110} className="h-[92px] w-[92px] object-contain" priority />
          </div>
          <p className="text-blue-200/60 text-xs font-bold tracking-[0.3em] uppercase mt-6">Narrative Intelligence Platform</p>
        </div>

        {/* Feature list */}
        <div className="space-y-8">
          {FEATURES.map(function ({ icon: Icon, label, desc }) {
            return (
              <div key={label} className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-400/25 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_18px_rgba(56,189,248,0.15)]">
                  <Icon size={18} className="text-sky-300" />
                </div>
                <div>
                  <p className="text-white/90 text-sm font-semibold">{label}</p>
                  <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-white/20 text-xs">© 2026 NarrativeScope</p>
      </div>

      {/* ── Panel prawy — logowanie, szklana karta ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Planeta — wersja mobilna */}
        <div className="flex lg:hidden mb-10">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_25%,#ffffff,#dbeafe_55%,#b8c7e8)] ring-2 ring-sky-300/80"
            style={{ boxShadow: "0 0 40px rgba(56,189,248,.5)" }}>
            <Image src="/logos/narrative-scope.png" alt="NarrativeScope" width={80} height={80} className="h-[62px] w-[62px] object-contain" priority />
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-2xl font-bold text-white tracking-tight">Zaloguj się</h1>
            <p className="text-slate-400 text-sm mt-1">Dostęp do platformy monitoringu narracji</p>
          </div>

          <div className="rounded-2xl border border-sky-300/20 bg-slate-950/50 p-8 shadow-[0_0_50px_rgba(56,189,248,0.08)] backdrop-blur-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Hasło</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Lock size={15} />
                  </div>
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={function (e) { setPassword(e.target.value); }}
                    placeholder="Wprowadź hasło…"
                    autoFocus
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                  <button type="button" onClick={function () { setShow(function (s) { return !s; }); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {error && <p className="mt-2 text-xs text-red-400">⚠ {error}</p>}
              </div>

              <button type="submit" disabled={loading || !password}
                className="pdm-login-cta w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 disabled:opacity-40 disabled:cursor-not-allowed py-3 text-sm font-bold text-white ring-1 ring-white/20 transition hover:scale-[1.01]">
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Weryfikacja…</>
                  : "Zaloguj się →"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">Dostęp chroniony · Tylko dla autoryzowanych użytkowników</p>
        </div>
      </div>

      <style>{`
        .pdm-login-ping {
          animation: pdm-login-ping 3.4s ease-out infinite;
          animation-fill-mode: both;
        }
        @keyframes pdm-login-ping {
          0% { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .pdm-login-cta {
          animation: pdm-login-cta 3s ease-in-out infinite;
        }
        @keyframes pdm-login-cta {
          0%, 100% { box-shadow: 0 0 18px rgba(37,99,235,0.4); }
          50% { box-shadow: 0 0 32px rgba(124,58,237,0.65); }
        }
      `}</style>
    </div>
  );
}
