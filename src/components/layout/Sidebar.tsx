"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Brain, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getActiveNavigationState, navSections, type NavItem } from "./navigation";
import { usePrefetchedNavigation } from "./usePrefetchedNavigation";

function NavSection({
  title,
  items,
  activeKey,
  activeParam,
  isPending,
  onSelect,
  onPrefetch,
}: {
  title: string;
  items: NavItem[];
  activeKey: string | null;
  activeParam: string;
  isPending: boolean;
  onSelect: (item: NavItem) => void;
  onPrefetch: (item: NavItem) => void;
}) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">
        {title}
      </h3>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = activeParam === item.param && activeKey === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item)}
              onMouseEnter={() => onPrefetch(item)}
              onFocus={() => onPrefetch(item)}
              onTouchStart={() => onPrefetch(item)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors lg:gap-2.5 lg:px-3 lg:py-2",
                isActive
                  ? "bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(59,130,246,0.22)]"
                  : "text-muted-foreground hover:bg-card-hover hover:text-foreground"
              )}
              aria-busy={isPending && isActive}
            >
              <Icon className="h-4 w-4 shrink-0 lg:h-3.5 lg:w-3.5" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {isPending && isActive ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent/80" />
              ) : (
                isActive && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-accent/80" />
              )}
            </button>
          );
        })}
      </nav>
    </section>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  desktopVisible: boolean;
}

export default function Sidebar({ open, onClose, desktopVisible }: SidebarProps) {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const { isPending, navigate, prefetch } = usePrefetchedNavigation();
  const currentState = getActiveNavigationState(searchParams);
  const [pendingItem, setPendingItem] = useState<NavItem | null>(null);
  const activeItem = pendingItem ?? currentState.activeItem;
  const activeKey = pendingItem?.key ?? currentState.activeKey;
  const activeParam = pendingItem?.param ?? currentState.activeParam;

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    setPendingItem(null);
  }, [searchKey]);

  const getHref = (item: NavItem) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("feature");
    params.delete("category");
    params.delete("view");
    params.set(item.param, item.key);
    return `/?${params.toString()}`;
  };

  const handleSelect = (item: NavItem) => {
    const href = getHref(item);
    setPendingItem(item);
    prefetch(href);
    navigate(href);
    onClose();
  };

  const navContent = (
    <div className="space-y-6">
      {navSections.map((section) => (
        <NavSection
          key={section.title}
          title={section.title}
          items={section.items}
          activeKey={activeKey}
          activeParam={activeParam}
          isPending={isPending}
          onSelect={handleSelect}
          onPrefetch={(item) => prefetch(getHref(item))}
        />
      ))}
    </div>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[21rem] flex-col border-r border-border bg-background shadow-2xl shadow-black/35 transition-transform duration-200 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/" onClick={onClose} className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-card">
              <Brain className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.08em] text-foreground">
                NeuroSignal
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{activeItem.label}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5">{navContent}</div>
      </aside>

      <aside
        className={cn(
          "hidden shrink-0 border-r border-border/80 bg-background/95 transition-[width,opacity] duration-200 lg:block",
          desktopVisible ? "lg:w-72 xl:w-80 opacity-100" : "w-0 border-r-0 opacity-0 overflow-hidden"
        )}
        aria-hidden={!desktopVisible}
      >
        <div className="sticky top-16 h-[calc(100dvh-4rem)] overflow-y-auto px-5 py-6">
          {navContent}
        </div>
      </aside>
    </>
  );
}
