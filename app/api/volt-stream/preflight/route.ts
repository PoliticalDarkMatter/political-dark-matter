import { NextRequest, NextResponse } from "next/server";
import { preflight } from "@/lib/volt-stream";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { text?: string } | null;
    const text = (body?.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Brak przekazu do testu." }, { status: 400 });
    const result = await preflight(text);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("[api/volt-stream/preflight]", err);
    return NextResponse.json({ error: "Nie udało się przeprowadzić testu." }, { status: 500 });
  }
}
