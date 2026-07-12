import type { Article } from "@/app/api/news/route";
import { parseRSS } from "@/lib/rss";

// ── Insight Base: warstwa opinii ──────────────────────────────────────────
// Gdy o grupie brak twardych danych (findings/syntez otagowanych grupą), a
// pytanie i tak wymaga odpowiedzi, sięgamy po REALNĄ publicystykę zamiast
// zmyślać. Źródło: Google News RSS (fallback Bing) — bez klucza API. Wynik
// ważymy autorytetem domeny (Tranco + wyjątki redakcyjne, patrz
// lib/domain-authority.ts) i zwracamy TYLKO znaczące, rozpoznane redakcje,
// nie anonimowy szum. Każdy element niesie tytuł, nazwę źródła, link i datę —
// model może je przytoczyć JAKO OPINIE (jawnie oznaczone, ostrożne), ale nie
// wolno mu wymyślać nazwisk, cytatów ani tez, których nie ma w tych danych.

export interface OpinionItem {
  title: string;
  source: string;
  url: string;
  date: string | null;
  weight: number; // 0..1, autorytet domeny — im wyżej, tym bardziej "znaczące" źródło
}

async function fetchNews(query: string): Promise<Article[]> {
  const googleUrls = [
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pl&gl=PL&ceid=PL:pl`,
  ];
  for (const url of googleUrls) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NarrativeScope/1.0; +https://narrativescope.com)",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
          "Accept-Language": "pl-PL,pl;q=0.9",
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const articles = parseRSS(await res.text(), "Google News", 60);
      if (articles.length > 0) return articles;
    } catch {
      continue;
    }
  }
  // Fallback: Bing News RSS
  try {
    const bingUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=RSS&mkt=pl-PL`;
    const res = await fetch(bingUrl, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NarrativeScope/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const articles = parseRSS(await res.text(), "Bing News", 40);
      if (articles.length > 0) return articles;
    }
  } catch {
    /* ignore */
  }
  return [];
}

// Zwraca do `max` najbardziej autorytatywnych, unikalnych artykułów pod dane
// zapytanie. Nigdy nie rzuca — w razie problemu zwraca pustą listę (warstwa
// opinii jest opcjonalna, nie może wywrócić odpowiedzi).
export async function fetchOpinions(query: string, max = 4): Promise<OpinionItem[]> {
  let articles: Article[] = [];
  try {
    articles = await fetchNews(query);
  } catch {
    return [];
  }
  const seen = new Set<string>();
  return articles
    // tylko rozpoznane, rankowane domeny — to filtruje "znaczące" redakcje
    // od anonimowych agregatorów i contentowego szumu.
    .filter((a) => a.weightBasis === "tranco" || a.weightBasis === "editorial_override")
    .filter((a) => {
      const key = (a.url || "").split("?")[0];
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, max)
    .map((a) => ({
      title: a.title,
      source: a.source,
      url: a.url,
      date: a.publishedAt ? a.publishedAt.slice(0, 10) : null,
      weight: a.weight ?? 0,
    }));
}
