import { db } from "./index";
import { sql } from "drizzle-orm";

export function initDatabase() {
  // ─── Items table ──────────────────────────────────────────────────
  db.run(sql`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      canonical_url TEXT,
      source TEXT NOT NULL,
      source_type TEXT NOT NULL,

      published_at TEXT,
      discovered_at TEXT NOT NULL,
      first_seen_at TEXT NOT NULL,
      updated_at TEXT,
      event_date TEXT,
      date_confidence TEXT DEFAULT 'unknown',

      category TEXT NOT NULL,
      company TEXT,
      is_open_source INTEGER DEFAULT 0,
      model_family TEXT,

      summary TEXT,
      ai_summary TEXT,
      why_it_matters TEXT,
      who_should_care TEXT,
      implications TEXT,
      content TEXT,
      image_url TEXT,

      importance_score REAL DEFAULT 50,
      novelty_score REAL DEFAULT 50,
      credibility_score REAL DEFAULT 50,
      impact_score REAL DEFAULT 50,
      practical_score REAL DEFAULT 50,
      composite_score REAL DEFAULT 50,
      freshness_score REAL DEFAULT 50,

      entities TEXT,
      tags TEXT,

      cluster_id TEXT,
      is_original_source INTEGER DEFAULT 0,
      is_primary_source INTEGER DEFAULT 0,
      duplicate_of TEXT,

      last_validated_at TEXT,
      http_status INTEGER,
      ingestion_status TEXT DEFAULT 'ok',

      is_demo INTEGER DEFAULT 0,

      is_bookmarked INTEGER DEFAULT 0,
      is_read INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0
    )
  `);

  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_published ON items(published_at)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_discovered ON items(discovered_at)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_first_seen ON items(first_seen_at)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_composite ON items(composite_score)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_freshness ON items(freshness_score)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_source ON items(source)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_cluster ON items(cluster_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_company ON items(company)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_bookmarked ON items(is_bookmarked)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_demo ON items(is_demo)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_date_confidence ON items(date_confidence)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_items_duplicate ON items(duplicate_of)`);

  // ─── Clusters table ───────────────────────────────────────────────
  db.run(sql`
    CREATE TABLE IF NOT EXISTS clusters (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      category TEXT NOT NULL,
      first_seen TEXT NOT NULL,
      last_updated TEXT NOT NULL,
      item_count INTEGER DEFAULT 1,
      peak_score REAL DEFAULT 50,
      trend_velocity REAL DEFAULT 0,
      lead_item_id TEXT,
      entities TEXT,
      tags TEXT,
      is_demo INTEGER DEFAULT 0
    )
  `);

  // ─── Sources table ────────────────────────────────────────────────
  db.run(sql`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      credibility_base REAL DEFAULT 70,
      trust_tier TEXT DEFAULT 'reputable',
      source_priority INTEGER DEFAULT 50,
      fetch_interval_minutes INTEGER DEFAULT 60,

      last_fetched TEXT,
      last_success_at TEXT,
      last_error TEXT,
      last_error_at TEXT,
      consecutive_failures INTEGER DEFAULT 0,
      total_fetches INTEGER DEFAULT 0,
      total_errors INTEGER DEFAULT 0,
      avg_fetch_duration_ms INTEGER,
      last_item_count INTEGER DEFAULT 0,
      avg_freshness REAL,

      config TEXT
    )
  `);

  // ─── Source Fetch Log table ────────────────────────────────────────
  db.run(sql`
    CREATE TABLE IF NOT EXISTS source_fetch_log (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      duration_ms INTEGER,
      items_fetched INTEGER DEFAULT 0,
      items_new INTEGER DEFAULT 0,
      items_skipped INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      error_message TEXT,
      http_status INTEGER
    )
  `);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_fetch_log_source ON source_fetch_log(source_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_fetch_log_date ON source_fetch_log(fetched_at)`);

  // ─── Entities table ───────────────────────────────────────────────
  db.run(sql`
    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      url TEXT,
      logo_url TEXT,
      aliases TEXT,
      metadata TEXT,
      mention_count INTEGER DEFAULT 0,
      last_mentioned TEXT
    )
  `);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_entities_mentions ON entities(mention_count)`);

  // ─── Signals table ────────────────────────────────────────────────
  db.run(sql`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      signal_type TEXT NOT NULL,
      strength REAL DEFAULT 0,
      first_detected TEXT NOT NULL,
      last_updated TEXT NOT NULL,
      related_item_ids TEXT,
      related_entities TEXT,
      tags TEXT,
      is_active INTEGER DEFAULT 1,
      is_demo INTEGER DEFAULT 0
    )
  `);

  // ─── User Preferences table ───────────────────────────────────────
  db.run(sql`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY DEFAULT 'default',
      interests TEXT,
      importance_threshold REAL DEFAULT 30,
      enabled_categories TEXT,
      alert_settings TEXT,
      default_time_window TEXT DEFAULT '3d',
      updated_at TEXT
    )
  `);

  // ─── Bookmarks table ─────────────────────────────────────────────
  db.run(sql`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES items(id),
      note TEXT,
      created_at TEXT NOT NULL
    )
  `);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_bookmarks_item ON bookmarks(item_id)`);

  // ─── Alerts table ────────────────────────────────────────────────
  db.run(sql`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      item_id TEXT REFERENCES items(id),
      severity TEXT NOT NULL DEFAULT 'medium',
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      is_demo INTEGER DEFAULT 0
    )
  `);

  // ─── Default User Preferences ─────────────────────────────────────
  db.run(sql`
    INSERT OR IGNORE INTO user_preferences (id, interests, importance_threshold, enabled_categories, alert_settings, default_time_window, updated_at)
    VALUES (
      'default',
      '["llm","agents","multimodal","open-source","reasoning","code-generation","safety","alignment"]',
      30,
      '["model","tool","research","company","opensource","policy","market"]',
      '{"model_release":true,"benchmark":true,"paper":true,"funding":true,"product":true,"minSeverity":"medium"}',
      '3d',
      ${new Date().toISOString()}
    )
  `);

  // ─── Default Sources ──────────────────────────────────────────────
  // Organized by trust tier: official > authoritative > reputable > aggregator
  const defaultSources = [
    // === OFFICIAL LAB BLOGS (trust_tier: official) ===
    { id: "openai_blog", name: "OpenAI Blog", type: "rss", url: "https://openai.com/blog/rss.xml", category: "company", credibility: 92, interval: 30, priority: 98, tier: "official" },
    { id: "google_ai_blog", name: "Google AI Blog", type: "rss", url: "https://blog.google/technology/ai/rss/", category: "company", credibility: 90, interval: 30, priority: 95, tier: "official" },
    { id: "deepmind_blog", name: "Google DeepMind Blog", type: "rss", url: "https://deepmind.google/blog/rss.xml", category: "company", credibility: 92, interval: 60, priority: 95, tier: "official" },
    { id: "meta_ai_blog", name: "Meta AI Blog", type: "rss", url: "https://ai.meta.com/blog/rss/", category: "company", credibility: 88, interval: 60, priority: 90, tier: "official", enabled: false },
    { id: "microsoft_research", name: "Microsoft Research Blog", type: "rss", url: "https://www.microsoft.com/en-us/research/feed/", category: "company", credibility: 88, interval: 60, priority: 85, tier: "official" },
    { id: "nvidia_blog", name: "NVIDIA AI Blog", type: "rss", url: "https://blogs.nvidia.com/feed/", category: "company", credibility: 85, interval: 60, priority: 80, tier: "official" },

    // === RESEARCH (trust_tier: authoritative) ===
    { id: "arxiv_cs_ai", name: "arXiv CS.AI", type: "rss", url: "https://rss.arxiv.org/rss/cs.AI", category: "research", credibility: 88, interval: 60, priority: 85, tier: "authoritative" },
    { id: "arxiv_cs_cl", name: "arXiv CS.CL (NLP)", type: "rss", url: "https://rss.arxiv.org/rss/cs.CL", category: "research", credibility: 88, interval: 60, priority: 82, tier: "authoritative" },
    { id: "arxiv_cs_lg", name: "arXiv CS.LG (ML)", type: "rss", url: "https://rss.arxiv.org/rss/cs.LG", category: "research", credibility: 88, interval: 60, priority: 82, tier: "authoritative" },
    { id: "hf_papers", name: "Hugging Face Daily Papers", type: "api", url: "https://huggingface.co/api/daily_papers", category: "research", credibility: 84, interval: 60, priority: 82, tier: "authoritative" },

    // === REPUTABLE TECH NEWS (trust_tier: reputable) ===
    { id: "techcrunch_ai", name: "TechCrunch AI", type: "rss", url: "https://techcrunch.com/category/artificial-intelligence/feed/", category: "news", credibility: 78, interval: 30, priority: 72, tier: "reputable" },
    { id: "the_verge_ai", name: "The Verge AI", type: "rss", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", category: "news", credibility: 78, interval: 30, priority: 72, tier: "reputable" },
    { id: "ars_technica", name: "Ars Technica AI", type: "rss", url: "https://feeds.arstechnica.com/arstechnica/technology-lab", category: "news", credibility: 80, interval: 60, priority: 68, tier: "reputable" },
    { id: "mit_tech_review", name: "MIT Technology Review", type: "rss", url: "https://www.technologyreview.com/feed/", category: "news", credibility: 88, interval: 60, priority: 75, tier: "authoritative" },
    { id: "venturebeat_ai", name: "VentureBeat AI", type: "rss", url: "https://venturebeat.com/category/ai/feed/", category: "news", credibility: 75, interval: 30, priority: 68, tier: "reputable" },

    // === OPEN SOURCE SIGNALS (trust_tier: aggregator) ===
    { id: "github_trending", name: "GitHub Trending AI", type: "scraper", url: "https://github.com/trending", category: "opensource", credibility: 75, interval: 120, priority: 65, tier: "aggregator" },

    // === DISABLED — known to be broken or no RSS available ===
    { id: "anthropic_blog", name: "Anthropic News", type: "rss", url: "https://www.anthropic.com/rss.xml", category: "company", credibility: 92, interval: 30, priority: 98, tier: "official", enabled: false },
  ];

  for (const s of defaultSources) {
    db.run(sql`
      INSERT OR IGNORE INTO sources (id, name, type, url, category, enabled, credibility_base, trust_tier, source_priority, fetch_interval_minutes)
      VALUES (
        ${s.id}, ${s.name}, ${s.type}, ${s.url}, ${s.category},
        ${(s as any).enabled === false ? 0 : 1}, ${s.credibility}, ${s.tier}, ${s.priority}, ${s.interval}
      )
    `);
  }

  console.log("Database initialized successfully.");
}

// Allow running standalone
if (typeof require !== "undefined" && require.main === module) {
  initDatabase();
}
