import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ns_auth";
const COOKIE_VALUE = "narrativescope_authenticated";

const PUBLIC_PREFIXES = [
  "/login", "/api/auth", "/api/news", "/api/snapshot",
  "/_next", "/favicon.ico", "/logo.png", "/modules",
  "/apex-grid", "/volt-stream", "/pulse-field",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Hub platformy jest publiczny — wizytówka, nie panel Narrative Scope
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Przepuść publiczne ścieżki
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get(COOKIE_NAME);
  const isAuthenticated = authCookie?.value === COOKIE_VALUE;

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
