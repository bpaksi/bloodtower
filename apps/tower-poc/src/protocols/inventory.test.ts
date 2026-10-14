import { GLYPHS, TOWER_AUDIO_LIBRARY, TOWER_LIGHT_SEQUENCES } from "ultimatedarktowerdata";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  type Capability,
  type CapabilityId,
  exclusions,
  findCapability,
  glyphSchema,
  HELD_LIGHT_SEQUENCES,
  inventory,
  isCommandable,
  isOffered,
  lightSequenceSchema,
  offeredLightSequenceSchema,
  RANDOM_ROTATE_DRUMS,
  RANDOM_ROTATE_MODE_COUNT,
  SILENT_LIGHT_SEQUENCES,
  SOUND_COUNT,
  soundIndexSchema,
} from "./index.ts";

// This file tests the inventory on its own. Whether the inventory covers the library's
// public surface is tested where the library is installed, in the server package
// (`inventoryCoverage.test.ts`): this package is bundled into the web UI and does not
// depend on the Bluetooth library, not even for its tests.

const entries: readonly Capability[] = inventory;

const sounds = Object.values(TOWER_AUDIO_LIBRARY);
const north = "north";
const seal = { side: north, level: "top" };

/**
 * One example the schema must accept and one it must reject, per entry. The rejected one
 * is a value just outside the range or outside the enum, not a malformed object; unknown
 * keys and wrong shapes are tested for every entry further down.
 */
const examples: Record<CapabilityId, { valid: unknown; invalid: unknown }> = {
  "connection.connect": { valid: {}, invalid: { deviceName: "ReturnToDarkTower" } },
  "connection.disconnect": { valid: {}, invalid: { force: true } },
  "connection.connected": { valid: {}, invalid: { refresh: true } },
  "connection.responsive": { valid: {}, invalid: { timeout: 1000 } },
  "connection.status": { valid: {}, invalid: { verbose: true } },
  "connection.device-information": { valid: {}, invalid: { refresh: true } },
  "connection.on-connect": { valid: {}, invalid: { once: true } },
  "connection.on-disconnect": { valid: {}, invalid: { once: true } },
  "connection.set-monitoring": { valid: { enabled: false }, invalid: { enabled: "no" } },
  "connection.configure-monitoring": {
    valid: { frequency: 2000, timeout: 30_000 },
    invalid: { frequency: 499 },
  },
  "connection.configure-battery-heartbeat": {
    valid: { enabled: true, timeout: 3000, verifyConnection: true },
    invalid: { timeout: 999 },
  },
  "calibration.calibrate": { valid: {}, invalid: { force: true } },
  "calibration.on-complete": { valid: {}, invalid: { once: true } },
  "calibration.calibrated": { valid: {}, invalid: { refresh: true } },
  "calibration.in-progress": { valid: {}, invalid: { refresh: true } },
  "lighting.set": {
    valid: {
      doorway: [{ position: north, level: "top", style: "breathe" }],
      ledge: [{ position: "northeast", style: "on" }],
      base: [{ position: { side: "south", level: "bottom" }, style: "flicker" }],
    },
    invalid: { doorway: [{ position: north, level: "top", style: "strobe" }] },
  },
  "lighting.all-on": { valid: { effect: "breatheFast" }, invalid: { effect: "strobe" } },
  "lighting.all-off": { valid: {}, invalid: { effect: "off" } },
  "lighting.sequence": {
    valid: { sequence: "twinkle", soundIndex: 1 },
    invalid: { sequence: "notASequence" },
  },
  "lighting.set-led": {
    valid: { layerIndex: 5, lightIndex: 3, effect: "on", loop: true },
    invalid: { layerIndex: 6, lightIndex: 0, effect: "on" },
  },
  "sound.play": { valid: { soundIndex: SOUND_COUNT }, invalid: { soundIndex: SOUND_COUNT + 1 } },
  "sound.play-stateful": {
    valid: { soundIndex: 1, volume: 3 },
    invalid: { soundIndex: 1, loop: true },
  },
  "mechanics.rotate": {
    valid: { top: north, middle: "east", bottom: "west", soundIndex: 1 },
    invalid: { top: "up", middle: "east", bottom: "west" },
  },
  "mechanics.rotate-with-state": {
    valid: { top: north, middle: "east", bottom: "west" },
    invalid: { top: north, middle: "east", bottom: "west", soundIndex: 0 },
  },
  "mechanics.rotate-drum": {
    valid: { drumIndex: 2, position: 3, playSound: true },
    invalid: { drumIndex: 3, position: 0 },
  },
  "mechanics.random-rotate": { valid: { drums: "middle-bottom" }, invalid: { drums: 6 } },
  "mechanics.drum-position": { valid: { level: "middle" }, invalid: { level: "base" } },
  "mechanics.long-command-in-progress": { valid: {}, invalid: { refresh: true } },
  "mechanics.unjam-drums": { valid: {}, invalid: { drumIndex: 0 } },
  "mechanics.door-reset": { valid: {}, invalid: { side: north } },
  "mechanics.overwrite-drum-states": { valid: {}, invalid: { top: north } },
  "glyphs.position": { valid: { glyph: "cleanse" }, invalid: { glyph: "sword" } },
  "glyphs.all-positions": { valid: {}, invalid: { glyph: "cleanse" } },
  "glyphs.facing": { valid: { direction: "south" }, invalid: { direction: "down" } },
  "seals.break": { valid: { seal }, invalid: { seal, volume: 1 } },
  "seals.mark-broken": { valid: { seal }, invalid: { seal: { side: north, level: "base" } } },
  "seals.mark-restored": { valid: { seal }, invalid: { seal: { side: "up", level: "top" } } },
  "seals.reset": { valid: {}, invalid: { seal } },
  "seals.is-broken": { valid: { seal }, invalid: { seal: { side: north } } },
  "seals.broken": { valid: {}, invalid: { seal } },
  "seals.random-unbroken": { valid: {}, invalid: { level: "top" } },
  "skulls.reset-count": { valid: {}, invalid: { count: 0 } },
  "skulls.reset-record": { valid: {}, invalid: { count: 0 } },
  "skulls.on-drop": { valid: {}, invalid: { once: true } },
  "skulls.count": { valid: {}, invalid: { refresh: true } },
  "battery.on-level": { valid: {}, invalid: { once: true } },
  "battery.level": { valid: {}, invalid: { unit: "percent" } },
  "battery.previous-level": { valid: {}, invalid: { unit: "percent" } },
  "state.current": { valid: {}, invalid: { refresh: true } },
  "state.on-update": { valid: {}, invalid: { once: true } },
  "state.on-response": { valid: {}, invalid: { once: true } },
  "diagnostics.last-incident": { valid: {}, invalid: { clear: true } },
  "diagnostics.export": { valid: {}, invalid: { pretty: true } },
};

describe("inventory entries", () => {
  it("has a unique id for every entry", () => {
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("builds every id from the entry's category and a lower-case name", () => {
    for (const entry of entries) {
      expect(entry.id).toMatch(/^[a-z]+\.[a-z]+(-[a-z]+)*$/);
      expect(entry.id.split(".")[0]).toBe(entry.category);
    }
  });

  it("gives every entry a title and evidence", () => {
    for (const entry of entries) {
      expect(entry.title.length, entry.id).toBeGreaterThan(0);
      expect(entry.evidence.length, entry.id).toBeGreaterThan(0);
    }
  });

  it("finds an entry by id and returns undefined for an unknown id", () => {
    expect(findCapability("sound.play")?.apiMapping).toEqual(["playSound"]);
    expect(findCapability("sound.playRaw")).toBeUndefined();
    expect(findCapability("__proto__")).toBeUndefined();
  });

  it("maps every library member at most once, across entries and exclusions", () => {
    const names = [
      ...entries.flatMap((entry) => entry.apiMapping),
      ...exclusions.map((exclusion) => exclusion.member),
    ];
    const repeated = names.filter((name, index) => names.indexOf(name) !== index);
    expect(repeated).toEqual([]);
  });

  it("gives every exclusion a reason", () => {
    for (const exclusion of exclusions) {
      expect(exclusion.reason.length, exclusion.member).toBeGreaterThan(0);
    }
  });

  it("maps no library member only when the capability is unsupported or the service's own", () => {
    for (const entry of entries) {
      const capability: Capability = entry;
      if (entry.availability === "unsupported") expect(entry.apiMapping, entry.id).toEqual([]);
      else if (entry.apiMapping.length === 0) expect(capability.serviceOnly, entry.id).toBe(true);
    }
  });

  it("marks only offered commands as the service's own", () => {
    const own = entries.filter((entry) => (entry as Capability).serviceOnly);
    expect(own.map((entry) => entry.id).sort()).toEqual([
      "seals.mark-broken",
      "seals.mark-restored",
      "seals.reset",
      "skulls.reset-record",
    ]);
    for (const entry of own) expect(isCommandable(entry), entry.id).toBe(true);
  });

  it("places an entry on a page exactly when the app offers it", () => {
    for (const entry of entries) {
      expect(entry.uiLocation !== null, entry.id).toBe(isOffered(entry));
    }
  });

  it("claims no verification the repo cannot back", () => {
    // `mock-tested` needs a test that drives the capability through the mock adapter and a
    // control on its page. Each id here names where that is done; add one only with both.
    const backed = [
      // executor.test.ts, "lighting on the mock"; the Lights page (e2e lights.spec.ts).
      "lighting.all-off",
      "lighting.all-on",
      "lighting.sequence",
      "lighting.set",
      "lighting.set-led",
      // executor.test.ts, "mechanics on the mock"; the Mechanics page (e2e mechanics.spec.ts).
      "mechanics.random-rotate",
      "mechanics.rotate-drum",
      "mechanics.rotate-with-state",
      // executor.test.ts, "seals and skulls"; the Tower State page (e2e state.spec.ts). The
      // service's own commands touch no tower; they run there with the mock connected and not.
      "seals.break",
      "seals.mark-broken",
      "seals.mark-restored",
      "seals.reset",
      "skulls.reset-count",
      "skulls.reset-record",
      // executor.test.ts, "sound on the mock"; the Sounds page (e2e sounds.spec.ts).
      "sound.play",
      "sound.play-stateful",
    ];
    expect(
      entries
        .filter((entry) => entry.verification !== "untested")
        .map((entry) => entry.id)
        .sort(),
    ).toEqual(backed);
  });

  it("gates every mechanics command and every drum or glyph reading on calibration (D9)", () => {
    for (const entry of entries) {
      const gated =
        (entry.category === "mechanics" && entry.kind !== "property") ||
        entry.category === "glyphs";
      if (gated && isOffered(entry)) {
        expect(entry.availability, entry.id).toBe("requires-calibration");
      }
    }
  });
});

describe("commandable capabilities", () => {
  it("are exactly these", () => {
    // Listed by hand on purpose: a new way to make the tower do something has to show up
    // here as a reviewed change.
    expect(
      entries
        .filter(isCommandable)
        .map((entry) => entry.id)
        .sort(),
    ).toEqual([
      "lighting.all-off",
      "lighting.all-on",
      "lighting.sequence",
      "lighting.set",
      "lighting.set-led",
      "mechanics.random-rotate",
      "mechanics.rotate-drum",
      "mechanics.rotate-with-state",
      "seals.break",
      "seals.mark-broken",
      "seals.mark-restored",
      "seals.reset",
      "skulls.reset-count",
      "skulls.reset-record",
      "sound.play",
      "sound.play-stateful",
    ]);
  });

  it("never include a capability the app does not offer", () => {
    for (const entry of entries) {
      if (entry.availability === "unsupported" || entry.availability === "not-exposed") {
        expect(isCommandable(entry), entry.id).toBe(false);
      }
    }
  });

  it("never include a lifecycle action, a query, an event or a property", () => {
    for (const entry of entries) {
      if (entry.kind !== "command") expect(isCommandable(entry), entry.id).toBe(false);
    }
  });
});

describe("params schemas", () => {
  it("have an example pair for every entry", () => {
    expect(Object.keys(examples).sort()).toEqual(entries.map((entry) => entry.id).sort());
  });

  it.each(entries.map((entry) => [entry.id, entry] as const))(
    "%s accepts its valid example",
    (id, entry) => {
      const result = entry.params.safeParse(examples[id as CapabilityId].valid);
      expect(result.error?.issues).toBeUndefined();
    },
  );

  it.each(entries.map((entry) => [entry.id, entry] as const))(
    "%s rejects its invalid example",
    (id, entry) => {
      expect(entry.params.safeParse(examples[id as CapabilityId].invalid).success).toBe(false);
    },
  );

  it("reject an unknown key on every entry", () => {
    for (const entry of entries) {
      const valid = examples[entry.id as CapabilityId].valid as Record<string, unknown>;
      expect(entry.params.safeParse({ ...valid, extra: 1 }).success, entry.id).toBe(false);
    }
  });

  it("take no parameters for a lifecycle action, an event or a property", () => {
    for (const entry of entries) {
      if (entry.kind === "lifecycle" || entry.kind === "event" || entry.kind === "property") {
        expect(Object.keys(entry.params.shape), entry.id).toEqual([]);
      }
    }
  });

  it("reject a fractional, string or missing value where an integer is required", () => {
    const play = findCapability("sound.play")?.params;
    expect(play?.safeParse({ soundIndex: 1.5 }).success).toBe(false);
    expect(play?.safeParse({ soundIndex: "1" }).success).toBe(false);
    expect(play?.safeParse({ soundIndex: Number.NaN }).success).toBe(false);
    expect(play?.safeParse({}).success).toBe(false);
  });

  it("require the drums for a random rotation, so that all drums is never implied", () => {
    expect(findCapability("mechanics.random-rotate")?.params.safeParse({}).success).toBe(false);
  });

  it("accept each random-rotate drum name, reject a number, and map names to exactly 0 to 6", () => {
    const random = findCapability("mechanics.random-rotate")?.params;
    for (const drums of Object.keys(RANDOM_ROTATE_DRUMS)) {
      expect(random?.safeParse({ drums }).success, drums).toBe(true);
    }
    expect(Object.keys(RANDOM_ROTATE_DRUMS)).toHaveLength(7);
    for (const drums of [0, 1, 6, "0", "", "ALL"]) {
      expect(random?.safeParse({ drums }).success, String(drums)).toBe(false);
    }
    expect(random?.safeParse({ level: 0 }).success).toBe(false);
    expect(Object.values(RANDOM_ROTATE_DRUMS).sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(RANDOM_ROTATE_MODE_COUNT).toBe(7);
  });

  it("accept each end of every documented index range and reject one past it", () => {
    const setLed = findCapability("lighting.set-led")?.params;
    const led = (layerIndex: number, lightIndex: number) =>
      setLed?.safeParse({ layerIndex, lightIndex, effect: "on" }).success;
    expect([led(0, 0), led(5, 3)]).toEqual([true, true]);
    expect([led(-1, 0), led(6, 0), led(0, -1), led(0, 4)]).toEqual([false, false, false, false]);

    const rotateDrum = findCapability("mechanics.rotate-drum")?.params;
    const drum = (drumIndex: number, position: number) =>
      rotateDrum?.safeParse({ drumIndex, position }).success;
    expect([drum(0, 0), drum(2, 3)]).toEqual([true, true]);
    expect([drum(-1, 0), drum(3, 0), drum(0, -1), drum(0, 4)]).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });
});

describe("lighting.set params", () => {
  const lights = findCapability("lighting.set")?.params;
  const doorway = (position: string, level: string, style = "on") => ({ position, level, style });

  it("accept each of the six effects and nothing else", () => {
    for (const style of ["off", "on", "breathe", "breatheFast", "breathe50percent", "flicker"]) {
      expect(lights?.safeParse({ doorway: [doorway(north, "top", style)] }).success, style).toBe(
        true,
      );
    }
    for (const style of ["", "ON", "blink", "1"]) {
      expect(lights?.safeParse({ doorway: [doorway(north, "top", style)] }).success, style).toBe(
        false,
      );
    }
  });

  it("reject a command that names no light", () => {
    expect(lights?.safeParse({}).success).toBe(false);
    expect(lights?.safeParse({ doorway: [] }).success).toBe(false);
  });

  it("reject the same light twice", () => {
    const twice = { doorway: [doorway(north, "top", "on"), doorway(north, "top", "off")] };
    expect(lights?.safeParse(twice).success).toBe(false);
    const ledge = { position: "northeast", style: "on" };
    expect(lights?.safeParse({ ledge: [ledge, ledge] }).success).toBe(false);
    const base = { position: { side: north, level: "top" }, style: "on" };
    expect(lights?.safeParse({ base: [base, base] }).success).toBe(false);
  });

  it("accept every light at once", () => {
    const sides = ["north", "east", "south", "west"];
    const all = {
      doorway: sides.flatMap((side) =>
        ["top", "middle", "bottom"].map((level) => doorway(side, level)),
      ),
      ledge: ["northeast", "southeast", "southwest", "northwest"].map((position) => ({
        position,
        style: "on",
      })),
      base: sides.flatMap((side) =>
        ["top", "bottom"].map((level) => ({ position: { side, level }, style: "on" })),
      ),
    };
    expect(lights?.safeParse(all).error?.issues).toBeUndefined();
  });

  it("reject a side where a corner is required, and the library's a/b base aliases", () => {
    expect(lights?.safeParse({ ledge: [{ position: north, style: "on" }] }).success).toBe(false);
    const alias = { position: { side: north, level: "a" }, style: "on" };
    expect(lights?.safeParse({ base: [alias] }).success).toBe(false);
  });
});

describe("catalog ranges from ultimatedarktowerdata", () => {
  // The three counts are written out so that a data update fails here and gets read.
  it("has 113 sounds, numbered 1..113 with no gaps or repeats", () => {
    expect(sounds).toHaveLength(113);
    expect(sounds.map((sound) => sound.value).sort((a, b) => a - b)).toEqual(
      Array.from({ length: sounds.length }, (_, index) => index + 1),
    );
  });

  it("makes the sound-index range equal to the catalog size", () => {
    expect(SOUND_COUNT).toBe(sounds.length);
    expect(soundIndexSchema.minValue).toBe(1);
    expect(soundIndexSchema.maxValue).toBe(sounds.length);
    for (const sound of sounds) {
      expect(soundIndexSchema.safeParse(sound.value).success, sound.name).toBe(true);
    }
    expect(soundIndexSchema.safeParse(0).success).toBe(false);
    expect(soundIndexSchema.safeParse(sounds.length + 1).success).toBe(false);
  });

  it("limits light sequences to the 21 in the catalog", () => {
    expect(lightSequenceSchema.options).toHaveLength(21);
    expect(lightSequenceSchema.options).toEqual(Object.keys(TOWER_LIGHT_SEQUENCES));
  });

  it("holds back rotationDrumMiddle and accepts the other 20 (D23, M2 step 11)", () => {
    const sequence = findCapability("lighting.sequence")?.params;
    expect(HELD_LIGHT_SEQUENCES).toEqual(["rotationDrumMiddle"]);
    expect([...SILENT_LIGHT_SEQUENCES].sort()).toEqual(
      ["rotationAllDrums", "rotationDrumBottom", "rotationDrumMiddle", "rotationDrumTop"].sort(),
    );
    expect(lightSequenceSchema.options).toHaveLength(21);
    for (const name of HELD_LIGHT_SEQUENCES) {
      expect(Object.keys(TOWER_LIGHT_SEQUENCES), name).toContain(name);
      expect(sequence?.safeParse({ sequence: name }).success, name).toBe(false);
    }
    const others = lightSequenceSchema.options.filter(
      (name) => !HELD_LIGHT_SEQUENCES.includes(name),
    );
    expect(others).toHaveLength(20);
    expect(offeredLightSequenceSchema.options).toEqual(others);
    for (const name of others) {
      expect(sequence?.safeParse({ sequence: name }).success, name).toBe(true);
    }
  });

  it("has no loop parameter on a stateful sound, does not offer the legacy rotate, and offers break seal before calibration", () => {
    const stateful = findCapability("sound.play-stateful")?.params;
    expect(stateful?.safeParse({ soundIndex: 1, loop: true }).success).toBe(false);
    expect(stateful?.safeParse({ soundIndex: 1, loop: false }).success).toBe(false);
    const rotate = findCapability("mechanics.rotate");
    expect(rotate?.availability).toBe("not-exposed");
    expect(rotate && isCommandable(rotate)).toBe(false);
    // GAP-HW-006: the M1 spike showed it plays on an uncalibrated tower and moves nothing.
    expect(findCapability("seals.break")?.availability).toBe("available");
  });

  it("limits glyphs to the 5 in the catalog", () => {
    expect(glyphSchema.options).toHaveLength(5);
    expect(glyphSchema.options).toEqual(Object.keys(GLYPHS));
  });
});

// --- No raw bytes (decision D12, spec §8) ---------------------------------------------

type Node = { path: string; schema: z.ZodType };

/** Every schema node under `schema`, with the path that leads to it. */
const walk = (schema: z.ZodType, path: string): Node[] => {
  const def = schema.def as {
    type: string;
    shape?: Record<string, z.ZodType>;
    innerType?: z.ZodType;
    element?: z.ZodType;
  };
  const children: Node[] = [];
  if (def.type === "object") {
    for (const [key, child] of Object.entries(def.shape ?? {})) {
      children.push(...walk(child, `${path}.${key}`));
    }
  }
  if (def.innerType) children.push(...walk(def.innerType, path));
  if (def.element) children.push(...walk(def.element, `${path}[]`));
  return [{ path, schema }, ...children];
};

const checksOf = (schema: z.ZodType) =>
  (schema.def.checks ?? []).map(
    (check) => (check._zod.def as { check: string; maximum?: number }) ?? {},
  );

const packet = Array.from({ length: 20 }, (_, index) => index);
const rawValues: readonly unknown[] = [
  new Uint8Array(packet),
  new Uint8Array(packet).buffer,
  packet,
  "000102030405060708090a0b0c0d0e0f10111213",
  "0x00 0x01 0x02",
  "AAECAwQFBgcICQoLDA0ODxAREhM=",
  { type: "Buffer", data: packet },
];

describe("no capability accepts raw bytes", () => {
  it("has no entry for a raw sender, and excludes each one with a reason and a gap", () => {
    for (const member of ["sendTowerCommandDirect", "sendTowerCommand", "sendTowerState"]) {
      expect(
        entries.filter((entry) => (entry.apiMapping as readonly string[]).includes(member)),
        member,
      ).toEqual([]);
      const exclusion = exclusions.find((candidate) => candidate.member === member);
      expect(exclusion?.kind, member).toBe("raw-bytes");
      expect(exclusion?.gapId, member).toMatch(/^GAP-LIB-00[123]$/);
    }
  });

  it("builds every schema from strict objects, enums, booleans and bounded integers only", () => {
    // A string, an unbounded number, an array of numbers, a record, a tuple, `unknown` or
    // a custom type would each be a way to carry a packet. None may appear anywhere.
    for (const entry of entries) {
      for (const { path, schema } of walk(entry.params, entry.id)) {
        const def = schema.def as { type: string; catchall?: z.ZodType; element?: z.ZodType };
        expect(["object", "enum", "boolean", "number", "optional", "array"], path).toContain(
          def.type,
        );
        if (def.type === "object") {
          expect(def.catchall?.def.type, path).toBe("never");
        }
        if (def.type === "number") {
          const { minValue, maxValue } = schema as z.ZodNumber;
          expect((schema as z.ZodNumber).format, path).toBe("safeint");
          expect(Number.isSafeInteger(minValue) && (minValue ?? -1) >= 0, path).toBe(true);
          expect(Number.isSafeInteger(maxValue) && (maxValue ?? Infinity) <= 120_000, path).toBe(
            true,
          );
        }
        if (def.type === "array") {
          expect(def.element?.def.type, path).toBe("object");
          const max = checksOf(schema).find((check) => check.check === "max_length")?.maximum;
          expect(max, path).toBeLessThanOrEqual(12);
        }
      }
    }
  });

  it("names no field after a packet, a buffer or bytes", () => {
    for (const entry of entries) {
      for (const { path } of walk(entry.params, entry.id)) {
        const field = path.slice(entry.id.length);
        expect(field, path).not.toMatch(/byte|packet|buffer|hex|raw|payload|data|command/i);
      }
    }
  });

  it("rejects a Uint8Array, a byte array and a hex string in every field, and as an extra field", () => {
    for (const entry of entries) {
      const valid = examples[entry.id as CapabilityId].valid as Record<string, unknown>;
      for (const raw of rawValues) {
        expect(entry.params.safeParse({ ...valid, bytes: raw }).success, entry.id).toBe(false);
        for (const key of Object.keys(entry.params.shape)) {
          expect(
            entry.params.safeParse({ ...valid, [key]: raw }).success,
            `${entry.id}.${key}`,
          ).toBe(false);
        }
      }
    }
  });

  it("carries nothing through when the params themselves are bytes", () => {
    // Zod reads an object's enumerable keys and builds a new object from the ones it
    // knows. A value with no enumerable keys, such as an ArrayBuffer, therefore passes an
    // all-optional schema, and what comes out is a new empty object, not the buffer. It
    // cannot arrive over the WebSocket, where params are JSON. The rule this test pins
    // down is the one the executor relies on: use the parsed output, never the input.
    for (const entry of entries) {
      for (const raw of rawValues) {
        const result = entry.params.safeParse(raw);
        if (result.success) {
          expect(result.data, entry.id).toEqual({});
          expect(Object.getPrototypeOf(result.data), entry.id).toBe(Object.prototype);
        }
      }
      // A typed array has its indexes as keys, so every schema rejects it outright.
      expect(entry.params.safeParse(new Uint8Array(packet)).success, entry.id).toBe(false);
      expect(entry.params.safeParse(packet).success, entry.id).toBe(false);
      expect(entry.params.safeParse(rawValues[3]).success, entry.id).toBe(false);
    }
  });
});
