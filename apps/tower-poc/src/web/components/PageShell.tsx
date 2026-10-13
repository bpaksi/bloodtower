import type { ReactNode } from "react";
import type { PageInfo } from "@/lib/pages";

/** Placeholder body for a page that has no controls yet. */
export function PageShell({ page, children }: { page: PageInfo; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{page.title}</h1>
        <p className="text-muted-foreground">{page.summary}</p>
      </div>
      <section
        aria-labelledby="planned-heading"
        className="rounded-lg border border-dashed p-4 sm:p-6"
      >
        <h2 id="planned-heading" className="text-sm font-medium">
          Not built yet. This page will hold:
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {page.planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      {children}
    </div>
  );
}
