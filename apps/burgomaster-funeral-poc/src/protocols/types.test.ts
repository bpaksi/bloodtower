import { describe, expect, it } from "vitest";
import type { MomentId } from "./index.ts";
import {
  ADVANTAGE_CAP,
  battleStatusSchema,
  CORRUPTION_MAX,
  CUE_IDS,
  carriedItemsSchema,
  containsPrivateMoment,
  corruptionValueSchema,
  costAppliedPayloadSchema,
  cueFiredPayloadSchema,
  EVENT_TYPES,
  FOREWARNED_CHOICE_EVENT,
  HUNTER_IDS,
  hunterStateSchema,
  INVESTIGATION_ACTIONS,
  INVESTIGATION_FINDINGS,
  isDashboardSafe,
  isPrivateMomentId,
  lidChoicePayloadSchema,
  loggedEventSchema,
  MOMENT_IDS,
  momentIdSchema,
  momentPlayedPayloadSchema,
  presenceLockedPayloadSchema,
  privateHunterOf,
  routedMomentSchema,
  SCENE_ID,
  SKULL_DROP_CAP_PER_NIGHT,
  STARTING_CARRIED_ITEMS,
  skullDropPayloadSchema,
  TEST_DEFAULT_PRESENCE,
  targetForMoment,
  utcTimestampSchema,
} from "./index.ts";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

// Moment ids stay a closed union. An open string would let a later step invent one.
const momentIsOpenString: Equal<MomentId, string> = false;
void momentIsOpenString;

const at = "2026-10-14T20:00:00.000Z";

const event = (type: string, payload: Record<string, unknown>) => ({
  id: "e-1",
  at,
  type,
  payload,
});

describe("hunters and items", () => {
  it("names the four hunters in the PRD order", () => {
    expect(HUNTER_IDS).toEqual(["agnes", "tomas", "wren", "emeric"]);
  });

  it("treats a missing corruption as null and rejects Turned", () => {
    expect(corruptionValueSchema.parse(null)).toBeNull();
    expect(corruptionValueSchema.parse(0)).toBe(0);
    expect(corruptionValueSchema.safeParse(CORRUPTION_MAX + 1).success).toBe(false);
    expect(corruptionValueSchema.safeParse(-1).success).toBe(false);
  });

  it("rejects a negative stake and an unknown item", () => {
    expect(
      carriedItemsSchema.safeParse({ ...STARTING_CARRIED_ITEMS.wren, stake: -1 }).success,
    ).toBe(false);
    expect(
      carriedItemsSchema.safeParse({ ...STARTING_CARRIED_ITEMS.agnes, warriors: 1 }).success,
    ).toBe(false);
  });

  it("starts from the stand-alone kit, holy symbol off", () => {
    expect(STARTING_CARRIED_ITEMS.wren.stake).toBe(1);
    expect(STARTING_CARRIED_ITEMS.agnes["holy-water"]).toBe(1);
    expect(STARTING_CARRIED_ITEMS.tomas.stake).toBe(1);
    expect(STARTING_CARRIED_ITEMS.emeric.stake).toBe(0);
    expect(STARTING_CARRIED_ITEMS.agnes["holy-symbol"]).toBe(0);
  });

  it("rejects an empty holder id and a repeated holder", () => {
    const base = {
      corruption: null,
      holders: [] as string[],
      location: null,
      present: null,
      carriedItems: STARTING_CARRIED_ITEMS.emeric,
    };
    expect(hunterStateSchema.parse(base).corruption).toBeNull();
    expect(hunterStateSchema.safeParse({ ...base, holders: ["", "pad-1"] }).success).toBe(false);
    expect(hunterStateSchema.safeParse({ ...base, holders: ["pad-1", "pad-1"] }).success).toBe(
      false,
    );
  });
});

describe("moments, targets and cues", () => {
  it("lists each moment once, including the absent-wren fight and the end lines", () => {
    expect(new Set(MOMENT_IDS).size).toBe(MOMENT_IDS.length);
    for (const suffix of ["07~fight-lost~no-wren", "end.private.wren", "04~holy-symbol"]) {
      expect(momentIdSchema.safeParse(`${SCENE_ID}.${suffix}`).success).toBe(true);
    }
  });

  it("has a private finding for every investigation card and hunter", () => {
    const ids = INVESTIGATION_ACTIONS.flatMap((action) =>
      HUNTER_IDS.map(
        (hunter) =>
          `${SCENE_ID}.investigate.${action}.${INVESTIGATION_FINDINGS[action]}.private.${hunter}`,
      ),
    );
    expect(ids).toHaveLength(INVESTIGATION_ACTIONS.length * HUNTER_IDS.length);
    for (const id of ids) expect(MOMENT_IDS).toContain(id);
  });

  it("sends a private moment only to that hunter, and a shared moment to the dashboard", () => {
    const agnes = `${SCENE_ID}.09.private.agnes`;
    const narrator = `${SCENE_ID}.07~fight-lost~no-wren`;
    expect(privateHunterOf(agnes)).toBe("agnes");
    expect(isPrivateMomentId(narrator)).toBe(false);
    expect(targetForMoment(momentIdSchema.parse(agnes))).toBe("ipad:agnes");
    expect(targetForMoment(momentIdSchema.parse(narrator))).toBe("dashboard");
    expect(routedMomentSchema.safeParse({ id: agnes, target: "dashboard" }).success).toBe(false);
    expect(routedMomentSchema.parse({ id: narrator, target: "dashboard" }).target).toBe(
      "dashboard",
    );
  });

  it("names the four scene cues and no tower command", () => {
    expect(CUE_IDS).toEqual(["dim-all", "heartbeat", "skull-drop", "seal-sequence"]);
    expect(
      cueFiredPayloadSchema.parse({
        cue: "heartbeat",
        momentId: null,
        capability: "screen pulse",
        status: "Library",
        result: "fallback",
        reason: "no_tower",
      }).result,
    ).toBe("fallback");
    expect(
      cueFiredPayloadSchema.safeParse({
        cue: "heartbeat",
        momentId: null,
        capability: "setLED",
        status: "Library",
        result: "sent",
        reason: "no_tower",
      }).success,
    ).toBe(false);
  });
});

describe("rules that the payloads already enforce", () => {
  const locations = {
    agnes: "sanctuary",
    tomas: "away",
    wren: "sanctuary",
    emeric: "away",
  } as const;

  it("locks the test-default presence and rejects an empty or overlapping set", () => {
    expect(
      presenceLockedPayloadSchema.parse({
        sceneId: SCENE_ID,
        present: [...TEST_DEFAULT_PRESENCE.present],
        absent: [...TEST_DEFAULT_PRESENCE.absent],
        locations,
      }).present,
    ).toEqual(["wren", "agnes"]);
    expect(
      presenceLockedPayloadSchema.safeParse({
        sceneId: SCENE_ID,
        present: [],
        absent: [...HUNTER_IDS],
        locations: { agnes: "away", tomas: "away", wren: "away", emeric: "away" },
      }).success,
    ).toBe(false);
    expect(
      presenceLockedPayloadSchema.safeParse({
        sceneId: SCENE_ID,
        present: ["agnes"],
        absent: ["agnes", "tomas", "wren", "emeric"],
        locations,
      }).success,
    ).toBe(false);
  });

  it("spends one stake when nailing and none when watching", () => {
    expect(
      lidChoicePayloadSchema.parse({
        choice: "nailed",
        stakeBefore: 1,
        stakeAfter: 0,
        nailOffered: true,
        stakeCarrier: "wren",
      }).stakeCarrier,
    ).toBe("wren");
    expect(
      lidChoicePayloadSchema.safeParse({
        choice: "nailed",
        stakeBefore: 1,
        stakeAfter: 1,
        nailOffered: true,
        stakeCarrier: "wren",
      }).success,
    ).toBe(false);
    expect(
      lidChoicePayloadSchema.safeParse({
        choice: "watched",
        stakeBefore: 1,
        stakeAfter: 0,
        nailOffered: true,
        stakeCarrier: null,
      }).success,
    ).toBe(false);
    expect(
      lidChoicePayloadSchema.parse({
        choice: "watched",
        stakeBefore: null,
        stakeAfter: null,
        nailOffered: false,
        stakeCarrier: null,
      }).stakeBefore,
    ).toBeNull();
    expect(
      lidChoicePayloadSchema.safeParse({
        choice: "watched",
        stakeBefore: 1,
        stakeAfter: 1,
        nailOffered: true,
        stakeCarrier: "wren",
      }).success,
    ).toBe(false);
  });

  it("rejects an unpayable cost that still names a hunter or an item", () => {
    expect(
      costAppliedPayloadSchema.parse({
        kind: "unpayable",
        hunter: null,
        item: null,
        guardTriggered: false,
      }).kind,
    ).toBe("unpayable");
    expect(
      costAppliedPayloadSchema.safeParse({
        kind: "unpayable",
        hunter: "agnes",
        item: null,
        guardTriggered: false,
      }).success,
    ).toBe(false);
    expect(
      costAppliedPayloadSchema.safeParse({
        kind: "corruption",
        hunter: "agnes",
        item: "stake",
        guardTriggered: false,
      }).success,
    ).toBe(false);
  });

  it("caps skull drops at two in a night", () => {
    expect(
      skullDropPayloadSchema.safeParse({
        night: 2,
        dropsTonight: SKULL_DROP_CAP_PER_NIGHT + 1,
        supplyBefore: 12,
        ledgerDelta: null,
      }).success,
    ).toBe(false);
  });
});

describe("the event log", () => {
  it("stores UTC and rejects a zone offset or a rolled-over clock", () => {
    expect(utcTimestampSchema.parse(at)).toBe(at);
    expect(utcTimestampSchema.parse("2026-10-14T20:00:00Z")).toBe("2026-10-14T20:00:00Z");
    expect(utcTimestampSchema.safeParse("2026-10-14T20:00:00+00:00").success).toBe(false);
    expect(utcTimestampSchema.safeParse("2026-10-14T20:00:00").success).toBe(false);
    expect(utcTimestampSchema.safeParse("2026-02-30T00:00:00Z").success).toBe(false);
    expect(utcTimestampSchema.safeParse("2026-10-14T24:00:00Z").success).toBe(false);
  });

  it("has no tower event, and keeps personal events off the dashboard", () => {
    expect(EVENT_TYPES.some((type) => type.startsWith("tower_"))).toBe(false);
    expect(EVENT_TYPES).toContain(FOREWARNED_CHOICE_EVENT);
    expect(EVENT_TYPES).toContain("cue_fired");
    const started = event("session_started", {
      seed: "s",
      packVersion: "1",
      towerUsed: false,
    });
    expect(loggedEventSchema.parse(started)).toMatchObject({ type: "session_started" });
    expect(
      loggedEventSchema.safeParse({ ...started, payload: { ...started.payload, towerUsed: true } })
        .success,
    ).toBe(false);
    expect(loggedEventSchema.safeParse({ ...started, type: "tower_connect" }).success).toBe(false);
    expect(
      loggedEventSchema.safeParse(
        event("session_ended", {
          seed: "s",
          packVersion: "1",
          towerUsed: true,
          endReason: "completed",
          keyEligible: false,
        }),
      ).success,
    ).toBe(false);
    expect(
      loggedEventSchema.safeParse({
        ...event("session_ended", {
          seed: "s",
          packVersion: "1",
          towerUsed: false,
          endReason: "completed",
          keyEligible: false,
        }),
        bytes: "0a0b",
      }).success,
    ).toBe(false);

    const delivered = event("private_delivered", {
      momentId: `${SCENE_ID}.09.private.agnes`,
      hunter: "agnes",
      deviceId: "pad-1",
    });
    expect(isDashboardSafe(loggedEventSchema.parse(delivered))).toBe(false);
    expect(containsPrivateMoment(delivered)).toBe(true);

    const choice = event("lid_choice", {
      choice: "watched",
      stakeBefore: 1,
      stakeAfter: 1,
      nailOffered: true,
      stakeCarrier: null,
    });
    expect(isDashboardSafe(loggedEventSchema.parse(choice))).toBe(true);

    const undelivered = event("private_undelivered", {
      momentId: `${SCENE_ID}.09.private.wren`,
      hunter: "wren",
      deviceId: "pad-1",
    });
    expect(loggedEventSchema.parse(undelivered).type).toBe("private_undelivered");
    expect(isDashboardSafe(undelivered)).toBe(false);
    expect(EVENT_TYPES).toContain("private_undelivered");
  });

  it("rejects a private moment logged as if it played on the dashboard", () => {
    const momentId = `${SCENE_ID}.09.private.wren`;
    expect(
      momentPlayedPayloadSchema.safeParse({
        momentId,
        target: "dashboard",
        startedAt: at,
        skipped: false,
      }).success,
    ).toBe(false);
    expect(
      momentPlayedPayloadSchema.parse({
        momentId,
        target: "ipad:wren",
        startedAt: at,
        skipped: false,
      }).target,
    ).toBe("ipad:wren");
  });

  it("caps known advantages at +2 per hunter and allows an empty fight", () => {
    const base = {
      presentHunters: ["agnes"] as const,
      foes: 1,
      forewarned: null,
    };
    expect(
      battleStatusSchema.safeParse({
        ...base,
        advantages: [
          { hunter: "agnes", trait: "undead", amount: ADVANTAGE_CAP },
          { hunter: "agnes", trait: "wild", amount: ADVANTAGE_CAP },
        ],
      }).success,
    ).toBe(false);
    expect(
      battleStatusSchema.parse({
        ...base,
        presentHunters: [],
        advantages: [],
        forewarned: { hunter: "agnes", card: null, sittingOut: true },
      }).presentHunters,
    ).toEqual([]);
    expect(
      battleStatusSchema.parse({
        ...base,
        advantages: [
          { hunter: "agnes", trait: "undead", amount: 1 },
          { hunter: "agnes", trait: "wild", amount: null },
        ],
      }).advantages,
    ).toHaveLength(2);
  });
});

describe("dashboard safety", () => {
  it("rejects a private moment id used as an object key", () => {
    const key = `${SCENE_ID}.09.private.wren`;
    expect(containsPrivateMoment({ [key]: "Wren's secret" })).toBe(true);
    expect(isDashboardSafe({ [key]: "Wren's secret" })).toBe(false);
  });

  it("rejects a personal event nested under another object", () => {
    expect(
      isDashboardSafe({ wrap: { type: "fun_rating", payload: { hunter: "wren", rating: 5 } } }),
    ).toBe(false);
  });
});
