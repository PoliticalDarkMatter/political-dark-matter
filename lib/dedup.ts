import type { Article } from "@/app/api/news/route";

// ── Deduplikacja przedruków ────────────────────────────────────────────
// Ta sama depesza PAP trafia do PAP-Kraj, TVN24, WP, Interii i Gazeta.pl
// niemal słowo w słowo tego samego dnia — bez deduplikacji sztucznie
// mnoży to "wagę" narracji pięciokrotnie, choć to jeden fakt, nie pięć
// niezależnych sygnałów. Fingerprint po znormalizowanym tytule (nie treści —
// treść nie zawsze jest pobrana), zachowujemy egzemplarz o najwyższej wadze
// (czyli z najbardziej autorytatywnej domeny / najsilniejszym realnym
// zaangażowaniem), reszta odpada.

// Ten sam styl zdejmowania polskich znaków co normalizeForKey w news/route.ts
// (jawne podstawienia, nie \p{Diacritic}/u — ta flaga wymaga wyższego
// target'u niż ten projekt ma ustawiony w tsconfig, więc trzymamy się
// wzorca, który już jest w kodzie).
function normalizeTitleForFingerprint(title: string): string {
  return title
    .toLowerCase()
    .replace(/ó/g, "o").replace(/ą/g, "a").replace(/ę/g, "e")
    .replace(/ź/g, "z").replace(/ż/g, "z").replace(/ś/g, "s")
    .replace(/ć/g, "c").replace(/ń/g, "n").replace(/ł/g, "l")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90); // pierwsze ~90 znaków wystarcza, by odróżnić różne artykuły, a złapać przedruki
}

export interface DedupResult<T extends Article> {
  articles: T[];
  removedCount: number;
}

export function dedupeArticles<T extends Article>(articles: T[]): DedupResult<T> {
  const bestByFingerprint = new Map<string, T>();

  for (const article of articles) {
    const fp = normalizeTitleForFingerprint(article.title);
    if (!fp) continue;
    const existing = bestByFingerprint.get(fp);
    if (!existing || article.weight > existing.weight) {
      bestByFingerprint.set(fp, article);
    }
  }

  const deduped = Array.from(bestByFingerprint.values());
  return { articles: deduped, removedCount: articles.length - deduped.length };
}
