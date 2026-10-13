"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_PAGES } from "@/lib/pages";
import { cn } from "@/lib/utils";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Pages" className="overflow-x-auto border-t">
      <ul className="mx-auto flex w-full max-w-6xl gap-1 px-2 py-1.5 sm:px-4">
        {NAV_PAGES.map((page) => {
          const current = pathname === page.href;
          return (
            <li key={page.href} className="shrink-0">
              <Link
                href={page.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  current
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {page.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
