import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PAGES } from "@/lib/pages";

export const metadata: Metadata = { title: PAGES.lights.title };

export default function LightsPage() {
  return <PageShell page={PAGES.lights} />;
}
