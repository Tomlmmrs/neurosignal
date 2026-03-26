import { Database, CalendarPlus, Clock3, Radio, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Stats {
  totalItems: number;
  todayItems: number;
  last3dItems?: number;
  activeSignalCount: number;
  unreadAlerts: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2 bg-card border border-border-subtle rounded-lg">
      <Icon className={`h-4 w-4 ${color}`} />
      <div>
        <p className="text-lg font-semibold leading-none text-foreground">
          {value.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatCard
        label="Total tracked"
        value={stats.totalItems}
        icon={Database}
        color="text-accent"
      />
      <StatCard
        label="Last 24h"
        value={stats.todayItems}
        icon={CalendarPlus}
        color="text-success"
      />
      <StatCard
        label="Last 3 days"
        value={stats.last3dItems ?? 0}
        icon={Clock3}
        color="text-blue-400"
      />
      <StatCard
        label="Active signals"
        value={stats.activeSignalCount}
        icon={Radio}
        color="text-warning"
      />
      <StatCard
        label="Unread alerts"
        value={stats.unreadAlerts}
        icon={Bell}
        color="text-danger"
      />
    </div>
  );
}
