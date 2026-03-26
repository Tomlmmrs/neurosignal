# AI Intelligence

<img width="1536" height="1024" alt="ChatGPT Image Mar 26, 2026, 10_22_34 AM" src="https://github.com/user-attachments/assets/04de6507-33da-45e9-9f69-343c244a6719" />

An intelligence dashboard for staying ahead of the curve on AI developments. Aggregates, scores, clusters, and ranks AI news, model releases, research, tools, and signals — optimized for daily power-user scanning.

## Quick Start

```bash
npm install
npm run db:seed    # Initialize database with demo data
npm run dev        # Start development server at http://localhost:3000
```

## Architecture

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── page.tsx            # Main dashboard
│   ├── (dashboard)/item/   # Item detail pages
│   └── api/                # REST API endpoints
├── components/
│   ├── layout/             # Header, Sidebar
│   ├── dashboard/          # StatsBar, SignalsPanel, TrendingPanel, TopEntities
│   ├── items/              # ItemCard, ItemList
│   └── filters/            # RankModeSelector, CategoryFilter
└── lib/
    ├── db/                 # Schema, queries, init, seed
    ├── ingestion/          # Pipeline, source adapters
    ├── ranking/            # Scoring and ranking engine
    └── utils/              # Formatting, cn()
```

### Tech Stack

- **Next.js 16** (App Router, Turbopack) — full-stack TypeScript
- **SQLite + Drizzle ORM** — zero-config embedded database
- **Tailwind CSS** — dark-mode-first design system
- **lucide-react** — icon library

### Data Model

| Table | Purpose |
|-------|---------|
| `items` | Core intelligence items with scores, metadata, clustering |
| `clusters` | Groups related items covering the same story |
| `sources` | Registry of data sources with credibility ratings |
| `entities` | Companies, labs, models, tools being tracked |
| `signals` | Emerging patterns and early signals |
| `alerts` | Notifications for important events |
| `user_preferences` | Personalization settings |

### Scoring System

Each item is scored 0-100 on five dimensions:
- **Importance** — how significant is this development
- **Novelty** — how new/unexpected is this
- **Credibility** — how reliable is the source
- **Impact** — likely long-term consequences
- **Practical** — immediate usefulness to practitioners

A weighted **composite score** combines these for default ranking.

### Ranking Modes

| Mode | Strategy |
|------|----------|
| Latest | Chronological, slight importance boost |
| Most Important | Composite score weighted |
| Most Novel | Novelty-first |
| Most Impactful | Long-term impact weighted |
| Underrated Signals | High novelty, low coverage |
| Open Source Momentum | Open source items by composite |
| Research to Watch | Research items by novelty + importance |

### Ingestion Pipeline

```
Fetch → Parse → Normalize → Deduplicate → Score → Store
```

Source adapters implement a common interface:
```typescript
interface SourceAdapter {
  id: string;
  name: string;
  type: string;
  fetch(): Promise<RawItem[]>;
}
```

Built-in adapters: RSS/Atom, GitHub trending. Easy to extend.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/items` | GET | Fetch items with filtering/sorting |
| `/api/items` | PATCH | Bookmark/mark as read |
| `/api/search` | GET | Full-text search |
| `/api/alerts` | GET | Fetch alerts |
| `/api/topics` | GET | Dashboard stats, signals, trending |
| `/api/ingest` | POST | Trigger ingestion pipeline |

## Configuration

Copy `.env.local` and configure:

```bash
DEMO_MODE=true              # Use seed data
# ANTHROPIC_API_KEY=        # For AI summaries
# GITHUB_TOKEN=             # For GitHub API
# NEWSAPI_KEY=              # For news ingestion
```

## Roadmap

- [ ] LLM-powered "so what?" analysis for each item
- [ ] Entity pages (company/model/tool profiles)
- [ ] Weekly intelligence digest generator
- [ ] Timeline view for story evolution
- [ ] Prediction board for trend forecasting
- [ ] Email/webhook alerts
- [ ] Comparison pages (model releases, open-source movers)
- [ ] User interest personalization engine
- [ ] Real-time ingestion with background workers
- [ ] Export and sharing features
