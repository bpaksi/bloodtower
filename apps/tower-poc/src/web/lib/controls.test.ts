import {
  buildParams,
  type CommandLifecyclePayload,
  type ConnectionPayload,
  describeParams,
  findCapability,
  type InventoryEntry,
  type LifecycleStage,
  toInventoryEntry,
  validateCommand,
} from "tower-poc-protocols";
import { describe, expect, it } from "vitest";
import {
  applyChoices,
  controlState,
  describeRequested,
  errorsByField,
  outcomeOf,
} from "./controls.ts";

const entryOf = (id: string): InventoryEntry => {
  const capability = findCapability(id);
  if (!capability) throw new Error(`no capability ${id}`);
  return toInventoryEntry(capability);
};
const sound = entryOf("sound.play");
const rotate = entryOf("mechanics.rotate-with-state");

const tower = (
  state: ConnectionPayload["state"],
  calibration: ConnectionPayload["calibration"] = "uncalibrated",
): ConnectionPayload => ({ state, calibration });

describe("controlState", () => {
  it("enables a command of the service's own record with no tower, but not with no service", () => {
    const mark = entryOf("seals.mark-broken");
    for (const connection of [tower("disconnected"), tower("connected", "calibrating")]) {
      expect(controlState({ online: true, connection, entry: mark })).toEqual({ enabled: true });
    }
    expect(controlState({ online: false, connection: tower("disconnected"), entry: mark })).toEqual(
      {
        enabled: false,
        reason: "The service is not reachable.",
      },
    );
    // Breaking a seal plays it on the tower, so it needs the tower.
    expect(
      controlState({
        online: true,
        connection: tower("disconnected"),
        entry: entryOf("seals.break"),
      }),
    ).toEqual({ enabled: false, reason: "Connect the tower first." });
  });

  it("is disabled while the service is unreachable, whatever was last known", () => {
    expect(
      controlState({ online: false, connection: tower("connected", "calibrated"), entry: sound }),
    ).toEqual({ enabled: false, reason: "The service is not reachable." });
    expect(controlState({ online: true, connection: undefined, entry: sound })).toMatchObject({
      enabled: false,
    });
    expect(
      controlState({ online: true, connection: tower("connected"), entry: undefined }),
    ).toMatchObject({ enabled: false });
  });

  it("is disabled for an entry the service does not offer, even if this page's copy would", () => {
    const entry = { ...sound, commandable: false };
    expect(
      controlState({ online: true, connection: tower("connected", "calibrated"), entry }),
    ).toEqual({ enabled: false, reason: "This service does not offer it." });
  });

  it.each([
    "disconnected",
    "connecting",
    "disconnecting",
    "error",
    "bluetooth-unavailable",
  ] as const)("is disabled while the tower is %s", (state) => {
    expect(controlState({ online: true, connection: tower(state), entry: sound })).toEqual({
      enabled: false,
      reason: "Connect the tower first.",
    });
  });

  it("is disabled for every command while the tower calibrates (D22)", () => {
    for (const entry of [sound, rotate]) {
      expect(
        controlState({ online: true, connection: tower("connected", "calibrating"), entry }),
      ).toEqual({ enabled: false, reason: "The tower is calibrating." });
    }
  });

  it("keeps mechanics disabled until the tower is calibrated (D9), and lights and sounds not", () => {
    const uncalibrated = tower("connected", "uncalibrated");
    expect(controlState({ online: true, connection: uncalibrated, entry: rotate })).toEqual({
      enabled: false,
      reason: "Calibrate the tower first.",
    });
    expect(controlState({ online: true, connection: uncalibrated, entry: sound })).toEqual({
      enabled: true,
    });
    expect(
      controlState({ online: true, connection: tower("connected", "calibrated"), entry: rotate }),
    ).toEqual({ enabled: true });
  });
});

describe("outcomeOf", () => {
  const stages = (...names: LifecycleStage[]): CommandLifecyclePayload[] =>
    names.map((stage) => ({
      commandId: "k-1",
      capabilityId: "sound.play",
      clientId: "c-1",
      stage,
      at: 1,
      ...(stage === "indeterminate" ? { reason: "No answer." } : {}),
    }));

  it("is confirmed only when the tower answered", () => {
    expect(outcomeOf(stages("queued", "started", "write-completed", "confirmed"), false)).toEqual({
      kind: "confirmed",
      label: "Confirmed",
    });
  });

  it("keeps a write the tower did not answer apart from a failure (GAP-HW-010)", () => {
    expect(
      outcomeOf(stages("queued", "started", "write-completed", "indeterminate"), false),
    ).toEqual({ kind: "unconfirmed", label: "Sent, no answer: No answer." });
    // A page that missed the earlier stages does not guess that nothing was written.
    expect(outcomeOf(stages("indeterminate"), false).label).toBe("Sent, no answer: No answer.");
    // The service says so when nothing was written: the library judged the tower already there.
    const unwritten = stages("queued", "started", "indeterminate").map((stage) =>
      stage.stage === "indeterminate" ? { ...stage, written: false as const } : stage,
    );
    expect(outcomeOf(unwritten, false)).toEqual({
      kind: "unconfirmed",
      label: "Not sent: No answer.",
    });
    for (const end of ["failed", "timed-out", "rejected"] as const) {
      expect(outcomeOf(stages("queued", end), false).kind).toBe("failed");
    }
  });

  it("is waiting until an end stage, and unknown when the link dropped first", () => {
    expect(outcomeOf(undefined, false)).toEqual({ kind: "waiting", label: "Sending" });
    expect(outcomeOf(stages("queued", "started"), false)).toEqual({
      kind: "waiting",
      label: "Started",
    });
    expect(outcomeOf(stages("queued"), true).kind).toBe("unknown");
    // An end that arrived is kept, even if the link dropped later.
    expect(outcomeOf(stages("queued", "confirmed"), true).kind).toBe("confirmed");
  });
});

describe("describeRequested", () => {
  const fieldsOf = (id: string) => {
    const capability = findCapability(id);
    if (!capability) throw new Error(`no capability ${id}`);
    const form = describeParams(capability.params);
    if (!form.ok) throw new Error(form.reason);
    return form.fields;
  };

  it("lists each value sent by its field's label, in the form's order", () => {
    expect(
      describeRequested(fieldsOf("seals.break"), { seal: { side: "west", level: "top" } }),
    ).toBe("Seal side west, Seal level top");
    expect(
      describeRequested(fieldsOf("mechanics.rotate-drum"), {
        drumIndex: 0,
        position: 2,
        playSound: true,
      }),
    ).toBe("Drum index 0, Position 2, Play sound yes");
  });

  it("leaves out what was not sent, and is empty for a command with no params", () => {
    expect(describeRequested(fieldsOf("sound.play-stateful"), { soundIndex: 4 })).toBe(
      "Sound index 4",
    );
    expect(describeRequested(fieldsOf("lighting.all-off"), {})).toBe("");
  });
});

describe("errorsByField", () => {
  const sealFields = () => {
    const capability = findCapability("seals.break");
    if (!capability) throw new Error("no seals.break");
    const form = describeParams(capability.params);
    if (!form.ok) throw new Error(form.reason);
    return form.fields;
  };

  it("puts an issue on a nested object left empty on each field inside it", () => {
    const validation = validateCommand("seals.break", buildParams(sealFields(), {}));
    if (validation.ok) throw new Error("an empty seal must not validate");
    const errors = errorsByField(sealFields(), validation.issues);
    expect(Object.keys(errors).sort()).toEqual(["seal.level", "seal.side"]);
  });

  it("puts an issue on one field on that field only", () => {
    const errors = errorsByField(sealFields(), [{ path: ["seal", "side"], message: "Bad side." }]);
    expect(errors).toEqual({ "seal.side": "Bad side." });
  });

  it("shows an issue that matches no field for the whole form, never dropping it", () => {
    expect(errorsByField(sealFields(), [{ path: ["other"], message: "Unknown field." }])).toEqual({
      "": "Unknown field.",
    });
    expect(
      errorsByField(sealFields(), [{ path: [], message: "Name at least one light." }]),
    ).toEqual({ "": "Name at least one light." });
  });
});

describe("applyChoices", () => {
  const fieldsOf = (id: string) => {
    const capability = findCapability(id);
    if (!capability) throw new Error(`no capability ${id}`);
    const form = describeParams(capability.params);
    if (!form.ok) throw new Error(form.reason);
    return form.fields;
  };
  const drum = fieldsOf("mechanics.rotate-drum");

  it("names an integer field's values, and the requested text uses the names", () => {
    const fields = applyChoices(drum, {
      drumIndex: { label: "Drum", names: ["top", "middle", "bottom"] },
      position: { label: "Side", names: ["north", "east", "south", "west"] },
    });
    expect(fields.find((field) => field.key === "drumIndex")).toMatchObject({
      label: "Drum",
      names: ["top", "middle", "bottom"],
    });
    // What is sent is still the number, so the service's schema is unchanged.
    const params = buildParams(fields, { drumIndex: "2", position: "1", playSound: true });
    expect(validateCommand("mechanics.rotate-drum", params).ok).toBe(true);
    expect(describeRequested(fields, params)).toBe("Drum bottom, Side east, Play sound yes");
  });

  it("refuses names that do not fit the field", () => {
    expect(() => applyChoices(drum, { drumIndex: { names: ["top", "middle"] } })).toThrow(
      /do not match/,
    );
    expect(() => applyChoices(drum, { playSound: { names: ["no", "yes"] } })).toThrow(
      /do not match/,
    );
    expect(() => applyChoices(drum, { nothing: { names: [] } })).toThrow(/No field/);
  });
});
