import { supabase } from "@/lib/supabase";

// ── Insight Base: warstwa dostępu do bazy badań/sondaży o polskich grupach
// społecznych (Supabase, tabele insight_*). Odczyt idzie przez klucz anon,
// zabezpieczony politykami RLS "tylko odczyt" ustawionymi po stronie bazy —
// zapis (nocna ingestia) idzie osobną drogą, kluczem serwisowym.

export type GroupDimension =
  | "wiek"
  | "wyksztalcenie"
  | "miejsce_zamieszkania"
  | "region"
  | "historia_glosowania"
  | "dochod"
  | "plec"
  | "grupa_spoleczno_zawodowa"
  | "poglady_polityczne"
  | "praktyki_religijne"
  | "segment_psychograficzny";

export const DIMENSION_LABELS: Record<GroupDimension, string> = {
  wiek: "Wiek",
  wyksztalcenie: "Wykształcenie",
  miejsce_zamieszkania: "Miejsce zamieszkania",
  region: "Region",
  historia_glosowania: "Historia głosowania (2023)",
  dochod: "Dochód",
  plec: "Płeć",
  grupa_spoleczno_zawodowa: "Grupa społeczno-zawodowa / źródło utrzymania",
  poglady_polityczne: "Poglądy polityczne (deklarowane)",
  praktyki_religijne: "Praktyki religijne",
  segment_psychograficzny: "Segment psychograficzny (More in Common)",
};

export interface GroupTaxonomyRow {
  id: string;
  dimension: GroupDimension;
  value: string;
  label_pl: string;
}

export interface GroupWithCount extends GroupTaxonomyRow {
  findings_count: number;
}

// Wiele realnych badań (zwłaszcza streszczenia prasowe sondaży ogólnopolskich)
// nie podaje rozbicia na grupy społeczne — to są dane ogólnokrajowe, nie błąd
// ingestii. Taki finding ma group_tags = '{}'. Żeby te dane nie "znikały" z
// widoku (0 w każdej grupie, mimo że baza coś zawiera), dajemy im osobny,
// wybieralny pseudo-wpis zamiast chować je wyłącznie za pytaniem bez grupy.
export const ALL_POPULATION_VALUE = "__all__";
export const ALL_POPULATION_LABEL = "Cała populacja (bez podziału na grupy)";

export interface OverallStats {
  totalStudies: number;
  totalFindings: number;
  findingsWithoutGroup: number;
}

export interface InsightSynthesisSource {
  title: string;
  url: string;
  published_date: string | null;
}

export interface InsightSynthesis {
  topic: string;
  synthesis_text: string;
  divergence_note: string | null;
  last_updated_at: string;
  sources: InsightSynthesisSource[] | null;
}

export interface InsightRawFinding {
  topic: string;
  value: number | null;
  value_text: string | null;
  verbatim_quote: string | null;
  confidence: string;
  comparison_note?: string | null;
  data_type: string;
  study_title: string;
  source_url: string;
  published_date: string | null;
  // "ogolnopolski" = dane bez rozbicia na grupy (group_tags puste) pokazane
  // jako kontekst, żeby pytanie o grupę nie kończyło się fałszywym "brak danych"
  zakres?: "grupa" | "ogolnopolski";
}

export interface InsightQueryResult {
  syntheses: InsightSynthesis[];
  raw_findings: InsightRawFinding[];
}

const EMPTY_RESULT: InsightQueryResult = { syntheses: [], raw_findings: [] };

export async function getGroupTaxonomy(): Promise<GroupTaxonomyRow[]> {
  const { data, error } = await supabase
    .from("insight_group_taxonomy")
    .select("id, dimension, value, label_pl")
    .order("dimension", { ascending: true })
    .order("value", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GroupTaxonomyRow[];
}

export async function getGroupsWithCounts(): Promise<GroupWithCount[]> {
  const groups = await getGroupTaxonomy();

  const { data: findingsRows, error } = await supabase
    .from("insight_findings")
    .select("group_tags");
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of (findingsRows ?? []) as { group_tags: string[] | null }[]) {
    for (const groupId of row.group_tags ?? []) {
      counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
    }
  }

  return groups.map((g) => ({ ...g, findings_count: counts.get(g.id) ?? 0 }));
}

export async function getOverallStats(): Promise<OverallStats> {
  const [{ count: totalStudies, error: studiesErr }, { data: findingsRows, error: findingsErr }] =
    await Promise.all([
      supabase.from("insight_studies").select("id", { count: "exact", head: true }),
      supabase.from("insight_findings").select("group_tags"),
    ]);
  if (studiesErr) throw studiesErr;
  if (findingsErr) throw findingsErr;

  const rows = (findingsRows ?? []) as { group_tags: string[] | null }[];
  const findingsWithoutGroup = rows.filter((r) => !r.group_tags || r.group_tags.length === 0).length;

  return {
    totalStudies: totalStudies ?? 0,
    totalFindings: rows.length,
    findingsWithoutGroup,
  };
}

export async function queryInsight(
  topic: string,
  groupValues: string[]
): Promise<InsightQueryResult> {
  const { data, error } = await supabase.rpc("query_insight", {
    p_topic: topic,
    p_group_values: groupValues,
  });
  if (error) throw error;
  return (data as InsightQueryResult) ?? EMPTY_RESULT;
}

// Grupa profilowa miesza dziś w jednej tabeli trzy bardzo różne rodzaje wiedzy
// o grupie: (1) zaufanie/poparcie polityczne, (2) twarde dane demograficzno-
// -materialne (dochody, ubóstwo, bezrobocie, cyfryzacja - fakty administracyjne
// GUS, nie opinie) oraz (3) wartości, priorytety życiowe, postawy wobec pracy/
// rodziny/religii itd. Jan wprost zażądał (2026-07-08), żeby charakterystyka
// grupy pokazywała "scyfryzowany obraz" oparty na materialnej rzeczywistości,
// nie tylko na sondażach opinii - dlatego dane demograficzno-materialne mają
// WŁASNY koszyk, a nie giną wymieszane z "wartościami i stylem życia". To
// rozróżnienie jest heurystyką po prefiksie/słowach kluczowych w `topic`, nie
// osobną kolumną w bazie - jeśli topic nie pasuje do żadnego wzorca
// politycznego ani demograficzno-materialnego, trafia domyślnie do "wartości
// i stylu życia" (opinie, postawy, deklaracje - nie twarde fakty).
const POLITICAL_TOPIC_PATTERNS = [
  /^zaufanie_do_/,
  /^poparcie_/,
  /_do_rzadu$/,
  /_do_prezydenta$/,
  /polityk/,
  /partii/,
  /wybor/,
];

// Twarde dane administracyjne/statystyczne (GUS i podobne) - fakty o sytuacji
// materialnej i demograficznej grup, nie deklarowane opinie czy postawy.
const DEMOGRAFIA_MATERIALNA_TOPIC_PATTERNS = [
  /ubostwo/,
  /^dochod/,
  /^wydatki/,
  /bezrobocia/,
  /zatrudnien/,
  /wynagrodze/,
  /pensj/,
  /internetu/,
  /cyfrow/,
  /nastroje_konsumenckie/,
  /budzet(y)?_domow/,
  /koszty_zycia/,
  /warunki_mieszkaniow/,
];

export type FindingCategory = "polityka" | "demografia_i_sytuacja_materialna" | "wartosci_i_styl_zycia";

export function categorizeTopic(topic: string): FindingCategory {
  const t = topic.toLowerCase();
  if (POLITICAL_TOPIC_PATTERNS.some((re) => re.test(t))) return "polityka";
  if (DEMOGRAFIA_MATERIALNA_TOPIC_PATTERNS.some((re) => re.test(t))) return "demografia_i_sytuacja_materialna";
  return "wartosci_i_styl_zycia";
}

export interface GroupProfileFinding {
  topic: string;
  value: number | null;
  value_text: string | null;
  verbatim_quote: string | null;
  confidence: string;
  created_at: string;
  category: FindingCategory;
  insight_studies: {
    title: string;
    source_url: string;
    published_date: string | null;
  } | null;
}

export interface GroupProfileSynthesis {
  topic: string;
  synthesis_text: string;
  divergence_note: string | null;
  last_updated_at: string;
}

// ── Portret narracyjny grupy (budowany przez nocną ingestię LLM na dowodach
// z bazy; przenoszony między wersjami person przez rebuild_group_personas) ──
export interface PortretSekcja {
  tytul: string;
  tekst: string;
  finding_ids?: string[];
  pewnosc?: string;
  zastrzezenie?: string;
}

export interface PortretHipoteza {
  teza: string;
  typ?: string;
  oparta_na?: string;
}

export interface PortretNarracyjny {
  wersja?: string;
  zbudowano_przez?: string;
  naglowek?: string;
  sekcje?: PortretSekcja[];
  hipotezy_strategiczne?: PortretHipoteza[];
  luki_w_danych?: string[];
}

// Zagregowana postawa z persony - podstawa wykresu "grupa na tle wymiaru"
export interface PersonaPostawa {
  temat: string;
  wartosc: number | null;
  srednia_w_wymiarze: number | null;
  liczba_pomiarow?: number;
  score?: number;
}

export interface GroupProfile {
  group: GroupTaxonomyRow;
  syntheses: GroupProfileSynthesis[];
  findings: GroupProfileFinding[];
  portret: PortretNarracyjny | null;
  postawy: PersonaPostawa[];
  data_coverage: string | null;
}

export async function getGroupProfile(groupValue: string): Promise<GroupProfile | null> {
  if (groupValue === ALL_POPULATION_VALUE) {
    // Pseudo-grupa: dane ogólnokrajowe, gdzie źródło nie podało rozbicia
    // demograficznego (typowe dla streszczeń prasowych sondaży toplinowych).
    const syntheticGroup: GroupTaxonomyRow = {
      id: "",
      dimension: "inne" as GroupDimension,
      value: ALL_POPULATION_VALUE,
      label_pl: ALL_POPULATION_LABEL,
    };

    const [{ data: syntheses, error: synthErr }, { data: findings, error: findErr }] = await Promise.all([
      supabase
        .from("insight_syntheses")
        .select("topic, synthesis_text, divergence_note, last_updated_at, group_tags")
        .order("last_updated_at", { ascending: false }),
      supabase
        .from("insight_findings")
        .select(
          "topic, value, value_text, verbatim_quote, confidence, created_at, group_tags, insight_studies(title, source_url, published_date)"
        )
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (synthErr) throw synthErr;
    if (findErr) throw findErr;

    return {
      group: syntheticGroup,
      portret: null,
      postawy: [],
      data_coverage: null,
      syntheses: ((syntheses ?? []) as (GroupProfileSynthesis & { group_tags: string[] | null })[]).filter(
        (s) => !s.group_tags || s.group_tags.length === 0
      ),
      findings: ((findings ?? []) as unknown as (GroupProfileFinding & { group_tags: string[] | null })[])
        .filter((f) => !f.group_tags || f.group_tags.length === 0)
        .map((f) => ({ ...f, category: categorizeTopic(f.topic) })),
    };
  }

  const group = (await getGroupTaxonomy()).find((g) => g.value === groupValue);
  if (!group) return null;

  const { data: syntheses, error: synthErr } = await supabase
    .from("insight_syntheses")
    .select("topic, synthesis_text, divergence_note, last_updated_at")
    .contains("group_tags", [group.id])
    .order("last_updated_at", { ascending: false });
  if (synthErr) throw synthErr;

  const { data: findings, error: findErr } = await supabase
    .from("insight_findings")
    .select(
      "topic, value, value_text, verbatim_quote, confidence, created_at, insight_studies(title, source_url, published_date)"
    )
    .contains("group_tags", [group.id])
    .order("created_at", { ascending: false })
    .limit(50);
  if (findErr) throw findErr;

  // Persona grupy: portret narracyjny (synteza LLM z nocnej ingestii) oraz
  // zagregowane postawy z porównaniem do średniej wymiaru (dla wykresów).
  const { data: personaRows, error: personaErr } = await supabase
    .from("insight_group_personas")
    .select("profile, data_coverage")
    .eq("group_id", group.id)
    .eq("status", "aktualna")
    .limit(1);
  if (personaErr) throw personaErr;
  const persona = personaRows?.[0] as
    | { profile?: { portret_narracyjny?: PortretNarracyjny; postawy_i_zachowania?: PersonaPostawa[] }; data_coverage?: string }
    | undefined;

  return {
    group,
    portret: persona?.profile?.portret_narracyjny ?? null,
    postawy: (persona?.profile?.postawy_i_zachowania ?? []).map((p) => ({
      temat: p.temat,
      wartosc: p.wartosc ?? null,
      srednia_w_wymiarze: p.srednia_w_wymiarze ?? null,
      liczba_pomiarow: p.liczba_pomiarow,
      score: p.score,
    })),
    data_coverage: persona?.data_coverage ?? null,
    syntheses: (syntheses ?? []) as GroupProfileSynthesis[],
    findings: ((findings ?? []) as unknown as GroupProfileFinding[]).map((f) => ({
      ...f,
      category: categorizeTopic(f.topic),
    })),
  };
}
