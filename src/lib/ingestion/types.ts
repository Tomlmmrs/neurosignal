import type { DateConfidence } from "../types";

export interface RawItem {
  title: string;
  url: string;
  content?: string;
  publishedAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  author?: string;
  dateConfidence?: DateConfidence;
  metadata?: Record<string, unknown>;
}

export interface SourceAdapter {
  id: string;
  name: string;
  type: string;
  fetch(): Promise<RawItem[]>;
}

export interface PipelineResult {
  source: string;
  fetched: number;
  new: number;
  updated: number;
  skipped: number;
  duplicates: number;
  errors: string[];
  durationMs: number;
}
