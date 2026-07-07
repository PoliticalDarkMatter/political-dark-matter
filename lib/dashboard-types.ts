// ── Typy domenowe dashboardu Narrative Scope ──────────────────────────
// Wydzielone z app/dashboard/page.tsx, żeby dało się je reużyć w nowych
// modułach (np. lib/dashboard-briefing.ts, components/dashboard/*) bez
// duplikowania definicji. Kształt 1:1 z tym, co zwraca /api/news.

import type { CrossPlatformSignal } from "@/lib/cross-platform";

export type Sent = "positive" | "negative" | "neutral";

export type WeightBasis = "tranco" | "editorial_override" | "unknown" | "social_estimate" | "social_real";

export interface Article {
  id: string; title: string; url: string;
  source: string; publishedAt: string; sentiment: Sent; weight?: number;
  weightBasis?: WeightBasis; weightExplain?: string;
  enriched?: boolean;
}

export interface EntityInfo {
  name: string; count: number; weightedCount?: number; velocity?: number | null;
  sentimentBreakdown: { positive: number; negative: number; neutral: number };
  dominantSentiment: Sent;
}

export interface NarrativeCluster {
  label: string; icon: string; count: number; weightedCount?: number; velocity?: number | null; percentage: number;
  dominantSentiment: Sent;
  topArticles: Array<{ title: string; url: string; source: string }>;
}

export interface TimelineItem { hour: string; count: number }

export interface FeedData {
  articles: Article[]; total: number; totalAvailable: number;
  bySource: Record<string, number>;
  bySourceWeighted?: Record<string, number>;
  totalWeightedReach?: number;
  sentimentCounts: { positive: number; negative: number; neutral: number };
  entities: EntityInfo[]; narratives: NarrativeCluster[];
  timeline: TimelineItem[];
  crossPlatformSignals?: CrossPlatformSignal[];
  query: string; period: string; searchMode: string;
  searchInfo: string | null; rssNote: string | null;
  fetchedAt: string;
}
