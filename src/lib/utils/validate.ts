import type { DateConfidence } from "../types";

// ─── URL Validation ─────────────────────────────────────────────────

export async function validateUrl(url: string): Promise<{
  valid: boolean;
  status?: number;
  finalUrl?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "AIIntelligenceBot/1.0" },
    });
    clearTimeout(timeout);
    return {
      valid: response.ok,
      status: response.status,
      finalUrl: response.url,
    };
  } catch {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "AIIntelligenceBot/1.0" },
      });
      clearTimeout(timeout);
      return {
        valid: response.ok,
        status: response.status,
        finalUrl: response.url,
      };
    } catch {
      return { valid: false };
    }
  }
}

// ─── Canonical URL Resolution ───────────────────────────────────────

/** Normalize a URL for deduplication: strip tracking params, fragments, trailing slashes */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove common tracking parameters
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
      "ref", "source", "mc_cid", "mc_eid", "fbclid", "gclid",
    ];
    for (const param of trackingParams) {
      u.searchParams.delete(param);
    }
    // Remove fragment
    u.hash = "";
    // Remove trailing slash (except root)
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    u.pathname = path;
    return u.toString();
  } catch {
    return url.trim();
  }
}

// ─── Date Validation & Parsing ──────────────────────────────────────

export interface ParsedDate {
  iso: string;
  confidence: DateConfidence;
}

/**
 * Parse and validate a date string. Returns null if unparseable.
 * Never fabricates dates — if the input is invalid, returns null.
 */
export function parseAndValidateDate(
  dateStr: string | null | undefined
): ParsedDate | null {
  if (!dateStr || !dateStr.trim()) return null;
  const trimmed = dateStr.trim();

  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return null;

    // Reject dates more than 1 day in the future
    if (d.getTime() > Date.now() + 24 * 60 * 60 * 1000) return null;

    // Reject dates before 2019 (too old to be relevant AI news)
    if (d.getFullYear() < 2019) return null;

    // Determine confidence based on input format
    let confidence: DateConfidence = "day";

    // Full ISO with time = exact
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed) ||
        /\w{3},\s+\d{1,2}\s+\w{3}\s+\d{4}\s+\d{2}:\d{2}/.test(trimmed)) {
      confidence = "exact";
    }
    // Just a date with no time
    else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      confidence = "day";
    }

    return { iso: d.toISOString(), confidence };
  } catch {
    return null;
  }
}

/**
 * Legacy compat: returns just the ISO string or null.
 */
export function parseAndValidateDateString(
  dateStr: string | null | undefined
): string | null {
  const result = parseAndValidateDate(dateStr);
  return result?.iso ?? null;
}

export function isValidDate(dateStr: string | null | undefined): boolean {
  return parseAndValidateDate(dateStr) !== null;
}

// ─── Freshness Scoring ──────────────────────────────────────────────

/**
 * Compute a freshness score (0-100) based on age.
 * Much more aggressive decay than before — this is the core of "recency first" ranking.
 */
export function computeFreshnessScore(
  publishedAt: string | null | undefined,
  dateConfidence: DateConfidence = "unknown"
): number {
  if (!publishedAt) return 5; // Unknown date = near-zero freshness (was 15)

  const d = new Date(publishedAt);
  if (isNaN(d.getTime())) return 5;

  const ageHours = (Date.now() - d.getTime()) / (1000 * 60 * 60);

  if (ageHours < 0) return 3; // Future dates are suspicious

  // Apply a confidence penalty for uncertain dates
  const confPenalty = dateConfidence === "unknown" ? 0.4
    : dateConfidence === "estimated" ? 0.7
    : 1.0;

  let raw: number;
  if (ageHours < 1) raw = 100;
  else if (ageHours < 3) raw = 97;
  else if (ageHours < 6) raw = 94;
  else if (ageHours < 12) raw = 88;
  else if (ageHours < 24) raw = 80;
  else if (ageHours < 48) raw = 65;
  else if (ageHours < 72) raw = 50;
  else if (ageHours < 120) raw = 35;  // 5 days
  else if (ageHours < 168) raw = 25;  // 1 week
  else if (ageHours < 336) raw = 15;  // 2 weeks
  else if (ageHours < 720) raw = 8;   // 1 month
  else raw = 3;                         // Older than 1 month

  return Math.round(raw * confPenalty);
}

// ─── Stale Detection ────────────────────────────────────────────────

/**
 * Check if an item's effective date is older than the given threshold in hours.
 */
export function isStaleItem(
  publishedAt: string | null | undefined,
  discoveredAt: string | null | undefined,
  maxAgeHours: number = 168 // 7 days default
): boolean {
  const effectiveDate = publishedAt || discoveredAt;
  if (!effectiveDate) return true;
  const d = new Date(effectiveDate);
  if (isNaN(d.getTime())) return true;
  const ageHours = (Date.now() - d.getTime()) / (1000 * 60 * 60);
  return ageHours > maxAgeHours || ageHours < -24;
}

// ─── Content Filtering ──────────────────────────────────────────────

const AI_KEYWORDS = [
  "ai", "artificial intelligence", "machine learning", "deep learning",
  "llm", "large language model", "neural network", "gpt", "claude",
  "gemini", "llama", "transformer", "diffusion", "generative",
  "chatbot", "copilot", "agent", "multimodal", "embedding",
  "fine-tun", "rlhf", "rag", "retrieval augmented", "inference",
  "training", "benchmark", "model release", "open source model",
  "openai", "anthropic", "deepmind", "hugging face", "mistral",
  "stability ai", "cohere", "nvidia", "gpu", "cuda", "tensor",
  "pytorch", "tensorflow", "reasoning", "alignment", "safety",
  "robotics", "computer vision", "nlp", "natural language",
  "text-to-image", "text-to-video", "speech recognition",
  "tts", "text-to-speech", "foundation model", "agentic",
  "chain of thought", "tool use", "function calling",
  "vision language", "reward model", "scaling law",
  "mixture of experts", "moe", "quantization", "distillation",
  "context window", "token", "prompt engineering",
];

export function isLikelyAIContent(
  title: string,
  description?: string
): boolean {
  const text = `${title} ${description || ""}`.toLowerCase();
  return AI_KEYWORDS.some((kw) => text.includes(kw));
}

// ─── Title Similarity for Deduplication ─────────────────────────────

/**
 * Compute a simple normalized similarity between two titles.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
export function titleSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;

  // Jaccard similarity on word sets
  const wordsA = new Set(na.split(" ").filter(w => w.length > 2));
  const wordsB = new Set(nb.split(" ").filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

// ─── Commentary / Low-Value Content Detection ───────────────────────

const COMMENTARY_PATTERNS = [
  /\bopinion\b/i, /\beditorial\b/i, /\bcommentary\b/i,
  /\bmy take\b/i, /\bhot take\b/i, /\bperspective\b/i,
  /\broundup\b/i, /\brecap\b/i, /\bdigest\b/i,
  /\bweekly\b/i, /\bmonthly\b/i, /\bnewsletter\b/i,
  /\btop \d+ /i, /\bbest \d+ /i, /\d+ (things|ways|tips|reasons)\b/i,
  /\bevergreen\b/i, /\bbeginner'?s?\s+guide\b/i,
  /\bwhat is\b/i, /\bhow to\b/i, /\bexplained\b/i,
  /\bintroduction to\b/i,
];

/**
 * Detect if content is secondary commentary/listicle rather than original reporting.
 * Returns a penalty multiplier (1.0 = no penalty, <1.0 = penalized).
 */
export function contentQualityMultiplier(title: string): number {
  const matchCount = COMMENTARY_PATTERNS.filter(p => p.test(title)).length;
  if (matchCount >= 2) return 0.4; // Very likely listicle/roundup
  if (matchCount === 1) return 0.7; // Possibly commentary
  return 1.0;
}
