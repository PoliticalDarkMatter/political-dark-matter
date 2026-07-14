import { supabase, DEFAULT_PROJECT_SLUG } from "@/lib/supabase";

// ── Założenia strategiczne — konstytucja systemu ───────────────────────
// Trwały, edytowalny, WERSJONOWANY obiekt ponad wszystkimi sprawami. Jest
// wstrzykiwany jako nadrzędna preambuła do promptów modułów (e-Konsylium,
// Apex Grid…), żeby cały system mówił głosem Ryszarda Petru, a nie
// generycznie. Zapis idzie przez funkcję SQL zapisz_zalozenia (archiwizuje
// poprzednią wersję, jedna aktualna na projekt). Odczyt kluczem anon.

export interface Zalozenia {
  id: string;
  wersja: number;
  cele_nadrzedne: string | null;
  pozycjonowanie: string | null;
  czerwone_linie: string | null;
  ton_glos: string | null;
  grupy_priorytetowe: string | null;
  przeciwnicy: string | null;
  tematy_wlasnosc: string | null;
  tematy_do_unikania: string | null;
  inne: Record<string, unknown>;
  utworzone_at: string;
  utworzone_by: string | null;
  nota: string | null;
}

export type ZalozeniaSlotKey =
  | "cele_nadrzedne"
  | "pozycjonowanie"
  | "czerwone_linie"
  | "ton_glos"
  | "grupy_priorytetowe"
  | "przeciwnicy"
  | "tematy_wlasnosc"
  | "tematy_do_unikania";

export interface SlotDef {
  key: ZalozeniaSlotKey;
  label: string;
  hint: string;
  promptLabel: string;
}

// Kolejność slotów = kolejność w edytorze i w preambule promptu.
export const ZALOZENIA_SLOTS: SlotDef[] = [
  { key: "cele_nadrzedne", label: "Cele nadrzędne", hint: "Co Ryszard Petru chce osiągnąć w tym projekcie politycznym. Kilka konkretnych celów, nie ogólniki.", promptLabel: "Cele nadrzędne" },
  { key: "pozycjonowanie", label: "Pozycjonowanie", hint: "Kim jest, za czym stoi, czym różni się od konkurentów. Jednym akapitem.", promptLabel: "Pozycjonowanie" },
  { key: "czerwone_linie", label: "Czerwone linie", hint: "Czego NIGDY nie mówimy i nie robimy. Tematy, słowa, gesty, sojusze wykluczone.", promptLabel: "Czerwone linie (zakazane)" },
  { key: "ton_glos", label: "Ton i głos", hint: "Jak brzmi jego komunikacja: ostro czy spokojnie, ekspercko czy potocznie, ironicznie czy serio.", promptLabel: "Ton i głos" },
  { key: "grupy_priorytetowe", label: "Grupy priorytetowe", hint: "Do kogo mówimy w pierwszej kolejności. Elektoraty, segmenty, grupy społeczne.", promptLabel: "Grupy priorytetowe" },
  { key: "przeciwnicy", label: "Przeciwnicy", hint: "Kto jest głównym przeciwnikiem politycznym i jaka jest linia sporu z każdym.", promptLabel: "Przeciwnicy" },
  { key: "tematy_wlasnosc", label: "Tematy własne", hint: "Tematy, na których chce być rozpoznawany jako właściciel, gdzie ma przewagę.", promptLabel: "Tematy własne" },
  { key: "tematy_do_unikania", label: "Tematy do unikania", hint: "Tematy, na których traci, w które nie chce być wciągany.", promptLabel: "Tematy do unikania" },
];

async function getProjectId(): Promise<string> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", DEFAULT_PROJECT_SLUG)
    .single();
  if (error || !data) throw new Error("Nie znaleziono projektu " + DEFAULT_PROJECT_SLUG);
  return data.id as string;
}

export async function getCurrentZalozenia(): Promise<Zalozenia | null> {
  const { data, error } = await supabase
    .from("zalozenia_strategiczne")
    .select("*")
    .eq("is_current", true)
    .order("wersja", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Zalozenia) ?? null;
}

export interface ZalozeniaInput {
  cele_nadrzedne?: string;
  pozycjonowanie?: string;
  czerwone_linie?: string;
  ton_glos?: string;
  grupy_priorytetowe?: string;
  przeciwnicy?: string;
  tematy_wlasnosc?: string;
  tematy_do_unikania?: string;
  nota?: string;
  inne?: Record<string, unknown>;
}

export async function saveZalozenia(dane: ZalozeniaInput, by: string): Promise<string> {
  const pid = await getProjectId();
  const { data, error } = await supabase.rpc("zapisz_zalozenia", {
    p_project: pid,
    p_dane: dane,
    p_by: by,
  });
  if (error) throw error;
  return data as string;
}

// ── Preambuła do promptów ──────────────────────────────────────────────
// Zwraca gotowy blok tekstu do wklejenia na początek promptu modułu, albo
// pusty string, jeśli założenia są jeszcze puste (wtedy nic nie wstrzykujemy,
// żeby nie karmić modelu pustymi nagłówkami).
export function zalozeniaPreamble(z: Zalozenia | null): string {
  if (!z) return "";
  const parts: string[] = [];
  for (const slot of ZALOZENIA_SLOTS) {
    const val = (z[slot.key] as string | null)?.trim();
    if (val) parts.push(`- ${slot.promptLabel}: ${val}`);
  }
  if (parts.length === 0) return "";
  return [
    "ZAŁOŻENIA STRATEGICZNE RYSZARDA PETRU (nadrzędne, obowiązują w całej analizie):",
    ...parts,
    "Trzymaj się tych założeń: nie łam czerwonych linii, mów w tym tonie, celuj w te grupy, pamiętaj o tych celach. Jeśli temat wchodzi w konflikt z założeniami, zasygnalizuj to wprost.",
  ].join("\n");
}

export async function getZalozeniaPreamble(): Promise<string> {
  try {
    return zalozeniaPreamble(await getCurrentZalozenia());
  } catch {
    return "";
  }
}
