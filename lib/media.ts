import { supabase } from "@/lib/supabase";
import { getAIProvider } from "@/lib/reaction-simulator/ai-provider";

// ── e-Media: wirtualny ekosystem redakcji ──────────────────────────────
// Baza profili redakcji (z przechyłem) + realne nagłówki jako wzorzec stylu.
// Symulator przewiduje, jak każda redakcja ZATYTUŁUJE i ZRAMA dany przekaz
// (plus co wytnie z kontekstu i jakie zada pytanie-gilotynę). To domyka
// EMISJĘ: zanim wyemitujesz, widzisz, jak obcy eter cię re-emituje.
// Zasada: to prognoza oparta na realnym stylu i dorobku redakcji, jawnie
// oznaczona jako symulacja. Nigdy nie twierdzimy, że dana gazeta to napisała.

export interface MediaOutlet {
  name: string;
  slug: string;
  typ: string;
  orientacja: string;
  profil: Record<string, unknown>;
  headlines?: { headline: string; framing_note: string | null; published_date: string | null }[];
}

export async function getOutlets(withHeadlines = true): Promise<MediaOutlet[]> {
  const { data, error } = await supabase
    .from("media_outlets")
    .select("name, slug, typ, orientacja, profil")
    .eq("aktywne", true)
    .order("name");
  if (error) throw error;
  const outlets = (data as MediaOutlet[]) ?? [];
  if (!withHeadlines) return outlets;
  const { data: hs } = await supabase
    .from("media_headlines")
    .select("headline, framing_note, published_date, outlet_id, media_outlets!inner(slug)")
    .order("published_date", { ascending: false, nullsFirst: false })
    .limit(200);
  const bySlug = new Map<string, MediaOutlet["headlines"]>();
  for (const row of (hs ?? []) as Array<{ headline: string; framing_note: string | null; published_date: string | null; media_outlets: { slug: string } }>) {
    const slug = row.media_outlets?.slug;
    if (!slug) continue;
    const arr = bySlug.get(slug) ?? [];
    if (arr.length < 4) arr.push({ headline: row.headline, framing_note: row.framing_note, published_date: row.published_date });
    bySlug.set(slug, arr);
  }
  for (const o of outlets) o.headlines = bySlug.get(o.slug) ?? [];
  return outlets;
}

export async function countHeadlines(): Promise<number> {
  const { count } = await supabase.from("media_headlines").select("id", { count: "exact", head: true });
  return count ?? 0;
}

export interface OutletCoverage {
  slug: string;
  name: string;
  orientacja: string;
  naglowek: string;
  rama: string;
  wyciete: string;
  pytanie: string;
}

function buildPrompt(text: string, outlets: MediaOutlet[]): string {
  const blocks = outlets.map((o) => {
    const p = o.profil ?? {};
    const ex = (o.headlines ?? []).slice(0, 3).map((h) => `   • „${h.headline}"`).join("\n");
    return `[${o.slug}] ${o.name} (${o.orientacja})
   Wobec Petru: ${(p as Record<string, string>).wobec_petru ?? ""}
   Styl nagłówka: ${(p as Record<string, string>).styl_naglowka ?? ""}
   Typowe ramy: ${Array.isArray((p as Record<string, unknown>).typowe_ramy) ? ((p as Record<string, string[]>).typowe_ramy).join(", ") : ""}
   Realne nagłówki (wzorzec stylu):\n${ex || "   • (brak próbki)"}`;
  }).join("\n\n");

  return `Jesteś doświadczonym analitykiem polskich mediów. Poniżej masz PRZEKAZ, który Ryszard Petru zamierza wyemitować, oraz profile redakcji (z ich realnym przechyłem i próbkami prawdziwych nagłówków).

Dla KAŻDEJ redakcji przewidź, jak potraktuje ten przekaz, wiernie w JEJ stylu i z JEJ przechyłem:
- naglowek: tytuł, jaki najprawdopodobniej nada temu ta redakcja (w jej stylu, długości i tonie),
- rama: w jaką ramę interpretacyjną to wsadzi (o co naprawdę zrobi z tego temat),
- wyciete: co wytnie z kontekstu albo które zdanie wyciągnie na pasek/lead (zdanie-pułapka),
- pytanie: jakie pytanie-gilotynę zadałby dziennikarz tej redakcji Ryszardowi Petru.

ZASADY:
- Bądź wierny realnemu przechyłowi: redakcje prawicowe/pro-PiS potraktują go inaczej niż liberalne czy tabloid. Ucz się z próbek nagłówków.
- To PROGNOZA, nie cytat. Nie udawaj, że redakcja już to opublikowała. Nie zmyślaj konkretnych liczb ani cudzych wypowiedzi.
- Po polsku, konkretnie, bez lania wody.

PRZEKAZ RYSZARDA PETRU:
"""${text.slice(0, 3000)}"""

REDAKCJE:
${blocks}

Zwróć WYŁĄCZNIE czysty JSON (bez markdown): tablicę obiektów, po jednym na redakcję, w kolejności jak wyżej:
[{"slug":"...","naglowek":"...","rama":"...","wyciete":"...","pytanie":"..."}]`;
}

function extractArray(raw: string): Record<string, string>[] | null {
  try { const j = JSON.parse(raw); return Array.isArray(j) ? j : null; } catch { /* try */ }
  const m = raw.match(/\[[\s\S]*\]/);
  if (m) { try { const j = JSON.parse(m[0]); return Array.isArray(j) ? j : null; } catch { return null; } }
  return null;
}

export async function simulateCoverage(text: string, slugs: string[]): Promise<OutletCoverage[]> {
  const all = await getOutlets(true);
  const chosen = slugs.length ? all.filter((o) => slugs.includes(o.slug)) : all;
  const provider = getAIProvider();
  const prompt = buildPrompt(text, chosen);
  let raw = provider.isReal ? await provider.generateText(prompt, { maxTokens: 4096, temperature: 0.8 }) : null;
  if (!raw || !raw.trim()) raw = provider.isReal ? await provider.generateText(prompt, { maxTokens: 3000, temperature: 0.7 }) : null;
  const arr = raw ? extractArray(raw) : null;
  const bySlug = new Map(chosen.map((o) => [o.slug, o]));
  const out: OutletCoverage[] = [];
  for (const item of arr ?? []) {
    const o = bySlug.get(item.slug);
    if (!o || !item.naglowek) continue;
    out.push({
      slug: o.slug, name: o.name, orientacja: o.orientacja,
      naglowek: String(item.naglowek), rama: String(item.rama ?? ""),
      wyciete: String(item.wyciete ?? ""), pytanie: String(item.pytanie ?? ""),
    });
  }
  return out;
}
