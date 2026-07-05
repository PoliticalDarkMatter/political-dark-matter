import { NextRequest, NextResponse } from "next/server";
import { supabase, DEFAULT_PROJECT_SLUG } from "@/lib/supabase";

export const maxDuration = 30;

// ── Wzbogacanie zasięgu o realne zaangażowanie per artykuł (SharedCount) ──
// Świadomie ODDZIELONE od /api/news, tym samym wzorcem co /api/enrich-sentiment:
// główny feed ma zostać szybki, to jest druga, wolniejsza fala wywoływana
// w tle po pierwszym renderze, tylko dla góry listy (BATCH_LIMIT), z cache
// w Supabase (tabela mentions, kolumny shares_facebook/shares_pinterest),
// żeby ten sam URL nigdy nie był odpytywany drugi raz w SharedCount.
//
// SharedCount zwraca REALNE liczby (reakcje, komentarze, udostępnienia na
// Facebooku, piny na Pinterest) dla danego URL — nie estymację. To właśnie ten
// realny sygnał podnosi wagę artykułu ponad bazowy autorytet domeny (patrz
// lib/domain-authority.ts): dwa artykuły z tego samego portalu, z których
// jeden realnie "poszedł" w sieci, przestają mieć identyczną wagę.
//
// Wymaga darmowego klucza SHAREDCOUNT_API_KEY w zmiennych środowiskowych
// Vercel (rejestracja na sharedcount.com, darmowy limit 10 000 zapytań/mies.).
// Bez klucza endpoint zwraca pusty wynik i /api/news działa dalej wyłącznie
// na wadze z autorytetu domeny — nic się nie psuje, tylko brakuje tej jednej
// warstwy dokładności.

const BATCH_LIMIT = 20; // ostrożnie wobec darmowego limitu SharedCount (10k/mies.)

interface ReachResult {
  facebookTotal: number;
  pinterestCount: number;
}

async function fetchSharedCount(url: string, apiKey: string): Promise<ReachResult | null> {
  try {
    const endpoint = `https://api.sharedcount.com/v1.1/counts?url=${encodeURIComponent(url)}&apikey=${apiKey}`;
    const res = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json() as {
      Facebook?: { total_count?: number; share_count?: number; comment_count?: number; reaction_count?: number };
      Pinterest?: number;
    };
    const fb = data?.Facebook;
    const facebookTotal = fb?.total_count ?? ((fb?.share_count ?? 0) + (fb?.comment_count ?? 0) + (fb?.reaction_count ?? 0));
    return { facebookTotal: facebookTotal || 0, pinterestCount: data?.Pinterest ?? 0 };
  } catch {
    return null;
  }
}

// Mnożnik wagi z realnego zaangażowania: log-skala, żeby jeden viralowy
// artykuł nie zdominował całej listy, ale realnie wyprzedził artykuły bez
// odzewu z tego samego portalu. Udokumentowany, własny dobór (nie tajemnica
// handlowa): +1 do wagi bazowej za każdy rząd wielkości udostępnień,
// z sufitem +4, żeby waga nadal mieściła się w porównywalnej skali.
function engagementBoost(facebookTotal: number, pinterestCount: number): number {
  const total = Math.max(0, facebookTotal) + Math.max(0, pinterestCount);
  if (total <= 0) return 0;
  return Math.min(4, Math.log10(1 + total));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { urls?: string[] } | null;
  const urls = Array.from(new Set((body?.urls ?? []).filter((u) => typeof u === "string" && u.startsWith("http"))));

  if (urls.length === 0) {
    return NextResponse.json({ results: {}, skipped: [] });
  }

  const apiKey = process.env.SHAREDCOUNT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ results: {}, skipped: urls, note: "SHAREDCOUNT_API_KEY nieustawiony — pomijam wzbogacenie zasięgu" });
  }

  if (req.nextUrl.searchParams.get("debug") === "1") {
    const u = encodeURIComponent(urls[0]);
    const variants = [
      `https://api.sharedcount.com/v1.1/?url=${u}&apikey=${apiKey}`,
      `https://api.sharedcount.com/v1.1/counts?url=${u}&apikey=${apiKey}`,
      `https://api.sharedcount.com/v1.1/counts/?url=${u}&apikey=${apiKey}`,
      `https://api.sharedcount.com/v1.0/?url=${u}&apikey=${apiKey}`,
    ];
    const out: Record<string, unknown>[] = [];
    for (const endpoint of variants) {
      try {
        const res = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(8000) });
        const text = await res.text();
        out.push({ endpoint: endpoint.replace(apiKey, "***"), status: res.status, body: text.slice(0, 300) });
      } catch (e) {
        out.push({ endpoint: endpoint.replace(apiKey, "***"), error: String(e) });
      }
    }
    return NextResponse.json({ variants: out, keyLen: apiKey.length });
  }

  const toProcess = urls.slice(0, BATCH_LIMIT);
  const skipped = urls.slice(BATCH_LIMIT);
  const results: Record<string, { weightBoost: number; facebookTotal: number; pinterestCount: number }> = {};

  let projectId: string | null = null;
  try {
    const { data: proj } = await supabase.from("projects").select("id").eq("slug", DEFAULT_PROJECT_SLUG).maybeSingle();
    projectId = proj?.id ?? null;
  } catch { /* Supabase niedostępny — działaj bez cache */ }

  let toFetch = toProcess;
  if (projectId) {
    try {
      const { data: cached } = await supabase
        .from("mentions")
        .select("url, shares_facebook, shares_pinterest")
        .eq("project_id", projectId)
        .not("shares_fetched_at", "is", null)
        .in("url", toProcess);
      for (const row of cached ?? []) {
        if (!row.url) continue;
        const fb = row.shares_facebook ?? 0;
        const pin = row.shares_pinterest ?? 0;
        results[row.url] = { weightBoost: engagementBoost(fb, pin), facebookTotal: fb, pinterestCount: pin };
      }
      toFetch = toProcess.filter((u) => !(u in results));
    } catch { /* brak cache — pobierz wszystko na żywo */ }
  }

  const fetched = await Promise.allSettled(toFetch.map(async (url) => ({ url, data: await fetchSharedCount(url, apiKey) })));
  const toUpsert: Array<{ project_id: string; url: string; title: string; source: string; shares_facebook: number; shares_pinterest: number; shares_fetched_at: string }> = [];

  for (const r of fetched) {
    if (r.status !== "fulfilled" || !r.value.data) continue;
    const { url, data } = r.value;
    results[url] = { weightBoost: engagementBoost(data.facebookTotal, data.pinterestCount), facebookTotal: data.facebookTotal, pinterestCount: data.pinterestCount };
    if (projectId) {
      toUpsert.push({
        project_id: projectId,
        url,
        title: "",
        source: "",
        shares_facebook: data.facebookTotal,
        shares_pinterest: data.pinterestCount,
        shares_fetched_at: new Date().toISOString(),
      });
    }
  }

  if (projectId && toUpsert.length > 0) {
    try {
      await supabase.from("mentions").upsert(toUpsert, { onConflict: "project_id,url" });
    } catch { /* ignore — cache to best-effort */ }
  }

  return NextResponse.json({ results, skipped }, { headers: { "Cache-Control": "no-store" } });
}
