import { supabase } from "@/lib/supabase";
import { getAIProvider } from "@/lib/reaction-simulator/ai-provider";

// ── e-Petru: wzorzec przekazu, języka i sposobu myślenia Ryszarda Petru ──
// Baza stylu zbudowana z realnych, źródłowanych wypowiedzi (tabela
// petru_utterances) + wersjonowany profil stylu (petru_style_profile).
// Konwerter bierze dowolny przekaz i przerabia go na język i sposób
// myślenia Ryszarda Petru, korzystając z profilu i realnych cytatów jako
// wzorca głosu. Zasada twarda: stylizujemy, NIE zmyślamy faktów, liczb ani
// cudzych cytatów. To pomocnik dla Volt Stream, działa też samodzielnie.

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
    .eq("is_current", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as PetruStyleProfile) ?? null;
}

export async function listUtterances(limit = 40): Promise<PetruUtterance[]> {
  const { data, error } = await supabase
    .from("petru_utterances")
    .select("quote_text, context, channel, topic, source_name, source_url, published_date")
    .order("published_date", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data as PetruUtterance[]) ?? [];
}

export async function countUtterances(): Promise<number> {
  const { count } = await supabase
    .from("petru_utterances")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

function modeInstruction(mode: PetruMode): string {
  switch (mode) {
    case "post": return "Format: wpis do mediów społecznościowych. Mocny pierwszy zdanie-hak, konkret, na końcu wyrazista puenta lub hasło. 3 do 6 zdań.";
    case "oswiadczenie": return "Format: oficjalne oświadczenie. Chłodniejszy, bardziej formalny ton, ale wciąż z jego logiką ekonomiczną i jednoznacznością. 4 do 8 zdań.";
    case "tweet": return "Format: bardzo krótki wpis (jak na X). Jedno do dwóch zdań, najlepiej z antytezą albo hasłem.";
    default: return "Format: wypowiedź do mediów albo na wywiad. Naturalna, mówiona, 3 do 6 zdań.";
  }
}

function buildConvertPrompt(text: string, mode: PetruMode, profile: PetruStyleProfile | null, examples: PetruUtterance[]): string {
  const prof = profile ? JSON.stringify(profile.profile, null, 1) : "(brak profilu — trzymaj się cytatów wzorcowych poniżej)";
  const quotes = examples.slice(0, 22).map((u, i) => `[${i + 1}] „${u.quote_text}"${u.topic ? ` (temat: ${u.topic})` : ""}`).join("\n");
  return `Jesteś ekspertem od stylu komunikacji politycznej. Twoim zadaniem jest przerobić dowolny przekaz na JĘZYK i SPOSÓB MYŚLENIA Ryszarda Petru — tak, żeby brzmiał, jakby to on to powiedział, i był zbudowany na jego logice.

PROFIL STYLU RYSZARDA PETRU (zbudowany z realnych wypowiedzi):
${prof}

REALNE WYPOWIEDZI RYSZARDA PETRU (wzorzec głosu, składni i tików — NIE cytuj ich dosłownie, ucz się z nich brzmienia):
${quotes}

ZASADY (twarde):
- Przerób przekaz na jego język: leksyka, składnia, tiki, chwyty retoryczne (antyteza „X, a nie Y", obrazowa metafora ekonomiczna, apel anty-ideologiczny, twarda kategoryczność, pytanie retoryczne z pointą).
- Przerób też SPOSÓB MYŚLENIA: najpierw rachunek ekonomiczny i konsekwencje, nacisk na wzrost, produktywność, inwestycje, realizm budżetowy, krytyka rozdawnictwa i populizmu, pragmatyzm i kompromis.
- ZERO ZMYŚLANIA: nie dodawaj żadnych liczb, danych, sondaży, nazwisk ani cytatów, których nie ma w przekazie wejściowym. Stylizujesz sposób mówienia i myślenia, nie fabrykujesz faktów. Jeśli wejście jest ogólne, zostań ogólny, tylko w jego stylu.
- Zachowaj sens i intencję wejściowego przekazu. Nie zmieniaj tematu.
- Pisz po polsku, żywo, bez korpomowy.

${modeInstruction(mode)}

PRZEKAZ WEJŚCIOWY DO PRZEROBIENIA:
"""${text.slice(0, 4000)}"""

Zwróć WYŁĄCZNIE czysty JSON, bez markdown:
{"przerobiony": "tekst przerobiony na styl i sposób myślenia Ryszarda Petru", "uwagi": ["krótko, co zrobiłeś: jakie chwyty i jaką logikę zastosowałeś, 2-4 punkty"]}`;
}

export interface ConvertResult {
  przerobiony: string;
  uwagi: string[];
  tryb: PetruMode;
  oparto_na_wersji: number | null;
  oparto_na_liczbie_cytatow: number;
  fallback: boolean;
}

function extractJson(raw: string): { przerobiony?: string; uwagi?: string[] } | null {
  try { return JSON.parse(raw); } catch { /* try to find a JSON block */ }
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
  return null;
}

export async function convertText(text: string, mode: PetruMode): Promise<ConvertResult> {
  const [profile, examples] = await Promise.all([getStyleProfile(), listUtterances(24)]);
  const provider = getAIProvider();
  const prompt = buildConvertPrompt(text, mode, profile, examples);
  const raw = provider.isReal ? await provider.generateText(prompt, { maxTokens: 1800, temperature: 0.7, json: true, thinking: true }) : null;
  const parsed = raw ? extractJson(raw) : null;
  if (parsed && typeof parsed.przerobiony === "string" && parsed.przerobiony.trim()) {
    return {
      przerobiony: parsed.przerobiony.trim(),
      uwagi: Array.isArray(parsed.uwagi) ? parsed.uwagi.filter((x) => typeof x === "string").slice(0, 5) : [],
      tryb: mode,
      oparto_na_wersji: profile?.version ?? null,
      oparto_na_liczbie_cytatow: examples.length,
      fallback: false,
    };
  }
  return {
    przerobiony: "Nie udało się teraz przerobić przekazu (brak odpowiedzi modelu). Spróbuj ponownie za chwilę.",
    uwagi: ["Silnik AI nie zwrócił wyniku — to nie jest stylizacja, tylko komunikat techniczny."],
    tryb: mode,
    oparto_na_wersji: profile?.version ?? null,
    oparto_na_liczbie_cytatow: examples.length,
    fallback: true,
  };
}
