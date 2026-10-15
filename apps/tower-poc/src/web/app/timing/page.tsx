import type { Metadata } from "next";
import { TimingTest } from "@/components/timing/TimingTest";
import { PAGES } from "@/lib/pages";

export const metadata: Metadata = { title: PAGES.timing.title };

export default function TimingPage() {
  return <TimingTest />;
}
