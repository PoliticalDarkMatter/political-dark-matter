import { NextRequest, NextResponse } from "next/server";
import { askAvatar, type AvatarTurn } from "@/lib/insight-avatar";
import { queryInsight } from "@/lib/insight";

// Odpowiedź awatara grupy: profil persony + dowody dobrane pod pytanie
// (query_insight, fuzzy match) → model językowy z żelazną zasadą "nic bez
// dowodu". force-dynamic obowiązkowe: dane w bazie zmieniają się co noc.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      group?: string;
      question?: string;
      history?: AvatarTurn[];
    };
    const group = body.group?.trim();
    const question = body.question?.trim();
    if (!group || !question) {
      return NextResponse.json({ error: "Podaj grupę i pytanie." }, { status: 400 });
    }

    // Dowody dopasowane do treści pytania (niezależnie od profilu persony).
    let matched = null;
    try {
      matched = await queryInsight(question, [group]);
    } catch {
      matched = null; // brak dopasowania nie blokuje odpowiedzi z profilu
    }

    const result = await askAvatar(group, question, body.history ?? [], matched);
    if (!result) {
      return NextResponse.json(
        { error: "Nie znaleziono persony dla tej grupy. Uruchom przebudowę person (rebuild_group_personas)." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/insight/avatar]", err);
    return NextResponse.json({ error: "Nie udało się uzyskać odpowiedzi awatara." }, { status: 500 });
  }
}
