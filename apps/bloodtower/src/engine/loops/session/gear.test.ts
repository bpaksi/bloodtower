import { describe, expect, it } from "vitest";
import { initPlayState } from "../chapter/playState.ts";
import { applyFixPosition, applyGear } from "./gear.ts";
import { PROVING_GROUNDS_PLAY } from "./playContent.ts";
import { initialShellState } from "./state.ts";

describe("gear panels", () => {
  it("first open wins and a second open changes nothing", () => {
    let state = initialShellState({ sessionId: "s", seed: "seed" });
    state = applyGear(state, { deviceId: "device-a", action: "open", item: "volume" });
    expect(state.gearOpens).toBe(1);
    expect(state.gearPaused).toBe(true);
    expect(state.gearOwner).toBe("device-a");
    const again = applyGear(state, { deviceId: "device-b", action: "open", item: "volume" });
    expect(again.gearOpens).toBe(1);
    expect(again.gearOwner).toBe("device-a");
    expect(again.gearPanel).toBe("volume");
  });

  it("keep stores the volume and done clears the panel", () => {
    let state = initialShellState({ sessionId: "s", seed: "seed" });
    state = applyGear(state, { deviceId: "device-a", action: "open", item: "volume" });
    state = applyGear(state, {
      deviceId: "device-a",
      action: "pick",
      pick: "Volume 0",
      volume: 0,
    });
    state = applyGear(state, { deviceId: "device-a", action: "keep-volume", volume: 0 });
    expect(state.towerVolume).toBe(0);
    state = applyGear(state, { deviceId: "device-a", action: "done" });
    expect(state.gearPanel).toBeNull();
    expect(state.gearPaused).toBe(false);
    expect(state.towerVolume).toBe(0);
    state = applyGear(state, { deviceId: "device-a", action: "open", item: "volume" });
    expect(state.towerVolume).toBe(0);
  });

  it("a swap survives the enriched done event after the panel is cleared", () => {
    let state = initialShellState({ sessionId: "s", seed: "seed" });
    state = {
      ...state,
      holdings: { "hero-a": "device-1", "hero-b": "device-2" },
    };
    state = applyGear(state, {
      deviceId: "device-1",
      action: "open",
      item: "change-who-holds-whom",
    });
    state = applyGear(state, {
      deviceId: "device-1",
      action: "pick",
      pick: "Hero A",
      heroId: "hero-a",
    });
    state = applyGear(state, {
      deviceId: "device-1",
      action: "pick",
      pick: "Hero B",
      heroId: "hero-b",
    });
    const first = state.gearFirstHero;
    const second = state.gearSecondHero;
    state = applyGear(state, { deviceId: "device-1", action: "done" });
    expect(state.holdings["hero-a"]).toBe("device-2");
    expect(state.holdings["hero-b"]).toBe("device-1");
    expect(state.gearPanel).toBeNull();
    const restored = applyGear(
      {
        ...state,
        holdings: { "hero-a": "device-1", "hero-b": "device-2" },
        gearPanel: null,
        gearFirstHero: null,
        gearSecondHero: null,
      },
      { deviceId: "device-1", action: "done", heroId: first ?? "", otherHeroId: second ?? "" },
    );
    expect(restored.holdings["hero-a"]).toBe("device-2");
    expect(restored.gearPaused).toBe(false);
  });
});

describe("Fix my position (CU/05)", () => {
  const seated = () => {
    const play = initPlayState("fix-test", PROVING_GROUNDS_PLAY);
    const state = {
      ...initialShellState({ sessionId: "s", seed: "fix-test" }),
      screen: "play" as const,
      play,
    };
    return { play, state, group: play.groups[0]!, hero: play.groups[0]!.heroIds[0]! };
  };
  const far = (play: ReturnType<typeof initPlayState>, from: string) =>
    play.content.board.spaces.find((s) => s.id !== from && !s.adjacent.includes(from))!.id;

  it("EV-06, EV-31: moves any space, costs nothing, starts nothing, one board line", () => {
    const { play, state, group, hero } = seated();
    const snap = () =>
      JSON.stringify({ ...play, groups: play.groups.map((g) => ({ ...g, spaceId: "" })) });
    const before = snap();
    const seq = play.rngSeq;
    const from = group.spaceId;
    const to = far(play, from);
    const open = applyGear(state, { deviceId: "d", action: "open", item: "game-board-setup" });
    const result = applyFixPosition(open, {
      deviceId: "d",
      action: "pick",
      item: "fix-position",
      heroId: hero,
      pick: to,
    });
    expect(result.error).toBeUndefined();
    expect(group.spaceId).toBe(to);
    expect(play.rngSeq).toBe(seq);
    expect(snap()).toBe(before);
    expect(result.state.gearPicked).toMatch(/'s group is set on .+\.$/);
  });

  it("EV-30: any number in a row; refused in a building or an open event", () => {
    const { play, state, group, hero } = seated();
    for (const id of [
      play.content.board.spaces[3]!.id,
      play.content.board.spaces[5]!.id,
      group.spaceId,
    ]) {
      expect(
        applyFixPosition(state, {
          deviceId: "d",
          action: "pick",
          item: "fix-position",
          heroId: hero,
          pick: id,
        }).error,
      ).toBeUndefined();
      expect(group.spaceId).toBe(id);
    }
    const stayed = group.spaceId;
    group.insideBuilding = true;
    const refused = applyFixPosition(state, {
      deviceId: "d",
      action: "pick",
      item: "fix-position",
      heroId: hero,
      pick: play.content.board.spaces[1]!.id,
    });
    expect(refused.error?.code).toBe("fix-position-not-now");
    expect(refused.error?.message).toBe("Only on the move map or between loops.");
    expect(group.spaceId).toBe(stayed);
  });

  it("EV-08: a missing space or group is refused with its code and moves nothing", () => {
    const { state, group, hero } = seated();
    const from = group.spaceId;
    const badSpace = applyFixPosition(state, {
      deviceId: "d",
      action: "pick",
      item: "fix-position",
      heroId: hero,
      pick: "nowhere",
    });
    const badGroup = applyFixPosition(state, {
      deviceId: "d",
      action: "pick",
      item: "fix-position",
      heroId: "nobody",
      pick: from,
    });
    expect(badSpace.error?.code).toBe("fix-position-bad-target");
    expect(badGroup.error?.code).toBe("fix-position-bad-target");
    expect(group.spaceId).toBe(from);
  });

  it("EV-24: the same pick replayed on a fresh start gives the same space", () => {
    const a = seated();
    const to = far(a.play, a.group.spaceId);
    const event = {
      deviceId: "d",
      action: "pick" as const,
      item: "fix-position",
      heroId: a.hero,
      pick: to,
    };
    applyFixPosition(a.state, event);
    const b = seated();
    applyFixPosition(b.state, event);
    expect(b.group.spaceId).toBe(a.group.spaceId);
  });

  it("EV-30: refused in a battle, a scene, a quest; accepted between loops", () => {
    const { state, group, hero, play } = seated();
    const to = play.content.board.spaces[2]!.id;
    const pick = {
      deviceId: "d",
      action: "pick" as const,
      item: "fix-position",
      heroId: hero,
      pick: to,
    };
    const frame = (loopId: string) =>
      ({ ...state, loops: { ...state.loops, stack: [{ loopId, local: {} }] } }) as never;
    for (const loopId of ["encounter", "quest", "scene", "battle"]) {
      const refused = applyFixPosition(frame(loopId), pick);
      expect(refused.error?.code, loopId).toBe("fix-position-not-now");
    }
    expect(group.spaceId).not.toBe(to);
    expect(applyFixPosition(frame("day"), pick).error).toBeUndefined();
    expect(group.spaceId).toBe(to);
  });

  it("a stray device with no panel of its own is refused", () => {
    const { state, hero, play } = seated();
    const open = applyGear(state, { deviceId: "a", action: "open", item: "game-board-setup" });
    const to = play.content.board.spaces[2]!.id;
    const refused = applyFixPosition(open, {
      deviceId: "b",
      action: "pick",
      item: "fix-position",
      heroId: hero,
      pick: to,
    });
    expect(refused.error?.code).toBe("fix-position-not-now");
  });
});
