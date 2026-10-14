"use client";

import { FRESHNESS_LABELS, ORIGIN_LABELS, timeLabel } from "@/lib/labels";
import type { ValueView } from "@/lib/towerState";
import { cn } from "@/lib/utils";

/**
 * Where a value came from, how fresh it is and when it was set (spec §5, Tower State), or that it
 * is unavailable and why. Every value on the page carries one.
 */
export function ValueMeta({
  view,
  unavailable = "Unavailable",
}: {
  view: ValueView<unknown>;
  /** What to say when there is no value, for example what is needed to get one. */
  unavailable?: string;
}) {
  if (!view.known) {
    return <p className="text-xs text-muted-foreground">{unavailable}</p>;
  }
  return (
    <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
      <span>{ORIGIN_LABELS[view.origin]}</span>
      <span aria-hidden>·</span>
      <span
        className={cn(
          view.freshness === "stale" && "font-medium text-amber-700 dark:text-amber-400",
        )}
      >
        {FRESHNESS_LABELS[view.freshness]}
      </span>
      <span aria-hidden>·</span>
      <span>
        <time dateTime={new Date(view.updatedAt).toISOString()}>{timeLabel(view.updatedAt)}</time>
      </span>
    </p>
  );
}
