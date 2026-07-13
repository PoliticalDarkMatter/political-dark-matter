"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, ShieldCheck, Loader2, History } from "lucide-react";
import { ZALOZENIA_SLOTS, type ZalozeniaSlotKey } from "@/lib/zalozenia";

type Form = Record<ZalozeniaSlotKey, string> & { nota: string };

const EMPTY: Form = {
  cele_nadrzedne: "", pozycjonowanie: "", czerwone_linie: "", ton_glos: "",
  grupy_priorytetowe: "", przeciwnicy: "", tematy_wlasnosc: "", tematy_do_unikania: "", nota: "",
};

export default function ZalozeniaPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [wersja, setWersja] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/zalozenia", { cache: "no-store" });
      const j = await r.json();
      const z = j.zalozenia;
      if (z) {
        setForm({
          cele_nadrzedne: z.cele_nadrzedne ?? "", pozycjonowanie: z.pozycjonowanie ?? "",
          czerwone_linie: z.czerwone_linie ?? "", ton_glos: z.ton_glos ?? "",
          grupy_priorytetowe: z.grupy_priorytetowe ?? "", przeciwnicy: z.przeciwnicy ?? "",
          tematy_wlasnosc: z.tematy_wlasnosc ?? "", tematy_do_unikania: z.tematy_do_unikania ?? "",
          nota: "",
        });
        setWersja(z.wersja);
        setUpdatedAt(z.utworzone_at);
      }
    } catch {
      setMsg("Nie udało się wczytać założeń.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const { nota, ...sloty } = form;
      const r = await fetch("/api/zalozenia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dane: { ...sloty, nota } }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const z = j.zalozenia;
      setWersja(z?.wersja ?? null);
      setUpdatedAt(z?.utworzone_at ?? null);
      setForm((f) => ({ ...f, nota: "" }));
      setMsg("Zapisano nową wersję założeń. Od teraz obowiązuje w każdym module.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd zapisu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.06),transparent_35%),radial-gradient(circle_at_85%_100%,rgba(124,58,237,0.1),transparent_40%)]" />
      <div className="relative z-10 mx-auto max-w-3xl px-5 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white">
          <ArrowLeft size={14} className="text-sky-400" /> Panel główny Political Dark Matter
        </Link>

        <div className="mt-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Założenia strategiczne</h1>
            <p className="text-sm text-slate-400">Konstytucja systemu. Wstrzykiwana do każdego modułu jako nadrzędny kontekst pracy.</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          {wersja !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-slate-900/50 px-2.5 py-1">
              <History size={12} className="text-sky-400" /> Wersja {wersja}
              {updatedAt && <span className="text-slate-600">· {new Date(updatedAt).toLocaleDateString("pl-PL")}</span>}
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-10 flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin" size={18} /> Wczytuję…</div>
        ) : (
          <div className="mt-6 space-y-5">
            {ZALOZENIA_SLOTS.map((slot) => (
              <div key={slot.key}>
                <label className="block text-sm font-semibold text-slate-100">{slot.label}</label>
                <p className="mb-1.5 text-xs text-slate-500">{slot.hint}</p>
                <textarea
                  value={form[slot.key]}
                  onChange={(e) => setForm((f) => ({ ...f, [slot.key]: e.target.value }))}
                  rows={slot.key === "pozycjonowanie" ? 3 : 2}
                  className="w-full rounded-lg border border-sky-400/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40"
                  placeholder="Zostaw puste, jeśli jeszcze nie ustalone…"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-semibold text-slate-100">Nota do tej wersji (opcjonalnie)</label>
              <input
                value={form.nota}
                onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-sky-400/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40"
                placeholder="Np. co zmieniło się względem poprzedniej wersji"
              />
            </div>

            {msg && (
              <div className="rounded-lg border border-sky-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">{msg}</div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Zapisz jako nową wersję
              </button>
              <span className="text-xs text-slate-500">Zapis tworzy nową wersję i archiwizuje poprzednią.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
