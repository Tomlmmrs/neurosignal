import { describe, it, expect } from "vitest";
import { formatTimestamp, formatRelativeTime, isStaleDate } from "./format";

describe("formatTimestamp", () => {
  it("marks null dates as unknown", () => {
    const result = formatTimestamp(null);
    expect(result.unknown).toBe(true);
    expect(result.text).toBe("Date unknown");
  });

  it("marks invalid dates as unknown", () => {
    const result = formatTimestamp("not a date");
    expect(result.unknown).toBe(true);
  });

  it("marks very old dates as stale", () => {
    const result = formatTimestamp("2024-01-01T00:00:00Z");
    expect(result.stale).toBe(true);
  });

  it("marks recent dates as not stale", () => {
    const recent = new Date();
    recent.setHours(recent.getHours() - 2);
    const result = formatTimestamp(recent.toISOString());
    expect(result.stale).toBe(false);
    expect(result.unknown).toBe(false);
  });

  it("includes date confidence", () => {
    const result = formatTimestamp(new Date().toISOString(), "estimated");
    expect(result.dateConfidence).toBe("estimated");
  });
});

describe("formatRelativeTime", () => {
  it("shows 'just now' for very recent", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("just now");
  });

  it("shows minutes for recent items", () => {
    const fiveMin = new Date();
    fiveMin.setMinutes(fiveMin.getMinutes() - 5);
    expect(formatRelativeTime(fiveMin.toISOString())).toBe("5 min ago");
  });

  it("shows hours correctly", () => {
    const threeHours = new Date();
    threeHours.setHours(threeHours.getHours() - 3);
    expect(formatRelativeTime(threeHours.toISOString())).toBe("3 hours ago");
  });

  it("shows days correctly", () => {
    const twoDays = new Date();
    twoDays.setDate(twoDays.getDate() - 2);
    expect(formatRelativeTime(twoDays.toISOString())).toBe("2 days ago");
  });

  it("shows 'just now' for future dates", () => {
    const future = new Date();
    future.setHours(future.getHours() + 1);
    expect(formatRelativeTime(future.toISOString())).toBe("just now");
  });
});

describe("isStaleDate", () => {
  it("returns true for null", () => {
    expect(isStaleDate(null)).toBe(true);
    expect(isStaleDate(undefined)).toBe(true);
  });

  it("returns true for invalid dates", () => {
    expect(isStaleDate("not a date")).toBe(true);
  });

  it("returns true for dates > 14 days old", () => {
    const old = new Date();
    old.setDate(old.getDate() - 20);
    expect(isStaleDate(old.toISOString())).toBe(true);
  });

  it("returns false for recent dates", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 3);
    expect(isStaleDate(recent.toISOString())).toBe(false);
  });

  it("returns true for far-future dates", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(isStaleDate(future.toISOString())).toBe(true);
  });
});
