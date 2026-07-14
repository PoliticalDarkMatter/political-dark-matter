import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ns_auth";
const COOKIE_VALUE = "narrativescope_authenticated";

// Bramka obejmuje CAŁĄ aplikację. Publiczny jest tylko sam ekran logowania,
// endpoint uwierzytelniania i pliki statyczne (żeby strona logowania mogła się
// wyrenderować). Wszystko inne — łącznie z hubem "/" i każdym modułem — wymaga
// zalogowania. Ekran logowania pojawia się zanim cokolwiek innego zostanie pokazane.
const PUBLIC_PREFIXES = [
  "/login", "/api/auth",
  "/_next", "/favicon.ico",
];

// Dowolny statyczny plik z /public (obrazki, svg, itd.) ma być zawsze publiczny —
// wcześniej brakujący wpis w PUBLIC_PREFIXES (np. nowy plik .svg) powodował
// ciche przekierowanie zasobu na /login, przez co np. tło mapy świata się nie ładowało.
const STATIC_FILE_RE = /\.(png|jpe?g|svg|webp|gif|ico|avif|css|js|map|txt|json|woff2?|ttf)$/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Przepuść publiczne ścieżki i wszystkie statyczne pliki
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || STATIC_FILE_RE.test(pathname)) {
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
