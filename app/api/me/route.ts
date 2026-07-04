import { NextRequest, NextResponse } from "next/server";

// Zwraca tożsamość aktualnie zalogowanej osoby na podstawie cookie ns_user
// ustawianego przy logowaniu w /api/auth. Nie ma tu żadnej weryfikacji hasła
// ponownie — middleware.ts już wcześniej wymusił obecność ważnego ns_auth,
// zanim ten route w ogóle się wykona.

export async function GET(req: NextRequest) {
  const name = req.cookies.get("ns_user")?.value ?? null;

  if (!name) {
    return NextResponse.json({ name: null }, { status: 200 });
  }

  return NextResponse.json({ name }, { headers: { "Cache-Control": "no-store" } });
}
