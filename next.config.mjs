/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @react-pdf/renderer (silnik raportów PDF) polega na wewnętrznym
  // rejestrze fontów jako singletonie modułu (Font.register w
  // pdf-theme.tsx, odczytywany później przez renderToBuffer). Webpack,
  // gdy sam bundluje ten pakiet do route handlera, potrafi utworzyć DWIE
  // osobne kopie modułu @react-pdf/font — jedną, do której piszemy
  // (register), i drugą, z której renderer czyta (pustą) — stąd błąd
  // produkcyjny "Could not resolve font for Roboto" mimo że lokalnie
  // (zwykłe node -e / require, bez webpacka) wszystko działa. Wyjęcie
  // pakietu z bundlowania webpacka (prawdziwy require() w runtime
  // Node) naprawia to, bo gwarantuje jedną instancję modułu.
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

export default nextConfig;
