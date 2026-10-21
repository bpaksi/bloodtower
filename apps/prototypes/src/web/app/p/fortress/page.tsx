"use client";
import { useMemo, useRef, useState } from "react";
import { TuningPanel } from "../../../components/TuningPanel.tsx";
import { logger } from "../../../lib/logger.ts";
import { createRng, type Rng } from "../../../lib/rng.ts";
import {
  championStrength,
  defaults,
  duel,
  FIELDS,
  type MightResult,
  nextVisit,
  simulate,
  start,
  toggleSoften,
} from "./logic.ts";

export default function Fortress() {
  const [values, setValues] = useState(defaults());
  const [seed, setSeed] = useState("1");
  const [might, setMight] = useState(3);
  const [state, setState] = useState(() => start(defaults()));
  const [sim, setSim] = useState<MightResult[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const rngRef = useRef<Rng>(createRng("1"));

  const press = (code: string, action: () => void) => {
    try {
      action();
      setProblem(null);
    } catch (cause) {
      const entry = logger.error(undefined, cause, code);
      setProblem(`${entry.code}: ${entry.message}`);
    }
  };
  const restart = () => {
    rngRef.current = createRng(seed);
    setState(start(values));
  };
  const rungs = values.rungs as number;
  const ladder = useMemo(() => Array.from({ length: rungs }, (_, i) => rungs - i), [rungs]);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1>P-05 Fortress: the duel ladder</h1>
      <p>
        Party Might duels champions one by one. Lose and drop a rung for the next visit. Top
        champion finishes it.
      </p>
      <p>
        <label>
          Seed <input value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>{" "}
        <label>
          Party Might{" "}
          <input
            type="number"
            min={0}
            value={might}
            onChange={(e) => setMight(Number(e.target.value))}
            style={{ width: 60 }}
          />
        </label>{" "}
        <button type="button" onClick={restart}>
          Restart with this seed and tuning
        </button>
      </p>
      <div style={{ display: "flex", gap: 24 }}>
        <ol data-testid="ladder" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {ladder.map((r) => (
            <li
              key={r}
              style={{
                border: "1px solid #888",
                padding: 6,
                marginBottom: 4,
                minWidth: 180,
                background:
                  r === state.rung && state.status !== "done"
                    ? "#ffd"
                    : r < state.rung
                      ? "#dfd"
                      : "#eee",
              }}
            >
              Rung {r}: champion strength {championStrength(r, values)}
              {r === state.rung && state.status !== "done" ? "  <- party" : ""}
            </li>
          ))}
        </ol>
        <div>
          <p data-testid="status">
            Visit {state.visit}, rung {state.rung}, duels left this visit {state.duelsLeft}, Melee
            Advantages {state.advantages}
            {state.status === "done" ? " | FORTRESS FINISHED" : ""}
          </p>
          <button
            type="button"
            disabled={state.status !== "inVisit"}
            onClick={() =>
              press("FORTRESS_DUEL_FAILED", () =>
                setState(duel(state, rngRef.current, values, might)),
              )
            }
          >
            Duel champion
          </button>{" "}
          <button
            type="button"
            disabled={state.status !== "inVisit" || (state.advantages < 1 && !state.softenNext)}
            onClick={() => setState(toggleSoften(state))}
          >
            {state.softenNext
              ? "Melee Advantage armed (click to cancel)"
              : "Use Melee Advantage on next duel"}
          </button>{" "}
          <button
            type="button"
            disabled={state.status !== "betweenVisits"}
            onClick={() => press("FORTRESS_VISIT_FAILED", () => setState(nextVisit(state, values)))}
          >
            Next visit
          </button>
          {problem && (
            <p role="alert" style={{ color: "crimson" }}>
              {problem}
            </p>
          )}
          <ul data-testid="duels">
            {state.duels.map((d, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: append-only list
              <li key={i}>
                Visit {d.visit}, rung {d.rung} (strength {d.strength}): party {d.partyRoll} vs{" "}
                {d.championRoll}
                {d.softened ? " (softened)" : ""} - {d.won ? "WON" : "LOST, down a rung"}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <h2>Simulation</h2>
      <p>
        Visits to top the ladder per party Might (Advantage used on the first duel at or above the
        middle rung).{" "}
        <button
          type="button"
          onClick={() =>
            press("FORTRESS_SIM_FAILED", () => setSim(simulate(values, seed, [1, 2, 3, 4, 5, 6])))
          }
        >
          Run simulation
        </button>
      </p>
      {sim && (
        <table data-testid="sim" border={1} cellPadding={4}>
          <thead>
            <tr>
              <th>Might</th>
              <th>Runs</th>
              <th>Mean visits</th>
              <th>Worst</th>
              <th>Within 5 visits</th>
              <th>Capped</th>
            </tr>
          </thead>
          <tbody>
            {sim.map((r) => (
              <tr key={r.might}>
                <td>{r.might}</td>
                <td>{r.runs}</td>
                <td>{r.meanVisits === null ? "unavailable" : r.meanVisits.toFixed(2)}</td>
                <td>{r.worstVisits}</td>
                <td>
                  {r.withinFiveShare === null
                    ? "unavailable"
                    : `${(r.withinFiveShare * 100).toFixed(1)}%`}
                </td>
                <td>
                  {r.cappedShare === null ? "unavailable" : `${(r.cappedShare * 100).toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <TuningPanel fields={FIELDS} values={values} onChange={setValues} />
    </main>
  );
}
