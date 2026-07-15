"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Radio, Grid3x3, Megaphone, Send, Activity, ChevronRight, FileText, FileDown } from "lucide-react";
import { TYP_LABEL, STATUS_LABEL, type Cockpit } from "@/lib/sprawy";

const STAGE_ICON: Record<string, React.ReactNode> = {
  sygnal: <Radio size={16} />, decyzja: <Grid3x3 size={16} />,
  komunikat: <Megaphone size={16} />, publikacja: <Send size={16} />,
};

function handoffColor(h: string | null): string {
  if (h === "ready") return "bg-amber-400/15 text-amber-300";
  if (h === "consumed") return "bg-emerald-400/15 text-emerald-300";
  return "bg-slate-500/15 text-slate-400";
}

export default function KokpitSprawy() {
  const params = useParams();
  const id = String(params.id);
  const [cockpit, setCockpit] = useState<Cockpit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/sprawy/${id}`, { cache: "no-store" });
        if (r.status === 404) { setNotFound(true); return; }
        const j = await r.json();
        setCockpit(j.cockpit);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.06),transparent_35%),radial-gradient(circle_at_85%_100%,rgba(124,58,237,0.1),transparent_40%)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-5 py-8">
        <Link href="/sprawy" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white">
          <ArrowLeft size={14} className="text-sky-400" /> Wszystkie sprawy
        </Link>

        {loading ? (
          <div className="mt-10 flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin" size={18} /> Wczytuję kokpit…</div>
        ) : notFound || !cockpit ? (
          <div className="mt-10 rounded-xl border border-sky-400/10 bg-slate-900/40 p-6 text-slate-400">Nie znaleziono sprawy.</div>
        ) : (
          <>
            <div className="mt-5">
              <h1 className="text-2xl font-bold text-white">{cockpit.sprawa.nazwa}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-sky-300">{TYP_LABEL[cockpit.sprawa.typ]}</span>
                <span>{STATUS_LABEL[cockpit.sprawa.status]}</span>
              </div>
              {cockpit.sprawa.opis && <p className="mt-2 max-w-2xl text-sm text-slate-400">{cockpit.sprawa.opis}</p>}
            </div>

            {/* Raport sprawy — wspólny renderer PDF/DOCX w stylu projektu, z nagłówkiem założeń */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">Generuj raport</span>
              <a href={`/api/sprawy/${id}/report?format=pdf`} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-400/20">
                <FileText size={13} /> PDF
              </a>
              <a href={`/api/sprawy/${id}/report?format=docx`} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-400/20">
                <FileDown size={13} /> DOCX
              </a>
            </div>

            {/* Oś: sygnał → decyzja → komunikat → publikacja → efekt */}
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {cockpit.stages.map((st, i) => (
                <div key={st.klucz} className="relative rounded-xl border border-sky-400/15 bg-slate-900/50 p-3">
                  <div className="flex items-center gap-2 text-slate-100">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 text-white">{STAGE_ICON[st.klucz]}</span>
                    <div>
                      <div className="text-sm font-semibold">{st.label}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">{st.modul}</div>
                    </div>
                    <span className="ml-auto text-lg font-bold text-white">{st.count}</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {st.items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-700/60 px-2 py-3 text-center text-[11px] text-slate-600">brak</div>
                    ) : st.items.map((it) => (
                      <div key={it.id} className="rounded-lg bg-slate-950/60 px-2 py-1.5">
                        <div className="truncate text-xs font-medium text-slate-200">{it.tytul}</div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {it.handoff && <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${handoffColor(it.handoff)}`}>{it.handoff}</span>}
                          {it.meta && <span className="truncate text-[10px] text-slate-500">{it.meta}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {i < cockpit.stages.length - 1 && (
                    <ChevronRight size={16} className="absolute -right-2.5 top-4 z-10 hidden text-sky-400/60 md:block" />
                  )}
                </div>
              ))}
            </div>

            {/* Efekt */}
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-sky-400/15 bg-slate-900/50 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-sky-600 text-white"><Activity size={16} /></span>
              <div>
                <div className="text-sm font-semibold text-slate-100">Efekt</div>
                <div className="text-xs text-slate-500">{cockpit.efektEvents} zdarzeń zaangażowania z publikacji tej sprawy · wraca do Narrative Scope jako sygnał</div>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-600">Oś pokazuje przepływ handoff w tej sprawie. Znaczniki: draft (roboczy), ready (gotowy do przejęcia przez następny moduł), consumed (przejęty).</p>
          </>
        )}
      </div>
    </div>
  );
}
