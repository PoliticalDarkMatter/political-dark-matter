"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { ArrowLeft, Search, Users, Layers, Sparkles, MessageCircle, TrendingUp } from "lucide-react";
import AvatarChatTab from "@/components/insight/AvatarChatTab";
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
  type PortretNarracyjny,
  type PersonaPostawa,
  type TimeseriesTopic,
  type TimeseriesPoint,
  type ElectionEvent,
} from "@/lib/insight";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

type TabKey = "grupy" | "awatar" | "zapytaj" | "porownaj" | "charakterystyka" | "trendy";

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "grupy", label: "Grupy", icon: Users },
  { key: "awatar", label: "Rozmowa z grupą", icon: MessageCircle },
  { key: "zapytaj", label: "Zapytaj grupę", icon: Search },
  { key: "porownaj", label: "Porównaj grupy", icon: Layers },
  { key: "charakterystyka", label: "Charakterystyka grupy", icon: Sparkles },
  { key: "trendy", label: "Trendy w czasie", icon: TrendingUp },
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

// Pokrycie danymi awatara grupy wg liczby wyników: zielony=solidny,
// bursztyn=częściowy, czerwony=cienki (mało danych), szary=pusty.
function coverageBadge(n: number): string {
  if (n >= 30) return "bg-emerald-400/10 text-emerald-300";
  if (n >= 10) return "bg-amber-400/10 text-amber-300";
  if (n > 0) return "bg-rose-400/10 text-rose-300";
  return "bg-white/5 text-slate-500";
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
        if (!cancelled) setError("Nie udało się połączyć z bazą e-wyborcy.");
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
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
          <span className="pdm-kicker !mb-0">Pokrycie awatarów</span>
          <span className="text-emerald-300">{groups.filter((g) => g.findings_count >= 30).length} solidnych</span>
          <span className="text-amber-300">{groups.filter((g) => g.findings_count >= 10 && g.findings_count < 30).length} częściowych</span>
          <span className="text-rose-300">{groups.filter((g) => g.findings_count > 0 && g.findings_count < 10).length} cienkich</span>
          <span className="text-slate-500">{groups.filter((g) => g.findings_count === 0).length} pustych</span>
        </div>
        <p className="mt-1 text-[11.5px] text-slate-500">
          Kolor liczby przy każdej grupie to pokrycie danymi jej awatara. Cienkie i puste są priorytetem nocnych
          uzupełnień i sweepu portretów.
        </p>
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
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${coverageBadge(g.findings_count)}`}>
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
        <span className="flex items-center gap-1.5">
          {f.zakres === "ogolnopolski" && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              dane ogólnopolskie
            </span>
          )}
          <ConfidenceBadge confidence={f.confidence} />
        </span>
      </div>
      {(f.value !== null || f.value_text) && (
        <div className="text-lg font-black text-white">
          {f.value !== null ? f.value : f.value_text}
        </div>
      )}
      {f.verbatim_quote && <p className="mt-1 text-[13px] italic leading-relaxed text-slate-300">„{f.verbatim_quote}”</p>}
      {f.comparison_note && <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{f.comparison_note}</p>}
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <a href={f.source_url} target="_blank" rel="noreferrer" className="truncate text-sky-400/80 hover:text-sky-300">
          {f.study_title}
        </a>
        {f.published_date && <span className="shrink-0">{new Date(f.published_date).toLocaleDateString("pl-PL")}</span>}
      </div>
    </div>
  );
}

function OpinionsBlock({ opinions }: { opinions: NonNullable<InsightQueryResult["opinions"]> }) {
  return (
    <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.04] p-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-300/90">
        Trudno powiedzieć na twardych danych — opinie z publicystyki
      </div>
      <div className="flex flex-col gap-1.5">
        {opinions.map((o, i) => (
          <a
            key={i}
            href={o.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-wrap items-baseline gap-x-2 text-[12.5px] leading-snug text-slate-200 hover:text-white"
          >
            <span className="font-semibold text-amber-200/90">{o.source}</span>
            <span className="text-slate-300 group-hover:underline">{o.title}</span>
            {o.date && <span className="text-[10.5px] text-slate-500">({o.date})</span>}
          </a>
        ))}
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-slate-500">
        To głosy z mediów, nie pomiar o tej grupie — traktuj jako sygnał, nie dowód.
      </p>
    </div>
  );
}

function QueryResultView({ result }: { result: InsightQueryResult | null }) {
  if (!result) return null;
  if (result.syntheses.length === 0 && result.raw_findings.length === 0) {
    if (result.opinions && result.opinions.length > 0) {
      return <OpinionsBlock opinions={result.opinions} />;
    }
    return (
      <EmptyNote>
        Brak jeszcze twardych danych dla tego tematu i tej grupy, nie znalazły się też wyraźne głosy w publicystyce.
        Baza uzupełnia się co noc, spróbuj ponownie za kilka dni albo zawęź/rozszerz temat.
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

interface AnalystEvidence {
  nr: number;
  tekst: string;
  zrodlo: string;
  url: string | null;
  data: string | null;
  score: number | null;
  rodzaj: string;
}

interface AnalystAnswer {
  answer: string;
  confidence: "wysoka" | "srednia" | "niska";
  usedEvidence: number[];
  caveats: string | null;
  evidence: AnalystEvidence[];
  coverage: string;
  aiReal: boolean;
}

const ANSWER_CONFIDENCE_COLORS: Record<string, string> = {
  wysoka: "#4ade80",
  srednia: "#fbbf24",
  niska: "#f87171",
};

const RODZAJ_LABELS: Record<string, string> = {
  profil_grupy: "profil grupy",
  dopasowane_do_pytania: "dane o grupie",
  synteza: "synteza",
  kontekst_spoza_grupy: "kontekst ogólnopolski",
  opinia_z_sieci: "opinia z sieci",
};

function AnalystAnswerView({ a }: { a: AnalystAnswer }) {
  const color = ANSWER_CONFIDENCE_COLORS[a.confidence] ?? "#94a3b8";
  const used = new Set(a.usedEvidence);
  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="pdm-panel border-sky-400/20 p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="pdm-kicker">Analiza na dowodach z bazy</div>
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
            style={{ color, background: color + "1a", border: `1px solid ${color}55` }}
          >
            pewność: {a.confidence}
          </span>
        </div>
        <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-100">{a.answer}</p>
        {a.caveats && (
          <p className="mt-3 text-[12.5px] leading-relaxed text-amber-300/90">Zastrzeżenia: {a.caveats}</p>
        )}
      </div>
      {a.evidence.length > 0 && (
        <details className="pdm-panel p-4">
          <summary className="cursor-pointer text-[12px] font-bold uppercase tracking-wide text-slate-400">
            Dowody ({a.evidence.length}, użyte w odpowiedzi: {a.usedEvidence.length})
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {a.evidence.map((e) => (
              <div
                key={e.nr}
                className={[
                  "rounded-lg border p-3",
                  used.has(e.nr) ? "border-sky-400/30 bg-sky-400/5" : "border-white/5 bg-white/[0.02]",
                ].join(" ")}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[10.5px]">
                  <span className="font-black text-slate-400">[{e.nr}]</span>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 font-bold",
                      e.rodzaj === "kontekst_spoza_grupy"
                        ? "border border-amber-400/30 bg-amber-400/10 text-amber-300"
                        : "bg-white/5 text-slate-400",
                    ].join(" ")}
                  >
                    {RODZAJ_LABELS[e.rodzaj] ?? e.rodzaj}
                  </span>
                  {e.data && <span className="text-slate-500">{new Date(e.data).toLocaleDateString("pl-PL")}</span>}
                </div>
                <p className="text-[12.5px] leading-relaxed text-slate-300">{e.tekst}</p>
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[11px] text-sky-400/80 hover:text-sky-300">
                    {e.zrodlo}
                  </a>
                ) : (
                  <div className="mt-1 truncate text-[11px] text-slate-500">{e.zrodlo}</div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function AskGroupTab() {
  const { groups } = useGroups();
  const [groupValue, setGroupValue] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightQueryResult | null>(null);
  const [answer, setAnswer] = useState<AnalystAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!topic.trim() || !groupValue) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswer(null);
    try {
      if (groupValue === ALL_POPULATION_VALUE) {
        // Cała populacja nie ma persony - klasyczne przeszukanie bazy.
        const res = await fetch("/api/insight/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, groupValues: [] }),
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else setResult(data);
      } else {
        // Tryb analityczny: LLM kojarzy dowody o grupie z kontekstem
        // ogólnopolskim (te same zasady dowodowe co awatar w "Rozmowie z grupą").
        const res = await fetch("/api/insight/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group: groupValue, question: topic }),
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else setAnswer(data);
      }
    } catch {
      setError("Nie udało się połączyć z bazą e-wyborcy.");
    } finally {
      setLoading(false);
    }
  }, [topic, groupValue]);

  return (
    <div className="flex flex-col gap-4">
      <div className="pdm-panel p-5">
        <div className="pdm-kicker">Pytanie do jednej grupy · analiza sztabowa na dowodach</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <GroupPicker groups={groups} value={groupValue} onChange={setGroupValue} />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Pytanie, np. czy byliby skłonni głosować na nowy projekt polityczny?"
            className="pdm-searchbar rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500"
          />
          <button
            onClick={submit}
            disabled={loading || !topic.trim() || !groupValue}
            className="pdm-btn-primary rounded-lg px-5 py-2.5 text-sm font-bold text-white"
          >
            {loading ? "Analizuję…" : "Zapytaj"}
          </button>
        </div>
      </div>
      {error && <EmptyNote>{error}</EmptyNote>}
      {answer && <AnalystAnswerView a={answer} />}
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
      setError("Nie udało się połączyć z bazą e-wyborcy.");
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

function GroupVsAverageChart({ postawy }: { postawy: PersonaPostawa[] }) {
  // Tylko wskaźniki procentowe (0-100) z policzalną średnią wymiaru;
  // kwoty w zł i inne skale nie mieszają się z procentami na jednym wykresie.
  const rows = postawy
    .filter(
      (p) =>
        p.wartosc !== null &&
        p.srednia_w_wymiarze !== null &&
        p.wartosc >= 0 &&
        p.wartosc <= 100 &&
        p.srednia_w_wymiarze >= 0 &&
        p.srednia_w_wymiarze <= 100
    )
    .map((p) => ({
      temat: p.temat.replace(/_/g, " "),
      grupa: p.wartosc as number,
      srednia: p.srednia_w_wymiarze as number,
      roznica: Math.abs((p.wartosc as number) - (p.srednia_w_wymiarze as number)),
    }))
    .sort((a, b) => b.roznica - a.roznica)
    .slice(0, 14);
  if (rows.length < 2) return null;
  return (
    <div className="pdm-panel p-4">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-sky-300/70">
        Co najbardziej odróżnia tę grupę (vs średnia grup tego samego wymiaru, %)
      </div>
      <div className="mb-2 text-[11px] text-slate-500">
        Posortowane po wielkości różnicy - to są wskaźniki, w których grupa najmocniej odstaje.
      </div>
      <ResponsiveContainer width="100%" height={rows.length * 36 + 70}>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barGap={2}>
          <CartesianGrid horizontal={false} stroke="#ffffff14" />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis type="category" dataKey="temat" width={220} tick={{ fill: "#cbd5e1", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#0b1120", border: "1px solid #ffffff22", fontSize: 12 }}
            labelStyle={{ color: "#e2e8f0" }}
            cursor={{ fill: "#ffffff0a" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="grupa" name="ta grupa" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={10} />
          <Bar dataKey="srednia" name="średnia wymiaru" fill="#64748b" radius={[0, 4, 4, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
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
      setError("Nie udało się połączyć z bazą e-wyborcy.");
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

          {profile.portret && (
            <div className="pdm-panel border-sky-400/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="pdm-kicker">Portret grupy · synteza z dowodów</div>
                {profile.data_coverage && (
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                    pokrycie danymi: {profile.data_coverage}
                  </span>
                )}
              </div>
              {profile.portret.naglowek && (
                <p className="mt-2 text-[16px] font-semibold leading-relaxed text-white">{profile.portret.naglowek}</p>
              )}
              <div className="mt-4 flex flex-col gap-4">
                {(profile.portret.sekcje ?? []).map((sek, i) => (
                  <div key={i}>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-sky-300/80">{sek.tytul}</div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-slate-200">{sek.tekst}</p>
                    {sek.zastrzezenie && (
                      <p className="mt-1 text-[12px] text-amber-300/80">Zastrzeżenie: {sek.zastrzezenie}</p>
                    )}
                  </div>
                ))}
              </div>
              {(profile.portret.hipotezy_strategiczne ?? []).length > 0 && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-amber-300/80">
                    Hipotezy strategiczne (interpretacja analityka, nie twardy fakt)
                  </div>
                  {(profile.portret.hipotezy_strategiczne ?? []).map((h, i) => (
                    <p key={i} className="mt-2 text-[13px] leading-relaxed text-amber-100/90">{h.teza}</p>
                  ))}
                </div>
              )}
              {(profile.portret.luki_w_danych ?? []).length > 0 && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Czego jeszcze nie wiemy - baza łata te luki w kolejnych nocach
                  </div>
                  <ul className="mt-2 flex flex-col gap-1">
                    {(profile.portret.luki_w_danych ?? []).map((l, i) => (
                      <li key={i} className="text-[12.5px] text-slate-400">• {l}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {!profile.portret && profile.findings.length > 0 && (
            <EmptyNote>
              Portret narracyjny tej grupy powstanie przy najbliższej nocnej przebudowie bazy - poniżej dane źródłowe.
            </EmptyNote>
          )}

          {profile.postawy.length > 0 && <GroupVsAverageChart postawy={profile.postawy} />}

          {profile.syntheses.length === 0 && profile.findings.length === 0 && (
            <EmptyNote>
              Brak jeszcze zebranych danych dla tej grupy. To normalne dla świeżo działającej bazy, uzupełni się z
              kolejnymi nocnymi uruchomieniami.
            </EmptyNote>
          )}

          <details open={!profile.portret} className="flex flex-col gap-4">
            <summary className="cursor-pointer text-[12px] font-bold uppercase tracking-wide text-slate-400">
              Wszystkie pomiary źródłowe ({profile.findings.length})
            </summary>
            <div className="mt-3 flex flex-col gap-4">
          {(() => {
            // Kolejność świadoma, nie alfabetyczna: twarde dane demograficzno-
            // -materialne (fakty GUS o dochodach, ubóstwie, bezrobociu,
            // cyfryzacji) idą PIERWSZE, przed opiniami i sondażami - Jan
            // wprost zażądał (2026-07-08), żeby charakterystyka grupy zaczynała
            // się od materialnej rzeczywistości, nie od tego, na kogo grupa
            // głosuje. Polityka celowo na końcu, bo to kategoria, która i tak
            // dotąd dominowała liczebnie.
            const demografia = profile.findings.filter((f) => f.category === "demografia_i_sytuacja_materialna");
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
                {demografia.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-amber-300/70">
                      Demografia i sytuacja materialna
                    </div>
                    {demografia.map(renderFinding)}
                  </div>
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
          </details>
        </div>
      )}
    </div>
  );
}

function AvatarTabWithGroups() {
  const { groups } = useGroups();
  return <AvatarChatTab groups={groups} />;
}

const TREND_COLORS = ["#38bdf8", "#f472b6", "#a3e635", "#fbbf24", "#c084fc", "#34d399"];

function humanizeTopic(topic: string): string {
  return topic.replace(/_/g, " ").replace(/\b\w/, (c) => c.toUpperCase());
}

function TrendyTab() {
  const { groups } = useGroups();
  const [topics, setTopics] = useState<TimeseriesTopic[] | null>(null);
  const [events, setEvents] = useState<ElectionEvent[]>([]);
  const [topic, setTopic] = useState<string>("");
  const [groupId, setGroupId] = useState<string>(""); // "" = dane ogólnopolskie
  const [points, setPoints] = useState<TimeseriesPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/insight/timeseries")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) {
          setError(d.error);
          return;
        }
        setTopics(d.topics ?? []);
        setEvents(d.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Nie udało się pobrać listy trendów.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!topic) {
      setPoints(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ topic });
    if (groupId) qs.set("group", groupId);
    fetch(`/api/insight/timeseries?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setPoints(d.points ?? []);
        if (d.events) setEvents(d.events);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topic, groupId]);

  const cityGroups = useMemo(
    () => (groups ?? []).filter((g) => g.dimension === "jednostka_terytorialna"),
    [groups]
  );

  const { data, questions, hasWarning, sources } = useMemo(() => {
    const pts = points ?? [];
    const questions = Array.from(new Set(pts.map((p) => p.question_text || topic)));
    const byTs = new Map<number, Record<string, number | null>>();
    for (const p of pts) {
      const ts = new Date(p.punkt_czasu).getTime();
      const row = byTs.get(ts) ?? { t: ts };
      row[p.question_text || topic] = p.value;
      byTs.set(ts, row);
    }
    const data = Array.from(byTs.values()).sort((a, b) => (a.t as number) - (b.t as number));
    const hasWarning = pts.some((p) => p.ostrzezenie);
    const sources = Array.from(new Set(pts.map((p) => p.source_name).filter(Boolean))) as string[];
    return { data, questions, hasWarning, sources };
  }, [points, topic]);

  const domain = useMemo<[number, number] | null>(() => {
    if (!data.length) return null;
    return [data[0].t as number, data[data.length - 1].t as number];
  }, [data]);

  const fmtDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const short = (s: string) => (s.length > 44 ? s.slice(0, 42) + "…" : s);

  const eventsInRange = useMemo(() => {
    if (!domain) return [];
    return events.filter((e) => {
      const ts = new Date(e.event_date).getTime();
      return ts >= domain[0] && ts <= domain[1];
    });
  }, [events, domain]);

  return (
    <div>
      <p className="mb-4 max-w-2xl text-[13px] leading-relaxed text-slate-400">
        Zmiana wskaźnika w czasie, ustawiona po dacie realizacji terenu (nie publikacji). Wybierz
        temat i opcjonalnie miasto, by zobaczyć trend lokalny. Pionowe linie to daty wyborów.
      </p>

      {error && <EmptyNote>{error}</EmptyNote>}

      <div className="mb-5 flex flex-wrap gap-3">
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full sm:w-auto sm:min-w-[260px] rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none"
        >
          <option value="">— wybierz temat (szereg czasowy) —</option>
          {(topics ?? []).map((t) => (
            <option key={t.topic} value={t.topic}>
              {humanizeTopic(t.topic)} ({t.liczba_dat} dat{t.ostrzezenie ? " ⚠" : ""})
            </option>
          ))}
        </select>

        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="w-full sm:w-auto sm:min-w-[200px] rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none"
        >
          <option value="">Dane ogólnopolskie</option>
          {cityGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label_pl}
            </option>
          ))}
        </select>
      </div>

      {hasWarning && (
        <div className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200">
          Uwaga: w tej serii mieszają się różne pracownie lub techniki badania. Trend traktuj
          ostrożnie, punkty nie są w pełni porównywalne.
        </div>
      )}

      {loading && <EmptyNote>Ładowanie serii…</EmptyNote>}

      {!loading && topic && data.length < 2 && (
        <EmptyNote>Za mało punktów dla tej kombinacji tematu i grupy, by narysować trend.</EmptyNote>
      )}

      {!loading && data.length >= 2 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data} margin={{ left: 4, right: 24, top: 8, bottom: 4 }}>
              <CartesianGrid stroke="#ffffff12" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v: number) => fmtDate(Number(v))}
                stroke="#94a3b8"
                fontSize={11}
              />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                labelFormatter={(v: number) => fmtDate(Number(v))}
                contentStyle={{
                  background: "#0b1020",
                  border: "1px solid #ffffff22",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {questions.length > 1 && <Legend formatter={(v: string | number) => short(String(v))} wrapperStyle={{ fontSize: 11 }} />}
              {eventsInRange.map((e) => (
                <ReferenceLine
                  key={e.event_name}
                  x={new Date(e.event_date).getTime()}
                  stroke="#f8717188"
                  strokeDasharray="4 3"
                  label={{ value: short(e.event_name), position: "top", fill: "#f87171", fontSize: 9 }}
                />
              ))}
              {questions.map((q, i) => (
                <Line
                  key={q}
                  type="monotone"
                  dataKey={q}
                  stroke={TREND_COLORS[i % TREND_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {sources.length > 0 && (
            <div className="mt-3 text-[11px] text-slate-500">
              Źródła: {sources.join(", ")}
            </div>
          )}
        </div>
      )}

      {!topic && !error && (topics?.length ?? 0) === 0 && (
        <EmptyNote>Brak gotowych szeregów czasowych w bazie.</EmptyNote>
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
<PageHeader title="e-wyborcy" subtitle="Opinie społeczne i awatary grup. Zagregowana wiedza o poglądach polskich grup społecznych z realnych badań i sondaży, aktualizowana automatycznie co noc." comet="ewyborcy" />

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
          {tab === "awatar" && <AvatarTabWithGroups />}
          {tab === "zapytaj" && <AskGroupTab />}
          {tab === "porownaj" && <CompareGroupsTab />}
          {tab === "charakterystyka" && <GroupProfileTab />}
          {tab === "trendy" && <TrendyTab />}
        </div>
      </div>
    </div>
  );
}
