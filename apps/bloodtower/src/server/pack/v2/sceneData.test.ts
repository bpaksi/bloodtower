import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { initPlayState } from "../../../engine/loops/chapter/playState.ts";
import {
  configurePicks,
  ensurePicks,
  setHeroHp,
  setPurse,
} from "../../../engine/loops/encounter/picks.ts";
import { AMBUSH, HERALD, LOCK } from "../../../engine/loops/quest/fixtures.ts";
import { beginQuest, chooseOption } from "../../../engine/loops/quest/quest.ts";
import { configureQuestsFromPack, ensureQuests } from "../../../engine/loops/quest/store.ts";
import { sceneFromPack } from "../../../engine/loops/scene/scene.ts";
import { PROVING_GROUNDS_PLAY } from "../../../engine/loops/session/playContent.ts";
import { lintPath } from "../../scripts/packLint.ts";
import { loadPackV2Dir, type PackV2LoadResult } from "./load.ts";

const repoRoot = join(import.meta.dirname, "../../../../../../");
const packsDir = join(repoRoot, "packs");

/** Herald, Ambush and Lock from quest/fixtures.ts, written as pack YAML (C3-18). */
const SCENE_YAML = `
scenes:
  - id: herald
    options:
      - {id: pay, label: Ask for pay, effects: [{kind: gold, amount: 10}]}
      - {id: job, label: Take the job, effects: [{kind: item, item: tomas-map}]}
  - id: ambush
    options:
      - {id: fight, label: Fight them, effects: [{kind: battle}, {kind: flag, flag: fought}]}
      - {id: toll, label: Pay the toll, cost: {kind: toll}, effects: [{kind: flag, flag: paid}]}
  - id: lock
    options:
      - {id: open, label: Use the Signet, needs_item: signet, effects: [{kind: flag, flag: gate-open}]}
      - {id: wait, label: Turn back, effects: [{kind: flag, flag: turned-back}]}
items:
  - {id: tomas-map, label: Tomas's Map, from: {quest: herald, option: job}}
  - {id: signet, label: The Signet, from: {quest: barrow}}
endings:
  win:
    - {id: paid-way, when: {type: flag, flag: paid}, text: "[COPY: the toll was paid]"}
    - {id: fought-way, when: {type: flag, flag: fought}, text: "[COPY: they fought]"}
  loss:
    - {way: corruption, text: "[COPY: corruption]"}
    - {way: skulls, text: "[COPY: skulls]"}
    - {way: buildings, text: "[COPY: buildings]"}
`;

const QUESTS = [
  {
    id: "herald",
    quest_type: "ruins",
    place: { space: "N-egans-end", type: "village" },
    scene: "herald",
  },
  {
    id: "ambush",
    quest_type: "encampment",
    place: { space: "N-muted-forest", type: "wild" },
    scene: "ambush",
  },
  { id: "barrow", quest_type: "tomb" },
  { id: "lock", quest_type: "fortress", scene: "lock" },
];

type Manifest = Record<string, unknown> & {
  chapters: Array<Record<string, unknown>>;
  scenes?: Array<{ id: string; options: Array<Record<string, unknown>> }>;
  items?: Array<Record<string, unknown>>;
  endings?: Record<string, unknown[]>;
};

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A packs root holding base and a copy of packs/test, its manifest changed by `edit`. */
const loadStory = (edit: (manifest: Manifest) => void): PackV2LoadResult => {
  const root = mkdtempSync(join(tmpdir(), "c3-18-"));
  roots.push(root);
  cpSync(join(packsDir, "base"), join(root, "base"), { recursive: true });
  cpSync(join(packsDir, "test"), join(root, "test"), { recursive: true });
  const file = join(root, "test", "pack.yaml");
  const manifest = parseYaml(readFileSync(file, "utf8")) as Manifest;
  edit(manifest);
  writeFileSync(file, stringifyYaml(manifest));
  return loadPackV2Dir(join(root, "test"), root);
};

/** The test pack plus the scene data above. */
const withScenes = (manifest: Manifest) => {
  Object.assign(manifest, parseYaml(SCENE_YAML));
  const chapter = manifest.chapters[0];
  if (chapter) chapter.quests = structuredClone(QUESTS);
};

const scene = (manifest: Manifest, id: string) => {
  const found = manifest.scenes?.find((s) => s.id === id);
  if (!found) throw new Error(`no scene ${id}`);
  return found;
};

const option = (manifest: Manifest, sceneId: string, optionId: string) => {
  const found = scene(manifest, sceneId).options.find((o) => o.id === optionId);
  if (!found) throw new Error(`no option ${optionId}`);
  return found;
};

const messages = (result: PackV2LoadResult): string[] =>
  result.ok ? [] : result.issues.map((i) => `${i.rule} ${i.path} ${i.message}`);

const story = (result: PackV2LoadResult) => {
  if (!result.ok || result.kind !== "story") {
    throw new Error(`not a loaded story: ${JSON.stringify(messages(result))}`);
  }
  return result.pack;
};

describe("C3-18 EV-01: existing packs still load", () => {
  it.each(["base", "dracula", "test"])("pack:lint passes packs/%s with zero issues", (id) => {
    const report = lintPath(`packs/${id}`, repoRoot);
    expect(report.exitCode).toBe(0);
    // Asset warnings (W-asset) predate this step; no line is a P2 issue.
    expect(report.lines.filter((line) => line.includes("rule=P2-"))).toEqual([]);
    expect(report.lines[0]).toMatch(new RegExp(`^OK ${id} `));
  });

  it("the loaded test story gains none of the new fields", () => {
    const result = loadPackV2Dir(join(packsDir, "test"), packsDir);
    const pack = story(result);
    expect(pack).not.toHaveProperty("scenes");
    expect(pack).not.toHaveProperty("items");
    expect(pack).not.toHaveProperty("endings");
    for (const chapter of pack.chapters) {
      for (const quest of chapter.quests) {
        expect(quest).not.toHaveProperty("place");
        expect(quest).not.toHaveProperty("scene");
      }
    }
  });
});

describe("C3-18 EV-03: a scene holds options, costs, items and effects", () => {
  it("round-trips Herald, Ambush and Lock from YAML to the same PlainScene", () => {
    const pack = story(loadStory(withScenes));
    const byId = new Map((pack.scenes ?? []).map((s) => [s.id, sceneFromPack(s)]));
    expect(byId.get("herald")).toStrictEqual(HERALD);
    expect(byId.get("ambush")).toStrictEqual(AMBUSH);
    expect(byId.get("lock")).toStrictEqual(LOCK);
  });

  it("keeps hp, gold and corruption costs as written", () => {
    const pack = story(
      loadStory((m) => {
        withScenes(m);
        scene(m, "herald").options.push({
          id: "bleed",
          label: "Bleed for it",
          cost: { kind: "hp", amount: 2 },
          effects: [{ kind: "gold", amount: -3 }],
        });
        option(m, "lock", "wait").cost = { kind: "corruption" };
        option(m, "herald", "pay").cost = { kind: "gold", amount: 4 };
      }),
    );
    const packed = pack.scenes?.find((s) => s.id === "herald");
    if (!packed) throw new Error("no herald scene");
    const herald = sceneFromPack(packed);
    expect(herald.options.map((o) => o.cost)).toEqual([
      { kind: "gold", amount: 4 },
      undefined,
      { kind: "hp", amount: 2 },
    ]);
    expect(herald.options[2]?.effects).toEqual([{ kind: "gold", amount: -3 }]);
    const lock = pack.scenes?.find((s) => s.id === "lock");
    expect(lock?.options[1]?.cost).toEqual({ kind: "corruption" });
  });
});

describe("C3-18 EV-04: lint enforces DEC-692", () => {
  it("passes the full scene data, with the one-visible-plus-hidden-battle Ambush", () => {
    const result = loadStory(withScenes);
    expect(messages(result)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("fails a fourth effect, naming the scene and option", () => {
    const result = loadStory((m) => {
      withScenes(m);
      option(m, "ambush", "toll").effects = [
        { kind: "flag", flag: "paid" },
        { kind: "gold", amount: 1 },
        { kind: "flag", flag: "a" },
        { kind: "flag", flag: "b" },
      ];
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-1 .*scene ambush option toll: 1 to 3 effects, found 4/,
    );
  });

  it("fails an option with no effects, naming the scene and option", () => {
    const result = loadStory((m) => {
      withScenes(m);
      option(m, "herald", "pay").effects = [];
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-1 .*scene herald option pay: 1 to 3 effects, found 0/,
    );
  });

  it("fails two battles in one option, naming the scene and option", () => {
    const result = loadStory((m) => {
      withScenes(m);
      option(m, "ambush", "fight").effects = [{ kind: "battle" }, { kind: "battle" }];
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-1 .*scene ambush option fight: at most one battle, found 2/,
    );
  });

  it("fails one option with no hidden battle beside it, naming the scene", () => {
    const result = loadStory((m) => {
      withScenes(m);
      scene(m, "ambush").options = [option(m, "ambush", "toll")];
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-1 .*scene ambush: a one-option scene needs a hidden battle/,
    );
  });

  it("fails four options, naming the scene", () => {
    const result = loadStory((m) => {
      withScenes(m);
      const herald = scene(m, "herald");
      herald.options.push(
        { id: "three", label: "Three", effects: [{ kind: "flag", flag: "c" }] },
        { id: "four", label: "Four", effects: [{ kind: "flag", flag: "d" }] },
      );
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-1 .*scene herald: a scene has 2 or 3 options, found 4/,
    );
  });

  it("fails a scene whose every option is a hidden battle", () => {
    const result = loadStory((m) => {
      withScenes(m);
      option(m, "ambush", "toll").effects = [{ kind: "battle" }];
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-1 .*scene ambush: every option is a hidden battle/,
    );
  });
});

describe("C3-18 EV-05: lint enforces DEC-693", () => {
  it("fails an item cost, naming the option", () => {
    const result = loadStory((m) => {
      withScenes(m);
      option(m, "lock", "open").cost = { kind: "item", item: "signet" };
    });
    expect(result.ok).toBe(false);
    expect(messages(result).join("\n")).toMatch(
      /P2-1 scenes\.2\.options\.0\.cost.*scene lock option open: a cost is gold, hp, corruption or toll/,
    );
  });

  it("fails an unknown cost kind, naming the option", () => {
    const result = loadStory((m) => {
      withScenes(m);
      option(m, "herald", "pay").cost = { kind: "day" };
    });
    expect(messages(result).join("\n")).toMatch(/P2-1 .*scene herald option pay: a cost is gold/);
  });

  it("fails an hp or corruption effect: those are costs only", () => {
    const result = loadStory((m) => {
      withScenes(m);
      option(m, "herald", "pay").effects = [{ kind: "corruption" }];
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-1 .*scene herald option pay: a scene effect is gold, item, flag or battle/,
    );
  });

  it.each([
    { kind: "gold", amount: 3 },
    { kind: "hp", amount: 1 },
    { kind: "corruption" },
    { kind: "toll" },
  ])("passes a $kind cost", (cost) => {
    const result = loadStory((m) => {
      withScenes(m);
      option(m, "herald", "pay").cost = cost;
    });
    expect(messages(result)).toEqual([]);
  });
});

describe("C3-18 EV-06: items, win lines and loss scenes are checked", () => {
  it("fails an item no quest gives, naming the item", () => {
    const result = loadStory((m) => {
      withScenes(m);
      option(m, "herald", "job").effects = [{ kind: "gold", amount: 5 }];
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-2 items\.0\.from .*item tomas-map: scene herald option job does not give it/,
    );
  });

  it("fails an item with no giving quest at all", () => {
    const result = loadStory((m) => {
      withScenes(m);
      m.items?.push({ id: "lost-ring", label: "Ring" });
    });
    expect(messages(result).join("\n")).toMatch(/P2-1 items\.2\.from/);
  });

  it("fails an item given by a missing quest, naming the item", () => {
    const result = loadStory((m) => {
      withScenes(m);
      m.items?.push({ id: "oath-blade", label: "Oath-blade", from: { quest: "shrine" } });
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-2 .*item oath-blade: quest shrine is not declared/,
    );
  });

  it("fails an item given by a missing option, naming the item", () => {
    const result = loadStory((m) => {
      withScenes(m);
      const items = m.items ?? [];
      items[0] = { id: "tomas-map", label: "Map", from: { quest: "herald", option: "steal" } };
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-2 .*item tomas-map: scene herald has no option steal/,
    );
  });

  it("fails an option that gives or needs an undeclared item", () => {
    const result = loadStory((m) => {
      withScenes(m);
      option(m, "herald", "pay").effects = [{ kind: "item", item: "gold-cup" }];
      option(m, "lock", "wait").needs_item = "key";
    });
    const text = messages(result).join("\n");
    expect(text).toMatch(
      /P2-2 .*scene herald option pay gives item gold-cup, which is not declared/,
    );
    expect(text).toMatch(/P2-2 .*scene lock option wait needs item key, which is not declared/);
  });

  it("fails a win line with no condition, naming the line", () => {
    const result = loadStory((m) => {
      withScenes(m);
      m.endings?.win?.push({ id: "plain-win", text: "[COPY: won]" });
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-2 endings\.win\.2\.when .*win line plain-win has no flag condition/,
    );
  });

  it("fails a win line whose condition reads no flag, naming the line", () => {
    const result = loadStory((m) => {
      withScenes(m);
      m.endings?.win?.push({
        id: "day-win",
        when: { type: "day", op: "gte", value: 1 },
        text: "x",
      });
    });
    expect(messages(result).join("\n")).toMatch(/P2-2 .*win line day-win has no flag condition/);
  });

  it("fails a loss way with no scene, naming the way", () => {
    const result = loadStory((m) => {
      withScenes(m);
      m.endings = { ...m.endings, loss: (m.endings?.loss ?? []).slice(0, 2) };
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-2 endings\.loss .*loss way buildings has no scene/,
    );
  });

  it("fails a quest that names an undeclared scene or a space not on the board", () => {
    const result = loadStory((m) => {
      withScenes(m);
      const quests = m.chapters[0]?.quests as Array<Record<string, unknown>>;
      if (quests[3]) quests[3].scene = "gate";
    });
    expect(messages(result).join("\n")).toMatch(
      /P2-2 .*quest lock names scene gate, which is not declared/,
    );
    const offBoard = loadStory((m) => {
      withScenes(m);
      const quests = m.chapters[0]?.quests as Array<Record<string, unknown>>;
      if (quests[0]) quests[0].place = { space: "N-nowhere", type: "village" };
    });
    expect(messages(offBoard).join("\n")).toMatch(/P2-2 .*quest herald stands on space N-nowhere/);
  });
});

describe("C3-18 EV-07: the engine reads the pack", () => {
  const play = (manifestEdit: (m: Manifest) => void) => {
    const pack = story(loadStory(manifestEdit));
    const state = initPlayState("quest", PROVING_GROUNDS_PLAY);
    const group = state.groups[0];
    if (!group) throw new Error("no group");
    group.heroIds = ["h1", "h2"];
    configurePicks(state, { chapter: 1 });
    setPurse(state, group.id, 20);
    for (const hero of group.heroIds) setHeroHp(state, hero, 5, 10);
    configureQuestsFromPack(state, pack);
    return { state, groupId: group.id };
  };

  it("runs the pack's scene through its option as the fixture tests do", () => {
    const { state, groupId } = play(withScenes);
    const store = ensureQuests(state);
    expect(store.defs.map((d) => [d.id, d.chapter])).toEqual([
      ["herald", 1],
      ["ambush", 1],
      ["lock", 1],
    ]);
    expect(store.bySpace).toEqual({ "N-egans-end": "herald", "N-muted-forest": "ambush" });
    const view = beginQuest(state, groupId, "ambush");
    if (!view.ok) throw new Error(view.reason);
    expect(view.view.options.map((o) => o.id)).toEqual(["toll"]);
    const chosen = chooseOption(state, groupId, "ambush", "toll");
    expect(chosen.ok).toBe(true);
    // 20 - toll 10, then the quest gold (5 each, two heroes) as in the fixture-based suite.
    expect(ensurePicks(state).purse[groupId]).toBe(20);
    expect(store.log).toEqual(["cost-toll", "flag:paid"]);
    expect(store.done).toEqual(["ambush"]);
  });

  it("an altered pack scene changes the result", () => {
    const { state, groupId } = play((m) => {
      withScenes(m);
      option(m, "ambush", "toll").cost = { kind: "gold", amount: 3 };
      option(m, "ambush", "toll").effects = [
        { kind: "flag", flag: "paid" },
        { kind: "gold", amount: 7 },
      ];
    });
    const store = ensureQuests(state);
    expect(beginQuest(state, groupId, "ambush").ok).toBe(true);
    expect(chooseOption(state, groupId, "ambush", "toll").ok).toBe(true);
    expect(store.log).toEqual(["cost-gold:3", "flag:paid", "gold:7"]);
    expect(ensurePicks(state).purse[groupId]).toBe(20 - 3 + 7 + 10);
  });
});
