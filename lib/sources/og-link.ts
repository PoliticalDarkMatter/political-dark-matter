import type { Article, WeightBasis } from "@/app/api/news/route";
import { classifySentiment } from "@/lib/sentiment";

// ── Facebook / Instagram — priorytet najniższy, zakres celowo wąski ──────
// Zgodnie z ustaleniem: bez logowania, bez API Mety, bez prób obchodzenia
// czegokolwiek. CrowdTangle nie istnieje od 2024 — nie ma dziś żadnego
// oficjalnego, darmowego narzędzia do monitoringu publicznych stron FB/IG
// bez sesji. Jedyne, co robimy: dla POJEDYNCZEGO, ręcznie podanego linku
// (nie feed, nie automatyczny monitoring stron) odczytujemy podstawowe
// metadane Open Graph (og:title, og:description) — te same tagi, które
// Facebook renderuje bez sesji, bo są przeznaczone dla debuggera linków
// (Facebook Sharing Debugger), nie dla realnych użytkowników. To najwyżej
// tytuł/opis pojedynczego posta, nigdy komentarze ani historia strony.
//
// Działa generycznie dla dowolnego URL-a z tagami OG (nie tylko FB/IG),
// ale to jest wąski, świadomy wyjątek dla tych dwóch platform — patrz
// app/api/link-preview/route.ts i integrację w analyze-text/route.ts.

function extractMetaContent(html: string, property: string): string | null {
  // Dwie kolejności atrybutów (property/content vs content/property) —
  // różne strony serializują to inaczej.
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeHtmlEntities(m[1]);
  }
  return null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    // Encje numeryczne (&#039; &#x1f4ab; itd.) — Facebook/Instagram często
    // renderują emoji i apostrofy w tej formie, nie jako nazwane encje.
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .trim();
}

function platformLabelForUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("facebook.com") || host === "fb.watch") return "Facebook (link ręczny)";
    if (host.includes("instagram.com") || host === "instagr.am") return "Instagram (link ręczny)";
    return `Link ręczny (${host})`;
  } catch {
    return "Link ręczny";
  }
}

export async function fetchOpenGraphLink(url: string): Promise<Article | null> {
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      // UA przeglądarkowy — te platformy renderują OG-tagi w server-side
      // HTML niezależnie od tego, czy klient jest zalogowany (są po to,
      // żeby link wyglądał dobrze w podglądzie, nawet u niezalogowanego
      // odbiorcy) — to nie jest próba podszycia się pod przeglądarkę
      // w celu ominięcia czegokolwiek, tylko standardowy nagłówek.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NarrativeScope/1.0; +link-preview)" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const ogTitle = extractMetaContent(html, "og:title");
    const ogDescription = extractMetaContent(html, "og:description");
    const title = ogTitle || ogDescription;
    if (!title) return null; // strona nie renderuje OG bez sesji — nic do zrobienia, zwróć null (nie zgaduj)

    const combinedText = [ogTitle, ogDescription].filter(Boolean).join(" — ");
    const source = platformLabelForUrl(url);

    return {
      id: `og-link-${Buffer.from(url).toString("base64").slice(0, 24)}`,
      title: combinedText.slice(0, 280),
      url,
      source,
      publishedAt: new Date().toISOString(), // OG nie niesie daty publikacji — znacznik to moment pobrania, nie moment posta
      sentiment: classifySentiment(combinedText),
      weight: 3, // baza neutralna — brak realnego sygnału zaangażowania dla ręcznego linku, patrz explain
      weightBasis: "unknown" as WeightBasis,
      weightExplain: `${source}: pojedynczy link podany ręcznie, dane tylko z meta og:title/og:description (bez sesji) — brak realnych liczników zaangażowania, waga neutralna`,
    };
  } catch {
    return null;
  }
}

export function extractFacebookOrInstagramUrl(text: string): string | null {
  const m = text.match(/https?:\/\/(?:www\.)?(?:facebook\.com|fb\.watch|instagram\.com|instagr\.am)\/\S+/i);
  return m ? m[0].replace(/[),.]+$/, "") : null;
}
