"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Zap, ShieldCheck, Save, Copy, Check, Gauge, Swords, Wrench, Newspaper } from "lucide-react";

type Channel = "x" | "facebook" | "instagram" | "reel" | "oswiadczenie" | "media" | "newsletter" | "talking_points";
const CHANNELS: { id: Channel; label: string }[] = [
  { id: "x", label: "Wpis na X" }, { id: "facebook", label: "Facebook" }, { id: "instagram", label: "Instagram" },
  { id: "reel", label: "Reel / TikTok" }, { id: "oswiadczenie", label: "Oświadczenie" }, { id: "media", label: "Do mediów" },
  { id: "newsletter", label: "Newsletter" }, { id: "talking_points", label: "Talking points" },
];
const STATUSES = ["roboczy", "do_akceptacji", "zatwierdzony"];
const STATUS_LABEL: Record<string, string> = { roboczy: "Roboczy", do_akceptacji: "Do akceptacji", zatwierdzony: "Zatwierdzony" };

interface Variant { channel: Channel; label: string; body: string; }
interface Sprawa { id: string; nazwa: string; }
interface Coverage { name: string; naglowek: string; }
interface Pre { gotowosc: number; werdykt: string; ryzyka: string[]; jak_zaatakuja: string[]; poprawki: string[]; media: Coverage[]; }
interface Draft { id: string; channel: string | null; body: string; status: string | null; handoff: string; }

export default function VoltStreamPage() {
  const [sprawy, setSprawy] = useState<Sprawa[]>([]);
  const [sprawaId, setSprawaId] = useState("");
  const [grupa, setGrupa] = useState("");
  const [brief, setBrief] = useState("");
  const [channels, setChannels] = useState<Set<Channel>>(new Set(["x", "facebook", "media", "talking_points"] as Channel[]));
  const [busy, setBusy] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [bodies, setBodies] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [pre, setPre] = useState<Record<number, Pre | "loading">>({});
  const [copied, setCopied] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<Record<number, string>>({});
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => { fetch("/api/sprawy", { cache: "no-store" }).then((r) => r.json()).then((j) => setSprawy(j.sprawy ?? [])).catch(() => {}); }, []);
  useEffect(() => { loadDrafts(); }, [sprawaId]);

  function loadDrafts() {
    const q = sprawaId ? `?sprawa=${sprawaId}` : "";
    fetch(`/api/volt-stream/drafts${q}`, { cache: "no-store" }).then((r) => r.json()).then((j) => setDrafts(j.drafts ?? [])).catch(() => {});
  }
  function toggle(c: Channel) { setChannels((p) => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; }); }

  async function generate() {
    if (!brief.trim() || channels.size === 0) return;
    setBusy(true); setErr(null); setVariants([]); setPre({}); setBodies([]);
    try {
      const r = await fetch("/api/volt-stream/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief, channels: Array.from(channels), grupa: grupa || undefined }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setVariants(j.variants); setBodies(j.variants.map((v: Variant) => v.body));
    } catch (e) { setErr(e instanceof Error ? e.message : "Błąd."); } finally { setBusy(false); }
  }

  async function runPreflight(i: number) {
    setPre((p) => ({ ...p, [i]: "loading" }));
    try {
      const r = await fetch("/api/volt-stream/preflight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: bodies[i] }) });
      const j = await r.json();
      setPre((p) => ({ ...p, [i]: j.result }));
    } catch { setPre((p) => { const n = { ...p }; delete n[i]; return n; }); }
  }

  async function save(i: number) {
    const status = saveStatus[i] ?? "roboczy";
    try {
      const r = await fetch("/api/volt-stream/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sprawa_id: sprawaId || null, channel: variants[i].channel, body: bodies[i], status }) });
      if (r.ok) loadDrafts();
    } catch { /* */ }
  }
  async function changeStatus(id: string, status: string) {
    await fetch("/api/volt-stream/drafts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    loadDrafts();
  }
  function copy(i: number) { navigator.clipboard.writeText(bodies[i]).then(() => { setCopied(i); setTimeout(() => setCopied(null), 1500); }).catch(() => {}); }

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.07),transparent_35%),radial-gradient(circle_at_85%_100%,rgba(37,99,235,0.12),transparent_40%)]" />
      <div className="relative z-10 mx-auto max-w-3xl px-5 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white"><ArrowLeft size={14} className="text-sky-400" /> Panel główny Political Dark Matter</Link>
        <div className="mt-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg"><Zap size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-white">Volt Stream</h1>
            <p className="text-sm text-slate-400">Fabryka przekazu. Z briefu robi komplet komunikatów w głosie Ryszarda Petru, testuje je przed publikacją i prowadzi przez akceptację do emisji.</p>
          </div>
        </div>

        {/* Brief */}
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr]">
          <div>
            <label className="block text-xs font-semibold text-slate-300">Sprawa</label>
            <select value={sprawaId} onChange={(e) => setSprawaId(e.target.value)} className="mt-1 w-full rounded-lg border border-sky-400/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/40">
              <option value="">— bez sprawy —</option>
              {sprawy.map((s) => <option key={s.id} value={s.id}>{s.nazwa}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300">Grupa docelowa (opcjonalnie)</label>
            <input value={grupa} onChange={(e) => setGrupa(e.target.value)} placeholder="np. przedsiębiorcy, młodzi" className="mt-1 w-full rounded-lg border border-sky-400/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40" />
          </div>
        </div>
        <label className="mt-3 block text-sm font-semibold text-slate-100">Brief / decyzja</label>
        <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={4} placeholder="Co chcemy zakomunikować? Wklej decyzję z Apex Grid albo opisz w jednym zdaniu." className="mt-1.5 w-full rounded-lg border border-sky-400/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <button key={c.id} onClick={() => toggle(c.id)} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${channels.has(c.id) ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white" : "border border-slate-500/30 bg-slate-900/50 text-slate-400 hover:border-slate-400/50"}`}>{c.label}</button>
          ))}
        </div>
        <button onClick={generate} disabled={busy || !brief.trim() || channels.size === 0} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />} Generuj przekaz</button>
        {err && <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-300">{err}</div>}

        {/* Variants */}
        {variants.length > 0 && (
          <div className="mt-5 space-y-4">
            {variants.map((v, i) => {
              const p = pre[i];
              return (
                <div key={i} className="rounded-xl border border-sky-400/15 bg-slate-900/50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">{v.label}</span>
                    <button onClick={() => copy(i)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">{copied === i ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />} {copied === i ? "Skopiowano" : "Kopiuj"}</button>
                  </div>
                  <textarea value={bodies[i] ?? ""} onChange={(e) => setBodies((b) => { const n = [...b]; n[i] = e.target.value; return n; })} rows={4} className="w-full rounded-lg border border-slate-600/30 bg-slate-950/50 px-3 py-2 text-[15px] leading-relaxed text-slate-100 outline-none focus:border-sky-400/40" />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button onClick={() => runPreflight(i)} disabled={p === "loading"} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/5 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/10 disabled:opacity-50">{p === "loading" ? <Loader2 className="animate-spin" size={13} /> : <ShieldCheck size={13} />} Test przed publikacją</button>
                    <select value={saveStatus[i] ?? "roboczy"} onChange={(e) => setSaveStatus((s) => ({ ...s, [i]: e.target.value }))} className="rounded-lg border border-sky-400/15 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-200 outline-none">
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    <button onClick={() => save(i)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700"><Save size={13} /> Zapisz do sprawy</button>
                  </div>
                  {p && p !== "loading" && (
                    <div className="mt-3 rounded-lg border border-amber-400/15 bg-slate-950/50 p-3 text-xs">
                      <div className="flex items-center gap-2"><Gauge size={14} className="text-amber-300" /><span className="font-semibold text-slate-100">Gotowość: {p.gotowosc}/100</span><span className="text-slate-400">{p.werdykt}</span></div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400" style={{ width: `${p.gotowosc}%` }} /></div>
                      {p.ryzyka.length > 0 && <div className="mt-2"><span className="font-semibold text-amber-300">Ryzyka:</span><ul className="list-disc pl-4 text-slate-400">{p.ryzyka.map((x, k) => <li key={k}>{x}</li>)}</ul></div>}
                      {p.jak_zaatakuja.length > 0 && <div className="mt-1.5 flex gap-1.5"><Swords size={13} className="mt-0.5 shrink-0 text-rose-400/70" /><div><span className="font-semibold text-rose-300">Jak zaatakują:</span><ul className="list-disc pl-4 text-slate-400">{p.jak_zaatakuja.map((x, k) => <li key={k}>{x}</li>)}</ul></div></div>}
                      {p.poprawki.length > 0 && <div className="mt-1.5 flex gap-1.5"><Wrench size={13} className="mt-0.5 shrink-0 text-emerald-400/70" /><div><span className="font-semibold text-emerald-300">Poprawki:</span><ul className="list-disc pl-4 text-slate-400">{p.poprawki.map((x, k) => <li key={k}>{x}</li>)}</ul></div></div>}
                      {p.media.length > 0 && <div className="mt-1.5 flex gap-1.5"><Newspaper size={13} className="mt-0.5 shrink-0 text-sky-400/70" /><div><span className="font-semibold text-sky-300">Jak zatytułują media:</span><ul className="space-y-0.5 pl-0 text-slate-400">{p.media.map((m, k) => <li key={k}><span className="text-slate-500">{m.name}:</span> „{m.naglowek}"</li>)}</ul></div></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Saved drafts / obieg zatwierdzeń */}
        {drafts.length > 0 && (
          <div className="mt-8">
            <div className="mb-2 text-sm font-semibold text-slate-100">Przekazy {sprawaId ? "w tej sprawie" : "(wszystkie)"}</div>
            <div className="space-y-2">
              {drafts.map((d) => (
                <div key={d.id} className="rounded-lg border border-sky-400/10 bg-slate-900/40 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">{d.channel}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${d.status === "zatwierdzony" ? "bg-emerald-400/15 text-emerald-300" : d.status === "do_akceptacji" ? "bg-amber-400/15 text-amber-300" : "bg-slate-500/15 text-slate-400"}`}>{STATUS_LABEL[d.status ?? "roboczy"] ?? d.status}</span>
                    {d.handoff === "ready" && <span className="rounded bg-violet-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">→ do Pulse Field</span>}
                    <div className="ml-auto flex gap-1">
                      {STATUSES.filter((s) => s !== d.status).map((s) => (
                        <button key={s} onClick={() => changeStatus(d.id, s)} className="rounded border border-slate-600/40 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white hover:border-slate-500">{STATUS_LABEL[s]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-[13px] leading-snug text-slate-300">{d.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
