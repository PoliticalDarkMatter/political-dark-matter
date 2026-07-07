export type SourceStatus = "free" | "free_limited" | "paid" | "open";
export type SourceCategory = "polish" | "social" | "news" | "open" | "rss";

export interface DataSource {
  id: string;
  name: string;
  category: SourceCategory;
  status: SourceStatus;
  description: string;
  requiresKey: boolean;
  keyLabel?: string;
  keyPlaceholder?: string;
  defaultKeyValue?: string;        // pre-filled key (np. klucz testowy)
  secondaryKey?: string;
  secondaryKeyLabel?: string;
  secondaryKeyPlaceholder?: string;
  apiEndpoint?: string;            // gotowy URL endpointa
  docsUrl: string;
  registerUrl: string;
  freeQuota?: string;
  enabled: boolean;
}

export interface RssFeed {
  id: string;
  name: string;
  url: string;
  category: "polska" | "biznes" | "polityka" | "tech" | "inne";
  enabled: boolean;
}

export const DEFAULT_SOURCES: DataSource[] = [
  // ═══════════════════════════════════════
  // POLSKIE MEDIA — priorytet
  // ═══════════════════════════════════════
  {
    id: "wykop",
    name: "Wykop.pl API",
    category: "polish",
    status: "free",
    description: "Największa polska platforma społecznościowa. Linki, dyskusje, trendy. API dostępne po rejestracji.",
    requiresKey: true,
    keyLabel: "App Key",
    keyPlaceholder: "np. abcdef123456",
    secondaryKey: "app_secret",
    secondaryKeyLabel: "App Secret",
    secondaryKeyPlaceholder: "np. secretxyz789",
    apiEndpoint: "https://wykop.pl/api/v3/links/promoted",
    docsUrl: "https://wykop.pl/dla-programistow/",
    registerUrl: "https://wykop.pl/dla-programistow/",
    freeQuota: "Bez limitu (rozsądne użycie)",
    enabled: false,
  },
  {
    id: "pap_api",
    name: "PAP — Polska Agencja Prasowa",
    category: "polish",
    status: "open",
    description: "Oficjalna agencja prasowa. RSS bez klucza. Serwisy: kraj, zagranica, biznes, sport, kultura.",
    requiresKey: false,
    apiEndpoint: "https://www.pap.pl/aktualnosci/feed",
    docsUrl: "https://www.pap.pl/serwisy-rss",
    registerUrl: "https://www.pap.pl",
    freeQuota: "RSS bez limitu — od razu gotowy",
    enabled: true,
  },
  {
    id: "newsapi_pl",
    name: "NewsAPI — język polski",
    category: "polish",
    status: "free_limited",
    description: "NewsAPI filtrowane po language=pl i country=pl. Pokrywa TVN24, Onet, WP, Interia i 40+ portali.",
    requiresKey: true,
    keyLabel: "API Key",
    keyPlaceholder: "np. a1b2c3d4e5f6...",
    apiEndpoint: "https://newsapi.org/v2/top-headlines?country=pl&language=pl&apiKey={KEY}",
    docsUrl: "https://newsapi.org/docs/endpoints/top-headlines",
    registerUrl: "https://newsapi.org/register",
    freeQuota: "100 req/dzień",
    enabled: false,
  },
  {
    id: "gdelt_pl",
    name: "GDELT — filtr Polska",
    category: "polish",
    status: "open",
    description: "GDELT GKG z filtrem sourcecountry:POL. Aktualizowany co 15 min, monitoruje polskie media globalnie.",
    requiresKey: false,
    apiEndpoint: "https://api.gdeltproject.org/api/v2/doc/doc?query=polska%20sourcecountry:POL&mode=artlist&format=json",
    docsUrl: "https://blog.gdeltproject.org/gdelt-global-knowledge-graph/",
    registerUrl: "https://www.gdeltproject.org",
    freeQuota: "Nieograniczony — od razu gotowy",
    enabled: true,
  },
  {
    id: "mediastack_pl",
    name: "MediaStack — PL/DE/EU",
    category: "polish",
    status: "free_limited",
    description: "Newsy z Polski, Niemiec i UE. Obsługuje język polski, monitoring Europy Środkowej.",
    requiresKey: true,
    keyLabel: "API Key",
    keyPlaceholder: "np. abcdef1234567890",
    apiEndpoint: "http://api.mediastack.com/v1/news?countries=pl&languages=pl&access_key={KEY}",
    docsUrl: "https://mediastack.com/documentation",
    registerUrl: "https://mediastack.com/signup",
    freeQuota: "500 req/miesiąc",
    enabled: false,
  },

  // ═══════════════════════════════════════
  // SOCIAL MEDIA
  // ═══════════════════════════════════════
  {
    id: "youtube",
    name: "YouTube Data API v3",
    category: "social",
    status: "free_limited",
    description: "Filmy, komentarze, kanały polskich twórców i mediów. Silnik gotowy (lib/sources/youtube.ts) — brakuje klucza YOUTUBE_API_KEY jako zmiennej środowiskowej Vercel oraz listy kanałów do monitoringu (YOUTUBE_CHANNELS).",
    requiresKey: true,
    keyLabel: "API Key",
    keyPlaceholder: "AIzaSy...",
    apiEndpoint: "https://www.googleapis.com/youtube/v3/search?part=snippet&q=polska&relevanceLanguage=pl&key={KEY}",
    docsUrl: "https://developers.google.com/youtube/v3",
    registerUrl: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
    freeQuota: "10 000 jednostek/dzień",
    enabled: false,
  },
  {
    id: "x_twitter",
    name: "X (Twitter) API v2",
    category: "social",
    status: "paid",
    description: "Oficjalne, płatne API (tier Basic). Silnik gotowy (lib/sources/x.ts) — bez tokenu X_BEARER_TOKEN automatycznie próbuje darmowego, best-effort fallbacku przez Nitter (niestabilny, bez gwarancji).",
    requiresKey: true,
    keyLabel: "Bearer Token",
    keyPlaceholder: "AAAAAAAAAAAAAAAAAAAAA...",
    apiEndpoint: "https://api.twitter.com/2/tweets/search/recent?query={QUERY}",
    docsUrl: "https://developer.twitter.com/en/docs/twitter-api",
    registerUrl: "https://developer.twitter.com/en/portal/petition/essential/basic-info",
    freeQuota: "Płatne od tieru Basic — sprawdź aktualny cennik przed decyzją",
    enabled: false,
  },
  {
    id: "reddit",
    name: "Reddit — r/Polska",
    category: "social",
    status: "free_limited",
    description: "r/Polska, r/PolishProblems i inne. OAuth pozwala na 60 req/min bez ograniczeń datowych.",
    requiresKey: true,
    keyLabel: "Client ID",
    keyPlaceholder: "np. abc123xyz",
    secondaryKey: "client_secret",
    secondaryKeyLabel: "Client Secret",
    secondaryKeyPlaceholder: "np. secrettoken123",
    apiEndpoint: "https://oauth.reddit.com/r/polska/hot.json?limit=25",
    docsUrl: "https://www.reddit.com/dev/api/",
    registerUrl: "https://www.reddit.com/prefs/apps",
    freeQuota: "60 req/min (OAuth)",
    enabled: false,
  },
  {
    id: "mastodon",
    name: "Mastodon / pol.social",
    category: "social",
    status: "open",
    description: "Polska instancja Mastodona. Publiczne posty bez autoryzacji — gotowe od razu.",
    requiresKey: false,
    apiEndpoint: "https://pol.social/api/v1/timelines/public?limit=40",
    docsUrl: "https://docs.joinmastodon.org/api/",
    registerUrl: "https://pol.social",
    freeQuota: "Bez limitu — od razu gotowy",
    enabled: true,
  },

  // ═══════════════════════════════════════
  // PORTALE ZAGRANICZNE
  // ═══════════════════════════════════════
  {
    id: "guardian",
    name: "The Guardian API",
    category: "news",
    status: "free",
    description: "Klucz testowy 'test' działa od razu (300 req/dzień). Własny klucz po rejestracji — 5000 req/dzień.",
    requiresKey: true,
    keyLabel: "API Key",
    keyPlaceholder: "test",
    defaultKeyValue: "test",
    apiEndpoint: "https://content.guardianapis.com/search?q=poland&api-key=test",
    docsUrl: "https://open-platform.theguardian.com/documentation/",
    registerUrl: "https://bonobo.capi.gutools.co.uk/register/developer",
    freeQuota: "300 req/dzień (test) · 5 000 req/dzień (własny)",
    enabled: true,
  },
  {
    id: "nytimes",
    name: "New York Times API",
    category: "news",
    status: "free",
    description: "Artykuły z filtrem q=Poland. Monitoring narracji o Polsce w zachodnich mediach.",
    requiresKey: true,
    keyLabel: "API Key",
    keyPlaceholder: "np. AbCdEfGhIjKlMnOp...",
    apiEndpoint: "https://api.nytimes.com/svc/search/v2/articlesearch.json?q=Poland&api-key={KEY}",
    docsUrl: "https://developer.nytimes.com/docs",
    registerUrl: "https://developer.nytimes.com/accounts/create",
    freeQuota: "500 req/dzień",
    enabled: false,
  },
  {
    id: "gnews",
    name: "GNews API",
    category: "news",
    status: "free_limited",
    description: "Google News z filtrem lang=pl. Agreguje wyniki z polskich i zagranicznych źródeł.",
    requiresKey: true,
    keyLabel: "API Key",
    keyPlaceholder: "np. abc123...",
    apiEndpoint: "https://gnews.io/api/v4/top-headlines?lang=pl&country=pl&token={KEY}",
    docsUrl: "https://gnews.io/docs/v4",
    registerUrl: "https://gnews.io/register",
    freeQuota: "100 req/dzień",
    enabled: false,
  },

  // ═══════════════════════════════════════
  // OPEN DATA
  // ═══════════════════════════════════════
  {
    id: "gdelt",
    name: "GDELT Project (globalny)",
    category: "open",
    status: "open",
    description: "Największa baza newsów i wydarzeń na świecie. 15-minutowe aktualizacje. Bez klucza.",
    requiresKey: false,
    apiEndpoint: "https://api.gdeltproject.org/api/v2/doc/doc?query=poland&mode=artlist&format=json",
    docsUrl: "https://www.gdeltproject.org/data.html",
    registerUrl: "https://www.gdeltproject.org",
    freeQuota: "Nieograniczony — od razu gotowy",
    enabled: true,
  },
  {
    id: "wikipedia",
    name: "Wikipedia PL / Wikimedia API",
    category: "open",
    status: "open",
    description: "Treści, trendy oglądalności artykułów i edycje w czasie rzeczywistym. 1.6M artykułów PL.",
    requiresKey: false,
    apiEndpoint: "https://pl.wikipedia.org/w/api.php?action=query&list=search&srsearch=narracja&format=json&origin=*",
    docsUrl: "https://pl.wikipedia.org/w/api.php",
    registerUrl: "https://www.mediawiki.org/wiki/API:Main_page",
    freeQuota: "Bez limitów — od razu gotowy",
    enabled: true,
  },
  {
    id: "hackernews",
    name: "Hacker News (Algolia API)",
    category: "open",
    status: "open",
    description: "Dyskusje tech i startupowe. Monitoring narracji technologicznych bez limitu.",
    requiresKey: false,
    apiEndpoint: "https://hn.algolia.com/api/v1/search?query=poland&tags=story",
    docsUrl: "https://hn.algolia.com/api",
    registerUrl: "https://news.ycombinator.com",
    freeQuota: "Bez limitów — od razu gotowy",
    enabled: false,
  },
];

export const DEFAULT_RSS_FEEDS: RssFeed[] = [
  // Agencje
  { id: "pap_kraj",   name: "PAP — Kraj",     url: "https://www.pap.pl/aktualnosci/feed",              category: "polska",   enabled: true  },
  { id: "pap_biz",    name: "PAP — Biznes",   url: "https://biznes.pap.pl/pl/rss/3",                   category: "biznes",   enabled: true  },

  // Telewizje
  { id: "tvn24",      name: "TVN24",           url: "https://tvn24.pl/najnowsze.xml",                   category: "polska",   enabled: true  },
  { id: "tvp_info",   name: "TVP Info",        url: "https://www.tvp.info/rss",                         category: "polska",   enabled: true  },
  { id: "polsat",     name: "Polsat News",     url: "https://www.polsatnews.pl/rss/wszystkie.xml",      category: "polska",   enabled: true  },

  // Portale
  { id: "onet",       name: "Onet Wiadomości", url: "https://wiadomosci.onet.pl/.feed",                 category: "polska",   enabled: true  },
  { id: "wp",         name: "WP Wiadomości",   url: "https://wiadomosci.wp.pl/rss.xml",                 category: "polska",   enabled: true  },
  { id: "interia",    name: "Interia Fakty",   url: "https://fakty.interia.pl/feed",                    category: "polska",   enabled: true  },
  { id: "gazeta",     name: "Gazeta.pl",       url: "https://wiadomosci.gazeta.pl/pub/rss/wiadomosci.htm", category: "polska", enabled: true },
  { id: "rmf24",      name: "RMF24",           url: "https://www.rmf24.pl/fakty/feed",                  category: "polska",   enabled: true  },
  { id: "tokfm",      name: "TOK FM",          url: "https://audycje.tokfm.pl/podcast/rss",             category: "polska",   enabled: false },

  // Prasa i tygodniki
  { id: "rp",         name: "Rzeczpospolita",  url: "https://www.rp.pl/rss/1019",                       category: "polityka", enabled: true  },
  { id: "polityka",   name: "Polityka",        url: "https://www.polityka.pl/rss.xml",                  category: "polityka", enabled: true  },
  { id: "newsweek",   name: "Newsweek Polska", url: "https://www.newsweek.pl/feed",                     category: "polityka", enabled: false },
  { id: "do_rzeczy",  name: "Do Rzeczy",       url: "https://dorzeczy.pl/feed/",                        category: "polityka", enabled: false },

  // Biznes
  { id: "bankier",    name: "Bankier.pl",      url: "https://www.bankier.pl/rss/wiadomosci.xml",        category: "biznes",   enabled: true  },
  { id: "bi_pl",      name: "Business Insider PL", url: "https://businessinsider.com.pl/feed",          category: "biznes",   enabled: false },
  { id: "pb",         name: "Puls Biznesu",    url: "https://www.pb.pl/rss/wiadomosci.xml",             category: "biznes",   enabled: false },
  { id: "forbes_pl",  name: "Forbes Polska",   url: "https://www.forbes.pl/feed",                       category: "biznes",   enabled: false },

  // Tech
  { id: "spider",     name: "Spider's Web",    url: "https://spidersweb.pl/feed",                       category: "tech",     enabled: false },
  { id: "antyweb",    name: "Antyweb",         url: "https://antyweb.pl/feed/",                         category: "tech",     enabled: false },
  { id: "benchmark",  name: "Benchmark.pl",    url: "https://www.benchmark.pl/rss/aktualnosci.xml",     category: "tech",     enabled: false },
];
