// ── Ekstrakcja fraz do wyszukania przez Gemini ─────────────────────────
// Wydzielone z app/api/analyze-text/route.ts, żeby ten sam mechanizm
// (surowy tekst → 2-5 fraz nadających się do wyszukania w realnych
// mediach) dało się reużyć w app/api/reaction-check/route.ts ("Reakcja
// na przekaz/fakt") bez duplikowania wywołania Gemini. Zachowanie 1:1
// z oryginałem — żadnej zmiany logiki, tylko przeniesienie.

export async function extractPhrasesWithGemini(text: string): Promise<string[]> {
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
