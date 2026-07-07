import type { Article, WeightBasis } from "@/app/api/news/route";
import { classifySentiment } from "@/lib/sentiment";

// ── YouTube Data API v3 — oficjalne API, priorytet #1 wśród social media ──
// Zero scrapowania, zero logowania — czysto oficjalny klucz Google Cloud
// (YOUTUBE_API_KEY w zmiennych środowiskowych Vercel). Bez klucza wszystkie
// funkcje poniżej po cichu zwracają [] — dokładnie ten sam wzorzec co
// SHAREDCOUNT_API_KEY w enrich-reach/route.ts — /api/news ma działać
// dalej normalnie, tylko bez tej jednej warstwy.
//
// Głębokość NIE przez liczbę zapytań "search" (kosztowne: 100 jednostek
// z dziennego budżetu 10 000), tylko przez komentarze pod filmami z
// kuratorowanej listy kanałów (commentThreads.list — 1 jednostka/stronę).
// To jest właściwe źródło głębi: realne reakcje pod filmami polityków
// i programów publicystycznych, nie sam fakt, że film istnieje.
//
// RODO: commentThreads.list zwraca autora komentarza (nazwa kanału, avatar).
// Świadomie NIE przechowujemy tych identyfikatorów w Supabase (patrz
// buildFeed w news/route.ts — Article nie ma pola authorId) — tylko treść,
// sentyment i realne liczniki (likeCount), zagregowane do poziomu posta.

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// CELOWO pusta lista — tak samo jak TELEGRAM_CHANNELS w news/route.ts.
// Monitoring polityczny wymaga zweryfikowanych, realnych ID kanałów, nie
// zgadywania nazw. Jan podaje listę (channel ID, nie @handle — handle
// trzeba raz zamienić na ID przez channels.list?forHandle=), potem od razu
// zaczyna działać bez dalszych zmian w kodzie.
export const YOUTUBE_CHANNELS: string[] = [];

interface YtSearchItem { id?: { videoId?: string }; snippet?: { title?: string; publishedAt?: string; channelTitle?: string } }
interface YtSearchResp { items?: YtSearchItem[] }

interface YtVideoStats { viewCount?: string; likeCount?: string; commentCount?: string }
interface YtVideoItem { id: string; statistics?: YtVideoStats; snippet?: { title?: string; publishedAt?: string; channelTitle?: string } }
interface YtVideosResp { items?: YtVideoItem[] }

interface YtCommentSnippet {
  textDisplay?: string;
  likeCount?: number;
  publishedAt?: string;
  authorDisplayName?: string;
}
interface YtCommentThreadItem {
  snippet?: { topLevelComment?: { snippet?: YtCommentSnippet }; totalReplyCount?: number };
}
interface YtCommentThreadsResp { items?: YtCommentThreadItem[] }

function weightForYouTube(views: number, likes: number, comments: number): { weight: number; explain: string } {
  // Log-skala z realnych liczników (te same nie-szacowane dane, jakie widać
  // publicznie pod filmem) — engagement (likes+comments) waży więcej niż
  // gołe wyświetlenia, bo lepiej oddaje realną reakcję, nie tylko zasięg.
  const engagement = likes * 2 + comments * 4;
  const raw = 1 + Math.log10(1 + views) * 0.9 + Math.log10(1 + engagement) * 1.1;
  const weight = Math.round(Math.min(10, Math.max(1, raw)) * 10) / 10;
  return {
    weight,
    explain: `YouTube: ${views.toLocaleString("pl-PL")} wyświetleń, ${likes.toLocaleString("pl-PL")} polubień, ${comments.toLocaleString("pl-PL")} komentarzy (realne liczniki)`,
  };
}

function weightForYouTubeComment(likeCount: number): { weight: number; explain: string } {
  const raw = 1 + Math.log10(1 + likeCount) * 2.2;
  const weight = Math.round(Math.min(10, Math.max(1, raw)) * 10) / 10;
  return { weight, explain: `YouTube — komentarz: ${likeCount.toLocaleString("pl-PL")} polubień (realny licznik)` };
}

async function ytFetch<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  try {
    const qs = new URLSearchParams({ ...params, key: apiKey });
    const res = await fetch(`${YOUTUBE_API_BASE}/${path}?${qs.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── Tryb wyszukiwania: search.list (kosztowne — 100 jednostek/wywołanie,
// dlatego odpalane raz, tylko gdy Jan wpisał konkretne zapytanie) ────────
export async function fetchYouTubeSearch(query: string): Promise<Article[]> {
  const search = await ytFetch<YtSearchResp>("search", {
    part: "snippet",
    q: query,
    type: "video",
    order: "relevance",
    relevanceLanguage: "pl",
    regionCode: "PL",
    maxResults: "15",
  });
  const videoIds = (search?.items ?? [])
    .map((it) => it.id?.videoId)
    .filter((id): id is string => !!id);
  if (videoIds.length === 0) return [];

  // Drugie wywołanie po realne statystyki (views/likes/comments) — bez tego
  // waga byłaby zgadywana, a nie policzona z realnych liczników.
  const stats = await ytFetch<YtVideosResp>("videos", {
    part: "statistics,snippet",
    id: videoIds.join(","),
  });

  return (stats?.items ?? []).map((v, i) => {
    const title = v.snippet?.title ?? "";
    if (!title) return null;
    const views = parseInt(v.statistics?.viewCount ?? "0", 10) || 0;
    const likes = parseInt(v.statistics?.likeCount ?? "0", 10) || 0;
    const comments = parseInt(v.statistics?.commentCount ?? "0", 10) || 0;
    const w = weightForYouTube(views, likes, comments);
    return {
      id: `yt-search-${v.id}-${i}`,
      title,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      source: `YouTube — ${v.snippet?.channelTitle ?? "nieznany kanał"}`,
      publishedAt: v.snippet?.publishedAt ?? new Date().toISOString(),
      sentiment: classifySentiment(title),
      weight: w.weight,
      weightBasis: "social_real" as WeightBasis,
      weightExplain: w.explain,
    } as Article;
  }).filter(Boolean) as Article[];
}

// ── Tryb monitoringu: komentarze pod ostatnimi filmami kuratorowanych
// kanałów — tu jest realna głębia (rekurencyjnie: kanał → film → wątek
// komentarzy), nie w samym wyszukiwaniu ─────────────────────────────────
async function fetchLatestVideoIdsForChannel(channelId: string): Promise<string[]> {
  const search = await ytFetch<YtSearchResp>("search", {
    part: "snippet",
    channelId,
    type: "video",
    order: "date",
    maxResults: "5",
  });
  return (search?.items ?? []).map((it) => it.id?.videoId).filter((id): id is string => !!id);
}

async function fetchCommentThreads(videoId: string, videoTitle: string, channelName: string): Promise<Article[]> {
  const resp = await ytFetch<YtCommentThreadsResp>("commentThreads", {
    part: "snippet",
    videoId,
    order: "relevance",
    maxResults: "40",
    textFormat: "plainText",
  });
  return (resp?.items ?? []).map((item, i) => {
    const c = item.snippet?.topLevelComment?.snippet;
    const text = (c?.textDisplay ?? "").trim();
    if (!text) return null;
    const w = weightForYouTubeComment(c?.likeCount ?? 0);
    return {
      id: `yt-comment-${videoId}-${i}`,
      title: `[komentarz pod „${videoTitle.slice(0, 60)}”] ${text.slice(0, 200)}`,
      url: `https://www.youtube.com/watch?v=${videoId}&lc=`,
      source: `YouTube — komentarze (${channelName})`,
      publishedAt: c?.publishedAt ?? new Date().toISOString(),
      sentiment: classifySentiment(text),
      weight: w.weight,
      weightBasis: "social_real" as WeightBasis,
      weightExplain: w.explain,
    } as Article;
  }).filter(Boolean) as Article[];
}

async function fetchChannelDeep(channelId: string): Promise<Article[]> {
  const videoIds = await fetchLatestVideoIdsForChannel(channelId);
  if (videoIds.length === 0) return [];

  const stats = await ytFetch<YtVideosResp>("videos", { part: "snippet,statistics", id: videoIds.join(",") });
  const videos = stats?.items ?? [];

  const videoArticles = videos.map((v) => {
    const title = v.snippet?.title ?? "";
    if (!title) return null;
    const views = parseInt(v.statistics?.viewCount ?? "0", 10) || 0;
    const likes = parseInt(v.statistics?.likeCount ?? "0", 10) || 0;
    const comments = parseInt(v.statistics?.commentCount ?? "0", 10) || 0;
    const w = weightForYouTube(views, likes, comments);
    return {
      id: `yt-video-${v.id}`,
      title,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      source: `YouTube — ${v.snippet?.channelTitle ?? channelId}`,
      publishedAt: v.snippet?.publishedAt ?? new Date().toISOString(),
      sentiment: classifySentiment(title),
      weight: w.weight,
      weightBasis: "social_real" as WeightBasis,
      weightExplain: w.explain,
    } as Article;
  }).filter(Boolean) as Article[];

  // Rekurencja: dla top 2 filmów danego kanału (po wyświetleniach) idziemy
  // w komentarze — nie dla wszystkich 5, żeby nie przekroczyć maxDuration=30s
  // na Vercelu przy wielu kanałach naraz.
  const topVideos = [...videos]
    .filter((v) => v.snippet?.title)
    .sort((a, b) => (parseInt(b.statistics?.viewCount ?? "0", 10) || 0) - (parseInt(a.statistics?.viewCount ?? "0", 10) || 0))
    .slice(0, 2);

  const commentBatches = await Promise.allSettled(
    topVideos.map((v) => fetchCommentThreads(v.id, v.snippet?.title ?? "", v.snippet?.channelTitle ?? channelId))
  );
  const commentArticles = commentBatches.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  return [...videoArticles, ...commentArticles];
}

export async function fetchYouTubeMonitor(): Promise<Article[]> {
  if (YOUTUBE_CHANNELS.length === 0) return [];
  if (!process.env.YOUTUBE_API_KEY) return [];
  const results = await Promise.allSettled(YOUTUBE_CHANNELS.map(fetchChannelDeep));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
