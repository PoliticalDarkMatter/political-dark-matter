import { NextRequest, NextResponse } from "next/server";
import { getGroupProfile } from "@/lib/insight";

export async function GET(req: NextRequest) {
  try {
    const value = req.nextUrl.searchParams.get("group");
    if (!value) {
      return NextResponse.json({ error: "Podaj identyfikator grupy." }, { status: 400 });
    }

    const profile = await getGroupProfile(value);
    if (!profile) {
      return NextResponse.json({ error: "Nie znaleziono takiej grupy w taksonomii." }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("[api/insight/profile]", err);
    return NextResponse.json(
      { error: "Nie udało się pobrać charakterystyki grupy." },
      { status: 500 }
    );
  }
}
