import type { DateConfidence } from "../types";

/**
 * Check if a date string is missing, invalid, or suspiciously old/future.
 */
export function isStaleDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  const ageMs = Date.now() - d.getTime();
  if (ageMs < -86400000) return true; // > 1 day in future
  if (ageMs > 14 * 24 * 60 * 60 * 1000) return true; // > 14 days old
  return false;
}

/**
 * Structured timestamp result for UI rendering.
 */
export interface FormattedTimestamp {
  text: string;
  stale: boolean;
  unknown: boolean;
  dateConfidence?: DateConfidence;
}

/**
 * Format a date string into a structured result the UI can use to render
 * appropriate indicators for unknown or stale dates.
 */
export function formatTimestamp(
  dateStr: string | null | undefined,
  dateConfidence?: DateConfidence | string | null
): FormattedTimestamp {
  if (!dateStr) return { text: 'Date unknown', stale: false, unknown: true, dateConfidence: 'unknown' };

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { text: 'Date unknown', stale: false, unknown: true, dateConfidence: 'unknown' };

  const text = formatRelativeTime(dateStr);
  const stale = isStaleDate(dateStr);
  const conf = (dateConfidence as DateConfidence) ?? 'unknown';

  return { text, stale, unknown: false, dateConfidence: conf };
}

/**
 * Format a date string as a relative time description, e.g. "2 hours ago".
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  if (years === 1) return '1 year ago';
  return `${years} years ago`;
}

/**
 * Format a date string as a readable date, e.g. "Mar 15, 2025".
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Truncate a string to the given length, appending an ellipsis if truncated.
 */
export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len).trimEnd() + '\u2026';
}

/**
 * Map a numeric score (0-100) to a human-readable label and Tailwind color class.
 */
export function scoreToLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Critical', color: 'text-red-600' };
  if (score >= 70) return { label: 'High', color: 'text-orange-500' };
  if (score >= 50) return { label: 'Medium', color: 'text-yellow-500' };
  if (score >= 30) return { label: 'Low', color: 'text-blue-400' };
  return { label: 'Noise', color: 'text-gray-400' };
}

/**
 * Map a category slug to a display label and lucide icon name.
 */
export function categoryToLabel(category: string): {
  label: string;
  icon: string;
} {
  const map: Record<string, { label: string; icon: string }> = {
    model: { label: 'AI Models', icon: 'brain' },
    tool: { label: 'AI Tools', icon: 'wrench' },
    research: { label: 'Research', icon: 'flask-conical' },
    company: { label: 'Companies & Labs', icon: 'building-2' },
    opensource: { label: 'Open Source', icon: 'github' },
    policy: { label: 'Policy & Regulation', icon: 'landmark' },
    market: { label: 'Market & Industry', icon: 'trending-up' },
  };

  return map[category] ?? { label: category, icon: 'circle' };
}

/**
 * Return a Tailwind background color class for a category.
 */
export function categoryToColor(category: string): string {
  const map: Record<string, string> = {
    model: 'bg-purple-100 text-purple-800',
    tool: 'bg-blue-100 text-blue-800',
    research: 'bg-emerald-100 text-emerald-800',
    company: 'bg-amber-100 text-amber-800',
    opensource: 'bg-green-100 text-green-800',
    policy: 'bg-red-100 text-red-800',
    market: 'bg-cyan-100 text-cyan-800',
  };

  return map[category] ?? 'bg-gray-100 text-gray-800';
}
