"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Wand2, User, Copy, Check } from "lucide-react";
import { PETRU_MODES, type PetruMode } from "@/lib/petru";
import PageHeader from "@/components/layout/PageHeader";

export default function EPetruPage() {
  const [text, setText] = useState("");
  const [tryb, setTryb] = useState<PetruMode>("wypowiedz");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function convert() {
    if (!text.trim()) return;
    setBusy(true); setErr(null); setOut(null); setCopied(false);
    try {
      const r = await fetch("/api/petru/convert", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tryb }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setOut(j.result.przerobiony);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd.");
    } finally { setBusy(false); }
  }

  async function copy() {
    if (!out) return;
    try { await navigator.clipboard.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.06),transparent_35%),radial-gradient(circle_at_85%_100%,rgba(124,58,237,0.1),transparent_40%)]" />
      <div className="relative z-10 mx-auto max-w-2xl px-5 py-8">
        <PageHeader title="e-Lider" subtitle="Wirtualny lider. Przerabia dowolny przekaz na język, dynamikę i sposób myślenia wybranego polityka. Bazę można zasilić dowolnym liderem." comet="epetru" />

        <div className="mt-6">
          <label className="block text-sm font-semibold text-slate-100">Przekaz do przerobienia</label>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} rows={6}
            placeholder="Wklej dowolny przekaz, tezę, komunikat…"
            className="mt-1.5 w-full rounded-lg border border-sky-400/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {PETRU_MODES.map((m) => (
              <button key={m.id} onClick={() => setTryb(m.id)} title={m.hint}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${tryb === m.id ? "bg-gradient-to-r from-sky-500 to-violet-600 text-white" : "border border-sky-400/20 bg-slate-900/50 text-slate-300 hover:border-sky-400/40"}`}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={convert} disabled={busy || !text.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />} Przerób na język lidera
          </button>

          {err && <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-300">{err}</div>}

          {out && (
            <div className="mt-4 rounded-xl border border-sky-400/20 bg-slate-900/60 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">Przekaz w wersji lidera</span>
                <button onClick={copy} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />} {copied ? "Skopiowano" : "Kopiuj"}
                </button>
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-100">{out}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
