import type { DeviceView } from "bloodtower-protocols";

type BuildingPanel = NonNullable<NonNullable<DeviceView["table"]>["building"]>;

/** Copy rows 28 and 29 of the brief's Copy table (Loremaster). */
export const FALLEN_LINE = "This building has fallen. No one can enter.";
export const AUTO_LINE = "Moves on by itself.";

type Props = {
  building: BuildingPanel;
  /** Hero ids this iPad holds. Only the acting group's iPads get the buttons (UI-043). */
  heldHeroIds: string[];
  live: boolean;
  /** An open `build` or `leave` offer reached this iPad: after a Continue the held heroes can read empty. */
  offered: boolean;
  onAct: (promptId: string, actionId: string) => void;
};

/**
 * UI-043 on the iPad: the building menu and each sub-step of it (hero, corruption, rest moves,
 * give-back, result). Every step is one panel; the toolbar is the chrome bar below it. The choices
 * are buttons here and the words of each result are on the Story board (SCR-014); a result with no
 * Next moves on by itself (EV-15), so the iPad shows only that line and "Moves on by itself.".
 */
export function PlaceMenu({ building, heldHeroIds, live, offered, onAct }: Props) {
  const mine =
    building.heroIds.some((id) => heldHeroIds.includes(id)) ||
    (heldHeroIds.length === 0 && offered);
  const result = building.result;
  return (
    <section
      className="bt-place-menu mt-4"
      data-building={building.step}
      data-building-mine={mine ? "true" : "false"}
      data-building-heroes={building.heroIds.join(",")}
      data-held-heroes={heldHeroIds.join(",")}
      aria-label={building.title}
    >
      <h2 className="text-lg font-medium" data-building-title="">
        {building.title}
      </h2>
      {mine && building.prompt ? (
        <p className="mt-1 italic" data-building-prompt="">
          {building.prompt}
        </p>
      ) : null}
      {mine && result ? (
        <div data-building-result-box="">
          <p className="mt-2 text-lg" data-building-result="">
            {result.line}
          </p>
          {result.auto ? (
            <p className="text-[var(--bt-muted)]" data-building-auto="">
              {AUTO_LINE}
            </p>
          ) : null}
        </div>
      ) : null}
      {mine && building.options.length > 0 ? (
        <div
          className={`mt-3 flex flex-col gap-3${building.step === "rest-moves" ? " bt-place-moves" : ""}`}
        >
          {building.options.map((option) => (
            <button
              key={option.promptId}
              type="button"
              className={option.label === "Next" ? "bt-primary" : "bt-secondary"}
              data-prompt-id={option.promptId}
              data-action-id="build"
              data-action="build"
              data-building-option=""
              data-building-enabled={option.enabled ? "true" : "false"}
              disabled={!live || !option.enabled}
              aria-describedby={option.reason ? `${option.promptId}-why` : undefined}
              onClick={() => onAct(option.promptId, "build")}
            >
              <span className="flex flex-col items-center">
                <span data-building-label="">{option.label}</span>
                {option.detail ? (
                  <span className="block text-sm text-[var(--bt-muted)]" data-building-cost="">
                    {option.detail}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
          {building.options
            .filter((option) => !option.enabled && option.reason)
            .map((option) => (
              <p
                key={`${option.promptId}-why`}
                id={`${option.promptId}-why`}
                className="text-sm text-[var(--bt-muted)]"
                data-building-reason=""
              >
                {option.label}: {option.reason}
              </p>
            ))}
        </div>
      ) : null}
    </section>
  );
}

/** The fallen building's note on the move map (DEC-093, mockup `#s=10`): there is no Enter. */
export function FallenNote() {
  return (
    <p className="mt-3 text-lg" data-building-fallen="" role="status">
      {FALLEN_LINE}
    </p>
  );
}
