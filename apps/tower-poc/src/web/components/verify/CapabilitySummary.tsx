"use client";

import { type Availability, EFFECTIVE_VERIFICATIONS } from "@dark-tower/tower";
import { useService } from "@/lib/store";
import { AVAILABILITY_LABELS, capabilitySummary, VERIFICATION_LABELS } from "@/lib/verify";

/** The Dashboard's capability summary (spec §5): counts by availability and by verification. */
export function CapabilitySummary() {
  const welcome = useService((view) => view.welcome);
  const summary = welcome
    ? capabilitySummary(welcome.inventory, welcome.verificationOverlay)
    : undefined;
  const tower = welcome?.tower === "mock" ? "the mock tower" : "the tower";

  return (
    <section aria-labelledby="capabilities-heading" className="rounded-lg border p-4 sm:p-6">
      <h2 id="capabilities-heading" className="text-sm font-medium">
        Capabilities
      </h2>
      {!summary ? (
        <p className="mt-3 text-sm text-muted-foreground">Unavailable until the service answers.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.total} in the inventory. Verify pass: {summary.recorded} of {summary.toVerify}{" "}
            capabilities on the control pages have a result recorded on {tower} (any result: see By
            verification for passes).
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <dl
              aria-label="By availability"
              className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm"
            >
              {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((key) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{AVAILABILITY_LABELS[key]}</dt>
                  <dd className="text-right tabular-nums">{summary.byAvailability[key]}</dd>
                </div>
              ))}
            </dl>
            <dl
              aria-label="By verification"
              className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm"
            >
              {EFFECTIVE_VERIFICATIONS.map((key) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{VERIFICATION_LABELS[key]}</dt>
                  <dd className="text-right tabular-nums">{summary.byVerification[key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}
    </section>
  );
}
