import type { Report, MonitoringQuery } from "./types";

export const mockReport: Report = {
  id: "r1",
  query: "kryzys energetyczny",
  period: { from: "2026-06-18", to: "2026-06-25" },
  totalDocuments: 14320,
  generatedAt: "2026-06-25T08:00:00Z",
  sentimentDistribution: {
    positive: 18,
    neutral: 45,
    negative: 32,
    ironic: 5,
  },
  dominantNarratives: [
    {
      id: "N1",
      label: "Kryzys zaufania do rządu",
      description: "Narracja skupiona na braku wiarygodności władz w zarządzaniu kryzysem",
      size: 3840,
      sentiment: -0.72,
      trend: "rising",
      platforms: ["facebook", "x", "tiktok"],
      velocity: "+340% vs. poprzedni tydzień",
      keyPhrases: ["nie wierzę", "kłamstwo", "sami sobie", "zrobili nas w konia"],
      sampleCount: 3840,
    },
    {
      id: "N2",
      label: "Rozwiązania technologiczne jako wyjście",
      description: "Optymistyczna narracja wokół OZE i technologii jako odpowiedzi na kryzys",
      size: 2210,
      sentiment: 0.61,
      trend: "stable",
      platforms: ["youtube", "reddit", "x"],
      velocity: "+12% vs. poprzedni tydzień",
      keyPhrases: ["energia słoneczna", "pompy ciepła", "niezależność energetyczna"],
      sampleCount: 2210,
    },
    {
      id: "N3",
      label: "Winni są sąsiedzi / zewnętrzni",
      description: "Narracja obwiniająca zewnętrznych aktorów (kraje, korporacje)",
      size: 1980,
      sentiment: -0.55,
      trend: "falling",
      platforms: ["facebook", "news", "youtube"],
      velocity: "-18% vs. poprzedni tydzień",
      keyPhrases: ["to przez nich", "monopol", "manipulacja cenami"],
      sampleCount: 1980,
    },
    {
      id: "N4",
      label: "Apele o oszczędzanie energii",
      description: "Narracje solidarnościowe, apele do obywateli o zmianę zachowań",
      size: 1450,
      sentiment: 0.2,
      trend: "new",
      platforms: ["instagram", "tiktok", "facebook"],
      velocity: "nowa narracja",
      keyPhrases: ["wyłącz światło", "oszczędzamy razem", "challenge energetyczny"],
      sampleCount: 1450,
    },
  ],
  trendTimeline: Array.from({ length: 14 }, (_, i) => {
    const date = new Date("2026-06-12");
    date.setDate(date.getDate() + i);
    return {
      date: date.toISOString().split("T")[0],
      value: Math.floor(800 + Math.random() * 1200 + (i > 9 ? i * 150 : 0)),
    };
  }),
  platformBreakdown: [
    { platform: "facebook", count: 5840, sentiment: -0.41, share: 40.8 },
    { platform: "x", count: 3200, sentiment: -0.28, share: 22.3 },
    { platform: "tiktok", count: 2100, sentiment: -0.15, share: 14.7 },
    { platform: "youtube", count: 1680, sentiment: 0.12, share: 11.7 },
    { platform: "news", count: 980, sentiment: -0.05, share: 6.8 },
    { platform: "reddit", count: 520, sentiment: 0.31, share: 3.6 },
  ],
};

export const mockQueries: MonitoringQuery[] = [
  {
    id: "q1",
    name: "Kryzys energetyczny",
    keywords: ["energia", "prąd", "rachunki", "taryfy", "OZE"],
    platforms: ["facebook", "x", "tiktok", "youtube", "news"],
    active: true,
    createdAt: "2026-06-01",
    lastRun: "2026-06-25T08:00:00Z",
  },
  {
    id: "q2",
    name: "Wybory samorządowe",
    keywords: ["wybory", "kandydat", "kampania", "głosowanie"],
    platforms: ["facebook", "x", "news"],
    active: true,
    createdAt: "2026-06-10",
    lastRun: "2026-06-25T07:30:00Z",
  },
  {
    id: "q3",
    name: "Inflacja i ceny żywności",
    keywords: ["inflacja", "ceny", "drożyzna", "zakupy", "koszyk"],
    platforms: ["facebook", "tiktok", "reddit"],
    active: false,
    createdAt: "2026-05-20",
    lastRun: null,
  },
];

export const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  x: "X (Twitter)",
  instagram: "Instagram",
  youtube: "YouTube",
  reddit: "Reddit",
  news: "Media",
};

export const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  tiktok: "#000000",
  x: "#1DA1F2",
  instagram: "#E1306C",
  youtube: "#FF0000",
  reddit: "#FF4500",
  news: "#6366f1",
};
