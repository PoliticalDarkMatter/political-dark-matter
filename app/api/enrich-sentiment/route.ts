import { NextRequest, NextResponse } from "next/server";
import { supabase, DEFAULT_PROJECT_SLUG } from "@/lib/supabase";

export const maxDuration = 30;

// ── Wzbogacanie sentymentu o pełną treść artykułu ─────────────────
// Świadomie ODDZIELONE od /api/news: główny feed musi zostać szybki i
// niezawodny (title-based sentyment, jak dotąd). To jest druga, wolniejsza
// fala — client wywołuje to W TLE po pierwszym renderze, dla ograniczonej
// partii URL-i naraz (BATCH_LIMIT), z cache w Supabase (tabela mentions),
// żeby ten sam artykuł nigdy nie był pobierany dwa razy.
//
// To NIE zastępuje sentymentu w narracjach/aktorach (te nadal liczą się
// z tytułów w /api/news) — na razie podnosi dokładność na poziomie
// pojedynczej karty artykułu. Podniesienie dokładności agregatów
// wymagałoby przeprojektowania /api/news na dwuetapowy pipeline — to
// osobny, większy krok, nie ten.

const BATCH_LIMIT = 25;

const POS = ["wzrost","sukces","poprawa","rekord","wygrał","dobry","pozytywny","rozwój","zysk","inwestycje","historyczny","przełom","szansa","pokój","wyróżnienie","nagroda","odbudowa","wsparcie","pomoc","porozumienie","zwycięstwo","umowa","inwestycja"];
const NEG = ["kryzys","katastrofa","atak","śmierć","wypadek","skandal","protest","strajk","inflacja","drożyzna","problem","tragedia","konflikt","zagrożenie","agresja","korupcja","pożar","powódź","zabójstwo","aresztowanie","zarzuty","oskarżenie","wyrok","bankructwo","kolizja","ranny","zginął","zginęła","utonął","eksplozja","awaria","porażka","afera","kradzież","oszustwo","wyburzenie"];

function sentimentOf(text: string): "positive" | "negative" | "neutral" {
  const t = text.toLowerCase();
  const p = POS.filter((w) => t.includes(w)).length;
  const n = NEG.filter((w) => t.includes(w)).length;
  if (p > n) return "positive";
  if (n > p) return "negative";
  return "neutral";
}

function extractVisibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchArticleSentiment(url: string): Promise<"positive" | "negative" | "neutral" | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NarrativeScope/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const text = extractVisibleText(html).slice(0, 6000); // pierwsze ~6000 znaków treści strony
    if (text.length < 100) return null; // za mało treści — nie ufaj, zostaw tytułowy sentyment
    return sentimentOf(text);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { urls?: string[] } | null;
  const urls = Array.from(new Set((body?.urls ?? []).filter((u) => typeof u === "string" && u.startsWith("http"))));

  if (urls.length === 0) {
    return NextResponse.json({ results: {}, skipped: [] });
  }

  const toProcess = urls.slice(0, BATCH_LIMIT);
  const skipped = urls.slice(BATCH_LIMIT);

  const results: Record<string, "positive" | "negative" | "neutral"> = {};

  // 1) sprawdź cache w Supabase — nie pobieraj drugi raz tego samego artykułu
  let projectId: string | null = null;
  try {
    const { data: proj } = await supabase.from("projects").select("id").eq("slug", DEFAULT_PROJECT_SLUG).maybeSingle();
    projectId = proj?.id ?? null;
  } catch { /* Supabase niedostępny — działaj bez cache, nie wywalaj całego requestu */ }

  let toFetch = toProcess;
  if (projectId) {
    try {
      const { data: cached } = await supabase
        .from("mentions")
        .select("url, sentiment")
        .eq("project_id", projectId)
        .not("enriched_at", "is", null)
        .in("url", toProcess);
      for (const row of cached ?? []) {
        if (row.url && row.sentiment) results[row.url] = row.sentiment as "positive" | "negative" | "neutral";
      }
      toFetch = toProcess.filter((u) => !(u in results));
    } catch { /* brak cache — pobierz wszystko na żywo */ }
  }

  // 2) pobierz pełną treść dla tego, czego nie ma w cache (równolegle, bounded)
  const fetched = await Promise.allSettled(toFetch.map(async (url) => ({ url, sentiment: await fetchArticleSentiment(url) })));
  const toUpsert: Array<{ project_id: string; url: string; title: string; source: string; sentiment: string; enriched_at: string }> = [];
  for (const r of fetched) {
    if (r.status !== "fulfilled" || !r.value.sentiment) continue;
    results[r.value.url] = r.value.sentiment;
    if (projectId) {
      toUpsert.push({
        project_id: projectId,
        url: r.value.url,
        title: "",
        source: "",
        sentiment: r.value.sentiment,
        enriched_at: new Date().toISOString(),
      });
    }
  }

  // 3) zapisz do cache (best-effort — błąd zapisu nie ma zepsuć odpowiedzi)
  if (projectId && toUpsert.length > 0) {
    try {
      await supabase.from("mentions").upsert(toUpsert, { onConflict: "project_id,url" });
    } catch { /* ignore */ }
  }

  return NextResponse.json({ results, skipped }, { headers: { "Cache-Control": "no-store" } });
}
