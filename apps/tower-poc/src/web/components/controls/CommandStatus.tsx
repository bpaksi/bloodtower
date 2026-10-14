import type { CommandLifecyclePayload } from "tower-poc-protocols";
import { outcomeOf } from "@/lib/controls";
import { STAGE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const OUTCOME_STYLES = {
  waiting: "text-muted-foreground",
  confirmed: "text-emerald-700 dark:text-emerald-400",
  unconfirmed: "text-amber-700 dark:text-amber-400",
  failed: "text-destructive",
  unknown: "text-amber-700 dark:text-amber-400",
} as const;

/**
 * The newest command for one capability, from any device (D7). What was requested and what the
 * tower is known to have done are shown apart: a command can be sent and never answered
 * (GAP-HW-010). The values requested are known only on the device that sent them.
 */
export function CommandStatus({
  name,
  stages,
  interrupted,
  sender,
  requested,
}: {
  /** Names the lifecycle list for assistive technology: "<name> lifecycle, from <sender>". */
  name: string;
  stages: readonly CommandLifecyclePayload[];
  interrupted: boolean;
  sender: "this device" | "another device";
  /** What this device asked for, or undefined when another device sent it. Empty: no values. */
  requested: string | undefined;
}) {
  const outcome = outcomeOf(stages, interrupted);
  return (
    <div className="flex flex-col gap-1 text-sm">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Requested</dt>
        <dd>
          {requested === undefined
            ? `From ${sender}`
            : `${requested === "" ? "No values" : requested}, from ${sender}`}
        </dd>
        <dt className="text-muted-foreground">Outcome</dt>
        <dd className={cn("break-words", OUTCOME_STYLES[outcome.kind])}>{outcome.label}</dd>
      </dl>
      <ol
        aria-label={`${name} lifecycle, from ${sender}`}
        className="flex flex-wrap gap-x-2 text-muted-foreground"
      >
        {stages.map((stage) => (
          <li key={stage.stage} className="after:ml-2 after:content-['→'] last:after:content-none">
            {STAGE_LABELS[stage.stage]}
          </li>
        ))}
      </ol>
    </div>
  );
}
