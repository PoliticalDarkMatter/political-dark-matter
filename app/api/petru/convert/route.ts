import { NextRequest, NextResponse } from "next/server";
import { convertText, type PetruMode } from "@/lib/petru";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID = new Set<PetruMode>(["wypowiedz", "post", "oswiadczenie", "tweet"]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { text?: string; tryb?: PetruMode } | null;
    const text = (body?.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Wklej przekaz do przerobienia." }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "Przekaz zbyt długi (limit 4000 znaków)." }, { status: 400 });
    const tryb: PetruMode = VALID.has(body?.tryb as PetruMode) ? (body!.tryb as PetruMode) : "wypowiedz";
    const result = await convertText(text, tryb);
    if (!result.przerobiony) {
      return NextResponse.json({ error: "Silnik chwilowo nie odpowiedział. Spróbuj ponownie za moment." }, { status: 502 });
    }
    return NextResponse.json({ result });
  } catch (err) {
    console.error("[api/petru/convert]", err);
    return NextResponse.json({ error: "Nie udało się przerobić przekazu." }, { status: 500 });
  }
}
