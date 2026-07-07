import type { Article, WeightBasis } from "@/app/api/news/route";
import { parseRSS } from "@/lib/rss";
import { classifySentiment } from "@/lib/sentiment";

// ── X (Twitter) — priorytet #2, ale z zastrzeżeniem opisanym w analizie ──
// To jedyna platforma w tym silniku, gdzie "bez logowania" w praktyce
// oznacza "prawie nic": X od 2023 blokuje niezalogowany dostęp do treści
// znacznie agresywniej niż Reddit czy Mastodon. Dwie ścieżki:
//
// 1) fetchXOfficial — oficjalne API v2 (X_BEARER_TOKEN), RYZYKO NISKIE,
//    ale płatne od poziomu przydatnego do monitoringu. Główna, zalecana
//    droga — używana automatycznie, jeśli token jest ustawiony.
// 2) fetchXNitter — best-effort fallback bez klucza, przez publiczne
//    instancje Nitter (open-source proxy z RSS). RYZYKO: nie w sensie
//    prawnym (Nitter czyta to, co i tak jest publiczne), tylko
//    TECHNICZNYM — publiczne instancje bywają niestabilne lub martwe.
//    Dlatego: pula kilku instancji, krótki timeout, cichy fallback do []
//    jeśli żadna nie odpowie — dokładnie ten sam wzorzec co
//    Google News → Bing News w searchGoogleNews (news/route.ts).
//
// Świadomie NIE robimy: logowania, fałszywych kont, omijania blokad
// (np. przez rotację proxy pod dużym obciążeniem). Jeśli obie ścieżki
// zawiodą, funkcja zwraca [] i /api/news działa dalej na resztę źródeł.

interface XTweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: { retweet_count?: number; reply_count?: number; like_count?: number; quote_count?: number };
}
interface XUser { id: string; username?: string; name?: string }
interface XSearchResp { data?: XTweet[]; includes?: { users?: XUser[] } }

function weightForTweet(m: NonNullable<XTweet["public_metrics"]>): { weight: number; explain: string } {
  const engagement = (m.like_count ?? 0) + (m.retweet_count ?? 0) * 2 + (m.reply_count ?? 0) * 1.5 + (m.quote_count ?? 0) * 2;
  const raw = 1 + Math.log10(1 + engagement) * 2;
  const weight = Math.round(Math.min(10, Math.max(1, raw)) * 10) / 10;
  return {
    weight,
    explain: `X: ${(m.like_count ?? 0).toLocaleString("pl-PL")} polubień, ${(m.retweet_count ?? 0).toLocaleString("pl-PL")} RT, ${(m.reply_count ?? 0).toLocaleString("pl-PL")} odpowiedzi (realne liczniki, API v2)`,
  };
}

export async function fetchXOfficial(query: string): Promise<Article[]> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return [];
  try {
    const q = encodeURIComponent(`${query} lang:pl -is:retweet`);
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${q}&max_results=30&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username,name`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as XSearchResp;
    const users = new Map((data.includes?.users ?? []).map((u) => [u.id, u]));
    return (data.data ?? []).map((t) => {
      const user = t.author_id ? users.get(t.author_id) : undefined;
      const m = t.public_metrics ?? {};
      const w = weightForTweet(m);
      return {
        id: `x-${t.id}`,
        title: t.text,
        url: `https://x.com/${user?.username ?? "i"}/status/${t.id}`,
        source: `X — @${user?.username ?? "nieznany"}`,
        publishedAt: t.created_at ?? new Date().toISOString(),
        sentiment: classifySentiment(t.text),
        weight: w.weight,
        weightBasis: "social_real" as WeightBasis,
        weightExplain: w.explain,
      } as Article;
    });
  } catch {
    return [];
  }
}

// Pula publicznych instancji Nitter — jawnie oznaczona jako niestabilna.
// Lista celowo krótka: nie próbujemy "przetrwać" awarii Nittera przez
// dziesiątki instancji, bo to zaczyna wyglądać jak próba wymuszenia
// dostępu, a nie odczyt tego, co akurat działa.
const NITTER_INSTANCES = [
  "nitter.net",
  "nitter.poast.org",
];

async function fetchNitterInstance(host: string, query: string): Promise<Article[]> {
  try {
    const url = `https://${host}/search/rss?f=tweets&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NarrativeScope/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    // Nitter RSS ma kształt zgodny ze zwykłym RSS-em — reużywamy istniejący
    // parser zamiast pisać drugi. Waga: brak realnych liczników w RSS-ie
    // Nittera, więc oznaczamy to jawnie jako szacunek (social_estimate),
    // tak samo jak dla Mastodona bez API zaangażowania.
    const parsed = parseRSS(xml, `X (via Nitter)`, 30);
    return parsed.map((a: Article) => ({
      ...a,
      id: `x-nitter-${a.id}`,
      weightBasis: "social_estimate" as WeightBasis,
      weightExplain: "X przez Nitter: brak realnych liczników w RSS, waga bazowa neutralna — traktuj jako sygnał obecności, nie miarę zasięgu",
    }));
  } catch {
    return [];
  }
}

export async function fetchXNitter(query: string): Promise<Article[]> {
  for (const host of NITTER_INSTANCES) {
    const arts = await fetchNitterInstance(host, query);
    if (arts.length > 0) return arts;
  }
  return [];
}

// ── Punkt wejścia: oficjalne API ma pierwszeństwo, Nitter tylko gdy
// nie ma tokenu — nigdy oba naraz (bez sensu podwajać zapytania) ────────
export async function fetchX(query: string): Promise<Article[]> {
  if (process.env.X_BEARER_TOKEN) return fetchXOfficial(query);
  return fetchXNitter(query);
}
