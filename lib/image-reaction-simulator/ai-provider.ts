// ── Adapter AI wizualnej ──────────────────────────────────────────────
// Ten sam wzorzec co lib/reaction-simulator/ai-provider.ts (moduł
// tekstowy): orchestrator.ts zna tylko interfejs, nie wie nic o Gemini.
// RÓŻNICA od modułu tekstowego: tu są DWIE metody. generateFromImage()
// jest wywoływana RAZ, na starcie (krok "Vision Observation") — jedyne
// miejsce, gdzie obraz faktycznie trafia do modelu. generateText() jest
// zwykłym wywołaniem tekstowym, używanym przez wszystkie kolejne 7
// kroków, które pracują już na strukturalnym opisie ze stopnia 2, a nie
// na surowych bajtach zdjęcia — patrz uzasadnienie w orchestrator.ts
// ("unikanie zbędnych wywołań Vision AI", sekcja 3.6 specyfikacji).
//
// DOCELOWO: ClaudeVisionProvider (api.anthropic.com, obrazy jako base64
// w content blocks), OpenAIVisionProvider (gpt-4o, image_url z base64),
// LocalVisionModelProvider (np. Ollama + llava/qwen-vl na własnej
// infrastrukturze) — każdy implementujący ten sam VisionAIProvider.

export interface AIGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface VisionAIProvider {
  readonly name: string;
  readonly isReal: boolean;
  generateFromImage(prompt: string, imageBase64: string, mimeType: string, opts?: AIGenerateOptions): Promise<string | null>;
  generateText(prompt: string, opts?: AIGenerateOptions): Promise<string | null>;
}

export class GeminiVisionProvider implements VisionAIProvider {
  readonly name = "gemini-2.5-flash";
  readonly isReal = true;
  constructor(private apiKey: string) {}

  private async call(parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>, opts: AIGenerateOptions): Promise<string | null> {
    const { maxTokens = 2000, temperature = 0.5, timeoutMs = 28000 } = opts;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
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

  async generateFromImage(prompt: string, imageBase64: string, mimeType: string, opts: AIGenerateOptions = {}): Promise<string | null> {
    return this.call([{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }], opts);
  }

  async generateText(prompt: string, opts: AIGenerateOptions = {}): Promise<string | null> {
    return this.call([{ text: prompt }], opts);
  }
}

// Mock zwraca zawsze null — orchestrator.ts wie, że ma podstawić wynik
// z mock-generators.ts (pełna, ustrukturyzowana ścieżka fallbackowa).
export class MockVisionAIProvider implements VisionAIProvider {
  readonly name = "mock-fallback";
  readonly isReal = false;
  async generateFromImage(): Promise<string | null> { return null; }
  async generateText(): Promise<string | null> { return null; }
}

export function getVisionAIProvider(): VisionAIProvider {
  // DOCELOWO: switch po process.env.AI_PROVIDER, analogicznie do modułu
  // tekstowego — patrz lib/reaction-simulator/ai-provider.ts.
  const key = process.env.GEMINI_API_KEY;
  if (key) return new GeminiVisionProvider(key);
  return new MockVisionAIProvider();
}
