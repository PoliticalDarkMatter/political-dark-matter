"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Radio, Newspaper, Crosshair, Frame } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

interface Outlet { name: string; slug: string; typ: string; orientacja: string; }
interface Coverage { slug: string; name: string; orientacja: string; naglowek: string; rama: string; wyciete: string; pytanie: string; }

function tone(orient: string): string {
  const s = orient.toLowerCase();
  if (s.includes("pis") || s.includes("republika") || s.includes("prawic")) return "border-rose-400/30";
  if (s.includes("konfeder")) return "border-amber-400/30";
  if (s.includes("liberal") || s.includes("ko") || s.includes("publiczn")) return "border-sky-400/30";
  if (s.includes("tabloid")) return "border-fuchsia-400/30";
  return "border-slate-400/25";
}

export default function EMediaPage() {
  const [text, setText] = useState("");
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [cov, setCov] = useState<Coverage[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/media/outlets", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      setOutlets(j.outlets ?? []);
      setSel(new Set((j.outlets ?? []).map((o: Outlet) => o.slug)));
    }).catch(() => {});
  }, []);

  function toggle(slug: string) {
    setSel((prev) => { const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });
  }

  async function simulate() {
    if (!text.trim() || sel.size === 0) return;
    setBusy(true); setErr(null); setCov(null);
    try {
      const r = await fetch("/api/media/simulate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, slugs: Array.from(sel) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setCov(j.coverage);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd.");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.06),transparent_35%),radial-gradient(circle_at_85%_100%,rgba(124,58,237,0.1),transparent_40%)]" />
      <div className="relative z-10 mx-auto max-w-3xl px-5 py-8">
        <PageHeader title="e-Media" subtitle="Wirtualna redakcja. Zanim wyemitujesz przekaz, zobacz, jak zatytułuje go i zrama każde medium, ze swoim przechyłem." comet="emedia" />

        <div className="mt-6">
          <label className="block text-sm font-semibold text-slate-100">Przekaz do wyemitowania</label>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} rows={5}
            placeholder="Wklej wypowiedź, oświadczenie albo ruch, który chcesz wypuścić…"
            className="mt-1.5 w-full rounded-lg border border-sky-400/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40"
          />

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Redakcje ({sel.size}/{outlets.length})</span>
              <button onClick={() => setSel(sel.size === outlets.length ? new Set() : new Set(outlets.map((o) => o.slug)))}
                className="text-slate-500 hover:text-slate-300">{sel.size === outlets.length ? "odznacz wszystkie" : "zaznacz wszystkie"}</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {outlets.map((o) => (
                <button key={o.slug} onClick={() => toggle(o.slug)} title={o.orientacja}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${sel.has(o.slug) ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white" : "border border-slate-500/30 bg-slate-900/50 text-slate-400 hover:border-slate-400/50"}`}>
                  {o.name}
                </button>
              ))}
            </div>
          </div>

          <button onClick={simulate} disabled={busy || !text.trim() || sel.size === 0}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Radio size={16} />} Symuluj emisję
          </button>

          {err && <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-300">{err}</div>}

          {cov && (
            <div className="mt-5 space-y-3">
              <p className="text-[11px] text-slate-600">Prognoza oparta na realnym przechyłe i dorobku redakcji. To symulacja, nie cytat, żadne medium tego jeszcze nie opublikowało.</p>
              {cov.map((c) => (
                <div key={c.slug} className={`rounded-xl border bg-slate-900/50 p-4 ${tone(c.orientacja)}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-white">{c.name}</span>
                    <span className="shrink-0 text-[10px] text-slate-500">{c.orientacja.split(",")[0]}</span>
                  </div>
                  <div className="mt-2 text-[15px] font-semibold leading-snug text-slate-100">„{c.naglowek}"</div>
                  {c.rama && <div className="mt-2 flex gap-1.5 text-xs text-slate-400"><Frame size={13} className="mt-0.5 shrink-0 text-slate-500" /><span><span className="text-slate-500">Rama:</span> {c.rama}</span></div>}
                  {c.wyciete && <div className="mt-1 flex gap-1.5 text-xs text-amber-200/80"><span className="text-amber-400/70">Na pasek / wytną:</span> {c.wyciete}</div>}
                  {c.pytanie && <div className="mt-1 flex gap-1.5 text-xs text-rose-200/80"><Crosshair size={13} className="mt-0.5 shrink-0 text-rose-400/70" /><span><span className="text-rose-400/70">Pytanie-gilotyna:</span> {c.pytanie}</span></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
