import { NextRequest, NextResponse } from "next/server";
import { queryInsight } from "@/lib/insight";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    const groupValues: string[] = Array.isArray(body?.groupValues)
      ? body.groupValues.filter((v: unknown) => typeof v === "string")
      : [];

    if (!topic) {
      return NextResponse.json({ error: "Podaj temat pytania." }, { status: 400 });
    }

    const result = await queryInsight(topic, groupValues);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/insight/query]", err);
    return NextResponse.json(
      { error: "Nie udało się wykonać zapytania do Insight Base." },
      { status: 500 }
    );
  }
}
