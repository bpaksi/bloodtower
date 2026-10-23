"use client";
import { ALL_SEALS, towerLevelSchema, towerSideSchema } from "@dark-tower/tower";
// The values on the Tower State page (M3 step 3.5), each with its origin, freshness and time.
// Nothing here sends anything: the controls beside them are capability controls.
import { useId } from "react";
import { BatteryChart } from "@/components/state/BatteryChart";
import { ValueMeta } from "@/components/state/ValueMeta";
import { timeLabel } from "@/lib/labels";
import { useService } from "@/lib/store";
import { glyphsBySide, isSealBroken, readValue } from "@/lib/towerState";
import { cn } from "@/lib/utils";

const useSnapshot = () => useService((view) => view.state?.snapshot);

const NEEDS_CALIBRATION =
  "Unavailable until the tower is calibrated: before that the library does not know where the drums face.";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-lg border p-4 sm:p-6">
      <h2 id={id} className="text-sm font-medium">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function DrumPositions() {
  const drums = readValue(useSnapshot(), "mechanics.drum-position");
  return (
    <Section
      title="Drum positions"
      description="The side each drum faces, as the library holds it from calibration and the rotations it sent."
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        {towerLevelSchema.options.map((level) => (
          <div key={level} className="contents">
            <dt className="text-muted-foreground capitalize">{level}</dt>
            <dd className="capitalize">{drums.known ? drums.value[level] : "Unavailable"}</dd>
          </div>
        ))}
      </dl>
      <ValueMeta view={drums} unavailable={NEEDS_CALIBRATION} />
    </Section>
  );
}

export function GlyphPositions() {
  const glyphs = readValue(useSnapshot(), "glyphs.all-positions");
  return (
    <Section
      title="Glyphs"
      description="Which glyphs face each side. Worked out by the library, not reported by the tower: a drum moved by hand is not seen."
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        {(glyphs.known
          ? glyphsBySide(glyphs.value)
          : towerSideSchema.options.map((side) => ({ side, glyphs: undefined }))
        ).map(({ side, glyphs: facing }) => (
          <div key={side} className="contents">
            <dt className="text-muted-foreground capitalize">{side}</dt>
            <dd className="capitalize">
              {facing === undefined
                ? "Unavailable"
                : facing.length > 0
                  ? facing.join(", ")
                  : "None"}
            </dd>
          </div>
        ))}
      </dl>
      <ValueMeta view={glyphs} unavailable={NEEDS_CALIBRATION} />
    </Section>
  );
}

export function SealRecord() {
  const broken = readValue(useSnapshot(), "seals.broken");
  return (
    <Section
      title="Seals"
      description="Which seals are broken. The tower does not track seals; this is the app's own record. It stays through a reconnect and a restart, and changes only with the controls below."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-72 table-fixed text-sm">
          <caption className="sr-only">Seals by level and side</caption>
          <thead>
            <tr>
              <th scope="col" className="w-20 py-1 text-left font-medium text-muted-foreground">
                Level
              </th>
              {towerSideSchema.options.map((side) => (
                <th
                  key={side}
                  scope="col"
                  className="py-1 font-medium capitalize text-muted-foreground"
                >
                  {side}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {towerLevelSchema.options.map((level) => (
              <tr key={level}>
                <th
                  scope="row"
                  className="py-1 text-left font-normal capitalize text-muted-foreground"
                >
                  {level}
                </th>
                {towerSideSchema.options.map((side) => {
                  const state = broken.known
                    ? isSealBroken(broken.value, { side, level })
                      ? "Broken"
                      : "Intact"
                    : "Unavailable";
                  return (
                    <td key={side} className="p-1">
                      <span
                        data-seal={`${level}-${side}`}
                        className={cn(
                          "flex h-11 items-center justify-center rounded-md border text-xs",
                          state === "Broken" &&
                            "border-foreground bg-foreground font-medium text-background",
                        )}
                      >
                        {state}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm">
        {broken.known ? `${broken.value.length} of ${ALL_SEALS.length} broken` : "Unavailable"}
      </p>
      <ValueMeta view={broken} />
    </Section>
  );
}

export function SkullCount() {
  const tally = readValue(useSnapshot(), "skulls.count");
  return (
    <Section
      title="Skull count"
      description="Skulls dropped into the tower since the count was last reset, counted by the app. A skull dropped while the tower is not connected, or before it first reports after connecting, is not counted."
    >
      <p className="text-2xl font-semibold tabular-nums">
        {tally.known ? tally.value.count : "Unavailable"}
      </p>
      {tally.known && (
        <p className="text-sm text-muted-foreground">Since {timeLabel(tally.value.since)}</p>
      )}
      <ValueMeta view={tally} />
    </Section>
  );
}

export function Battery() {
  const snapshot = useSnapshot();
  const level = readValue(snapshot, "battery.level");
  const history = readValue(snapshot, "battery.on-level");
  return (
    <Section
      title="Battery"
      description="Readings from the tower, about every 2 seconds while it is connected."
    >
      <p className="text-2xl font-semibold tabular-nums">
        {level.known
          ? `${Math.round(level.value.percent)}% (${(level.value.millivolts / 1000).toFixed(2)} V)`
          : "Unavailable"}
      </p>
      <ValueMeta view={level} unavailable="Unavailable until the tower sends a reading." />
      <h3 className="mt-2 text-sm font-medium">History</h3>
      <p className="text-xs text-muted-foreground">
        One reading every 30 seconds, for up to two hours.
      </p>
      {history.known ? (
        <BatteryChart history={history.value} />
      ) : (
        <p className="text-sm text-muted-foreground">No readings yet.</p>
      )}
      <ValueMeta view={history} unavailable="Unavailable until the tower sends a reading." />
    </Section>
  );
}
