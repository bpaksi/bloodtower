import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Asset } from "bloodtower-protocols";
import { type BoardSpaceInput, buildBoardGraph } from "../../engine/loops/chapter/board.ts";
import type { PlayContent } from "../../engine/loops/chapter/playState.ts";
import { mergeSetupSteps, type ShellStory } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { indexPackAssets, type PackAssetIndex } from "../pack/assets.ts";
import { classifyPackDoor, loadPackV2Dir, type PackV2LoadIssue } from "../pack/v2/load.ts";

export type StoryCatalog = {
  stories: ShellStory[];
  defaultPlay: PlayContent | null;
  issues: PackV2LoadIssue[];
  /** Image catalogs for v2 story packs, so `/packs/<id>/asset/<assetId>` can serve stills. */
  assetIndexes: PackAssetIndex[];
};

const indexAssets = (
  packRoot: string,
  packId: string,
  assets: readonly {
    id: string;
    type: Asset["type"];
    target: Asset["target"];
    status: Asset["status"];
    path?: string;
  }[],
): PackAssetIndex =>
  indexPackAssets(packRoot, {
    pack_id: packId,
    assets: assets.map((asset) => ({
      id: asset.id,
      type: asset.type,
      target: asset.target,
      status: asset.status,
      ...(asset.path ? { path: asset.path } : {}),
    })),
  });

const kingdomLabels = [
  { id: "N" as const, name: "Arisilon", label: "Arisilon (N)" },
  { id: "E" as const, name: "Brynthia", label: "Brynthia (E)" },
  { id: "S" as const, name: "Durnin", label: "Durnin (S)" },
  { id: "W" as const, name: "Zenon", label: "Zenon (W)" },
];

const playContentFor = (
  packsRoot: string,
  story: {
    base_pack: string;
    day: { move_roll: { dice: string; floor: number } };
    start: PlayContent["start"];
  },
): PlayContent | null => {
  if (story.base_pack === "base") return PROVING_GROUNDS_PLAY;
  try {
    const spacesPath = join(packsRoot, story.base_pack, "board", "spaces.json");
    const boardJson = JSON.parse(readFileSync(spacesPath, "utf8")) as { spaces: BoardSpaceInput[] };
    return {
      board: buildBoardGraph({ kingdoms: kingdomLabels, spaces: boardJson.spaces }),
      moveRoll: { dice: story.day.move_roll.dice, floor: story.day.move_roll.floor },
      start: story.start,
    };
  } catch {
    return null;
  }
};

export const loadStoryCatalog = (packsDir: string): StoryCatalog => {
  const root = realpathSync(resolve(packsDir));
  const stories: ShellStory[] = [];
  const issues: PackV2LoadIssue[] = [];
  const assetIndexes: PackAssetIndex[] = [];
  let defaultPlay: PlayContent | null = null;

  for (const name of readdirSync(root, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const dir = join(root, name.name);
    // A parsed manifest that is not format 2 (the metadata-only Count) is not a v2 door.
    // A manifest that cannot be read or parsed is still reported.
    const door = classifyPackDoor(dir);
    if (door.kind === "skip") continue;
    if (door.kind === "broken") {
      issues.push(...door.issues);
      continue;
    }
    const loaded = loadPackV2Dir(dir, root);
    if (!loaded.ok) {
      issues.push(...loaded.issues);
      continue;
    }
    if (loaded.kind === "base-content") continue;
    const story = loaded.pack;
    assetIndexes.push(indexAssets(dir, story.pack_id, story.assets));
    const partyHeroIds = new Set(story.start.assignments.map((row) => row.hero));
    const heroes = loaded.base.heroes
      .filter((hero) => partyHeroIds.has(hero.id))
      .map((hero) => ({ id: hero.id, name: hero.name }));
    const packSteps = ((story as { setup?: { id: string; label: string }[] }).setup ?? []).map(
      (step) => ({ id: step.id, label: step.label }),
    );
    stories.push({
      card: {
        id: story.pack_id,
        title: story.title,
        tagline: story.tagline ?? null,
        playable: story.playable ?? true,
        players: story.players,
      },
      settings: (story.settings ?? []).map((setting) => ({
        id: setting.id,
        label: setting.label,
        options: setting.options.map((option) => ({ id: option.id, label: option.label })),
        default: setting.default,
      })),
      setup: mergeSetupSteps(packSteps).filter((step) => step.id !== "seals-and-skulls"),
      heroes,
    });

    if (story.playable && !defaultPlay) {
      defaultPlay = playContentFor(root, {
        base_pack: story.base_pack,
        day: story.day,
        start: {
          mode: story.start.mode,
          assignments: story.start.assignments.map((row) => ({
            hero: row.hero,
            kingdom: row.kingdom,
          })),
        },
      });
    }
  }

  stories.sort((a, b) => a.card.id.localeCompare(b.card.id));
  return { stories, defaultPlay, issues, assetIndexes };
};
