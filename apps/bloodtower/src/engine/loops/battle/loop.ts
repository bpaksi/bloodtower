import { eventRng } from "@dark-tower/rng";
import {
  type BattleTuning,
  fallGoldLoss,
  foeWounds,
  rewardGold,
  roundOdds,
  wonRoundCut,
} from "../../rules/battle/index.ts";
import { CORRUPTION_LOSS_LIMIT } from "../day/rules.ts";

/*
 * MEC-038 as one level (C4 / 02-battle-loop). State is plain data: every node is applied once and
 * recorded (`horn`, `stanceApplied`, `abilitiesApplied`, `node`), so a save taken anywhere restores
 * to the next pending node and replays nothing (DEC-675). Each exported call returns a new state;
 * the host owns the clock (`tick`) and the tower (this level sends no command).
 */

export const BATTLE_LOOP_ID = "battle";

export type SpellId = "magic_missile" | "lightning" | "fireball";
/** DEC-122: a spell limited to once a battle (Lightning, Fireball: DEC-801, DEC-545). */
const ONCE_SPELLS: readonly SpellId[] = ["lightning", "fireball"];

export type Action = { kind: "attack" } | { kind: "guard" } | { kind: "spell"; spell: SpellId };

export type RoundCard = {
  id: string;
  name: string;
  /** Hit points the card takes off the hero it lands on. Null: the foe's level (tuning lost_round). */
  hit: number | null;
  /** DEC-567, DEC-909: a Rend card, counted by the foe panel's "Rends left". */
  rend?: boolean;
};

/** DEC-553: an ability that fires once before round 1. Ambush hits one random hero for the foe's level. */
export type FoeAbility = { name: string; kind: "ambush" | "hit-each"; amount?: number };

export type FoeInput = {
  id: string;
  level: number;
  /** Starting count. Absent: the tuning's count for the level and the heroes present. */
  wounds?: number;
  startAbility?: FoeAbility | null;
  /** DEC-553: Spine Fiends' Spines, on a won round. Only the foe's own ability; absent for any other. */
  wonRoundAbility?: "spines" | null;
  /** DEC-553, DEC-908: the Striga's Ward cancels the weakest spell once a battle. */
  ward?: boolean;
  /** DEC-553: the Titan's Colossus halves each surviving spell, rounded down, after the flat cuts. */
  colossus?: boolean;
  /** The foe's 8 round cards (DEC-649). */
  cards: RoundCard[];
  disaster?: boolean;
};

export type BattleHeroInput = {
  id: string;
  deviceId: string;
  fight: number;
  hp: number;
  max: number;
  canGuard: boolean;
  spells?: SpellId[];
  corruptions?: number;
};

export type Stance = "none" | "bold" | "on-guard";

export type BattleConfig = {
  seed: string;
  tuning: BattleTuning;
  foe: FoeInput;
  heroes: BattleHeroInput[];
  /** DEC-607: a genuine Tomb entry. Continue never passes it again. */
  stance?: Stance;
  /** Retreat needs a move left (DEC-313); in the tomb or at day close it is always allowed. */
  canRetreat?: boolean;
  /** A battle room of a Tomb: only a win clears it. */
  tombRoom?: boolean;
  /** Injected outcomes, consumed in order, for tests and replays. */
  script?: { rolls?: boolean[]; targets?: string[]; cardOrder?: string[] };
};

export type BattleHero = BattleHeroInput & {
  spells: SpellId[];
  usedSpells: SpellId[];
  corruptions: number;
  out: boolean;
};

export type LogEntry = { kind: string; data: Record<string, unknown> };

export type BattleEffect =
  | { kind: "loop-trace"; v: 1; loopId: string; phase: "enter" }
  | { kind: "cue"; cue: "battle-horn" };

export type ResultKind = "won" | "retreated" | "fallen" | "game-lost";

export type BattleResult = {
  kind: ResultKind;
  foeWounds: number;
  foeLevel: number;
  reward: { gold: number; cardLevel: number } | null;
  goldLoss: number;
  roomCleared: boolean;
  /** DEC-555: a standing foe's seeded chance of one step up. */
  stepUp: boolean;
};

export type BattleNode = "entry" | "choice" | "actions" | "closed";

export type BattleState = {
  v: 1;
  seed: string;
  tuning: BattleTuning;
  foe: {
    id: string;
    level: number;
    wounds: number;
    startAbility: FoeAbility | null;
    wonRoundAbility?: "spines" | null;
    /** The foe holds a Ward (DEC-908). */
    ward: boolean;
    /** The Ward has cancelled a spell this battle. */
    wardUsed: boolean;
    colossus: boolean;
    disaster: boolean;
  };
  cards: RoundCard[];
  heroes: BattleHero[];
  stance: Stance;
  canRetreat: boolean;
  tombRoom: boolean;
  script: { rolls: boolean[]; targets: string[]; cardOrder: string[] };
  node: BattleNode;
  horn: boolean;
  stanceApplied: boolean;
  abilitiesApplied: boolean;
  gameLost: boolean;
  round: number;
  choice: "fight" | "retreat" | null;
  picks: Record<string, Action>;
  deck: string[];
  deckPos: number;
  cycle: number;
  /** Boss phases fired so far (DEC-909): names each added Rend and seeds each shuffle. */
  phases: number;
  rollSeq: number;
  randSeq: number;
  silence: { elapsed: number; paused: boolean };
  log: LogEntry[];
  effects: BattleEffect[];
  result: BattleResult | null;
};

/** What the host lends the battle. The third corruption and a skull loss belong to the game, not here. */
export type BattlePorts = {
  /** The hero takes a corruption in the game's own record. Absent: counted here, third loses. */
  corrupt?: (heroId: string) => { count: number; lost: boolean };
  /** True once the game is lost for any reason (DEC-676, DEC-905). */
  gameLost?: () => boolean;
};

export type PickForOffer = { kind: "pick-for"; heroId: string; shownOn: string[] };

const note = (s: BattleState, kind: string, data: Record<string, unknown> = {}): void => {
  s.log.push({ kind, data });
};

const heroById = (s: BattleState, id: string): BattleHero => {
  const found = s.heroes.find((h) => h.id === id);
  if (!found) throw new Error(`The battle has no hero "${id}".`);
  return found;
};

const standing = (s: BattleState): BattleHero[] => s.heroes.filter((h) => !h.out);

const knownDevice = (s: BattleState, deviceId: string): void => {
  if (!s.heroes.some((h) => h.deviceId === deviceId)) {
    throw new Error(`The device "${deviceId}" is not in the acting group.`);
  }
};

const rand = (s: BattleState) => eventRng(`${s.seed}:rand`, s.randSeq++);

const pickTarget = (s: BattleState, candidates: BattleHero[]): BattleHero => {
  while (s.script.targets.length > 0) {
    const wanted = s.script.targets.shift();
    const found = candidates.find((h) => h.id === wanted);
    if (found) return found;
  }
  const chosen = rand(s).pick(candidates);
  return chosen;
};

const shuffled = (s: BattleState): string[] =>
  eventRng(`${s.seed}:deck:${s.cycle}`, 0).shuffle(s.cards.map((c) => c.id));

/** DEC-649: the next card of the battle's shuffle; after all of them, a fresh shuffle. */
const drawCard = (s: BattleState): RoundCard => {
  if (s.deckPos >= s.deck.length) {
    s.cycle += 1;
    s.deck = shuffled(s);
    s.deckPos = 0;
    note(s, "round.reshuffle", { cycle: s.cycle });
  }
  const id = s.deck[s.deckPos++];
  const card = s.cards.find((c) => c.id === id);
  if (!card) throw new Error(`The deck names a card "${String(id)}" the foe does not have.`);
  return card;
};

/** The three piles of DEC-909: the draw pile, the discards, and the card face-up. */
export type DeckPiles = {
  draw: string[];
  discards: string[];
  faceUp: string | null;
  /** The foe panel's view data: cards left in the draw pile, and the Rends among them. */
  cardsLeft: number;
  rendsLeft: number;
  /** Every card the deck holds, the Rends a phase added included (the cycle). */
  held: number;
};

export const deckPiles = (s: BattleState): DeckPiles => {
  const draw = s.deck.slice(s.deckPos);
  const faceUp = s.deckPos > 0 ? (s.deck[s.deckPos - 1] ?? null) : null;
  const rends = new Set(s.cards.filter((c) => c.rend).map((c) => c.id));
  return {
    draw,
    discards: s.deck.slice(0, Math.max(0, s.deckPos - 1)),
    faceUp,
    cardsLeft: draw.length,
    rendsLeft: draw.filter((id) => rends.has(id)).length,
    held: s.cards.length,
  };
};

/**
 * DEC-909, DEC-658: a boss phase adds one Rend to the draw pile and shuffles that pile, seeded in
 * the battle's stream. The discards and the face-up card stay. The caller (C5-02's boss rules, or a
 * test trigger) fires it once per phase line crossed, in order. An empty draw pile makes the Rend its
 * only card; a later reveal that empties the pile reshuffles every card, the added Rends included.
 */
export const addBossRend = (state: BattleState, rend: Partial<RoundCard> = {}): BattleState => {
  const s = structuredClone(state);
  if (s.node === "closed") throw new Error("A closed battle takes no boss phase.");
  s.phases += 1;
  const card: RoundCard = {
    id: `rend-phase-${s.phases}`,
    name: "Rend",
    hit: null,
    ...rend,
    rend: true,
  };
  s.cards.push(card);
  const draw = eventRng(`${s.seed}:phase:${s.phases}`, 0).shuffle([
    ...s.deck.slice(s.deckPos),
    card.id,
  ]);
  s.deck = [...s.deck.slice(0, s.deckPos), ...draw];
  note(s, "boss.phase", { phase: s.phases, card: card.id, cardsLeft: draw.length });
  return s;
};

const cardHit = (s: BattleState, card: RoundCard): number => card.hit ?? s.foe.level;

const corrupt = (s: BattleState, hero: BattleHero, ports: BattlePorts): void => {
  if (ports.corrupt) {
    const gained = ports.corrupt(hero.id);
    hero.corruptions = gained.count;
    if (gained.lost) s.gameLost = true;
    return;
  }
  hero.corruptions += 1;
  if (hero.corruptions >= CORRUPTION_LOSS_LIMIT) s.gameLost = true;
};

/** MEC-024 .14, DEC-119: hit points off; at 0 a corruption and the hero sits out the battle. */
const hit = (s: BattleState, hero: BattleHero, amount: number, ports: BattlePorts): void => {
  if (hero.out) return;
  hero.hp = Math.max(0, hero.hp - amount);
  note(s, "hero.hit", { heroId: hero.id, amount, hp: hero.hp });
  if (hero.hp === 0) {
    hero.out = true;
    corrupt(s, hero, ports);
    note(s, "hero.fall", { heroId: hero.id, corruptions: hero.corruptions });
  }
};

type Gate = "game-lost" | "won" | "fallen" | null;

/** DEC-907: game loss, then the foe gone, then every hero fallen. */
const gate = (s: BattleState, ports: BattlePorts): Gate => {
  if (s.gameLost || ports.gameLost?.() === true) {
    s.gameLost = true;
    return "game-lost";
  }
  if (s.foe.wounds <= 0) return "won";
  if (standing(s).length === 0) return "fallen";
  return null;
};

/** MEC-038 .17 to .26, once. A fallen hero returns at 1 hit point (DEC-119). */
const close = (s: BattleState, kind: ResultKind): void => {
  if (s.result) return;
  for (const h of s.heroes) if (h.out) h.hp = 1;
  const t = s.tuning;
  const won = kind === "won";
  const standingFoe = kind === "retreated" || kind === "fallen";
  const stepUp = standingFoe && eventRng(`${s.seed}:step-up`, 0).int(1, t.stepUp.d) <= t.stepUp.n;
  s.result = {
    kind,
    foeWounds: s.foe.wounds,
    foeLevel: s.foe.level,
    reward: won
      ? { gold: rewardGold(t, s.foe.level, s.foe.disaster), cardLevel: s.foe.level }
      : null,
    goldLoss: kind === "fallen" ? fallGoldLoss(t, s.foe.level) : 0,
    roomCleared: won && s.tombRoom,
    stepUp,
  };
  s.node = "closed";
  note(s, "battle.close", { kind });
};

const settle = (s: BattleState, ports: BattlePorts): boolean => {
  const verdict = gate(s, ports);
  if (!verdict) return false;
  close(s, verdict);
  return true;
};

const applyAbility = (s: BattleState, ports: BattlePorts): void => {
  const ability = s.foe.startAbility;
  if (!ability) return;
  const hits: { heroId: string; amount: number }[] = [];
  if (ability.kind === "ambush") {
    const target = pickTarget(s, standing(s));
    hits.push({ heroId: target.id, amount: s.foe.level });
  } else {
    for (const h of standing(s)) hits.push({ heroId: h.id, amount: ability.amount ?? 1 });
  }
  note(s, "battle.abilities", { name: ability.name, hits });
  for (const row of hits) hit(s, heroById(s, row.heroId), row.amount, ports);
};

/** The stance of a genuine Tomb entry, applied here and nowhere else (MEC-038 .37 to .39). */
const applyStance = (s: BattleState, ports: BattlePorts): void => {
  if (s.stance === "bold") {
    s.foe.wounds = Math.max(0, s.foe.wounds - 1);
    note(s, "battle.stance", { stance: "bold", cut: 1 });
  } else if (s.stance === "on-guard") {
    const card = drawCard(s);
    const target = pickTarget(s, standing(s));
    note(s, "battle.stance", {
      stance: "on-guard",
      card: card.id,
      heroId: target.id,
      amount: cardHit(s, card),
    });
    hit(s, target, cardHit(s, card), ports);
  } else {
    note(s, "battle.stance", { stance: "none" });
  }
  s.stanceApplied = true;
};

const retreat = (s: BattleState, ports: BattlePorts): void => {
  const card = drawCard(s);
  const target = pickTarget(s, standing(s));
  note(s, "battle.last-attack", { card: card.id, heroId: target.id, amount: cardHit(s, card) });
  hit(s, target, cardHit(s, card), ports);
  const verdict = gate(s, ports);
  // A retreat that fells everyone is a fall (DEC-671); the foe is never gone here.
  close(s, verdict === "game-lost" ? "game-lost" : verdict === "fallen" ? "fallen" : "retreated");
};

const roll = (s: BattleState, strength: number): boolean => {
  const scripted = s.script.rolls.shift();
  if (scripted !== undefined) return scripted;
  const odds = roundOdds(s.tuning, strength, s.foe.level, standing(s).length);
  return eventRng(`${s.seed}:roll`, s.rollSeq++).chance(odds);
};

/** DEC-553, DEC-941: the standing hero with the highest fight number takes 1; a tie is a seeded pick. */
const spines = (s: BattleState, ports: BattlePorts): void => {
  const alive = standing(s);
  if (alive.length === 0) return;
  const top = Math.max(...alive.map((h) => h.fight));
  const tied = alive.filter((h) => h.fight === top);
  const target = tied.length === 1 ? (tied[0] as BattleHero) : rand(s).pick(tied);
  note(s, "round.spines", { heroId: target.id, amount: 1, tied: tied.length });
  hit(s, target, 1, ports);
};

const resolveRound = (s: BattleState, ports: BattlePorts): void => {
  note(s, "round.actions", { round: s.round, picks: structuredClone(s.picks) });
  // .8: spells cut first, flat cuts before any halving (DEC-655).
  let cuts: { heroId: string; spell: SpellId; cut: number }[] = [];
  for (const h of standing(s)) {
    const action = s.picks[h.id];
    if (action?.kind !== "spell") continue;
    h.usedSpells.push(action.spell);
    cuts.push({ heroId: h.id, spell: action.spell, cut: s.tuning.spellCut[action.spell] });
  }
  // DEC-908: (1) the Ward cancels the weakest spell once; the cancelled spell is cast and spent.
  // An equal cut cancels the first in seat order (the heroes' order), never by tap.
  let cancelled: { heroId: string; spell: SpellId; cut: number } | null = null;
  if (s.foe.ward && !s.foe.wardUsed && cuts.length > 0) {
    const weakest = Math.min(...cuts.map((c) => c.cut));
    cancelled = cuts.find((c) => c.cut === weakest) ?? null;
    s.foe.wardUsed = true;
    cuts = cuts.filter((c) => c !== cancelled);
  }
  // (2) the surviving flat cuts, then (3) any halving, rounded down (DEC-655, DEC-553).
  if (s.foe.colossus) cuts = cuts.map((c) => ({ ...c, cut: Math.floor(c.cut / 2) }));
  const total = cuts.reduce((sum, c) => sum + c.cut, 0);
  s.foe.wounds = Math.max(0, s.foe.wounds - total);
  note(s, "round.spells", { cuts, total, cancelled });
  // .36, DEC-643: a foe the spells felled ends the round: no Strike, roll or card lands.
  if (settle(s, ports)) return;
  const attackers = standing(s).filter((h) => s.picks[h.id]?.kind === "attack");
  const strength = attackers.reduce((sum, h) => sum + h.fight, 0);
  const won = roll(s, strength);
  const card = s.cards.find((c) => c.id === s.deck[s.deckPos - 1]);
  note(s, "round.card", { round: s.round, card: card?.id ?? null, lands: !won });
  if (won) {
    const cut = wonRoundCut(s.tuning, strength);
    s.foe.wounds = Math.max(0, s.foe.wounds - cut);
    note(s, "round.result", { round: s.round, won: true, strength, cut });
    // DEC-907: the cut comes first. A foe the cut leaves gone is won at once and Spines never fires.
    if (settle(s, ports)) return;
    if (s.foe.wonRoundAbility === "spines") spines(s, ports);
  } else {
    const guard = standing(s).find((h) => s.picks[h.id]?.kind === "guard");
    const target = guard ?? pickTarget(s, standing(s));
    // EV-10: a guard virtue takes the hit down to 0 (DEC-319's "reduced, variable" is Q-207, open).
    const amount = guard ? 0 : card ? cardHit(s, card) : s.foe.level;
    note(s, "round.result", {
      round: s.round,
      won: false,
      strength,
      heroId: target.id,
      amount,
      guarded: Boolean(guard),
    });
    hit(s, target, amount, ports);
  }
  if (settle(s, ports)) return;
  s.node = "choice";
  s.choice = null;
};

/** Runs every node that needs no press, stopping at the next prompt or the close. */
const advance = (s: BattleState, ports: BattlePorts): void => {
  if (s.node === "entry") {
    if (!s.horn) {
      s.horn = true;
      s.effects.push({ kind: "cue", cue: "battle-horn" });
      note(s, "battle.horn");
    }
    if (!s.stanceApplied) applyStance(s, ports);
    if (settle(s, ports)) return;
    if (!s.abilitiesApplied) {
      s.abilitiesApplied = true;
      applyAbility(s, ports);
    }
    if (settle(s, ports)) return;
    s.node = "choice";
  }
  if (s.node === "actions" && waitingFor(s).length === 0) resolveRound(s, ports);
};

export const waitingFor = (s: BattleState): string[] =>
  s.node === "actions"
    ? standing(s)
        .filter((h) => !s.picks[h.id])
        .map((h) => h.id)
    : [];

export const startBattle = (config: BattleConfig, ports: BattlePorts = {}): BattleState => {
  if (config.heroes.length === 0) throw new Error("A battle needs at least one hero.");
  if (config.foe.cards.length === 0) throw new Error("A foe needs round cards.");
  const heroes: BattleHero[] = config.heroes.map((h) => ({
    ...h,
    spells: [...(h.spells ?? [])],
    usedSpells: [],
    corruptions: h.corruptions ?? 0,
    out: h.hp <= 0,
  }));
  const s: BattleState = {
    v: 1,
    seed: config.seed,
    tuning: structuredClone(config.tuning),
    foe: {
      id: config.foe.id,
      level: config.foe.level,
      wounds: config.foe.wounds ?? foeWounds(config.tuning, config.foe.level, heroes.length),
      startAbility: config.foe.startAbility ?? null,
      wonRoundAbility: config.foe.wonRoundAbility ?? null,
      ward: config.foe.ward ?? false,
      wardUsed: false,
      colossus: config.foe.colossus ?? false,
      disaster: config.foe.disaster ?? false,
    },
    cards: structuredClone(config.foe.cards),
    heroes,
    stance: config.stance ?? "none",
    canRetreat: config.canRetreat ?? true,
    tombRoom: config.tombRoom ?? false,
    script: {
      rolls: [...(config.script?.rolls ?? [])],
      targets: [...(config.script?.targets ?? [])],
      cardOrder: [...(config.script?.cardOrder ?? [])],
    },
    node: "entry",
    horn: false,
    stanceApplied: false,
    abilitiesApplied: false,
    gameLost: false,
    round: 0,
    choice: null,
    picks: {},
    deck: [],
    deckPos: 0,
    cycle: 0,
    phases: 0,
    rollSeq: 0,
    randSeq: 0,
    silence: { elapsed: 0, paused: false },
    log: [],
    effects: [{ kind: "loop-trace", v: 1, loopId: BATTLE_LOOP_ID, phase: "enter" }],
    result: null,
  };
  const first = shuffled(s);
  const named = s.script.cardOrder.filter((id) => s.cards.some((c) => c.id === id));
  s.deck = [...named, ...first.filter((id) => !named.includes(id))];
  advance(s, ports);
  return s;
};

/** .3 and .4: the group answers together; the first press from any iPad decides (DEC-019). */
export const choose = (
  state: BattleState,
  deviceId: string,
  choice: "fight" | "retreat",
  ports: BattlePorts = {},
): BattleState => {
  const s = structuredClone(state);
  knownDevice(s, deviceId);
  if (s.node !== "choice") return s;
  if (choice === "retreat" && !s.canRetreat) {
    throw new Error("The group has no move left to retreat with (DEC-313).");
  }
  s.choice = choice;
  note(s, "round.choice", { round: s.round + 1, choice, by: deviceId });
  if (choice === "retreat") {
    retreat(s, ports);
    return s;
  }
  s.round += 1;
  s.picks = {};
  s.silence = { elapsed: 0, paused: false };
  const card = drawCard(s);
  note(s, "round.reveal", { round: s.round, card: card.id });
  s.node = "actions";
  return s;
};

const legal = (hero: BattleHero, action: Action): void => {
  if (action.kind === "guard" && !hero.canGuard) {
    throw new Error(`${hero.id} has no guard virtue.`);
  }
  if (action.kind === "spell") {
    if (!hero.spells.includes(action.spell))
      throw new Error(`${hero.id} cannot cast ${action.spell}.`);
    if (ONCE_SPELLS.includes(action.spell) && hero.usedSpells.includes(action.spell)) {
      throw new Error(`${action.spell} is once a battle and ${hero.id} has used it.`);
    }
  }
};

/** .6 and .7: a hero's own pick. The first pick stands (a later one, or a "Pick for", changes nothing). */
export const pick = (
  state: BattleState,
  heroId: string,
  action: Action,
  ports: BattlePorts = {},
): BattleState => {
  const s = structuredClone(state);
  const hero = heroById(s, heroId);
  if (s.node !== "actions" || hero.out || s.picks[hero.id]) return s;
  legal(hero, action);
  s.picks[hero.id] = action;
  advance(s, ports);
  return s;
};

/** PT-20: the iPads that may press "Pick for <hero>" once a seat has been silent long enough. */
export const offers = (s: BattleState): PickForOffer[] => {
  if (s.node !== "actions" || s.silence.elapsed < s.tuning.silentSeatSeconds) return [];
  return waitingFor(s).map((heroId) => ({
    kind: "pick-for",
    heroId,
    shownOn: [...new Set(s.heroes.filter((h) => h.id !== heroId).map((h) => h.deviceId))],
  }));
};

/** Guard if the hero can Guard, otherwise a normal attack (PT-20, DEC-129). First press wins. */
export const pickFor = (
  state: BattleState,
  press: { deviceId: string; heroId: string },
  ports: BattlePorts = {},
): BattleState => {
  const offer = offers(state).find((o) => o.heroId === press.heroId);
  if (!offer?.shownOn.includes(press.deviceId)) return state;
  const s = structuredClone(state);
  const hero = heroById(s, press.heroId);
  const action: Action = hero.canGuard ? { kind: "guard" } : { kind: "attack" };
  s.picks[hero.id] = action;
  note(s, "round.pick-for", { by: press.deviceId, heroId: hero.id, action: action.kind });
  advance(s, ports);
  return s;
};

/** The host's clock: seconds since its last call. Only an open, unpaused action step counts. */
export const tick = (state: BattleState, seconds: number): BattleState => {
  if (!(seconds >= 0)) throw new Error("A tick is zero seconds or more.");
  const s = structuredClone(state);
  if (s.node === "actions" && !s.silence.paused) s.silence.elapsed += seconds;
  return s;
};

/** DEC-154: a dropped iPad or a pause stops the silence clock. */
export const pauseClock = (state: BattleState): BattleState => {
  const s = structuredClone(state);
  s.silence.paused = true;
  return s;
};

export const resumeClock = (state: BattleState): BattleState => {
  const s = structuredClone(state);
  s.silence.paused = false;
  return s;
};

export const saveBattle = (state: BattleState): string => JSON.stringify(state);

/** DEC-675: resume at the saved node. The silence clock restarts at 0 (Bob, 2026-11-14). */
export const continueBattle = (saved: string, ports: BattlePorts = {}): BattleState => {
  let raw: unknown;
  try {
    raw = JSON.parse(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`The saved battle is not usable: ${message}`);
  }
  const s = raw as BattleState;
  if (s?.v !== 1 || !["entry", "choice", "actions", "closed"].includes(s.node)) {
    throw new Error("The saved battle is not usable.");
  }
  s.silence = { elapsed: 0, paused: false };
  s.phases ??= 0;
  advance(s, ports);
  return s;
};
