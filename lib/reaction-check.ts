// ── Wspólne fundamenty dla "Reakcja na przekaz/fakt" i "Reakcja na
// zdjęcie/mem" (app/api/reaction-check, app/api/image-reaction-check) ──
// To NIE jest silnik AI — w przeciwieństwie do symulatorów (reaction-lab,
// image-lab), moduły "Reakcja na..." nie zgadują, tylko sprawdzają, co
// realnie znalazł silnik wyszukiwania (buildFeed w app/api/news/route.ts).
// buildRealVerdict() jest w całości deterministyczne — żadnego wywołania
// LLM — zgodnie z zasadą projektu "fakt oddzielony od hipotezy": to, co
// tu wraca, to policzone liczby z realnych wyników, nie interpretacja AI.

import type { FeedResult } from "@/app/api/news/route";
import type { InputMode, SimulationInput } from "@/lib/reaction-simulator/types";

export function emptyFeed(query: string, period: string): FeedResult {
  return {
    articles: [], total: 0, totalAvailable: 0, bySource: {}, bySourceWeighted: {}, totalWeightedReach: 0,
    sentimentCounts: { positive: 0, negative: 0, neutral: 0 }, entities: [], narratives: [], timeline: [],
    crossPlatformSignals: [],
    query, period, searchMode: "rss_filtered", searchInfo: null, rssNote: null, fetchedAt: new Date().toISOString(),
  };
}

// Trybu "wydarzenie_planowane" celowo tu nie ma — patrz app/reaction-check
// (ten moduł sprawdza, co JUŻ się wydarzyło; zdarzenie przyszłe należy do
// Symulatora, nie do sprawdzania realnej reakcji).
const MODE_LABELS: Record<InputMode, string> = {
  wypowiedz: "wypowiedź",
  watek: "wątek wypowiedzi",
  wydarzenie_planowane: "planowane zdarzenie",
  wydarzenie_zaistniale: "zaistniałe zdarzenie",
};

// Łączy wszystkie pola tekstowe SimulationInput w jeden blok — więcej
// kontekstu dla ekstrakcji fraz (lib/extract-phrases.ts) niż sam cytat,
// zgodnie z zasadą "głębia przez jakość zapytań, nie przez wolumen".
export function buildCheckText(input: SimulationInput): string {
  const parts = [
    input.text,
    ...(input.threadItems ?? []),
    input.eventStakeholders,
    input.priorReaction,
    input.analysisGoal,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  return parts.join("\n");
}

export function modeLabel(mode: InputMode): string {
  return MODE_LABELS[mode] ?? mode;
}

export interface RealVerdict {
  totalFound: number;
  totalAvailable: number;
  totalWeightedReach: number;
  dominantSentiment: "positive" | "negative" | "neutral" | null;
  dominantSentimentPct: number;
  topNarrative: string | null;
  topSource: string | null;
  crossPlatformCount: number;
  hasSignal: boolean;
  note: string;
}

export function buildRealVerdict(feed: FeedResult, query: string): RealVerdict {
  const { positive, negative, neutral } = feed.sentimentCounts;
  const total = positive + negative + neutral;

  let dominantSentiment: RealVerdict["dominantSentiment"] = null;
  let dominantSentimentPct = 0;
  if (total > 0) {
    const max = Math.max(positive, negative, neutral);
    dominantSentiment = max === positive ? "positive" : max === negative ? "negative" : "neutral";
    dominantSentimentPct = Math.round((max / total) * 100);
  }

  const topNarrative = feed.narratives[0]?.label ?? null;

  const sourceMap = Object.keys(feed.bySourceWeighted ?? {}).length > 0 ? feed.bySourceWeighted! : feed.bySource;
  const topSource = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const crossPlatformCount = feed.crossPlatformSignals?.length ?? 0;
  const hasSignal = feed.total > 0;

  const note = !query.trim()
    ? "Brak fraz do wyszukania."
    : !hasSignal
      ? `Dla fraz „${query}" nie znaleziono żadnych materiałów w przeszukanym oknie czasowym. To może oznaczać, że temat nie przebił się jeszcze do mediów i sieci, że frazy są zbyt wąskie, albo że wydarzenie jest zbyt świeże, żeby zdążyło zostać zaindeksowane.`
      : `Znaleziono ${feed.total} materiałów (z ${feed.totalAvailable} dostępnych) dla fraz „${query}".`;

  return {
    totalFound: feed.total,
    totalAvailable: feed.totalAvailable,
    totalWeightedReach: feed.totalWeightedReach ?? 0,
    dominantSentiment,
    dominantSentimentPct,
    topNarrative,
    topSource,
    crossPlatformCount,
    hasSignal,
    note,
  };
}
