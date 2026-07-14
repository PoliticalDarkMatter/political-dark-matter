import { NextRequest, NextResponse } from "next/server";
import { askAvatar, type AvatarTurn } from "@/lib/insight-avatar";
import { queryInsightHybrid } from "@/lib/insight";

// Odpowiedź awatara grupy: profil persony + dowody dobrane pod pytanie
// (query_insight, fuzzy match) → model językowy z żelazną zasadą "nic bez
// dowodu". force-dynamic obowiązkowe: dane w bazie zmieniają się co noc.
export const dynamic = "force-dynamic";
export const revalidate = 0;
// Warstwa opinii dociąga publicystykę z sieci, więc dajemy zapas czasu.
export const maxDuration = 60;

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

    // Dowody dopasowane do pytania: (1) otagowane grupą, (2) kontekst z całej
    // bazy (dane ogólnopolskie i inne grupy) — do jawnie oznaczanego wnioskowania.
    let matched = null;
    let matchedGlobal = null;
    try {
      [matched, matchedGlobal] = await Promise.all([
        queryInsightHybrid(question, [group]),
        queryInsightHybrid(question, []),
      ]);
    } catch {
      // brak dopasowania nie blokuje odpowiedzi z profilu
    }

    // askAvatar zawsze zwraca odpowiedź (opinie/kontekst nawet bez persony).
    const result = await askAvatar(group, question, body.history ?? [], matched, matchedGlobal);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/insight/avatar]", err);
    // Nie pokazujemy błędu w UI — łagodna odpowiedź zastępcza.
    return NextResponse.json({
      answer: "Trudno mi teraz odpowiedzieć na to pytanie. Spróbuj ponownie za moment albo zapytaj inaczej.",
      confidence: "niska",
      usedEvidence: [],
      caveats: null,
      evidence: [],
      coverage: "brak",
      personaVersion: 0,
      aiReal: false,
    });
  }
}
