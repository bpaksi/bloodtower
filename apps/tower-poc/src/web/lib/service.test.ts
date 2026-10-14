import { PROTOCOL_VERSION, type ServerMessage } from "tower-poc-protocols";
import { describe, expect, it } from "vitest";
import {
  applyServerMessage,
  applySocketState,
  COMMAND_HISTORY,
  initialView,
  isInterrupted,
  isPending,
  latestCommand,
  markSent,
} from "./service.ts";

const connection: ServerMessage = {
  v: PROTOCOL_VERSION,
  type: "connection",
  payload: { state: "connected", calibration: "calibrated" },
};
const lifecycle = (commandId: string, stage: "queued" | "confirmed"): ServerMessage => ({
  v: PROTOCOL_VERSION,
  type: "command.lifecycle",
  payload: { commandId, capabilityId: "sound.play", clientId: "c-1", stage, at: 1 },
});

describe("applyServerMessage", () => {
  it("records the tower's connection and the state as the service sends them", () => {
    const view = applyServerMessage(initialView, connection, 0);
    expect(view.connection).toEqual(connection.payload);
    const state = applyServerMessage(
      view,
      { v: PROTOCOL_VERSION, type: "state", payload: { snapshot: {} } },
      0,
    );
    expect(state.state).toEqual({ snapshot: {} });
  });

  it("collects each command's stages in order, and keeps only the latest commands", () => {
    let view = applyServerMessage(initialView, lifecycle("k-1", "queued"), 0);
    view = applyServerMessage(view, lifecycle("k-1", "confirmed"), 0);
    expect(view.commands["k-1"]?.map((stage) => stage.stage)).toEqual(["queued", "confirmed"]);
    for (let i = 0; i < COMMAND_HISTORY; i += 1) {
      view = applyServerMessage(view, lifecycle(`n-${i}`, "queued"), 0);
    }
    expect(Object.keys(view.commands)).toHaveLength(COMMAND_HISTORY);
    expect(view.commands["k-1"]).toBeUndefined();
  });

  it("keeps the last error with the id of the message it answers", () => {
    const view = applyServerMessage(
      initialView,
      {
        v: PROTOCOL_VERSION,
        type: "error",
        correlationId: "w-1",
        payload: { code: "invalid-state", message: "Already connected." },
      },
      7,
    );
    expect(view.lastError).toEqual({
      code: "invalid-state",
      message: "Already connected.",
      correlationId: "w-1",
      at: 7,
    });
  });
});

describe("applySocketState", () => {
  it("forgets the tower's connection and state when the link to the service goes", () => {
    const online = applySocketState(applyServerMessage(initialView, connection, 0), "online");
    const withCommand = applyServerMessage(online, lifecycle("k-1", "queued"), 0);
    const lost = applySocketState(withCommand, "reconnecting-to-service");
    expect(lost.connection).toBeUndefined();
    expect(lost.state).toBeUndefined();
    expect(lost.welcome).toBeUndefined();
    expect(lost.commands["k-1"]).toHaveLength(1);
  });
});

describe("isPending", () => {
  it("is pending until an end stage", () => {
    expect(isPending(undefined)).toBe(true);
    const queued = lifecycle("k", "queued");
    const confirmed = lifecycle("k", "confirmed");
    if (queued.type !== "command.lifecycle" || confirmed.type !== "command.lifecycle") throw 0;
    expect(isPending([queued.payload])).toBe(true);
    expect(isPending([queued.payload, confirmed.payload])).toBe(false);
  });
});

describe("latestCommand", () => {
  it("finds the newest command for a capability, whoever sent it", () => {
    let view = applyServerMessage(initialView, lifecycle("k-1", "queued"), 0);
    view = applyServerMessage(view, lifecycle("k-2", "queued"), 0);
    view = applyServerMessage(view, lifecycle("k-1", "confirmed"), 0);
    expect(latestCommand(view.commands, "sound.play")?.[0]?.commandId).toBe("k-2");
    expect(latestCommand(view.commands, "lighting.all-on")).toBeUndefined();
  });
});

describe("a lost link to the service", () => {
  it("unlocks a command cut off by the drop, and says its outcome is unknown", () => {
    let view = applySocketState(initialView, "online");
    view = markSent(view, "k-1");
    expect(isPending(view.commands["k-1"], view.interrupted["k-1"])).toBe(true);
    view = applyServerMessage(view, lifecycle("k-1", "queued"), 0);
    view = applySocketState(view, "reconnecting-to-service");
    view = applySocketState(view, "online");
    // The service never replays the end stage, so waiting for it would lock the control forever.
    expect(isPending(view.commands["k-1"], view.interrupted["k-1"])).toBe(false);
    expect(isInterrupted(view, "k-1")).toBe(true);
  });

  it("marks a command sent just before the drop even if no stage had arrived", () => {
    let view = markSent(applySocketState(initialView, "online"), "k-1");
    view = applySocketState(view, "service-unreachable");
    expect(isInterrupted(view, "k-1")).toBe(true);
  });

  it("leaves an ended command alone, and stops calling one interrupted once its end arrives", () => {
    let view = applyServerMessage(initialView, lifecycle("k-1", "queued"), 0);
    view = applyServerMessage(view, lifecycle("k-1", "confirmed"), 0);
    view = applyServerMessage(view, lifecycle("k-2", "queued"), 0);
    view = applySocketState(view, "reconnecting-to-service");
    expect(isInterrupted(view, "k-1")).toBe(false);
    view = applyServerMessage(applySocketState(view, "online"), lifecycle("k-2", "confirmed"), 0);
    expect(isInterrupted(view, "k-2")).toBe(false);
  });

  it("keeps every client id the service has given this page", () => {
    const welcome = (clientId: string): ServerMessage => ({
      v: PROTOCOL_VERSION,
      type: "welcome",
      payload: {
        clientId,
        versions: {
          protocol: PROTOCOL_VERSION,
          server: "0",
          node: "v",
          library: "7.1.2",
          data: "3",
        },
        inventory: [],
        verificationOverlay: {},
        tower: "mock",
      },
    });
    let view = applyServerMessage(initialView, welcome("c-1"), 0);
    view = applySocketState(view, "reconnecting-to-service");
    view = applyServerMessage(applySocketState(view, "online"), welcome("c-2"), 0);
    view = applyServerMessage(view, welcome("c-2"), 0);
    expect(view.ownClientIds).toEqual(["c-1", "c-2"]);
  });

  it("takes a newer Verify overlay and remembers which of its own records were saved", () => {
    const record = {
      id: 1,
      capabilityId: "sound.play",
      result: "pass" as const,
      notes: "",
      diagnosticSessionId: null,
      libraryVersion: "7.1.2",
      appVersion: "0",
      testedAt: 1,
      environment: { tower: "bluetooth" as const, client: "iPad" },
    };
    const changed = (correlationId?: string): ServerMessage => ({
      v: PROTOCOL_VERSION,
      type: "verify.changed",
      ...(correlationId ? { correlationId } : {}),
      payload: { verificationOverlay: { "sound.play": record } },
    });
    const welcomed = applyServerMessage(
      initialView,
      {
        v: PROTOCOL_VERSION,
        type: "welcome",
        payload: {
          clientId: "c-1",
          versions: { protocol: PROTOCOL_VERSION, server: "0", node: "v", library: "7", data: "3" },
          inventory: [],
          verificationOverlay: {},
          tower: "bluetooth",
        },
      },
      0,
    );
    let view = applyServerMessage(welcomed, changed("v-1"), 0);
    expect(view.welcome?.verificationOverlay).toEqual({ "sound.play": record });
    expect(view.savedVerifications).toEqual(["v-1"]);
    // Another device's record: shown, but not one of this page's.
    view = applyServerMessage(view, changed(), 0);
    expect(view.savedVerifications).toEqual(["v-1"]);
    // Before welcome there is no overlay to update; nothing is made up.
    expect(applyServerMessage(initialView, changed("v-2"), 0).welcome).toBeUndefined();
  });
});
