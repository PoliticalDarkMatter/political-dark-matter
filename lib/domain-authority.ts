// ── Autorytet domeny: model własny, oparty o realne dane Tranco ──────────
//
// Zastępuje poprzedni ręcznie wpisany słownik MEDIA_WEIGHT (skala 1-10 "na oko").
// Metodologia, jawnie opisana (nie tajemnica handlowa jak w Brand24/SentiOne):
//
// 1) Realny sygnał wejściowy: ranga Tranco (https://tranco-list.eu) dla domeny,
//    pobrana z oficjalnego, darmowego, nie wymagającego klucza API:
//    GET https://tranco-list.eu/api/ranks/domain/{domain}
//    Tranco to akademicki, odporny na manipulację ranking popularności domen,
//    łączący dane m.in. Chrome UX Report, Cloudflare Radar, Majestic, Umbrella —
//    a nie mój szacunek. Ranga 1 = najpopularniejsza domena na świecie.
//
// 2) Transformacja rangi na skalę porównywalną z resztą aplikacji (ok. 1-10,
//    z dokładnością do jednego miejsca po przecinku, żeby faktycznie różnicować
//    artykuły z różnych portali zamiast spłaszczać je do tej samej "10"):
//
//      score = 10 - WSPOLCZYNNIK_SPADKU * log10(rank / RANGA_REFERENCYJNA)
//
//    RANGA_REFERENCYJNA = 500 (rząd wielkości największych polskich portali).
//    WSPOLCZYNNIK_SPADKU = 2.2 (dobrany tak, by realne rangi polskich mediów
//    rozłożyły się na sensowną skalę 1-10, a nie skupiły w jednym punkcie).
//    To JEST moja własna kalibracja, jawnie opisana — inaczej niż w Brand24,
//    gdzie współczynniki są tajemnicą handlową.
//
// 3) WAŻNE ograniczenie metodologiczne, którego nie da się obejść: Tranco mierzy
//    CAŁKOWITY globalny ruch na domenie (poczta, wyszukiwarka, rozrywka — nie
//    tylko sekcję informacyjną), więc duże portale wielousługowe (Onet, WP)
//    wypadają lepiej niż wyspecjalizowane witryny informacyjne o realnie dużym
//    znaczeniu politycznym, ale mniejszym ruchu ogólnym (np. PAP.pl — agencja
//    prasowa, której treści trafiają do czytelnika głównie przez przedruk na
//    innych portalach, nie przez bezpośrednie odwiedziny pap.pl). Dlatego niżej
//    jest mały, jawnie opisany wyjątek redakcyjny dla takich przypadków —
//    to jest ujawniona decyzja, nie ukryty fudge factor.
//
// Rangi pobrane 2026-07-05 (Tranco API, dane z 2026-07-04). Rangi Tranco
// zmieniają się powoli — warto odświeżyć tę tabelę raz na kilka miesięcy,
// uruchamiając ponownie skrypt pobierający (patrz scripts/fetch-domain-ranks).

export interface DomainRankEntry {
  rank: number;
  asOf: string; // data danych źródłowych Tranco
}

export const DOMAIN_RANKS: Record<string, DomainRankEntry> = {
  "wp.pl":                    { rank: 728,    asOf: "2026-07-04" },
  "onet.pl":                  { rank: 980,    asOf: "2026-07-04" },
  "interia.pl":               { rank: 1151,   asOf: "2026-07-04" },
  "gazeta.pl":                { rank: 4390,   asOf: "2026-07-04" },
  "tvn24.pl":                 { rank: 5955,   asOf: "2026-07-04" },
  "rp.pl":                    { rank: 6150,   asOf: "2026-07-04" },
  "money.pl":                 { rank: 6807,   asOf: "2026-07-04" },
  "bankier.pl":               { rank: 6912,   asOf: "2026-07-04" },
  "businessinsider.com.pl":   { rank: 7400,   asOf: "2026-07-04" },
  "fakt.pl":                  { rank: 7460,   asOf: "2026-07-04" },
  "rmf24.pl":                 { rank: 7324,   asOf: "2026-07-04" },
  "polsatnews.pl":            { rank: 7900,   asOf: "2026-07-04" },
  "tvp.pl":                   { rank: 7981,   asOf: "2026-07-04" },
  "wyborcza.pl":              { rank: 10650,  asOf: "2026-07-04" },
  "dziennik.pl":              { rank: 14767,  asOf: "2026-07-04" },
  "se.pl":                    { rank: 16861,  asOf: "2026-07-04" },
  "wpolityce.pl":             { rank: 18234,  asOf: "2026-07-04" },
  "dorzeczy.pl":              { rank: 18550,  asOf: "2026-07-04" },
  "niezalezna.pl":            { rank: 19860,  asOf: "2026-07-04" },
  "pap.pl":                   { rank: 26904,  asOf: "2026-07-04" },
  "wprost.pl":                { rank: 28543,  asOf: "2026-07-04" },
  "pb.pl":                    { rank: 31289,  asOf: "2026-07-04" },
  "radiozet.pl":              { rank: 34707,  asOf: "2026-07-04" },
  "tvp.info":                 { rank: 37809,  asOf: "2026-07-04" },
  "newsweek.pl":              { rank: 39719,  asOf: "2026-07-04" },
  "natemat.pl":               { rank: 41964,  asOf: "2026-07-04" },
  "defence24.pl":             { rank: 43556,  asOf: "2026-07-04" },
  "spidersweb.pl":            { rank: 46011,  asOf: "2026-07-04" },
  "wirtualnemedia.pl":        { rank: 47009,  asOf: "2026-07-04" },
  "benchmark.pl":             { rank: 48261,  asOf: "2026-07-04" },
  "polityka.pl":              { rank: 51894,  asOf: "2026-07-04" },
  "forbes.pl":                { rank: 59991,  asOf: "2026-07-04" },
  "antyweb.pl":               { rank: 60268,  asOf: "2026-07-04" },
  "tokfm.pl":                 { rank: 60319,  asOf: "2026-07-04" },
  "oko.press":                { rank: 68302,  asOf: "2026-07-04" },
  "gosc.pl":                  { rank: 75224,  asOf: "2026-07-04" },
  "salon24.pl":               { rank: 97901,  asOf: "2026-07-04" },
  "krytykapolityczna.pl":     { rank: 123476, asOf: "2026-07-04" },
  "biznesalert.pl":           { rank: 457794, asOf: "2026-07-04" },
  "300gospodarka.pl":         { rank: 915423, asOf: "2026-07-04" },
  "theguardian.com":          { rank: 188,    asOf: "2026-07-04" },
};

// ── Wyjątki redakcyjne: jawnie ujawnione, nie ukryte ──────────────────────
// Jedyny obecnie zastosowany wyjątek: PAP. Uzasadnienie w komentarzu wyżej.
// Wartość nadpisuje wynik transformacji rangi, nie dodaje się do niego.
export const EDITORIAL_OVERRIDES: Record<string, { score: number; reason: string }> = {
  "pap.pl": {
    score: 8,
    reason: "Agencja prasowa — realny zasięg treści PAP idzie głównie przez przedruk na innych portalach, nie przez bezpośrednie wizyty na pap.pl. Sama ranga domeny zaniża rzeczywisty wpływ.",
  },
};

const REFERENCE_RANK = 500;
const DECAY_COEFFICIENT = 2.2;

export function rankToAuthorityScore(rank: number): number {
  const raw = 10 - DECAY_COEFFICIENT * Math.log10(rank / REFERENCE_RANK);
  const clamped = Math.min(10, Math.max(1, raw));
  return Math.round(clamped * 10) / 10;
}

const FALLBACK_SCORE = 4; // domena spoza tabeli — brak realnych danych, wartość neutralna, jawnie oznaczana jako "unknown"

export interface AuthorityResult {
  score: number;
  basis: "tranco" | "editorial_override" | "unknown";
  rank?: number;
  asOf?: string;
  reason?: string;
}

// Normalizuje host (usuwa "www.", lowercase) i próbuje dopasować do znanej
// domeny — także wtedy, gdy artykuł jest na subdomenie (np. wiadomosci.onet.pl
// dopasuje się do wpisu "onet.pl" przez dopasowanie najdłuższego sufiksu).
export function normalizeDomain(hostOrUrl: string): string {
  let host = hostOrUrl;
  try {
    if (hostOrUrl.includes("://")) host = new URL(hostOrUrl).hostname;
  } catch { /* nieprawidłowy URL — użyj jak jest */ }
  return host.toLowerCase().replace(/^www\./, "");
}

function findKnownDomain(host: string): string | null {
  if (DOMAIN_RANKS[host]) return host;
  // dopasowanie po sufiksie: subdomena.onet.pl -> onet.pl
  const parts = host.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const suffix = parts.slice(i).join(".");
    if (DOMAIN_RANKS[suffix]) return suffix;
  }
  return null;
}

// ── Ważny szczegół techniczny: Google News (i czasem Bing News) w polu <link>
// zwraca WŁASNY adres przekierowujący (news.google.com/rss/articles/...), nie
// bezpośredni URL wydawcy. Odczytanie prawdziwego adresu wymagałoby dodatkowego
// zapytania sieciowego na każdy artykuł (zbyt kosztowne przy dziesiątkach
// artykułów na żądanie). Zamiast tego korzystamy z nazwy źródła, którą Google
// News i tak podaje w tagu <source> (i którą silnik już wyciąga do pola
// "source" artykułu) — i mapujemy ją na domenę. To jest jawnie opisany,
// drugi tor rozpoznawania domeny, używany tylko gdy sam URL nie wystarcza.
const SOURCE_NAME_TO_DOMAIN: Record<string, string> = {
  "gazeta": "gazeta.pl", "gazeta.pl": "gazeta.pl", "gazeta wyborcza": "wyborcza.pl", "wyborcza": "wyborcza.pl", "wyborcza.pl": "wyborcza.pl",
  "onet": "onet.pl", "onet wiadomosci": "onet.pl", "onet.pl": "onet.pl",
  "wp": "wp.pl", "wirtualna polska": "wp.pl", "wp wiadomosci": "wp.pl", "wp.pl": "wp.pl",
  "interia": "interia.pl", "interia fakty": "interia.pl", "interia.pl": "interia.pl",
  "tvn24": "tvn24.pl", "tvn24.pl": "tvn24.pl",
  "rmf24": "rmf24.pl", "rmf24.pl": "rmf24.pl", "rmf fm": "rmf24.pl",
  "polsat news": "polsatnews.pl", "polsatnews.pl": "polsatnews.pl",
  "tvp info": "tvp.info", "tvp.info": "tvp.info", "tvp world": "tvp.pl", "tvp": "tvp.pl",
  "rzeczpospolita": "rp.pl", "rp.pl": "rp.pl",
  "polityka": "polityka.pl", "polityka.pl": "polityka.pl",
  "newsweek polska": "newsweek.pl", "newsweek": "newsweek.pl", "newsweek.pl": "newsweek.pl",
  "do rzeczy": "dorzeczy.pl", "dorzeczy.pl": "dorzeczy.pl",
  "bankier.pl": "bankier.pl", "bankier": "bankier.pl",
  "fakt": "fakt.pl", "fakt.pl": "fakt.pl", "super express": "se.pl", "se.pl": "se.pl",
  "wprost": "wprost.pl", "wprost.pl": "wprost.pl",
  "money.pl": "money.pl", "money": "money.pl",
  "dziennik.pl": "dziennik.pl", "dziennik": "dziennik.pl",
  "wpolityce.pl": "wpolityce.pl", "wpolityce": "wpolityce.pl",
  "niezalezna.pl": "niezalezna.pl", "niezalezna": "niezalezna.pl",
  "natemat.pl": "natemat.pl", "natemat": "natemat.pl",
  "oko.press": "oko.press", "oko press": "oko.press",
  "wirtualnemedia.pl": "wirtualnemedia.pl", "wirtualne media": "wirtualnemedia.pl",
  "radio zet": "radiozet.pl", "radiozet.pl": "radiozet.pl",
  "business insider polska": "businessinsider.com.pl", "businessinsider.com.pl": "businessinsider.com.pl",
  "puls biznesu": "pb.pl", "pb.pl": "pb.pl",
  "forbes.pl": "forbes.pl", "forbes polska": "forbes.pl",
  "defence24.pl": "defence24.pl", "defence24": "defence24.pl",
  "salon24.pl": "salon24.pl", "salon24": "salon24.pl",
  "krytyka polityczna": "krytykapolityczna.pl", "krytykapolityczna.pl": "krytykapolityczna.pl",
  "gosc.pl": "gosc.pl", "gość.pl": "gosc.pl",
  "pap": "pap.pl", "pap.pl": "pap.pl",
  "spidersweb.pl": "spidersweb.pl", "spider's web": "spidersweb.pl",
  "antyweb.pl": "antyweb.pl", "antyweb": "antyweb.pl",
  "the guardian": "theguardian.com", "guardian": "theguardian.com",
};

function normalizeSourceName(name: string): string {
  return name.toLowerCase().trim().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function findDomainByName(sourceName: string): string | null {
  const domain = SOURCE_NAME_TO_DOMAIN[normalizeSourceName(sourceName)];
  return domain && DOMAIN_RANKS[domain] ? domain : null;
}

export function authorityScoreForUrl(url: string, sourceName?: string): AuthorityResult {
  const host = normalizeDomain(url);
  let known = findKnownDomain(host);
  let viaName = false;

  if (!known && sourceName) {
    known = findDomainByName(sourceName);
    viaName = known != null;
  }

  if (known && EDITORIAL_OVERRIDES[known]) {
    const ov = EDITORIAL_OVERRIDES[known];
    return { score: ov.score, basis: "editorial_override", reason: ov.reason };
  }
  if (known) {
    const entry = DOMAIN_RANKS[known];
    const note = viaName ? ` (rozpoznano po nazwie źródła, nie po URL — link prowadzi przez przekierowanie agregatora)` : "";
    return { score: rankToAuthorityScore(entry.rank), basis: "tranco", rank: entry.rank, asOf: entry.asOf, reason: note || undefined };
  }
  return { score: FALLBACK_SCORE, basis: "unknown" };
}
