import { NextRequest, NextResponse } from "next/server";
import { generateKit, type Channel } from "@/lib/volt-stream";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { brief?: string; channels?: Channel[]; grupa?: string } | null;
    const brief = (body?.brief ?? "").trim();
    if (!brief) return NextResponse.json({ error: "Podaj brief albo decyzję do przerobienia na przekaz." }, { status: 400 });
    const channels = Array.isArray(body?.channels) && body!.channels!.length ? body!.channels! : (["x", "facebook", "media", "talking_points"] as Channel[]);
    const variants = await generateKit(brief, channels, body?.grupa);
    if (!variants.length) return NextResponse.json({ error: "Silnik chwilowo nie odpowiedział. Spróbuj ponownie." }, { status: 502 });
    return NextResponse.json({ variants });
  } catch (err) {
    console.error("[api/volt-stream/generate]", err);
    return NextResponse.json({ error: "Nie udało się wygenerować przekazu." }, { status: 500 });
  }
}
