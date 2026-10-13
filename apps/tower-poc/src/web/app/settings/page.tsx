import type { Metadata } from "next";
import { PROTOCOL_VERSION } from "tower-poc-protocols";
import { PageShell } from "@/components/PageShell";
import { PAGES } from "@/lib/pages";
import packageJson from "@/package.json";

export const metadata: Metadata = { title: PAGES.settings.title };

const VERSIONS = [
  { label: "Web app", value: packageJson.version },
  { label: "Protocol", value: String(PROTOCOL_VERSION) },
] as const;

export default function SettingsPage() {
  return (
    <PageShell page={PAGES.settings}>
      <section aria-labelledby="versions-heading" className="rounded-lg border p-4 sm:p-6">
        <h2 id="versions-heading" className="text-sm font-medium">
          Versions
        </h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          {VERSIONS.map((item) => (
            <div key={item.label} className="contents">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="font-mono">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PageShell>
  );
}
