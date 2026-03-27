import StatsBar from "@/components/dashboard/StatsBar";
import CategoryFilter from "@/components/filters/CategoryFilter";
import RankModeSelector from "@/components/filters/RankModeSelector";
import ResearchDepthFilter from "@/components/filters/ResearchDepthFilter";
import TimeWindowFilter from "@/components/filters/TimeWindowFilter";
import ItemList from "@/components/items/ItemList";
import AppShell from "@/components/layout/AppShell";
import { getDashboardStats, getFeedSections, getItems } from "@/lib/db/queries";
import type { Category, RankMode, TimeWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    mode?: string;
    category?: string;
    company?: string;
    q?: string;
    view?: string;
    t?: string;
    depth?: string;
  }>;
}

function normalizeMode(mode?: string): RankMode {
  if (mode === "important" || mode === "research") return mode;
  return "latest";
}

function FeedSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: any[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="border-b border-border-subtle pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">
          Dashboard
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {items.length}
          </span>
        </div>
      </div>
      <ItemList items={items} showCount={false} />
    </section>
  );
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const mode = normalizeMode(params.view || params.mode);
  const category = params.category as Category | undefined;
  const company = params.company || undefined;
  const search = params.q || undefined;
  const timeWindow = (params.t || "3d") as TimeWindow;
  const paperDepth = params.depth as "general" | "intermediate" | "advanced" | undefined;
  const isFilteredView = !!(category || company || search || mode !== "latest");

  let stats: any;
  let sections: any = null;
  let items: any[] = [];

  try {
    stats = await getDashboardStats();

    if (isFilteredView) {
      items = await getItems({
        mode,
        category,
        company,
        search,
        limit: 40,
        timeWindow,
        paperDepth,
      });
    } else {
      sections = await getFeedSections(timeWindow);
    }
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-lg rounded-xl border border-border bg-card p-6 text-center sm:p-8">
          <h1 className="mb-4 text-2xl font-bold text-foreground">NeuroSignal</h1>
          <p className="mb-6 text-muted">Database not initialized. Run the setup command:</p>
          <code className="block rounded-lg bg-background px-4 py-3 text-sm text-accent">
            npm run db:seed
          </code>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">
              AI Dashboard
            </p>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              New AI developments worth knowing about
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              A simpler, high-signal dashboard focused on recent releases, important product updates,
              major industry moves, and a limited set of research that matters in practice.
            </p>
          </div>

          <StatsBar stats={stats} />

          <section className="rounded-2xl border border-border-subtle bg-card/65 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">
                  Feed Controls
                </p>
                <div className="mt-3">
                  <RankModeSelector />
                </div>
              </div>
              <div className="min-w-0 lg:max-w-[20rem]">
                <TimeWindowFilter />
              </div>
            </div>

            <div className="mt-3 border-t border-border-subtle pt-3">
              <CategoryFilter />
              {mode === "research" && (
                <div className="mt-3">
                  <ResearchDepthFilter />
                </div>
              )}
            </div>

            {search && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-background/80 px-3 py-2.5 text-sm">
                <span className="text-muted">Results for</span>
                <span className="min-w-0 truncate font-medium text-foreground">
                  &quot;{search}&quot;
                </span>
                <span className="shrink-0 text-muted-foreground">{items.length}</span>
              </div>
            )}
          </section>
        </div>

        <div className="mt-6">
          {sections && (
            <div className="space-y-8 sm:space-y-10">
              <FeedSection
                title="Major AI Releases"
                description="Model launches, flagship announcements, and product releases with broad practical impact."
                items={sections.releases}
              />
              <FeedSection
                title="Important Developments"
                description="The biggest moves across labs, companies, infrastructure, policy, and the market."
                items={sections.developments}
              />
              <FeedSection
                title="New Tools & Products"
                description="Useful product launches, APIs, platforms, and tooling updates people can act on."
                items={sections.tools}
              />
              <FeedSection
                title="Important Research"
                description="A smaller set of research items that are relevant to real-world products and decisions."
                items={sections.research}
              />

              {Object.values(sections).every((sectionItems: any) => sectionItems.length === 0) && (
                <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
                  <p className="text-sm text-muted-foreground">
                    No items found in this time window. Try expanding the time range.
                  </p>
                </div>
              )}
            </div>
          )}

          {isFilteredView && (
            <div className="space-y-3">
              <div className="border-b border-border-subtle pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">
                  Filtered Feed
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-foreground sm:text-lg">
                      {search
                        ? "Search Results"
                        : mode === "important"
                          ? "Most Important"
                          : mode === "research"
                            ? "Research to Watch"
                            : "Briefing"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A simplified feed view based on the current lens and filters.
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </div>
              </div>

              {items.length === 0 && !search ? (
                <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
                  <p className="text-sm text-muted-foreground">
                    No items found. Try adjusting the time window or category filters.
                  </p>
                </div>
              ) : (
                <ItemList items={items} showCount={false} />
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
