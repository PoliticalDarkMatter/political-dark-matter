"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { DIMENSION_LABELS, type GroupDimension, type GroupWithCount } from "@/lib/insight";

// ── Rozmowa z grupą: czat z wirtualną osobowością grupy społecznej ────────
// Awatar mówi w pierwszej osobie, ale wyłącznie na podstawie dowodów z bazy.
// Każda odpowiedź ma rozwijane "skąd to wiem" z listą dowodów i źródeł.

interface EvidenceItem {
  nr: number;
  tekst: string;
  zrodlo: string;
  url: string | null;
  data: string | null;
  score: number | null;
  rodzaj: string;
}

interface AvatarApiResponse {
  answer: string;
  confidence: "wysoka" | "srednia" | "niska";
  usedEvidence: number[];
  caveats: string | null;
  evidence: EvidenceItem[];
  coverage: "brak" | "szczatkowe" | "czesciowe" | "dobre";
  personaVersion: number;
  aiReal: boolean;
  error?: string;
}

interface ChatMessage {
  role: "user" | "avatar";
  text: string;
  meta?: AvatarApiResponse;
}

const COVERAGE_LABELS: Record<string, { label: string; color: string }> = {
  brak: { label: "brak danych o grupie", color: "#f87171" },
  szczatkowe: { label: "dane szczątkowe", color: "#fbbf24" },
  czesciowe: { label: "dane częściowe", color: "#38bdf8" },
  dobre: { label: "dobre pokrycie danymi", color: "#4ade80" },
};

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  wysoka: { label: "pewność: wysoka", color: "#4ade80" },
  srednia: { label: "pewność: średnia", color: "#fbbf24" },
  niska: { label: "pewność: niska", color: "#f87171" },
};

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        padding: "2px 8px",
        borderRadius: 20,
        color,
        background: color + "1a",
        border: `1px solid ${color}55`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function AvatarGroupPicker({
  groups,
  value,
  onChange,
}: {
  groups: GroupWithCount[] | null;
  value: string;
  onChange: (v: string) => void;
}) {
  const byDim = (groups ?? []).reduce<Record<string, GroupWithCount[]>>((acc, g) => {
    (acc[g.dimension] ??= []).push(g);
    return acc;
  }, {});
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pdm-searchbar w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200"
    >
      <option value="">Wybierz grupę, z którą chcesz rozmawiać…</option>
      {Object.entries(byDim).map(([dimension, list]) => (
        <optgroup key={dimension} label={DIMENSION_LABELS[dimension as GroupDimension] ?? dimension}>
          {list.map((g) => (
            <option key={g.id} value={g.value}>
              {g.label_pl}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function EvidencePanel({ meta }: { meta: AvatarApiResponse }) {
  const [open, setOpen] = useState(false);
  const used = new Set(meta.usedEvidence);

  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-sky-300/90 hover:text-sky-200"
      >
        <ShieldCheck size={12} />
        Skąd to wiem
        {meta.usedEvidence.length > 0 && ` (użyte dowody: ${meta.usedEvidence.join(", ")})`}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {meta.evidence.map((e) => (
            <li
              key={e.nr}
              className={[
                "rounded-md border px-2.5 py-1.5 text-[11px] leading-relaxed",
                used.has(e.nr)
                  ? "border-sky-400/40 bg-sky-400/5 text-slate-200"
                  : "border-white/5 bg-white/[0.02] text-slate-500",
              ].join(" ")}
            >
              <span className="font-black text-sky-300">[{e.nr}]</span> {e.tekst}
              <div className="mt-0.5 text-[10px] text-slate-500">
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noreferrer" className="underline hover:text-slate-300">
                    {e.zrodlo}
                  </a>
                ) : (
                  e.zrodlo
                )}
                {e.data ? ` · ${e.data}` : ""}
                {e.score != null ? ` · score ${e.score}` : ""}
                {" · "}
                {e.rodzaj.replace(/_/g, " ")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const SUGGESTED = `Zadaj pytanie, np. „Jak spędzacie wolny czas?", „Czy jeździcie za granicę?", „Czy angażujecie się społecznie?"`;

export default function AvatarChatTab({ groups }: { groups: GroupWithCount[] | null }) {
  const [groupValue, setGroupValue] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Zmiana grupy = nowa rozmowa (osobowość nie przecieka między grupami)
  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [groupValue]);

  const send = useCallback(async () => {
    const question = input.trim();
    if (!question || !groupValue || loading) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      const res = await fetch("/api/insight/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group: groupValue, question, history }),
      });
      const data = (await res.json()) as AvatarApiResponse;
      if (data.error) setError(data.error);
      else setMessages((m) => [...m, { role: "avatar", text: data.answer, meta: data }]);
    } catch {
      setError("Nie udało się połączyć z awatarem.");
    } finally {
      setLoading(false);
    }
  }, [input, groupValue, loading, messages]);

  const lastMeta = [...messages].reverse().find((m) => m.meta)?.meta;
  const covInfo = lastMeta ? COVERAGE_LABELS[lastMeta.coverage] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="pdm-panel p-5">
        <div className="pdm-kicker">Rozmowa z grupą · wirtualna osobowość</div>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
          Awatar mówi w pierwszej osobie jak członek wybranej grupy, ale wolno mu twierdzić wyłącznie to, co wynika z
          dowodów w bazie (badania, sondaże, analizy). Gdy danych brak, mówi to wprost. Każda odpowiedź ma rozwijaną
          listę „skąd to wiem".
        </p>
        <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto]">
          <AvatarGroupPicker groups={groups} value={groupValue} onChange={setGroupValue} />
          {covInfo && <Pill {...covInfo} />}
        </div>
      </div>

      <div className="pdm-panel flex min-h-[300px] flex-col p-5">
        {messages.length === 0 && !loading && (
          <div className="py-8 text-center text-[13px] text-slate-500">
            {groupValue ? SUGGESTED : "Najpierw wybierz grupę, z którą chcesz porozmawiać."}
          </div>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                className="self-end rounded-2xl rounded-br-sm border border-sky-400/30 bg-sky-400/10 px-4 py-2.5 text-[13px] text-white sm:max-w-[80%]"
              >
                {m.text}
              </div>
            ) : (
              <div
                key={i}
                className="self-start rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] leading-relaxed text-slate-200 sm:max-w-[92%]"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <MessageCircle size={12} className="text-sky-300" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-300/80">Awatar grupy</span>
                  {m.meta && <Pill {...CONFIDENCE_LABELS[m.meta.confidence]} />}
                  {m.meta && !m.meta.aiReal && <Pill label="tryb bez modelu" color="#f87171" />}
                </div>
                <div className="whitespace-pre-wrap">{m.text}</div>
                {m.meta?.caveats && (
                  <div className="mt-2 rounded-md border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5 text-[11px] text-amber-200/80">
                    Zastrzeżenie: {m.meta.caveats}
                  </div>
                )}
                {m.meta && <EvidencePanel meta={m.meta} />}
              </div>
            )
          )}
          {loading && <div className="self-start px-2 text-[12px] text-slate-500">Awatar sięga do dowodów…</div>}
          {error && <div className="self-start px-2 text-[12px] text-rose-400">{error}</div>}
          <div ref={bottomRef} />
        </div>

        <div className="mt-4 flex gap-2 border-t border-white/10 pt-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={groupValue ? "Zadaj pytanie grupie…" : "Najpierw wybierz grupę"}
            disabled={!groupValue || loading}
            className="pdm-searchbar flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!groupValue || !input.trim() || loading}
            className="pdm-btn-primary rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "…" : "Wyślij"}
          </button>
        </div>
      </div>
    </div>
  );
}
