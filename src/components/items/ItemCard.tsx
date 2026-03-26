"use client";

import { useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Code2,
  AlertCircle,
  Shield,
  Clock,
  HelpCircle,
} from "lucide-react";
import type { Item } from "@/lib/db/schema";
import { formatTimestamp } from "@/lib/utils/format";

const categoryColors: Record<string, string> = {
  model: "bg-cat-model/20 text-cat-model",
  tool: "bg-cat-tool/20 text-cat-tool",
  research: "bg-cat-research/20 text-cat-research",
  company: "bg-cat-company/20 text-cat-company",
  opensource: "bg-cat-opensource/20 text-cat-opensource",
  policy: "bg-cat-policy/20 text-cat-policy",
  market: "bg-cat-market/20 text-cat-market",
};

const categoryLabels: Record<string, string> = {
  model: "AI Models",
  tool: "AI Tools",
  research: "Research",
  company: "Companies",
  opensource: "Open Source",
  policy: "Policy",
  market: "Market",
};

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full score-bar ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-6 text-right">{Math.round(value)}</span>
    </div>
  );
}

function TimestampBadge({ dateStr, dateConfidence }: { dateStr: string | null | undefined; dateConfidence?: string | null }) {
  const ts = formatTimestamp(dateStr, dateConfidence);

  if (ts.unknown) {
    return (
      <span className="flex items-center gap-0.5 text-muted/60 italic" title="No publish date available">
        <HelpCircle className="h-2.5 w-2.5" />
        {ts.text}
      </span>
    );
  }

  if (ts.stale) {
    return (
      <span className="flex items-center gap-0.5 text-muted/40" title="Content is older than 2 weeks">
        <Clock className="h-2.5 w-2.5" />
        {ts.text}
      </span>
    );
  }

  // Show a subtle indicator for estimated dates
  if (ts.dateConfidence === "estimated") {
    return (
      <span className="text-muted" title="Publish date is estimated">
        ~{ts.text}
      </span>
    );
  }

  return <span>{ts.text}</span>;
}

export default function ItemCard({ item }: { item: Item }) {
  const [bookmarked, setBookmarked] = useState(item.isBookmarked ?? false);
  const [showWhy, setShowWhy] = useState(false);

  const tags: string[] = item.tags ? JSON.parse(item.tags) : [];

  const handleBookmark = async () => {
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await fetch(`/api/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action: "bookmark" }),
      });
    } catch {
      setBookmarked(!next);
    }
  };

  return (
    <article className="group p-3.5 bg-card border border-border-subtle rounded-lg hover:border-border hover:bg-card-hover transition-colors">
      {/* Top row: category + source + time */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
              categoryColors[item.category] ?? "bg-muted/20 text-muted-foreground"
            }`}
          >
            {categoryLabels[item.category] ?? item.category}
          </span>
          {item.isOpenSource && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-cat-opensource/15 text-cat-opensource">
              <Code2 className="h-2.5 w-2.5" />
              OSS
            </span>
          )}
          {item.company && (
            <span className="text-[10px] text-muted-foreground">{item.company}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          {item.isPrimarySource && (
            <span className="flex items-center gap-0.5 text-emerald-500" title="Primary/official source">
              <Shield className="h-2.5 w-2.5" />
            </span>
          )}
          <span>{item.source}</span>
          <TimestampBadge
            dateStr={item.publishedAt ?? item.discoveredAt}
            dateConfidence={(item as any).dateConfidence}
          />
        </div>
      </div>

      {/* Title */}
      <h3 className="mb-1.5">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-foreground hover:text-accent transition-colors inline-flex items-center gap-1"
        >
          {item.title}
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        </a>
      </h3>

      {/* Summary */}
      {(item.aiSummary || item.summary) && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-2.5 line-clamp-3">
          {item.aiSummary || item.summary}
        </p>
      )}

      {/* Scores */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-1 mb-2.5">
        <ScoreBar label="Importance" value={item.importanceScore ?? 50} color="bg-cat-company" />
        <ScoreBar label="Novelty" value={item.noveltyScore ?? 50} color="bg-cat-model" />
        <ScoreBar label="Freshness" value={item.freshnessScore ?? 50} color="bg-emerald-500" />
      </div>

      {/* Tags + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 flex-wrap">
          {tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] bg-border/50 text-muted-foreground rounded"
            >
              {tag}
            </span>
          ))}
          {tags.length > 5 && (
            <span className="text-[10px] text-muted">+{tags.length - 5}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {item.whyItMatters && (
            <button
              onClick={() => setShowWhy(!showWhy)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              Why
              {showWhy ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}
          <button
            onClick={handleBookmark}
            className="p-1 rounded hover:bg-border/50 transition-colors"
            title={bookmarked ? "Remove bookmark" : "Bookmark"}
          >
            {bookmarked ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-accent" />
            ) : (
              <Bookmark className="h-3.5 w-3.5 text-muted" />
            )}
          </button>
        </div>
      </div>

      {/* Why it matters - expandable */}
      {showWhy && item.whyItMatters && (
        <div className="mt-2.5 pt-2.5 border-t border-border-subtle">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Why it matters: </span>
            {item.whyItMatters}
          </p>
        </div>
      )}
    </article>
  );
}
