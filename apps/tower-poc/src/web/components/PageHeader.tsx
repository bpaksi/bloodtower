import type { PageInfo } from "@/lib/pages";

export function PageHeader({ page }: { page: PageInfo }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{page.title}</h1>
      <p className="text-muted-foreground">{page.summary}</p>
    </div>
  );
}
