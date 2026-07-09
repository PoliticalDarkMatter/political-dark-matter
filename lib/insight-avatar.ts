import { supabase } from "@/lib/supabase";
import { getAIProvider } from "@/lib/reaction-simulator/ai-provider";
import type { InsightQueryResult } from "@/lib/insight";

// ── Insight Base: awatar grupy społecznej ────────────────────────────────
// Wirtualna osobowość grupy zbudowana WYŁĄCZNIE z dowodów w bazie
// (insight_group_personas — profil deterministyczny przebudowywany po każdej
// ingestii, plus dowody dobrane pod konkretne pytanie przez query_insight).
// Model językowy nadaje głos, ale nie ma prawa dodać żadnej tezy bez dowodu:
// każde zdanie odpowiedzi musi wskazywać numer dowodu z listy, a odpowiedź
// wraca do UI razem z pełną listą dowodów ("skąd to wiem").

export interface PersonaRow {
  group_id: string;
  version: number;
  data_coverage: "brak" | "szczatkowe" | "czesciowe" | "dobre";
  evidence_counts: { findings?: number; evidence?: number };
  profile: {
    grupa?: { wymiar?: string; wartosc?: string; etykieta?: string };
    postawy_i_zachowania?: PersonaClaim[];
    charakterystyka_jakosciowa?: PersonaQualitative[];
  };
  built_at: string;
}

export interface PersonaClaim {
  temat: string;
  pytanie?: string;
  wartosc?: number | null;
  liczba_pomiarow?: number;
  srednia_w_wymiarze?: number | null;
  cytaty?: string[];
  zrodla?: { badanie?: string; url?: string; data?: string }[];
  score?: number;
}

export interface PersonaQualitative {
  teza?: string;
  cytat?: string;
  typ?: string;
  zrodlo?: string;
  url?: string;
  data?: string;
  score?: number;
}

export interface AvatarEvidence {
  nr: number;
  tekst: string;
  zrodlo: string;
  url: string | null;
  data: string | null;
  score: number | null;
  rodzaj: "profil_grupy" | "dopasowane_do_pytania" | "synteza" | "kontekst_spoza_grupy";
}

export interface AvatarAnswer {
  answer: string;
  confidence: "wysoka" | "srednia" | "niska";
  usedEvidence: number[];
  caveats: string | null;
  evidence: AvatarEvidence[];
  coverage: PersonaRow["data_coverage"];
  personaVersion: number;
  aiReal: boolean;
}

export async function getPersonaByGroupValue(groupValue: string): Promise<PersonaRow | null> {
  const { data: tax, error: taxErr } = await supabase
    .from("insight_group_taxonomy")
    .select("id, dimension, value, label_pl")
    .eq("value", groupValue)
    .limit(1);
  if (taxErr) throw taxErr;
  const group = tax?.[0];
  if (!group) return null;

  const { data, error } = await supabase
    .from("insight_group_personas")
    .select("group_id, version, data_coverage, evidence_counts, profile, built_at")
    .eq("group_id", group.id)
    .eq("status", "aktualna")
    .limit(1);
  if (error) throw error;
  return (data?.[0] as PersonaRow | undefined) ?? null;
}

function fmtDate(d?: string | null): string {
  return d ? ` (${d})` : "";
}

// Buduje ponumerowaną listę dowodów: najpierw dowody dobrane pod pytanie
// (query_insight, fuzzy match), potem profil grupy. Limit twardy, żeby prompt
// nie puchł — profil ważniejszy jakościowo idzie w całości przed obcięciem.
export function buildEvidenceList(
  persona: PersonaRow,
  matched: InsightQueryResult | null,
  matchedGlobal: InsightQueryResult | null = null,
  cap = 60
): AvatarEvidence[] {
  const out: AvatarEvidence[] = [];
  let nr = 1;

  for (const s of matched?.syntheses ?? []) {
    out.push({
      nr: nr++,
      tekst: `SYNTEZA (${s.topic}): ${s.synthesis_text}${s.divergence_note ? ` ROZBIEŻNOŚĆ ŹRÓDEŁ: ${s.divergence_note}` : ""}`,
      zrodlo: (s.sources ?? []).map((x) => x.title).join("; ") || "synteza międzybadawcza",
      url: s.sources?.[0]?.url ?? null,
      data: s.last_updated_at ?? null,
      score: 85,
      rodzaj: "synteza",
    });
  }

  for (const f of matched?.raw_findings ?? []) {
    if (out.length >= cap) break;
    out.push({
      nr: nr++,
      tekst: f.verbatim_quote ?? `${f.topic}: ${f.value ?? f.value_text ?? "?"}`,
      zrodlo: f.study_title,
      url: f.source_url ?? null,
      data: f.published_date ?? null,
      score: f.confidence === "twardy_wynik_sondazowy" ? 90 : 55,
      rodzaj: "dopasowane_do_pytania",
    });
  }

  // Kontekst spoza grupy: ten sam temat w calej populacji lub innych grupach.
  // Awatar NIE moze przypisywac tych liczb wlasnej grupie - sluza do wnioskowania,
  // zawsze oznaczanego w odpowiedzi jako wnioskowanie, nie fakt o grupie.
  const seen = new Set(out.map((e) => e.tekst));
  for (const f of matchedGlobal?.raw_findings ?? []) {
    if (out.length >= cap) break;
    const tekst = f.verbatim_quote ?? `${f.topic}: ${f.value ?? f.value_text ?? "?"}`;
    if (seen.has(tekst)) continue;
    seen.add(tekst);
    out.push({
      nr: nr++,
      tekst,
      zrodlo: f.study_title,
      url: f.source_url ?? null,
      data: f.published_date ?? null,
      score: f.confidence === "twardy_wynik_sondazowy" ? 75 : 45,
      rodzaj: "kontekst_spoza_grupy",
    });
  }

  for (const q of persona.profile.charakterystyka_jakosciowa ?? []) {
    if (out.length >= cap) break;
    out.push({
      nr: nr++,
      tekst: q.cytat ?? q.teza ?? "",
      zrodlo: q.zrodlo ?? "analiza jakościowa",
      url: q.url ?? null,
      data: q.data ?? null,
      score: q.score ?? null,
      rodzaj: "profil_grupy",
    });
  }

  for (const c of persona.profile.postawy_i_zachowania ?? []) {
    if (out.length >= cap) break;
    const cmp =
      c.srednia_w_wymiarze != null && c.wartosc != null
        ? ` [średnia dla grup tego wymiaru: ${c.srednia_w_wymiarze}%]`
        : "";
    out.push({
      nr: nr++,
      tekst: `${(c.cytaty ?? []).join(" | ") || `${c.temat}: ${c.wartosc ?? "?"}%`}${cmp}`,
      zrodlo: (c.zrodla ?? []).map((z) => z.badanie).filter(Boolean).join("; ") || "badanie w bazie",
      url: c.zrodla?.[0]?.url ?? null,
      data: c.zrodla?.[0]?.data ?? null,
      score: c.score ?? null,
      rodzaj: "profil_grupy",
    });
  }

  return out;
}

export interface AvatarTurn {
  role: "user" | "avatar";
  text: string;
}

function buildPrompt(
  label: string,
  question: string,
  evidence: AvatarEvidence[],
  history: AvatarTurn[]
): string {
  const today = new Date().toISOString().slice(0, 10);
  const evidenceBlock = evidence
    .map((e) => `[${e.nr}] ${e.tekst} — źródło: ${e.zrodlo}${fmtDate(e.data)}`)
    .join("\n");

  const historyBlock = history.length
    ? `\nDOTYCHCZASOWA ROZMOWA:\n${history
        .slice(-6)
        .map((t) => `${t.role === "user" ? "Pytający" : "Ty"}: ${t.text}`)
        .join("\n")}\n`
    : "";

  return `Jesteś awatarem polskiej grupy społecznej: ${label}. Mówisz w pierwszej osobie, naturalnym, potocznym polskim językiem, jak zwykły człowiek z tej grupy — bez karykatury, bez przerysowania, bez urzędowego tonu.

MASZ DWA TRYBY MÓWIENIA I OBA SĄ DOZWOLONE:
A) FAKT O NAS — twierdzenie wprost poparte dowodem o Twojej grupie. Po takim zdaniu numer dowodu: [3].
B) WNIOSKOWANIE — skojarzenie kilku dowodów w spójny obraz. Wolno Ci (a wręcz masz obowiązek, gdy pytanie tego wymaga) ŁĄCZYĆ: profil wartości i stylu życia Twojej grupy + dowody o temacie pytania spoza grupy (dane ogólnopolskie, inne grupy — oznaczone jako KONTEKST) i wyciągać z tego psychologicznie sensowny wniosek, jak Twoja grupa najpewniej to odbiera. Takie zdanie MUSI zaczynać się od sygnału niepewności w naturalnym języku („pewnie", „chyba", „zgaduję, że", „sądząc po tym, jak żyjemy") i kończyć numerami dowodów, z których wnioskujesz: (wnioskuję z [2], [7]).

ŻELAZNE ZASADY:
1. Żadnych liczb, nazwisk ani zdarzeń, których nie ma w dowodach. Liczby tylko dokładnie takie, jak w dowodach, i tylko przy trybie A lub jako jawnie cytowany kontekst.
2. Liczb z dowodów KONTEKST nie wolno przypisywać Twojej grupie — możesz je przywołać jako „w całej Polsce…", „ogólnie…", a potem wnioskować, jak to się ma do Was.
3. Gdy nie ma ani dowodów o grupie, ani kontekstu do sensownego wnioskowania — powiedz wprost, że danych brak, i zaproponuj tematy, o które można Cię zapytać (z dowodów, które masz).
4. Gdy dowody są rozbieżne, powiedz o tym otwarcie.
5. Nie wypowiadasz się w imieniu innych grup — kontekst o innych grupach służy tylko porównaniu.
6. AKTUALNOŚĆ: dzisiejsza data to ${today}. Każdy dowód ma datę — sprawdzaj ją. Danych starszych niż rok nie wolno podawać jako stanu obecnego: powiedz „w lutym 2026 było…", „to badanie z 2023 roku, od tego czasu mogło się zmienić". Poparcie, zaufanie i oceny sprzed lat to historia, nie teraźniejszość. Gdy masz dowody z różnych dat na ten sam temat, pierwszeństwo mają najnowsze, a różnicę między starym a nowym możesz przywołać jako zmianę w czasie.

DOWODY:
${evidenceBlock}
${historyBlock}
PYTANIE: ${question}

Odpowiedz TYLKO poprawnym JSON (bez markdown):
{"odpowiedz":"...wypowiedź w pierwszej osobie; fakty z [n], wnioskowania z sygnałem niepewności i (wnioskuję z [n])...","uzyte_dowody":[1,2],"pewnosc":"wysoka|srednia|niska","zastrzezenia":"czego brakuje w danych albo null"}`;
}

function extractJson(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Deterministyczny fallback bez LLM: uczciwe streszczenie najlepszych dowodów,
// jawnie oznaczone jako tryb bez modelu (nie udaje rozmowy).
function fallbackAnswer(label: string, evidence: AvatarEvidence[]): { text: string; used: number[] } {
  if (!evidence.length) {
    return {
      text: `Na ten temat nie ma o nas (${label}) żadnych danych w bazie. Zapytaj o coś innego albo poczekaj na kolejne nocne zasilenie bazy.`,
      used: [],
    };
  }
  const top = evidence.slice(0, 5);
  return {
    text:
      `Tryb bez modelu językowego — podaję surowe dowody zamiast rozmowy. ` +
      top.map((e) => `${e.tekst} [${e.nr}]`).join(" • "),
    used: top.map((e) => e.nr),
  };
}

export async function askAvatar(
  groupValue: string,
  question: string,
  history: AvatarTurn[],
  matched: InsightQueryResult | null,
  matchedGlobal: InsightQueryResult | null = null
): Promise<AvatarAnswer | null> {
  const persona = await getPersonaByGroupValue(groupValue);
  if (!persona) return null;

  const label = persona.profile.grupa?.etykieta ?? groupValue;
  const evidence = buildEvidenceList(persona, matched, matchedGlobal);

  const provider = getAIProvider();
  let answer: string | null = null;
  let used: number[] = [];
  let confidence: AvatarAnswer["confidence"] = "niska";
  let caveats: string | null = null;

  if (provider.isReal && evidence.length > 0) {
    const raw = await provider.generateText(buildPrompt(label, question, evidence, history), {
      maxTokens: 1200,
      temperature: 0.6,
      timeoutMs: 25000,
    });
    const parsed = raw ? extractJson(raw) : null;
    if (parsed && typeof parsed.odpowiedz === "string" && parsed.odpowiedz.trim()) {
      answer = parsed.odpowiedz.trim();
      used = Array.isArray(parsed.uzyte_dowody)
        ? (parsed.uzyte_dowody as unknown[]).filter((n): n is number => typeof n === "number")
        : [];
      confidence =
        parsed.pewnosc === "wysoka" || parsed.pewnosc === "srednia" || parsed.pewnosc === "niska"
          ? parsed.pewnosc
          : evidence.length >= 10
            ? "srednia"
            : "niska";
      caveats = typeof parsed.zastrzezenia === "string" && parsed.zastrzezenia !== "null" ? parsed.zastrzezenia : null;
    }
  }

  if (!answer) {
    const fb = fallbackAnswer(label, evidence);
    answer = fb.text;
    used = fb.used;
    confidence = "niska";
    caveats = provider.isReal ? "Model językowy nie odpowiedział poprawnie, pokazuję surowe dowody." : "Brak klucza modelu językowego w środowisku.";
  }

  return {
    answer,
    confidence,
    usedEvidence: used,
    caveats,
    evidence,
    coverage: persona.data_coverage,
    personaVersion: persona.version,
    aiReal: provider.isReal,
  };
}
