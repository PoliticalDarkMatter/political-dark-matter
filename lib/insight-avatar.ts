import { supabase } from "@/lib/supabase";
import { getAIProvider } from "@/lib/reaction-simulator/ai-provider";
import type { InsightQueryResult, InsightRawFinding } from "@/lib/insight";

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

// ── Czyszczenie i ranking dowodów ────────────────────────────────────────
// Trzy defekty, które zamieniały awatara w wyrzucarkę surowych liczb:
//  1. surowe wiersze krzyżówek ("Centrum 47 39 14 250") szły jako cytat,
//  2. brak dedupu — to samo zdanie przypięte do kilku topiców pojawiało się
//     wielokrotnie ([3][4][5] w oknie Jana),
//  3. brak rankingu trafności — pogrupowane, ale nie na temat dane (np. wynik
//     wyborów 2023) wypychały realnie istotne dowody poza prompt.

// Wiersz tabeli złożony z etykiety i samych liczb — bezużyteczny jako CYTAT,
// ale finding niesie realną wartość w value/question_text, więc renderujemy go
// czytelnie, nie wyrzucamy.
const RAW_ROW_RE = /^[^0-9]{0,40}[\t 0-9.,%]+$/;
const REL_STOP = new Set(["czy", "dla", "oraz", "jest", "tego", "tych", "ktora", "ktore", "ktory", "sie", "nie", "tak", "was", "panstwo", "pana", "pani", "przez"]);

function humanizeTopic(topic: string): string {
  return topic.replace(/_/g, " ").trim();
}
function normText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}
function deaccent(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function tokenize(s: string): string[] {
  return Array.from(
    new Set(
      deaccent(s)
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !REL_STOP.has(w))
        .map((w) => w.slice(0, 6))
    )
  );
}
// Czytelny tekst dowodu: sensowny cytat zostaje; surowy wiersz tabeli zamieniamy
// na "pytanie/temat: wartość (+ porównanie)", żeby model dostał treść, nie liczby.
function renderFinding(f: InsightRawFinding): string {
  const q = f.verbatim_quote?.trim();
  if (q && !RAW_ROW_RE.test(q)) return q;
  const label = f.question_text?.trim() || humanizeTopic(f.topic);
  const unit = f.data_type && /procent|proc|%/.test(f.data_type) ? "%" : "";
  const val = f.value != null ? `${f.value}${unit}` : f.value_text?.trim() || q || "?";
  const cmp = f.comparison_note?.trim() ? ` (${f.comparison_note.trim()})` : "";
  return `${label}: ${val}${cmp}`;
}

interface Candidate extends Omit<AvatarEvidence, "nr"> {
  base: number; // waga wiadra (fakt o grupie > kontekst > tło) + jakość
  search: string; // tekst + topic, do liczenia trafności
  dateMs: number; // świeżość (premia i tiebreaker)
  pin: boolean; // syntezy zawsze na górze
}

function toMs(d?: string | null): number {
  return d ? Date.parse(d) || 0 : 0;
}

// Buduje ponumerowaną listę dowodów: czyści surowe wiersze, deduplikuje po
// treści, rankinguje wg trafności (ważonej IDF), świeżości i jakości, tnie do
// `cap`. Syntezy (kojarzenie wielu źródeł) są przypięte na górę. `question`
// steruje rankingiem.
export function buildEvidenceList(
  persona: PersonaRow,
  matched: InsightQueryResult | null,
  matchedGlobal: InsightQueryResult | null = null,
  question = "",
  cap = 22
): AvatarEvidence[] {
  const qTokens = tokenize(question);
  const cands: Candidate[] = [];

  for (const s of matched?.syntheses ?? []) {
    const tekst = `SYNTEZA (${s.topic}): ${s.synthesis_text}${s.divergence_note ? ` ROZBIEŻNOŚĆ ŹRÓDEŁ: ${s.divergence_note}` : ""}`;
    cands.push({
      tekst,
      zrodlo: (s.sources ?? []).map((x) => x.title).join("; ") || "synteza międzybadawcza",
      url: s.sources?.[0]?.url ?? null,
      data: s.last_updated_at ?? null,
      score: 85,
      rodzaj: "synteza",
      base: 40,
      search: deaccent(`${tekst} ${s.topic}`),
      dateMs: toMs(s.last_updated_at),
      pin: true,
    });
  }

  // Fakt o grupie (otagowane grupą).
  for (const f of matched?.raw_findings ?? []) {
    const tekst = renderFinding(f);
    const hard = f.confidence === "twardy_wynik_sondazowy";
    cands.push({
      tekst,
      zrodlo: f.study_title,
      url: f.source_url ?? null,
      data: f.published_date ?? null,
      score: hard ? 90 : 55,
      rodzaj: "dopasowane_do_pytania",
      base: 30 + (hard ? 5 : 0),
      search: deaccent(`${tekst} ${f.topic} ${f.question_text ?? ""} ${f.comparison_note ?? ""}`),
      dateMs: toMs(f.published_date),
      pin: false,
    });
  }

  // Kontekst spoza grupy (dane ogólnopolskie / inne grupy) — do jawnego
  // wnioskowania, liczb nie wolno przypisywać własnej grupie.
  for (const f of matchedGlobal?.raw_findings ?? []) {
    const tekst = renderFinding(f);
    const hard = f.confidence === "twardy_wynik_sondazowy";
    cands.push({
      tekst,
      zrodlo: f.study_title,
      url: f.source_url ?? null,
      data: f.published_date ?? null,
      score: hard ? 75 : 45,
      rodzaj: "kontekst_spoza_grupy",
      base: 20 + (hard ? 5 : 0),
      search: deaccent(`${tekst} ${f.topic} ${f.question_text ?? ""} ${f.comparison_note ?? ""}`),
      dateMs: toMs(f.published_date),
      pin: false,
    });
  }

  // Profil grupy: charakterystyka jakościowa i zagregowane postawy — tło do
  // wnioskowania (kim jest ta grupa), nawet gdy nie trafia leksykalnie w pytanie.
  for (const qy of persona.profile.charakterystyka_jakosciowa ?? []) {
    const tekst = qy.cytat ?? qy.teza ?? "";
    if (!tekst) continue;
    cands.push({
      tekst,
      zrodlo: qy.zrodlo ?? "analiza jakościowa",
      url: qy.url ?? null,
      data: qy.data ?? null,
      score: qy.score ?? null,
      rodzaj: "profil_grupy",
      base: 12,
      search: deaccent(tekst),
      dateMs: toMs(qy.data),
      pin: false,
    });
  }
  for (const c of persona.profile.postawy_i_zachowania ?? []) {
    const cmp =
      c.srednia_w_wymiarze != null && c.wartosc != null
        ? ` [średnia dla grup tego wymiaru: ${c.srednia_w_wymiarze}%]`
        : "";
    const tekst = `${(c.cytaty ?? []).join(" | ") || `${humanizeTopic(c.temat)}: ${c.wartosc ?? "?"}%`}${cmp}`;
    cands.push({
      tekst,
      zrodlo: (c.zrodla ?? []).map((z) => z.badanie).filter(Boolean).join("; ") || "badanie w bazie",
      url: c.zrodla?.[0]?.url ?? null,
      data: c.zrodla?.[0]?.data ?? null,
      score: c.score ?? null,
      rodzaj: "profil_grupy",
      base: 10,
      search: deaccent(`${tekst} ${c.temat}`),
      dateMs: toMs(c.zrodla?.[0]?.data),
      pin: false,
    });
  }

  // Dedup po treści (to samo zdanie przypięte do kilku topiców = jeden dowód).
  const seen = new Set<string>();
  const deduped = cands.filter((c) => {
    const k = normText(c.tekst);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Trafność ważona IDF: token rzadki w zestawie (np. "petru") waży więcej niż
  // częsty ("zaglos", który łapie i pytanie o Petru, i wyniki wyborów 2023).
  // Dzięki temu dane realnie na temat wyprzedzają pogrupowany, ale nie na temat
  // szum — to jest sedno "system nie kojarzy": nie sam retrieval, ale ranking.
  const N = Math.max(1, deduped.length);
  const df = new Map<string, number>();
  for (const tok of qTokens) {
    let c = 0;
    for (const cand of deduped) if (cand.search.includes(tok)) c++;
    df.set(tok, c);
  }
  const relScore = (search: string): number => {
    let s = 0;
    for (const tok of qTokens) {
      if (search.includes(tok)) s += Math.log(1 + N / (df.get(tok) || N));
    }
    return s;
  };
  const newestMs = Math.max(1, ...deduped.map((c) => c.dateMs));
  const finalScore = (c: Candidate): number =>
    (c.pin ? 1e6 : 0) + relScore(c.search) * 1000 + c.base + (c.dateMs / newestMs) * 15;

  deduped.sort((a, b) => finalScore(b) - finalScore(a));

  return deduped.slice(0, cap).map((c, i) => ({
    nr: i + 1,
    tekst: c.tekst,
    zrodlo: c.zrodlo,
    url: c.url,
    data: c.data,
    score: c.score,
    rodzaj: c.rodzaj,
  }));
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

JAK MASZ MYŚLEĆ (to jest najważniejsze):
Nie wyliczaj dowodów po kolei i nie streszczaj tabel. Dowody są już oczyszczone i ustawione od najważniejszego. Zbuduj JEDNĄ spójną wypowiedź: połącz kilka dowodów w wniosek o tym, jak Twoja grupa najpewniej podchodzi do tematu pytania. Gdy nie ma dowodu wprost o Was, użyj profilu grupy plus kontekstu ogólnopolskiego i wywnioskuj odpowiedź (tryb B). Jeśli dane naprawdę nie pozwalają odpowiedzieć, powiedz to krótko i wskaż, czego brakuje. Odpowiadaj krótko, jak człowiek, nie jak raport.

DOWODY (od najważniejszego):
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

export interface GroundedParsed {
  answer: string;
  used: number[];
  confidence: AvatarAnswer["confidence"];
  caveats: string | null;
}

function parseGrounded(raw: string | null, evidenceLen: number): GroundedParsed | null {
  const parsed = raw ? extractJson(raw) : null;
  if (!parsed || typeof parsed.odpowiedz !== "string" || !parsed.odpowiedz.trim()) return null;
  const used = Array.isArray(parsed.uzyte_dowody)
    ? (parsed.uzyte_dowody as unknown[]).filter((n): n is number => typeof n === "number")
    : [];
  const confidence =
    parsed.pewnosc === "wysoka" || parsed.pewnosc === "srednia" || parsed.pewnosc === "niska"
      ? (parsed.pewnosc as AvatarAnswer["confidence"])
      : evidenceLen >= 10
        ? "srednia"
        : "niska";
  const caveats =
    typeof parsed.zastrzezenia === "string" && parsed.zastrzezenia !== "null" ? parsed.zastrzezenia : null;
  return { answer: parsed.odpowiedz.trim(), used, confidence, caveats };
}

// Wywołanie modelu dla dowodowej odpowiedzi: structured output (JSON) + włączone
// myślenie, z jedną próbą ratunkową. Zwraca null dopiero, gdy model naprawdę
// zawiódł (brak klucza, timeout, dwa razy nieparsowalny JSON) — dopiero wtedy
// warstwa wyżej sięga po fallback. Dzieli go awatar i analityk ("Zapytaj grupę").
export async function runGroundedTurn(
  prompt: string,
  evidenceLen: number,
  temperature: number
): Promise<GroundedParsed | null> {
  const provider = getAIProvider();
  if (!provider.isReal) return null;

  const raw = await provider.generateText(prompt, {
    maxTokens: 2048,
    temperature,
    timeoutMs: 30000,
    json: true,
    thinking: true,
  });
  const first = parseGrounded(raw, evidenceLen);
  if (first) return first;

  // Druga próba: bez myślenia, niżej temperatura — ratunek, gdy pierwsza się
  // urwała na limicie tokenów albo model zamarudził (structured output i tak
  // wymusza poprawny JSON).
  const raw2 = await provider.generateText(prompt, {
    maxTokens: 1600,
    temperature: 0.2,
    timeoutMs: 20000,
    json: true,
    thinking: false,
  });
  return parseGrounded(raw2, evidenceLen);
}

// Fallback bez LLM: dowody są już oczyszczone i czytelne (nie surowe wiersze),
// więc podajemy najmocniejsze z nich krótko, uczciwie oznaczając brak pełnej
// wypowiedzi — zamiast wysypywać tabele.
function fallbackAnswer(label: string, evidence: AvatarEvidence[]): { text: string; used: number[] } {
  if (!evidence.length) {
    return {
      text: `Na ten temat nie mam o nas (${label}) danych w bazie. Zapytaj o coś innego albo poczekaj na kolejne nocne zasilenie bazy.`,
      used: [],
    };
  }
  const top = evidence.slice(0, 4);
  return {
    text:
      `Nie udało mi się złożyć pełnej wypowiedzi, ale najmocniejsze dane, jakie o nas mam: ` +
      top.map((e) => `${e.tekst} [${e.nr}]`).join("; ") +
      ".",
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
  const evidence = buildEvidenceList(persona, matched, matchedGlobal, question, 20);

  const provider = getAIProvider();
  let answer: string | null = null;
  let used: number[] = [];
  let confidence: AvatarAnswer["confidence"] = "niska";
  let caveats: string | null = null;

  if (provider.isReal && evidence.length > 0) {
    const g = await runGroundedTurn(buildPrompt(label, question, evidence, history), evidence.length, 0.6);
    if (g) {
      answer = g.answer;
      used = g.used;
      confidence = g.confidence;
      caveats = g.caveats;
    }
  }

  if (!answer) {
    const fb = fallbackAnswer(label, evidence);
    answer = fb.text;
    used = fb.used;
    confidence = "niska";
    caveats = provider.isReal
      ? "Model językowy nie odpowiedział poprawnie, pokazuję najmocniejsze dane."
      : "Brak klucza modelu językowego w środowisku.";
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
