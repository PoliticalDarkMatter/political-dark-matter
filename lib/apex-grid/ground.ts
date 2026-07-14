// ── Warstwa 2: Grunt (e-Wyborcy) ────────────────────────────────────
// W CAŁOŚCI deterministyczna, zero LLM — odpytuje funkcję query_insight
// w Supabase (fuzzy matching po temacie, patrz lib/insight.ts) i składa
// z realnych syntez oraz findings digest z podanymi źródłami. Zasada
// zero halucynacji: do promptów dalszych warstw trafiają wyłącznie dane,
// które fizycznie są w bazie, z cytatami i poziomem pewności. Brak danych
// jest jawnie opisany, nie maskowany.

import { queryInsight } from "@/lib/insight";
import type { ApexInput, GroundContext, GroundFinding, GroundSynthesis } from "./types";

const CONFIDENCE_LABELS: Record<string, string> = {
  twardy_wynik_sondazowy: "twardy wynik sondażowy",
  interpretacja_dziennikarska: "interpretacja dziennikarska",
  hipoteza_analityka: "hipoteza analityka",
};

function buildGroundQuery(input: ApexInput): string {
  // targetAudience celowo na początku: query_insight rankuje po liczbie
  // trafień tokenów, a nazwy grup ("młodzi", "wieś") są najcenniejszym
  // sygnałem dopasowania do group_tags i topiców findings.
  return [input.targetAudience, input.topic, input.politicalGoal]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}

export async function gatherGround(input: ApexInput): Promise<GroundContext> {
  const query = buildGroundQuery(input);
  if (!query) {
    return { query: "", hasData: false, syntheses: [], findings: [], digest: emptyDigest("") };
  }

  let result;
  try {
    result = await queryInsight(query, []);
  } catch {
    return {
      query,
      hasData: false,
      syntheses: [],
      findings: [],
      digest:
        "e-Wyborcy: błąd połączenia z bazą nastawień grup społecznych — dalsze warstwy mają jawnie zaznaczyć brak danych o gruncie społecznym, nie zgadywać nastrojów.",
    };
  }

  const syntheses: GroundSynthesis[] = (result.syntheses ?? []).slice(0, 5).map((s) => ({
    topic: s.topic,
    text: s.synthesis_text,
    divergenceNote: s.divergence_note,
  }));

  const findings: GroundFinding[] = (result.raw_findings ?? []).slice(0, 12).map((f) => ({
    topic: f.topic,
    value: f.value,
    valueText: f.value_text,
    quote: f.verbatim_quote,
    confidence: f.confidence,
    studyTitle: f.study_title,
    sourceUrl: f.source_url,
    publishedDate: f.published_date,
  }));

  const hasData = syntheses.length > 0 || findings.length > 0;

  return {
    query,
    hasData,
    syntheses,
    findings,
    digest: hasData ? buildGroundDigest(syntheses, findings) : emptyDigest(query),
  };
}

function emptyDigest(query: string): string {
  return `e-Wyborcy${query ? ` (zapytanie: „${query.slice(0, 120)}")` : ""}: brak dopasowanych badań i syntez o nastawieniu grup społecznych do tej sprawy. Wnioski o reakcjach grup formułuj wyłącznie jako hipotezy do sprawdzenia, jawnie oznaczone — nie jako dane.`;
}

function buildGroundDigest(syntheses: GroundSynthesis[], findings: GroundFinding[]): string {
  const lines: string[] = ["e-Wyborcy (realne badania i sondaże o grupach społecznych):"];

  if (syntheses.length > 0) {
    lines.push("Syntezy międzyźródłowe:");
    for (const s of syntheses) {
      lines.push(`- [${s.topic}] ${s.text}${s.divergenceNote ? ` UWAGA, rozbieżność źródeł: ${s.divergenceNote}` : ""}`);
    }
  }

  if (findings.length > 0) {
    lines.push("Pojedyncze wyniki (z poziomem pewności i źródłem):");
    for (const f of findings.slice(0, 10)) {
      const value = f.value !== null ? `${f.value}` : (f.valueText ?? "b.d.");
      const conf = CONFIDENCE_LABELS[f.confidence] ?? f.confidence;
      lines.push(`- [${f.topic}] ${value} (${conf}; ${f.studyTitle}${f.publishedDate ? ", " + f.publishedDate : ""})`);
    }
  }

  lines.push(
    "Powyższe to jedyne twarde dane o nastawieniu grup — wszystko ponad to jest interpretacją i ma być tak oznaczone."
  );
  return lines.join("\n");
}
