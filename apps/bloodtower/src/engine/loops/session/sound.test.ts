import { describe, expect, it } from "vitest";
import { project } from "../../views/project.ts";
import { requestMoveRollCue } from "../day/cues.ts";
import { enterConnectEvents, enterWithoutEvents } from "./enterKit.ts";
import type { ShellEvent } from "./events.ts";
import { TEST_STORY } from "./pack.ts";
import { bindShellState, clearShellState, takePendingTowerCommands } from "./shellRef.ts";
import { initialShellState, type ShellState } from "./state.ts";
import { stepShell } from "./stepShell.ts";
import { projectShellView } from "./view.ts";

const run = (events: ShellEvent[]) => {
  let state = initialShellState({ sessionId: "s", seed: "seed", stories: [TEST_STORY] });
  const commands: { capabilityId: string; params: Record<string, unknown> }[] = [];
  for (const event of [
    { kind: "start-session", v: 1, seed: "seed", sessionId: "sess" } as const,
    ...events,
  ]) {
    const result = stepShell(state, event);
    state = result.state;
    for (const effect of result.effects) {
      if (effect.kind === "tower-command") {
        commands.push({ capabilityId: effect.capabilityId, params: effect.params });
      }
    }
  }
  return { state, commands };
};

const labels = (state: ShellState, deviceId: string) =>
  project(projectShellView(state), { kind: "device", deviceId }).actions.map((action) =>
    action.open ? action.label : `${action.label} (disabled)`,
  );

const boardLine = (state: ShellState) =>
  project(projectShellView(state), { kind: "board" }).levels.find((level) =>
    level.id.startsWith("volume-line"),
  );

const play = (deviceId: string, level: number): ShellEvent => ({
  kind: "volume-play",
  v: 1,
  deviceId,
  level,
});
const answer = (deviceId: string, a: "keep" | "again"): ShellEvent => ({
  kind: "volume-answer",
  v: 1,
  deviceId,
  answer: a,
});

describe("Pick story opens on the volume step on the connect track (CU/11 EV-01, EV-03, EV-04)", () => {
  it("connect track: each iPad's first buttons are the volumes, with no unlock step", () => {
    const { state, commands } = run([
      ...enterConnectEvents(),
      { kind: "device-join", v: 1, deviceId: "ipad-1" },
    ]);
    expect(state.screen).toBe("pick-story");
    for (const id of ["ipad-0", "ipad-1"]) {
      expect(labels(state, id)).toEqual([
        "Choose Proving Grounds",
        "Volume 0",
        "Volume 1",
        "Volume 2",
        "Keep (disabled)",
        "Try another",
      ]);
    }
    expect(boardLine(state)?.id).toBe("volume-line");
    expect(commands.filter((c) => c.capabilityId === "sound.play-stateful")).toEqual([]);
  });

  it("without the tower: no volume step, no volume line, no sound command, story list at once", () => {
    const { state, commands } = run([
      ...enterWithoutEvents(),
      { kind: "device-join", v: 1, deviceId: "ipad-1" },
    ]);
    expect(state.screen).toBe("pick-story");
    expect(labels(state, "ipad-0")).toEqual(["Choose Proving Grounds"]);
    expect(boardLine(state)).toBeUndefined();
    expect(commands.filter((c) => c.capabilityId === "sound.play-stateful")).toEqual([]);
    const pressed = stepShell(state, play("ipad-0", 1));
    expect(pressed.effects.filter((e) => e.kind === "tower-command")).toEqual([]);
    expect(pressed.state.sound).toEqual({});
  });

  it("with the tower: one Dungeon Complete per press; Keep opens on the tower's answer; Keep stores the last", () => {
    const events: ShellEvent[] = [...enterConnectEvents(), play("ipad-0", 1)];
    const first = run(events);
    expect(first.commands.filter((c) => c.capabilityId === "sound.play-stateful")).toEqual([
      { capabilityId: "sound.play-stateful", params: { soundIndex: 58, volume: 1 } },
    ]);
    expect(labels(first.state, "ipad-0")).toContain("Keep (disabled)");

    const played = stepShell(first.state, {
      kind: "volume-result",
      v: 1,
      deviceId: "ipad-0",
      level: 1,
      ok: true,
    }).state;
    expect(labels(played, "ipad-0")).toContain("Keep");

    const again = stepShell(played, answer("ipad-0", "again")).state;
    expect(labels(again, "ipad-0")).toContain("Keep (disabled)");
    const second = stepShell(again, play("ipad-0", 2));
    expect(second.effects.filter((e) => e.kind === "tower-command")).toHaveLength(1);
    const done = stepShell(
      stepShell(second.state, {
        kind: "volume-result",
        v: 1,
        deviceId: "ipad-0",
        level: 2,
        ok: true,
      }).state,
      answer("ipad-0", "keep"),
    ).state;
    expect(done.keptVolume).toBe(2);

    // The next tower sound that takes a volume uses the kept one.
    bindShellState(done);
    requestMoveRollCue();
    clearShellState();
    expect(takePendingTowerCommands()).toEqual([
      { capabilityId: "sound.play-stateful", params: { soundIndex: 1, volume: 2 } },
    ]);
  });

  it("a tower that did not play the sound leaves Keep disabled", () => {
    const failed = stepShell(run([...enterConnectEvents(), play("ipad-0", 0)]).state, {
      kind: "volume-result",
      v: 1,
      deviceId: "ipad-0",
      level: 0,
      ok: false,
    }).state;
    expect(labels(failed, "ipad-0")).toContain("Keep (disabled)");
    expect(stepShell(failed, answer("ipad-0", "keep")).state.keptVolume).toBeNull();
  });

  it("a second volume press while the tower is playing sends nothing", () => {
    const first = run([...enterConnectEvents(), play("ipad-0", 0)]);
    const second = stepShell(first.state, play("ipad-0", 1));
    expect(second.effects.filter((e) => e.kind === "tower-command")).toEqual([]);
  });
});

describe("an old sound-unlock event (CU/11 EV-12, EV-15)", () => {
  const old = { kind: "sound-unlock", v: 1, deviceId: "ipad-0" } as ShellEvent;

  it("is accepted with exactly one debug line naming it, and changes no state", () => {
    const { state } = run([...enterConnectEvents()]);
    const result = stepShell(state, old);
    expect(result.logs).toHaveLength(1);
    expect(result.logs?.[0]?.level).toBe("debug");
    expect(result.logs?.[0]?.message).toContain("sound-unlock");
    expect(result.effects).toEqual([]);
    expect(result.state).toEqual({ ...state, eventSeq: state.eventSeq + 1 });
    expect(labels(result.state, "ipad-0")).toEqual(labels(state, "ipad-0"));
  });

  it("is not the unknown-event path: a made-up kind still throws, with no log line", () => {
    const { state } = run([...enterConnectEvents()]);
    const madeUp = { kind: "sound-unlock-two", v: 1, deviceId: "ipad-0" } as unknown as ShellEvent;
    expect(() => stepShell(state, madeUp)).toThrow(/Invalid shell event/);
    expect(stepShell(state, old).logs).toHaveLength(1);
  });
});
