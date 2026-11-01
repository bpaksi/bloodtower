import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { PAGES } from "@/lib/pages";
import { SetupCheck } from "./SetupCheck";

export const metadata: Metadata = { title: PAGES.setupCheck.title };

export default function SetupCheckPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader page={PAGES.setupCheck} />
      <SetupCheck />
    </div>
  );
}
