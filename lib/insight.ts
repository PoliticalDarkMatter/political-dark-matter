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
  | "plec";

export const DIMENSION_LABELS: Record<GroupDimension, string> = {
  wiek: "Wiek",
  wyksztalcenie: "Wykształcenie",
  miejsce_zamieszkania: "Miejsce zamieszkania",
  region: "Region",
  historia_glosowania: "Historia głosowania (2023)",
  dochod: "Dochód",
  plec: "Płeć",
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
  data_type: string;
  study_title: string;
  source_url: string;
  published_date: string | null;
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

export interface GroupProfileFinding {
  topic: string;
  value: number | null;
  value_text: string | null;
  verbatim_quote: string | null;
  confidence: string;
  created_at: string;
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

export interface GroupProfile {
  group: GroupTaxonomyRow;
  syntheses: GroupProfileSynthesis[];
  findings: GroupProfileFinding[];
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
      syntheses: ((syntheses ?? []) as (GroupProfileSynthesis & { group_tags: string[] | null })[]).filter(
        (s) => !s.group_tags || s.group_tags.length === 0
      ),
      findings: ((findings ?? []) as unknown as (GroupProfileFinding & { group_tags: string[] | null })[]).filter(
        (f) => !f.group_tags || f.group_tags.length === 0
      ),
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

  return {
    group,
    syntheses: (syntheses ?? []) as GroupProfileSynthesis[],
    findings: (findings ?? []) as unknown as GroupProfileFinding[],
  };
}
