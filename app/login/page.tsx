"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";

// Ekran logowania celowo NEUTRALNY: żadnych oznaczeń, logo, nazwy produktu
// ani opisu do czego służy. Tylko login + hasło.
export default function LoginPage() {
  const [login, setLogin] = useState("");
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
      body: JSON.stringify({ login, password }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Nieprawidłowy login lub hasło.");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0c10] text-white px-6 py-12">
      {/* Neutralne, ciemne tło bez żadnej identyfikacji */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0d12_0%,#0f1218_55%,#0b0d12_100%)]" />

      <div className="relative z-10 w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl space-y-5"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Login</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <User size={15} />
              </div>
              <input
                type="text"
                value={login}
                onChange={function (e) { setLogin(e.target.value); }}
                autoFocus
                autoComplete="username"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-400/60 focus:ring-2 focus:ring-slate-500/20 transition-all"
              />
            </div>
          </div>

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
                autoComplete="current-password"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-400/60 focus:ring-2 focus:ring-slate-500/20 transition-all"
              />
              <button type="button" onClick={function () { setShow(function (s) { return !s; }); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">⚠ {error}</p>}

          <button type="submit" disabled={loading || !login || !password}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed py-3 text-sm font-bold ring-1 ring-white/20 transition hover:bg-white">
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> …</>
              : "Zaloguj się"}
          </button>
        </form>
      </div>
    </div>
  );
}
