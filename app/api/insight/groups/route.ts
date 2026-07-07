import { NextResponse } from "next/server";
import { getGroupsWithCounts, getOverallStats } from "@/lib/insight";

export async function GET() {
  try {
    const [groups, stats] = await Promise.all([getGroupsWithCounts(), getOverallStats()]);
    return NextResponse.json({ groups, stats });
  } catch (err) {
    console.error("[api/insight/groups]", err);
    return NextResponse.json(
      { error: "Nie udało się pobrać listy grup społecznych." },
      { status: 500 }
    );
  }
}
