// ── Warstwa researchu e-Konsylium ────────────────────────────────────────
// Zgodnie z instrukcją: reużywamy istniejący silnik wyszukiwania
// (buildFeed z app/api/news/route.ts) i istniejącą ekstrakcję fraz
// (extractPhrasesWithGemini z lib/extract-phrases.ts) zamiast budować
// równoległy mechanizm researchu. To jest DOKŁADNIE ten sam wzorzec co
// w lib/reaction-check.ts — różnica jest tylko w tym, co robimy z wynikiem:
// tam liczymy deterministyczny werdykt, tu składamy zwięzły "digest"
// tekstowy do wstrzyknięcia w prompty ekspertów i syntezy.

import { buildFeed } from "@/app/api/news/route";
import { extractPhrasesWithGemini } from "@/lib/extract-phrases";
import type { ConsiliumInput, ResearchContext, ResearchSource } from "./types";

// e-Konsylium pracuje na dowolnym temacie/pytaniu/dylemacie, nie na gotowym
// cytacie — więc zanim wyciągniemy frazy, łączymy pola wejścia w jeden
// tekst dający ekstrakcji jak najwięcej kontekstu.
function buildResearchInputText(input: ConsiliumInput): string {
  return [input.topic, input.context, input.politicalGoal, input.targetAudience]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

// Ostatnia deska ratunku, gdy Gemini nie zwróci fraz (brak klucza albo
// błąd sieci): bierzemy pierwsze kilka "sensownych" słów z tematu, żeby
// buildFeed miał czym szukać zamiast dostać pusty string.
function fallbackQuery(topic: string): string {
  const words = topic
    .replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return words.slice(0, 6).join(" ");
}

export async function gatherResearchContext(input: ConsiliumInput): Promise<ResearchContext> {
  const rawText = buildResearchInputText(input);
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
      sources: [],
      digest: "Nie udało się wyodrębnić fraz do wyszukania z podanego tematu — synteza i eksperci powinni jawnie zaznaczyć brak researchu i opierać się wyłącznie na wiedzy ogólnej oraz informacjach podanych przez użytkownika.",
      totalFound: 0,
    };
  }

  const feed = await buildFeed(query, "7d");

  const sources: ResearchSource[] = feed.articles.slice(0, 12).map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source,
    publishedAt: a.publishedAt,
  }));

  const hasRealData = feed.total > 0;

  const digest = buildDigest(query, feed.total, feed.totalAvailable, sources, feed.narratives?.[0]?.label ?? null);

  return {
    query,
    hasRealData,
    sources,
    digest,
    totalFound: feed.total,
  };
}

function buildDigest(
  query: string,
  total: number,
  totalAvailable: number,
  sources: ResearchSource[],
  topNarrative: string | null
): string {
  if (total === 0) {
    return `Wyszukano frazy „${query}", ale nie znaleziono żadnych materiałów w mediach i sieci w ostatnich 7 dniach. Temat może być zbyt świeży, zbyt niszowy albo frazy zbyt wąskie — eksperci powinni to jawnie zaznaczyć, a nie zakładać ciszy medialnej jako faktu.`;
  }
  const lines = [
    `Wyszukano frazy „${query}" — znaleziono ${total} materiałów (z ${totalAvailable} dostępnych) w ostatnich 7 dniach.`,
    topNarrative ? `Dominujący wątek narracyjny: ${topNarrative}.` : null,
    "Najważniejsze znalezione materiały:",
    ...sources.slice(0, 8).map((s) => `- ${s.title} (${s.source}${s.publishedAt ? ", " + s.publishedAt.slice(0, 10) : ""})`),
  ].filter(Boolean);
  return lines.join("\n");
}
