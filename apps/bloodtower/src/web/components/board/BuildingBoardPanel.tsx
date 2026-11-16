import type { BoardView } from "bloodtower-protocols";
import { DialogFrame } from "./DialogFrame";

type Table = NonNullable<BoardView["table"]>;

const skullWord = (n: number) => `${n} ${n === 1 ? "skull" : "skulls"}`;

/**
 * UI-043 on the Story board: the building the group is in, its skulls, the moves left, and each
 * pick's result in words (SCR-014). Display only; the choices are on the iPad.
 */
export function BuildingBoardPanel({ table }: { table: Table }) {
  const building = table.building;
  if (!building) return null;
  const result = building.result;
  return (
    <DialogFrame
      size="compact"
      className="bt-ink-in"
      id="building"
      data-building-board={building.step}
      data-skulls={building.skulls}
      data-moves={building.movesLeft ?? "unavailable"}
      role="status"
    >
      <h2 data-building-board-title="" style={{ marginTop: 0 }}>
        {building.title}
      </h2>
      <p data-building-board-skulls="">{skullWord(building.skulls)}</p>
      <p data-building-board-moves="">
        {building.movesLeft == null
          ? "Moves unavailable"
          : `${building.movesLeft} ${building.movesLeft === 1 ? "move" : "moves"} left`}
      </p>
      {!result && building.step !== "menu" && building.prompt ? (
        <p data-building-board-prompt="">{building.prompt}</p>
      ) : null}
      {building.step === "give-back" ? (
        <ol data-building-board-tiles="">
          {building.options.map((option) => (
            <li key={option.promptId} data-building-board-tile="">
              {option.label}
              {option.detail ? ` · ${option.detail}` : ""}
            </li>
          ))}
        </ol>
      ) : null}
      {result ? (
        <div data-building-board-result={result.pick}>
          <p data-building-board-line="">{result.line}</p>
          {result.detail ? <p data-building-board-detail="">{result.detail}</p> : null}
          {result.badge ? <p data-building-board-badge="">{result.badge}</p> : null}
        </div>
      ) : null}
    </DialogFrame>
  );
}
