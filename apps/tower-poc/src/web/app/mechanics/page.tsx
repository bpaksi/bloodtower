import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PAGES } from "@/lib/pages";

export const metadata: Metadata = { title: PAGES.mechanics.title };

export default function MechanicsPage() {
  return <PageShell page={PAGES.mechanics} />;
}
