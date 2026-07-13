"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Wand2, Quote, User, BookOpen } from "lucide-react";
import { PETRU_MODES, type PetruMode } from "@/lib/petru";

interface ConvertResult {
  przerobiony: string;
  uwagi: string[];
  tryb: PetruMode;
  oparto_na_wersji: number | null;
  oparto_na_liczbie_cytatow: number;
  fallback: boolean;
}
interface Utter { quote_text: string; topic: string | null; source_name: string | null; source_url: string | null; published_date: string | null; }

export default function EPetruPage() {
  const [text, setText] = useState("");
  const [tryb, setTryb] = useState<PetruMode>("wypowiedz");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [total, setTotal] = useState<number | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [utter, setUtter] = useState<Utter[]>([]);
  const [showBase, setShowBase] = useState(false);

  useEffect(() => {
    fetch("/api/petru/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setTotal(j.total); setProfile(j.profile?.profile ?? null); setUtter(j.utterances ?? []); })
      .catch(() => {});
  }, []);

  async function convert() {
    if (!text.trim()) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const r = await fetch("/api/petru/convert", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tryb }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setResult(j.result);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd.");
    } finally { setBusy(false); }
  }

  const leksyka = (profile?.leksyka_charakterystyczna as string[]) ?? [];
  const chwyty = (profile?.chwyty_retoryczne as Array<{ nazwa: string; przyklad: string; zrodlo: string }>) ?? [];
  const myslenie = (profile?.sposob_myslenia as string[]) ?? [];

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.06),transparent_35%),radial-gradient(circle_at_85%_100%,rgba(124,58,237,0.1),transparent_40%)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-5 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white">
          <ArrowLeft size={14} className="text-sky-400" /> Panel główny Political Dark Matter
        </Link>

        <div className="mt-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg">
            <User size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">e-Petru</h1>
            <p className="text-sm text-slate-400">Wirtualny polityk. Przerabia dowolny przekaz na język i sposób myślenia Ryszarda Petru, na wzorcu z {total ?? "…"} jego realnych wypowiedzi.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Konwerter */}
          <div>
            <label className="block text-sm font-semibold text-slate-100">Przekaz do przerobienia</label>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)} rows={6}
              placeholder="Wklej dowolny przekaz, tezę, komunikat… e-Petru przerobi to na język i logikę Ryszarda Petru."
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
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />} Przerób na język Ryszarda Petru
            </button>

            {err && <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-300">{err}</div>}

            {result && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-sky-400/20 bg-slate-900/60 p-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-300">Przekaz w wersji Ryszarda Petru</div>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-100">{result.przerobiony}</p>
                </div>
                {result.uwagi.length > 0 && (
                  <div className="rounded-xl border border-sky-400/10 bg-slate-950/50 p-3">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Co zrobiłem</div>
                    <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-400">
                      {result.uwagi.map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </div>
                )}
                <div className="text-[11px] text-slate-600">Oparto na profilu stylu {result.oparto_na_wersji ? `v${result.oparto_na_wersji}` : "—"} i {result.oparto_na_liczbie_cytatow} realnych cytatach. Stylizacja języka i sposobu myślenia, bez zmyślania faktów.</div>
              </div>
            )}
          </div>

          {/* Baza stylu */}
          <div className="rounded-xl border border-sky-400/15 bg-slate-900/40 p-4">
            <button onClick={() => setShowBase((s) => !s)} className="flex w-full items-center gap-2 text-sm font-semibold text-slate-100">
              <BookOpen size={15} className="text-violet-300" /> Baza stylu {total != null && <span className="ml-auto text-xs text-slate-500">{total} wypowiedzi</span>}
            </button>
            {showBase ? (
              <div className="mt-3 space-y-3 text-xs">
                {leksyka.length > 0 && (
                  <div>
                    <div className="mb-1 font-semibold text-slate-300">Leksyka</div>
                    <div className="flex flex-wrap gap-1">
                      {leksyka.slice(0, 14).map((l, i) => <span key={i} className="rounded bg-violet-400/10 px-1.5 py-0.5 text-violet-200">{l}</span>)}
                    </div>
                  </div>
                )}
                {chwyty.length > 0 && (
                  <div>
                    <div className="mb-1 font-semibold text-slate-300">Chwyty retoryczne</div>
                    <ul className="space-y-1 text-slate-400">
                      {chwyty.slice(0, 5).map((c, i) => <li key={i}><span className="text-slate-200">{c.nazwa}:</span> „{c.przyklad}"</li>)}
                    </ul>
                  </div>
                )}
                {myslenie.length > 0 && (
                  <div>
                    <div className="mb-1 font-semibold text-slate-300">Sposób myślenia</div>
                    <ul className="list-disc space-y-0.5 pl-4 text-slate-400">
                      {myslenie.slice(0, 5).map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {utter.slice(0, 4).map((u, i) => (
                  <a key={i} href={u.source_url ?? undefined} target="_blank" rel="noreferrer"
                    className="block rounded-lg bg-slate-950/50 p-2 hover:bg-slate-950/80">
                    <div className="flex gap-1.5 text-[13px] text-slate-200"><Quote size={12} className="mt-1 shrink-0 text-violet-300" /><span>{u.quote_text}</span></div>
                    <div className="mt-1 pl-4 text-[10px] text-slate-500">{u.source_name}{u.published_date ? ` · ${u.published_date}` : ""}</div>
                  </a>
                ))}
                <div className="text-[10px] text-slate-600">Kliknij „Baza stylu", by zobaczyć profil języka i myślenia.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
