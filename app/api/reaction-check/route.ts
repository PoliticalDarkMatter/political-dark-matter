import { NextRequest, NextResponse } from "next/server";
import { buildFeed } from "@/app/api/news/route";
import { fetchOpenGraphLink, extractFacebookOrInstagramUrl } from "@/lib/sources/og-link";
import { extractPhrasesWithGemini } from "@/lib/extract-phrases";
import { emptyFeed, buildCheckText, buildRealVerdict } from "@/lib/reaction-check";
import type { SimulationInput } from "@/lib/reaction-simulator/types";

export const maxDuration = 30;

// ── "Reakcja na przekaz/fakt" — sprawdzenie REALNEJ reakcji ──────────
// Różnica względem /api/reaction-simulator: symulator zgaduje (AI
// generuje hipotetyczne reakcje segmentów/mediów/przeciwników), ten
// endpoint NIE zgaduje — bierze ten sam SimulationInput (te same pola co
// symulator, patrz Jan 2026-07-07: "te same możliwości"), wyciąga z niego
// frazy do wyszukania (lib/extract-phrases.ts — dokładnie ten sam
// mechanizm co "wklej tekst" w analyze-text) i odpala prawdziwy silnik
// wyszukiwania (buildFeed, app/api/news/route.ts). Wynik to policzone
// liczby z realnych materiałów, nie interpretacja AI (lib/reaction-check.ts
// buildRealVerdict() jest w całości deterministyczne).

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { input?: SimulationInput } | null;
  const input = body?.input;

  if (!input || !input.text?.trim()) {
    return NextResponse.json({ error: "Brak treści do sprawdzenia." }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Ta funkcja wymaga klucza GEMINI_API_KEY ustawionego w Vercel (Project Settings → Environment Variables)." },
      { status: 503 }
    );
  }

  const checkText = buildCheckText(input);

  // Jeśli w tekście jest link do Facebooka/Instagrama, dociągnij jego
  // podgląd (bez logowania — patrz lib/sources/og-link.ts) niezależnie od
  // tego, czy ekstrakcja fraz się powiedzie.
  const fbIgUrl = extractFacebookOrInstagramUrl(checkText);
  const linkedArticlePromise = fbIgUrl ? fetchOpenGraphLink(fbIgUrl) : Promise.resolve(null);

  const phrases = await extractPhrasesWithGemini(checkText);
  const linkedArticle = await linkedArticlePromise;

  if (phrases.length === 0 && !linkedArticle) {
    return NextResponse.json(
      {
        error:
          "Nie udało się wyodrębnić fraz do wyszukania z podanej treści — spróbuj podać więcej szczegółów (konkretne nazwiska, nazwy, temat) w polu tekstowym albo w polach dodatkowych.",
      },
      { status: 422 }
    );
  }

  const query = phrases.join(" ");
  const period = "30d";
  const feed = phrases.length > 0 ? await buildFeed(query, period) : emptyFeed(query, period);

  if (linkedArticle) {
    feed.articles = [linkedArticle, ...feed.articles];
    feed.total += 1;
    feed.totalAvailable += 1;
    feed.bySource[linkedArticle.source] = (feed.bySource[linkedArticle.source] ?? 0) + 1;
    feed.bySourceWeighted[linkedArticle.source] = (feed.bySourceWeighted[linkedArticle.source] ?? 0) + linkedArticle.weight;
    feed.totalWeightedReach = Math.round((feed.totalWeightedReach ?? 0) + linkedArticle.weight);
    feed.sentimentCounts[linkedArticle.sentiment] += 1;
  }

  const realVerdict = buildRealVerdict(feed, query);

  return NextResponse.json(
    {
      checkedText: checkText.slice(0, 800),
      extractedPhrases: phrases,
      linkedArticle,
      feed,
      realVerdict,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
