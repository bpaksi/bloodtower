// Pure rules of the fortress duel ladder (MEC-029, DEC-084, DEC-101). Shared by the page and the simulation.
import type { Rng } from "@dark-tower/rng";
import { mean, runBatch, share, tally } from "../../../lib/batch.ts";
import { defaultValues, type TuningField, type TuningValues } from "../../../lib/tuning.ts";

export const FIELDS: TuningField[] = [
  {
    key: "rungs",
    label: "Rungs (champions)",
    type: "number",
    default: 5,
    min: 1,
    max: 12,
    note: "Invented; MEC-029 gives no count",
  },
  {
    key: "baseStrength",
    label: "Rung 1 champion strength",
    type: "number",
    default: 1,
    min: 0,
    note: "Invented, on the Might scale (DEC-101)",
  },
  {
    key: "stepStrength",
    label: "Strength added per rung",
    type: "number",
    default: 1,
    min: 0,
    note: "Invented: how steep the ladder is",
  },
  {
    key: "partyDice",
    label: "Party duel dice",
    type: "text",
    default: "1d6",
    note: "Invented: duel is party dice + Might vs champion dice + strength",
  },
  {
    key: "championDice",
    label: "Champion duel dice",
    type: "text",
    default: "1d6",
    note: "Invented",
  },
  {
    key: "partyWinsTies",
    label: "Party wins ties",
    type: "boolean",
    default: false,
    note: "Invented",
  },
  {
    key: "duelsPerVisit",
    label: "Duels per visit (stop at a loss)",
    type: "number",
    default: 2,
    min: 1,
    max: 12,
    note: "Invented: how much of the ladder one scene covers",
  },
  {
    key: "lossDrop",
    label: "Rungs lost on a defeat",
    type: "number",
    default: 1,
    min: 0,
    note: "MEC-029: one rung down",
  },
  {
    key: "advantages",
    label: "Melee Advantages held at the start",
    type: "number",
    default: 1,
    min: 0,
    note: "MEC-029: softens one duel",
  },
  {
    key: "soften",
    label: "Softening: bonus to the party's duel total",
    type: "number",
    default: 3,
    min: 0,
    note: "Invented",
  },
  {
    key: "simRuns",
    label: "Simulation runs per Might",
    type: "number",
    default: 1000,
    min: 1,
    max: 20000,
  },
  {
    key: "visitCap",
    label: "Simulation visit cap",
    type: "number",
    default: 200,
    min: 1,
    note: "A run that has not topped the ladder by then counts as capped",
  },
];

export const defaults = (): TuningValues => defaultValues(FIELDS);

export type Status = "inVisit" | "betweenVisits" | "done";
export type DuelRecord = {
  visit: number;
  rung: number;
  strength: number;
  partyRoll: number;
  championRoll: number;
  softened: boolean;
  won: boolean;
};
export type State = {
  rung: number; // 1-based rung of the next champion
  visit: number;
  duelsLeft: number;
  advantages: number;
  softenNext: boolean;
  status: Status;
  duels: DuelRecord[];
};

const num = (v: TuningValues, k: string) => v[k] as number;

export function championStrength(rung: number, v: TuningValues): number {
  return num(v, "baseStrength") + num(v, "stepStrength") * (rung - 1);
}

export function start(v: TuningValues): State {
  return {
    rung: 1,
    visit: 1,
    duelsLeft: num(v, "duelsPerVisit"),
    advantages: num(v, "advantages"),
    softenNext: false,
    status: "inVisit",
    duels: [],
  };
}

/** Marks the next duel as softened. Needs a held Advantage and a duel to come. */
export function toggleSoften(s: State): State {
  if (s.status !== "inVisit") return s;
  if (s.softenNext) return { ...s, softenNext: false };
  if (s.advantages < 1) return s;
  return { ...s, softenNext: true };
}

/** One duel against the champion on the current rung. */
export function duel(s: State, rng: Rng, v: TuningValues, might: number): State {
  if (s.status !== "inVisit") throw new Error(`Cannot duel while ${s.status}.`);
  const strength = championStrength(s.rung, v);
  const softened = s.softenNext && s.advantages > 0;
  const partyRoll = rng.roll(String(v.partyDice)).total + might + (softened ? num(v, "soften") : 0);
  const championRoll = rng.roll(String(v.championDice)).total + strength;
  const won = partyRoll > championRoll || (v.partyWinsTies === true && partyRoll === championRoll);
  const record: DuelRecord = {
    visit: s.visit,
    rung: s.rung,
    strength,
    partyRoll,
    championRoll,
    softened,
    won,
  };
  const next: State = {
    ...s,
    duels: [...s.duels, record],
    advantages: softened ? s.advantages - 1 : s.advantages,
    softenNext: false,
    duelsLeft: s.duelsLeft - 1,
  };
  if (won) {
    next.rung = s.rung + 1;
    if (next.rung > num(v, "rungs")) next.status = "done";
    else if (next.duelsLeft <= 0) next.status = "betweenVisits";
  } else {
    next.rung = Math.max(1, s.rung - num(v, "lossDrop"));
    next.status = "betweenVisits";
  }
  return next;
}

/** The "Next visit" button. */
export function nextVisit(s: State, v: TuningValues): State {
  if (s.status !== "betweenVisits") throw new Error(`Cannot start a visit while ${s.status}.`);
  return {
    ...s,
    visit: s.visit + 1,
    duelsLeft: num(v, "duelsPerVisit"),
    status: "inVisit",
    softenNext: false,
  };
}

/** Sim policy: spend a held Advantage on the first duel at or above the ladder's middle rung. */
export function autoPlay(rng: Rng, v: TuningValues, might: number, cap: number): State {
  let s = start(v);
  const mid = Math.ceil(num(v, "rungs") / 2);
  while (s.status !== "done" && s.visit <= cap) {
    if (s.status === "betweenVisits") {
      if (s.visit >= cap) break;
      s = nextVisit(s, v);
    }
    if (s.rung >= mid && s.advantages > 0) s = toggleSoften(s);
    s = duel(s, rng, v, might);
  }
  return s;
}

export type MightResult = {
  might: number;
  runs: number;
  meanVisits: number | null;
  worstVisits: number;
  cappedShare: number | null;
  withinFiveShare: number | null;
  outcomes: Record<string, number>;
};

export function simulate(v: TuningValues, seed: string, mights: number[]): MightResult[] {
  const cap = num(v, "visitCap");
  return mights.map((might) => {
    const runs = runBatch(num(v, "simRuns"), `${seed}:might${might}`, (rng) => {
      const s = autoPlay(rng, v, might, cap);
      return { visits: s.visit, topped: s.status === "done" };
    });
    return {
      might,
      runs: runs.length,
      meanVisits: mean(
        runs.filter((r) => r.result.topped),
        (r) => r.visits,
      ),
      worstVisits: Math.max(0, ...runs.map((r) => r.result.visits)),
      cappedShare: share(runs, (r) => !r.topped),
      withinFiveShare: share(runs, (r) => r.topped && r.visits <= 5),
      outcomes: tally(runs, (r) => (r.topped ? "topped" : "capped")),
    };
  });
}
