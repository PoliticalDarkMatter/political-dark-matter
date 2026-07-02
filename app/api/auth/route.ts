import { NextRequest, NextResponse } from "next/server";

// Hasła dostępowe NIE są trzymane w kodzie. Ustaw zmienną środowiskową
// APP_PASSWORDS w Vercel (Project Settings -> Environment Variables) jako
// listę haseł rozdzielonych przecinkiem, np: APP_PASSWORDS=haslo1,haslo2
// Brak tej zmiennej = logowanie zablokowane (fail closed), a nie otwarte.
const PASSWORDS = (process.env.APP_PASSWORDS ?? "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

const COOKIE_NAME = "ns_auth";
const COOKIE_VALUE = "narrativescope_authenticated";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (PASSWORDS.length === 0 || !PASSWORDS.includes(password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dni
    path: "/",
  });

  return response;
}
