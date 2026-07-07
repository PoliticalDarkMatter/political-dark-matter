import type { Article } from "@/app/api/news/route";

// ── Korelacja między platformami ───────────────────────────────────────
// Nie wymaga żadnego nowego źródła danych — to funkcja agregująca nad
// tym, co już się zbiera (news, Reddit, Mastodon, Telegram, YouTube, X).
// Pytanie, na które odpowiada: który temat/nazwisko pojawia się NIEZALEŻNIE
// na kilku różnych platformach naraz, w tym samym oknie czasowym — to
// silniejszy sygnał realnego zasięgu narracji niż sama liczba wzmianek
// w jednym miejscu (viralowy wątek na jednym subreddicie ≠ temat, który
// przebił się wszędzie).

export interface CrossPlatformSignal {
  keyword: string;
  platforms: string[];
  articleCount: number;
  totalWeight: number;
  sampleArticles: Array<{ title: string; url: string; source: string; platform: string }>;
}

// Gruby podział źródeł na "klasy platform" — po prefiksie source, bo Article
// nie niesie osobnego pola platform (patrz lib/types.ts Platform — używane
// gdzie indziej, tu celowo nie duplikujemy typu, tylko klasyfikujemy string).
function platformBucket(source: string): string {
  if (source.startsWith("Reddit")) return "Reddit";
  if (source.startsWith("Mastodon")) return "Mastodon";
  if (source.startsWith("Telegram")) return "Telegram";
  if (source.startsWith("YouTube")) return "YouTube";
  if (source.startsWith("X —") || source.startsWith("X (via Nitter)")) return "X";
  if (source === "GDELT") return "GDELT";
  if (source === "Guardian") return "Guardian";
  return "Newsy/RSS";
}

const STOP = new Set([
  "polska", "polski", "polskie", "polskiej", "polskiego", "rzad", "rzadu", "sejm", "senat",
  "minister", "premier", "prezydent", "partia", "koalicja", "unia", "europejska",
]);

// Ten sam styl zdejmowania polskich znaków co normalizeForKey w news/route.ts
// (jawne podstawienia, nie \p{Diacritic}/u — patrz uzasadnienie w lib/dedup.ts).
function normalizeKeyword(s: string): string {
  return s.toLowerCase()
    .replace(/ó/g, "o").replace(/ą/g, "a").replace(/ę/g, "e")
    .replace(/ź/g, "z").replace(/ż/g, "z").replace(/ś/g, "s")
    .replace(/ć/g, "c").replace(/ń/g, "n").replace(/ł/g, "l");
}

// Lekka ekstrakcja fraz-kandydatów (nazwy własne z dużej litery) — celowo
// prostsza niż extractEntities w news/route.ts (ta jest prywatna i robi
// pełną kanonizację odmian przez Gemini). Tu chodzi tylko o sygnał
// korelacji, nie o listę aktorów pokazywaną w UI, więc mniejsza precyzja
// jest akceptowalnym kompromisem za brak duplikowania złożonej logiki.
const NAME_RE = /(?:^|\s)([A-ZŁŚŹŻĆĄĘÓ][a-złśźżćąęó]{3,})/g;

interface KeywordEntry { display: string; items: Article[]; platforms: string[] }

export function correlateAcrossPlatforms(articles: Article[]): CrossPlatformSignal[] {
  // Zwykłe tablice zamiast Map/Set — ten projekt ma w tsconfig target,
  // przy którym iteracja Map/Set przez for-of/spread wymaga
  // --downlevelIteration (patrz lib/dedup.ts po ten sam kompromis).
  // Przy skali "kilkaset artykułów na zapytanie" indexOf na małych
  // tablicach (liczba platform, liczba unikalnych słów kluczowych) jest
  // nieistotny wydajnościowo, a kod prostszy do przeczytania.
  const keys: string[] = [];
  const entries: Record<string, KeywordEntry> = {};

  for (const article of articles) {
    const platform = platformBucket(article.source);
    const seenInThisArticle: string[] = [];
    let m: RegExpExecArray | null;
    NAME_RE.lastIndex = 0;
    while ((m = NAME_RE.exec(article.title)) !== null) {
      const raw = m[1].trim();
      const key = normalizeKeyword(raw);
      if (key.length < 4 || STOP.has(key) || seenInThisArticle.indexOf(key) !== -1) continue;
      seenInThisArticle.push(key);

      let entry = entries[key];
      if (!entry) {
        entry = { display: raw, items: [], platforms: [] };
        entries[key] = entry;
        keys.push(key);
      }
      entry.items.push(article);
      if (entry.platforms.indexOf(platform) === -1) entry.platforms.push(platform);
    }
  }

  const signals: CrossPlatformSignal[] = [];
  for (let i = 0; i < keys.length; i++) {
    const entry = entries[keys[i]];
    if (entry.platforms.length < 2) continue; // sedno: musi wystąpić na co najmniej 2 różnych platformach
    if (entry.items.length < 3) continue; // odsiej szum pojedynczych przypadkowych trafień
    const totalWeight = entry.items.reduce((sum: number, a: Article) => sum + a.weight, 0);
    const sample = entry.items
      .slice()
      .sort((a: Article, b: Article) => b.weight - a.weight)
      .slice(0, 3)
      .map((a: Article) => ({ title: a.title, url: a.url, source: a.source, platform: platformBucket(a.source) }));
    signals.push({
      keyword: entry.display,
      platforms: entry.platforms.slice().sort(),
      articleCount: entry.items.length,
      totalWeight: Math.round(totalWeight),
      sampleArticles: sample,
    });
  }

  return signals
    .sort((a, b) => b.platforms.length - a.platforms.length || b.totalWeight - a.totalWeight)
    .slice(0, 15);
}
