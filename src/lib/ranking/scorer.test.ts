import { describe, it, expect } from "vitest";
import {
  calculateCompositeScore,
  recencyScore,
  estimateImportance,
  estimateNovelty,
} from "./scorer";

// ─── Recency Score ──────────────────────────────────────────────────

describe("recencyScore", () => {
  it("gives near-zero score for null dates", () => {
    expect(recencyScore(null)).toBeLessThanOrEqual(5);
    expect(recencyScore(undefined)).toBeLessThanOrEqual(5);
  });

  it("gives max score for very recent items", () => {
    expect(recencyScore(new Date().toISOString())).toBe(100);
  });

  it("decays correctly over hours", () => {
    const hoursAgo = (h: number) => {
      const d = new Date();
      d.setHours(d.getHours() - h);
      return d.toISOString();
    };

    // 1 hour should be very high
    expect(recencyScore(hoursAgo(1))).toBeGreaterThanOrEqual(90);

    // 24 hours should be moderate-high
    const day = recencyScore(hoursAgo(24));
    expect(day).toBeGreaterThan(50);
    expect(day).toBeLessThan(90);

    // 3 days should be moderate
    const threeDays = recencyScore(hoursAgo(72));
    expect(threeDays).toBeLessThanOrEqual(50);
    expect(threeDays).toBeGreaterThan(20);

    // 1 week should be low
    expect(recencyScore(hoursAgo(168))).toBeLessThanOrEqual(25);

    // 1 month should be very low
    expect(recencyScore(hoursAgo(720))).toBeLessThanOrEqual(10);
  });

  it("penalizes future dates", () => {
    const future = new Date();
    future.setHours(future.getHours() + 48);
    expect(recencyScore(future.toISOString())).toBeLessThanOrEqual(5);
  });

  it("applies confidence penalty for unknown dates", () => {
    const recent = new Date();
    recent.setHours(recent.getHours() - 2);
    const iso = recent.toISOString();

    const exact = recencyScore(iso, "exact");
    const unknown = recencyScore(iso, "unknown");

    expect(exact).toBeGreaterThan(unknown * 2);
  });
});

// ─── Composite Score ────────────────────────────────────────────────

describe("calculateCompositeScore", () => {
  it("returns score in 0-100 range", () => {
    const score = calculateCompositeScore({
      importanceScore: 80,
      noveltyScore: 70,
      credibilityScore: 90,
      impactScore: 75,
      practicalScore: 60,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns 0 when all scores are 0", () => {
    expect(
      calculateCompositeScore({
        importanceScore: 0,
        noveltyScore: 0,
        credibilityScore: 0,
        impactScore: 0,
        practicalScore: 0,
      })
    ).toBe(0);
  });

  it("returns 100 when all scores are 100", () => {
    expect(
      calculateCompositeScore({
        importanceScore: 100,
        noveltyScore: 100,
        credibilityScore: 100,
        impactScore: 100,
        practicalScore: 100,
      })
    ).toBe(100);
  });

  it("respects custom weights", () => {
    const item = {
      importanceScore: 100,
      noveltyScore: 0,
      credibilityScore: 0,
      impactScore: 0,
      practicalScore: 0,
    };

    const importanceHeavy = calculateCompositeScore(item, {
      importance: 1.0,
      novelty: 0,
      credibility: 0,
      impact: 0,
      practical: 0,
    });

    expect(importanceHeavy).toBe(100);
  });
});

// ─── Importance Estimation ──────────────────────────────────────────

describe("estimateImportance", () => {
  it("gives high importance to major model releases", () => {
    const score = estimateImportance({
      title: "GPT-5 Released with Major Improvements",
      source: "openai_blog",
      sourceType: "blog",
      company: "OpenAI",
    });
    // GPT-5 matches MAJOR_MODEL_PATTERNS -> 90, "Released" matches TOOL_KEYWORDS -> max(90, 65) = 90,
    // tier-1 boost +10 = 100
    expect(score).toBeGreaterThanOrEqual(65);
  });

  it("gives moderate importance to general tools", () => {
    const score = estimateImportance({
      title: "New Python library for data processing",
      source: "github_trending",
      sourceType: "github",
    });
    expect(score).toBeLessThanOrEqual(70);
  });

  it("caps score for incremental updates", () => {
    const score = estimateImportance({
      title: "Minor fix for v0.3.2 beta patch",
      source: "github_trending",
      sourceType: "github",
    });
    expect(score).toBeLessThanOrEqual(55);
  });

  it("boosts tier-1 sources", () => {
    const noBoost = estimateImportance({
      title: "New AI model released",
      source: "random_blog",
      sourceType: "blog",
    });
    const withBoost = estimateImportance({
      title: "New AI model released",
      source: "openai_blog",
      sourceType: "blog",
      company: "OpenAI",
    });
    expect(withBoost).toBeGreaterThan(noBoost);
  });

  it("is deterministic (no randomness)", () => {
    const input = {
      title: "Test Article About AI",
      source: "test",
      sourceType: "blog" as const,
    };
    const score1 = estimateImportance(input);
    const score2 = estimateImportance(input);
    expect(score1).toBe(score2);
  });
});

// ─── Novelty Estimation ─────────────────────────────────────────────

describe("estimateNovelty", () => {
  it("gives high novelty to introductions and breakthroughs", () => {
    expect(estimateNovelty({ title: "Introducing Aurora: A New AI Model", category: "model" }))
      .toBeGreaterThanOrEqual(90);
    expect(estimateNovelty({ title: "Breakthrough in AI Reasoning", category: "research" }))
      .toBeGreaterThanOrEqual(90);
  });

  it("gives low novelty to commentary and reviews", () => {
    expect(estimateNovelty({ title: "My Take on GPT-5: A Review", category: "model" }))
      .toBeLessThanOrEqual(35);
    expect(estimateNovelty({ title: "Weekly AI Recap and Roundup", category: "tool" }))
      .toBeLessThanOrEqual(35);
  });

  it("gives moderate novelty to version updates", () => {
    const score = estimateNovelty({ title: "Library v2.3.1 update released", category: "tool" });
    expect(score).toBeGreaterThanOrEqual(25);
    expect(score).toBeLessThanOrEqual(50);
  });

  it("gives slightly higher novelty to research", () => {
    const researchScore = estimateNovelty({ title: "Generic research paper", category: "research" });
    const toolScore = estimateNovelty({ title: "Generic tool article", category: "tool" });
    expect(researchScore).toBeGreaterThanOrEqual(toolScore);
  });

  it("is deterministic (no Math.random)", () => {
    const input = { title: "Test Article", category: "model" };
    const scores = new Set<number>();
    for (let i = 0; i < 10; i++) {
      scores.add(estimateNovelty(input));
    }
    // All 10 calls should return the same value
    expect(scores.size).toBe(1);
  });
});
