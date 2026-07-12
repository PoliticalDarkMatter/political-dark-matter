import { NextRequest, NextResponse } from "next/server";
import { queryInsight } from "@/lib/insight";
import { fetchOpinions } from "@/lib/insight-opinions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Pusty wynik dociąga opinie z sieci, więc zapas czasu.
export const maxDuration = 30;

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
    // Brak twardych danych na temat → dołóż opinie z publicystyki (jawnie
    // oznaczone w UI), żeby zamiast pustki pokazać realne głosy z sieci.
    if (result.syntheses.length === 0 && result.raw_findings.length === 0) {
      result.opinions = await fetchOpinions(topic, 4);
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/insight/query]", err);
    // Bez błędu w UI: pusty, ale poprawny wynik.
    return NextResponse.json({ syntheses: [], raw_findings: [] });
  }
}
