/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silnik raportów PDF (@react-pdf/renderer) czyta pliki fontów z dysku
  // w czasie działania (fs.readFileSync w lib/reports/pdf-theme.tsx) —
  // Vercel's file tracing nie zawsze wychwytuje takie dynamiczne odczyty,
  // więc jawnie dołączamy assets/fonts do bundli API routes z raportami.
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/route": ["./assets/fonts/**"],
    },
  },
};

export default nextConfig;
