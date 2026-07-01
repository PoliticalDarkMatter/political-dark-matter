export type Sentiment = "positive" | "neutral" | "negative" | "ironic";
export type Platform = "facebook" | "tiktok" | "x" | "instagram" | "youtube" | "reddit" | "news";
export type TrendDirection = "rising" | "falling" | "stable" | "new";

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  ironic?: number;
}

export interface Narrative {
  id: string;
  label: string;
  description: string;
  size: number;
  sentiment: number; // -1 to 1
  trend: TrendDirection;
  platforms: Platform[];
  velocity: string;
  keyPhrases: string[];
  sampleCount: number;
}

export interface TrendPoint {
  date: string;
  value: number;
  platform?: Platform;
}

export interface PlatformStat {
  platform: Platform;
  count: number;
  sentiment: number;
  share: number;
}

export interface Report {
  id: string;
  query: string;
  period: { from: string; to: string };
  sentimentDistribution: SentimentDistribution;
  dominantNarratives: Narrative[];
  trendTimeline: TrendPoint[];
  platformBreakdown: PlatformStat[];
  totalDocuments: number;
  generatedAt: string;
}

export interface MonitoringQuery {
  id: string;
  name: string;
  keywords: string[];
  platforms: Platform[];
  active: boolean;
  createdAt: string;
  lastRun: string | null;
}
