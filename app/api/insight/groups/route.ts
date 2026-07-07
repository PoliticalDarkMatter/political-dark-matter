import { NextResponse } from "next/server";
import { getGroupsWithCounts, getOverallStats } from "@/lib/insight";

// Dane zmieniają się co noc (ingestia) i po ręcznych wgraniach — bez tego
// Next.js statycznie cache'uje odpowiedź GET z momentu builda.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
