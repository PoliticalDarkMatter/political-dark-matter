import { NextRequest, NextResponse } from "next/server";

const PASSWORDS = ["A132a132!", "SzymekZabka2025"];
const COOKIE_NAME = "ns_auth";
const COOKIE_VALUE = "narrativescope_authenticated";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!PASSWORDS.includes(password)) {
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
