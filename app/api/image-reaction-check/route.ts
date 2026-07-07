import { NextRequest, NextResponse } from "next/server";
import { buildFeed } from "@/app/api/news/route";
import { fetchOpenGraphLink } from "@/lib/sources/og-link";
import { analyzeImageForSearch } from "@/lib/image-reaction-check";
import { emptyFeed, buildRealVerdict } from "@/lib/reaction-check";

// ── "Reakcja na zdjęcie/mem" — sprawdzenie REALNEJ reakcji na obraz ──
// Wejście: zdjęcie już krążące w sieci (+ opcjonalny link źródłowy i
// kontekst od użytkownika). Krok 1: Gemini Vision opisuje zdjęcie i
// proponuje frazy do wyszukania (lib/image-reaction-check.ts — ŻADNEGO
// reverse image search, patrz zastrzeżenie w tym pliku). Krok 2: jeśli
// podano link źródłowy, dociągamy jego podgląd OG (lib/sources/og-link.ts,
// bez logowania). Krok 3: prawdziwe wyszukiwanie fraz w mediach
// (buildFeed, dokładnie ten sam silnik co /api/news i /api/reaction-check).
// Krok 4: deterministyczny bilans (lib/reaction-check.ts) — bez AI.

export const maxDuration = 30;

interface Body {
  imageBase64?: string;
  mimeType?: string;
  who?: string;
  context?: string;
  sourceUrl?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;

  if (!body?.imageBase64 || !body?.mimeType) {
    return NextResponse.json({ error: "Brak zdjęcia do analizy." }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Ta funkcja wymaga klucza GEMINI_API_KEY ustawionego w Vercel (Project Settings → Environment Variables)." },
      { status: 503 }
    );
  }

  const who = (body.who ?? "").trim();
  const context = (body.context ?? "").trim();
  const sourceUrl = (body.sourceUrl ?? "").trim();

  const linkedArticlePromise = sourceUrl && /^https?:\/\//i.test(sourceUrl)
    ? fetchOpenGraphLink(sourceUrl)
    : Promise.resolve(null);

  const analysis = await analyzeImageForSearch(body.imageBase64, body.mimeType, context, who);
  const linkedArticle = await linkedArticlePromise;

  const queryParts = Array.from(new Set([...analysis.suggestedKeywords, who].map((s) => s.trim()).filter(Boolean)));
  const query = queryParts.join(" ");

  if (!query && !linkedArticle) {
    return NextResponse.json(
      {
        error:
          "Nie udało się wygenerować fraz do wyszukania z tego zdjęcia — uzupełnij pole „Kogo/czego dotyczy” albo „Kontekst”, albo podaj link źródłowy, jeśli go znasz.",
      },
      { status: 422 }
    );
  }

  const period = "30d";
  const feed = query ? await buildFeed(query, period) : emptyFeed(query, period);

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
      imageAnalysis: analysis,
      extractedKeywords: queryParts,
      linkedArticle,
      feed,
      realVerdict,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
