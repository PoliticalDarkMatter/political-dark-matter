import { NextRequest, NextResponse } from "next/server";
import { fetchOpenGraphLink } from "@/lib/sources/og-link";

export const maxDuration = 15;

// ── Podgląd pojedynczego linku (głównie Facebook/Instagram) ──────────────
// Osobny, mały endpoint — nie wpięty w /api/news, bo to jest akcja na
// żądanie dla JEDNEGO, ręcznie podanego linku, nie część automatycznego
// zbierania. Patrz lib/sources/og-link.ts po uzasadnienie i ograniczenia.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { url?: string } | null;
  const url = (body?.url ?? "").trim();

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Podaj poprawny link (http:// lub https://)." }, { status: 400 });
  }

  const article = await fetchOpenGraphLink(url);
  if (!article) {
    return NextResponse.json(
      { error: "Nie udało się odczytać podglądu tego linku — strona może wymagać zalogowania albo nie udostępnia metadanych bez sesji." },
      { status: 422 }
    );
  }

  return NextResponse.json({ article }, { headers: { "Cache-Control": "no-store" } });
}
