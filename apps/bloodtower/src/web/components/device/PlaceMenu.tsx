import type { DeviceView } from "bloodtower-protocols";
import { questItemName } from "../board/QuestScene.tsx";

type BuildingPanel = NonNullable<NonNullable<DeviceView["table"]>["building"]>;

/** Copy rows 28 and 29 of the brief's Copy table (Loremaster). */
export const FALLEN_LINE = "This building has fallen. No one can enter.";
export const AUTO_LINE = "Moves on by itself.";

type QuestOption = NonNullable<NonNullable<BuildingPanel["quest"]>["options"]>[number];

/** Copy table, C3/14 (Loremaster 2026-11-12): the iPad's quest lines. */
export const QUEST_PAD_COPY = {
  prompt: "Will you help?",
  needs: (item: string) => `Needs ${item}`,
  use: (item: string) => `Use ${item}`,
  cost: (n: number) => `cost: ${n} gold`,
} as const;

/** The cost line of a quest option, or null. A short toll says what it will take (Q-C3-22). */
export const questCostLine = (option: QuestOption): string | null => {
  const cost = option.cost;
  if (!cost) return null;
  if (cost.kind === "toll") {
    return cost.purse !== null && cost.purse < cost.amount
      ? `${cost.purse} gold · ${cost.hitPoints} hit points each`
      : `${cost.amount} gold`;
  }
  if (cost.kind === "gold") return QUEST_PAD_COPY.cost(cost.amount);
  if (cost.kind === "hp") return `cost: ${cost.amount} hit points each`;
  return "cost: 1 corruption";
};

/** What an option gives: gold as "+N gold", an item by name. */
export const questGainLine = (option: QuestOption): string | null => {
  const parts = option.gains.map((gain) =>
    gain.kind === "gold"
      ? `${gain.amount > 0 ? "+" : ""}${gain.amount} gold`
      : questItemName(gain.item),
  );
  return parts.length > 0 ? parts.join(", ") : null;
};

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
  const quest = building.quest ?? null;
  // The words of a finished quest are on the Story board (SCR-014); the iPad keeps the tick only.
  const showResultLine = !quest;
  const prompt = quest?.phase === "choose" ? QUEST_PAD_COPY.prompt : building.prompt;
  return (
    <section
      className="bt-place-menu mt-4"
      data-building={building.step}
      data-quest-scene={quest ? quest.questId : undefined}
      data-quest-phase={quest ? quest.phase : undefined}
      data-building-mine={mine ? "true" : "false"}
      data-building-heroes={building.heroIds.join(",")}
      data-held-heroes={heldHeroIds.join(",")}
      aria-label={building.title}
    >
      <h2 className="text-lg font-medium" data-building-title="">
        {building.title}
      </h2>
      {mine && prompt ? (
        <p className="mt-1 italic" data-building-prompt="">
          {prompt}
        </p>
      ) : null}
      {mine && result ? (
        <div data-building-result-box="">
          {showResultLine ? (
            <p className="mt-2 text-lg" data-building-result="">
              {result.line}
            </p>
          ) : null}
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
          {building.options.map((option) => {
            const row = quest?.options.find((q) => q.promptId === option.promptId);
            const cost = row ? questCostLine(row) : null;
            const gain = row ? questGainLine(row) : null;
            const itemLine = row?.needsItem
              ? row.held
                ? QUEST_PAD_COPY.use(questItemName(row.needsItem))
                : QUEST_PAD_COPY.needs(questItemName(row.needsItem))
              : null;
            return (
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
                  {itemLine ? (
                    <span className="block text-sm text-[var(--bt-muted)]" data-quest-item="">
                      {itemLine}
                    </span>
                  ) : null}
                  {cost ? (
                    <span className="block text-sm text-[var(--bt-muted)]" data-quest-cost="">
                      {cost}
                    </span>
                  ) : null}
                  {gain ? (
                    <span className="block text-sm text-[var(--bt-muted)]" data-quest-gain="">
                      {gain}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
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
export function FallenNote({ building }: { building: string | null }) {
  const name = building ? building.charAt(0).toUpperCase() + building.slice(1) : null;
  return (
    <section className="mt-3" data-fallen-box="" role="status">
      {name ? (
        <h2 className="text-lg font-medium" data-fallen-title="">
          {name} <span data-fallen-tag="">Fallen</span>
        </h2>
      ) : null}
      <p className="text-lg" data-building-fallen="">
        {FALLEN_LINE}
      </p>
    </section>
  );
}
