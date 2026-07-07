import { NextRequest, NextResponse } from "next/server";
import { getGroupTaxonomy, queryInsight, type GroupDimension } from "@/lib/insight";

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
      groups.map(async (g) => ({
        group: g,
        result: await queryInsight(topic, [g.value]),
      }))
    );

    return NextResponse.json({ dimension, topic, results });
  } catch (err) {
    console.error("[api/insight/compare]", err);
    return NextResponse.json(
      { error: "Nie udało się porównać odpowiedzi między grupami." },
      { status: 500 }
    );
  }
}
