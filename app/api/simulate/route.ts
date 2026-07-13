import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// ── Symulator reakcji AI — HIPOTEZA, nie dane z monitoringu ──────
// Do testowania niepublikowanego jeszcze draftu wypowiedzi. W przeciwieństwie
// do /api/analyze-text (które szuka REALNYCH artykułów), to jest czysta
// spekulacja modelu językowego — bo dla niepublikowanego tekstu żadna
// prawdziwa reakcja jeszcze nie istnieje. Wynik MUSI być oznaczony w UI
// jako symulacja, nigdy mieszany z prawdziwymi wynikami wyszukiwania.

export interface SimulationResult {
  attackLines: Array<{ from: string; attack: string }>;
  riskyPhrases: Array<{ phrase: string; why: string }>;
  audienceReactions: Array<{ group: string; reaction: string }>;
  mediaFraming: string;
  recommendation: "publikuj" | "zmodyfikuj" | "nie publikuj";
  recommendationReasoning: string;
}

async function runSimulation(text: string): Promise<SimulationResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Jesteś doświadczonym doradcą politycznym grającym rolę adwokata diabła. Dostajesz DRAFT wypowiedzi polityka (jeszcze niepublikowanej). Twoje zadanie: przetestować ją pod presją, zanim pójdzie w świat.

Zasady:
- Nie zakładaj z góry partii mówiącego — oceń treść i wywnioskuj, kto realistycznie by to powiedział i kto by to zaatakował.
- Bądź konkretny i bezlitosny — to ma pomóc, nie pocieszyć.
- Nie wymyślaj faktów, nazwisk konkretnych dziennikarzy ani cytatów z prawdziwych osób — mów o "mediach nieprzychylnych" czy "opozycji" ogólnie, nie o konkretnych, nieistniejących wypowiedziach.
- To jest HIPOTEZA sztucznej inteligencji, nie prawdziwe dane — pisz w taki sposób, żeby to było jasne (np. "prawdopodobnie", "może zostać odebrane jako").

Draft wypowiedzi:
"""${text.slice(0, 3000)}"""

Zwróć TYLKO czysty JSON w tej strukturze (bez markdown, bez komentarzy):
{
  "attackLines": [{"from": "np. opozycja z prawej strony", "attack": "konkretna linia ataku"}],
  "riskyPhrases": [{"phrase": "fragment cytowany z draftu", "why": "dlaczego to ryzykowne"}],
  "audienceReactions": [{"group": "np. niezdecydowani wyborcy centrum", "reaction": "jak prawdopodobnie odbiorą"}],
  "mediaFraming": "jedno-dwa zdania: co media nieprzychylne prawdopodobnie wyrwą z kontekstu",
  "recommendation": "publikuj" | "zmodyfikuj" | "nie publikuj",
  "recommendationReasoning": "krótkie uzasadnienie rekomendacji"
}
Podaj 2-4 pozycje w attackLines, 1-3 w riskyPhrases, 2-3 w audienceReactions.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1200, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonMatch = raw.match(/\{[\s\S]+\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as SimulationResult;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { text?: string } | null;
  const text = (body?.text ?? "").trim();

  if (!text) {
    return NextResponse.json({ error: "Brak tekstu do symulacji." }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Ta funkcja wymaga klucza GEMINI_API_KEY ustawionego w Vercel (Project Settings → Environment Variables)." },
      { status: 503 }
    );
  }

  const result = await runSimulation(text);
  if (!result) {
    return NextResponse.json({ error: "Symulacja nie powiodła się — spróbuj ponownie za chwilę." }, { status: 502 });
  }

  return NextResponse.json({
    disclaimer: "SYMULACJA AI — hipoteza sztucznej inteligencji, nie dane z monitoringu ani realne reakcje. Traktuj jako punkt wyjścia do dyskusji w sztabie, nie jako fakt.",
    result,
  }, { headers: { "Cache-Control": "no-store" } });
}
