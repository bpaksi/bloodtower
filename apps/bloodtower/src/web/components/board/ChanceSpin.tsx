"use client";

import type { BoardView } from "bloodtower-protocols";
import { useEffect, useRef } from "react";
import { playCoinCue } from "../../lib/audio/coinCue.ts";
import { joinWarning } from "../../lib/boardView";
import { setupProgress } from "../../lib/startupBoard";
import { DialogFrame } from "./DialogFrame";
import { GearBoardPanel } from "./GearBoardPanel.tsx";

type Chance = NonNullable<BoardView["chance"]>;

/** What the board shows for the amount: the number, or "unavailable". Never a zero for a missing value (EV-13). */
export const chanceAmountText = (amount: Chance["amount"]): string | null =>
  amount === null ? null : amount === "unavailable" ? "unavailable" : String(amount);

/**
 * Plays the coin cue when the spin count goes up, never for the count the board arrives with: a
 * board that reloads or reconnects after the spin stays silent (EV-15, nothing plays unasked).
 */
export function useCoinCueOnSpin(cue: number): void {
  const seen = useRef(cue);
  useEffect(() => {
    if (cue > seen.current) playCoinCue();
    seen.current = cue;
  }, [cue]);
}

/**
 * UI-045: the starting-purse step on the Story board. Display only; the iPad presses Spin. Before
 * the spin the board names the step. After it, the result line (copy `chance.result` with the
 * tower, `chance.notower` without). No tower words and no chase drawn here: the tower's lights are
 * the chase, and with no tower the result shows at once.
 */
export function ChanceSpin({ view, chance }: { view: BoardView; chance: Chance }) {
  useCoinCueOnSpin(chance.cue);
  const warning = joinWarning(view);
  const progress = setupProgress(view);
  const amount = chanceAmountText(chance.amount);
  return (
    <main
      className="bt-board"
      data-board-mode="startup"
      data-board-layer="startup"
      data-screen={view.screen}
      data-setup-step="starting-purse"
      data-paused={view.gear?.paused ? "true" : "false"}
      data-gear-opens={view.gear?.opens ?? 0}
      data-volume={view.gear?.volume ?? undefined}
    >
      <div className="bt-board-backdrop" aria-hidden="true" />
      {warning ? (
        <p className="bt-board-warning" role="status">
          {warning}
        </p>
      ) : null}
      {view.gear ? <GearBoardPanel gear={view.gear} /> : null}
      <div className="bt-startup-stage">
        <DialogFrame
          className="bt-ink-in"
          id="chance"
          data-startup-dialog=""
          data-panel="chance"
          data-chance={amount === null ? "waiting" : "result"}
        >
          <div data-startup-panel="setup">
            <p className="bt-startup-progress" data-setup-progress="">
              {progress.label}
            </p>
            <h1 className="bt-startup-title" data-chance-title="">
              {chance.title}
            </h1>
            {amount !== null ? (
              <p
                className="bt-startup-cue"
                data-chance-result={amount}
                data-chance-amount={amount}
                role="status"
              >
                {chance.line ?? amount}
              </p>
            ) : null}
          </div>
        </DialogFrame>
      </div>
    </main>
  );
}
