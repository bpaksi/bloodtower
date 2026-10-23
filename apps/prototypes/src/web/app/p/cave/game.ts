// Cave: the hunt (MEC-027, DEC-084). Pure game logic: the page and the simulation share it.
import type { Rng } from "@dark-tower/rng";
import { type BatchRun, mean, runBatch, share, tally } from "../../../lib/batch.ts";
import { defaultValues, type TuningField, type TuningValues } from "../../../lib/tuning.ts";

export const FIELDS: TuningField[] = [
  {
    key: "depth",
    label: "Tunnel depth (forks to the lair)",
    type: "number",
    default: 4,
    min: 1,
    max: 12,
    note: "invented",
  },
  {
    key: "branches",
    label: "Passages at each fork",
    type: "number",
    default: 3,
    min: 2,
    max: 6,
    note: "invented",
  },
  {
    key: "light",
    label: "Starting light",
    type: "number",
    default: 8,
    min: 1,
    max: 40,
    note: "invented",
  },
  {
    key: "stepCost",
    label: "Light a right turn costs",
    type: "number",
    default: 1,
    min: 0,
    max: 10,
    note: "invented",
  },
  {
    key: "wrongCost",
    label: "Light a wrong turn costs",
    type: "number",
    default: 2,
    min: 0,
    max: 10,
    note: "MEC-027: a wrong turn costs light",
  },
  {
    key: "signCount",
    label: "Signs shown each round",
    type: "number",
    default: 3,
    min: 1,
    max: 5,
    note: "invented (tracks, bones, a sound)",
  },
  {
    key: "trueChance",
    label: "Chance a sign is true",
    type: "number",
    default: 0.7,
    min: 0,
    max: 1,
    step: 0.05,
    note: "invented",
  },
  {
    key: "beastAdvantage",
    label: "Party holds a Beast Advantage",
    type: "boolean",
    default: true,
    note: "MEC-027: reads one sign for sure",
  },
  {
    key: "might",
    label: "Party Might",
    type: "number",
    default: 6,
    min: 0,
    max: 20,
    note: "DEC-101; placeholder fight",
  },
  {
    key: "beastStrength",
    label: "Beast strength",
    type: "number",
    default: 7,
    min: 0,
    max: 30,
    note: "invented; placeholder fight",
  },
  {
    key: "ambushBonus",
    label: "Beast bonus when it ambushes",
    type: "number",
    default: 3,
    min: 0,
    max: 20,
    note: "MEC-027: a hard fight",
  },
  {
    key: "surpriseBonus",
    label: "Party bonus for the surprise round",
    type: "number",
    default: 4,
    min: 0,
    max: 20,
    note: "MEC-027: surprise round",
  },
];

export const DEFAULTS: TuningValues = defaultValues(FIELDS);

export type SignKind = "tracks" | "bones" | "sound";
export type Sign = {
  kind: SignKind;
  /** The passage (0-based) this sign points to. */
  points: number;
  /** Hidden from the player until a Beast Advantage reads it. */
  isTrue: boolean;
  text: string;
};

export type Outcome = "lair" | "ambush";

export type CaveState = {
  /** The right passage at each fork, fixed when the cave is made. */
  route: number[];
  depth: number;
  light: number;
  rounds: number;
  wrongTurns: number;
  signs: Sign[];
  /** Index into `signs` read for sure, or null. */
  read: number | null;
  advantageLeft: boolean;
  outcome: Outcome | null;
};

export type FightResult = { won: boolean; party: number; beast: number; surprise: boolean };

const num = (v: TuningValues, k: string) => Number(v[k]);
export const passageName = (i: number) => String.fromCharCode(65 + i);

const KINDS: SignKind[] = ["tracks", "bones", "sound"];

function describe(kind: SignKind, points: number): string {
  const p = passageName(points);
  if (kind === "tracks") return `Fresh tracks lead into passage ${p}.`;
  if (kind === "bones") return `Gnawed bones are piled at the mouth of passage ${p}.`;
  return `A sound from the tower echoes out of passage ${p}.`;
}

/** Draws this round's signs. Each is true with `trueChance`; a false one points at a wrong passage. */
export function drawSigns(rng: Rng, correct: number, v: TuningValues): Sign[] {
  const branches = num(v, "branches");
  const out: Sign[] = [];
  for (let i = 0; i < num(v, "signCount"); i++) {
    const kind = KINDS[i % KINDS.length] as SignKind;
    const isTrue = rng.chance(num(v, "trueChance"));
    let points = correct;
    if (!isTrue) {
      points = rng.int(0, branches - 2);
      if (points >= correct) points++;
    }
    out.push({ kind, points, isTrue, text: describe(kind, points) });
  }
  return out;
}

export function newCave(rng: Rng, v: TuningValues): CaveState {
  const route = Array.from({ length: num(v, "depth") }, () => rng.int(0, num(v, "branches") - 1));
  return {
    route,
    depth: 0,
    light: num(v, "light"),
    rounds: 0,
    wrongTurns: 0,
    signs: drawSigns(rng, route[0] as number, v),
    read: null,
    advantageLeft: v.beastAdvantage === true,
    outcome: null,
  };
}

/** Beast Advantage: read one sign for sure. Once per cave. */
export function readSign(state: CaveState, index: number): CaveState {
  if (state.outcome) throw new Error("The hunt is over.");
  if (!state.advantageLeft) throw new Error("No Beast Advantage left to use.");
  if (index < 0 || index >= state.signs.length) throw new Error(`No sign ${index}.`);
  return { ...state, read: index, advantageLeft: false };
}

/** The party picks a passage. A right turn goes deeper; a wrong one costs light and stays at the fork. */
export function choose(state: CaveState, passage: number, rng: Rng, v: TuningValues): CaveState {
  if (state.outcome) throw new Error("The hunt is over.");
  const correct = state.route[state.depth] as number;
  const right = passage === correct;
  const depth = right ? state.depth + 1 : state.depth;
  const light = state.light - (right ? num(v, "stepCost") : num(v, "wrongCost"));
  let outcome: Outcome | null = null;
  if (depth >= state.route.length) outcome = "lair";
  else if (light <= 0) outcome = "ambush";
  return {
    ...state,
    depth,
    light: Math.max(0, light),
    rounds: state.rounds + 1,
    wrongTurns: state.wrongTurns + (right ? 0 : 1),
    signs: outcome ? [] : drawSigns(rng, state.route[depth] as number, v),
    read: null,
    outcome,
  };
}

/** Placeholder fight (fights are not designed here): Might + 2d6 against the beast + 2d6. */
export function fight(outcome: Outcome, rng: Rng, v: TuningValues): FightResult {
  const surprise = outcome === "lair";
  const party = num(v, "might") + rng.roll("2d6").total + (surprise ? num(v, "surpriseBonus") : 0);
  const beast =
    num(v, "beastStrength") + rng.roll("2d6").total + (surprise ? 0 : num(v, "ambushBonus"));
  return { won: party >= beast, party, beast, surprise };
}

export type PartyPolicy = "follows" | "guesses";

/** What the party does with this round's signs. A sign read for sure decides; else the passage with most pointing signs. */
export function pickPassage(
  policy: PartyPolicy,
  state: CaveState,
  rng: Rng,
  v: TuningValues,
): number {
  const branches = num(v, "branches");
  if (policy === "guesses") return rng.int(0, branches - 1);
  const votes = new Array<number>(branches).fill(0);
  state.signs.forEach((s, i) => {
    if (i === state.read) {
      if (s.isTrue) votes[s.points] = (votes[s.points] ?? 0) + 1000;
      return; // a sign read as false is ignored
    }
    votes[s.points] = (votes[s.points] ?? 0) + 1;
  });
  const top = Math.max(...votes);
  return rng.pick(votes.flatMap((n, i) => (n === top ? [i] : [])));
}

export type RunResult = { outcome: Outcome; rounds: number; wrongTurns: number; won: boolean };

/** One whole hunt for a bot party. The follower reads sign 0 with its Advantage on the first round. */
export function playRun(policy: PartyPolicy, rng: Rng, v: TuningValues): RunResult {
  let state = newCave(rng, v);
  while (!state.outcome) {
    if (policy === "follows" && state.advantageLeft && state.read === null)
      state = readSign(state, 0);
    state = choose(state, pickPassage(policy, state, rng, v), rng, v);
  }
  const f = fight(state.outcome, rng, v);
  return { outcome: state.outcome, rounds: state.rounds, wrongTurns: state.wrongTurns, won: f.won };
}

export type Summary = {
  runs: number;
  lairShare: number | null;
  ambushShare: number | null;
  meanRounds: number | null;
  winShare: number | null;
  outcomes: Record<string, number>;
};

export function summarise(runs: BatchRun<RunResult>[]): Summary {
  return {
    runs: runs.length,
    lairShare: share(runs, (r) => r.outcome === "lair"),
    ambushShare: share(runs, (r) => r.outcome === "ambush"),
    meanRounds: mean(runs, (r) => r.rounds),
    winShare: share(runs, (r) => r.won),
    outcomes: tally(runs, (r) => r.outcome),
  };
}

export function simulate(n: number, seed: string, v: TuningValues): Record<PartyPolicy, Summary> {
  return {
    follows: summarise(runBatch(n, `${seed}:follows`, (rng) => playRun("follows", rng, v))),
    guesses: summarise(runBatch(n, `${seed}:guesses`, (rng) => playRun("guesses", rng, v))),
  };
}
