import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_RSS_FEEDS } from "@/lib/sources";
import { classifySentiment } from "@/lib/sentiment";
import { parseRSS, weightForArticleUrl } from "@/lib/rss";
import { fetchYouTubeSearch, fetchYouTubeMonitor } from "@/lib/sources/youtube";
import { fetchX } from "@/lib/sources/x";
import { dedupeArticles } from "@/lib/dedup";
import { correlateAcrossPlatforms, type CrossPlatformSignal } from "@/lib/cross-platform";

export const maxDuration = 30;

export type WeightBasis = "tranco" | "editorial_override" | "unknown" | "social_estimate" | "social_real";

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
  weight: number; // waga per-artykuł: patrz weightBasis/weightExplain dla metody
  weightBasis?: WeightBasis;
  weightExplain?: string;
}

export interface EntityInfo {
  name: string;
  count: number;
  weightedCount: number;
  velocity: number | null;
  sentimentBreakdown: { positive: number; negative: number; neutral: number };
  dominantSentiment: "positive" | "negative" | "neutral";
}

export interface NarrativeCluster {
  label: string;
  icon: string;
  count: number;
  weightedCount: number;
  velocity: number | null;
  percentage: number;
  dominantSentiment: "positive" | "negative" | "neutral";
  topArticles: Array<{ title: string; url: string; source: string }>;
}

// ── Sentiment i waga per artykuł ──────────────────────────────────
// Definicje w lib/sentiment.ts i lib/rss.ts (parseRSS + weightForArticleUrl
// przeniesione tam, żeby lib/sources/x.ts mogło je reużyć bez zależności
// cyklicznej — patrz komentarz na górze lib/rss.ts).
const sentiment = classifySentiment;

// ── Polskie RSS feeds (tryb monitorowania) ───────────────────────
// Źródło listy: lib/sources.ts (DEFAULT_RSS_FEEDS) — katalog był już
// przygotowany, ale nie podłączony do faktycznego fetchowania. Bierzemy
// wszystkie oznaczone enabled:true zamiast twardo zaszytych 6 portali.
const POLISH_FEEDS: { name: string; url: string }[] = DEFAULT_RSS_FEEDS
  .filter((f) => f.enabled)
  .map((f) => ({ name: f.name, url: f.url }));

async function fetchFeed(feed: { name: string; url: string }): Promise<Article[]> {
  try {
    const res = await fetch(feed.url, {
      cache: "no-store",
      headers: { "User-Agent": "NarrativeScope/1.0 (+https://narrativescope.com)" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    return parseRSS(await res.text(), feed.name, 15);
  } catch {
    return [];
  }
}

// ── Google News RSS Search (tryb wyszukiwania) ───────────────────
async function searchGoogleNews(query: string): Promise<Article[]> {
  const encoded = encodeURIComponent(query + " site:*.pl OR język:pl");
  const urls = [
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pl&gl=PL&ceid=PL:pl`,
    `https://news.google.com/rss/search?q=${encoded}&hl=pl&gl=PL&ceid=PL:pl`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NarrativeScope/1.0; +https://narrativescope.com)",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
          "Accept-Language": "pl-PL,pl;q=0.9",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      const articles = parseRSS(text, "Google News", 100);
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
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const articles = parseRSS(await res.text(), "Bing News", 50);
      if (articles.length > 0) return articles;
    }
  } catch { /* ignore */ }

  return [];
}

// ── Reddit JSON API (darmowe, bez klucza) ────────────────────────
const REDDIT_SUBS_MONITOR = ["poland", "europe"];

interface RedditPost {
  title: string; url: string; permalink: string; created_utc: number; subreddit: string;
  score?: number; num_comments?: number; subreddit_subscribers?: number;
}
interface RedditResp { data: { children: Array<{ data: RedditPost }> } }

// ── Waga dla posta z Reddita: realne dane z samego obiektu posta ─────────
// Reddit zwraca w każdym poście "score" (realne saldo głosów, czyli realne
// zaangażowanie) i "subreddit_subscribers" (realna wielkość społeczności).
// Zasięg na Reddicie nie zależy liniowo od subskrybentów (o tym decyduje
// algorytm strony głównej), więc bazą jest realny score, a wielkość
// subreddita tylko skaluje, ile znaczy jeden punkt score w danej społeczności.
function weightForRedditPost(score: number, subscribers: number): { weight: number; explain: string } {
  const s = Math.max(0, score || 0);
  const subs = Math.max(10, subscribers || 10);
  const communityFactor = 1 + Math.log10(subs) / 10; // większy subreddit = każdy głos "waży" trochę więcej
  const raw = 1 + Math.log10(1 + s) * 2 * communityFactor;
  const weight = Math.round(Math.min(10, Math.max(1, raw)) * 10) / 10;
  return { weight, explain: `Reddit: realny wynik ${s} głosów w społeczności ${subs.toLocaleString("pl-PL")} subskrybentów` };
}

async function fetchRedditJSON(url: string): Promise<Article[]> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "NarrativeScope/1.0 (+https://narrativescope.com; jan.domaniewski@multinewsroom.pl)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json() as RedditResp;
    return (data?.data?.children ?? []).map(function (c, i) {
      const p = c.data;
      if (!p.title) return null;
      const postUrl = p.url.startsWith("/r/")
        ? "https://www.reddit.com" + p.url
        : p.url;
      const source = "Reddit r/" + p.subreddit;
      const w = weightForRedditPost(p.score ?? 0, p.subreddit_subscribers ?? 0);
      return {
        id: "reddit-" + p.subreddit + "-" + i,
        title: p.title,
        url: postUrl,
        source,
        publishedAt: new Date(p.created_utc * 1000).toISOString(),
        sentiment: sentiment(p.title),
        weight: w.weight,
        weightBasis: "social_real" as WeightBasis,
        weightExplain: w.explain,
      } as Article;
    }).filter(Boolean) as Article[];
  } catch {
    return [];
  }
}

async function searchReddit(query: string): Promise<Article[]> {
  const enc = encodeURIComponent(query);
  const urls = REDDIT_SUBS_MONITOR.map(function (sub) {
    return `https://www.reddit.com/r/${sub}/search.json?q=${enc}&sort=new&limit=25&restrict_sr=on`;
  });
  const results = await Promise.allSettled(urls.map(fetchRedditJSON));
  return results.flatMap(function (r) { return r.status === "fulfilled" ? r.value : []; });
}

async function fetchRedditMonitor(): Promise<Article[]> {
  const urls = REDDIT_SUBS_MONITOR.map(function (sub) {
    return `https://www.reddit.com/r/${sub}/new.json?limit=25`;
  });
  const results = await Promise.allSettled(urls.map(fetchRedditJSON));
  return results.flatMap(function (r) { return r.status === "fulfilled" ? r.value : []; });
}

// ── Mastodon (pol.social) — publiczne posty, bez klucza ──────────
interface MastodonAccount { followers_count?: number }
interface MastodonStatus {
  id: string; content: string; url: string; created_at: string;
  account?: MastodonAccount; favourites_count?: number; reblogs_count?: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

// ── Waga dla posta z Mastodona ─────────────────────────────────────────
// Realne dane wejściowe: followers_count konta (z API, nie zgadywane) i
// realne zaangażowanie (favourites + reblogi) pod danym postem.
// VISIBILITY_RATE to jawnie oznaczone ZAŁOŻENIE: dla Mastodona nie ma
// opublikowanych, autorytatywnych badań branżowych analogicznych do tych
// dla Facebooka czy Twittera, więc przyjmuję ostrożną wartość 8% i mnożę
// przez mnożnik zaangażowania, żeby post, który realnie "poszedł" wśród
// obserwujących, dostał wyższą wagę niż post tego samego konta bez odzewu.
const MASTODON_VISIBILITY_RATE = 0.08; // założenie własne — brak publikowanego benchmarku dla Mastodona
function weightForMastodonPost(followers: number, engagement: number): { weight: number; explain: string } {
  const f = Math.max(0, followers || 0);
  const reach = f * MASTODON_VISIBILITY_RATE;
  const engagementRate = f > 0 ? engagement / f : 0;
  const kicker = 1 + Math.min(2, engagementRate * 20);
  const estimatedReach = Math.round(reach * kicker);
  const raw = 1 + Math.log10(1 + estimatedReach) * 1.6;
  const weight = Math.round(Math.min(10, Math.max(1, raw)) * 10) / 10;
  return {
    weight,
    explain: `Mastodon: ${f.toLocaleString("pl-PL")} obserwujących, założenie widoczności ${Math.round(MASTODON_VISIBILITY_RATE * 100)}% (brak publikowanego benchmarku), szacowany zasięg ~${estimatedReach.toLocaleString("pl-PL")}`,
  };
}

async function fetchMastodon(query?: string): Promise<Article[]> {
  try {
    const url = query
      ? `https://pol.social/api/v2/search?q=${encodeURIComponent(query)}&type=statuses&limit=25`
      : `https://pol.social/api/v1/timelines/public?limit=25`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "NarrativeScope/1.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const statuses: MastodonStatus[] = query ? (data?.statuses ?? []) : (Array.isArray(data) ? data : []);
    return statuses.map(function (s, i) {
      const text = stripHtml(s.content || "");
      if (!text) return null;
      const followers = s.account?.followers_count ?? 0;
      const engagement = (s.favourites_count ?? 0) + (s.reblogs_count ?? 0);
      const w = weightForMastodonPost(followers, engagement);
      return {
        id: "mastodon-" + i,
        title: text.slice(0, 240),
        url: s.url,
        source: "Mastodon",
        publishedAt: s.created_at || new Date().toISOString(),
        sentiment: sentiment(text),
        weight: w.weight,
        weightBasis: "social_estimate" as WeightBasis,
        weightExplain: w.explain,
      } as Article;
    }).filter(Boolean) as Article[];
  } catch {
    return [];
  }
}

// ── GDELT (globalny, filtr Polska) — bez klucza ──────────────────
interface GdeltArticle { title: string; url: string; seendate: string; sourcecountry?: string }

async function fetchGDELT(query: string): Promise<Article[]> {
  try {
    const q = query ? `${query} sourcecountry:POL` : "sourcecountry:POL";
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=50&format=json`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "NarrativeScope/1.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { articles?: GdeltArticle[] };
    const arts = data?.articles ?? [];
    return arts.map(function (a, i) {
      if (!a.title || !a.url) return null;
      // seendate format: 20260704T191400Z
      const iso = a.seendate
        ? `${a.seendate.slice(0,4)}-${a.seendate.slice(4,6)}-${a.seendate.slice(6,8)}T${a.seendate.slice(9,11)}:${a.seendate.slice(11,13)}:${a.seendate.slice(13,15)}Z`
        : new Date().toISOString();
      const w = weightForArticleUrl(a.url);
      return {
        id: "gdelt-" + i,
        title: a.title,
        url: a.url,
        source: "GDELT",
        publishedAt: iso,
        sentiment: sentiment(a.title),
        weight: w.weight,
        weightBasis: w.basis,
        weightExplain: w.explain,
      } as Article;
    }).filter(Boolean) as Article[];
  } catch {
    return [];
  }
}

// ── The Guardian (klucz testowy "test" działa od razu) ───────────
interface GuardianResult { webTitle: string; webUrl: string; webPublicationDate: string }

async function fetchGuardian(query: string): Promise<Article[]> {
  try {
    const q = query ? `${query} AND Poland` : "Poland";
    const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(q)}&api-key=test&page-size=20`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { response?: { results?: GuardianResult[] } };
    const results = data?.response?.results ?? [];
    return results.map(function (r, i) {
      const w = weightForArticleUrl(r.webUrl);
      return {
        id: "guardian-" + i,
        title: r.webTitle,
        url: r.webUrl,
        source: "Guardian",
        publishedAt: r.webPublicationDate || new Date().toISOString(),
        sentiment: sentiment(r.webTitle),
        weight: w.weight,
        weightBasis: w.basis,
        weightExplain: w.explain,
      } as Article;
    }).filter((a) => a.title && a.url);
  } catch {
    return [];
  }
}

// ── Telegram (t.me/s/, publiczne kanały, bez klucza) ─────────────
// CELOWO pusta lista: monitoring polityczny wymaga zweryfikowanych,
// realnych uchwytów kanałów — nie zgadujemy nazw. Jan podaje listę
// (@nazwa_kanalu), potem od razu zaczyna działać bez zmian w kodzie.
const TELEGRAM_CHANNELS: string[] = [];

// Telegram pokazuje na publicznej stronie kanału (t.me/s/) dwie realne liczby,
// nie estymacje: liczbę subskrybentów kanału (nagłówek strony) i liczbę
// wyświetleń KAŻDEGO pojedynczego posta (przy każdej wiadomości). To jedyne
// źródło w całym silniku, gdzie zasięg pojedynczego materiału jest realnym,
// publicznie pokazywanym pomiarem, nie szacunkiem.
function parseCompactNumber(raw: string): number {
  const s = raw.trim().toUpperCase().replace(/,/g, ".");
  const m = s.match(/^([\d.]+)\s*([KM]?)$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (m[2] === "K") return Math.round(n * 1000);
  if (m[2] === "M") return Math.round(n * 1000000);
  return Math.round(n);
}

function parseTelegramSubscriberCount(html: string): number | null {
  const counters = Array.from(html.matchAll(/<div class="tgme_channel_info_counter">\s*<span class="counter_value">([^<]+)<\/span>\s*<span class="counter_type">([^<]+)<\/span>/g));
  for (const m of counters) {
    if (/subscriber/i.test(m[2])) return parseCompactNumber(m[1]);
  }
  return null;
}

function weightForTelegramPost(views: number | null, subscribers: number | null): { weight: number; basis: WeightBasis; explain: string } {
  if (views != null && views > 0) {
    const raw = 1 + Math.log10(1 + views) * 1.8;
    const weight = Math.round(Math.min(10, Math.max(1, raw)) * 10) / 10;
    return { weight, basis: "social_real", explain: `Telegram: realna liczba wyświetleń posta — ${views.toLocaleString("pl-PL")}` };
  }
  const subs = subscribers ?? 0;
  const TELEGRAM_VIEW_RATE = 0.25; // założenie własne, gdy realnej liczby wyświetleń nie udało się odczytać
  const estimated = Math.round(subs * TELEGRAM_VIEW_RATE);
  const raw = 1 + Math.log10(1 + estimated) * 1.8;
  const weight = Math.round(Math.min(10, Math.max(1, raw)) * 10) / 10;
  return {
    weight,
    basis: "social_estimate",
    explain: subs > 0
      ? `Telegram: brak realnej liczby wyświetleń dla tego posta, szacunek z ${subs.toLocaleString("pl-PL")} subskrybentów kanału przy założeniu ${Math.round(TELEGRAM_VIEW_RATE * 100)}% widoczności`
      : "Telegram: brak danych o wyświetleniach i subskrybentach — wartość neutralna",
  };
}

async function fetchTelegramChannel(handle: string): Promise<Article[]> {
  try {
    const res = await fetch(`https://t.me/s/${handle}`, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NarrativeScope/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const subscribers = parseTelegramSubscriberCount(html);
    const blocks = html.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g) ?? [];
    const dateMatches = Array.from(html.matchAll(/<time[^>]*datetime="([^"]+)"/g));
    const viewMatches = Array.from(html.matchAll(/<span class="tgme_widget_message_views">([^<]+)<\/span>/g));
    const source = `Telegram @${handle}`;
    return blocks.slice(0, 20).map(function (block, i) {
      const text = stripHtml(block);
      if (!text) return null;
      const iso = dateMatches[i]?.[1] || new Date().toISOString();
      const views = viewMatches[i] ? parseCompactNumber(viewMatches[i][1]) : null;
      const w = weightForTelegramPost(views, subscribers);
      return {
        id: `tg-${handle}-${i}`,
        title: text.slice(0, 240),
        url: `https://t.me/s/${handle}`,
        source,
        publishedAt: new Date(iso).toISOString(),
        sentiment: sentiment(text),
        weight: w.weight,
        weightBasis: w.basis,
        weightExplain: w.explain,
      } as Article;
    }).filter(Boolean) as Article[];
  } catch {
    return [];
  }
}

async function fetchTelegramAll(): Promise<Article[]> {
  if (TELEGRAM_CHANNELS.length === 0) return [];
  const results = await Promise.allSettled(TELEGRAM_CHANNELS.map(fetchTelegramChannel));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

// ── Stop words ───────────────────────────────────────────────────
const STOP = new Set(["w","z","do","na","za","po","ze","i","a","o","u","ze","to","jak","ale","nie","co","sie","go","je","im","ich","ten","ta","te","byc","jest","sa","byl","byla","czy","tez","juz","przez","dla","przy","nad","pod","miedzy","jego","jej","tego","tej","tych","jako","oraz","bo","gdy","jesli","raz","tym","ta","że","się","już","też","czy","być","jest","są","był","była","przez"]);

function filterByQuery(articles: Article[], q: string): Article[] {
  if (!q || q === "*") return articles;
  const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
  if (words.length === 0) return articles;
  return articles.filter(a => {
    const title = a.title.toLowerCase();
    return words.some(w => title.includes(w));
  });
}

// ── Filtr czasu ──────────────────────────────────────────────────
function filterByTime(articles: Article[], period: string, from?: string, to?: string): Article[] {
  const now = Date.now();
  if (from && to) {
    const f = new Date(from).getTime();
    const t = new Date(to).getTime();
    return articles.filter(a => {
      const ts = new Date(a.publishedAt).getTime();
      return ts >= f && ts <= t;
    });
  }
  const ms: Record<string, number> = {
    "1h":  3600000,
    "24h": 86400000,
    "7d":  7 * 86400000,
    "30d": 30 * 86400000,
  };
  if (period && ms[period]) {
    const cutoff = now - ms[period];
    return articles.filter(a => new Date(a.publishedAt).getTime() >= cutoff);
  }
  return articles; // 1y i brak = wszystko
}

// ── Velocity ─────────────────────────────────────────────────────
// Uwaga: to jest trend WEWNĄTRZ wybranego okna (starsza połowa vs nowsza
// połowa wyników, po czasie publikacji), nie porównanie dzień-do-dnia
// względem historii — na to potrzeba by danych ze snapshotów Supabase,
// których dashboard jeszcze nie odpytuje. Zwraca null gdy próbka za mała
// (<4 artykuły), żeby nie sugerować trendu z szumu.
function computeVelocity(articles: { publishedAt: string }[]): number | null {
  if (articles.length < 4) return null;
  const sorted = [...articles].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
  const mid = Math.floor(sorted.length / 2);
  const older = sorted.slice(0, mid).length;
  const newer = sorted.slice(mid).length;
  if (older === 0) return newer > 0 ? 100 : null;
  return Math.round(((newer - older) / older) * 100);
}

// ── Ekstrakcja aktorów ───────────────────────────────────────────
const ENTITY_BLACKLIST = new Set([
  "Polska","Polacy","Warszawa","Europa","Unia","Europejska","Minister","Premier",
  "Sejm","Senat","PiS","KO","PSL","TD","Lewica","NBP","GUS","NIK","PKB","USA",
  "NATO","UE","ONZ","RP","TVP","TVN","RMF","Rząd","Policja","Google","News",
  "Koalicja","Alert","Breaking","Ekstra","Super","Nowy","Nowa","Wielki","Wielka",
  "Poland","Niemiec","Niemcy","Francji","Berlinie","Moskwie","Kijowie","Londynie",
  "Brukseli","Waszyngtonie","Wielkopolsce","Mazowszu","Pomorzu",
  "Szef","Szefem","Firma","Spółka","Kraj","Miasto","Region","Rynek","Fundusz",
  "Polski","Polskie","Polskim","Polskiego","Polskiej","Polskich",
  "Rosyjski","Rosyjska","Rosyjskie","Rosyjskim","Rosyjskiego",
  "Ukrainski","Ukraiński","Ukraińska","Ukraińskie","Ukraińskim",
  "Europejski","Europejska","Europejskie","Europejskim","Europejskiego",
  "Krajowy","Krajowa","Krajowe","Krajowym","Krajowej",
  "Centralny","Centralna","Centralne","Centralnym",
  "Publiczny","Publiczna","Publiczne","Publicznym",
  "Nowych","Nowym","Nowej","Nowego","Nowe","Nowi","Nowym",
  "Kolejny","Kolejna","Kolejne","Kolejnym","Kolejnego","Kolejnej",
  "Główny","Główna","Główne","Głównym","Głównego",
  "Wielki","Wielka","Wielkie","Wielkim","Wielkiego","Wielkiej",
]);

const VERB_BLACKLIST = new Set([
  "Trwa","Trwają","Trwało","Ruszyła","Ruszył","Ruszają","Będzie","Będą",
  "Wygrał","Wygrała","Zginął","Zginęła","Powiedział","Stwierdziła",
  "Ogłosił","Ogłosiła","Podpisał","Zatrzymał","Aresztowano","Zakończył",
  "Odbył","Odbędzie","Rozpoczął","Zajął","Zajęła","Wróci","Wrócił",
  "Wzrósł","Spadł","Rośnie","Spada","Planuje","Chce","Musi","Może",
  "Zostaje","Zostają","Zostało","Pozostaje","Pozostają","Istnieje","Istnieją",
  "Rośnie","Maleje","Wzrasta","Opada","Zmienia","Zmieniają","Zmieniło",
  "Dotyczy","Dotyczą","Wynika","Wynikają","Pochodzi","Pochodzą",
  "Liczy","Liczą","Kosztuje","Kosztują","Wynosi","Wynoszą",
  "Pierwsza","Pierwsze","Pierwszego","Pierwszej","Pierwszym","Pierwszy",
  "Całej","Całego","Całym","Całą","Całe","Cały",
  "Wtedy","Teraz","Jednak","Tylko","Także","Natomiast","Ponadto",
  "Niestety","Ostatecznie","Tymczasem","Wcześniej","Później","Dalej",
  "Dziś","Dzisiaj","Jutro","Wczoraj","Właśnie","Oczywiście","Wprost",
  "Mimo","Choć","Chociaż","Kiedy","Skoro","Zanim","Dopóki","Zatem",
  "Przez","Przed","Między","Wśród","Według","Wobec","Wokół",
]);

function normalizeForKey(s: string): string {
  return s.toLowerCase()
    .replace(/ó/g, "o").replace(/ą/g, "a").replace(/ę/g, "e")
    .replace(/ź/g, "z").replace(/ż/g, "z").replace(/ś/g, "s")
    .replace(/ć/g, "c").replace(/ń/g, "n").replace(/ł/g, "l");
}

function pickCanonical(names: string[]): string {
  const adj = names.find(function(n) { return /(?:ski|cki|dzki|zki)$/i.test(n); });
  if (adj) return adj;

  const DECLINED_RE = /(?:iego|ego|owi|emu|ową|owej|owego|iem|[bcdfghjklłmnprstw]iu|ji)$/;
  const undeclined = names.filter(function(n) { return !DECLINED_RE.test(n); });

  if (undeclined.length === 0) {
    const reconstructed = names.map(function(n) {
      if (/[bcdfghjklłmnprstw]iu$/.test(n)) return n.slice(0, -2) + "ie";
      if (/ji$/.test(n))                     return n.slice(0, -2) + "ja";
      if (/ach$/.test(n) && n.length > 5)    return n.slice(0, -2);
      return n;
    });
    return reconstructed.sort(function(a, b) { return a.length - b.length; })[0];
  }

  const pool = undeclined;
  const consonantForms = pool.filter(function(n) {
    return /[bcdfghjklłmnpqrstvwxzńśźżć]$|ów$/i.test(n);
  });
  const aForms = pool.filter(function(n) { return /[^ą]a$/.test(n); });

  if (consonantForms.length > 0 && aForms.length > 0) {
    return consonantForms.sort(function(a, b) { return a.length - b.length; })[0];
  }
  if (aForms.length > 0) {
    return aForms.sort(function(a, b) { return a.length - b.length; })[0];
  }
  return [...pool].sort(function(a, b) { return a.length - b.length; })[0];
}

function prefixKey(name: string): string {
  if (name.includes(" ")) return normalizeForKey(name);
  return normalizeForKey(name).slice(0, 4);
}

function extractEntities(articles: Article[]): EntityInfo[] {
  const raw: Map<string, { count: number; weighted: number; pos: number; neg: number; neu: number; times: string[] }> = new Map();
  const NAME_RE = /(?:^|\s)([A-ZŁŚŹŻĆĄĘÓ][a-złśźżćąęó]{3,}(?:\s+[A-ZŁŚŹŻĆĄĘÓ][a-złśźżćąęó]{2,}){0,2})/g;

  for (const article of articles) {
    const titleBody = article.title.replace(/^[^\s]+\s+/, "");
    let m: RegExpExecArray | null;
    NAME_RE.lastIndex = 0;
    while ((m = NAME_RE.exec(titleBody)) !== null) {
      const name = m[1].trim();
      const isVerb = /(?:ają|eją|ują|[^i]ją|[^a-z]ły|[^a-z]ło|[^a-z]ła|[^a-z]li|ący|ąca|ące|ując|ając)$/.test(name);
      const isAdj = /(?:owych|owym|owej|owego|alny|alna|alne|alnej)$/.test(name);
      if (
        name.length >= 4
        && !ENTITY_BLACKLIST.has(name)
        && !VERB_BLACKLIST.has(name)
        && !isVerb
        && !isAdj
        && !/^\d/.test(name)
      ) {
        const ex = raw.get(name) ?? { count: 0, weighted: 0, pos: 0, neg: 0, neu: 0, times: [] };
        ex.count++;
        ex.weighted += article.weight;
        ex.times.push(article.publishedAt);
        if (article.sentiment === "positive") ex.pos++;
        else if (article.sentiment === "negative") ex.neg++;
        else ex.neu++;
        raw.set(name, ex);
      }
    }
  }

  const groups: Map<string, Array<[string, { count: number; weighted: number; pos: number; neg: number; neu: number; times: string[] }]>> = new Map();
  for (const entry of Array.from(raw.entries())) {
    const key = prefixKey(entry[0]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  const merged: Array<{ name: string; count: number; weighted: number; pos: number; neg: number; neu: number; times: string[] }> = [];
  for (const group of Array.from(groups.values())) {
    const names = group.map(function (e) { return e[0]; });
    const canonical = pickCanonical(names);
    let total = { count: 0, weighted: 0, pos: 0, neg: 0, neu: 0, times: [] as string[] };
    for (const [, v] of group) {
      total.count += v.count;
      total.weighted += v.weighted;
      total.pos += v.pos;
      total.neg += v.neg;
      total.neu += v.neu;
      total.times.push(...v.times);
    }
    if (total.count >= 2) merged.push({ name: canonical, ...total });
  }

  return merged
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 20)
    .map(function (v) {
      let dom: "positive" | "negative" | "neutral" = "neutral";
      if (v.pos > v.neg && v.pos > v.neu) dom = "positive";
      else if (v.neg > v.pos && v.neg > v.neu) dom = "negative";
      return {
        name: v.name,
        count: v.count,
        weightedCount: Math.round(v.weighted),
        velocity: computeVelocity(v.times.map((t) => ({ publishedAt: t }))),
        sentimentBreakdown: { positive: v.pos, negative: v.neg, neutral: v.neu },
        dominantSentiment: dom,
      };
    });
}

// ── Gemini NER canonicalization (post-processing) ────────────────
async function canonicalizeWithGemini(entities: EntityInfo[]): Promise<EntityInfo[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || entities.length === 0) return entities;

  const names = entities.map(function(e) { return e.name; });

  const prompt = `Masz listę wyrazów wyekstrahowanych z polskich tytułów prasowych: ${JSON.stringify(names)}
Dla każdego wyrazu:
1. Jeśli to nazwa własna (osoba, miejsce, organizacja, instytucja) — podaj formę w MIANOWNIKU liczby pojedynczej. Jeśli wyraz jest już w mianowniku, zostaw bez zmian.
2. Jeśli to NIE jest nazwa własna (czasownik, przymiotnik, przysłówek, rzeczownik pospolity, skrót ogólny) — zwróć null.
Odpowiedz TYLKO jako JSON obiekt (bez markdown, bez komentarzy): {"wyraz": "Mianownik" lub null}
Przykład: {"Rosji":"Rosja","Trumpa":"Trump","Ukrainy":"Ukraina","Zostają":null,"Polski":null}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return entities;

    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (!jsonMatch) return entities;

    const mapping = JSON.parse(jsonMatch[0]) as Record<string, string | null>;

    return entities
      .filter(function(e) { return !(e.name in mapping && mapping[e.name] === null); })
      .map(function(e) {
        const corrected = mapping[e.name];
        return { ...e, name: (corrected != null) ? corrected : e.name };
      });
  } catch {
    return entities;
  }
}

// ── Klasteryzacja narracji ───────────────────────────────────────
interface NarrativeSeed { label: string; icon: string; keywords: string[] }

const NARRATIVE_SEEDS: NarrativeSeed[] = [
  { label: "Polityka",       icon: "⚖️",  keywords: ["rząd","sejm","senat","minister","premier","prezydent","partia","wybory","koalicja","opozycja","pis","platforma","psl","lewica","ustawa","prawo","głosowanie","polityk","kampania","marszałek","kancelaria"] },
  { label: "Gospodarka",     icon: "📈",  keywords: ["gospodarka","inflacja","wzrost","pkb","bank","kredyt","stopa","inwestycje","budżet","deficyt","giełda","akcje","waluty","euro","dolar","ceny","energia","surowce","eksport","import","biznes","firma","spółka","bankier","kurs"] },
  { label: "Bezpieczenstwo", icon: "🛡️", keywords: ["wojsko","armia","nato","obrona","żołnierze","atak","konflikt","wojna","broń","granica","straż","policja","agresja","rosja","ukraina","sankcje","wywiad","służby","terroryzm","obronność","sojusz","front","ostrzał","rakieta"] },
  { label: "Zdrowie",        icon: "🏥",  keywords: ["szpital","lekarz","zdrowie","choroba","leczenie","nfz","medycyna","lek","szczepionka","pacjent","epidemia","covid","rak","operacja","klinika","ratownik","zdrowie"] },
  { label: "Wypadki",        icon: "🚨",  keywords: ["wypadek","kolizja","pożar","powódź","katastrofa","tragedia","ofiara","ranny","śmierć","zginął","zginęła","utonął","eksplozja","awaria","rozbicie","karambol","zderzenie","ewakuacja"] },
  { label: "Prawo i sady",   icon: "🔨",  keywords: ["sąd","prokurator","prokuratura","wyrok","areszt","aresztowanie","zarzuty","oskarżenie","skazanie","korupcja","łapówka","afera","cba","abw","śledztwo","proces","sędzia","adwokat"] },
  { label: "Spoleczenstwo",  icon: "👥",  keywords: ["protest","strajk","demonstracja","marsz","edukacja","szkoła","uczelnia","studenci","nauczyciel","kultura","sport","piłka","liga","mistrzostwa","turniej","olimpiada","film","muzyka","sztuka","klimat","ekologia"] },
];

function clusterNarratives(articles: Article[]): NarrativeCluster[] {
  const counts: Map<string, { articles: Article[]; weighted: number; pos: number; neg: number; neu: number }> = new Map();
  for (const s of NARRATIVE_SEEDS) counts.set(s.label, { articles: [], weighted: 0, pos: 0, neg: 0, neu: 0 });

  for (const article of articles) {
    const t = article.title.toLowerCase();
    let best = ""; let score = 0;
    for (const s of NARRATIVE_SEEDS) {
      const sc = s.keywords.filter(kw => t.includes(kw)).length;
      if (sc > score) { score = sc; best = s.label; }
    }
    if (best && score > 0) {
      const b = counts.get(best)!;
      b.articles.push(article);
      b.weighted += article.weight;
      if (article.sentiment === "positive") b.pos++;
      else if (article.sentiment === "negative") b.neg++;
      else b.neu++;
    }
  }

  const total = articles.length || 1;
  return NARRATIVE_SEEDS.map(s => {
    const b = counts.get(s.label)!;
    const count = b.articles.length;
    let dom: "positive" | "negative" | "neutral" = "neutral";
    if (b.pos > b.neg && b.pos > b.neu) dom = "positive";
    else if (b.neg > b.pos && b.neg > b.neu) dom = "negative";
    return {
      label: s.label, icon: s.icon, count,
      weightedCount: Math.round(b.weighted),
      velocity: computeVelocity(b.articles),
      percentage: Math.round((count / total) * 100),
      dominantSentiment: dom,
      topArticles: b.articles.slice(0, 8).map(a => ({ title: a.title, url: a.url, source: a.source })),
    };
  }).filter(c => c.count > 0).sort((a, b) => b.weightedCount - a.weightedCount);
}

function buildTimeline(articles: Article[]): Array<{ hour: string; count: number }> {
  const map: Map<string, number> = new Map();
  for (const a of articles) {
    const d = new Date(a.publishedAt);
    const key = `${String(d.getHours()).padStart(2, "0")}:00`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([hour, count]) => ({ hour, count }));
}

// ── Silnik zbierania i analizy — współdzielony z /api/analyze-text ──
export interface FeedResult {
  articles: Article[];
  total: number;
  totalAvailable: number;
  bySource: Record<string, number>;
  bySourceWeighted: Record<string, number>;
  totalWeightedReach: number;
  sentimentCounts: { positive: number; negative: number; neutral: number };
  entities: EntityInfo[];
  narratives: NarrativeCluster[];
  timeline: Array<{ hour: string; count: number }>;
  crossPlatformSignals: CrossPlatformSignal[];
  query: string;
  period: string;
  searchMode: string;
  searchInfo: string | null;
  rssNote: string | null;
  fetchedAt: string;
}

export async function buildFeed(q: string, period: string, from?: string, to?: string): Promise<FeedResult> {
  const isSearchMode = q.trim().length > 0;

  let allArticles: Article[] = [];
  let bySourceRaw: Record<string, number> = {};
  let searchMode: "google_news" | "rss_monitor" | "rss_filtered" = "rss_monitor";

  function tally(arts: Article[]) {
    for (const a of arts) bySourceRaw[a.source] = (bySourceRaw[a.source] ?? 0) + 1;
  }

  if (isSearchMode) {
    const [gnArticles, redditArticles, mastodonArticles, gdeltArticles, guardianArticles, telegramArticles, youtubeArticles, xArticles] = await Promise.all([
      searchGoogleNews(q.trim()),
      searchReddit(q.trim()),
      fetchMastodon(q.trim()),
      fetchGDELT(q.trim()),
      fetchGuardian(q.trim()),
      fetchTelegramAll(),
      fetchYouTubeSearch(q.trim()),
      fetchX(q.trim()),
    ]);

    if (gnArticles.length > 0) {
      allArticles = gnArticles;
      searchMode = "google_news";
      tally(gnArticles);
    } else {
      searchMode = "rss_filtered";
      const results = await Promise.allSettled(POLISH_FEEDS.map(fetchFeed));
      results.forEach((r, i) => {
        const arts = r.status === "fulfilled" ? filterByQuery(r.value, q) : [];
        bySourceRaw[POLISH_FEEDS[i].name] = arts.length;
        allArticles.push(...arts);
      });
    }

    for (const arts of [redditArticles, mastodonArticles, gdeltArticles, guardianArticles, telegramArticles, youtubeArticles, xArticles]) {
      tally(arts);
      allArticles = [...allArticles, ...arts];
    }
  } else {
    searchMode = "rss_monitor";
    const [feedResults, redditArticles, mastodonArticles, telegramArticles, youtubeArticles] = await Promise.all([
      Promise.allSettled(POLISH_FEEDS.map(fetchFeed)),
      fetchRedditMonitor(),
      fetchMastodon(),
      fetchTelegramAll(),
      fetchYouTubeMonitor(),
    ]);
    feedResults.forEach((r, i) => {
      const arts = r.status === "fulfilled" ? r.value : [];
      bySourceRaw[POLISH_FEEDS[i].name] = arts.length;
      allArticles.push(...arts);
    });
    for (const arts of [redditArticles, mastodonArticles, telegramArticles, youtubeArticles]) {
      tally(arts);
      allArticles = [...allArticles, ...arts];
    }
    // X bez zapytania nie ma sensownego trybu monitoringu (recent search
    // wymaga słów kluczowych) — celowo pomijamy w trybie bez query, tak
    // jak GDELT/Guardian też są tylko w trybie wyszukiwania.
  }

  allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const timeFiltered = (isSearchMode && searchMode === "google_news" && !from && !to && period === "1y")
    ? allArticles
    : filterByTime(allArticles, period, from || undefined, to || undefined);

  const queryFiltered = (isSearchMode && searchMode === "google_news")
    ? timeFiltered
    : filterByQuery(timeFiltered, q);

  // Deduplikacja przedruków (ta sama depesza z pięciu portali → jeden wpis,
  // ten o najwyższej wadze) — patrz lib/dedup.ts. Robimy to PO filtrach
  // czasu/zapytania, PRZED liczeniem sentymentu/encji/narracji, żeby żadna
  // z tych agregacji nie liczyła przedruku jako niezależnego sygnału.
  const { articles: filtered, removedCount: dedupedCount } = dedupeArticles(queryFiltered);

  const sentimentCounts = {
    positive: filtered.filter(a => a.sentiment === "positive").length,
    negative: filtered.filter(a => a.sentiment === "negative").length,
    neutral:  filtered.filter(a => a.sentiment === "neutral").length,
  };

  const entities   = await canonicalizeWithGemini(extractEntities(filtered));
  const narratives = clusterNarratives(filtered);
  const timeline   = buildTimeline(filtered);
  // Korelacja między platformami — patrz lib/cross-platform.ts. Nie liczy
  // się z nowego źródła danych, tylko z tego, co już zebraliśmy.
  const crossPlatformSignals: CrossPlatformSignal[] = correlateAcrossPlatforms(filtered);

  const bySourceWeighted: Record<string, number> = {};
  let totalWeightedReach = 0;
  for (const a of filtered) {
    bySourceWeighted[a.source] = (bySourceWeighted[a.source] ?? 0) + a.weight;
    totalWeightedReach += a.weight;
  }

  const rssLimitedPeriods = ["7d", "30d", "1y"];
  const rssNote = (!isSearchMode && rssLimitedPeriods.includes(period))
    ? "RSS feeds zawierają ostatnie ~15 artykułów z każdego źródła (ok. 24-48h). Wpisz zapytanie by wyszukać w Google News."
    : null;

  const searchInfo = isSearchMode
    ? (searchMode === "google_news"
        ? `Wyszukano w Google News + Reddit/Mastodon/GDELT/Guardian/YouTube/X: ${allArticles.length} pozycji${dedupedCount > 0 ? `, usunięto ${dedupedCount} przedruków` : ""}`
        : `Google News niedostępny — wyniki z ${POLISH_FEEDS.length} feedów RSS + inne źródła (${allArticles.length})${dedupedCount > 0 ? `, usunięto ${dedupedCount} przedruków` : ""}`)
    : null;

  return {
    articles: filtered,
    total: filtered.length,
    totalAvailable: allArticles.length,
    bySource: bySourceRaw,
    bySourceWeighted,
    totalWeightedReach: Math.round(totalWeightedReach),
    sentimentCounts,
    entities,
    narratives,
    timeline,
    crossPlatformSignals,
    query: q,
    period,
    searchMode,
    searchInfo,
    rssNote,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Handler ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const q      = req.nextUrl.searchParams.get("q") ?? "";
  const period = req.nextUrl.searchParams.get("period") ?? "24h";
  const from   = req.nextUrl.searchParams.get("from") ?? "";
  const to     = req.nextUrl.searchParams.get("to") ?? "";

  const result = await buildFeed(q, period, from || undefined, to || undefined);

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
