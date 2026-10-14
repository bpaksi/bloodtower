import { VerifyToggle } from "@/components/verify/VerifyToggle";
import type { PageInfo } from "@/lib/pages";

/** A page's title and summary. A page with things to verify on the tower also gets the Verify toggle. */
export function PageHeader({ page, verify = false }: { page: PageInfo; verify?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{page.title}</h1>
        <p className="text-muted-foreground">{page.summary}</p>
      </div>
      {verify && <VerifyToggle />}
    </div>
  );
}
