import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ns_auth", "", { maxAge: 0, path: "/" });
  response.cookies.set("ns_user", "", { maxAge: 0, path: "/" });
  return response;
}
