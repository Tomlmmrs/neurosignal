import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// ─── Intelligence Items ─────────────────────────────────────────────
export const items = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    url: text("url").notNull().unique(),
    canonicalUrl: text("canonical_url"), // resolved canonical URL if different from url
    source: text("source").notNull(),
    sourceType: text("source_type").notNull(),

    // Timestamps — distinct meanings, never conflated
    publishedAt: text("published_at"),       // when the content was published (from source)
    discoveredAt: text("discovered_at").notNull(), // when our pipeline first saw it
    firstSeenAt: text("first_seen_at").notNull(),  // earliest time we know about this item
    updatedAt: text("updated_at"),           // when the source content was last updated
    eventDate: text("event_date"),           // when the underlying event happened (if different)

    // Date quality
    dateConfidence: text("date_confidence").default("unknown"), // exact, day, estimated, unknown

    // Classification
    category: text("category").notNull(),
    company: text("company"),
    isOpenSource: integer("is_open_source", { mode: "boolean" }).default(false),
    modelFamily: text("model_family"),

    // Content
    summary: text("summary"),
    aiSummary: text("ai_summary"),
    whyItMatters: text("why_it_matters"),
    whoShouldCare: text("who_should_care"),
    implications: text("implications"),
    content: text("content"),
    imageUrl: text("image_url"),

    // Scoring (0-100)
    importanceScore: real("importance_score").default(50),
    noveltyScore: real("novelty_score").default(50),
    credibilityScore: real("credibility_score").default(50),
    impactScore: real("impact_score").default(50),
    practicalScore: real("practical_score").default(50),
    compositeScore: real("composite_score").default(50),
    freshnessScore: real("freshness_score").default(50),

    // Metadata
    entities: text("entities"), // JSON array
    tags: text("tags"), // JSON array

    // Clustering & source quality
    clusterId: text("cluster_id"),
    isOriginalSource: integer("is_original_source", { mode: "boolean" }).default(false),
    isPrimarySource: integer("is_primary_source", { mode: "boolean" }).default(false),
    duplicateOf: text("duplicate_of"), // item ID this is a duplicate of

    // Validation
    lastValidatedAt: text("last_validated_at"),
    httpStatus: integer("http_status"),
    ingestionStatus: text("ingestion_status").default("ok"),

    // Demo flag
    isDemo: integer("is_demo", { mode: "boolean" }).default(false),

    // Status
    isBookmarked: integer("is_bookmarked", { mode: "boolean" }).default(false),
    isRead: integer("is_read", { mode: "boolean" }).default(false),
    isArchived: integer("is_archived", { mode: "boolean" }).default(false),
  },
  (table) => [
    index("idx_items_published").on(table.publishedAt),
    index("idx_items_discovered").on(table.discoveredAt),
    index("idx_items_first_seen").on(table.firstSeenAt),
    index("idx_items_composite").on(table.compositeScore),
    index("idx_items_freshness").on(table.freshnessScore),
    index("idx_items_category").on(table.category),
    index("idx_items_source").on(table.source),
    index("idx_items_cluster").on(table.clusterId),
    index("idx_items_company").on(table.company),
    index("idx_items_bookmarked").on(table.isBookmarked),
    index("idx_items_demo").on(table.isDemo),
    index("idx_items_date_confidence").on(table.dateConfidence),
    index("idx_items_duplicate").on(table.duplicateOf),
  ]
);

// ─── Clusters ────────────────────────────────────────────────────────
export const clusters = sqliteTable("clusters", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  category: text("category").notNull(),
  firstSeen: text("first_seen").notNull(),
  lastUpdated: text("last_updated").notNull(),
  itemCount: integer("item_count").default(1),
  peakScore: real("peak_score").default(50),
  trendVelocity: real("trend_velocity").default(0),
  leadItemId: text("lead_item_id"), // the best/primary item in the cluster
  entities: text("entities"),
  tags: text("tags"),
  isDemo: integer("is_demo", { mode: "boolean" }).default(false),
});

// ─── Sources ─────────────────────────────────────────────────────────
export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  category: text("category").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  credibilityBase: real("credibility_base").default(70),
  trustTier: text("trust_tier").default("reputable"), // official, authoritative, reputable, aggregator, unverified
  sourcePriority: integer("source_priority").default(50),
  fetchIntervalMinutes: integer("fetch_interval_minutes").default(60),

  // Health tracking
  lastFetched: text("last_fetched"),
  lastSuccessAt: text("last_success_at"),
  lastError: text("last_error"),
  lastErrorAt: text("last_error_at"),
  consecutiveFailures: integer("consecutive_failures").default(0),
  totalFetches: integer("total_fetches").default(0),
  totalErrors: integer("total_errors").default(0),
  avgFetchDurationMs: integer("avg_fetch_duration_ms"),
  lastItemCount: integer("last_item_count").default(0),
  avgFreshness: real("avg_freshness"), // average freshness of items from this source

  config: text("config"), // JSON: source-specific config
});

// ─── Source Fetch Log ────────────────────────────────────────────────
export const sourceFetchLog = sqliteTable(
  "source_fetch_log",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    fetchedAt: text("fetched_at").notNull(),
    durationMs: integer("duration_ms"),
    itemsFetched: integer("items_fetched").default(0),
    itemsNew: integer("items_new").default(0),
    itemsSkipped: integer("items_skipped").default(0),
    status: text("status").notNull(), // ok, error, partial
    errorMessage: text("error_message"),
    httpStatus: integer("http_status"),
  },
  (table) => [
    index("idx_fetch_log_source").on(table.sourceId),
    index("idx_fetch_log_date").on(table.fetchedAt),
  ]
);

// ─── Entities ────────────────────────────────────────────────────────
export const entities = sqliteTable(
  "entities",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    description: text("description"),
    url: text("url"),
    logoUrl: text("logo_url"),
    aliases: text("aliases"),
    metadata: text("metadata"),
    mentionCount: integer("mention_count").default(0),
    lastMentioned: text("last_mentioned"),
  },
  (table) => [
    index("idx_entities_type").on(table.type),
    index("idx_entities_mentions").on(table.mentionCount),
  ]
);

// ─── Signals ─────────────────────────────────────────────────────────
export const signals = sqliteTable("signals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  signalType: text("signal_type").notNull(),
  strength: real("strength").default(0),
  firstDetected: text("first_detected").notNull(),
  lastUpdated: text("last_updated").notNull(),
  relatedItemIds: text("related_item_ids"),
  relatedEntities: text("related_entities"),
  tags: text("tags"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  isDemo: integer("is_demo", { mode: "boolean" }).default(false),
});

// ─── User Preferences ───────────────────────────────────────────────
export const userPreferences = sqliteTable("user_preferences", {
  id: text("id").primaryKey().default("default"),
  interests: text("interests"),
  importanceThreshold: real("importance_threshold").default(30),
  enabledCategories: text("enabled_categories"),
  alertSettings: text("alert_settings"),
  defaultTimeWindow: text("default_time_window").default("3d"),
  updatedAt: text("updated_at"),
});

// ─── Bookmarks ──────────────────────────────────────────────────────
export const bookmarks = sqliteTable(
  "bookmarks",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull().references(() => items.id),
    note: text("note"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_bookmarks_item").on(table.itemId)]
);

// ─── Alerts ─────────────────────────────────────────────────────────
export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  itemId: text("item_id").references(() => items.id),
  severity: text("severity").notNull().default("medium"),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull(),
  isDemo: integer("is_demo", { mode: "boolean" }).default(false),
});

// ─── Types ──────────────────────────────────────────────────────────
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Cluster = typeof clusters.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type Entity = typeof entities.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type SourceFetchLogEntry = typeof sourceFetchLog.$inferSelect;
