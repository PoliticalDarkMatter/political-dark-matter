import { supabase, DEFAULT_PROJECT_SLUG } from "@/lib/supabase";

// ── Sprawy — jednostka robocza platformy ───────────────────────────────
// Ryszard Petru = cała instancja (ukryty singleton projektu). Widoczną
// jednostką, którą wybiera człowiek, jest Sprawa: np. start partii, temat,
// kryzys. Obiekty potoku (snapshots→scenarios→content_drafts→publications)
// są przypięte do sprawy przez sprawa_id (nullable = praca poza sprawą).
// Kokpit sprawy pokazuje oś: sygnał → decyzja → komunikat → publikacja → efekt.

export type SprawaTyp = "kampania_stala" | "temat" | "kryzys" | "inne";
export type SprawaStatus = "aktywna" | "wstrzymana" | "zamknieta";

export interface Sprawa {
  id: string;
  nazwa: string;
  opis: string | null;
  typ: SprawaTyp;
  status: SprawaStatus;
  utworzona_at: string;
  zamknieta_at: string | null;
}

export const TYP_LABEL: Record<SprawaTyp, string> = {
  kampania_stala: "Kampania stała",
  temat: "Temat",
  kryzys: "Kryzys",
  inne: "Inne",
};

export const STATUS_LABEL: Record<SprawaStatus, string> = {
  aktywna: "Aktywna",
  wstrzymana: "Wstrzymana",
  zamknieta: "Zamknięta",
};

async function getProjectId(): Promise<string> {
  const { data, error } = await supabase
    .from("projects").select("id").eq("slug", DEFAULT_PROJECT_SLUG).single();
  if (error || !data) throw new Error("Nie znaleziono projektu " + DEFAULT_PROJECT_SLUG);
  return data.id as string;
}

export async function listSprawy(): Promise<Sprawa[]> {
  const { data, error } = await supabase
    .from("sprawy")
    .select("id,nazwa,opis,typ,status,utworzona_at,zamknieta_at")
    .order("utworzona_at", { ascending: false });
  if (error) throw error;
  return (data as Sprawa[]) ?? [];
}

export interface NowaSprawa {
  nazwa: string;
  opis?: string;
  typ?: SprawaTyp;
}

export async function createSprawa(input: NowaSprawa): Promise<Sprawa> {
  const pid = await getProjectId();
  const { data, error } = await supabase
    .from("sprawy")
    .insert({
      project_id: pid,
      nazwa: input.nazwa.slice(0, 300),
      opis: input.opis?.slice(0, 4000) ?? null,
      typ: input.typ ?? "temat",
    })
    .select("id,nazwa,opis,typ,status,utworzona_at,zamknieta_at")
    .single();
  if (error) throw error;
  return data as Sprawa;
}

// ── Kokpit sprawy — oś przepływu ───────────────────────────────────────
export interface StageItem {
  id: string;
  tytul: string;
  meta: string | null;
  handoff: string | null;
  at: string | null;
}
export interface CockpitStage {
  klucz: "sygnal" | "decyzja" | "komunikat" | "publikacja";
  label: string;
  modul: string;
  count: number;
  items: StageItem[];
}
export interface Cockpit {
  sprawa: Sprawa;
  stages: CockpitStage[];
  efektEvents: number;
}

export async function getSprawaCockpit(id: string): Promise<Cockpit | null> {
  const { data: sprawa, error } = await supabase
    .from("sprawy")
    .select("id,nazwa,opis,typ,status,utworzona_at,zamknieta_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!sprawa) return null;

  const [snaps, scen, drafts, pubs] = await Promise.all([
    supabase.from("snapshots").select("id,query,period,total_documents,handoff,fetched_at").eq("sprawa_id", id).order("fetched_at", { ascending: false }).limit(5),
    supabase.from("scenarios").select("id,title,risk_level,recommendation,status,handoff,created_at").eq("sprawa_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("content_drafts").select("id,channel,status,handoff,created_at").eq("sprawa_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("publications").select("id,channel,url,handoff,published_at").eq("sprawa_id", id).order("published_at", { ascending: false }).limit(5),
  ]);

  const stages: CockpitStage[] = [
    {
      klucz: "sygnal", label: "Sygnał", modul: "Narrative Scope",
      count: snaps.data?.length ?? 0,
      items: (snaps.data ?? []).map((s) => ({ id: s.id, tytul: s.query || "Snapshot", meta: s.total_documents != null ? `${s.total_documents} dok.` : s.period, handoff: s.handoff, at: s.fetched_at })),
    },
    {
      klucz: "decyzja", label: "Decyzja", modul: "Apex Grid",
      count: scen.data?.length ?? 0,
      items: (scen.data ?? []).map((s) => ({ id: s.id, tytul: s.title, meta: s.risk_level ? `ryzyko: ${s.risk_level}` : s.status, handoff: s.handoff, at: s.created_at })),
    },
    {
      klucz: "komunikat", label: "Komunikat", modul: "Volt Stream",
      count: drafts.data?.length ?? 0,
      items: (drafts.data ?? []).map((d) => ({ id: d.id, tytul: d.channel || "Draft", meta: d.status, handoff: d.handoff, at: d.created_at })),
    },
    {
      klucz: "publikacja", label: "Publikacja", modul: "Pulse Field",
      count: pubs.data?.length ?? 0,
      items: (pubs.data ?? []).map((p) => ({ id: p.id, tytul: p.channel || "Publikacja", meta: p.url, handoff: p.handoff, at: p.published_at })),
    },
  ];

  // Efekt: zdarzenia zaangażowania powiązane z publikacjami tej sprawy
  let efektEvents = 0;
  const pubIds = (pubs.data ?? []).map((p) => p.id);
  if (pubIds.length > 0) {
    const { count } = await supabase
      .from("engagement_events")
      .select("id", { count: "exact", head: true })
      .in("publication_id", pubIds);
    efektEvents = count ?? 0;
  }

  return { sprawa: sprawa as Sprawa, stages, efektEvents };
}
