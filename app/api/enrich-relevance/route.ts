import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// ── Miękka klasyfikacja polityczności + narracji przez Gemini ────────────
// Świadomie ODDZIELONE od /api/news, tym samym wzorcem co enrich-sentiment
// i enrich-reach: główny feed ma zostać szybki i deterministyczny (sztywne
// NARRATIVE_SEEDS po słowach kluczowych, jak dziś), to jest druga, wolniejsza
// fala wywoływana w tle po pierwszym renderze, dla ograniczonej partii
// artykułów naraz (BATCH_LIMIT).
//
// Cel: NARRATIVE_SEEDS w news/route.ts działa dobrze dla oczywistych
// przypadków ("sejm", "minister" -> Polityka), ale gubi artykuły, które są
// politycznie istotne bez oczywistych słów kluczowych w samym tytule
// (np. tytuł mówiący tylko o nazwisku, bez słowa "polityka"). Gemini
// dostaje surowe tytuły i dopasowuje je do tej samej listy etykiet, jakiej
// używa UI — więc wynik da się bezpośrednio poskładać z istniejącymi
// narracjami, bez wprowadzania nowej taksonomii.
//
// UWAGA (świadome ograniczenie): brak cache w Supabase w tej wersji —
// dodanie go wymagałoby nowych kolumn w tabeli `mentions` (np.
// is_political, narrative_label, relevance_checked_at), a to jest zmiana
// schematu bazy, której nie robię bez wyraźnej decyzji. Dziś każde
// wywołanie liczy się na nowo — przy BATCH_LIMIT=30 i tanim modelu
// (gemini-2.5-flash, thinkingBudget=0) to nadal szybkie i tanie, tylko
// nie jest cache'owane między odświeżeniami tak jak sentyment/zasięg.

const BATCH_LIMIT = 30;

const NARRATIVE_LABELS = [
  "Polityka", "Gospodarka", "Bezpieczenstwo", "Zdrowie", "Wypadki", "Prawo i sady", "Spoleczenstwo",
];

interface RelevanceItem { url: string; title: string }
interface RelevanceOut { isPolitical: boolean; narrative: string | null; confidence: number }

async function classifyBatchWithGemini(items: RelevanceItem[]): Promise<Record<string, RelevanceOut>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || items.length === 0) return {};

  const numbered = items.map((it, i) => `${i}: ${it.title}`).join("\n");
  const prompt = `Poniżej jest lista tytułów artykułów/postów po polsku, każdy z numerem.
Dla KAŻDEGO numeru oceń:
1. "political": czy treść dotyczy polityki polskiej lub ma bezpośrednie znaczenie polityczne (partie, wybory, rząd, politycy, decyzje władz, afery polityczne) — true/false. Sport, pogoda, rozrywka, wypadki bez kontekstu politycznego = false.
2. "narrative": jeśli political=true, przypisz JEDNĄ z etykiet: ${JSON.stringify(NARRATIVE_LABELS)}. Jeśli political=false, zwróć null.
3. "confidence": liczba 0-1, jak pewna jest ta ocena.

Tytuły:
${numbered}

Odpowiedz TYLKO czystym JSON, bez markdown: {"0": {"political": true, "narrative": "Polityka", "confidence": 0.9}, "1": {...}, ...}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 2000, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return {};
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (!jsonMatch) return {};
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, { political?: boolean; narrative?: string | null; confidence?: number }>;

    const out: Record<string, RelevanceOut> = {};
    for (const [idxStr, val] of Object.entries(parsed)) {
      const idx = parseInt(idxStr, 10);
      const item = items[idx];
      if (!item) continue;
      const narrative = val.narrative && NARRATIVE_LABELS.includes(val.narrative) ? val.narrative : null;
      out[item.url] = {
        isPolitical: !!val.political,
        narrative: val.political ? narrative : null,
        confidence: typeof val.confidence === "number" ? Math.max(0, Math.min(1, val.confidence)) : 0.5,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { items?: RelevanceItem[] } | null;
  const items = (body?.items ?? [])
    .filter((it) => it && typeof it.url === "string" && typeof it.title === "string" && it.title.trim().length > 0)
    .slice(0, BATCH_LIMIT);

  if (items.length === 0) {
    return NextResponse.json({ results: {} });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ results: {}, note: "GEMINI_API_KEY nieustawiony — pomijam miękką klasyfikację narracji" });
  }

  const results = await classifyBatchWithGemini(items);
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
