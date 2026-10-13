import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PAGES } from "@/lib/pages";

export const metadata: Metadata = { title: PAGES.state.title };

export default function TowerStatePage() {
  return <PageShell page={PAGES.state} />;
}
