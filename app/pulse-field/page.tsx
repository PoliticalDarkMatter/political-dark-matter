"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/layout/PageHeader";
import {
  Loader2, Plus, Send, EyeOff, Eye, Trash2, RefreshCw, ExternalLink, Radio, Pencil, X,
} from "lucide-react";

type Typ = "film" | "wpis" | "analiza" | "przekaz";
interface Item {
  id: string; typ: Typ; tytul: string; lead: string | null; tresc: string | null;
  media_url: string | null; zrodlo_url: string | null; temat: string | null;
  published: boolean; published_at: string;
}

const PUBLIC_URL = "https://ryszard-petru.vercel.app";
const TYPY: { id: Typ; label: string; emoji: string }[] = [
  { id: "przekaz", label: "Przekaz", emoji: "📣" },
  { id: "wpis", label: "Wpis", emoji: "📝" },
  { id: "analiza", label: "Analiza", emoji: "📊" },
  { id: "film", label: "Film", emoji: "🎬" },
];
const EMOJI: Record<Typ, string> = { film: "🎬", wpis: "📝", analiza: "📊", przekaz: "📣" };

const empty = { id: "", typ: "przekaz" as Typ, tytul: "", lead: "", tresc: "", media_url: "", zrodlo_url: "", temat: "" };

export default function PulseFieldPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...empty });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pulse/content", { cache: "no-store" });
      const j = await r.json();
      setItems(j.items ?? []);
    } catch { setErr("Nie udało się pobrać treści."); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const refreshPreview = () => setPreviewKey((k) => k + 1);

  async function save(publish: boolean) {
    if (!form.tytul.trim()) { setErr("Podaj tytuł."); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/pulse/content", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: form.id || null, published: publish }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "błąd");
      setForm({ ...empty });
      await load(); refreshPreview();
    } catch (e) { setErr(e instanceof Error ? e.message : "Nie udało się zapisać."); }
    setBusy(false);
  }

  async function toggle(it: Item) {
    setBusy(true);
    try {
      await fetch("/api/pulse/content", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: it.id, published: !it.published }),
      });
      await load(); refreshPreview();
    } finally { setBusy(false); }
  }

  async function remove(it: Item) {
    if (!confirm(`Usunąć „${it.tytul}"?`)) return;
    setBusy(true);
    try { await fetch(`/api/pulse/content?id=${it.id}`, { method: "DELETE" }); await load(); refreshPreview(); }
    finally { setBusy(false); }
  }

  function edit(it: Item) {
    setForm({
      id: it.id, typ: it.typ, tytul: it.tytul, lead: it.lead ?? "", tresc: it.tresc ?? "",
      media_url: it.media_url ?? "", zrodlo_url: it.zrodlo_url ?? "", temat: it.temat ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const publishedCount = items.filter((i) => i.published).length;

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.10),transparent_38%),radial-gradient(circle_at_88%_100%,rgba(56,189,248,0.10),transparent_42%)]" />
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-8">
        <PageHeader
          title="Pulse Field"
          subtitle="Konsola emisji. Publikujesz filmy, wpisy, analizy i przekazy na publiczny hub ryszardpetru.pl i widzisz je na żywo."
          logo="/logos/pulse-field.png"
          status="AKTYWNY"
        />

        <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/5 px-3 py-1 font-semibold text-fuchsia-200">
            <Radio size={13} /> {publishedCount} opublikowanych / {items.length} w bazie
          </span>
          <a href={PUBLIC_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/5 px-3 py-1 font-semibold text-sky-200 hover:bg-sky-500/10">
            <ExternalLink size={13} /> Otwórz publiczny hub
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── KONSOLA ── */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-fuchsia-200">
                  {form.id ? <Pencil size={15} /> : <Plus size={15} />} {form.id ? "Edycja publikacji" : "Nowa publikacja"}
                </h2>
                {form.id && (
                  <button onClick={() => setForm({ ...empty })} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><X size={13} /> Anuluj</button>
                )}
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {TYPY.map((t) => (
                  <button key={t.id} onClick={() => setForm((f) => ({ ...f, typ: t.id }))}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${form.typ === t.id ? "border-fuchsia-400/50 bg-fuchsia-500/15 text-fuchsia-100" : "border-white/10 bg-slate-950/40 text-slate-400 hover:text-white"}`}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>

              <input value={form.tytul} onChange={(e) => setForm((f) => ({ ...f, tytul: e.target.value }))} placeholder="Tytuł"
                className="mb-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-[15px] text-slate-100 outline-none focus:border-fuchsia-400/40" />
              <input value={form.lead} onChange={(e) => setForm((f) => ({ ...f, lead: e.target.value }))} placeholder="Lead (jedno zdanie zajawki)"
                className="mb-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-fuchsia-400/40" />
              <textarea value={form.tresc} onChange={(e) => setForm((f) => ({ ...f, tresc: e.target.value }))} placeholder="Treść" rows={5}
                className="mb-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm leading-relaxed text-slate-100 outline-none focus:border-fuchsia-400/40" />
              <div className="mb-2 grid gap-2 sm:grid-cols-2">
                <input value={form.media_url} onChange={(e) => setForm((f) => ({ ...f, media_url: e.target.value }))} placeholder={form.typ === "film" ? "Link do wideo (YouTube itp.)" : "Link do grafiki/wideo (opcjonalnie)"}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-100 outline-none focus:border-fuchsia-400/40" />
                <input value={form.temat} onChange={(e) => setForm((f) => ({ ...f, temat: e.target.value }))} placeholder="Temat / tag (opcjonalnie)"
                  className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-100 outline-none focus:border-fuchsia-400/40" />
              </div>
              <input value={form.zrodlo_url} onChange={(e) => setForm((f) => ({ ...f, zrodlo_url: e.target.value }))} placeholder="Źródło / link zewnętrzny (opcjonalnie)"
                className="mb-3 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-100 outline-none focus:border-fuchsia-400/40" />

              {err && <p className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p>}

              <div className="flex flex-wrap gap-2">
                <button onClick={() => save(true)} disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50">
                  {busy ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />} Publikuj na hub
                </button>
                <button onClick={() => save(false)} disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50">
                  Zapisz jako szkic
                </button>
              </div>
            </div>

            {/* lista */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Treści</h2>
                <button onClick={load} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><RefreshCw size={13} /> Odśwież</button>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="animate-spin" size={16} /> Wczytuję…</div>
              ) : items.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Brak treści. Opublikuj pierwszą pozycję.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((it) => (
                    <li key={it.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                      <span className="mt-0.5 text-lg leading-none">{EMOJI[it.typ]}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-100">{it.tytul}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${it.published ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-600/30 text-slate-400"}`}>
                            {it.published ? "Opublikowane" : "Szkic"}
                          </span>
                        </div>
                        {it.lead && <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{it.lead}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => toggle(it)} disabled={busy} title={it.published ? "Cofnij z huba" : "Publikuj"}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-50">
                          {it.published ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button onClick={() => edit(it)} title="Edytuj" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil size={15} /></button>
                        <button onClick={() => remove(it)} disabled={busy} title="Usuń" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"><Trash2 size={15} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── PODGLĄD NA ŻYWO ── */}
          <div className="lg:sticky lg:top-6 self-start">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Podgląd na żywo · ryszardpetru.pl
                </span>
                <button onClick={refreshPreview} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><RefreshCw size={12} /> Odśwież</button>
              </div>
              <iframe key={previewKey} src={PUBLIC_URL} title="Podgląd publicznego huba"
                className="h-[70vh] w-full bg-white" />
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-500">To realny widok publicznej strony. Po publikacji odśwież podgląd.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
