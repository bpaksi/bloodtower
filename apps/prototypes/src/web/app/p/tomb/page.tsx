"use client";
import { createRng } from "@dark-tower/rng";
import { useMemo, useState } from "react";
import { Placeholder } from "../../../components/Placeholder.tsx";
import { TuningPanel } from "../../../components/TuningPanel.tsx";
import { logger } from "../../../lib/logger.ts";
import { defaultValues } from "../../../lib/tuning.ts";
import {
  type Cost,
  enter,
  FIELDS,
  leave,
  newTomb,
  resolve,
  simulate,
  softenedCost,
  type TombState,
  toConfig,
  totals,
} from "./game.ts";

const fmt = (c: Cost) => `${c.hp} HP, ${c.money} money, ${c.corruption} corruption`;
const pct = (n: number | null) => (n === null ? "unavailable" : `${(n * 100).toFixed(1)}%`);

export default function TombPage() {
  const [values, setValues] = useState(defaultValues(FIELDS));
  const [seed, setSeed] = useState("1");
  const [game, setGame] = useState<TombState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [sim, setSim] = useState<ReturnType<typeof simulate> | undefined>(undefined);

  const press = (label: string, fn: () => void) => () => {
    try {
      setProblem(null);
      fn();
    } catch (cause) {
      const e = logger.error(`${label} failed`, cause, "TOMB_PRESS_FAILED");
      setProblem(`${e.code}: ${e.message}`);
    }
  };
  const apply = (next: TombState) => {
    setGame(next);
    if (next.outcome) setEndedAt(Date.now());
  };
  const start = press("Start", () => {
    setGame(newTomb(createRng(seed), toConfig(values)));
    setStartedAt(Date.now());
    setEndedAt(null);
  });
  const runSim = press("Simulation", () => setSim(simulate(seed, values)));
  const soft = useMemo(
    () => (game?.pending ? softenedCost(game.config, game.pending.cost) : null),
    [game],
  );
  const secs = game && endedAt ? Math.round((endedAt - startedAt) / 1000) : null;
  const t = game ? totals(game) : null;

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 16, display: "grid", gap: 16 }}>
      <h1>P-02 Tomb: the dungeon crawl</h1>
      <p>
        Does "deeper or leave" make a tense scene in 5 to 10 minutes? A scene: no world time passes
        (DEC-084).
      </p>
      <label>
        Seed <input value={seed} onChange={(e) => setSeed(e.target.value)} />
      </label>
      <div>
        <button type="button" onClick={start}>
          {game ? "Restart with this seed" : "Enter the tomb"}
        </button>
        {problem && <span role="alert"> {problem}</span>}
      </div>

      {game && t && (
        <section>
          <p>
            <b>HP {game.hp}</b> / {game.config.hp} · Money {game.money} · Corruption{" "}
            {game.corruption} · Undead Advantages {game.advantages}
          </p>
          <p>
            Rooms cleared: {game.entered.length} of {game.route.length} (the last is the target
            room)
          </p>
          <ol>
            {game.entered.map((e) => (
              <li key={e.room.id}>
                {e.room.name}: paid {fmt(e.cost)}
                {e.softened ? " (softened)" : ""}
              </li>
            ))}
          </ol>
          {game.pending && (
            <div>
              <Placeholder label={`Room art: ${game.pending.room.name}`} width={240} height={120} />
              <h2>
                {game.pending.room.name}
                {game.pending.room.final ? " (target room)" : ""}
              </h2>
              <p>
                <i>{game.pending.room.flavour}</i>
              </p>
              <p>Cost: {fmt(game.pending.cost)}</p>
              <button type="button" onClick={press("Pay", () => apply(resolve(game, false)))}>
                Pay and clear
              </button>{" "}
              <button
                type="button"
                disabled={game.advantages < 1}
                onClick={press("Soften", () => apply(resolve(game, true)))}
              >
                Use Undead Advantage ({soft ? fmt(soft) : ""})
              </button>
            </div>
          )}
          {!game.pending && !game.outcome && (
            <div>
              <button type="button" onClick={press("Enter", () => apply(enter(game)))}>
                Go deeper
              </button>{" "}
              <button type="button" onClick={press("Leave", () => apply(leave(game)))}>
                Leave the tomb
              </button>
            </div>
          )}
          {game.outcome && (
            <div>
              <h2>
                {game.outcome === "finished"
                  ? "The tomb is finished"
                  : game.outcome === "left"
                    ? "The party left"
                    : "The party fell at 0 hit points"}
              </h2>
              <p>
                Rooms entered: {t.rooms}. Cost: {t.hp} HP, {t.money} money, {t.corruption}{" "}
                corruption. Time: {secs === null ? "unavailable" : `${secs} s`}.
              </p>
            </div>
          )}
        </section>
      )}

      <TuningPanel fields={FIELDS} values={values} onChange={setValues} />

      <section>
        <h2>Simulation: leave when hit points are below X</h2>
        <p>
          Uses "leave below" and "use Advantage at" from the tuning panel, the seed above, and the
          runs count.
        </p>
        <button type="button" onClick={runSim}>
          Run simulation
        </button>
        {sim === null && <p>unavailable (no runs)</p>}
        {sim && (
          <ul>
            <li>Runs: {sim.runs}</li>
            <li>Finish: {pct(sim.finished)}</li>
            <li>Leave: {pct(sim.left)}</li>
            <li>0 HP: {pct(sim.dead)}</li>
            <li>Rooms entered per run: {sim.meanRooms.toFixed(2)}</li>
          </ul>
        )}
      </section>
    </main>
  );
}
