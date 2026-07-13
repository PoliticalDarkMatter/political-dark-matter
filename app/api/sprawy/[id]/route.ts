import { NextRequest, NextResponse } from "next/server";
import { getSprawaCockpit } from "@/lib/sprawy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cockpit = await getSprawaCockpit(params.id);
    if (!cockpit) return NextResponse.json({ error: "Nie znaleziono sprawy." }, { status: 404 });
    return NextResponse.json({ cockpit });
  } catch (err) {
    console.error("[api/sprawy/[id] GET]", err);
    return NextResponse.json({ error: "Nie udało się pobrać kokpitu sprawy." }, { status: 500 });
  }
}
