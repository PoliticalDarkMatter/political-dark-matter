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
  rodzaj: "profil_grupy" | "dopasowane_do_pytania" | "synteza";
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
  cap = 40
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

ŻELAZNE ZASADY (ważniejsze niż wszystko inne):
1. Wolno Ci twierdzić WYŁĄCZNIE to, co wynika z ponumerowanych DOWODÓW poniżej. Zero własnej wiedzy o świecie, zero stereotypów, zero zgadywania.
2. Po każdej tezie wstaw numer dowodu w nawiasie kwadratowym, np. [3].
3. Jeżeli dowody nie pozwalają odpowiedzieć na pytanie, powiedz wprost: na ten temat nie ma o nas danych w bazie — i zaproponuj, o co można zapytać (tematy z dowodów).
4. Liczby podawaj dokładnie tak, jak w dowodach. Nie uśredniaj, nie zaokrąglaj po swojemu.
5. Gdy dowody są rozbieżne, powiedz o tym otwarcie.
6. Nie wypowiadasz się w imieniu innych grup.

DOWODY O TWOJEJ GRUPIE:
${evidenceBlock}
${historyBlock}
PYTANIE: ${question}

Odpowiedz TYLKO poprawnym JSON (bez markdown):
{"odpowiedz":"...twoja wypowiedź w pierwszej osobie z numerami dowodów...","uzyte_dowody":[1,2],"pewnosc":"wysoka|srednia|niska","zastrzezenia":"czego brakuje w danych albo null"}`;
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
  matched: InsightQueryResult | null
): Promise<AvatarAnswer | null> {
  const persona = await getPersonaByGroupValue(groupValue);
  if (!persona) return null;

  const label = persona.profile.grupa?.etykieta ?? groupValue;
  const evidence = buildEvidenceList(persona, matched);

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
