export type RankMode = 'latest' | 'important' | 'research';
export type Category = 'model' | 'tool' | 'research' | 'company' | 'opensource' | 'policy' | 'market';
export type SourceType = 'blog' | 'research' | 'news' | 'social' | 'github' | 'release' | 'api' | 'rss';
export type TimeWindow = '24h' | '3d' | '7d' | '30d' | 'all';
export type DateConfidence = 'exact' | 'day' | 'estimated' | 'unknown';
export type SourceTrustTier = 'official' | 'authoritative' | 'reputable' | 'aggregator' | 'unverified';
export type IngestionStatus = 'ok' | 'error' | 'degraded' | 'unvalidated' | 'stale';

export interface ScoreWeights {
  importance: number;
  novelty: number;
  credibility: number;
  impact: number;
  practical: number;
  recency: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  importance: 0.15,
  novelty: 0.10,
  credibility: 0.10,
  impact: 0.10,
  practical: 0.05,
  recency: 0.50,
};

export const RANK_MODE_LABELS: Record<RankMode, string> = {
  latest: 'Latest',
  important: 'Most Important',
  research: 'Research to Watch',
};

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  '24h': 'Last 24 hours',
  '3d': 'Last 3 days',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  'all': 'All time',
};

export const TIME_WINDOW_HOURS: Record<TimeWindow, number> = {
  '24h': 24,
  '3d': 72,
  '7d': 168,
  '30d': 720,
  'all': Infinity,
};

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'model', label: 'AI Models' },
  { value: 'tool', label: 'AI Tools' },
  { value: 'research', label: 'Research' },
  { value: 'company', label: 'Companies & Labs' },
  { value: 'opensource', label: 'Open Source' },
  { value: 'policy', label: 'Policy & Regulation' },
  { value: 'market', label: 'Market & Industry' },
];

export const SOURCE_TRUST_TIER_PRIORITY: Record<SourceTrustTier, number> = {
  official: 100,
  authoritative: 80,
  reputable: 60,
  aggregator: 40,
  unverified: 20,
};

export interface Item {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceType: SourceType;
  category: Category;
  company?: string | null;
  summary?: string | null;
  publishedAt: string;
  discoveredAt: string;
  firstSeenAt: string;
  importanceScore: number;
  noveltyScore: number;
  credibilityScore: number;
  impactScore: number;
  practicalScore: number;
  compositeScore: number;
  freshnessScore: number;
  dateConfidence: DateConfidence;
  isPrimarySource: boolean;
  isOriginalSource: boolean;
  tags?: string[];
}
