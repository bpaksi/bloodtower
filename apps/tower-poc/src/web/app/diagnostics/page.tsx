import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PAGES } from "@/lib/pages";

export const metadata: Metadata = { title: PAGES.diagnostics.title };

export default function DiagnosticsPage() {
  return <PageShell page={PAGES.diagnostics} />;
}
