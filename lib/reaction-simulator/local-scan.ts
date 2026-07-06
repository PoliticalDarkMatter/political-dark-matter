import { TRIGGER_PHRASE_DICT } from "./mock-data";
import type { LocalScanResult, RiskBand, SimulationInput, TriggerMatch } from "./types";

// ── Local Pre-Scan — Krok 1, bez LLM ──────────────────────────────────
// Celowo deterministyczne i natychmiastowe: to jedyna warstwa, którą
// wolno uruchomić też po stronie klienta (żadnych kluczy, żadnego
// fetch), żeby użytkownik dostał pierwszy sygnał w czasie < 50ms, zanim
// jeszcze ruszy cokolwiek związanego z LLM. Funkcja jest czystym TS,
// więc jest importowalna zarówno w komponencie klienckim, jak i w API
// route (współdzielone źródło prawdy dla scoringu, patrz sekcja 14
// specyfikacji: 0-25 niskie, 26-50 umiarkowane, 51-75 wysokie, 76-100
// bardzo wysokie).

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export function detectTriggerPhrases(text: string): TriggerMatch[] {
  const norm = normalize(text);
  const matches: TriggerMatch[] = [];
  for (const entry of TRIGGER_PHRASE_DICT) {
    const needle = normalize(entry.phrase);
    if (norm.includes(needle)) {
      matches.push({ phrase: entry.phrase, weight: entry.weight, reason: entry.reason });
    }
  }
  return matches;
}

function riskBandOf(score: number): RiskBand {
  if (score <= 25) return "niskie";
  if (score <= 50) return "umiarkowane";
  if (score <= 75) return "wysokie";
  return "bardzo_wysokie";
}

// Bardzo prosta heurystyka tonu — DOCELOWO: zastąpić klasyfikatorem
// tonu trenowanym na polskim korpusie politycznym albo wywołaniem LLM
// w warstwie "contextual" (patrz orchestrator.ts), jeśli lokalna
// heurystyka okaże się za płytka na realnych danych.
function detectToneLabel(text: string): string {
  const norm = normalize(text);
  const exclam = (text.match(/!/g) || []).length;
  const caps = (text.match(/\b[A-ZĄĆĘŁŃÓŚŹŻ]{4,}\b/g) || []).length;
  if (/nie bedziemy|nie damy|nigdy|zdecydowanie/.test(norm) || exclam >= 2 || caps >= 1) return "ostry / konfrontacyjny";
  if (/przepraszam|zalujemy|rozumiem/.test(norm)) return "defensywny / przepraszający";
  if (/musza|trzeba|nalezy|powinni/.test(norm)) return "protekcjonalny / pouczający";
  if (/dane|analiza|wskaznik|procent/.test(norm)) return "technokratyczny";
  return "stonowany / neutralny";
}

function contextualModifier(input: SimulationInput): number {
  let mod = 0;
  if (input.situation === "atak" || input.situation === "ofensywa") mod += 8;
  if (input.situation === "przeprosiny") mod += 6; // przeprosiny źle napisane bardzo łatwo eskalują
  if (input.goal === "atak_na_przeciwnika") mod += 6;
  if (input.goal === "neutralizacja_kryzysu") mod += 4;
  if (input.format === "tweet_x" || input.format === "tiktok") mod += 5; // najkrótszy kontekst, najłatwiej wyrwać z kontekstu
  if (input.role === "lider" || input.role === "minister") mod += 4; // wyższa waga wypowiedzi
  return mod;
}

// Tekst, po którym faktycznie liczymy skan — dla trybu "watek" to cała
// seria łącznie (patrz SimulationInput.threadItems w types.ts), nie
// tylko pierwszy element. Inne tryby mają threadItems puste, więc join
// nie zmienia dla nich niczego.
export function effectiveText(input: SimulationInput): string {
  return [input.text, ...(input.threadItems || [])].filter(Boolean).join("\n");
}

export function runLocalScan(input: SimulationInput): LocalScanResult {
  const combined = effectiveText(input);
  const triggerMatches = detectTriggerPhrases(combined);
  const triggerScore = triggerMatches.reduce((sum, m) => sum + m.weight, 0);
  const baseRiskScore = Math.max(0, Math.min(100, triggerScore + contextualModifier(input)));
  const riskBand = riskBandOf(baseRiskScore);
  const toneLabel = detectToneLabel(combined);

  // Zgrubne dopasowanie archetypu kryzysu do najcięższej trafionej frazy —
  // ostateczne dopasowanie i uzasadnienie i tak robi warstwa "contextual" LLM.
  const heaviest = [...triggerMatches].sort((a, b) => b.weight - a.weight)[0];
  const dictEntry = heaviest ? TRIGGER_PHRASE_DICT.find((e) => e.phrase === heaviest.phrase) : undefined;

  const formatRiskNote =
    input.format === "tweet_x" || input.format === "tiktok"
      ? "Krótki format — najwyższe ryzyko wyrwania z kontekstu, brak miejsca na zastrzeżenia."
      : input.format === "sejm" || input.format === "debata"
      ? "Format z pełnym stenogramem — trudniej zmanipulować cytat, ale łatwiej o gafę na żywo."
      : null;

  return {
    triggerMatches,
    baseRiskScore,
    riskBand,
    toneLabel,
    likelyCrisisArchetype: dictEntry?.archetype ?? null,
    formatRiskNote,
  };
}

export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  niskie: "Niskie ryzyko",
  umiarkowane: "Ryzyko umiarkowane",
  wysokie: "Wysokie ryzyko",
  bardzo_wysokie: "Bardzo wysokie ryzyko",
};
