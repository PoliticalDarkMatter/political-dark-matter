import { supabase } from "@/lib/supabase";

// Warstwa Pulse Field: publikacja treści na publiczny hub (public_content),
// z którego czyta ryszardpetru.pl. Zapis idzie przez funkcje SECURITY DEFINER
// bramkowane sekretem serwerowym (PULSE_ADMIN_SECRET), więc nie wystawiamy
// klucza service_role, a mimo to omijamy RLS w kontrolowany sposób.
// UWAGA: używać wyłącznie po stronie serwera (route handlers) — sekret jest serwerowy.

const SECRET = process.env.PULSE_ADMIN_SECRET as string;

export type PublicTyp = "film" | "wpis" | "analiza" | "przekaz";

export interface PublicItem {
  id: string;
  typ: PublicTyp;
  tytul: string;
  lead: string | null;
  tresc: string | null;
  media_url: string | null;
  zrodlo_url: string | null;
  temat: string | null;
  published: boolean;
  published_at: string;
  created_at: string;
}

export interface UpsertInput {
  id?: string | null;
  typ: PublicTyp;
  tytul: string;
  lead?: string | null;
  tresc?: string | null;
  media_url?: string | null;
  zrodlo_url?: string | null;
  temat?: string | null;
  published: boolean;
}

function guard() {
  if (!SECRET) throw new Error("Brak PULSE_ADMIN_SECRET w środowisku serwera.");
}

export async function listContent(): Promise<PublicItem[]> {
  guard();
  const { data, error } = await supabase.rpc("pulse_list_content", { p_secret: SECRET });
  if (error) throw error;
  return (data ?? []) as PublicItem[];
}

export async function upsertContent(input: UpsertInput): Promise<PublicItem> {
  guard();
  const { data, error } = await supabase.rpc("pulse_upsert_content", {
    p_secret: SECRET,
    p_id: input.id ?? null,
    p_typ: input.typ,
    p_tytul: input.tytul,
    p_lead: input.lead ?? null,
    p_tresc: input.tresc ?? null,
    p_media_url: input.media_url ?? null,
    p_zrodlo_url: input.zrodlo_url ?? null,
    p_temat: input.temat ?? null,
    p_published: input.published,
  });
  if (error) throw error;
  return data as PublicItem;
}

export async function setPublished(id: string, published: boolean): Promise<PublicItem> {
  guard();
  const { data, error } = await supabase.rpc("pulse_set_published", {
    p_secret: SECRET,
    p_id: id,
    p_published: published,
  });
  if (error) throw error;
  return data as PublicItem;
}

export async function deleteContent(id: string): Promise<void> {
  guard();
  const { error } = await supabase.rpc("pulse_delete_content", { p_secret: SECRET, p_id: id });
  if (error) throw error;
}
