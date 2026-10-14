import { PROTOCOL_VERSION, type ServerMessage } from "tower-poc-protocols";
import { describe, expect, it } from "vitest";
import {
  applyServerMessage,
  applySocketState,
  COMMAND_HISTORY,
  initialView,
  isPending,
  latestCommand,
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
