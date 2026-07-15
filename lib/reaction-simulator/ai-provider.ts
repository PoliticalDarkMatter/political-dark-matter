// ── Adapter AI ──────────────────────────────────────────────────────────
// Abstrakcja nad dostawcą modelu językowego. Dziś jest jeden realny
// provider (Gemini, ten sam klucz i wzorzec co /api/simulate oraz
// /api/analyze-text — sprawdzony, działający na produkcji), plus mock
// jako twardy fallback. Orchestrator.ts zna tylko interfejs AIProvider,
// nie wie nic o Gemini — więc podpięcie kolejnego modelu to dodanie
// nowej klasy tutaj, bez dotykania orchestratora ani promptów.
//
// DOCELOWO: dodać OpenAIProvider (api.openai.com/v1/chat/completions),
// ClaudeProvider (api.anthropic.com/v1/messages) i LocalModelProvider
// (np. Ollama na własnej infrastrukturze) — każdy implementujący ten sam
// AIProvider.generateText(prompt, opts). Wybór providera przez zmienną
// środowiskową (np. AI_PROVIDER=gemini|openai|claude|local), patrz
// getAIProvider() na dole pliku.

export interface AIGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  // Wymusza structured output (application/json) — model zwraca poprawny JSON,
  // koniec z kruchym wyłuskiwaniem nawiasów z prozy.
  json?: boolean;
  // Wewnętrzne "myślenie" modelu. false = wyłączone (szybko); true = dynamiczne
  // (budżet -1, model sam decyduje, ryzyko zjedzenia limitu tokenów); LICZBA =
  // ograniczony budżet tokenów myślenia (bezpieczny kompromis: realne
  // rozumowanie bez ucinania odpowiedzi, byle maxTokens grubo je przekraczał).
  thinking?: boolean | number;
}

export interface AIProvider {
  readonly name: string;
  readonly isReal: boolean;
  generateText(prompt: string, opts?: AIGenerateOptions): Promise<string | null>;
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini-3.5-flash";
  readonly isReal = true;
  constructor(private apiKey: string) {}

  async generateText(prompt: string, opts: AIGenerateOptions = {}): Promise<string | null> {
    const { maxTokens = 2000, temperature = 0.5, timeoutMs = 25000, json = false, thinking = false } = opts;
    // thinkingBudget: 0 = bez myślenia; -1 = dynamiczne; liczba = ograniczony budżet.
    const thinkingBudget = typeof thinking === "number" ? thinking : thinking ? -1 : 0;
    try {
      const generationConfig: Record<string, unknown> = {
        temperature,
        maxOutputTokens: maxTokens,
        thinkingConfig: { thinkingBudget },
      };
      if (json) generationConfig.responseMimeType = "application/json";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    } catch {
      return null;
    }
  }
}

// Mock zwraca zawsze null z generateText — orchestrator.ts w tym miejscu
// wie, że ma podstawić wynik z mock-generators.ts (osobna, w pełni
// wypełniona ścieżka danych, nie "pusty tekst").
export class MockAIProvider implements AIProvider {
  readonly name = "mock-fallback";
  readonly isReal = false;
  async generateText(): Promise<string | null> {
    return null;
  }
}

export function getAIProvider(): AIProvider {
  // DOCELOWO: switch po process.env.AI_PROVIDER, np.:
  // if (process.env.AI_PROVIDER === "openai" && process.env.OPENAI_API_KEY) return new OpenAIProvider(...);
  // if (process.env.AI_PROVIDER === "claude" && process.env.ANTHROPIC_API_KEY) return new ClaudeProvider(...);
  const key = process.env.GEMINI_API_KEY;
  if (key) return new GeminiProvider(key);
  return new MockAIProvider();
}
