import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  CLIENT_MESSAGE_TYPES,
  clientMessageSchema,
  commandLifecyclePayloadSchema,
  commandMessageSchema,
  commandPayloadSchema,
  END_STAGES,
  envelopeSchema,
  HELD_LIGHT_SEQUENCES,
  helloPayloadSchema,
  inventory,
  isCommandable,
  lifecycleStageSchema,
  PROTOCOL_VERSION,
  serverMessageSchema,
  toInventoryEntry,
  validateCommand,
} from "./index.ts";

const hello = { v: PROTOCOL_VERSION, type: "hello", payload: { clientLabel: "iPad" } };

const welcome = {
  v: PROTOCOL_VERSION,
  type: "welcome",
  correlationId: "m-1",
  payload: {
    clientId: "c-1",
    versions: {
      protocol: PROTOCOL_VERSION,
      server: "0.0.0",
      node: "v24.4.1",
      library: "7.1.2",
      data: "3.0.0",
    },
    inventory: inventory.map(toInventoryEntry),
    tower: "mock",
  },
};

describe("clientMessageSchema", () => {
  it("accepts hello", () => {
    expect(clientMessageSchema.parse(hello)).toEqual(hello);
  });

  it("rejects hello with an empty or missing clientLabel", () => {
    expect(clientMessageSchema.safeParse({ ...hello, payload: { clientLabel: "" } }).success).toBe(
      false,
    );
    expect(clientMessageSchema.safeParse({ ...hello, payload: {} }).success).toBe(false);
  });

  it("rejects extra payload keys", () => {
    const extra = { ...hello, payload: { clientLabel: "iPad", bytes: "0a0b" } };
    expect(clientMessageSchema.safeParse(extra).success).toBe(false);
  });

  it("rejects server-only and unknown types", () => {
    expect(clientMessageSchema.safeParse(welcome).success).toBe(false);
    expect(clientMessageSchema.safeParse({ ...hello, type: "raw" }).success).toBe(false);
  });

  it("lists the client message types", () => {
    // Listed by hand on purpose: a new way for a client to reach the service is a reviewed change.
    expect(CLIENT_MESSAGE_TYPES).toEqual([
      "hello",
      "connect",
      "disconnect",
      "reconnect",
      "calibrate",
      "command",
      "restoreState",
    ]);
  });

  it.each(["connect", "disconnect", "reconnect", "calibrate"])(
    "accepts %s with an empty payload and nothing else",
    (type) => {
      const base = { v: PROTOCOL_VERSION, type, payload: {} };
      expect(clientMessageSchema.safeParse(base).success).toBe(true);
      expect(clientMessageSchema.safeParse({ ...base, payload: { force: true } }).success).toBe(
        false,
      );
      expect(clientMessageSchema.safeParse({ ...base, payload: undefined }).success).toBe(false);
    },
  );

  it("accepts a command only with an id, a capability id and params", () => {
    const command = {
      v: PROTOCOL_VERSION,
      type: "command",
      id: "m-7",
      payload: { capabilityId: "sound.play", params: { soundIndex: 1 } },
    };
    expect(clientMessageSchema.safeParse(command).success).toBe(true);
    const { id: _id, ...noId } = command;
    expect(clientMessageSchema.safeParse(noId).success).toBe(false);
    expect(
      clientMessageSchema.safeParse({ ...command, payload: { params: { soundIndex: 1 } } }).success,
    ).toBe(false);
    expect(
      clientMessageSchema.safeParse({
        ...command,
        payload: { ...command.payload, bytes: "0010420000" },
      }).success,
    ).toBe(false);
  });

  it("accepts restoreState with a yes or a no", () => {
    const restore = { v: PROTOCOL_VERSION, type: "restoreState", payload: { accept: false } };
    expect(clientMessageSchema.safeParse(restore).success).toBe(true);
    expect(clientMessageSchema.safeParse({ ...restore, payload: {} }).success).toBe(false);
  });
});

// --- No raw bytes (decision D12, spec §3.2) --------------------------------------------
// inventory.test.ts proves that no capability's params can hold free-form data. This proves the
// rest: that `command.params` is the only open field a client can send, and that it reaches
// nothing until the inventory has checked it.

/** Every place in a schema where a client could put a value of its own choosing. */
const openFields = (schema: z.ZodType, path: string): string[] => {
  const def = schema.def as {
    type: string;
    shape?: Record<string, z.ZodType>;
    catchall?: z.ZodType;
    innerType?: z.ZodType;
    element?: z.ZodType;
    options?: z.ZodType[];
  };
  switch (def.type) {
    case "object": {
      const loose = def.catchall?.def.type === "never" ? [] : [`${path} (extra keys)`];
      return [
        ...loose,
        ...Object.entries(def.shape ?? {}).flatMap(([key, child]) =>
          openFields(child, `${path}.${key}`),
        ),
      ];
    }
    case "optional":
    case "nullable":
      return def.innerType ? openFields(def.innerType, path) : [path];
    case "array":
      return def.element ? openFields(def.element, `${path}[]`) : [path];
    case "union":
      return (def.options ?? []).flatMap((option) => openFields(option, path));
    case "literal":
    case "enum":
    case "boolean":
      return [];
    default:
      // Strings, numbers, unknown, records and anything not listed above.
      return [path];
  }
};

describe("no client message carries raw bytes", () => {
  it("has no open field except the envelope ids, the client label and command.params", () => {
    const open = clientMessageSchema.options.flatMap((option) =>
      openFields(option, option.shape.type.value),
    );
    const envelope = (type: string) => [`${type}.id`, `${type}.correlationId`];
    expect(open.sort()).toEqual(
      [
        ...CLIENT_MESSAGE_TYPES.flatMap(envelope),
        "hello.payload.clientLabel",
        "command.payload.capabilityId",
        "command.payload.params",
      ].sort(),
    );
  });

  it("bounds every string a client can send, apart from params", () => {
    expect(helloPayloadSchema.shape.clientLabel.maxLength).toBe(64);
    expect(commandPayloadSchema.shape.capabilityId.maxLength).toBe(64);
    expect(commandMessageSchema.shape.id.maxLength).toBe(64);
    expect(envelopeSchema.shape.id.unwrap().maxLength).toBe(64);
    expect(envelopeSchema.shape.correlationId.unwrap().maxLength).toBe(64);
  });

  it("lets params through only as the inventory schema's own output", () => {
    const bytes = [0x00, 0x10, 0x42];
    for (const params of [
      "0010420000",
      bytes,
      { bytes },
      { soundIndex: 1, bytes },
      { hex: "00" },
    ]) {
      expect(validateCommand("sound.play", params).ok, JSON.stringify(params)).toBe(false);
    }
    // Params that are valid on their own are refused once an extra key rides along.
    const valid: [string, object][] = [
      ["sound.play", { soundIndex: 1 }],
      ["lighting.all-on", {}],
      ["mechanics.rotate-with-state", { top: "east", middle: "north", bottom: "north" }],
      ["seals.break", { seal: { side: "north", level: "top" } }],
    ];
    for (const [id, params] of valid) {
      expect(validateCommand(id, params).ok, id).toBe(true);
      for (const extra of [{ bytes }, { hex: "0010" }, { data: "AAEC" }]) {
        expect(validateCommand(id, { ...params, ...extra }), id).toMatchObject({
          ok: false,
          reason: "invalid-params",
        });
      }
    }
  });
});

describe("validateCommand", () => {
  it("returns the parsed params for a commandable capability", () => {
    expect(validateCommand("sound.play", { soundIndex: 1 })).toEqual({
      ok: true,
      command: { capabilityId: "sound.play", params: { soundIndex: 1 } },
    });
  });

  it("names the field that is wrong", () => {
    const result = validateCommand("sound.play", { soundIndex: 999 });
    expect(result).toMatchObject({ ok: false, reason: "invalid-params" });
    if (result.ok) throw new Error("expected a rejection");
    expect(result.issues.map((issue) => issue.path)).toEqual([["soundIndex"]]);
    expect(result.issues[0]?.message).toBeTruthy();
  });

  it("reports nothing of the client's own text, and always fits a rejected lifecycle", () => {
    const hostile = [
      { soundIndex: 1, ["k".repeat(5000)]: 1 },
      Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`key-${i}`, "x".repeat(1000)])),
      { soundIndex: "9".repeat(5000) },
      "x".repeat(5000),
      { seal: { side: "n".repeat(5000), level: { deep: { deeper: { deepest: [1, 2, 3] } } } } },
    ];
    for (const id of ["sound.play", "seals.break", "lighting.set"]) {
      for (const params of hostile) {
        const result = validateCommand(id, params);
        if (result.ok) throw new Error("expected a rejection");
        expect(JSON.stringify(result.issues)).not.toMatch(/kkkk|xxxx|nnnn|9999/);
        const lifecycle = commandLifecyclePayloadSchema.safeParse({
          commandId: "m-7",
          capabilityId: id,
          clientId: "c-1",
          stage: "rejected",
          at: 1,
          reason: result.reason,
          issues: result.issues,
        });
        expect(lifecycle.success, id).toBe(true);
      }
    }
  });

  it("refuses an id that is not in the inventory", () => {
    expect(validateCommand("tower.raw", {})).toEqual({
      ok: false,
      reason: "unknown-capability",
      issues: [],
    });
  });

  it("refuses every inventory entry that is not commandable, whatever its params", () => {
    const others = inventory.filter((entry) => !isCommandable(entry));
    expect(others.length).toBeGreaterThan(0);
    for (const entry of others) {
      expect(validateCommand(entry.id, {}), entry.id).toMatchObject({
        ok: false,
        reason: "not-commandable",
      });
    }
    // The legacy rotate and the lifecycle actions in particular (GAP-HW-009, D9).
    expect(others.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(["mechanics.rotate", "calibration.calibrate", "connection.connect"]),
    );
  });

  it("refuses a held light sequence", () => {
    for (const sequence of HELD_LIGHT_SEQUENCES) {
      expect(validateCommand("lighting.sequence", { sequence }).ok, sequence).toBe(false);
    }
  });
});

describe("serverMessageSchema", () => {
  it("accepts welcome", () => {
    expect(serverMessageSchema.parse(welcome)).toEqual(welcome);
  });

  it("sends every inventory entry in welcome as JSON, without its params schema", () => {
    const entries = welcome.payload.inventory;
    expect(entries.map((entry) => entry.id)).toEqual(inventory.map((entry) => entry.id));
    // What arrives is what was sent: nothing in an entry is lost by JSON.
    expect(JSON.parse(JSON.stringify(entries))).toEqual(entries);
    // Every field of a capability travels, except its schema, plus `commandable`. A field added to
    // the inventory and not to the wire form fails here.
    for (const [index, entry] of entries.entries()) {
      const source = Object.keys(inventory[index] ?? {}).filter((key) => key !== "params");
      expect(Object.keys(entry).sort()).toEqual([...source, "commandable"].sort());
    }
    expect(entries.filter((entry) => entry.commandable).map((entry) => entry.id)).toEqual(
      inventory.filter(isCommandable).map((entry) => entry.id),
    );
  });

  it("accepts error with and without actionable text", () => {
    const error = {
      v: PROTOCOL_VERSION,
      type: "error",
      payload: { code: "invalid-json", message: "Message is not valid JSON." },
    };
    expect(serverMessageSchema.safeParse(error).success).toBe(true);
    const withAction = { ...error, payload: { ...error.payload, actionable: "Send JSON." } };
    expect(serverMessageSchema.safeParse(withAction).success).toBe(true);
  });

  it("accepts connection with and without a device and an error", () => {
    const connection = {
      v: PROTOCOL_VERSION,
      type: "connection",
      payload: { state: "connected", calibration: "uncalibrated" },
    };
    expect(serverMessageSchema.safeParse(connection).success).toBe(true);
    const device = {
      manufacturerName: "Restoration Games LLC",
      modelNumber: "ReturnToDarkTower",
      serialNumber: null,
      hardwareRevision: "1.11",
      firmwareRevision: null,
      softwareRevision: "1.0.0",
    };
    expect(
      serverMessageSchema.safeParse({ ...connection, payload: { ...connection.payload, device } })
        .success,
    ).toBe(true);
    const failed = {
      state: "bluetooth-unavailable",
      calibration: "uncalibrated",
      error: {
        code: "bluetooth-unavailable",
        message: "Bluetooth is off.",
        actionable: "Turn it on.",
      },
    };
    expect(serverMessageSchema.safeParse({ ...connection, payload: failed }).success).toBe(true);
    expect(
      serverMessageSchema.safeParse({ ...connection, payload: { state: "connected" } }).success,
    ).toBe(false);
    expect(
      serverMessageSchema.safeParse({
        ...connection,
        payload: { state: "selecting-device", calibration: "uncalibrated" },
      }).success,
    ).toBe(false);
  });

  it("keeps an unavailable state value free of any value", () => {
    const state = (snapshot: unknown) => ({
      v: PROTOCOL_VERSION,
      type: "state",
      payload: { snapshot },
    });
    const current = { freshness: "current", value: 2, origin: "device-reported", updatedAt: 1 };
    const unavailable = { freshness: "unavailable", origin: "unknown" };
    expect(
      serverMessageSchema.safeParse(
        state({ "skulls.count": current, "battery.level": unavailable }),
      ).success,
    ).toBe(true);
    // Unavailable with a value would let a client show a stale number as if it were known.
    expect(
      serverMessageSchema.safeParse(state({ "battery.level": { ...unavailable, value: 0 } }))
        .success,
    ).toBe(false);
    // Current without a value or a time is not a reading.
    const { value: _value, ...noValue } = current;
    expect(serverMessageSchema.safeParse(state({ "skulls.count": noValue })).success).toBe(false);
  });

  it("carries a pending restore with the state, and nothing else beside it", () => {
    const stale = { freshness: "stale", value: 2, origin: "device-reported", updatedAt: 1 };
    const message = {
      v: PROTOCOL_VERSION,
      type: "state",
      payload: {
        snapshot: {},
        pendingRestore: { savedAt: 5, snapshot: { "battery.level": stale } },
      },
    };
    expect(serverMessageSchema.safeParse(message).success).toBe(true);
    expect(
      serverMessageSchema.safeParse({
        ...message,
        payload: { ...message.payload, pendingRestore: { snapshot: {} } },
      }).success,
    ).toBe(false);
    expect(
      serverMessageSchema.safeParse({ ...message, payload: { ...message.payload, restored: true } })
        .success,
    ).toBe(false);
  });

  it("accepts each lifecycle stage, and ends a command in one of five", () => {
    const lifecycle = (payload: object) => ({
      v: PROTOCOL_VERSION,
      type: "command.lifecycle",
      payload: { commandId: "m-7", capabilityId: "sound.play", clientId: "c-1", at: 1, ...payload },
    });
    for (const stage of lifecycleStageSchema.options) {
      expect(serverMessageSchema.safeParse(lifecycle({ stage })).success, stage).toBe(true);
    }
    expect([...END_STAGES].sort()).toEqual(
      ["confirmed", "failed", "indeterminate", "rejected", "timed-out"].sort(),
    );
    const rejected = lifecycle({
      stage: "rejected",
      reason: "invalid-params",
      issues: [{ path: ["soundIndex"], message: "Too big" }],
    });
    expect(serverMessageSchema.safeParse(rejected).success).toBe(true);
    expect(serverMessageSchema.safeParse(lifecycle({ stage: "retried" })).success).toBe(false);
  });

  it("rejects an unknown error code", () => {
    const error = { v: PROTOCOL_VERSION, type: "error", payload: { code: "nope", message: "x" } };
    expect(serverMessageSchema.safeParse(error).success).toBe(false);
  });
});
