"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Users, Layers, Sparkles } from "lucide-react";
import {
  DIMENSION_LABELS,
  ALL_POPULATION_VALUE,
  ALL_POPULATION_LABEL,
  type GroupDimension,
  type GroupWithCount,
  type InsightQueryResult,
  type GroupProfile,
  type GroupProfileFinding,
  type OverallStats,
} from "@/lib/insight";

type TabKey = "grupy" | "zapytaj" | "porownaj" | "charakterystyka";

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "grupy", label: "Grupy", icon: Users },
  { key: "zapytaj", label: "Zapytaj grupę", icon: Search },
  { key: "porownaj", label: "Porównaj grupy", icon: Layers },
  { key: "charakterystyka", label: "Charakterystyka grupy", icon: Sparkles },
];

const CONFIDENCE_LABELS: Record<string, string> = {
  twardy_wynik_sondazowy: "twardy wynik",
  interpretacja_dziennikarska: "interpretacja dziennikarska",
  hipoteza_analityka: "hipoteza analityka",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  twardy_wynik_sondazowy: "#4ade80",
  interpretacja_dziennikarska: "#fbbf24",
  hipoteza_analityka: "#f87171",
};

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const color = CONFIDENCE_COLORS[confidence] ?? "#94a3b8";
  const label = CONFIDENCE_LABELS[confidence] ?? confidence;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
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
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="py-4 text-[13px] text-slate-500">{children}</div>;
}

function useGroups() {
  const [groups, setGroups] = useState<GroupWithCount[] | null>(null);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/insight/groups")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else {
          setGroups(data.groups ?? []);
          setStats(data.stats ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Nie udało się połączyć z Insight Base.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { groups, stats, error };
}

function GroupsTab() {
  const { groups, stats, error } = useGroups();

  const byDimension = useMemo(() => {
    const map = new Map<GroupDimension, GroupWithCount[]>();
    for (const g of groups ?? []) {
      const list = map.get(g.dimension) ?? [];
      list.push(g);
      map.set(g.dimension, list);
    }
    return map;
  }, [groups]);

  if (error) return <EmptyNote>{error}</EmptyNote>;
  if (!groups || !stats) return <EmptyNote>Ładowanie taksonomii grup…</EmptyNote>;

  return (
    <div className="flex flex-col gap-6">
      <div className="pdm-panel p-5">
        <div className="pdm-kicker">Zasięg bazy</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <div>
            <span className="text-3xl font-black text-white">{groups.length}</span>
            <span className="ml-2 text-sm text-slate-400">zdefiniowanych grup społecznych, w {byDimension.size} wymiarach</span>
          </div>
          <div>
            <span className="text-3xl font-black text-white">{stats.totalStudies}</span>
            <span className="ml-2 text-sm text-slate-400">badań/źródeł wgranych do bazy</span>
          </div>
          <div>
            <span className="text-3xl font-black text-white">{stats.totalFindings}</span>
            <span className="ml-2 text-sm text-slate-400">zebranych wyników łącznie</span>
          </div>
        </div>
        {stats.findingsWithoutGroup > 0 && (
          <p className="mt-3 text-[12.5px] text-slate-500">
            {stats.findingsWithoutGroup} z tych wyników to dane ogólnokrajowe (źródło nie podało rozbicia na grupy
            społeczne) — dostępne pod „Cała populacja” w zakładkach pytania i charakterystyki, nie w rozbiciu
            poniżej.
          </p>
        )}
        {stats.totalFindings === 0 && (
          <p className="mt-3 text-[12.5px] text-slate-500">
            Baza wystartowała pusta. Nocne zadanie ingestii uzupełnia ją automatycznie, pierwsze dane pojawią się
            po najbliższym uruchomieniu.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from(byDimension.entries()).map(([dimension, list]) => (
          <div key={dimension} className="pdm-panel p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-sky-300/80">
              {DIMENSION_LABELS[dimension] ?? dimension}
            </div>
            <ul className="flex flex-col gap-1.5">
              {list.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 text-[13px] text-slate-300">
                  <span>{g.label_pl}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                    {g.findings_count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SynthesisCard({ s }: { s: InsightQueryResult["syntheses"][number] }) {
  return (
    <div className="pdm-panel p-4">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-violet-300/80">{s.topic}</span>
        <span className="text-[10.5px] text-slate-500">
          aktualizacja {new Date(s.last_updated_at).toLocaleDateString("pl-PL")}
        </span>
      </div>
      <p className="text-[13.5px] leading-relaxed text-slate-200">{s.synthesis_text}</p>
      {s.divergence_note && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-amber-300/90">
          Rozbieżność między badaniami: {s.divergence_note}
        </p>
      )}
      {s.sources && s.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {s.sources.map((src, i) => (
            <a
              key={i}
              href={src.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-sky-400/25 bg-sky-400/5 px-2.5 py-1 text-[11px] text-sky-300 hover:border-sky-300/50"
            >
              {src.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function FindingRow({ f }: { f: InsightQueryResult["raw_findings"][number] }) {
  return (
    <div className="pdm-panel p-4">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-sky-300/80">{f.topic}</span>
        <ConfidenceBadge confidence={f.confidence} />
      </div>
      {(f.value !== null || f.value_text) && (
        <div className="text-lg font-black text-white">
          {f.value !== null ? f.value : f.value_text}
        </div>
      )}
      {f.verbatim_quote && <p className="mt-1 text-[13px] italic leading-relaxed text-slate-300">„{f.verbatim_quote}”</p>}
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <a href={f.source_url} target="_blank" rel="noreferrer" className="truncate text-sky-400/80 hover:text-sky-300">
          {f.study_title}
        </a>
        {f.published_date && <span className="shrink-0">{new Date(f.published_date).toLocaleDateString("pl-PL")}</span>}
      </div>
    </div>
  );
}

function QueryResultView({ result }: { result: InsightQueryResult | null }) {
  if (!result) return null;
  if (result.syntheses.length === 0 && result.raw_findings.length === 0) {
    return (
      <EmptyNote>
        Brak jeszcze danych dla tego tematu i tej grupy. Baza uzupełnia się co noc, spróbuj ponownie za kilka dni
        albo zawęź/rozszerz temat.
      </EmptyNote>
    );
  }
  return (
    <div className="mt-4 flex flex-col gap-3">
      {result.syntheses.map((s, i) => (
        <SynthesisCard key={`synth-${i}`} s={s} />
      ))}
      {result.raw_findings.map((f, i) => (
        <FindingRow key={`find-${i}`} f={f} />
      ))}
    </div>
  );
}

function GroupPicker({
  groups,
  value,
  onChange,
}: {
  groups: GroupWithCount[] | null;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pdm-searchbar w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200"
    >
      <option value="">Wybierz grupę…</option>
      <option value={ALL_POPULATION_VALUE}>{ALL_POPULATION_LABEL}</option>
      {Object.entries(
        (groups ?? []).reduce<Record<string, GroupWithCount[]>>((acc, g) => {
          (acc[g.dimension] ??= []).push(g);
          return acc;
        }, {})
      ).map(([dimension, list]) => (
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

function AskGroupTab() {
  const { groups } = useGroups();
  const [groupValue, setGroupValue] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!topic.trim() || !groupValue) return;
    setLoading(true);
    setError(null);
    try {
      const groupValues = groupValue === ALL_POPULATION_VALUE ? [] : [groupValue];
      const res = await fetch("/api/insight/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, groupValues }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch {
      setError("Nie udało się połączyć z Insight Base.");
    } finally {
      setLoading(false);
    }
  }, [topic, groupValue]);

  return (
    <div className="flex flex-col gap-4">
      <div className="pdm-panel p-5">
        <div className="pdm-kicker">Pytanie do jednej grupy</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <GroupPicker groups={groups} value={groupValue} onChange={setGroupValue} />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Temat, np. zaufanie do rządu, ocena gospodarki…"
            className="pdm-searchbar rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500"
          />
          <button
            onClick={submit}
            disabled={loading || !topic.trim() || !groupValue}
            className="pdm-btn-primary rounded-lg px-5 py-2.5 text-sm font-bold text-white"
          >
            {loading ? "Pytam…" : "Zapytaj"}
          </button>
        </div>
      </div>
      {error && <EmptyNote>{error}</EmptyNote>}
      <QueryResultView result={result} />
    </div>
  );
}

function CompareGroupsTab() {
  const [dimension, setDimension] = useState<GroupDimension>("wiek");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<
    { group: { value: string; label_pl: string }; result: InsightQueryResult }[] | null
  >(null);

  const submit = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insight/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, dimension }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResults(data.results);
    } catch {
      setError("Nie udało się połączyć z Insight Base.");
    } finally {
      setLoading(false);
    }
  }, [topic, dimension]);

  return (
    <div className="flex flex-col gap-4">
      <div className="pdm-panel p-5">
        <div className="pdm-kicker">Jedno pytanie, odpowiedzi dla każdej grupy w wymiarze</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value as GroupDimension)}
            className="pdm-searchbar rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200"
          >
            {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Temat, np. stosunek do nowego projektu politycznego…"
            className="pdm-searchbar rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500"
          />
          <button
            onClick={submit}
            disabled={loading || !topic.trim()}
            className="pdm-btn-primary rounded-lg px-5 py-2.5 text-sm font-bold text-white"
          >
            {loading ? "Pytam…" : "Porównaj"}
          </button>
        </div>
      </div>
      {error && <EmptyNote>{error}</EmptyNote>}
      {results && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {results.map((r, i) => (
            <div key={i} className="pdm-panel p-4">
              <div className="mb-2 text-[12px] font-black uppercase tracking-wide text-white">{r.group.label_pl}</div>
              <QueryResultView result={r.result} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupProfileTab() {
  const { groups } = useGroups();
  const [groupValue, setGroupValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<GroupProfile | null>(null);

  const submit = useCallback(async () => {
    if (!groupValue) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/insight/profile?group=${encodeURIComponent(groupValue)}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setProfile(data);
    } catch {
      setError("Nie udało się połączyć z Insight Base.");
    } finally {
      setLoading(false);
    }
  }, [groupValue]);

  return (
    <div className="flex flex-col gap-4">
      <div className="pdm-panel p-5">
        <div className="pdm-kicker">Charakterystyka grupy</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <GroupPicker groups={groups} value={groupValue} onChange={setGroupValue} />
          <button
            onClick={submit}
            disabled={loading || !groupValue}
            className="pdm-btn-primary rounded-lg px-5 py-2.5 text-sm font-bold text-white"
          >
            {loading ? "Wczytuję…" : "Pokaż charakterystykę"}
          </button>
        </div>
      </div>
      {error && <EmptyNote>{error}</EmptyNote>}
      {profile && (
        <div className="flex flex-col gap-4">
          <div className="pdm-panel p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {DIMENSION_LABELS[profile.group.dimension] ?? profile.group.dimension}
            </div>
            <div className="text-xl font-black text-white">{profile.group.label_pl}</div>
          </div>

          {profile.syntheses.length === 0 && profile.findings.length === 0 && (
            <EmptyNote>
              Brak jeszcze zebranych danych dla tej grupy. To normalne dla świeżo działającej bazy, uzupełni się z
              kolejnymi nocnymi uruchomieniami.
            </EmptyNote>
          )}

          {profile.syntheses.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-violet-300/70">
                Syntezy między badaniami
              </div>
              {profile.syntheses.map((s, i) => (
                <div key={i} className="pdm-panel p-4">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-300/80">
                    {s.topic}
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-slate-200">{s.synthesis_text}</p>
                  {s.divergence_note && (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-amber-300/90">{s.divergence_note}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {(() => {
            const values = profile.findings.filter((f) => f.category === "wartosci_i_styl_zycia");
            const political = profile.findings.filter((f) => f.category === "polityka");
            const renderFinding = (f: GroupProfileFinding, i: number) => (
              <div key={i} className="pdm-panel p-4">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-sky-300/80">{f.topic}</span>
                  <ConfidenceBadge confidence={f.confidence} />
                </div>
                {(f.value !== null || f.value_text) && (
                  <div className="text-lg font-black text-white">{f.value !== null ? f.value : f.value_text}</div>
                )}
                {f.verbatim_quote && (
                  <p className="mt-1 text-[13px] italic leading-relaxed text-slate-300">„{f.verbatim_quote}”</p>
                )}
                {f.insight_studies && (
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <a
                      href={f.insight_studies.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sky-400/80 hover:text-sky-300"
                    >
                      {f.insight_studies.title}
                    </a>
                    {f.insight_studies.published_date && (
                      <span className="shrink-0">
                        {new Date(f.insight_studies.published_date).toLocaleDateString("pl-PL")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
            return (
              <>
                {values.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-300/70">
                      Wartości, postawy i styl życia
                    </div>
                    {values.map(renderFinding)}
                  </div>
                )}
                {political.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-sky-300/70">
                      Zaufanie i poglądy polityczne
                    </div>
                    {political.map(renderFinding)}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default function InsightBasePage() {
  const [tab, setTab] = useState<TabKey>("grupy");

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#05060f] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(0.6px_0.6px_at_20px_30px,#fff,transparent),radial-gradient(0.6px_0.6px_at_140px_80px,#fff,transparent),radial-gradient(0.6px_0.6px_at_90px_180px,#fff,transparent)] [background-size:340px_340px]" />
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(1.4px_1.4px_at_60px_120px,#fff,transparent),radial-gradient(1.3px_1.3px_at_200px_40px,#fff,transparent),radial-gradient(1.5px_1.5px_at_320px_200px,#fff,transparent)] [background-size:460px_460px]" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-white">
          <ArrowLeft size={14} />
          Wróć do ekosystemu
        </Link>

        <div className="pdm-kicker">Warstwa danych · nie planeta, stały punkt obserwacji</div>
        <h1 className="pdm-hero-title text-4xl sm:text-5xl">Insight Base</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-400">
          Zagregowana wiedza o poglądach, reakcjach i zachowaniach polskich grup społecznych, budowana z realnych
          badań, sondaży i danych behawioralnych. Aktualizowana automatycznie co noc.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                "pdm-pill flex items-center gap-2 border px-4 py-2 text-[13px] font-semibold",
                tab === key
                  ? "pdm-pill-active border-sky-400/50 bg-sky-400/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-400",
              ].join(" ")}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "grupy" && <GroupsTab />}
          {tab === "zapytaj" && <AskGroupTab />}
          {tab === "porownaj" && <CompareGroupsTab />}
          {tab === "charakterystyka" && <GroupProfileTab />}
        </div>
      </div>
    </div>
  );
}
