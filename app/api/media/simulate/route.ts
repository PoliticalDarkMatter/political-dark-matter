import { NextRequest, NextResponse } from "next/server";
import { simulateCoverage } from "@/lib/media";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { text?: string; slugs?: string[] } | null;
    const text = (body?.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Wklej przekaz do symulacji." }, { status: 400 });
    if (text.length > 3000) return NextResponse.json({ error: "Przekaz zbyt długi (limit 3000 znaków)." }, { status: 400 });
    const slugs = Array.isArray(body?.slugs) ? body!.slugs!.filter((s) => typeof s === "string") : [];
    const coverage = await simulateCoverage(text, slugs);
    if (!coverage.length) {
      return NextResponse.json({ error: "Silnik chwilowo nie odpowiedział. Spróbuj ponownie za moment." }, { status: 502 });
    }
    return NextResponse.json({ coverage });
  } catch (err) {
    console.error("[api/media/simulate]", err);
    return NextResponse.json({ error: "Nie udało się przeprowadzić symulacji." }, { status: 500 });
  }
}
