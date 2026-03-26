import { db, schema } from "./index";
import { eq, desc, like, or, and, sql, gt, isNull, isNotNull } from "drizzle-orm";
import type { RankMode, Category, TimeWindow } from "../types";
import { TIME_WINDOW_HOURS } from "../types";

const { items, clusters, signals, entities, alerts, bookmarks, userPreferences, sources: sourcesTable, sourceFetchLog } = schema;

// ─── Items ──────────────────────────────────────────────────────────

export interface ItemQueryOptions {
  mode?: RankMode;
  category?: Category;
  company?: string;
  isOpenSource?: boolean;
  search?: string;
  minImportance?: number;
  limit?: number;
  offset?: number;
  bookmarkedOnly?: boolean;
  includeDemo?: boolean;
  timeWindow?: TimeWindow;
}

/**
 * Freshness-boosted ranking score used in SQL.
 * Very aggressive: items older than 7 days get a harsh penalty.
 * Items with null dates are heavily penalized.
 */
const freshnessBoostedScore = sql`(
  COALESCE(${items.compositeScore}, 50) * (
    CASE
      WHEN ${items.publishedAt} IS NULL THEN 0.25
      WHEN julianday('now') - julianday(${items.publishedAt}) < 0.042 THEN 2.0
      WHEN julianday('now') - julianday(${items.publishedAt}) < 0.25 THEN 1.8
      WHEN julianday('now') - julianday(${items.publishedAt}) < 0.5 THEN 1.6
      WHEN julianday('now') - julianday(${items.publishedAt}) < 1 THEN 1.4
      WHEN julianday('now') - julianday(${items.publishedAt}) < 2 THEN 1.2
      WHEN julianday('now') - julianday(${items.publishedAt}) < 3 THEN 1.0
      WHEN julianday('now') - julianday(${items.publishedAt}) < 5 THEN 0.7
      WHEN julianday('now') - julianday(${items.publishedAt}) < 7 THEN 0.5
      WHEN julianday('now') - julianday(${items.publishedAt}) < 14 THEN 0.3
      WHEN julianday('now') - julianday(${items.publishedAt}) < 30 THEN 0.15
      ELSE 0.05
    END
  )
  * CASE WHEN ${items.duplicateOf} IS NOT NULL THEN 0.2 ELSE 1.0 END
  * CASE WHEN ${items.isPrimarySource} = 1 THEN 1.1 ELSE 1.0 END
  * CASE WHEN ${items.dateConfidence} = 'unknown' THEN 0.4
         WHEN ${items.dateConfidence} = 'estimated' THEN 0.7
         ELSE 1.0 END
)`;

/**
 * Build a time-window SQL condition. Defaults to 3 days for main feeds.
 */
function timeWindowCondition(tw: TimeWindow) {
  if (tw === "all") return undefined;
  const hours = TIME_WINDOW_HOURS[tw];
  // Use COALESCE to check published_at first, then discovered_at
  return sql`(
    COALESCE(${items.publishedAt}, ${items.discoveredAt}) >= datetime('now', '-${sql.raw(String(hours))} hours')
  )`;
}

export function getItems(opts: ItemQueryOptions = {}) {
  const conditions = [];

  // Exclude demo data by default
  if (!opts.includeDemo) {
    conditions.push(eq(items.isDemo, false));
  }

  // Exclude items marked as duplicates from main views
  conditions.push(isNull(items.duplicateOf));

  // Time window — default to 3 days for "latest", 7 days for other modes
  const defaultWindow: TimeWindow = opts.mode === "latest" ? "3d"
    : (opts.mode === "important" || opts.mode === "novel") ? "7d"
    : "all";
  const tw = opts.timeWindow ?? defaultWindow;
  const twCond = timeWindowCondition(tw);
  if (twCond) conditions.push(twCond);

  if (opts.category) {
    conditions.push(eq(items.category, opts.category));
  }
  if (opts.company) {
    conditions.push(eq(items.company, opts.company));
  }
  if (opts.isOpenSource !== undefined) {
    conditions.push(eq(items.isOpenSource, opts.isOpenSource));
  }
  if (opts.minImportance) {
    conditions.push(sql`${items.importanceScore} >= ${opts.minImportance}`);
  }
  if (opts.bookmarkedOnly) {
    conditions.push(eq(items.isBookmarked, true));
  }
  if (opts.search) {
    const term = `%${opts.search}%`;
    conditions.push(
      or(
        like(items.title, term),
        like(items.summary, term),
        like(items.content, term),
        like(items.tags, term),
        like(items.company, term)
      )
    );
  }

  if (opts.mode === "opensource") {
    conditions.push(
      or(eq(items.isOpenSource, true), eq(items.category, "opensource"))
    );
  }
  if (opts.mode === "research") {
    conditions.push(eq(items.category, "research"));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Mode-specific ordering
  let orderBy;
  switch (opts.mode) {
    case "latest":
      // Chronological, but items with real published dates first.
      // Items without publishedAt are pushed to the bottom.
      orderBy = [
        desc(sql`CASE WHEN ${items.publishedAt} IS NOT NULL THEN 1 ELSE 0 END`),
        desc(sql`COALESCE(${items.publishedAt}, ${items.discoveredAt})`),
        desc(items.compositeScore),
      ];
      break;
    case "important":
      orderBy = [desc(freshnessBoostedScore)];
      break;
    case "novel":
      orderBy = [desc(sql`(${items.noveltyScore} * ${freshnessBoostedScore} / COALESCE(${items.compositeScore}, 50))`), desc(items.publishedAt)];
      break;
    case "impactful":
      orderBy = [desc(sql`(${items.impactScore} * ${freshnessBoostedScore} / COALESCE(${items.compositeScore}, 50))`), desc(freshnessBoostedScore)];
      break;
    case "underrated":
      orderBy = [desc(sql`(${items.noveltyScore} * 0.6 + (100 - COALESCE(${items.importanceScore}, 50)) * 0.4) * CASE WHEN julianday('now') - julianday(COALESCE(${items.publishedAt}, ${items.discoveredAt})) < 7 THEN 1.0 ELSE 0.3 END`), desc(items.publishedAt)];
      break;
    case "opensource":
    case "research":
      orderBy = [desc(freshnessBoostedScore), desc(items.publishedAt)];
      break;
    default:
      orderBy = [desc(freshnessBoostedScore), desc(items.publishedAt)];
  }

  return db
    .select()
    .from(items)
    .where(where)
    .orderBy(...orderBy)
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0)
    .all();
}

export function getItemById(id: string) {
  return db.select().from(items).where(eq(items.id, id)).get();
}

export function getItemsByCluster(clusterId: string) {
  return db
    .select()
    .from(items)
    .where(eq(items.clusterId, clusterId))
    .orderBy(desc(items.publishedAt))
    .all();
}

export function toggleBookmark(itemId: string) {
  const item = getItemById(itemId);
  if (!item) return null;
  db.update(items)
    .set({ isBookmarked: !item.isBookmarked })
    .where(eq(items.id, itemId))
    .run();
  return { ...item, isBookmarked: !item.isBookmarked };
}

export function markAsRead(itemId: string) {
  db.update(items)
    .set({ isRead: true })
    .where(eq(items.id, itemId))
    .run();
}

// ─── Clusters ───────────────────────────────────────────────────────

export function getClusters(limit = 20) {
  return db
    .select()
    .from(clusters)
    .orderBy(desc(clusters.lastUpdated))
    .limit(limit)
    .all();
}

export function getClusterById(id: string) {
  return db.select().from(clusters).where(eq(clusters.id, id)).get();
}

export function getTrendingClusters(limit = 10, includeDemo = false) {
  const conditions = includeDemo ? undefined : eq(clusters.isDemo, false);
  return db
    .select()
    .from(clusters)
    .where(conditions)
    .orderBy(desc(clusters.trendVelocity))
    .limit(limit)
    .all();
}

// ─── Signals ────────────────────────────────────────────────────────

export function getActiveSignals(limit = 10, includeDemo = false) {
  const conditions = includeDemo
    ? eq(signals.isActive, true)
    : and(eq(signals.isActive, true), eq(signals.isDemo, false));
  return db
    .select()
    .from(signals)
    .where(conditions)
    .orderBy(desc(signals.strength))
    .limit(limit)
    .all();
}

// ─── Entities ───────────────────────────────────────────────────────

export function getTopEntities(type?: string, limit = 20) {
  const conditions = type ? eq(entities.type, type) : undefined;
  return db
    .select()
    .from(entities)
    .where(conditions)
    .orderBy(desc(entities.mentionCount))
    .limit(limit)
    .all();
}

export function getEntityById(id: string) {
  return db.select().from(entities).where(eq(entities.id, id)).get();
}

// ─── Alerts ─────────────────────────────────────────────────────────

export function getAlerts(unreadOnly = false, limit = 20, includeDemo = false) {
  const conditions = [];
  if (!includeDemo) conditions.push(eq(alerts.isDemo, false));
  if (unreadOnly) conditions.push(eq(alerts.isRead, false));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select()
    .from(alerts)
    .where(where)
    .orderBy(desc(alerts.createdAt))
    .limit(limit)
    .all();
}

export function getUnreadAlertCount(includeDemo = false) {
  const conditions = [eq(alerts.isRead, false)];
  if (!includeDemo) conditions.push(eq(alerts.isDemo, false));
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(alerts)
    .where(and(...conditions))
    .get();
  return result?.count ?? 0;
}

export function markAlertRead(alertId: string) {
  db.update(alerts)
    .set({ isRead: true })
    .where(eq(alerts.id, alertId))
    .run();
}

// ─── Stats ──────────────────────────────────────────────────────────

export function getDashboardStats(includeDemo = false) {
  const demoFilter = includeDemo ? undefined : eq(items.isDemo, false);

  const totalItems = db
    .select({ count: sql<number>`count(*)` })
    .from(items)
    .where(demoFilter)
    .get()?.count ?? 0;

  const todayItems = db
    .select({ count: sql<number>`count(*)` })
    .from(items)
    .where(includeDemo
      ? sql`COALESCE(${items.publishedAt}, ${items.discoveredAt}) >= datetime('now', '-24 hours')`
      : and(eq(items.isDemo, false), sql`COALESCE(${items.publishedAt}, ${items.discoveredAt}) >= datetime('now', '-24 hours')`)
    )
    .get()?.count ?? 0;

  const last3dItems = db
    .select({ count: sql<number>`count(*)` })
    .from(items)
    .where(includeDemo
      ? sql`COALESCE(${items.publishedAt}, ${items.discoveredAt}) >= datetime('now', '-72 hours')`
      : and(eq(items.isDemo, false), sql`COALESCE(${items.publishedAt}, ${items.discoveredAt}) >= datetime('now', '-72 hours')`)
    )
    .get()?.count ?? 0;

  const activeSignalCount = db
    .select({ count: sql<number>`count(*)` })
    .from(signals)
    .where(includeDemo
      ? eq(signals.isActive, true)
      : and(eq(signals.isActive, true), eq(signals.isDemo, false))
    )
    .get()?.count ?? 0;

  const unreadAlerts = getUnreadAlertCount(includeDemo);

  const categoryCounts = db
    .select({
      category: items.category,
      count: sql<number>`count(*)`,
    })
    .from(items)
    .where(demoFilter)
    .groupBy(items.category)
    .all();

  const demoItemCount = db
    .select({ count: sql<number>`count(*)` })
    .from(items)
    .where(eq(items.isDemo, true))
    .get()?.count ?? 0;

  return {
    totalItems,
    todayItems,
    last3dItems,
    activeSignalCount,
    unreadAlerts,
    categoryCounts,
    demoItemCount,
  };
}

// ─── Source Health ───────────────────────────────────────────────────

export function getSourceHealth() {
  const sources_list = db.select().from(sourcesTable).all();
  return sources_list.map((source) => {
    const itemCount = db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(eq(items.source, source.id))
      .get()?.count ?? 0;

    const liveItemCount = db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(and(eq(items.source, source.id), eq(items.isDemo, false)))
      .get()?.count ?? 0;

    const recentItemCount = db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(and(
        eq(items.source, source.id),
        eq(items.isDemo, false),
        sql`COALESCE(${items.publishedAt}, ${items.discoveredAt}) >= datetime('now', '-72 hours')`
      ))
      .get()?.count ?? 0;

    const avgFreshnessResult = db
      .select({ avg: sql<number>`AVG(${items.freshnessScore})` })
      .from(items)
      .where(and(eq(items.source, source.id), eq(items.isDemo, false)))
      .get();

    const oldestLiveItem = db
      .select({ publishedAt: items.publishedAt })
      .from(items)
      .where(and(eq(items.source, source.id), eq(items.isDemo, false)))
      .orderBy(items.publishedAt)
      .limit(1)
      .get();

    const newestLiveItem = db
      .select({ publishedAt: items.publishedAt })
      .from(items)
      .where(and(eq(items.source, source.id), eq(items.isDemo, false)))
      .orderBy(desc(items.publishedAt))
      .limit(1)
      .get();

    // Get recent fetch logs
    const recentLogs = db
      .select()
      .from(sourceFetchLog)
      .where(eq(sourceFetchLog.sourceId, source.id))
      .orderBy(desc(sourceFetchLog.fetchedAt))
      .limit(5)
      .all();

    return {
      ...source,
      itemCount,
      liveItemCount,
      recentItemCount,
      avgFreshness: avgFreshnessResult?.avg ?? null,
      oldestItem: oldestLiveItem?.publishedAt ?? null,
      newestItem: newestLiveItem?.publishedAt ?? null,
      recentLogs,
    };
  });
}

// ─── Admin Items View ───────────────────────────────────────────────

export function getItemsForAdmin(limit = 50) {
  return db
    .select()
    .from(items)
    .orderBy(desc(items.discoveredAt))
    .limit(limit)
    .all();
}

// ─── User Preferences ──────────────────────────────────────────────

export function getUserPreferences() {
  return db.select().from(userPreferences).where(eq(userPreferences.id, "default")).get();
}

export function updateUserPreferences(prefs: Partial<schema.UserPreferences>) {
  db.update(userPreferences)
    .set({ ...prefs, updatedAt: new Date().toISOString() })
    .where(eq(userPreferences.id, "default"))
    .run();
}

// ─── Search ─────────────────────────────────────────────────────────

export function searchItems(query: string, filters?: { category?: string; company?: string; limit?: number }) {
  return getItems({
    search: query,
    category: filters?.category as Category,
    company: filters?.company,
    limit: filters?.limit ?? 30,
    timeWindow: "all", // Search always searches all time
  });
}

// ─── Companies ──────────────────────────────────────────────────────

export function getCompanies() {
  return db
    .select({
      company: items.company,
      count: sql<number>`count(*)`,
    })
    .from(items)
    .where(sql`${items.company} IS NOT NULL`)
    .groupBy(items.company)
    .orderBy(sql`count(*) DESC`)
    .limit(30)
    .all();
}

// ─── Ingestion Stats (for admin) ────────────────────────────────────

export function getIngestionStats() {
  const sourceStats = db
    .select({
      source: items.source,
      total: sql<number>`count(*)`,
      withDates: sql<number>`SUM(CASE WHEN ${items.publishedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
      withExactDates: sql<number>`SUM(CASE WHEN ${items.dateConfidence} = 'exact' THEN 1 ELSE 0 END)`,
      avgComposite: sql<number>`AVG(${items.compositeScore})`,
      avgFreshness: sql<number>`AVG(${items.freshnessScore})`,
      primary: sql<number>`SUM(CASE WHEN ${items.isPrimarySource} = 1 THEN 1 ELSE 0 END)`,
      duplicates: sql<number>`SUM(CASE WHEN ${items.duplicateOf} IS NOT NULL THEN 1 ELSE 0 END)`,
    })
    .from(items)
    .where(eq(items.isDemo, false))
    .groupBy(items.source)
    .all();

  const dateConfidenceBreakdown = db
    .select({
      confidence: items.dateConfidence,
      count: sql<number>`count(*)`,
    })
    .from(items)
    .where(eq(items.isDemo, false))
    .groupBy(items.dateConfidence)
    .all();

  return { sourceStats, dateConfidenceBreakdown };
}
