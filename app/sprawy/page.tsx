"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderKanban, Plus, Loader2, ChevronRight } from "lucide-react";
import { TYP_LABEL, STATUS_LABEL, type Sprawa, type SprawaTyp } from "@/lib/sprawy";
import PageHeader from "@/components/layout/PageHeader";

const TYPY: SprawaTyp[] = ["kampania_stala", "temat", "kryzys", "inne"];

export default function SprawyPage() {
  const [sprawy, setSprawy] = useState<Sprawa[]>([]);
  const [loading, setLoading] = useState(true);
  const [nazwa, setNazwa] = useState("");
  const [opis, setOpis] = useState("");
  const [typ, setTyp] = useState<SprawaTyp>("temat");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/sprawy", { cache: "no-store" });
      const j = await r.json();
      setSprawy(j.sprawy ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!nazwa.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/sprawy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nazwa, opis, typ }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setNazwa(""); setOpis(""); setTyp("temat");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.06),transparent_35%),radial-gradient(circle_at_85%_100%,rgba(124,58,237,0.1),transparent_40%)]" />
      <div className="relative z-10 mx-auto max-w-4xl px-5 py-8">
        <PageHeader title="Sprawy" subtitle="Jednostka robocza platformy. Każda sprawa niesie własny wątek: sygnał, decyzja, komunikat, publikacja." icon={<FolderKanban size={22} className="text-white" />} accent="from-sky-500 to-violet-600" />

        {/* Nowa sprawa */}
        <div className="mt-6 rounded-xl border border-sky-400/15 bg-slate-900/50 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-100">Nowa sprawa</div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={nazwa} onChange={(e) => setNazwa(e.target.value)}
              placeholder="Nazwa sprawy, np. Start nowej partii"
              className="rounded-lg border border-sky-400/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40"
            />
            <select
              value={typ} onChange={(e) => setTyp(e.target.value as SprawaTyp)}
              className="rounded-lg border border-sky-400/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/40"
            >
              {TYPY.map((t) => <option key={t} value={t}>{TYP_LABEL[t]}</option>)}
            </select>
          </div>
          <textarea
            value={opis} onChange={(e) => setOpis(e.target.value)}
            rows={2} placeholder="Opis (opcjonalnie)"
            className="mt-3 w-full rounded-lg border border-sky-400/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40"
          />
          {err && <div className="mt-2 text-sm text-rose-300">{err}</div>}
          <button
            onClick={create} disabled={saving || !nazwa.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Utwórz sprawę
          </button>
        </div>

        {/* Lista */}
        <div className="mt-6 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin" size={18} /> Wczytuję…</div>
          ) : sprawy.length === 0 ? (
            <div className="rounded-xl border border-sky-400/10 bg-slate-900/40 p-6 text-center text-sm text-slate-500">Brak spraw. Utwórz pierwszą powyżej.</div>
          ) : (
            sprawy.map((s) => (
              <Link key={s.id} href={`/sprawy/${s.id}`}
                className="flex items-center justify-between rounded-xl border border-sky-400/15 bg-slate-900/50 px-4 py-3 hover:border-sky-400/35 hover:bg-slate-900/80">
                <div>
                  <div className="font-semibold text-white">{s.nazwa}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-sky-300">{TYP_LABEL[s.typ]}</span>
                    <span>{STATUS_LABEL[s.status]}</span>
                    <span className="text-slate-600">· {new Date(s.utworzona_at).toLocaleDateString("pl-PL")}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-500" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
