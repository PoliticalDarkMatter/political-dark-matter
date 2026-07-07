import { NextResponse } from "next/server";
import { getGroupsWithCounts } from "@/lib/insight";

export async function GET() {
  try {
    const groups = await getGroupsWithCounts();
    return NextResponse.json({ groups });
  } catch (err) {
    console.error("[api/insight/groups]", err);
    return NextResponse.json(
      { error: "Nie udało się pobrać listy grup społecznych." },
      { status: 500 }
    );
  }
}
