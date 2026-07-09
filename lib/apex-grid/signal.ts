// ── Warstwa 1: Sygnał (Narrative Scope) ────────────────────────────────
// Reużywa istniejący silnik wyszukiwania (buildFeed z app/api/news/route.ts)
// i istniejącą ekstrakcję fraz (extractPhrasesWithGemini) — ten sam wzorzec
// co lib/consilium/research.ts, ale digest jest bogatszy: oprócz listy
// materiałów podaje rozkład sentymentu i najsilniejsze wątki narracyjne
// z velocity, bo warstwa scenariuszy potrzebuje wiedzieć nie tylko "co
// piszą", ale też "jak szybko to rośnie i w jakim tonie".

import { buildFeed } from "@/app/api/news/route";
import { extractPhrasesWithGemini } from "@/lib/extract-phrases";
import type { ApexInput, SignalContext, SignalNarrative, SignalSource } from "./types";

function buildSearchInputText(input: ApexInput): string {
  return [input.topic, input.context, input.politicalGoal, input.targetAudience]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

// Ostatnia deska ratunku, gdy Gemini nie zwróci fraz (brak klucza albo
// błąd sieci) — identyczna heurystyka jak w lib/consilium/research.ts.
function fallbackQuery(topic: string): string {
  const words = topic
    .replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return words.slice(0, 6).join(" ");
}

export async function gatherSignal(input: ApexInput): Promise<SignalContext> {
  const rawText = buildSearchInputText(input);
  let phrases = await extractPhrasesWithGemini(rawText);
  if (phrases.length === 0) {
    const fb = fallbackQuery(input.topic);
    if (fb) phrases = [fb];
  }
  const query = phrases.join(" ").trim();

  if (!query) {
    return {
      query: "",
      hasRealData: false,
      totalFound: 0,
      sources: [],
      narratives: [],
      sentiment: { positive: 0, negative: 0, neutral: 0 },
      digest:
        "Nie udało się wyodrębnić fraz do wyszukania z podanej sprawy — dalsze warstwy mają jawnie zaznaczyć brak sygnału z monitoringu i opierać się wyłącznie na kontekście podanym ręcznie.",
    };
  }

  const feed = await buildFeed(query, "7d");

  const sources: SignalSource[] = feed.articles.slice(0, 12).map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source,
    publishedAt: a.publishedAt,
  }));

  const narratives: SignalNarrative[] = (feed.narratives ?? []).slice(0, 5).map((n) => ({
    label: n.label,
    count: n.count,
    velocity: n.velocity ?? null,
  }));

  const hasRealData = feed.total > 0;

  return {
    query,
    hasRealData,
    totalFound: feed.total,
    sources,
    narratives,
    sentiment: feed.sentimentCounts,
    digest: buildSignalDigest(query, feed.total, feed.totalAvailable, sources, narratives, feed.sentimentCounts),
  };
}

function buildSignalDigest(
  query: string,
  total: number,
  totalAvailable: number,
  sources: SignalSource[],
  narratives: SignalNarrative[],
  sentiment: { positive: number; negative: number; neutral: number }
): string {
  if (total === 0) {
    return `Monitoring (frazy „${query}"): brak materiałów w mediach i sieci w ostatnich 7 dniach. Temat może być zbyt świeży, zbyt niszowy albo frazy zbyt wąskie — traktuj ciszę jako niepewność, nie jako fakt, że tematu nie ma.`;
  }
  const sentTotal = sentiment.positive + sentiment.negative + sentiment.neutral;
  const lines = [
    `Monitoring (frazy „${query}"): ${total} materiałów (z ${totalAvailable} dostępnych) w ostatnich 7 dniach.`,
    sentTotal > 0
      ? `Sentyment materiałów: ${sentiment.negative} negatywnych, ${sentiment.neutral} neutralnych, ${sentiment.positive} pozytywnych.`
      : null,
    narratives.length > 0
      ? `Najsilniejsze wątki narracyjne: ${narratives
          .map((n) => `${n.label} (${n.count}${typeof n.velocity === "number" ? `, velocity ${n.velocity > 0 ? "+" : ""}${n.velocity}` : ""})`)
          .join("; ")}.`
      : null,
    "Najważniejsze materiały:",
    ...sources.slice(0, 8).map((s) => `- ${s.title} (${s.source}${s.publishedAt ? ", " + s.publishedAt.slice(0, 10) : ""})`),
  ].filter(Boolean);
  return lines.join("\n");
}
