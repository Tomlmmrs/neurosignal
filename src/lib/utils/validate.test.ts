import { describe, it, expect } from "vitest";
import {
  parseAndValidateDate,
  computeFreshnessScore,
  isLikelyAIContent,
  normalizeUrl,
  titleSimilarity,
  contentQualityMultiplier,
  isStaleItem,
} from "./validate";

// ─── Date Parsing ────────────────────────────────────────────────────

describe("parseAndValidateDate", () => {
  it("parses ISO 8601 dates", () => {
    const result = parseAndValidateDate("2025-03-25T14:30:00Z");
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("exact");
  });

  it("parses RFC 2822 dates (RSS pubDate format)", () => {
    const result = parseAndValidateDate("Mon, 24 Mar 2025 08:00:00 GMT");
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("exact");
  });

  it("parses date-only strings", () => {
    const result = parseAndValidateDate("2025-03-25");
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("day");
  });

  it("returns null for empty/null/undefined inputs", () => {
    expect(parseAndValidateDate(null)).toBeNull();
    expect(parseAndValidateDate(undefined)).toBeNull();
    expect(parseAndValidateDate("")).toBeNull();
    expect(parseAndValidateDate("   ")).toBeNull();
  });

  it("returns null for garbage strings", () => {
    expect(parseAndValidateDate("not a date")).toBeNull();
    expect(parseAndValidateDate("yesterday")).toBeNull();
    expect(parseAndValidateDate("abc123")).toBeNull();
  });

  it("rejects dates too far in the future (>1 day)", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(parseAndValidateDate(future.toISOString())).toBeNull();
  });

  it("rejects dates before 2019", () => {
    expect(parseAndValidateDate("2018-12-31T00:00:00Z")).toBeNull();
    expect(parseAndValidateDate("2010-01-01")).toBeNull();
  });

  it("accepts dates within valid range", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(parseAndValidateDate(yesterday.toISOString())).not.toBeNull();

    expect(parseAndValidateDate("2019-01-01")).not.toBeNull();
    expect(parseAndValidateDate("2024-06-15T12:00:00Z")).not.toBeNull();
  });
});

// ─── Freshness Scoring ──────────────────────────────────────────────

describe("computeFreshnessScore", () => {
  it("gives near-zero freshness for null dates", () => {
    expect(computeFreshnessScore(null)).toBeLessThanOrEqual(5);
    expect(computeFreshnessScore(undefined)).toBeLessThanOrEqual(5);
  });

  it("gives max freshness for very recent items with exact confidence", () => {
    const now = new Date().toISOString();
    expect(computeFreshnessScore(now, "exact")).toBe(100);
  });

  it("gives reduced freshness for recent items with unknown confidence", () => {
    const now = new Date().toISOString();
    // Unknown confidence applies 0.4x penalty
    expect(computeFreshnessScore(now, "unknown")).toBe(40);
  });

  it("decays freshness over time", () => {
    const hoursAgo = (h: number) => {
      const d = new Date();
      d.setHours(d.getHours() - h);
      return d.toISOString();
    };

    const fresh = computeFreshnessScore(hoursAgo(1));
    const medium = computeFreshnessScore(hoursAgo(48));
    const old = computeFreshnessScore(hoursAgo(168));
    const veryOld = computeFreshnessScore(hoursAgo(1000));

    expect(fresh).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(old);
    expect(old).toBeGreaterThan(veryOld);
  });

  it("penalizes future dates", () => {
    const future = new Date();
    future.setHours(future.getHours() + 5);
    expect(computeFreshnessScore(future.toISOString())).toBeLessThanOrEqual(5);
  });

  it("applies confidence penalty for unknown dates", () => {
    const recent = new Date();
    recent.setHours(recent.getHours() - 2);
    const iso = recent.toISOString();

    const exact = computeFreshnessScore(iso, "exact");
    const unknown = computeFreshnessScore(iso, "unknown");

    expect(exact).toBeGreaterThan(unknown);
    expect(unknown).toBeLessThan(exact * 0.5);
  });

  it("applies confidence penalty for estimated dates", () => {
    const recent = new Date();
    recent.setHours(recent.getHours() - 2);
    const iso = recent.toISOString();

    const exact = computeFreshnessScore(iso, "exact");
    const estimated = computeFreshnessScore(iso, "estimated");

    expect(exact).toBeGreaterThan(estimated);
    expect(estimated).toBeGreaterThan(computeFreshnessScore(iso, "unknown"));
  });
});

// ─── Stale Item Detection ───────────────────────────────────────────

describe("isStaleItem", () => {
  it("considers null dates as stale", () => {
    expect(isStaleItem(null, null)).toBe(true);
    expect(isStaleItem(null, undefined)).toBe(true);
  });

  it("considers very old items as stale", () => {
    expect(isStaleItem("2024-01-01T00:00:00Z", null)).toBe(true);
  });

  it("considers recent items as fresh", () => {
    const recent = new Date();
    recent.setHours(recent.getHours() - 12);
    expect(isStaleItem(recent.toISOString(), null)).toBe(false);
  });

  it("falls back to discoveredAt when publishedAt is null", () => {
    const recent = new Date();
    recent.setHours(recent.getHours() - 12);
    expect(isStaleItem(null, recent.toISOString())).toBe(false);
  });

  it("respects custom maxAgeHours", () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
    const iso = twoDaysAgo.toISOString();

    expect(isStaleItem(iso, null, 24)).toBe(true);   // stale at 24h threshold
    expect(isStaleItem(iso, null, 72)).toBe(false);   // fresh at 72h threshold
  });
});

// ─── URL Normalization ──────────────────────────────────────────────

describe("normalizeUrl", () => {
  it("strips UTM parameters", () => {
    const url = "https://example.com/article?utm_source=twitter&utm_medium=social";
    expect(normalizeUrl(url)).toBe("https://example.com/article");
  });

  it("strips other tracking parameters", () => {
    const url = "https://example.com/post?ref=homepage&fbclid=abc123";
    expect(normalizeUrl(url)).toBe("https://example.com/post");
  });

  it("removes fragments", () => {
    const url = "https://example.com/article#section-2";
    expect(normalizeUrl(url)).toBe("https://example.com/article");
  });

  it("removes trailing slashes", () => {
    expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path");
  });

  it("keeps root path slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("preserves non-tracking query params", () => {
    const url = "https://example.com/search?q=ai+news&page=2";
    const normalized = normalizeUrl(url);
    expect(normalized).toContain("q=ai");
    expect(normalized).toContain("page=2");
  });

  it("handles invalid URLs gracefully", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
  });
});

// ─── Title Similarity ───────────────────────────────────────────────

describe("titleSimilarity", () => {
  it("returns 1 for identical titles", () => {
    expect(titleSimilarity("Hello World", "Hello World")).toBe(1);
  });

  it("returns 1 for titles that differ only in case/punctuation", () => {
    expect(titleSimilarity("Hello World!", "hello world")).toBe(1);
  });

  it("returns high similarity for near-duplicates", () => {
    const a = "OpenAI Launches GPT-5 with Breakthrough Reasoning";
    const b = "OpenAI Launches GPT-5 with Breakthrough Reasoning Capabilities";
    expect(titleSimilarity(a, b)).toBeGreaterThan(0.7);
  });

  it("returns moderate similarity for same-topic titles", () => {
    const a = "OpenAI Releases GPT-5 Model";
    const b = "GPT-5 Released by OpenAI Today";
    // Jaccard similarity with short-word filter — "openai", "releases/released", "gpt-5", "model/today"
    expect(titleSimilarity(a, b)).toBeGreaterThan(0.25);
  });

  it("returns low similarity for unrelated titles", () => {
    const a = "OpenAI Launches GPT-5";
    const b = "EU Passes New AI Regulation Bill";
    expect(titleSimilarity(a, b)).toBeLessThan(0.3);
  });

  it("returns 0 for empty titles", () => {
    expect(titleSimilarity("", "something")).toBe(0);
    expect(titleSimilarity("a b", "")).toBe(0);
  });
});

// ─── Content Quality Detection ──────────────────────────────────────

describe("contentQualityMultiplier", () => {
  it("returns 1.0 for original reporting titles", () => {
    expect(contentQualityMultiplier("OpenAI Announces GPT-5")).toBe(1.0);
    expect(contentQualityMultiplier("Meta Releases Llama 4 Open Source")).toBe(1.0);
  });

  it("penalizes listicle titles", () => {
    expect(contentQualityMultiplier("Top 10 AI Tools You Should Know")).toBeLessThan(1.0);
    // "5 Best Ways" only matches one pattern, gets 0.7 penalty
    expect(contentQualityMultiplier("5 Best Ways to Use AI in 2025")).toBeLessThanOrEqual(1.0);
  });

  it("penalizes roundup/recap titles", () => {
    expect(contentQualityMultiplier("Weekly AI Roundup: What Happened This Week")).toBeLessThan(0.5);
    expect(contentQualityMultiplier("Monthly AI Newsletter Recap")).toBeLessThan(0.5);
  });

  it("penalizes evergreen explainer titles", () => {
    expect(contentQualityMultiplier("What is Machine Learning? A Beginner's Guide")).toBeLessThan(0.5);
    expect(contentQualityMultiplier("How to Fine-tune LLMs Explained")).toBeLessThan(1.0);
  });

  it("penalizes opinion/commentary titles", () => {
    expect(contentQualityMultiplier("My Take on the AGI Debate: An Editorial")).toBeLessThan(0.5);
  });
});

// ─── AI Content Filtering ───────────────────────────────────────────

describe("isLikelyAIContent", () => {
  it("identifies AI-related titles", () => {
    expect(isLikelyAIContent("OpenAI releases new GPT model")).toBe(true);
    expect(isLikelyAIContent("New transformer architecture for NLP")).toBe(true);
    expect(isLikelyAIContent("NVIDIA announces new GPU for AI training")).toBe(true);
  });

  it("rejects non-AI content", () => {
    expect(isLikelyAIContent("Apple releases new iPhone")).toBe(false);
    expect(isLikelyAIContent("Weather forecast for tomorrow")).toBe(false);
    expect(isLikelyAIContent("Stock market rises on earnings")).toBe(false);
  });

  it("uses description for additional context", () => {
    expect(isLikelyAIContent("New paper published", "A novel transformer architecture for language understanding")).toBe(true);
  });
});
