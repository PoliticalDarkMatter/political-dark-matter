import type { Article, EntityInfo, FeedData, NarrativeCluster, Sent } from "./dashboard-types";

// ── Warstwa analityczna briefingu dashboardu ──────────────────────────
// Celowo deterministyczna, bez wywołań AI: syntetyzuje to, co silnik
// już policzył (sentymenty, narracje, aktorzy, oś czasu), w czytelną
// całość — "fakty przed intuicją", zgodnie z zasadą projektu. Jeśli
// kiedyś ma to być bryfing pisany przez LLM, to jest dokładnie miejsce,
// gdzie podłączyć taki krok — ale wersja deterministyczna jest szybsza,
// darmowa i łatwiejsza do zweryfikowania niż halucynująca synteza.

const SENT_LABEL_PL: Record<Sent, string> = { positive: "pozytywny", negative: "negatywny", neutral: "neutralny" };

export function dominantSentiment(counts: { positive: number; negative: number; neutral: number }): { sentiment: Sent; pct: number; total: number } {
  const total = counts.positive + counts.negative + counts.neutral;
  if (total === 0) return { sentiment: "neutral", pct: 0, total: 0 };
  const entries: Array<[Sent, number]> = [["positive", counts.positive], ["negative", counts.negative], ["neutral", counts.neutral]];
  const [sentiment, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return { sentiment, pct: Math.round((count / total) * 100), total };
}

export function buildBriefingSummary(data: FeedData): string {
  if (!data.articles || data.articles.length === 0) {
    return "Brak materiałów dla wybranych kryteriów — rozszerz zakres czasu albo zapytanie.";
  }

  const { sentiment, pct } = dominantSentiment(data.sentimentCounts);
  const topNarrative = data.narratives && data.narratives.length > 0 ? data.narratives[0] : null;
  const topEntity = data.entities && data.entities.length > 0 ? data.entities[0] : null;

  const parts: string[] = [];
  parts.push(`Zebrano ${data.total} materiałów${data.totalWeightedReach ? ` (ważony zasięg: ${data.totalWeightedReach})` : ""}, sentyment przeważa ${SENT_LABEL_PL[sentiment]} (${pct}%).`);

  if (topNarrative) {
    const velocityNote = topNarrative.velocity != null && topNarrative.velocity !== 0
      ? topNarrative.velocity > 0 ? `, przyspiesza (+${topNarrative.velocity}%)` : `, wygasa (${topNarrative.velocity}%)`
      : "";
    parts.push(`Najsilniejsza narracja: „${topNarrative.label}" (${topNarrative.percentage}% materiałów${velocityNote}).`);
  }

  if (topEntity) {
    const velocityNote = topEntity.velocity != null && topEntity.velocity !== 0
      ? topEntity.velocity > 0 ? `, rosnąca aktywność (+${topEntity.velocity}%)` : `, aktywność spada (${topEntity.velocity}%)`
      : "";
    parts.push(`Najaktywniejszy aktor: ${topEntity.name} (${topEntity.count}× wzmianek, sentyment ${SENT_LABEL_PL[topEntity.dominantSentiment]}${velocityNote}).`);
  }

  return parts.join(" ");
}

// ── Momentum: co w danych aktorach/narracjach realnie przyspiesza ────
// Osobna warstwa od "co jest największe" (to już pokazują listy count-owe) —
// tu chodzi o kierunek zmiany, żeby wychwycić rosnący temat, zanim
// stanie się największym.
export interface MomentumItem {
  label: string;
  type: "narracja" | "aktor";
  velocity: number;
  count: number;
  dominantSentiment: Sent;
}

export function computeMomentum(entities: EntityInfo[], narratives: NarrativeCluster[], limit = 5): MomentumItem[] {
  const items: MomentumItem[] = [];
  for (const n of narratives || []) {
    if (n.velocity != null && n.velocity !== 0) {
      items.push({ label: n.label, type: "narracja", velocity: n.velocity, count: n.count, dominantSentiment: n.dominantSentiment });
    }
  }
  for (const e of entities || []) {
    if (e.velocity != null && e.velocity !== 0) {
      items.push({ label: e.name, type: "aktor", velocity: e.velocity, count: e.count, dominantSentiment: e.dominantSentiment });
    }
  }
  return items.sort((a, b) => Math.abs(b.velocity) - Math.abs(a.velocity)).slice(0, limit);
}

// ── Sentyment w czasie — bucketing IDENTYCZNY z buildTimeline() po
// stronie /api/news (klucz "HH:00"), żeby oś X obu wykresów się zgadzała.
// Liczone client-side z data.articles, bo /api/news i tak zwraca pełny,
// przefiltrowany zbiór (nie próbkę) — patrz komentarz w route.ts.
export interface SentimentTimelinePoint { hour: string; positive: number; negative: number; neutral: number; total: number }

export function computeSentimentTimeline(articles: Article[]): SentimentTimelinePoint[] {
  const map = new Map<string, { positive: number; negative: number; neutral: number }>();
  for (const a of articles) {
    const d = new Date(a.publishedAt);
    const key = `${String(d.getHours()).padStart(2, "0")}:00`;
    const bucket = map.get(key) ?? { positive: 0, negative: 0, neutral: 0 };
    bucket[a.sentiment] += 1;
    map.set(key, bucket);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([hour, b]) => ({ hour, ...b, total: b.positive + b.negative + b.neutral }));
}

// ── Cross-reference aktor × narracja ──────────────────────────────────
// narrative.topArticles trzyma tylko czołowe ~8 artykułów danej narracji
// (patrz news/route.ts), więc to sygnał częściowy, nie wyczerpująca lista —
// UI powinno to opisać jako "m.in.", nie jako pełną klasyfikację.
export function narrativesForEntity(entityName: string, narratives: NarrativeCluster[]): string[] {
  const needle = entityName.toLowerCase();
  const matches: string[] = [];
  for (const n of narratives || []) {
    const hit = n.topArticles.some((a) => a.title.toLowerCase().includes(needle));
    if (hit) matches.push(n.label);
  }
  return matches;
}
