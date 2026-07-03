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
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-[#0a0f1e] px-14 py-12 relative overflow-hidden">
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#6b7eff 1px,transparent 1px),linear-gradient(90deg,#6b7eff 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        {/* Glow orbs */}
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full bg-indigo-600/15 blur-[90px] pointer-events-none" />

        {/* Logo — duże, białe tło */}
        <div className="relative z-10">
          <div className="inline-block bg-white rounded-2xl px-8 py-5 shadow-2xl">
            <Image src="/logo.png" alt="NarrativeScope" width={200} height={158} className="h-16 w-auto object-contain" priority />
          </div>
          <p className="text-white/40 text-xs tracking-widest uppercase mt-5 ml-1">Narrative Intelligence Platform</p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-8">
          {FEATURES.map(function ({ icon: Icon, label, desc }) {
            return (
              <div key={label} className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white/90 text-sm font-semibold">{label}</p>
                  <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="relative z-10 text-white/20 text-xs">© 2026 NarrativeScope</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
        {/* Mobile logo — duże */}
        <div className="flex lg:hidden mb-10">
          <div className="bg-white border border-slate-200 shadow-md rounded-2xl px-7 py-4">
            <Image src="/logo.png" alt="NarrativeScope" width={200} height={158} className="h-14 w-auto object-contain" priority />
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Zaloguj się</h1>
            <p className="text-slate-500 text-sm mt-1">Dostęp do platformy monitoringu narracji</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Hasło</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={15} />
                  </div>
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={function (e) { setPassword(e.target.value); }}
                    placeholder="Wprowadź hasło…"
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button type="button" onClick={function () { setShow(function (s) { return !s; }); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {error && <p className="mt-2 text-xs text-red-500">⚠ {error}</p>}
              </div>

              <button type="submit" disabled={loading || !password}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl transition-colors shadow-sm">
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Weryfikacja…</>
                  : "Zaloguj się →"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">Dostęp chroniony · Tylko dla autoryzowanych użytkowników</p>
        </div>
      </div>
    </div>
  );
}
