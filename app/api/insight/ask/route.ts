import { NextRequest, NextResponse } from "next/server";
import { askAnalyst } from "@/lib/insight-analyst";
import { queryInsight } from "@/lib/insight";

// "Zapytaj grupę" w trybie analitycznym: te same dowody co awatar
// (persona + fuzzy match + kontekst ogólnopolski), ale odpowiedź sztabowa
// w trzeciej osobie, z liczbami i numerami dowodów. force-dynamic
// obowiązkowe: dane w bazie zmieniają się co noc.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { group?: string; question?: string };
    const group = body.group?.trim();
    const question = body.question?.trim();
    if (!group || !question) {
      return NextResponse.json({ error: "Podaj grupę i pytanie." }, { status: 400 });
    }

    let matched = null;
    let matchedGlobal = null;
    try {
      [matched, matchedGlobal] = await Promise.all([
        queryInsight(question, [group]),
        queryInsight(question, []),
      ]);
    } catch {
      // brak dopasowania nie blokuje odpowiedzi z profilu persony
    }

    const result = await askAnalyst(group, question, matched, matchedGlobal);
    if (!result) {
      return NextResponse.json(
        { error: "Nie znaleziono persony dla tej grupy. Uruchom przebudowę person (rebuild_group_personas)." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/insight/ask]", err);
    return NextResponse.json({ error: "Nie udało się przygotować analizy." }, { status: 500 });
  }
}
