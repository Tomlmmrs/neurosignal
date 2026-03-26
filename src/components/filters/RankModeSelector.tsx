"use client";

import { useRouter, useSearchParams } from "next/navigation";

const modes = [
  { key: "latest", label: "Latest" },
  { key: "important", label: "Most Important" },
  { key: "novel", label: "Most Novel" },
  { key: "impactful", label: "Most Impactful" },
  { key: "underrated", label: "Underrated" },
  { key: "opensource", label: "Open Source" },
  { key: "research", label: "Research" },
] as const;

export default function RankModeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeMode = searchParams.get("view") ?? "latest"; // Default to latest, not important

  const handleSelect = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", key);
    params.delete("feature");
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5 scrollbar-none">
      {modes.map((mode) => {
        const isActive = activeMode === mode.key;
        return (
          <button
            key={mode.key}
            onClick={() => handleSelect(mode.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              isActive
                ? "bg-accent/15 text-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
