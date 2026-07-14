import { NextResponse } from "next/server";
import { getOutlets, countHeadlines } from "@/lib/media";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [outlets, total] = await Promise.all([getOutlets(false), countHeadlines()]);
    return NextResponse.json({ outlets, total });
  } catch (err) {
    console.error("[api/media/outlets]", err);
    return NextResponse.json({ error: "Nie udało się pobrać redakcji." }, { status: 500 });
  }
}
