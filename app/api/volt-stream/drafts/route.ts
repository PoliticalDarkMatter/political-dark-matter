import { NextRequest, NextResponse } from "next/server";
import { listDrafts, saveDraft, setDraftStatus } from "@/lib/volt-stream";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const sprawaId = req.nextUrl.searchParams.get("sprawa") ?? undefined;
    const drafts = await listDrafts(sprawaId || undefined);
    return NextResponse.json({ drafts });
  } catch (err) {
    console.error("[api/volt-stream/drafts GET]", err);
    return NextResponse.json({ error: "Nie udało się pobrać przekazów." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { sprawa_id?: string; channel?: string; body?: string; status?: string } | null;
    if (!body?.body || !body?.channel) return NextResponse.json({ error: "Brak treści lub kanału." }, { status: 400 });
    const draft = await saveDraft({ sprawa_id: body.sprawa_id ?? null, channel: body.channel, body: body.body, status: body.status });
    return NextResponse.json({ draft });
  } catch (err) {
    console.error("[api/volt-stream/drafts POST]", err);
    return NextResponse.json({ error: "Nie udało się zapisać przekazu." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { id?: string; status?: string } | null;
    if (!body?.id || !body?.status) return NextResponse.json({ error: "Brak id lub statusu." }, { status: 400 });
    await setDraftStatus(body.id, body.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/volt-stream/drafts PATCH]", err);
    return NextResponse.json({ error: "Nie udało się zmienić statusu." }, { status: 500 });
  }
}
