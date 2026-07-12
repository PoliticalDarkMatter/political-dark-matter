import { NextRequest, NextResponse } from "next/server";
import { getGroupTaxonomy, queryInsight, type GroupDimension } from "@/lib/insight";
import { fetchOpinions } from "@/lib/insight-opinions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Puste komórki dociągają opinie z sieci (per grupa), więc zapas czasu.
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    const dimension = typeof body?.dimension === "string" ? (body.dimension as GroupDimension) : undefined;

    if (!topic || !dimension) {
      return NextResponse.json(
        { error: "Podaj temat oraz wymiar grup do porównania (np. wiek, region)." },
        { status: 400 }
      );
    }

    const allGroups = await getGroupTaxonomy();
    const groups = allGroups.filter((g) => g.dimension === dimension);

    const results = await Promise.all(
      groups.map(async (g) => {
        const result = await queryInsight(topic, [g.value]);
        // Gdy o tej grupie brak twardych danych na temat — dołącz opinie z
        // publicystyki, żeby komórka nie była pusta (jawnie jako opinie w UI).
        if (result.syntheses.length === 0 && result.raw_findings.length === 0) {
          result.opinions = await fetchOpinions(`${g.label_pl} ${topic}`, 3);
        }
        return { group: g, result };
      })
    );

    return NextResponse.json({ dimension, topic, results });
  } catch (err) {
    console.error("[api/insight/compare]", err);
    // Bez błędu w UI: zwracamy pustą listę wyników, front pokaże po prostu brak.
    return NextResponse.json({ dimension: null, topic: null, results: [] });
  }
}
