import { NextRequest, NextResponse } from "next/server";

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface EntityInfo {
  name: string;
  count: number;
  sentimentBreakdown: { positive: number; negative: number; neutral: number };
  dominantSentiment: "positive" | "negative" | "neutral";
}

export interface NarrativeCluster {
  label: string;
  icon: string;
  count: number;
  percentage: number;
  dominantSentiment: "positive" | "negative" | "neutral";
  topArticles: Array<{ title: string; url: string; source: string }>;
}

// ── Sentiment ────────────────────────────────────────────────────
const POS = ["wzrost","sukces","poprawa","rekord","wygrał","dobry","pozytywny","rozwój","zysk","inwestycje","historyczny","przełom","szansa","pokój","wyróżnienie","nagroda","odbudowa","wsparcie","pomoc","porozumienie","zwycięstwo","umowa","inwestycja"];
const NEG = ["kryzys","katastrofa","atak","śmierć","wypadek","skandal","protest","strajk","inflacja","drożyzna","problem","tragedia","konflikt","zagrożenie","agresja","korupcja","pożar","powódź","zabójstwo","aresztowanie","zarzuty","oskarżenie","wyrok","bankructwo","kolizja","ranny","zginął","zginęła","utonął","eksplozja","awaria","porażka","afera","kradzież","oszustwo","wyburzenie"];

function sentiment(text: string): Article["sentiment"] {
  const t = text.toLowerCase();
  const p = POS.filter(w => t.includes(w)).length;
  const n = NEG.filter(w => t.includes(w)).length;
  if (p > n) return "positive";
  if (n > p) return "negative";
  return "neutral";
}

// ── RSS parser (ogólny) ──────────────────────────────────────────
function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${name}>`, "i"));
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

function parseRSS(xml: string, defaultSource: string, limit = 15): Article[] {
  const items = xml.match(/<item[\s>]([\s\S]*?)<\/item>/gi) ?? [];
  return items.slice(0, limit).map((item, i) => {
    let title = tag(item, "title");
    const url = tag(item, "link") || tag(item, "guid");
    const pubDate = tag(item, "pubDate");

    // Google News RSS: title zawiera "- Źródło" na końcu
    const srcTag = item.match(/<source[^>]*>([^<]+)<\/source>/i);
    let source = srcTag ? srcTag[1].trim() : defaultSource;

    // Odetnij "- NazwaŹródła" z końca tytułu (Google News)
    if (srcTag) {
      const suffix = new RegExp(`\\s*-\\s*${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
      title = title.replace(suffix, "").trim();
      if (!title) {
        // fallback: odetnij ostatni " - X"
        title = title.replace(/\s*-\s*[^-]+$/, "").trim();
      }
    }

    if (!title || !url) return null;
    return {
      id: `${defaultSource}-${i}`,
      title,
      url,
      source,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      sentiment: sentiment(title),
    } as Article;
  }).filter(Boolean) as Article[];
}

// ── Polskie RSS feeds (tryb monitorowania) ───────────────────────
const POLISH_FEEDS: { name: string; url: string }[] = [
  { name: "PAP",     url: "https://www.pap.pl/aktualnosci/feed" },
  { name: "TVN24",   url: "https://tvn24.pl/najnowsze.xml" },
  { name: "RMF24",   url: "https://www.rmf24.pl/fakty/feed" },
  { name: "Onet",    url: "https://wiadomosci.onet.pl/.feed" },
  { name: "WP",      url: "https://wiadomosci.wp.pl/rss.xml" },
  { name: "Bankier", url: "https://www.bankier.pl/rss/wiadomosci.xml" },
];

async function fetchFeed(feed: { name: string; url: string }): Promise<Article[]> {
  try {
    const res = await fetch(feed.url, {
      cache: "no-store",
      headers: { "User-Agent": "NarrativeScope/1.0 (+https://narrativescope.com)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    return parseRSS(await res.text(), feed.name, 15);
  } catch {
    return [];
  }
}

// ── Google News RSS Search (tryb wyszukiwania) ───────────────────
// Gdy użytkownik wpisuje zapytanie, przeszukujemy Google News zamiast
// filtrować 6 feedów. Zwraca do 100 artykułów z całej polskiej prasy.
async function searchGoogleNews(query: string): Promise<Article[]> {
  const encoded = encodeURIComponent(query + " site:*.pl OR język:pl");
  // Dwie wersje URL — z i bez filtra językowego (fallback)
  const urls = [
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pl&gl=PL&ceid=PL:pl`,
    `https://news.google.com/rss/search?q=${encoded}&hl=pl&gl=PL&ceid=PL:pl`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NarrativeScope/1.0; +https://narrativescope.com)",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
          "Accept-Language": "pl-PL,pl;q=0.9",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      const articles = parseRSS(text, "Google News", 100);
      if (articles.length > 0) return articles;
    } catch {
      continue;
    }
  }

  // Fallback: Bing News RSS
  try {
    const bingUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=RSS&mkt=pl-PL`;
    const res = await fetch(bingUrl, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NarrativeScope/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const articles = parseRSS(await res.text(), "Bing News", 50);
      if (articles.length > 0) return articles;
    }
  } catch { /* ignore */ }

  return [];
}

// ── Reddit JSON API (darmowe, bez klucza) ────────────────────────
// Subreddity: r/poland (po polsku), r/europe (kontekst), r/worldnews (Polska tematy)
const REDDIT_SUBS_MONITOR = ["poland", "europe"];

interface RedditPost { title: string; url: string; permalink: string; created_utc: number; subreddit: string }
interface RedditResp { data: { children: Array<{ data: RedditPost }> } }

async function fetchRedditJSON(url: string): Promise<Article[]> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "NarrativeScope/1.0 (+https://narrativescope.com; jan.domaniewski@multinewsroom.pl)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json() as RedditResp;
    return (data?.data?.children ?? []).map(function (c, i) {
      const p = c.data;
      if (!p.title) return null;
      const postUrl = p.url.startsWith("/r/")
        ? "https://www.reddit.com" + p.url
        : p.url;
      return {
        id: "reddit-" + p.subreddit + "-" + i,
        title: p.title,
        url: postUrl,
        source: "Reddit r/" + p.subreddit,
        publishedAt: new Date(p.created_utc * 1000).toISOString(),
        sentiment: sentiment(p.title),
      } as Article;
    }).filter(Boolean) as Article[];
  } catch {
    return [];
  }
}

async function searchReddit(query: string): Promise<Article[]> {
  const enc = encodeURIComponent(query);
  const urls = REDDIT_SUBS_MONITOR.map(function (sub) {
    return `https://www.reddit.com/r/${sub}/search.json?q=${enc}&sort=new&limit=25&restrict_sr=on`;
  });
  const results = await Promise.allSettled(urls.map(fetchRedditJSON));
  return results.flatMap(function (r) { return r.status === "fulfilled" ? r.value : []; });
}

async function fetchRedditMonitor(): Promise<Article[]> {
  const urls = REDDIT_SUBS_MONITOR.map(function (sub) {
    return `https://www.reddit.com/r/${sub}/new.json?limit=25`;
  });
  const results = await Promise.allSettled(urls.map(fetchRedditJSON));
  return results.flatMap(function (r) { return r.status === "fulfilled" ? r.value : []; });
}

// ── Stop words ───────────────────────────────────────────────────
const STOP = new Set(["w","z","do","na","za","po","ze","i","a","o","u","ze","to","jak","ale","nie","co","sie","go","je","im","ich","ten","ta","te","byc","jest","sa","byl","byla","czy","tez","juz","przez","dla","przy","nad","pod","miedzy","jego","jej","tego","tej","tych","jako","oraz","bo","gdy","jesli","raz","tym","ta","że","się","już","też","czy","być","jest","są","był","była","przez"]);

function filterByQuery(articles: Article[], q: string): Article[] {
  if (!q || q === "*") return articles;
  const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
  if (words.length === 0) return articles;
  return articles.filter(a => {
    const title = a.title.toLowerCase();
    return words.some(w => title.includes(w));
  });
}

// ── Filtr czasu ──────────────────────────────────────────────────
function filterByTime(articles: Article[], period: string, from?: string, to?: string): Article[] {
  const now = Date.now();
  if (from && to) {
    const f = new Date(from).getTime();
    const t = new Date(to).getTime();
    return articles.filter(a => {
      const ts = new Date(a.publishedAt).getTime();
      return ts >= f && ts <= t;
    });
  }
  const ms: Record<string, number> = {
    "1h":  3600000,
    "24h": 86400000,
    "7d":  7 * 86400000,
    "30d": 30 * 86400000,
  };
  if (period && ms[period]) {
    const cutoff = now - ms[period];
    return articles.filter(a => new Date(a.publishedAt).getTime() >= cutoff);
  }
  return articles; // 1y i brak = wszystko
}

// ── Ekstrakcja aktorów ───────────────────────────────────────────
const ENTITY_BLACKLIST = new Set([
  // Miejsca i instytucje ogólne
  "Polska","Polacy","Warszawa","Europa","Unia","Europejska","Minister","Premier",
  "Sejm","Senat","PiS","KO","PSL","TD","Lewica","NBP","GUS","NIK","PKB","USA",
  "NATO","UE","ONZ","RP","TVP","TVN","RMF","Rząd","Policja","Google","News",
  "Koalicja","Alert","Breaking","Ekstra","Super","Nowy","Nowa","Wielki","Wielka",
  // Formy deklinacyjne miejsc
  "Poland","Niemiec","Niemcy","Francji","Berlinie","Moskwie","Kijowie","Londynie",
  "Brukseli","Waszyngtonie","Wielkopolsce","Mazowszu","Pomorzu",
  // Pospolite rzeczowniki z wielkiej litery po kropce
  "Szef","Szefem","Firma","Spółka","Kraj","Miasto","Region","Rynek","Fundusz",
  // Przymiotniki narodowościowe i opisowe — często mylone z nazwami własnymi
  "Polski","Polskie","Polskim","Polskiego","Polskiej","Polskich",
  "Rosyjski","Rosyjska","Rosyjskie","Rosyjskim","Rosyjskiego",
  "Ukrainski","Ukraiński","Ukraińska","Ukraińskie","Ukraińskim",
  "Europejski","Europejska","Europejskie","Europejskim","Europejskiego",
  "Krajowy","Krajowa","Krajowe","Krajowym","Krajowej",
  "Centralny","Centralna","Centralne","Centralnym",
  "Publiczny","Publiczna","Publiczne","Publicznym",
  "Nowych","Nowym","Nowej","Nowego","Nowe","Nowi","Nowym",
  "Kolejny","Kolejna","Kolejne","Kolejnym","Kolejnego","Kolejnej",
  "Główny","Główna","Główne","Głównym","Głównego",
  "Wielki","Wielka","Wielkie","Wielkim","Wielkiego","Wielkiej",
]);

// Czasowniki / wyrazy które błędnie łapie regex gdy zdanie zaczyna się wielką literą.
// Regex w extractEntities obsługuje formy morfologiczne; tu zostają formy nieregularne
// i wyrazy pospolite, których regex nie wyłapuje (za krótka końcówka).
const VERB_BLACKLIST = new Set([
  // Formy regularne (backup – regex je też łapie)
  "Trwa","Trwają","Trwało","Ruszyła","Ruszył","Ruszają","Będzie","Będą",
  "Wygrał","Wygrała","Zginął","Zginęła","Powiedział","Stwierdziła",
  "Ogłosił","Ogłosiła","Podpisał","Zatrzymał","Aresztowano","Zakończył",
  "Odbył","Odbędzie","Rozpoczął","Zajął","Zajęła","Wróci","Wrócił",
  "Wzrósł","Spadł","Rośnie","Spada","Planuje","Chce","Musi","Może",
  // Formy nieregularne / krótkie – regex ich nie łapie
  "Zostaje","Zostają","Zostało","Pozostaje","Pozostają","Istnieje","Istnieją",
  "Rośnie","Maleje","Wzrasta","Opada","Zmienia","Zmieniają","Zmieniło",
  "Dotyczy","Dotyczą","Wynika","Wynikają","Pochodzi","Pochodzą",
  "Liczy","Liczą","Kosztuje","Kosztują","Wynosi","Wynoszą",
  // Przymiotniki i przysłówki pospolite z dużej litery
  "Pierwsza","Pierwsze","Pierwszego","Pierwszej","Pierwszym","Pierwszy",
  "Całej","Całego","Całym","Całą","Całe","Cały",
  // Przysłówki temporalne i spójniki często zaczynające zdanie
  "Wtedy","Teraz","Jednak","Tylko","Także","Natomiast","Ponadto",
  "Niestety","Ostatecznie","Tymczasem","Wcześniej","Później","Dalej",
  "Dziś","Dzisiaj","Jutro","Wczoraj","Właśnie","Oczywiście","Wprost",
  "Mimo","Choć","Chociaż","Kiedy","Skoro","Zanim","Dopóki","Zatem",
  "Przez","Przed","Między","Wśród","Według","Wobec","Wokół",
]);

// Normalizacja diakrytyków do celów porównywania prefiksów.
// Kluczowe: ó→o łączy "Lwów" z "Lwowa", ą→a łączy "Kraków" z "Krakowa", itp.
function normalizeForKey(s: string): string {
  return s.toLowerCase()
    .replace(/ó/g, "o").replace(/ą/g, "a").replace(/ę/g, "e")
    .replace(/ź/g, "z").replace(/ż/g, "z").replace(/ś/g, "s")
    .replace(/ć/g, "c").replace(/ń/g, "n").replace(/ł/g, "l");
}

// Wybiera kanoniczną (mianownikową) formę z grupy odmian polskich.
// Strategia:
//   1. -ski/-cki/-dzki → nazwisko przymiotnikowe (Kowalski, Tusk)
//   2. Odrzuć silnie odmienione: -ego/-iego (dop.przym.), -owi/-emu (cel.), -iu (miejs. n.)
//   3. Gdy pool pusty po odfiltrowaniu, spróbuj zrekonstruować mianownik:
//      -iu → -ie (Jastrzębiu → Jastrzębie), -ach → odetnij (Katowicach → Katowice)
//   4. OBIE grupy (spółgłoska i -a) → spółgłoskowa wygrywa (Trump > Trumpa)
//   5. Tylko -a → mianownik żeński (Ukraina, Rosja)
//   6. Fallback: najkrótsza z puli
function pickCanonical(names: string[]): string {
  // 1. Nazwiska przymiotnikowe (-ski/-cki/-dzki/-zki)
  const adj = names.find(function(n) { return /(?:ski|cki|dzki|zki)$/i.test(n); });
  if (adj) return adj;

  // 2. Odrzuć silnie odmienione formy
  //    -iego/-ego: dopełniacz przymiotnikowy (Zełenskiego)
  //    -owi/-emu:  celownik (Putinowi)
  //    -ową/-owej: celownik/dopełniacz żeński
  //    -iem:       narzędnik (Putinem)
  //    [spółgłoska]iu: miejscownik nijaki (Jastrzębiu, Poznaniu, Gdańsku→Gdańskiu nie, ale -niu tak)
  // -ji$: dopełniacz żeński -ja→-ji (Rosji, Francji, Anglii, Brytanii)
  // [spółgłoska]iu$: miejscownik nijaki (Jastrzębiu, Poznaniu)
  const DECLINED_RE = /(?:iego|ego|owi|emu|ową|owej|owego|iem|[bcdfghjklłmnprstw]iu|ji)$/;
  const undeclined = names.filter(function(n) { return !DECLINED_RE.test(n); });

  // 3. Jeśli wszystkie formy zostały odfiltrowane → zrekonstruuj mianownik
  if (undeclined.length === 0) {
    const reconstructed = names.map(function(n) {
      if (/[bcdfghjklłmnprstw]iu$/.test(n)) return n.slice(0, -2) + "ie"; // Jastrzębiu→Jastrzębie
      if (/ji$/.test(n))                     return n.slice(0, -2) + "ja"; // Rosji→Rosja, Francji→Francja
      if (/ach$/.test(n) && n.length > 5)    return n.slice(0, -2);        // Katowicach→Katowice (przybliżenie)
      return n;
    });
    return reconstructed.sort(function(a, b) { return a.length - b.length; })[0];
  }

  const pool = undeclined;

  // 4. Podział: formy na spółgłosce lub -ów (mianownik m.) vs formy na -a (ale nie -ą)
  const consonantForms = pool.filter(function(n) {
    return /[bcdfghjklłmnpqrstvwxzńśźżć]$|ów$/i.test(n);
  });
  const aForms = pool.filter(function(n) { return /[^ą]a$/.test(n); });

  // Obie grupy → spółgłoskowa jest mianownikiem (Trump > Trumpa, Lwów > Lwowa)
  if (consonantForms.length > 0 && aForms.length > 0) {
    return consonantForms.sort(function(a, b) { return a.length - b.length; })[0];
  }
  // Tylko formy na -a → mianownik żeński (Ukraina, Rosja)
  if (aForms.length > 0) {
    return aForms.sort(function(a, b) { return a.length - b.length; })[0];
  }
  // 5. Fallback: najkrótsza z puli
  return [...pool].sort(function(a, b) { return a.length - b.length; })[0];
}

function prefixKey(name: string): string {
  if (name.includes(" ")) return normalizeForKey(name); // imię+nazwisko: normalizuj całość
  // Stały 4-znakowy prefix na znormalizowanym stringu (bez diakrytyków).
  // Klucz: normalizacja przed cięciem — ó→o grupuje "Lwów"(lwow) z "Lwowa"(lwow) ✓
  // Poprzedni błąd: min(4, length-1) dawał 3-znakowy prefix dla 4-znakowego "Lwów" → zła grupa
  return normalizeForKey(name).slice(0, 4);
}

function extractEntities(articles: Article[]): EntityInfo[] {
  // Krok 1: zbierz surowe formy
  const raw: Map<string, { count: number; pos: number; neg: number; neu: number }> = new Map();
  // Regex: min 4 znaki (filtruje krótkie czasowniki jak "Trwa")
  const NAME_RE = /(?:^|\s)([A-ZŁŚŹŻĆĄĘÓ][a-złśźżćąęó]{3,}(?:\s+[A-ZŁŚŹŻĆĄĘÓ][a-złśźżćąęó]{2,}){0,2})/g;

  for (const article of articles) {
    // Pomiń pierwsze słowo (zawsze wielka litera = tytuł)
    const titleBody = article.title.replace(/^[^\s]+\s+/, "");
    let m: RegExpExecArray | null;
    NAME_RE.lastIndex = 0;
    while ((m = NAME_RE.exec(titleBody)) !== null) {
      const name = m[1].trim();
      // Odrzuć czasowniki po końcówkach morfologicznych (działa bez słownika)
      // 3 os. l.mn. teraźniejszy: -ją/-ają/-eją/-ują; czas przeszły: -ły/-ło/-ła/-li
      // imiesłowy: -ący/-ąca/-ące; nieodmienione: -ując/-ając
      const isVerb = /(?:ają|eją|ują|[^i]ją|[^a-z]ły|[^a-z]ło|[^a-z]ła|[^a-z]li|ący|ąca|ące|ując|ając)$/.test(name);
      // Odrzuć pospolite przymiotniki z wielkiej litery (np. "Nowych", "Nowym")
      const isAdj = /(?:owych|owym|owej|owego|alny|alna|alne|alnej)$/.test(name);
      if (
        name.length >= 4
        && !ENTITY_BLACKLIST.has(name)
        && !VERB_BLACKLIST.has(name)
        && !isVerb
        && !isAdj
        && !/^\d/.test(name)
      ) {
        const ex = raw.get(name) ?? { count: 0, pos: 0, neg: 0, neu: 0 };
        ex.count++;
        if (article.sentiment === "positive") ex.pos++;
        else if (article.sentiment === "negative") ex.neg++;
        else ex.neu++;
        raw.set(name, ex);
      }
    }
  }

  // Krok 2: grupuj po prefiksie (obsługa deklinacji)
  const groups: Map<string, Array<[string, { count: number; pos: number; neg: number; neu: number }]>> = new Map();
  for (const entry of Array.from(raw.entries())) {
    const key = prefixKey(entry[0]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  // Krok 3: scal grupy, wybierz formę kanoniczną (mianownik)
  const merged: Array<{ name: string; count: number; pos: number; neg: number; neu: number }> = [];
  for (const group of Array.from(groups.values())) {
    const names = group.map(function (e) { return e[0]; });
    const canonical = pickCanonical(names); // mianownik zamiast najczęstszej formy
    let total = { count: 0, pos: 0, neg: 0, neu: 0 };
    for (const [, v] of group) {
      total.count += v.count;
      total.pos += v.pos;
      total.neg += v.neg;
      total.neu += v.neu;
    }
    if (total.count >= 2) merged.push({ name: canonical, ...total });
  }

  return merged
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map(function (v) {
      let dom: "positive" | "negative" | "neutral" = "neutral";
      if (v.pos > v.neg && v.pos > v.neu) dom = "positive";
      else if (v.neg > v.pos && v.neg > v.neu) dom = "negative";
      return { name: v.name, count: v.count, sentimentBreakdown: { positive: v.pos, negative: v.neg, neutral: v.neu }, dominantSentiment: dom };
    });
}

// ── Gemini NER canonicalization (post-processing) ────────────────
// Używa Gemini 2.0 Flash (darmowy tier: 1500 req/dzień) do korekty
// form mianownikowych i filtrowania nie-nazw własnych.
// Fallback: zwraca wynik regexu bez zmian.
async function canonicalizeWithGemini(entities: EntityInfo[]): Promise<EntityInfo[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || entities.length === 0) return entities;

  const names = entities.map(function(e) { return e.name; });

  const prompt = `Masz listę wyrazów wyekstrahowanych z polskich tytułów prasowych: ${JSON.stringify(names)}
Dla każdego wyrazu:
1. Jeśli to nazwa własna (osoba, miejsce, organizacja, instytucja) — podaj formę w MIANOWNIKU liczby pojedynczej. Jeśli wyraz jest już w mianowniku, zostaw bez zmian.
2. Jeśli to NIE jest nazwa własna (czasownik, przymiotnik, przysłówek, rzeczownik pospolity, skrót ogólny) — zwróć null.
Odpowiedz TYLKO jako JSON obiekt (bez markdown, bez komentarzy): {"wyraz": "Mianownik" lub null}
Przykład: {"Rosji":"Rosja","Trumpa":"Trump","Ukrainy":"Ukraina","Zostają":null,"Polski":null}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 512 },
        }),
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return entities;

    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Wyodrębnij JSON (Gemini czasem dodaje ```json ... ```)
    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (!jsonMatch) return entities;

    const mapping = JSON.parse(jsonMatch[0]) as Record<string, string | null>;

    return entities
      .filter(function(e) { return !(e.name in mapping && mapping[e.name] === null); })
      .map(function(e) {
        const corrected = mapping[e.name];
        return { ...e, name: (corrected != null) ? corrected : e.name };
      });
  } catch {
    return entities; // sieć/timeout/JSON → wynik regexu
  }
}

// ── Klasteryzacja narracji ───────────────────────────────────────
interface NarrativeSeed { label: string; icon: string; keywords: string[] }

const NARRATIVE_SEEDS: NarrativeSeed[] = [
  { label: "Polityka",       icon: "⚖️",  keywords: ["rząd","sejm","senat","minister","premier","prezydent","partia","wybory","koalicja","opozycja","pis","platforma","psl","lewica","ustawa","prawo","głosowanie","polityk","kampania","marszałek","kancelaria"] },
  { label: "Gospodarka",     icon: "📈",  keywords: ["gospodarka","inflacja","wzrost","pkb","bank","kredyt","stopa","inwestycje","budżet","deficyt","giełda","akcje","waluty","euro","dolar","ceny","energia","surowce","eksport","import","biznes","firma","spółka","bankier","kurs"] },
  { label: "Bezpieczenstwo", icon: "🛡️", keywords: ["wojsko","armia","nato","obrona","żołnierze","atak","konflikt","wojna","broń","granica","straż","policja","agresja","rosja","ukraina","sankcje","wywiad","służby","terroryzm","obronność","sojusz","front","ostrzał","rakieta"] },
  { label: "Zdrowie",        icon: "🏥",  keywords: ["szpital","lekarz","zdrowie","choroba","leczenie","nfz","medycyna","lek","szczepionka","pacjent","epidemia","covid","rak","operacja","klinika","ratownik","zdrowie"] },
  { label: "Wypadki",        icon: "🚨",  keywords: ["wypadek","kolizja","pożar","powódź","katastrofa","tragedia","ofiara","ranny","śmierć","zginął","zginęła","utonął","eksplozja","awaria","rozbicie","karambol","zderzenie","ewakuacja"] },
  { label: "Prawo i sady",   icon: "🔨",  keywords: ["sąd","prokurator","prokuratura","wyrok","areszt","aresztowanie","zarzuty","oskarżenie","skazanie","korupcja","łapówka","afera","cba","abw","śledztwo","proces","sędzia","adwokat"] },
  { label: "Spoleczenstwo",  icon: "👥",  keywords: ["protest","strajk","demonstracja","marsz","edukacja","szkoła","uczelnia","studenci","nauczyciel","kultura","sport","piłka","liga","mistrzostwa","turniej","olimpiada","film","muzyka","sztuka","klimat","ekologia"] },
];

function clusterNarratives(articles: Article[]): NarrativeCluster[] {
  const counts: Map<string, { articles: Article[]; pos: number; neg: number; neu: number }> = new Map();
  for (const s of NARRATIVE_SEEDS) counts.set(s.label, { articles: [], pos: 0, neg: 0, neu: 0 });

  for (const article of articles) {
    const t = article.title.toLowerCase();
    let best = ""; let score = 0;
    for (const s of NARRATIVE_SEEDS) {
      const sc = s.keywords.filter(kw => t.includes(kw)).length;
      if (sc > score) { score = sc; best = s.label; }
    }
    if (best && score > 0) {
      const b = counts.get(best)!;
      b.articles.push(article);
      if (article.sentiment === "positive") b.pos++;
      else if (article.sentiment === "negative") b.neg++;
      else b.neu++;
    }
  }

  const total = articles.length || 1;
  return NARRATIVE_SEEDS.map(s => {
    const b = counts.get(s.label)!;
    const count = b.articles.length;
    let dom: "positive" | "negative" | "neutral" = "neutral";
    if (b.pos > b.neg && b.pos > b.neu) dom = "positive";
    else if (b.neg > b.pos && b.neg > b.neu) dom = "negative";
    return {
      label: s.label, icon: s.icon, count,
      percentage: Math.round((count / total) * 100),
      dominantSentiment: dom,
      topArticles: b.articles.slice(0, 8).map(a => ({ title: a.title, url: a.url, source: a.source })),
    };
  }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
}

function buildTimeline(articles: Article[]): Array<{ hour: string; count: number }> {
  const map: Map<string, number> = new Map();
  for (const a of articles) {
    const d = new Date(a.publishedAt);
    const key = `${String(d.getHours()).padStart(2, "0")}:00`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([hour, count]) => ({ hour, count }));
}

// ── Handler ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const q      = req.nextUrl.searchParams.get("q") ?? "";
  const period = req.nextUrl.searchParams.get("period") ?? "24h";
  const from   = req.nextUrl.searchParams.get("from") ?? "";
  const to     = req.nextUrl.searchParams.get("to") ?? "";

  // Tryb wyszukiwania vs monitorowania
  const isSearchMode = q.trim().length > 0;

  let allArticles: Article[] = [];
  let bySourceRaw: Record<string, number> = {};
  let searchMode: "google_news" | "rss_monitor" | "rss_filtered" = "rss_monitor";

  if (isSearchMode) {
    // TRYB WYSZUKIWANIA: Google News RSS + Reddit równolegle
    const [gnArticles, redditArticles] = await Promise.all([
      searchGoogleNews(q.trim()),
      searchReddit(q.trim()),
    ]);

    if (gnArticles.length > 0) {
      allArticles = gnArticles;
      searchMode = "google_news";
      for (const a of gnArticles) {
        bySourceRaw[a.source] = (bySourceRaw[a.source] ?? 0) + 1;
      }
    } else {
      // Fallback: filtruj własne feedy
      searchMode = "rss_filtered";
      const results = await Promise.allSettled(POLISH_FEEDS.map(fetchFeed));
      results.forEach((r, i) => {
        const arts = r.status === "fulfilled" ? r.value : [];
        bySourceRaw[POLISH_FEEDS[i].name] = arts.length;
        allArticles.push(...arts);
      });
    }

    // Dołącz Reddit do wyniku (niezależnie od trybu)
    for (const a of redditArticles) {
      bySourceRaw[a.source] = (bySourceRaw[a.source] ?? 0) + 1;
    }
    allArticles = [...allArticles, ...redditArticles];
  } else {
    // TRYB MONITOROWANIA: własne RSS feedy + Reddit
    searchMode = "rss_monitor";
    const [feedResults, redditArticles] = await Promise.all([
      Promise.allSettled(POLISH_FEEDS.map(fetchFeed)),
      fetchRedditMonitor(),
    ]);
    feedResults.forEach((r, i) => {
      const arts = r.status === "fulfilled" ? r.value : [];
      bySourceRaw[POLISH_FEEDS[i].name] = arts.length;
      allArticles.push(...arts);
    });
    for (const a of redditArticles) {
      bySourceRaw[a.source] = (bySourceRaw[a.source] ?? 0) + 1;
    }
    allArticles = [...allArticles, ...redditArticles];
  }

  allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Filtr czasu (dla Google News tryb 1y = wszystkie wyniki)
  const timeFiltered = (isSearchMode && searchMode === "google_news" && !from && !to && period === "1y")
    ? allArticles
    : filterByTime(allArticles, period, from || undefined, to || undefined);

  // Filtr słów kluczowych (przy Google News już mamy trafne wyniki, ale filtrujemy fallback)
  const filtered = (isSearchMode && searchMode === "google_news")
    ? timeFiltered  // Google News już przeszukał poprawnie
    : filterByQuery(timeFiltered, q);

  const sentimentCounts = {
    positive: filtered.filter(a => a.sentiment === "positive").length,
    negative: filtered.filter(a => a.sentiment === "negative").length,
    neutral:  filtered.filter(a => a.sentiment === "neutral").length,
  };

  const entities   = await canonicalizeWithGemini(extractEntities(filtered));
  const narratives = clusterNarratives(filtered);
  const timeline   = buildTimeline(filtered);

  // Komunikaty o limitach
  const rssLimitedPeriods = ["7d", "30d", "1y"];
  const rssNote = (!isSearchMode && rssLimitedPeriods.includes(period))
    ? "RSS feeds zawierają ostatnie ~15 artykułów z każdego źródła (ok. 24-48h). Wpisz zapytanie by wyszukać w Google News."
    : null;

  const searchInfo = isSearchMode
    ? (searchMode === "google_news"
        ? `Wyszukano w Google News: ${allArticles.length} artykułów z polskiej prasy`
        : `Google News niedostępny — wyniki z 6 feedów RSS (${allArticles.length} artykułów)`)
    : null;

  return NextResponse.json({
    articles: filtered,
    total: filtered.length,
    totalAvailable: allArticles.length,
    bySource: bySourceRaw,
    sentimentCounts,
    entities,
    narratives,
    timeline,
    query: q,
    period,
    searchMode,
    searchInfo,
    rssNote,
    fetchedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
