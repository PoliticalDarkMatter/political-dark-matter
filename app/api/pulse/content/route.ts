import { NextRequest, NextResponse } from "next/server";
import { listContent, upsertContent, setPublished, deleteContent, type PublicTyp } from "@/lib/pulse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID = new Set<PublicTyp>(["film", "wpis", "analiza", "przekaz"]);

export async function GET() {
  try {
    const items = await listContent();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[api/pulse GET]", err);
    return NextResponse.json({ error: "Nie udało się pobrać treści." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const typ = String(b?.typ ?? "") as PublicTyp;
    const tytul = String(b?.tytul ?? "").trim();
    if (!VALID.has(typ)) return NextResponse.json({ error: "Zły typ." }, { status: 400 });
    if (!tytul) return NextResponse.json({ error: "Podaj tytuł." }, { status: 400 });
    const item = await upsertContent({
      id: (b?.id as string) || null,
      typ,
      tytul,
      lead: (b?.lead as string) ?? null,
      tresc: (b?.tresc as string) ?? null,
      media_url: (b?.media_url as string) ?? null,
      zrodlo_url: (b?.zrodlo_url as string) ?? null,
      temat: (b?.temat as string) ?? null,
      published: Boolean(b?.published),
    });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[api/pulse POST]", err);
    return NextResponse.json({ error: "Nie udało się zapisać." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const b = (await req.json().catch(() => null)) as { id?: string; published?: boolean } | null;
    if (!b?.id) return NextResponse.json({ error: "Brak id." }, { status: 400 });
    const item = await setPublished(b.id, Boolean(b.published));
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[api/pulse PATCH]", err);
    return NextResponse.json({ error: "Nie udało się zmienić statusu." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Brak id." }, { status: 400 });
    await deleteContent(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/pulse DELETE]", err);
    return NextResponse.json({ error: "Nie udało się usunąć." }, { status: 500 });
  }
}
