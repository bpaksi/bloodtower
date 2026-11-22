import { CORRUPTION_LOSS_LIMIT } from "../../loops/day/rules.ts";

/*
 * A trap's loss and its fall (MEC-026 .12 to .15 and .18, DEC-906, DEC-939, DEC-940). Pure rules: the
 * Tomb loop (C4-06) calls `springTrap` once per trap room and keeps the result with its own state.
 * A hero at or below the loss falls: one corruption and 1 hit point at once. No sit-out in a Tomb,
 * no gold lost (a trap has no foe level, DEC-177). DEC-714's floor of 1 is for plain scenes only.
 */

export type TrapKind = "pit" | "falling-rocks";
export type TrapStance = "bold" | "on-guard";

/** DEC-606: the placeholder numbers (P-02 tunes them). */
export const TRAP_LOSS: Record<TrapKind, number> = { pit: 4, "falling-rocks": 2 };

/** DEC-607: on guard halves the trap's loss, rounded down. */
export const trapLoss = (kind: TrapKind, stance: TrapStance, base = TRAP_LOSS[kind]): number =>
  stance === "on-guard" ? Math.floor(base / 2) : base;

export type TrapHero = { id: string; hp: number; corruptions: number };

export type TrapPorts = {
  /** The hero takes a corruption in the game's own record. Absent: counted here, third loses. */
  corrupt?: (heroId: string) => { count: number; lost: boolean };
};

export type TrapHeroResult = {
  id: string;
  hpBefore: number;
  hp: number;
  fell: boolean;
  corruptions: number;
};

export type TrapResult = {
  heroes: TrapHeroResult[];
  loss: number;
  /** DEC-676: a third corruption from the trap; nothing after the trap resolves. */
  gameLost: boolean;
  /** Every present hero fell: the Tomb is failed and the quest fails (DEC-906, DEC-642). */
  allFell: boolean;
  /** DEC-940: a paid trap is spent, whoever fell. */
  roomCleared: true;
  /** A trap has no foe level (DEC-177). */
  goldLoss: 0;
};

/**
 * DEC-906, DEC-939. `victimId` is the Pit's pick (one hero); Falling Rocks hit every hero, all pay,
 * then one loss check. Corruptions are drawn in the group's hero order, but the counts never depend on it.
 */
export const springTrap = (
  kind: TrapKind,
  stance: TrapStance,
  heroes: readonly TrapHero[],
  victimId: string | null = null,
  ports: TrapPorts = {},
): TrapResult => {
  if (heroes.length === 0) throw new Error("A trap needs at least one hero.");
  if (kind === "pit" && !heroes.some((h) => h.id === victimId)) {
    throw new Error(`The Pit needs a hero of the group to fall on, not "${String(victimId)}".`);
  }
  const loss = trapLoss(kind, stance);
  let gameLost = false;
  const results = heroes.map((h): TrapHeroResult => {
    const hit = kind === "falling-rocks" || h.id === victimId;
    if (!hit)
      return { id: h.id, hpBefore: h.hp, hp: h.hp, fell: false, corruptions: h.corruptions };
    if (h.hp > loss) {
      return { id: h.id, hpBefore: h.hp, hp: h.hp - loss, fell: false, corruptions: h.corruptions };
    }
    let corruptions = h.corruptions + 1;
    if (ports.corrupt) {
      const gained = ports.corrupt(h.id);
      corruptions = gained.count;
      if (gained.lost) gameLost = true;
    } else if (corruptions >= CORRUPTION_LOSS_LIMIT) {
      gameLost = true;
    }
    return { id: h.id, hpBefore: h.hp, hp: 1, fell: true, corruptions };
  });
  return {
    heroes: results,
    loss,
    gameLost,
    allFell: results.every((r) => r.fell),
    roomCleared: true,
    goldLoss: 0,
  };
};
