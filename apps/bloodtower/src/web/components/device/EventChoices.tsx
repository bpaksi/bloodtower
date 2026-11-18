import type { DeviceView } from "bloodtower-protocols";

type Scene = NonNullable<NonNullable<DeviceView["table"]>["event"]>;
type Offered = DeviceView["actions"][number];

/** Copy table, C3/12 `waiting.other-group`: shown on an iPad that holds none of the present heroes. */
export const WAITING_OTHER_GROUP = "The other group is deciding.";

/** The event scene when this iPad is playing, else null. Only a `play` view carries one. */
export const eventSceneFor = (view: DeviceView): Scene | null =>
  view.screen === "play" ? (view.table?.event ?? null) : null;

/** True when this iPad holds a hero at the event (DEC-019). */
export const holdsPresentHero = (view: DeviceView, scene: Scene): boolean =>
  view.heroes.some((hero) => scene.heroIds.includes(hero.id));

/** Copy table words by option id, for an option whose action is closed and so carries no label. */
export const OPTION_LABELS: Record<string, string> = {
  "hit-points": "Lose 2 hit points",
  "lose-turn": "Lose a turn",
  "go-around": "Go around",
  "pay-off": "Pay them off (5 gold)",
};

/** The event's pick buttons are drawn here, not in the generic action list. */
export const isEventChoice = (action: Offered): boolean => action.actionId === "choose";

/**
 * UI-041 on the iPad: one button per option for the present heroes, or the waiting line for the
 * other group. A Fight option is never drawn in C3, enabled or not (Q-C3-02). Steps that move on
 * by themselves (result, Quiet, Reveal, saved) draw nothing here, and no Next.
 */
export function EventChoices({
  view,
  scene,
  live,
  onAct,
}: {
  view: DeviceView;
  scene: Scene;
  live: boolean;
  onAct: (promptId: string, actionId: string) => void;
}) {
  if (scene.stage !== "choose" || scene.options.length === 0) return null;
  if (!holdsPresentHero(view, scene)) {
    return (
      <p className="mt-4 text-lg" data-event-waiting="">
        {WAITING_OTHER_GROUP}
      </p>
    );
  }
  const options = scene.options.filter((option) => option.optionId !== "fight");
  return (
    <section className="mt-4" data-event-choices={scene.type}>
      <div className="mt-3 flex flex-col gap-3">
        {options.map((option) => {
          const action = view.actions.find((row) => row.promptId === option.promptId && row.open);
          return (
            <button
              key={option.promptId}
              type="button"
              className="bt-secondary"
              data-prompt-id={option.promptId}
              data-action-id="choose"
              data-action="choose"
              data-event-option={option.optionId}
              disabled={!live || !option.enabled || !action}
              onClick={() => onAct(option.promptId, "choose")}
            >
              {action?.label ?? OPTION_LABELS[option.optionId] ?? option.optionId}
            </button>
          );
        })}
      </div>
    </section>
  );
}
