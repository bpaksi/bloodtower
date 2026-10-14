"use client";

import { useService } from "@/lib/store";

/** Says plainly when the service drives its mock tower, so no one takes a result for the real one. */
export function MockBanner() {
  const mock = useService((view) => view.welcome?.tower === "mock");
  if (!mock) return null;
  return (
    <p className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-950 dark:bg-amber-900 dark:text-amber-50">
      Mock tower: commands go to a simulation, not the real tower.
    </p>
  );
}
