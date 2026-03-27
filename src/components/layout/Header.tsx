"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Brain, Loader2, Menu, PanelLeft, Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getActiveNavigationState } from "./navigation";
import { usePrefetchedNavigation } from "./usePrefetchedNavigation";

interface HeaderProps {
  mobileNavOpen?: boolean;
  onToggleMobileNav?: () => void;
  desktopNavVisible?: boolean;
  onToggleDesktopNav?: () => void;
}

export default function Header({
  mobileNavOpen = false,
  onToggleMobileNav,
  desktopNavVisible = true,
  onToggleDesktopNav,
}: HeaderProps) {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const { isPending, navigate, prefetch } = usePrefetchedNavigation();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const { activeItem } = getActiveNavigationState(searchParams);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchKey, searchParams]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = query.trim();

    if (nextQuery) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }

    const href = `/?${params.toString()}`;
    prefetch(href);
    navigate(href);
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleMobileNav}
            className="rounded-xl p-2 text-foreground transition-colors hover:bg-card-hover lg:hidden"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={onToggleDesktopNav}
            className={cn(
              "hidden rounded-xl p-2 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground lg:flex",
              desktopNavVisible && "bg-card text-foreground"
            )}
            aria-label={desktopNavVisible ? "Hide sidebar" : "Show sidebar"}
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-card shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <Brain className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.12em] text-foreground">
                NeuroSignal
              </p>
              <p className="truncate text-[11px] text-muted-foreground md:hidden">
                {activeItem.label}
              </p>
              <p className="hidden text-[11px] text-muted-foreground md:block">
                What changed, and why it matters
              </p>
            </div>
          </Link>
        </div>

        <form onSubmit={submitSearch} className="hidden min-w-0 flex-1 justify-center sm:flex">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              name="q"
              placeholder="Search AI developments, companies, products, and research"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-2xl border border-border bg-card/90 pl-10 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
            />
            {isPending && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </form>

        <button
          type="button"
          onClick={() => setSearchOpen((current) => !current)}
          className={cn(
            "rounded-xl p-2 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground sm:hidden",
            searchOpen && "bg-card text-foreground"
          )}
          aria-label={searchOpen ? "Close search" : "Open search"}
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {searchOpen && (
        <div className="border-t border-border px-3 pb-3 sm:hidden">
          <form onSubmit={submitSearch} className="pt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                name="q"
                placeholder="Search AI developments"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
                className="h-11 w-full rounded-2xl border border-border bg-card/90 pl-10 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
              />
              {isPending && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
