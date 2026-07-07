import { NextRequest, NextResponse } from "next/server";
import { buildFeed } from "@/app/api/news/route";
import { fetchOpenGraphLink, extractFacebookOrInstagramUrl } from "@/lib/sources/og-link";
import { extractPhrasesWithGemini } from "@/lib/extract-phrases";
import { emptyFeed } from "@/lib/reaction-check";

export const maxDuration = 30;

// ── Wklej wypowiedź / opis afery → wyciągnij kluczowe frazy → przeszukaj ──
// Różnica względem zwykłego wyszukiwania: użytkownik wkleja surowy, długi
// tekst (cytat, opis sytuacji), a nie gotowe słowa kluczowe. Gemini wyciąga
// z tego 2-5 fraz nadających się do wyszukania (osoby, organizacje, temat),
// potem odpalamy dokładnie ten sam silnik co /api/news. Ekstrakcja fraz
// (lib/extract-phrases.ts) i pusty FeedResult (lib/reaction-check.ts) są
// dziś współdzielone z app/api/reaction-check/route.ts.

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
