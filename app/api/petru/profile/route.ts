import { NextResponse } from "next/server";
import { getStyleProfile, listUtterances, countUtterances } from "@/lib/petru";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [profile, utterances, total] = await Promise.all([
      getStyleProfile(), listUtterances(40), countUtterances(),
    ]);
    return NextResponse.json({ profile, utterances, total });
  } catch (err) {
    console.error("[api/petru/profile]", err);
    return NextResponse.json({ error: "Nie udało się pobrać bazy stylu e-Petru." }, { status: 500 });
  }
}
