import type { BoardView } from "bloodtower-protocols";
import { eventTuningFrom } from "../../../engine/loops/event/rules.ts";
import { DialogFrame } from "./DialogFrame";

type Table = NonNullable<BoardView["table"]>;
type Scene = NonNullable<Table["event"]>;
type Result = NonNullable<Scene["result"]>;

/** Copy table, C3/12 (Loremaster 2026-11-12). Words in braces are filled in by the app. */
export const EVENT_COPY = {
  quiet: "The road is still. Nothing comes.",
  windfall: (reward: string) => `Fortune smiles. You find ${reward}.`,
  gain: (n: number) => `+${n} gold`,
  hazard: (effect: string) => `Trouble on the road. ${effect}.`,
  saved: (counter: string) => `${counter} saved you. Nothing is lost.`,
  hitPointsLabel: (n: number) => `Lose ${n} hit points`,
  hitPointsEach: (n: number) => `−${n} hit points each`,
  foes: "Foes block the way. Stand fast or turn back.",
  rumour: "A stranger leans close.",
  trick: (effect: string) => `A stranger smiles too wide. You've been tricked: ${effect}.`,
  auto: "Moves on by itself.",
} as const;

/** The event's words, or null while there is nothing to say yet (a windfall before its result). */
export function eventWords(scene: Scene): string | null {
  const result: Result | null = scene.result;
  const hit = Math.abs(eventTuningFrom().hazardHitPoints);
  switch (scene.type) {
    case "quiet":
      return EVENT_COPY.quiet;
    case "windfall":
      return result?.kind === "windfall" ? EVENT_COPY.windfall(`${result.gold} gold`) : null;
    case "hazard":
      return result?.kind === "saved"
        ? EVENT_COPY.saved(result.counterName)
        : EVENT_COPY.hazard(EVENT_COPY.hitPointsLabel(hit));
    case "foes":
    case "disaster":
      return EVENT_COPY.foes;
    case "people":
      return scene.offer === "trick"
        ? EVENT_COPY.trick(EVENT_COPY.hitPointsLabel(hit))
        : EVENT_COPY.rumour;
  }
}

/** The cost line after a hit-point pick (Copy row hazard.cost.hp), or null. */
const costLine = (result: Result | null): string | null =>
  result?.kind === "hit-points" ? EVENT_COPY.hitPointsEach(Math.abs(result.amount)) : null;

/**
 * UI-041 on the Story board: the painting, the event's words on a Scroll (UI-035), Quiet, the
 * windfall Reveal, the saved line and the cost line. Display only; the choices are on the iPad.
 * No art exists for events yet, so the painting is a framed placeholder.
 */
export function EventScene({ scene }: { scene: Scene }) {
  const words = eventWords(scene);
  const result = scene.result;
  const cost = costLine(result);
  return (
    <section
      className="bt-event"
      data-event-scene={scene.type}
      data-event-stage={scene.stage}
      data-event-result={result?.kind ?? undefined}
      data-event-hazard={scene.hazard ?? undefined}
    >
      <figure className="bt-event-painting" data-event-painting="" aria-hidden="true" />
      <DialogFrame
        size="compact"
        className="bt-ink-in"
        data-scroll=""
        data-event-words=""
        role="status"
        style={{ textAlign: "center" }}
      >
        {words ? <p data-dialog-line="">{words}</p> : null}
        {result?.kind === "windfall" ? (
          <p className="bt-event-reveal" data-reveal="" data-reveal-gold={result.gold}>
            {EVENT_COPY.gain(result.gold)}
          </p>
        ) : null}
        {cost ? <p data-event-cost="">{cost}</p> : null}
        {scene.stage === "result" ? <p data-event-tick="">{EVENT_COPY.auto}</p> : null}
      </DialogFrame>
    </section>
  );
}
