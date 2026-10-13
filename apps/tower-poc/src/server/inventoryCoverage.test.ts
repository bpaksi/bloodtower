import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  type Capability,
  exclusions,
  inventory,
  LED_LAYER_COUNT,
  LEDS_PER_LAYER,
  LIBRARY_BASELINE,
  lightEffectSchema,
  towerCornerSchema,
  towerLevelSchema,
  towerSideSchema,
  VOLUME_LEVEL_COUNT,
} from "tower-poc-protocols";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Coverage test (spec §4 and §8, decision D13): every public member of `UltimateDarkTower`
 * at the pinned version is mapped by an inventory entry or listed in the exclusions with
 * a reason, and neither list names a member the library does not have.
 *
 * It lives in the server package, not next to `inventory.ts`, because it needs the
 * library and the protocols package must not depend on it: protocols is bundled into the
 * web UI.
 *
 * WHAT THIS FILE LOADS, AND WHY THAT IS SAFE
 *
 * It reads `dist/src/UltimateDarkTower.d.ts` as text, imports the library's entry file and
 * constructs one tower object with `BluetoothPlatform.NONE`. It never calls `connect()`
 * and never loads `@stoprocent/noble`, so the Mac's Bluetooth stack is not started.
 * Checked in the installed 7.1.2 code, in both builds (`dist/esm/index.mjs`, which Vitest
 * loads, and `dist/src/*.js`):
 *
 * - The only `require("@stoprocent/noble")` is at the top of `adapters/NodeBluetoothAdapter`.
 *   The entry file does not load that module. `BluetoothAdapterFactory.create` requires it
 *   lazily, in the `NODE` case only. The ESM build wraps it in a lazy initialiser
 *   (`init_NodeBluetoothAdapter`) that is called from that same case only.
 * - The constructor calls the factory only when a platform other than `AUTO` is given.
 *   With `NONE` that loads `NoopBluetoothAdapter`, whose `connect` and
 *   `writeCharacteristic` throw and which registers no listeners. With no config the
 *   adapter is created in `connect()`, where auto-detection in Node would pick `NODE`;
 *   that is why this test passes `NONE` explicitly instead of relying on the default.
 * - The constructor starts no timers. The connection monitor's `setInterval` starts on
 *   connect, and the command queue's timers start when a command is queued.
 *
 * Reading the code is not the only guard. Loading noble means loading a native addon, so
 * `process.dlopen` is replaced with a function that records the call and throws while
 * the library is imported and used, and a test asserts that it was never called and that
 * no noble module is in the `require` cache.
 *
 * WHY THE TYPE FILE AND NOT ONLY THE PROTOTYPE
 *
 * TypeScript `private` members exist at runtime, so the prototype also yields internals,
 * and the callbacks and battery fields are instance properties that are not on the
 * prototype at all. The type file says which members are public, so it is the source of
 * the surface. The runtime object is then compared with it in both directions, so a
 * member the parser missed, or one that is declared but absent, fails the test.
 */

// Imported inside `beforeAll`, after the native-addon guard is in place. A static import
// would run before it.
const loadLibrary = () => import("ultimatedarktower");
type Library = Awaited<ReturnType<typeof loadLibrary>>;
type Tower = InstanceType<Library["UltimateDarkTower"]>;

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(path.dirname(require.resolve(LIBRARY_BASELINE.name)), "../..");

type MemberKind = "method" | "accessor" | "field" | "callback";
type Member = { kind: MemberKind; isPrivate: boolean };

/**
 * Reads the members of `declare class UltimateDarkTower` from the type file. It throws on
 * any member line it does not understand, so a new declaration form cannot be skipped
 * silently.
 */
const parseClassMembers = (source: string): Map<string, Member> => {
  const start = source.indexOf("declare class UltimateDarkTower {");
  const end = source.indexOf("\n}\n", start);
  if (start < 0 || end < 0) throw new Error("class UltimateDarkTower not found in the type file");
  const body = source
    .slice(source.indexOf("\n", start), end)
    // Keep the line count of a comment so line-based matching still works.
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const members = new Map<string, Member>();
  const memberLine = /^(private |protected )?(get |set )?([A-Za-z_$][\w$]*)(\??:|\(|;|<)/;
  for (const line of body.split("\n")) {
    // Members are indented by exactly four spaces. Deeper lines belong to a member's type.
    if (!line.startsWith("    ") || line.startsWith("     ")) continue;
    const text = line.slice(4);
    if (text === "" || /^[})\]]/.test(text)) continue;
    const match = memberLine.exec(text);
    if (!match) throw new Error(`type file line not understood: ${line}`);
    const [, visibility, accessor, name, next] = match;
    if (name === undefined || name === "constructor") continue;
    let kind: MemberKind = "field";
    if (accessor) kind = "accessor";
    else if (next === "(" || next === "<") kind = "method";
    else if (text.includes("=>")) kind = "callback";
    const known = members.get(name);
    if (known && (known.kind !== "accessor" || kind !== "accessor")) {
      throw new Error(`type file declares ${name} twice`);
    }
    members.set(name, { kind, isPrivate: Boolean(visibility) });
  }
  return members;
};

const entries: readonly Capability[] = inventory;
const mapped = entries.flatMap((entry) => entry.apiMapping);
const excluded = exclusions.map((exclusion) => exclusion.member);

const declared = parseClassMembers(
  readFileSync(path.join(packageRoot, "dist/src/UltimateDarkTower.d.ts"), "utf8"),
);
const publicNames = [...declared].filter(([, member]) => !member.isPrivate).map(([name]) => name);
const namesOfKind = (kind: MemberKind) =>
  [...declared]
    .filter(([, member]) => !member.isPrivate && member.kind === kind)
    .map(([name]) => name);

const nativeLoads: string[] = [];
const realDlopen = process.dlopen;
let library: Library;
let tower: Tower;

beforeAll(async () => {
  process.dlopen = (_module: object, filename: string) => {
    nativeLoads.push(filename);
    throw new Error(`native addon load blocked in the coverage test: ${filename}`);
  };
  library = await loadLibrary();
  tower = new library.UltimateDarkTower({ platform: library.BluetoothPlatform.NONE });
});

afterAll(() => {
  process.dlopen = realDlopen;
});

describe("installed library", () => {
  it("is the version the inventory was written against", () => {
    const manifest = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    expect(manifest.name).toBe(LIBRARY_BASELINE.name);
    expect(manifest.version).toBe(LIBRARY_BASELINE.version);
  });

  it("was loaded and constructed without loading noble or any native addon", () => {
    expect(tower.isConnected).toBe(false);
    expect(nativeLoads).toEqual([]);
    expect(Object.keys(require.cache).filter((file) => /noble|bluetooth-hci/i.test(file))).toEqual(
      [],
    );
  });
});

describe("public surface of UltimateDarkTower", () => {
  it("is read from the type file in full", () => {
    // Written out so that an upgrade which adds or removes a member changes a number
    // here, as well as failing the mapping tests below.
    expect({
      methods: namesOfKind("method").length,
      callbacks: namesOfKind("callback").length,
      accessors: namesOfKind("accessor").length,
      fields: namesOfKind("field").length,
    }).toEqual({ methods: 46, callbacks: 7, accessors: 16, fields: 4 });
  });

  it("matches the object at runtime", () => {
    const prototype = Object.getOwnPropertyNames(library.UltimateDarkTower.prototype).filter(
      (name) => name !== "constructor",
    );
    const runtime = new Set([...prototype, ...Object.getOwnPropertyNames(tower)]);
    // Nothing exists at runtime that the type file does not declare, public or private.
    expect([...runtime].filter((name) => !declared.has(name)).sort()).toEqual([]);
    // Every public member the type file declares is really there.
    expect(publicNames.filter((name) => !runtime.has(name)).sort()).toEqual([]);
    // Methods and accessors are on the prototype; callbacks and fields are on the instance.
    for (const name of namesOfKind("method")) {
      expect(typeof library.UltimateDarkTower.prototype[name as "connect"], name).toBe("function");
    }
    for (const name of namesOfKind("callback")) {
      expect(typeof tower[name as "onTowerConnect"], name).toBe("function");
      expect(prototype, name).not.toContain(name);
    }
  });
});

describe("inventory coverage", () => {
  it("maps or excludes every public member", () => {
    const accounted = new Set([...mapped, ...excluded]);
    expect(publicNames.filter((name) => !accounted.has(name)).sort()).toEqual([]);
  });

  it("maps no member that the library does not have", () => {
    expect(mapped.filter((name) => !publicNames.includes(name)).sort()).toEqual([]);
  });

  it("excludes no member that the library does not have", () => {
    expect(excluded.filter((name) => !publicNames.includes(name)).sort()).toEqual([]);
  });

  it("names no private member", () => {
    const privateNames = [...declared].filter(([, member]) => member.isPrivate).map(([n]) => n);
    expect([...mapped, ...excluded].filter((name) => privateNames.includes(name))).toEqual([]);
  });

  it("accounts for every member once", () => {
    const names = [...mapped, ...excluded];
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
    expect(names).toHaveLength(publicNames.length);
  });

  it("maps each kind of entry to the matching kind of member", () => {
    const expected: Record<Capability["kind"], readonly MemberKind[]> = {
      command: ["method"],
      lifecycle: ["method"],
      query: ["method"],
      event: ["callback"],
      property: ["accessor", "field"],
    };
    for (const entry of entries) {
      for (const name of entry.apiMapping) {
        expect(expected[entry.kind], `${entry.id} maps ${name}`).toContain(
          declared.get(name)?.kind,
        );
      }
    }
  });

  it("maps every callback as an event", () => {
    const events = entries.filter((entry) => entry.kind === "event").flatMap((e) => e.apiMapping);
    expect([...events].sort()).toEqual(namesOfKind("callback").sort());
  });

  it("has no entry for a member that takes a packet", () => {
    // The three raw senders and the packet formatter are the only members whose
    // declaration mentions Uint8Array as an argument. `onTowerResponse` hands bytes out.
    for (const name of ["sendTowerCommandDirect", "sendTowerCommand", "commandToPacketString"]) {
      expect(mapped, name).not.toContain(name);
      expect(excluded, name).toContain(name);
    }
    expect(mapped).not.toContain("sendTowerState");
  });
});

describe("values the inventory repeats from the library", () => {
  // `inventory.ts` cannot import the library, so it writes these out. They are compared
  // here so that the copies cannot drift.
  it("has the library's light effects", () => {
    expect(lightEffectSchema.options).toEqual(Object.keys(library.LIGHT_EFFECTS));
  });

  it("has the library's sides and levels in wire order", () => {
    expect(towerSideSchema.options).toEqual([...library.TOWER_SIDES]);
    expect(towerLevelSchema.options).toEqual([...library.TOWER_LEVELS]);
  });

  it("has the library's corners", () => {
    const corners = Object.keys(library.LEDGE_BASE_LIGHT_POSITIONS).map((name) =>
      name.replace("_", "").toLowerCase(),
    );
    expect(towerCornerSchema.options).toEqual(corners);
  });

  it("has the library's LED layer, light and volume counts", () => {
    expect(LED_LAYER_COUNT).toBe(Object.keys(library.TOWER_LAYERS).length);
    expect(LEDS_PER_LAYER).toBe(Object.keys(library.RING_LIGHT_POSITIONS).length);
    expect(LEDS_PER_LAYER).toBe(Object.keys(library.LEDGE_BASE_LIGHT_POSITIONS).length);
    expect(VOLUME_LEVEL_COUNT).toBe(Object.keys(library.VOLUME_DESCRIPTIONS).length);
  });

  it("lists as unsupported exactly the firmware commands with no public method", () => {
    // Of the six firmware commands, towerState, resetCounter and calibration are reached
    // through public methods. A seventh command would fail here and need a decision.
    expect(Object.keys(library.TOWER_COMMANDS).sort()).toEqual([
      "calibration",
      "doorReset",
      "overwriteDrumStates",
      "resetCounter",
      "towerState",
      "unjamDrums",
    ]);
    const unsupported = entries.filter((entry) => entry.availability === "unsupported");
    expect(unsupported.map((entry) => entry.id).sort()).toEqual([
      "mechanics.door-reset",
      "mechanics.overwrite-drum-states",
      "mechanics.unjam-drums",
    ]);
    for (const command of ["doorReset", "unjamDrums", "overwriteDrumStates"]) {
      expect(publicNames, command).not.toContain(command);
      expect(
        unsupported.some((entry) => entry.evidence.includes(`TOWER_COMMANDS.${command}`)),
        command,
      ).toBe(true);
    }
  });
});
