// ── Wspólny klasyfikator sentymentu (słownikowy, PL) ──────────────────────
// Wydzielone z app/api/news/route.ts i app/api/enrich-sentiment/route.ts,
// gdzie te same dwie listy słów i ta sama funkcja były zduplikowane.
// Zachowanie identyczne jak wcześniej — to czysto mechaniczne wydzielenie,
// żeby nowe źródła (YouTube, X) korzystały z tej samej, jednej definicji
// zamiast kolejnej trzeciej kopii.

export type SimpleSentiment = "positive" | "negative" | "neutral";

export const SENTIMENT_POS = [
  "wzrost", "sukces", "poprawa", "rekord", "wygrał", "dobry", "pozytywny", "rozwój", "zysk",
  "inwestycje", "historyczny", "przełom", "szansa", "pokój", "wyróżnienie", "nagroda", "odbudowa",
  "wsparcie", "pomoc", "porozumienie", "zwycięstwo", "umowa", "inwestycja",
];

export const SENTIMENT_NEG = [
  "kryzys", "katastrofa", "atak", "śmierć", "wypadek", "skandal", "protest", "strajk", "inflacja",
  "drożyzna", "problem", "tragedia", "konflikt", "zagrożenie", "agresja", "korupcja", "pożar",
  "powódź", "zabójstwo", "aresztowanie", "zarzuty", "oskarżenie", "wyrok", "bankructwo", "kolizja",
  "ranny", "zginął", "zginęła", "utonął", "eksplozja", "awaria", "porażka", "afera", "kradzież",
  "oszustwo", "wyburzenie",
];

export function classifySentiment(text: string): SimpleSentiment {
  const t = text.toLowerCase();
  const p = SENTIMENT_POS.filter((w) => t.includes(w)).length;
  const n = SENTIMENT_NEG.filter((w) => t.includes(w)).length;
  if (p > n) return "positive";
  if (n > p) return "negative";
  return "neutral";
}
