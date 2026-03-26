import type { RankMode, ScoreWeights, DateConfidence } from '../types';
import { DEFAULT_WEIGHTS } from '../types';
import type { Item } from '../db/schema';

// ---------------------------------------------------------------------------
// Composite scoring
// ---------------------------------------------------------------------------

export function calculateCompositeScore(
  item: {
    importanceScore: number;
    noveltyScore: number;
    credibilityScore: number;
    impactScore: number;
    practicalScore: number;
  },
  weights?: Partial<ScoreWeights>,
): number {
  const w: ScoreWeights = { ...DEFAULT_WEIGHTS, ...weights };

  const dimensionSum =
    w.importance + w.novelty + w.credibility + w.impact + w.practical;

  if (dimensionSum === 0) return 0;

  const raw =
    (item.importanceScore * w.importance +
      item.noveltyScore * w.novelty +
      item.credibilityScore * w.credibility +
      item.impactScore * w.impact +
      item.practicalScore * w.practical) /
    dimensionSum;

  return Math.round(Math.min(100, Math.max(0, raw)));
}

// ---------------------------------------------------------------------------
// Mode-specific weight presets
// ---------------------------------------------------------------------------

const MODE_WEIGHTS: Record<RankMode, Partial<ScoreWeights>> = {
  latest: {
    importance: 0.05,
    novelty: 0.05,
    credibility: 0.05,
    impact: 0.05,
    practical: 0.0,
    recency: 0.80, // Latest = almost pure recency
  },
  important: {
    importance: 0.35,
    novelty: 0.10,
    credibility: 0.15,
    impact: 0.15,
    practical: 0.05,
    recency: 0.20,
  },
  novel: {
    importance: 0.10,
    novelty: 0.45,
    credibility: 0.05,
    impact: 0.10,
    practical: 0.05,
    recency: 0.25,
  },
  impactful: {
    importance: 0.15,
    novelty: 0.10,
    credibility: 0.10,
    impact: 0.40,
    practical: 0.05,
    recency: 0.20,
  },
  underrated: {
    importance: 0.05,
    novelty: 0.40,
    credibility: 0.10,
    impact: 0.20,
    practical: 0.10,
    recency: 0.15,
  },
  opensource: {
    importance: 0.15,
    novelty: 0.20,
    credibility: 0.10,
    impact: 0.15,
    practical: 0.15,
    recency: 0.25,
  },
  research: {
    importance: 0.20,
    novelty: 0.30,
    credibility: 0.15,
    impact: 0.10,
    practical: 0.0,
    recency: 0.25,
  },
};

// ---------------------------------------------------------------------------
// Recency helpers — much steeper decay than before
// ---------------------------------------------------------------------------

export function recencyScore(
  publishedAt: string | null | undefined,
  dateConfidence?: DateConfidence | string | null
): number {
  if (!publishedAt) return 3; // Unknown date = near-zero recency (was 10)

  const d = new Date(publishedAt);
  if (isNaN(d.getTime())) return 3;

  const ageHours = (Date.now() - d.getTime()) / (1000 * 60 * 60);

  if (ageHours < 0) return 2;    // Future dates are suspicious

  // Apply confidence penalty
  const confPenalty =
    dateConfidence === 'unknown' ? 0.4
    : dateConfidence === 'estimated' ? 0.7
    : 1.0;

  let raw: number;
  if (ageHours < 1) raw = 100;
  else if (ageHours < 3) raw = 97;
  else if (ageHours < 6) raw = 93;
  else if (ageHours < 12) raw = 86;
  else if (ageHours < 24) raw = 78;
  else if (ageHours < 48) raw = 62;
  else if (ageHours < 72) raw = 45;
  else if (ageHours < 120) raw = 30;  // 5 days
  else if (ageHours < 168) raw = 20;  // 1 week
  else if (ageHours < 336) raw = 10;  // 2 weeks
  else if (ageHours < 720) raw = 5;   // 1 month
  else raw = 2;                        // Very old

  return Math.round(raw * confPenalty);
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export function rankItems(
  items: Item[],
  mode: RankMode,
  userInterests?: string[],
): Item[] {
  const weights = MODE_WEIGHTS[mode];

  let pool = [...items];
  if (mode === 'opensource') {
    pool = pool.filter((i) => i.isOpenSource || i.category === 'opensource');
  } else if (mode === 'research') {
    pool = pool.filter((i) => i.category === 'research');
  }

  const scored = pool.map((item) => {
    const composite = calculateCompositeScore(item as any, weights);
    const recency = recencyScore(
      item.publishedAt,
      (item as any).dateConfidence
    );
    const recencyWeight = weights.recency ?? DEFAULT_WEIGHTS.recency;

    let score =
      composite * (1 - recencyWeight) + recency * recencyWeight;

    // Penalize items with unknown dates — they should not dominate feeds
    if (!item.publishedAt) {
      score *= 0.3;
    }

    // Penalize items marked as duplicates
    if ((item as any).duplicateOf) {
      score *= 0.2;
    }

    if (mode === 'underrated') {
      if ((item as any).importanceScore > 80) {
        score *= 0.6;
      } else if ((item as any).importanceScore > 60) {
        score *= 0.8;
      }
    }

    // Boost primary sources
    if ((item as any).isPrimarySource) {
      score = Math.min(100, score * 1.15);
    }

    // Small boost for user-interest matches
    if (userInterests && userInterests.length > 0) {
      const titleLower = item.title.toLowerCase();
      const matched = userInterests.some((kw) =>
        titleLower.includes(kw.toLowerCase()),
      );
      if (matched) {
        score = Math.min(100, score * 1.08);
      }
    }

    return { item, score };
  });

  // For "latest" mode, primary sort is by date, with score as tiebreaker
  if (mode === 'latest') {
    scored.sort((a, b) => {
      const dateA = a.item.publishedAt || a.item.discoveredAt;
      const dateB = b.item.publishedAt || b.item.discoveredAt;
      const dateDiff =
        new Date(dateB).getTime() - new Date(dateA).getTime();
      if (Math.abs(dateDiff) > 60000) return dateDiff; // More than 1 minute apart
      return b.score - a.score;
    });
  } else {
    scored.sort((a, b) => b.score - a.score);
  }

  return scored.map((s) => s.item);
}

// ---------------------------------------------------------------------------
// Heuristic estimators — DETERMINISTIC (no Math.random!)
// ---------------------------------------------------------------------------

const TIER1_SOURCES = [
  'openai', 'google', 'deepmind', 'anthropic',
  'meta', 'microsoft', 'nvidia', 'xai',
];

const MAJOR_MODEL_PATTERNS = [
  /gpt[-\s]?[5-9]/i, /claude[-\s]?[4-9]/i, /gemini[-\s]?[2-9]/i,
  /llama[-\s]?[4-9]/i, /mistral[-\s]?(large|next|ultra)/i,
  /o[1-9][-\s]?(pro|preview|mini)?/i, /sora[-\s]?[2-9]?/i,
  /grok[-\s]?[3-9]/i, /phi[-\s]?[4-9]/i,
];

const BENCHMARK_KEYWORDS = [
  'state-of-the-art', 'state of the art', 'sota', 'new record',
  'surpass', 'outperform', 'benchmark', 'beats human', 'superhuman',
];

const FUNDING_KEYWORDS = [
  'raises', 'funding', 'series a', 'series b', 'series c', 'series d',
  'valuation', 'ipo', 'acquisition', 'acquired',
];

const TOOL_KEYWORDS = [
  'launches', 'release', 'released', 'introduces', 'now available',
  'open source', 'open-source', 'sdk', 'api', 'plugin', 'extension',
];

const INCREMENTAL_KEYWORDS = [
  'update', 'patch', 'minor', 'fix', 'improvement', 'tweak', 'v0.', 'beta',
];

export function estimateImportance(item: {
  title: string;
  source: string;
  sourceType: string;
  company?: string | null;
}): number {
  const title = item.title.toLowerCase();
  const source = item.source.toLowerCase();
  const company = (item.company ?? '').toLowerCase();

  let score = 50;

  if (MAJOR_MODEL_PATTERNS.some((p) => p.test(title))) {
    score = Math.max(score, 90);
  }
  if (BENCHMARK_KEYWORDS.some((kw) => title.includes(kw))) {
    score = Math.max(score, 85);
  }
  if (FUNDING_KEYWORDS.some((kw) => title.includes(kw))) {
    score = Math.max(score, 75);
  }
  if (TOOL_KEYWORDS.some((kw) => title.includes(kw))) {
    score = Math.max(score, 65);
  }
  if (INCREMENTAL_KEYWORDS.some((kw) => title.includes(kw))) {
    score = Math.min(score, 55);
  }

  const isTier1 =
    TIER1_SOURCES.some((s) => source.includes(s)) ||
    TIER1_SOURCES.some((s) => company.includes(s));
  if (isTier1) {
    score = Math.min(100, score + 10);
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ---------------------------------------------------------------------------
// Novelty estimation — DETERMINISTIC (removed Math.random)
// ---------------------------------------------------------------------------

const NEW_MODEL_FAMILY_PATTERNS = [
  /introducing\s+\w+/i, /announcing\s+\w+/i, /meet\s+\w+/i,
  /new model/i, /first[-\s]ever/i, /world'?s?\s+first/i,
  /breakthrough/i,
];

const NEW_TOOL_CATEGORY_KEYWORDS = [
  'new category', 'first of its kind', 'novel approach', 'paradigm',
  'reimagining', 'rethinking', 'from scratch', 'ground up',
  'new framework', 'new architecture',
];

const INCREMENTAL_VERSION_PATTERNS = [
  /v?\d+\.\d+\.\d+/i, /\d+\.\d+ update/i, /point release/i,
  /hotfix/i, /patch/i,
];

const COMMENTARY_KEYWORDS = [
  'opinion', 'analysis', 'editorial', 'commentary', 'perspective',
  'what i think', 'my take', 'hot take', 'thread', 'review',
  'roundup', 'recap',
];

export function estimateNovelty(item: {
  title: string;
  category: string;
}): number {
  const title = item.title.toLowerCase();

  // Use a simple hash of the title for deterministic variation instead of Math.random
  const titleHash = simpleHash(title);
  const variation = (titleHash % 10); // 0-9 deterministic spread

  if (NEW_MODEL_FAMILY_PATTERNS.some((p) => p.test(title))) {
    return 90 + variation;
  }
  if (NEW_TOOL_CATEGORY_KEYWORDS.some((kw) => title.includes(kw))) {
    return 80 + Math.min(variation, 14);
  }
  if (COMMENTARY_KEYWORDS.some((kw) => title.includes(kw))) {
    return 20 + Math.min(variation, 9);
  }
  if (INCREMENTAL_VERSION_PATTERNS.some((p) => p.test(title))) {
    return 30 + Math.min(variation, 9);
  }

  if (item.category === 'research') {
    return 55 + Math.min(variation, 14);
  }

  return 40 + Math.min(variation, 14);
}

/** Simple deterministic hash for consistent scoring */
function simpleHash(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
