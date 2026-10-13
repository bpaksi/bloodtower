import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PAGES } from "@/lib/pages";

export const metadata: Metadata = { title: PAGES.sounds.title };

export default function SoundsPage() {
  return <PageShell page={PAGES.sounds} />;
}
