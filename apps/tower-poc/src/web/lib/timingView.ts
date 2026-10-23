import { type StateSnapshot, skullTallySchema } from "@dark-tower/tower";

/** Where the timing page posts a result. `next dev` serves the page from another port than the service. */
export const serviceHttpOrigin = (pageProtocol: string, pageHost: string, wsUrl?: string) => {
  if (!wsUrl) return `${pageProtocol}//${pageHost}`;
  const url = new URL(wsUrl);
  const protocol = url.protocol === "wss:" ? "https:" : "http:";
  return `${protocol}//${url.host}`;
};

export interface SkullReading {
  count: number;
  updatedAt: number;
}

/**
 * The service's skull tally, or undefined when it is not known. An unknown count is not zero.
 */
export const readSkull = (snapshot: StateSnapshot | undefined): SkullReading | undefined => {
  const value = snapshot?.["skulls.count"];
  if (!value || value.freshness === "unavailable") return undefined;
  const parsed = skullTallySchema.safeParse(value.value);
  if (!parsed.success) return undefined;
  return { count: parsed.data.count, updatedAt: value.updatedAt };
};

/** A rise above the count at the start of the test. The first reading is not a drop. */
export const skullDropAt = (
  baseline: SkullReading | undefined,
  current: SkullReading | undefined,
): number | null => {
  if (!baseline || !current) return null;
  if (current.count <= baseline.count) return null;
  return current.updatedAt;
};

/** A time for the page. Null is unavailable, never zero. */
export const showTime = (at: number | null) =>
  at === null ? "Unavailable" : new Date(at).toISOString();

/**
 * Gap recorded for an overlap trial. Both sent times give the gap the tower actually saw.
 * A missing time, or a second time earlier than the first, keeps the planned pause.
 */
export const measuredGapMs = (
  plannedMs: number,
  firstSentAt: number | null | undefined,
  secondSentAt: number | null | undefined,
) => {
  if (typeof firstSentAt !== "number" || typeof secondSentAt !== "number") return plannedMs;
  if (secondSentAt < firstSentAt) return plannedMs;
  return secondSentAt - firstSentAt;
};
