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

const unlock = (deviceId: string): ShellEvent => ({ kind: "sound-unlock", v: 1, deviceId });
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

describe("Pick story starts with sound (EV-01, EV-15, EV-16, EV-17)", () => {
  it("shows only Enable sound until that iPad's own tap", () => {
    const { state, commands } = run([
      ...enterWithoutEvents(),
      { kind: "device-join", v: 1, deviceId: "ipad-1" },
    ]);
    expect(state.screen).toBe("pick-story");
    expect(labels(state, "ipad-0")).toContain("Enable sound");
    expect(labels(state, "ipad-0")).not.toContain("Volume 0");
    expect(boardLine(state)?.id).toBe("volume-line-off");
    expect(commands).toEqual([]);

    const unlocked = run([
      ...enterWithoutEvents(),
      { kind: "device-join", v: 1, deviceId: "ipad-1" },
      unlock("ipad-0"),
    ]).state;
    expect(labels(unlocked, "ipad-0")).toEqual([
      "Choose Proving Grounds",
      "Volume 0",
      "Volume 1",
      "Volume 2",
      "Keep (disabled)",
      "Try another",
    ]);
    expect(labels(unlocked, "ipad-1")).toContain("Enable sound");
    expect(labels(unlocked, "ipad-1")).not.toContain("Volume 0");
    expect(boardLine(unlocked)?.id).toBe("volume-line");
  });

  it("without the tower: a press counts as played at once, sends no tower command, and Keep stores it", () => {
    let { state, commands } = run([...enterWithoutEvents(), unlock("ipad-0")]);
    state = stepShell(state, answer("ipad-0", "keep")).state;
    expect(state.keptVolume).toBeNull();
    const pressed = run([...enterWithoutEvents(), unlock("ipad-0"), play("ipad-0", 1)]);
    expect(pressed.commands).toEqual([]);
    expect(labels(pressed.state, "ipad-0")).toContain("Keep");
    const kept = stepShell(pressed.state, answer("ipad-0", "keep")).state;
    expect(kept.keptVolume).toBe(1);
    expect(labels(kept, "ipad-0")).not.toContain("Volume 1");
    expect(boardLine(kept)).toBeUndefined();
    commands = pressed.commands;
    expect(commands).toEqual([]);
  });

  it("with the tower: one Dungeon Complete per press; Keep opens on the tower's answer; Keep stores the last", () => {
    const events: ShellEvent[] = [...enterConnectEvents(), unlock("ipad-0"), play("ipad-0", 1)];
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
    const failed = stepShell(
      run([...enterConnectEvents(), unlock("ipad-0"), play("ipad-0", 0)]).state,
      { kind: "volume-result", v: 1, deviceId: "ipad-0", level: 0, ok: false },
    ).state;
    expect(labels(failed, "ipad-0")).toContain("Keep (disabled)");
    expect(stepShell(failed, answer("ipad-0", "keep")).state.keptVolume).toBeNull();
  });

  it("a second volume press while the tower is playing sends nothing", () => {
    const first = run([...enterConnectEvents(), unlock("ipad-0"), play("ipad-0", 0)]);
    const second = stepShell(first.state, play("ipad-0", 1));
    expect(second.effects.filter((e) => e.kind === "tower-command")).toEqual([]);
  });
});
