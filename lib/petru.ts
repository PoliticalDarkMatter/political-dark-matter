import { supabase } from "@/lib/supabase";
import { getAIProvider } from "@/lib/reaction-simulator/ai-provider";

// ── e-Petru: wzorzec przekazu, języka i sposobu myślenia Ryszarda Petru ──
// Baza stylu (petru_utterances) + wersjonowany profil stylu
// (petru_style_profile) służą JAKO WZORZEC GŁOSU. Efektem konwersji jest
// styl, dynamika i sposób perswazji Ryszarda Petru — NIE to, czy mówił o
// danym temacie. Konwerter zawsze produkuje wynik, dla dowolnego tematu.
// Zasada: stylizujemy język i myślenie, nie zmyślamy faktów, liczb ani cudzych cytatów.

export interface PetruUtterance {
  quote_text: string;
  context: string | null;
  channel: string;
  topic: string | null;
  source_name: string | null;
  source_url: string | null;
  published_date: string | null;
}

export interface PetruStyleProfile {
  version: number;
  based_on_count: number;
  profile: Record<string, unknown>;
  built_at: string;
}

export type PetruMode = "wypowiedz" | "post" | "oswiadczenie" | "tweet";
export interface ModeDef { id: PetruMode; label: string; hint: string; }
export const PETRU_MODES: ModeDef[] = [
  { id: "wypowiedz", label: "Wypowiedź", hint: "Wypowiedź do mediów lub na wywiad, kilka zdań." },
  { id: "post", label: "Post", hint: "Wpis do social mediów, mocny i konkretny." },
  { id: "oswiadczenie", label: "Oświadczenie", hint: "Oficjalne, chłodniejsze stanowisko." },
  { id: "tweet", label: "Krótki wpis (X)", hint: "Jedno, dwa zdania, hasło." },
];

export async function getStyleProfile(): Promise<PetruStyleProfile | null> {
  const { data, error } = await supabase
    .from("petru_style_profile")
    .select("version, based_on_count, profile, built_at")
    .eq("is_current", true).order("version", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as PetruStyleProfile) ?? null;
}

export async function listUtterances(limit = 40): Promise<PetruUtterance[]> {
  const { data, error } = await supabase
    .from("petru_utterances")
    .select("quote_text, context, channel, topic, source_name, source_url, published_date")
    .order("published_date", { ascending: false, nullsFirst: false }).limit(limit);
  if (error) throw error;
  return (data as PetruUtterance[]) ?? [];
}

export async function countUtterances(): Promise<number> {
  const { count } = await supabase.from("petru_utterances").select("id", { count: "exact", head: true });
  return count ?? 0;
}

function modeInstruction(mode: PetruMode): string {
  switch (mode) {
    case "post": return "Format: wpis do mediów społecznościowych. Mocne zdanie-hak na start, konkret, wyrazista puenta lub hasło na końcu. 3 do 6 zdań.";
    case "oswiadczenie": return "Format: oficjalne oświadczenie. Chłodniejszy, formalny ton, ale wciąż jego logika i jednoznaczność. 4 do 8 zdań.";
    case "tweet": return "Format: bardzo krótki wpis (jak na X). Jedno do dwóch zdań, najlepiej z antytezą albo hasłem.";
    default: return "Format: wypowiedź do mediów albo na wywiad. Naturalna, mówiona, 3 do 6 zdań.";
  }
}

function styleSeed(profile: PetruStyleProfile | null, examples: PetruUtterance[]): string {
  const prof = profile ? JSON.stringify(profile.profile) : "";
  const quotes = examples.slice(0, 26).map((u) => `„${u.quote_text}"`).join("\n");
  return `WZORZEC STYLU (na jego podstawie masz brzmieć, NIE cytuj dosłownie):\n${prof}\n\nPRÓBKI JEGO GŁOSU (rytm, składnia, dynamika, perswazja):\n${quotes}`;
}

function buildPrompt(text: string, mode: PetruMode, seed: string): string {
  return `Jesteś mistrzem stylizacji języka politycznego. Przepisz PONIŻSZY przekaz tak, żeby brzmiał, jakby powiedział go Ryszard Petru — jego stylem, rytmem, składnią, dynamiką i sposobem perswazji.

${seed}

JAK MASZ TO ZROBIĆ:
- Odwzoruj jego styl i DYNAMIKĘ: krótkie kategoryczne sądy, antytezy „X, a nie Y", obrazowe metafory (często ekonomiczne), apele („apeluję", „uprzedzam", „przestańmy"), pytania retoryczne z pointą, ton eksperta z dystansem, chłodna pewność siebie.
- Odwzoruj jego SPOSÓB PERSWAZJI: sprowadza sprawę do konkretu i konsekwencji, punktuje przeciwnika, stawia jasny kierunek, mówi „jako ekonomista/z doświadczenia".
- TEMAT NIE MA ZNACZENIA. Nawet jeśli Ryszard Petru nigdy nie mówił o tej sprawie, i tak masz ją ubrać w jego styl i logikę. Nie oceniaj, czy o tym mówił. Zawsze zwróć gotowy, przekonujący tekst.
- Zachowaj sens i intencję wejścia. NIE dodawaj konkretnych liczb, danych, sondaży ani cudzych cytatów, których nie ma w wejściu (stylizujesz język i myślenie, nie fabrykujesz faktów).
- Pisz po polsku, żywo, z polskimi znakami. Bez korpomowy.

${modeInstruction(mode)}

PRZEKAZ WEJŚCIOWY:
"""${text.slice(0, 4000)}"""

Zwróć WYŁĄCZNIE gotowy przerobiony tekst. Bez wstępu, bez komentarza, bez cudzysłowów, bez nagłówków.`;
}

export interface ConvertResult { przerobiony: string; tryb: PetruMode; }

function clean(s: string): string {
  return s.trim().replace(/^```[a-z]*\n?/i, "").replace(/```$/,"").replace(/^["„»]/,"").replace(/["”«]$/,"").trim();
}

export async function convertText(text: string, mode: PetruMode): Promise<ConvertResult> {
  const [profile, examples] = await Promise.all([getStyleProfile().catch(() => null), listUtterances(26).catch(() => [])]);
  const provider = getAIProvider();
  const prompt = buildPrompt(text, mode, styleSeed(profile, examples));
  // Bez trybu "myślenia" (zjadał budżet tokenów i zwracał pustkę), plain text, z jedną ponowną próbą.
  let raw = provider.isReal ? await provider.generateText(prompt, { maxTokens: 2048, temperature: 0.85 }) : null;
  if (!raw || !raw.trim()) {
    raw = provider.isReal ? await provider.generateText(prompt, { maxTokens: 1400, temperature: 0.7 }) : null;
  }
  const out = raw && raw.trim() ? clean(raw) : "";
  return { przerobiony: out, tryb: mode };
}
