import { db, schema } from "../../db";
import { eq } from "drizzle-orm";
import { RssAdapter } from "./rss-adapter";
import { GitHubAdapter } from "./github-adapter";
import { HuggingFacePapersAdapter } from "./hf-papers-adapter";
import type { SourceAdapter } from "../types";

export function getEnabledAdapters(): SourceAdapter[] {
  const sources = db
    .select()
    .from(schema.sources)
    .where(eq(schema.sources.enabled, true))
    .all();

  // Sort by priority so highest-priority sources run first
  sources.sort((a, b) => (b.sourcePriority ?? 50) - (a.sourcePriority ?? 50));

  const adapters: SourceAdapter[] = [];

  for (const source of sources) {
    // Skip sources with too many consecutive failures (auto-disable)
    if ((source.consecutiveFailures ?? 0) >= 5) {
      console.warn(
        `[sources] Skipping "${source.id}" — ${source.consecutiveFailures} consecutive failures. Fix the source or reset.`
      );
      continue;
    }

    try {
      const adapter = createAdapter(source);
      if (adapter) {
        adapters.push(adapter);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[sources] Failed to create adapter for "${source.id}": ${message}`
      );
    }
  }

  return adapters;
}

function createAdapter(
  source: typeof schema.sources.$inferSelect
): SourceAdapter | null {
  switch (source.type) {
    case "rss":
    case "blog":
      return new RssAdapter({
        id: source.id,
        name: source.name,
        url: source.url,
        type: source.type,
        category: source.category,
      });

    case "scraper":
      if (source.id === "github_trending" || source.url.includes("github.com")) {
        return new GitHubAdapter({ id: source.id, name: source.name });
      }
      console.warn(`[sources] No scraper implementation for source "${source.id}"`);
      return null;

    case "api":
      if (source.id === "hf_papers") {
        return new HuggingFacePapersAdapter();
      }
      console.warn(`[sources] API adapter not yet implemented for "${source.id}"`);
      return null;

    default:
      console.warn(`[sources] Unknown source type "${source.type}" for "${source.id}"`);
      return null;
  }
}
