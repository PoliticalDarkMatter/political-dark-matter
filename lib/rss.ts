import type { Article, WeightBasis } from "@/app/api/news/route";
import { authorityScoreForUrl } from "@/lib/domain-authority";
import { classifySentiment } from "@/lib/sentiment";

// ── Parser RSS + wagowanie po autorytecie domeny ──────────────────────────
// Wydzielone z app/api/news/route.ts, żeby lib/sources/x.ts (Nitter, RSS-owy
// w kształcie) mogło reużyć tego samego parsera bez tworzenia zależności
// cyklicznej wartości: news/route.ts woła fetchX() z lib/sources/x.ts,
// więc x.ts nie może z powrotem importować WARTOŚCI z news/route.ts
// (import type Article/WeightBasis jest bezpieczny, bo znika w kompilacji —
// ale funkcja parseRSS to już realna zależność runtime, stąd przeniesiona
// tutaj, do wspólnego, "liściowego" modułu, z którego korzystają oba).
// Zachowanie identyczne jak wcześniej — czysto mechaniczne przeniesienie.

export function weightForArticleUrl(url: string, sourceName?: string): { weight: number; basis: WeightBasis; explain: string } {
  const res = authorityScoreForUrl(url, sourceName);
  let explain: string;
  if (res.basis === "editorial_override") {
    explain = `Wyjątek redakcyjny: ${res.reason}`;
  } else if (res.basis === "tranco") {
    explain = `Ranga domeny (Tranco): ${res.rank} z dnia ${res.asOf}${res.reason ?? ""}`;
  } else {
    explain = "Domena spoza tabeli rankingowej — wartość neutralna";
  }
  return { weight: res.score, basis: res.basis, explain };
}

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${name}>`, "i"));
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

export function parseRSS(xml: string, defaultSource: string, limit = 15): Article[] {
  const items = xml.match(/<item[\s>]([\s\S]*?)<\/item>/gi) ?? [];
  return items.slice(0, limit).map((item, i) => {
    let title = tag(item, "title");
    const url = tag(item, "link") || tag(item, "guid");
    const pubDate = tag(item, "pubDate");

    // Google News RSS: title zawiera "- Źródło" na końcu
    const srcTag = item.match(/<source[^>]*>([^<]+)<\/source>/i);
    let source = srcTag ? srcTag[1].trim() : defaultSource;

    // Odetnij "- NazwaŹródła" z końca tytułu (Google News)
    if (srcTag) {
      const suffix = new RegExp(`\\s*-\\s*${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
      title = title.replace(suffix, "").trim();
      if (!title) {
        // fallback: odetnij ostatni " - X"
        title = title.replace(/\s*-\s*[^-]+$/, "").trim();
      }
    }

    if (!title || !url) return null;
    const w = weightForArticleUrl(url, source);
    return {
      id: `${defaultSource}-${i}`,
      title,
      url,
      source,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      sentiment: classifySentiment(title),
      weight: w.weight,
      weightBasis: w.basis,
      weightExplain: w.explain,
    } as Article;
  }).filter(Boolean) as Article[];
}
