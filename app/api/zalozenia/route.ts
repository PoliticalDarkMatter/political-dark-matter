import { NextRequest, NextResponse } from "next/server";
import { getCurrentZalozenia, saveZalozenia, type ZalozeniaInput } from "@/lib/zalozenia";

// Konstytucja zmienia się w czasie i jest edytowana z UI — nigdy nie cache'ować.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const zalozenia = await getCurrentZalozenia();
    return NextResponse.json({ zalozenia });
  } catch (err) {
    console.error("[api/zalozenia GET]", err);
    return NextResponse.json({ error: "Nie udało się pobrać założeń." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { dane?: ZalozeniaInput; by?: string } | null;
    if (!body?.dane) {
      return NextResponse.json({ error: "Brak danych założeń." }, { status: 400 });
    }
    const id = await saveZalozenia(body.dane, (body.by ?? "edytor").slice(0, 120));
    const zalozenia = await getCurrentZalozenia();
    return NextResponse.json({ id, zalozenia });
  } catch (err) {
    console.error("[api/zalozenia POST]", err);
    return NextResponse.json({ error: "Nie udało się zapisać założeń." }, { status: 500 });
  }
}
