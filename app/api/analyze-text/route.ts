import { NextRequest, NextResponse } from "next/server";
import { buildFeed, type FeedResult } from "@/app/api/news/route";
import { fetchOpenGraphLink, extractFacebookOrInstagramUrl } from "@/lib/sources/og-link";

function emptyFeed(query: string, period: string): FeedResult {
  return {
    articles: [], total: 0, totalAvailable: 0, bySource: {}, bySourceWeighted: {}, totalWeightedReach: 0,
    sentimentCounts: { positive: 0, negative: 0, neutral: 0 }, entities: [], narratives: [], timeline: [],
    crossPlatformSignals: [],
    query, period, searchMode: "rss_filtered", searchInfo: null, rssNote: null, fetchedAt: new Date().toISOString(),
  };
}

export const maxDuration = 30;

// ── Wklej wypowiedź / opis afery → wyciągnij kluczowe frazy → przeszukaj ──
// Różnica względem zwykłego wyszukiwania: użytkownik wkleja surowy, długi
// tekst (cytat, opis sytuacji), a nie gotowe słowa kluczowe. Gemini wyciąga
// z tego 2-5 fraz nadających się do wyszukania (osoby, organizacje, temat),
// potem odpalamy dokładnie ten sam silnik co /api/news.

async function extractPhrasesWithGemini(text: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const prompt = `Poniżej jest tekst wklejony przez użytkownika — może to być cytat wypowiedzi polityka, opis afery/sytuacji, albo dowolna notatka. Twoje zadanie: wyciągnij 2-5 najlepszych fraz do wyszukania w polskich mediach, które pozwolą znaleźć realne artykuły powiązane z tym tematem.

Zasady:
- Priorytet: konkretne nazwiska, nazwy instytucji/firm, nazwy własne wydarzeń.
- Jeśli tekst zawiera cytat czyjejś wypowiedzi, wyciągnij też krótką frazę kluczową z treści wypowiedzi (3-6 słów), nie cały cytat.
- Nie zwracaj ogólników typu "polityka", "rząd", "Polska" jako samodzielnej frazy.
- Zwróć TYLKO czysty JSON: {"phrases": ["fraza1", "fraza2", ...]}, bez markdown, bez komentarzy.

Tekst:
"""${text.slice(0, 4000)}"""`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 300, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonMatch = raw.match(/\{[\s\S]+\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as { phrases?: string[] };
    return (parsed.phrases ?? []).filter((p) => typeof p === "string" && p.trim().length > 1).slice(0, 5);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { text?: string; period?: string } | null;
  const text = (body?.text ?? "").trim();
  const period = body?.period || "30d";

  if (!text) {
    return NextResponse.json({ error: "Brak tekstu do analizy." }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Ta funkcja wymaga klucza GEMINI_API_KEY ustawionego w Vercel (Project Settings → Environment Variables)." },
      { status: 503 }
    );
  }

  // Jeśli wklejony tekst to (albo zawiera) link do Facebooka/Instagrama,
  // dociągnij jego podgląd (og:title/og:description, bez logowania — patrz
  // lib/sources/og-link.ts) i potraktuj jako dodatkowy, ręcznie wskazany
  // materiał w wyniku — niezależnie od tego, czy wyciąganie fraz się uda.
  const fbIgUrl = extractFacebookOrInstagramUrl(text);
  const linkedArticlePromise = fbIgUrl ? fetchOpenGraphLink(fbIgUrl) : Promise.resolve(null);

  const phrases = await extractPhrasesWithGemini(text);
  const linkedArticle = await linkedArticlePromise;

  if (phrases.length === 0 && !linkedArticle) {
    return NextResponse.json(
      { error: "Nie udało się wyodrębnić fraz z tekstu — spróbuj wkleić dłuższy fragment z konkretnymi nazwiskami lub nazwami." },
      { status: 422 }
    );
  }

  // Łączymy frazy spacją — filterByQuery i tak dopasowuje "którekolwiek słowo",
  // więc to działa jak OR bez literalnego tokenu "OR" zaśmiecającego zapytanie.
  // Gdy nie udało się wyciągnąć żadnej frazy (np. wklejony był sam link), nie
  // odpalamy pełnego trybu monitoringu (wolne, niezwiązane z linkiem) — wynik
  // to wtedy sam podgląd linku, doklejony niżej.
  const query = phrases.join(" ");
  const feed = phrases.length > 0 ? await buildFeed(query, period) : emptyFeed(query, period);

  // Doklej ręcznie podany link FB/IG do wyniku (jeśli był i jeśli dało się
  // go odczytać) — poza silnikiem buildFeed, bo to jeden, wskazany materiał,
  // nie wynik przeszukania.
  if (linkedArticle) {
    feed.articles = [linkedArticle, ...feed.articles];
    feed.total += 1;
    feed.totalAvailable += 1;
    feed.bySource[linkedArticle.source] = (feed.bySource[linkedArticle.source] ?? 0) + 1;
    feed.bySourceWeighted[linkedArticle.source] = (feed.bySourceWeighted[linkedArticle.source] ?? 0) + linkedArticle.weight;
    feed.totalWeightedReach = Math.round(feed.totalWeightedReach + linkedArticle.weight);
    feed.sentimentCounts[linkedArticle.sentiment] += 1;
  }

  return NextResponse.json({
    extractedPhrases: phrases,
    linkedArticle,
    feed,
  }, { headers: { "Cache-Control": "no-store" } });
}
