import type { SourceAdapter, RawItem } from "../types";
import type { DateConfidence } from "../../types";

interface HFPaper {
  id: string;
  title: string;
  summary?: string;
  publishedAt?: string;
  paper?: {
    id: string;
    title: string;
    summary?: string;
    publishedAt?: string;
  };
}

export class HuggingFacePapersAdapter implements SourceAdapter {
  id = "hf_papers";
  name = "Hugging Face Daily Papers";
  type = "api";

  async fetch(): Promise<RawItem[]> {
    console.log("[hf-papers] Fetching daily papers from Hugging Face API...");

    try {
      const response = await globalThis.fetch(
        "https://huggingface.co/api/daily_papers",
        {
          headers: {
            "User-Agent": "NeuroSignal-Bot/1.0",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const papers = (await response.json()) as HFPaper[];
      const items: RawItem[] = [];

      for (const entry of papers) {
        const paper = entry.paper || entry;
        if (!paper.title) continue;

        const paperId = paper.id || entry.id;
        const url = paperId
          ? `https://huggingface.co/papers/${paperId}`
          : null;

        if (!url) continue;

        const publishedAt = paper.publishedAt || entry.publishedAt || undefined;

        // HF daily papers are curated daily — high confidence they are recent
        let dateConfidence: DateConfidence = "unknown";
        if (publishedAt) {
          dateConfidence = /T\d{2}:\d{2}/.test(publishedAt) ? "exact" : "day";
        } else {
          // Daily papers endpoint = published today
          dateConfidence = "day";
        }

        const abstract = paper.summary
          ? "Abstract: " + paper.summary.replace(/^abstract[:\s]*/i, "").trim()
          : undefined;

        items.push({
          title: paper.title,
          url,
          content: abstract,
          publishedAt: publishedAt || new Date().toISOString().split("T")[0],
          dateConfidence,
        });
      }

      console.log(`[hf-papers] Fetched ${items.length} papers`);
      return items;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[hf-papers] Failed to fetch: ${message}`);
      throw new Error(`HF Papers fetch failed: ${message}`);
    }
  }
}
