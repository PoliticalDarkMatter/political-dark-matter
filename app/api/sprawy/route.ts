import { NextRequest, NextResponse } from "next/server";
import { listSprawy, createSprawa, type SprawaTyp } from "@/lib/sprawy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_TYP = new Set<SprawaTyp>(["kampania_stala", "temat", "kryzys", "inne"]);

export async function GET() {
  try {
    const sprawy = await listSprawy();
    return NextResponse.json({ sprawy });
  } catch (err) {
    console.error("[api/sprawy GET]", err);
    return NextResponse.json({ error: "Nie udało się pobrać spraw." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { nazwa?: string; opis?: string; typ?: SprawaTyp } | null;
    const nazwa = (body?.nazwa ?? "").trim();
    if (!nazwa) return NextResponse.json({ error: "Podaj nazwę sprawy." }, { status: 400 });
    const typ = VALID_TYP.has(body?.typ as SprawaTyp) ? (body!.typ as SprawaTyp) : "temat";
    const sprawa = await createSprawa({ nazwa, opis: body?.opis, typ });
    return NextResponse.json({ sprawa });
  } catch (err) {
    console.error("[api/sprawy POST]", err);
    return NextResponse.json({ error: "Nie udało się utworzyć sprawy." }, { status: 500 });
  }
}
