// ── "Reakcja na zdjęcie/mem" — analiza wizji do wyszukiwania ──────────
// W przeciwieństwie do Symulatora zdjęć (lib/image-reaction-simulator/*),
// ten moduł nie ocenia ryzyka ani nie przewiduje reakcji — jego jedyne
// zadanie to zamienić zdjęcie/mem, który JUŻ krąży w sieci, na dobre
// frazy do PRAWDZIWEGO wyszukania (buildFeed, app/api/news/route.ts).
// Reużywa dokładnie ten sam adapter Vision AI co symulator
// (lib/image-reaction-simulator/ai-provider.ts) — jeden model, jedna
// abstrakcja, żadnego nowego dostawcy do utrzymania.
//
// WAŻNE ograniczenie, zgodne z zasadą "zero halucynacji": to NIE jest
// wyszukiwanie obrazem (reverse image search) — nie ma tu żadnego API do
// tego (Google Reverse Image Search / TinEye nie mają darmowego,
// zgodnego z ToS API; SerpAPI jest płatne i nie zostało zamówione).
// Model tylko OPISUJE zdjęcie i proponuje frazy tekstowe — to, czy w
// realnym wyszukiwaniu faktycznie znajdą się materiały O TYM KONKRETNYM
// zdjęciu, zależy od tego, czy ktoś już o nim pisał pod tymi słowami.
// Ten fakt jest jawnie zakomunikowany w UI (app/image-reaction-check).

import { getVisionAIProvider } from "./image-reaction-simulator/ai-provider";

export interface ImageKeywordAnalysis {
  description: string;
  detectedEntities: string[];
  visibleText: string | null;
  suggestedKeywords: string[];
  isReal: boolean; // false = brak klucza Gemini / błąd modelu, wynik pusty (fallback)
}

const FALLBACK: Omit<ImageKeywordAnalysis, "isReal"> = {
  description: "",
  detectedEntities: [],
  visibleText: null,
  suggestedKeywords: [],
};

export async function analyzeImageForSearch(
  imageBase64: string,
  mimeType: string,
  context: string,
  who: string
): Promise<ImageKeywordAnalysis> {
  const provider = getVisionAIProvider();
  if (!provider.isReal) return { ...FALLBACK, isReal: false };

  const prompt = `Poniżej jest zdjęcie/mem, który już krąży w internecie — użytkownik chce sprawdzić, czy i jak realnie się o nim pisze. Twoje zadanie: opisz je neutralnie i zaproponuj frazy do wyszukania w polskich mediach/sieci.

${who ? `Kontekst od użytkownika — kogo/czego dotyczy: ${who}\n` : ""}${context ? `Dodatkowy kontekst od użytkownika: ${context}\n` : ""}
Zasady:
- Rozpoznaj widoczne osoby publiczne, jeśli to możliwe po samym wyglądzie — NIE zgaduj tożsamości nieznanych, prywatnych osób, nie twórz nazwisk, których nie jesteś pewien.
- Odczytaj widoczny tekst na zdjęciu (napisy, plakietki, cytaty w grafice), jeśli jest.
- Zaproponuj 2-5 fraz do wyszukania: nazwiska, nazwy wydarzeń, charakterystyczne słowa z obrazu/tekstu — nie ogólniki.
- Zwróć TYLKO czysty JSON w formacie: {"description": "...", "detectedEntities": ["..."], "visibleText": "..." albo null, "suggestedKeywords": ["...", "..."]}, bez markdown, bez komentarzy.`;

  const raw = await provider.generateFromImage(prompt, imageBase64, mimeType, { maxTokens: 500, temperature: 0.2, timeoutMs: 20000 });
  if (!raw) return { ...FALLBACK, isReal: false };

  try {
    const match = raw.match(/\{[\s\S]+\}/);
    if (!match) return { ...FALLBACK, isReal: false };
    const parsed = JSON.parse(match[0]) as Partial<Record<keyof typeof FALLBACK, unknown>>;
    return {
      description: typeof parsed.description === "string" ? parsed.description : "",
      detectedEntities: Array.isArray(parsed.detectedEntities)
        ? parsed.detectedEntities.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 8)
        : [],
      visibleText: typeof parsed.visibleText === "string" && parsed.visibleText.trim() ? parsed.visibleText : null,
      suggestedKeywords: Array.isArray(parsed.suggestedKeywords)
        ? parsed.suggestedKeywords.filter((x): x is string => typeof x === "string" && x.trim().length > 1).slice(0, 5)
        : [],
      isReal: true,
    };
  } catch {
    return { ...FALLBACK, isReal: false };
  }
}
