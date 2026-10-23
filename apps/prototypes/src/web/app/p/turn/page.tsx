"use client";
import { createRng } from "@dark-tower/rng";
import { useMemo, useState } from "react";
import { TuningPanel } from "../../../components/TuningPanel.tsx";
import { logger } from "../../../lib/logger.ts";
import { type TuningValues, toJson } from "../../../lib/tuning.ts";
import {
  act,
  BOARD,
  DEFAULTS,
  endTurn,
  eventFor,
  FIELDS,
  type Group,
  menuAt,
  newGroups,
  readTuning,
  SPACES,
  START,
  simulate,
  walk,
} from "./game.ts";

type Phase = "roll" | "story" | "spend" | "events";
type LogLine = {
  id: string;
  turn: number;
  group: string;
  spent: number;
  left: number;
  event?: string;
};

export default function TurnPage() {
  const [seed, setSeed] = useState("1");
  const [values, setValues] = useState<TuningValues>(DEFAULTS);
  const t = useMemo(() => readTuning(values), [values]);
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState<Phase>("roll");
  const [positions, setPositions] = useState<number[]>([...START]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [sim, setSim] = useState<ReturnType<typeof simulate> | null>(null);

  const rngFor = (beat: string) => createRng(`${seed}:turn${turn}:${beat}`);

  const roll = () => {
    setGroups(newGroups(rngFor("roll"), t, positions));
    setPhase("story");
    setProblem(null);
  };
  const update = (i: number, r: { group: Group; error?: string }) => {
    setGroups((gs) => gs.map((g, j) => (j === i ? r.group : g)));
    setProblem(r.error ?? null);
    if (r.error) logger.debug(`${r.group.name}: ${r.error}`);
  };
  const allDone = groups.length > 0 && groups.every((g) => g.done || g.movesLeft < 1);
  const toEvents = () => {
    const rng = rngFor("events");
    const ev = groups.map((g) => eventFor(rng, g, t));
    setEvents(ev);
    setLog((l) => [
      ...l,
      ...groups.map((g, i) => ({
        id: `${turn}-${g.name}`,
        turn,
        group: g.name,
        spent: g.spent,
        left: g.movesLeft,
        event: ev[i],
      })),
    ]);
    setPhase("events");
  };
  const next = () => {
    setPositions(groups.map((g) => g.at));
    setTurn(turn + 1);
    setGroups([]);
    setPhase("roll");
  };
  const reset = () => {
    setTurn(1);
    setPositions([...START]);
    setGroups([]);
    setLog([]);
    setPhase("roll");
    setProblem(null);
  };
  const runSim = () => {
    try {
      setSim(simulate(1000, seed, t));
    } catch (cause) {
      const entry = logger.error(undefined, cause, "SIM_FAILED");
      setProblem(`${entry.code}: ${entry.message}`);
    }
  };
  const pct = (x: number | null) => (x === null ? "unavailable" : `${(x * 100).toFixed(1)}%`);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1>P-08 A day's turn loop</h1>
      <label>
        Seed <input value={seed} onChange={(e) => setSeed(e.target.value)} style={{ width: 90 }} />
      </label>{" "}
      <button type="button" onClick={reset}>
        New game
      </button>
      <h2>
        Turn {turn}:{" "}
        {phase === "roll"
          ? "1. Roll moves"
          : phase === "story"
            ? "2. Story beat"
            : phase === "spend"
              ? "3. Spend moves"
              : "4. Events"}
      </h2>
      <div style={{ display: "flex", gap: 2, margin: "12px 0" }}>
        {SPACES.map(({ kind, index: i }) => {
          const here = (groups.length ? groups.map((g) => g.at) : positions)
            .map((p, j) => (p === i ? "AB"[j] : ""))
            .join("");
          return (
            <div
              key={`space-${kind}-${i}`}
              style={{
                width: 80,
                height: 70,
                border: "1px solid #888",
                textAlign: "center",
                background: kind === "village" ? "#fdd" : kind === "sanctuary" ? "#dfd" : "#eee",
              }}
            >
              <div style={{ fontSize: 12 }}>{kind}</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{here}</div>
            </div>
          );
        })}
      </div>
      {phase === "roll" && (
        <button type="button" onClick={roll}>
          Roll moves for {t.groups} group(s)
        </button>
      )}
      {phase === "story" && (
        <div>
          <p style={{ border: "1px dashed #888", padding: 8 }}>
            [Story beat placeholder: narration or a set piece by location and progress (DEC-077 beat
            2).]
          </p>
          <button type="button" onClick={() => setPhase("spend")}>
            Continue to spending
          </button>
        </div>
      )}
      {groups.map((g, i) => {
        const r = g.roll;
        const kind = BOARD[g.at] ?? "wild";
        return (
          <section key={g.name} style={{ border: "1px solid #444", padding: 8, margin: "8px 0" }}>
            <strong>{g.name}</strong> at space {g.at} ({kind})
            <div>
              Roll: {t.dice} = [{r.dice.join(", ")}] = {r.diceTotal}; +{r.virtues} virtues; −
              {r.corruption} corruption; = {r.raw}
              {r.floored ? `; floor ${r.floor} applies` : ""}; <strong>total {r.total}</strong>
            </div>
            <div>
              Moves left <strong>{g.movesLeft}</strong> of {r.total} (spent {g.spent})
              {g.done ? " (turn ended)" : ""}
            </div>
            {phase === "spend" && !g.done && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                <button type="button" onClick={() => update(i, walk(g, -1))}>
                  ← Walk
                </button>
                <button type="button" onClick={() => update(i, walk(g, 1))}>
                  Walk →
                </button>
                {menuAt(kind, t).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => update(i, act(g, a, t))}
                    disabled={g.taken.includes(`${g.at}:${a}`)}
                  >
                    {a}
                  </button>
                ))}
                <button type="button" onClick={() => update(i, { group: endTurn(g) })}>
                  End turn
                </button>
              </div>
            )}
            {phase === "events" && (
              <div>
                Event: <strong>{events[i]}</strong>
              </div>
            )}
          </section>
        );
      })}
      {problem && (
        <p role="alert" style={{ color: "#b00" }}>
          {problem}
        </p>
      )}
      {phase === "spend" && (
        <button type="button" onClick={toEvents}>
          {allDone ? "All done: go to events" : "Go to events (skip remaining moves)"}
        </button>
      )}
      {phase === "events" && (
        <button type="button" onClick={next}>
          Next turn
        </button>
      )}
      <h2>Turn log</h2>
      {log.length === 0 ? (
        <p>Nothing yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Turn</th>
              <th>Group</th>
              <th>Moves spent</th>
              <th>Moves left</th>
              <th>Event</th>
            </tr>
          </thead>
          <tbody>
            {log.map((l) => (
              <tr key={l.id}>
                <td>{l.turn}</td>
                <td>{l.group}</td>
                <td>{l.spent}</td>
                <td>{l.left}</td>
                <td>{l.event}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2>Simulation</h2>
      <button type="button" onClick={runSim}>
        Run 1,000 seeded turns
      </button>
      {sim && (
        <ul>
          <li>Can reach the village and take at least one action: {pct(sim.reachShare)}</li>
          <li>
            Average moves left unused:{" "}
            {sim.unusedMean === null ? "unavailable" : sim.unusedMean.toFixed(2)}
          </li>
          <li>
            Average moves rolled:{" "}
            {sim.movesMean === null ? "unavailable" : sim.movesMean.toFixed(2)}
          </li>
        </ul>
      )}
      <TuningPanel fields={FIELDS} values={values} onChange={setValues} />
      <details>
        <summary>Values as JSON</summary>
        <pre>{toJson(FIELDS, values)}</pre>
      </details>
    </main>
  );
}
