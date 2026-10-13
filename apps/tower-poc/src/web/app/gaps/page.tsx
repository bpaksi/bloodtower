import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PAGES } from "@/lib/pages";

export const metadata: Metadata = { title: PAGES.gaps.title };

export default function FeatureGapsPage() {
  return <PageShell page={PAGES.gaps} />;
}
