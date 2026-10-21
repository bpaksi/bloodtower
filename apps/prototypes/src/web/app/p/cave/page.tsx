"use client";
import { useState } from "react";
import { Placeholder } from "../../../components/Placeholder.tsx";
import { TuningPanel } from "../../../components/TuningPanel.tsx";
import { createRng } from "../../../lib/rng.ts";
import { defaultValues, toJson } from "../../../lib/tuning.ts";
import {
  type CaveState,
  choose,
  FIELDS,
  type FightResult,
  fight,
  newCave,
  passageName,
  readSign,
  simulate,
} from "./game.ts";
import { playTowerSound } from "./sound.ts";

const pct = (x: number | null) => (x === null ? "unavailable" : `${(x * 100).toFixed(1)}%`);
const fix = (x: number | null) => (x === null ? "unavailable" : x.toFixed(2));

export default function CavePage() {
  const [values, setValues] = useState(defaultValues(FIELDS));
  const [seed, setSeed] = useState("1");
  const [simRuns, setSimRuns] = useState(1000);
  const [game, setGame] = useState(() => {
    const rng = createRng("1");
    return { rng, state: newCave(rng, defaultValues(FIELDS)), result: null as FightResult | null };
  });
  const [problem, setProblem] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const start = () => {
    const rng = createRng(seed);
    setGame({ rng, state: newCave(rng, values), result: null });
    setLog([]);
    setProblem(null);
  };
  const { state } = game;
  const set = (s: CaveState, line: string) => {
    let result: FightResult | null = null;
    if (s.outcome) result = fight(s.outcome, game.rng, values);
    setGame({ ...game, state: s, result });
    setLog((l) => [...l, line]);
  };
  const pick = (p: number) => {
    const s = choose(state, p, game.rng, values);
    const right = s.depth > state.depth;
    set(
      s,
      `Round ${s.rounds}: passage ${passageName(p)} was ${right ? "right" : "wrong"}. Light ${s.light}.`,
    );
  };
  const read = (i: number) => {
    const s = readSign(state, i);
    setGame({ ...game, state: s });
    setLog((l) => [
      ...l,
      `Beast Advantage read sign ${i + 1}: ${state.signs[i]?.isTrue ? "true" : "false"}.`,
    ]);
  };

  const [simResult, setSimResult] = useState<ReturnType<typeof simulate> | null>(null);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, display: "grid", gap: 16 }}>
      <h1>P-03 Cave: the hunt</h1>
      <p>
        Pick a passage from the signs. A wrong turn costs light; with none left, the beast ambushes.
        Find the lair first for a surprise round.
      </p>
      <label>
        Seed <input value={seed} onChange={(e) => setSeed(e.target.value)} />{" "}
        <button type="button" onClick={start}>
          New hunt (same seed replays)
        </button>
      </label>

      <section>
        <h2>
          Fork {Math.min(state.depth + 1, state.route.length)} of {state.route.length}, round{" "}
          {state.rounds + 1}
        </h2>
        <meter
          min={0}
          max={Number(values.light)}
          value={state.light}
          style={{ width: 300, height: 20 }}
        />
        <div>
          Light {state.light} of {String(values.light)}
        </div>
      </section>

      {state.outcome ? (
        <section>
          <h2>
            {state.outcome === "lair"
              ? "You found the lair first: surprise round!"
              : "The light is gone: the beast ambushes!"}
          </h2>
          <Placeholder label="Beast fight (placeholder)" width={300} height={100} />
          {game.result && (
            <p>
              Might {String(values.might)}: party {game.result.party} against beast{" "}
              {game.result.beast}. {game.result.won ? "The party wins." : "The beast wins."}
            </p>
          )}
          <p>
            Rounds {state.rounds}, wrong turns {state.wrongTurns}.
          </p>
        </section>
      ) : (
        <section>
          <h2>Signs</h2>
          <ul>
            {state.signs.map((s, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: signs are redrawn each round and have no id
              <li key={`${state.rounds}-${i}`}>
                {s.text}
                {s.kind === "sound" && (
                  <button type="button" onClick={() => setProblem(playTowerSound(s.points))}>
                    Play sound
                  </button>
                )}
                {state.advantageLeft && (
                  <button type="button" onClick={() => read(i)}>
                    Read for sure (Beast Advantage)
                  </button>
                )}
                {state.read === i && <strong> {s.isTrue ? "TRUE" : "FALSE"}</strong>}
              </li>
            ))}
          </ul>
          <h2>Passages</h2>
          {Array.from({ length: Number(values.branches) }, (_, p) => (
            <button
              type="button"
              // biome-ignore lint/suspicious/noArrayIndexKey: a passage is its position
              key={p}
              onClick={() => pick(p)}
              style={{ marginRight: 8, padding: "8px 16px" }}
            >
              Passage {passageName(p)}
            </button>
          ))}
          {problem && (
            <div role="alert" style={{ color: "#f66" }}>
              {problem}
            </div>
          )}
        </section>
      )}

      <ol>
        {log.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the log only grows
          <li key={i}>{l}</li>
        ))}
      </ol>

      <section>
        <h2>Simulation</h2>
        <label>
          Runs{" "}
          <input
            type="number"
            value={simRuns}
            onChange={(e) => setSimRuns(Number(e.target.value))}
          />{" "}
        </label>
        <button type="button" onClick={() => setSimResult(simulate(simRuns, seed, values))}>
          Run both parties
        </button>
        {simResult && (
          <table>
            <thead>
              <tr>
                <th>Party</th>
                <th>Lair</th>
                <th>Ambushed</th>
                <th>Rounds (mean)</th>
                <th>Wins the fight</th>
              </tr>
            </thead>
            <tbody>
              {(["follows", "guesses"] as const).map((k) => (
                <tr key={k}>
                  <td>{k === "follows" ? "follows the signs" : "guesses"}</td>
                  <td>{pct(simResult[k].lairShare)}</td>
                  <td>{pct(simResult[k].ambushShare)}</td>
                  <td>{fix(simResult[k].meanRounds)}</td>
                  <td>{pct(simResult[k].winShare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <TuningPanel fields={FIELDS} values={values} onChange={setValues} />
      <details>
        <summary>Values as JSON</summary>
        <pre>{toJson(FIELDS, values)}</pre>
      </details>
    </main>
  );
}
