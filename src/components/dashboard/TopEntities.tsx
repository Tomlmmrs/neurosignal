import Link from "next/link";
import { Building2 } from "lucide-react";

interface TopEntity {
  company: string;
  count: number;
  avgScore: number;
}

export default function TopEntities({ entities }: { entities: TopEntity[] }) {
  if (entities.length === 0) return null;

  const max = entities[0].count;

  return (
    <section className="overflow-hidden rounded-2xl border border-border-subtle bg-card/75">
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <Building2 className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-foreground">Most Active</h2>
        <span className="ml-auto text-[11px] text-muted">Last 3 days</span>
      </div>

      <ul className="divide-y divide-border-subtle">
        {entities.map((entity) => (
          <li key={entity.company}>
            <Link
              href={`/?company=${encodeURIComponent(entity.company)}`}
              className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-card-hover"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                  {entity.company}
                </p>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent/50 transition-all group-hover:bg-accent/70"
                    style={{ width: `${Math.round((entity.count / max) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                {entity.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
