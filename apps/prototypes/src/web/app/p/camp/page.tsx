"use client";
import { createRng, type Rng } from "@dark-tower/rng";
import { useMemo, useRef, useState } from "react";
import { TuningPanel } from "../../../components/TuningPanel.tsx";
import { logger } from "../../../lib/logger.ts";
import { defaultValues, toJson } from "../../../lib/tuning.ts";
import {
  type Action,
  configFrom,
  FIELDS,
  isOver,
  type PolicyResult,
  simulate,
  startVisit,
  step,
} from "./game.ts";

export default function CampPage() {
  const [seed, setSeed] = useState("1");
  const [values, setValues] = useState(defaultValues(FIELDS));
  const [advantage, setAdvantage] = useState(true);
  const [faceText, setFaceText] = useState("");
  const [problem, setProblem] = useState<{ where: string; text: string } | null>(null);
  const [simResult, setSimResult] = useState<PolicyResult[] | null>(null);
  const [visits, setVisits] = useState(1000);
  const [configError, cfg] = useMemo(() => {
    try {
      return [null, configFrom(values)] as const;
    } catch (cause) {
      return [cause instanceof Error ? cause.message : String(cause), null] as const;
    }
  }, [values]);
  const rngRef = useRef<Rng>(createRng(seed));
  const [state, setState] = useState(() => (cfg ? startVisit(cfg, true) : null));

  const restart = () => {
    if (!cfg) return;
    rngRef.current = createRng(seed);
    setState(startVisit(cfg, advantage));
    setProblem(null);
  };

  const act = (where: string, action: Action) => {
    if (!cfg || !state) return;
    try {
      setState(step(state, action, cfg, rngRef.current));
      setProblem(null);
      if (action.type === "haggle") setFaceText("");
    } catch (cause) {
      const entry = logger.error(undefined, cause, "CAMP_ACTION_FAILED");
      setProblem({ where, text: `${entry.code}: ${entry.message}` });
    }
  };

  const face = Number(faceText);
  const faceOk = Number.isInteger(face) && face >= 1 && face <= 6;
  const rollForMe = () => setFaceText(String(rngRef.current.int(1, 6)));
  const err = (where: string) =>
    problem?.where === where ? (
      <span role="alert" style={{ color: "#f66", marginLeft: 8 }}>
        {problem.text}
      </span>
    ) : null;

  const runSim = () => {
    if (!cfg) return;
    setSimResult(simulate(cfg, seed, visits, advantage));
  };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1>P-04 Encampment: trade</h1>
      <p style={{ opacity: 0.7 }}>
        Does the camp&apos;s temper make haggling a real choice? (MEC-028, DEC-091)
      </p>
      <label>
        Seed <input value={seed} onChange={(e) => setSeed(e.target.value)} />
      </label>{" "}
      <label>
        <input
          type="checkbox"
          checked={advantage}
          onChange={(e) => setAdvantage(e.target.checked)}
        />{" "}
        Humanoid Advantage held
      </label>{" "}
      <button type="button" onClick={restart}>
        New visit (same seed replays)
      </button>
      {configError && (
        <p role="alert" style={{ color: "#f66" }}>
          Tuning problem: {configError}
        </p>
      )}
      {cfg && state && (
        <>
          <h2>
            Temper {state.temper}/{cfg.maxTemper} &nbsp; Purse {state.purse} &nbsp; Saved{" "}
            {state.saved}
          </h2>
          <div
            role="img"
            aria-label="temper meter"
            style={{ display: "flex", gap: 4, marginBottom: 12 }}
          >
            {Array.from({ length: cfg.maxTemper }, (_, i) => ({
              id: `t${i}`,
              on: i < state.temper,
            })).map((m) => (
              <div
                key={m.id}
                style={{ width: 60, height: 24, background: m.on ? "#c33" : "#444" }}
              />
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            Haggle die (physical, DEC-091):{" "}
            <input
              aria-label="haggle die result"
              value={faceText}
              onChange={(e) => setFaceText(e.target.value)}
              size={3}
            />{" "}
            <button type="button" onClick={rollForMe}>
              Roll for me
            </button>
          </div>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {state.wares.map((w, i) => {
              const open = w.status === "open" && !isOver(state);
              return (
                <li key={w.name} style={{ marginBottom: 8 }}>
                  <strong>{w.name}</strong> {w.price}
                  {w.price !== w.list && ` (list ${w.list})`} [{w.status}]{" "}
                  {open && (
                    <>
                      <button
                        type="button"
                        onClick={() => act(`buy${i}`, { type: "buy", ware: i })}
                      >
                        Buy
                      </button>{" "}
                      <button
                        type="button"
                        disabled={w.haggled || !faceOk}
                        onClick={() => act(`haggle${i}`, { type: "haggle", ware: i, face })}
                      >
                        Haggle hard
                      </button>{" "}
                      <button
                        type="button"
                        onClick={() => act(`refuse${i}`, { type: "refuse", ware: i })}
                      >
                        Refuse
                      </button>{" "}
                      <button
                        type="button"
                        onClick={() => act(`steal${i}`, { type: "steal", ware: i })}
                      >
                        Steal
                      </button>
                      {err(`buy${i}`)}
                      {err(`haggle${i}`)}
                      {err(`refuse${i}`)}
                      {err(`steal${i}`)}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={!state.advantage || isOver(state)}
            onClick={() => act("calm", { type: "calm" })}
          >
            Spend Humanoid Advantage (calm)
          </button>{" "}
          <button
            type="button"
            disabled={isOver(state)}
            onClick={() => act("leave", { type: "leave" })}
          >
            Leave
          </button>
          {err("calm")}
          {err("leave")}
          {state.attacked && (
            <p style={{ border: "2px solid #c33", padding: 8 }}>
              THE CAMP ATTACKS. [Placeholder fight] Might {cfg.partyMight} + {state.fight?.roll} ={" "}
              {state.fight?.total} vs {cfg.campStrength}: {state.fight?.won ? "won" : "lost"}.
            </p>
          )}
          {isOver(state) && !state.attacked && (
            <p>
              Visit over. Saved {state.saved}, purse {state.purse}.
            </p>
          )}
          <h3>Log</h3>
          <ol>
            {state.log.map((l, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: append-only log
              <li key={i}>{l}</li>
            ))}
          </ol>
        </>
      )}
      <h2>Simulation</h2>
      <label>
        Visits per policy{" "}
        <input
          type="number"
          value={visits}
          min={1}
          onChange={(e) => setVisits(Math.max(1, Number(e.target.value)))}
        />
      </label>{" "}
      <button type="button" onClick={runSim} disabled={!cfg}>
        Run
      </button>
      {simResult ? (
        <table>
          <thead>
            <tr>
              <th>Policy</th>
              <th>Visits</th>
              <th>Money saved / visit</th>
              <th>Camp attacks</th>
            </tr>
          </thead>
          <tbody>
            {simResult.map((r) => (
              <tr key={r.policy}>
                <td>{r.policy}</td>
                <td>{r.visits}</td>
                <td>{r.moneySaved.toFixed(2)}</td>
                <td>{(r.attackShare * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Not run.</p>
      )}
      <TuningPanel fields={FIELDS} values={values} onChange={setValues} />
      <pre hidden>{toJson(FIELDS, values)}</pre>
    </main>
  );
}
