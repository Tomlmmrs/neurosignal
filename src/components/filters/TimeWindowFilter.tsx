"use client";

import { useRouter, useSearchParams } from "next/navigation";

const windows = [
  { key: "24h", label: "24h" },
  { key: "3d", label: "3 days" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
] as const;

export default function TimeWindowFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeWindow = searchParams.get("t") ?? "3d";

  const handleSelect = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "3d") {
      params.delete("t"); // default, don't clutter URL
    } else {
      params.set("t", key);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground mr-1">Time:</span>
      {windows.map((w) => {
        const isActive = activeWindow === w.key || (!searchParams.has("t") && w.key === "3d");
        return (
          <button
            key={w.key}
            onClick={() => handleSelect(w.key)}
            className={`px-2 py-0.5 text-[10px] font-medium rounded whitespace-nowrap transition-colors ${
              isActive
                ? "bg-accent/15 text-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
            }`}
          >
            {w.label}
          </button>
        );
      })}
    </div>
  );
}
