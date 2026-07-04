import { NextRequest, NextResponse } from "next/server";

// Hasła dostępowe NIE są trzymane w kodzie. Ustaw zmienną środowiskową
// APP_PASSWORDS w Vercel (Project Settings -> Environment Variables).
//
// Format (od tej zmiany): pary "Imię Nazwisko:hasło" rozdzielone przecinkiem, np:
//   APP_PASSWORDS=Jan Domaniewski:haslo1,Szymon Gawryszczak:haslo2
//
// Wsteczna kompatybilność: wpis bez dwukropka nadal działa jako samo hasło
// (osoba zostanie oznaczona jako "Użytkownik"), więc stara wartość zmiennej
// nie zablokuje nikogo — ale nie będzie identyfikowalna.
//
// Brak tej zmiennej = logowanie zablokowane (fail closed), a nie otwarte.
interface Account {
  name: string;
  password: string;
}

const ACCOUNTS: Account[] = (process.env.APP_PASSWORDS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const idx = entry.indexOf(":");
    if (idx === -1) return { name: "Użytkownik", password: entry };
    return {
      name: entry.slice(0, idx).trim(),
      password: entry.slice(idx + 1).trim(),
    };
  });

const AUTH_COOKIE = "ns_auth";
const AUTH_VALUE = "narrativescope_authenticated";
const USER_COOKIE = "ns_user";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dni

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const account = ACCOUNTS.find((a) => a.password === password);

  if (ACCOUNTS.length === 0 || !account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, name: account.name });
  response.cookies.set(AUTH_COOKIE, AUTH_VALUE, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  response.cookies.set(USER_COOKIE, account.name, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });

  return response;
}
