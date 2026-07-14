import { supabase, DEFAULT_PROJECT_SLUG } from "@/lib/supabase";
import { getAIProvider } from "@/lib/reaction-simulator/ai-provider";
import { getStyleProfile, listUtterances } from "@/lib/petru";
import { getZalozeniaPreamble } from "@/lib/zalozenia";
import { simulateCoverage, type OutletCoverage } from "@/lib/media";

// ── Volt Stream (PRZEKAZ) — fabryka przekazu z pre-flightem ─────────────
// Zamienia decyzję/brief w gotowy zestaw komunikatów w głosie Ryszarda
// Petru (przez e-Petru), pod różne kanały. Każdy przekaz można przepuścić
// przez test przed publikacją (e-Media: jak zrama prasa; ryzyka i ataki)
// i zapisać do Sprawy ze statusem handoff, skąd trafia do Pulse Field.
// Zasada: stylizacja i układ, zero zmyślania faktów/liczb/cudzych cytatów.

export type Channel =
  | "x" | "facebook" | "instagram" | "reel" | "oswiadczenie" | "media" | "newsletter" | "talking_points";

export interface ChannelDef { id: Channel; label: string; spec: string; }
export const CHANNELS: ChannelDef[] = [
  { id: "x",             label: "Wpis na X",        spec: "Bardzo krótko, 1-3 zdania, mocny hak na start, wyrazista puenta lub hasło na końcu." },
  { id: "facebook",      label: "Wpis na Facebook", spec: "Dłuższy wpis 4-8 zdań, osobisty ton, akapit-hak, konkret, wezwanie." },
  { id: "instagram",     label: "Instagram (podpis)", spec: "Krótki, emocjonalny podpis pod grafikę + w nawiasie 1 zdanie: co powinno być na grafice." },
  { id: "reel",          label: "Reel / TikTok",    spec: "Scenariusz 15-30 s: HOOK (pierwsze 3 sekundy), 2-3 punkty do powiedzenia do kamery, mocne zamknięcie." },
  { id: "oswiadczenie",  label: "Oświadczenie",     spec: "Oficjalne, chłodne stanowisko, 4-8 zdań, jednoznaczne, ale wciąż jego logika." },
  { id: "media",         label: "Wypowiedź do mediów", spec: "3-5 zdań gotowych do zacytowania, jedno zdanie-cytat wybijające się (soundbite)." },
  { id: "newsletter",    label: "Newsletter",       spec: "Akapit do własnego medium, bardziej wyjaśniający, z argumentem i pointą." },
  { id: "talking_points",label: "Talking points (dla klubu)", spec: "4-6 zwięzłych punktów, którymi cały klub ma mówić jednym głosem; każdy punkt to gotowe zdanie." },
];

async function projectId(): Promise<string> {
  const { data } = await supabase.from("projects").select("id").eq("slug", DEFAULT_PROJECT_SLUG).single();
  if (!data) throw new Error("Brak projektu");
  return data.id as string;
}

function extractArray(raw: string): Record<string, unknown>[] | null {
  try { const j = JSON.parse(raw); return Array.isArray(j) ? j : null; } catch { /* */ }
  const m = raw.match(/\[[\s\S]*\]/);
  if (m) { try { const j = JSON.parse(m[0]); return Array.isArray(j) ? j : null; } catch { return null; } }
  return null;
}
function extractObj(raw: string): Record<string, unknown> | null {
  try { return JSON.parse(raw); } catch { /* */ }
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
  return null;
}

export interface Variant { channel: Channel; label: string; body: string; }

export async function generateKit(brief: string, channels: Channel[], grupa?: string): Promise<Variant[]> {
  const chosen = CHANNELS.filter((c) => channels.includes(c.id));
  const [profile, examples, preamble] = await Promise.all([
    getStyleProfile().catch(() => null),
    listUtterances(18).catch(() => []),
    getZalozeniaPreamble().catch(() => ""),
  ]);
  const styl = profile ? JSON.stringify(profile.profile) : "";
  const quotes = examples.slice(0, 16).map((u) => `„${u.quote_text}"`).join("\n");
  const chanBlock = chosen.map((c) => `- ${c.id} (${c.label}): ${c.spec}`).join("\n");
  const prompt = `${preamble ? preamble + "\n\n" : ""}Jesteś sztabem komunikacji Ryszarda Petru. Na podstawie BRIEFU napisz komplet przekazów, każdy w JEGO języku, rytmie i sposobie myślenia.

WZORZEC STYLU (na jego podstawie masz brzmieć):
${styl}
PRÓBKI GŁOSU (nie cytuj dosłownie):
${quotes}

${grupa ? `Grupa docelowa tego przekazu: ${grupa}. Dobierz akcenty pod nią.\n` : ""}KANAŁY (dla każdego osobny przekaz, w jego normie):
${chanBlock}

ZASADY: głos i logika Ryszarda Petru; ZERO zmyślania konkretnych liczb, danych, cudzych cytatów, których nie ma w briefie; zachowaj sens briefu; po polsku, żywo.

BRIEF:
"""${brief.slice(0, 3000)}"""

Zwróć WYŁĄCZNIE czysty JSON: tablicę obiektów po jednym na kanał:
[{"channel":"x","body":"..."}]`;
  const provider = getAIProvider();
  let raw = provider.isReal ? await provider.generateText(prompt, { maxTokens: 4096, temperature: 0.85 }) : null;
  if (!raw || !raw.trim()) raw = provider.isReal ? await provider.generateText(prompt, { maxTokens: 3000, temperature: 0.7 }) : null;
  const arr = raw ? extractArray(raw) : null;
  const byId = new Map(CHANNELS.map((c) => [c.id, c] as const));
  const out: Variant[] = [];
  for (const item of arr ?? []) {
    const c = byId.get(item.channel as Channel);
    if (!c || !item.body) continue;
    out.push({ channel: c.id, label: c.label, body: String(item.body).trim() });
  }
  return out;
}

export interface Preflight {
  gotowosc: number;
  werdykt: string;
  ryzyka: string[];
  jak_zaatakuja: string[];
  poprawki: string[];
  media: OutletCoverage[];
}

export async function preflight(text: string): Promise<Preflight> {
  const riskPrompt = `Jesteś doradcą politycznym (adwokat diabła) obozu Ryszarda Petru. Oceń PONIŻSZY przekaz PRZED publikacją. Bądź konkretny i krytyczny, ale uczciwy.

PRZEKAZ:
"""${text.slice(0, 3000)}"""

Zwróć WYŁĄCZNIE czysty JSON:
{"gotowosc": liczba 0-100 (gotowość do publikacji), "werdykt": "jedno zdanie oceny", "ryzyka": ["max 4 konkretne ryzyka"], "jak_zaatakuja": ["max 4: jak wykorzystają to przeciwnicy/PiS/Konfederacja"], "poprawki": ["max 4 konkretne poprawki, co zmienić"]}`;
  const provider = getAIProvider();
  const [riskRaw, media] = await Promise.all([
    provider.isReal ? provider.generateText(riskPrompt, { maxTokens: 1400, temperature: 0.6 }) : Promise.resolve(null),
    simulateCoverage(text, ["tvn24", "wpolityce", "fakt", "onet", "rp", "nczas"]).catch(() => [] as OutletCoverage[]),
  ]);
  const o = riskRaw ? extractObj(riskRaw) : null;
  const arr = (v: unknown): string[] => Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 4) : [];
  return {
    gotowosc: typeof o?.gotowosc === "number" ? Math.max(0, Math.min(100, o.gotowosc as number)) : 0,
    werdykt: typeof o?.werdykt === "string" ? o.werdykt : (o ? "" : "Silnik nie odpowiedział, spróbuj ponownie."),
    ryzyka: arr(o?.ryzyka), jak_zaatakuja: arr(o?.jak_zaatakuja), poprawki: arr(o?.poprawki),
    media,
  };
}

// ── Zapis do Sprawy (content_drafts) ───────────────────────────────────
export interface DraftRow { id: string; channel: string | null; body: string; status: string | null; handoff: string; sprawa_id: string | null; created_at: string; }

export async function saveDraft(input: { sprawa_id?: string | null; channel: string; body: string; status?: string }): Promise<DraftRow> {
  const pid = await projectId();
  const { data, error } = await supabase.from("content_drafts").insert({
    project_id: pid, sprawa_id: input.sprawa_id ?? null,
    channel: input.channel, body: input.body, status: input.status ?? "roboczy",
    handoff: input.status === "zatwierdzony" ? "ready" : "draft",
  }).select("id, channel, body, status, handoff, sprawa_id, created_at").single();
  if (error) throw error;
  return data as DraftRow;
}

export async function listDrafts(sprawaId?: string): Promise<DraftRow[]> {
  let q = supabase.from("content_drafts").select("id, channel, body, status, handoff, sprawa_id, created_at").order("created_at", { ascending: false }).limit(60);
  if (sprawaId) q = q.eq("sprawa_id", sprawaId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as DraftRow[]) ?? [];
}

export async function setDraftStatus(id: string, status: string): Promise<void> {
  const handoff = status === "zatwierdzony" ? "ready" : "draft";
  const { error } = await supabase.from("content_drafts").update({ status, handoff }).eq("id", id);
  if (error) throw error;
}
