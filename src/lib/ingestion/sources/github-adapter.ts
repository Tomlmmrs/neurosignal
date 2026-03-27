import type { SourceAdapter, RawItem } from "../types";
import type { DateConfidence } from "../../types";

const AI_KEYWORDS = [
  "ai", "artificial-intelligence", "machine-learning", "deep-learning",
  "llm", "large-language-model", "gpt", "transformer", "neural-network",
  "nlp", "natural-language-processing", "computer-vision", "diffusion",
  "reinforcement-learning", "rag", "embeddings", "fine-tuning",
  "langchain", "llamaindex", "autogen", "crewai", "agents", "multimodal",
  "stable-diffusion", "huggingface", "pytorch", "tensorflow", "jax",
];

const AI_LANGUAGES = ["python", "jupyter notebook"];

export class GitHubAdapter implements SourceAdapter {
  id: string;
  name: string;
  type: string;

  constructor(config?: { id?: string; name?: string }) {
    this.id = config?.id ?? "github_trending";
    this.name = config?.name ?? "GitHub Trending AI";
    this.type = "github";
  }

  async fetch(): Promise<RawItem[]> {
    const token = process.env.GITHUB_TOKEN;
    return this.fetchFromApi(token);
  }

  private async fetchFromApi(token?: string): Promise<RawItem[]> {
    console.log(`[github-adapter] Fetching AI/ML trending repos from GitHub API... (auth: ${!!token})`);

    const items: RawItem[] = [];

    // Only look at repos created or with significant pushes in last 3 days
    const since = new Date();
    since.setDate(since.getDate() - 3);
    const dateStr = since.toISOString().split("T")[0];

    const queries = [
      `topic:artificial-intelligence+stars:>100+created:>${dateStr}`,
      `topic:llm+stars:>20+created:>${dateStr}`,
      `topic:machine-learning+stars:>50+created:>${dateStr}`,
      // Also look for recently pushed popular repos, but we'll handle dates differently
      `topic:llm+stars:>500+pushed:>${dateStr}`,
    ];

    for (const q of queries) {
      try {
        const response = await globalThis.fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=10`,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "NeuroSignal-Bot/1.0",
            },
            signal: AbortSignal.timeout(15000),
          }
        );

        if (!response.ok) {
          console.error(`[github-adapter] GitHub API returned ${response.status}`);
          continue;
        }

        const data = (await response.json()) as GitHubSearchResponse;

        for (const repo of data.items ?? []) {
          if (!this.isAiRelated(repo)) continue;
          if (items.some((i) => i.url === repo.html_url)) continue;

          // Use created_at as the canonical date — NOT updated_at
          // updated_at changes on any push, issue, PR, etc. — it's not a publication date
          const isNewRepo = q.includes("created:");
          const publishDate = isNewRepo ? repo.created_at : repo.pushed_at;
          const dateConfidence: DateConfidence = isNewRepo ? "exact" : "estimated";

          items.push({
            title: `${repo.full_name}: ${repo.description?.slice(0, 100) || "AI repository"}`,
            url: repo.html_url,
            content: this.buildContent(repo),
            publishedAt: publishDate,
            updatedAt: repo.updated_at,
            dateConfidence,
            metadata: {
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              language: repo.language,
              topics: repo.topics,
              openIssues: repo.open_issues_count,
              createdAt: repo.created_at,
              updatedAt: repo.updated_at,
              pushedAt: repo.pushed_at,
            },
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[github-adapter] API query failed: ${message}`);
      }
    }

    // Deduplicate across queries
    const seen = new Set<string>();
    const unique = items.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    console.log(`[github-adapter] Found ${unique.length} AI-related trending repos`);
    return unique;
  }

  private isAiRelated(repo: GitHubRepo): boolean {
    const text = [
      repo.full_name,
      repo.description ?? "",
      repo.language ?? "",
      ...(repo.topics ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return AI_KEYWORDS.some((kw) => text.includes(kw)) ||
      AI_LANGUAGES.some((lang) => (repo.language ?? "").toLowerCase() === lang);
  }

  private buildContent(repo: GitHubRepo): string {
    const parts: string[] = [];
    if (repo.description) parts.push(repo.description);
    parts.push(`Stars: ${repo.stargazers_count.toLocaleString()}`);
    parts.push(`Forks: ${repo.forks_count.toLocaleString()}`);
    if (repo.language) parts.push(`Language: ${repo.language}`);
    if (repo.topics && repo.topics.length > 0) {
      parts.push(`Topics: ${repo.topics.join(", ")}`);
    }
    return parts.join(" | ");
  }
}

interface GitHubSearchResponse {
  total_count: number;
  items: GitHubRepo[];
}

interface GitHubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
}
