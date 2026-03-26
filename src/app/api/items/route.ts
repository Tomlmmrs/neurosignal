import { NextRequest, NextResponse } from "next/server";
import { getItems, toggleBookmark, markAsRead } from "@/lib/db/queries";
import type { RankMode, Category, TimeWindow } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const opts = {
    mode: (params.get("mode") || "latest") as RankMode,
    category: params.get("category") as Category | undefined,
    company: params.get("company") || undefined,
    isOpenSource: params.get("opensource") === "true" ? true : undefined,
    search: params.get("q") || undefined,
    minImportance: params.get("minImportance")
      ? Number(params.get("minImportance"))
      : undefined,
    limit: params.get("limit") ? Number(params.get("limit")) : 50,
    offset: params.get("offset") ? Number(params.get("offset")) : 0,
    bookmarkedOnly: params.get("bookmarked") === "true",
    timeWindow: (params.get("t") || "3d") as TimeWindow,
  };

  try {
    const results = getItems(opts);
    return NextResponse.json({ items: results, count: results.length });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (action === "bookmark") {
      const result = toggleBookmark(id);
      return NextResponse.json(result);
    }
    if (action === "read") {
      markAsRead(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
