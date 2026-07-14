import type { Metadata } from "next";

// Nadpisujemy tytuł i opis z root layoutu, żeby ekran logowania nie zdradzał
// nazwy ani przeznaczenia programu (widoczne w karcie przeglądarki / źródle).
export const metadata: Metadata = {
  title: "Logowanie",
  description: "",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
