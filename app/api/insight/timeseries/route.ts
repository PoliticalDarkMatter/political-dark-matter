import { NextRequest, NextResponse } from "next/server";
import {
  listTimeseriesTopics,
  getTimeseriesPoints,
  listElectionEvents,
} from "@/lib/insight";

// Dane zmieniają się co noc (ingestia) — bez tego Next.js cache'uje GET z builda.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/insight/timeseries
//   bez ?topic  → { topics, events }  (lista serii + daty wyborów)
//   z  ?topic   → { points, events }  (punkty wybranej serii; opcjonalnie &group=<uuid>)
export async function GET(req: NextRequest) {
  try {
    const topic = req.nextUrl.searchParams.get("topic")?.trim() || "";
    const group = req.nextUrl.searchParams.get("group")?.trim() || null;

    if (!topic) {
      const [topics, events] = await Promise.all([
        listTimeseriesTopics(),
        listElectionEvents(),
      ]);
      return NextResponse.json({ topics, events });
    }

    const [points, events] = await Promise.all([
      getTimeseriesPoints(topic, group),
      listElectionEvents(),
    ]);
    return NextResponse.json({ points, events });
  } catch (err) {
    console.error("[api/insight/timeseries]", err);
    return NextResponse.json(
      { error: "Nie udało się pobrać szeregu czasowego." },
      { status: 500 }
    );
  }
}
