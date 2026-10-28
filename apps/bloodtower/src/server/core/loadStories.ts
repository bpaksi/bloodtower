import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { Asset } from "bloodtower-protocols";
import { type BoardSpaceInput, buildBoardGraph } from "../../engine/loops/chapter/board.ts";
import type { PlayContent } from "../../engine/loops/chapter/playState.ts";
import { mergeSetupSteps, type ShellStory } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { indexPackAssets, type PackAssetIndex, resolveCover } from "../pack/assets.ts";
import { loadPackDir } from "../pack/load.ts";
import { classifyPackDoor, loadPackV2Dir, type PackV2LoadIssue } from "../pack/v2/load.ts";

export type StoryCatalog = {
  stories: ShellStory[];
  defaultPlay: PlayContent | null;
  issues: PackV2LoadIssue[];
  /** Image catalogs for v2 story packs, so `/packs/<id>/asset/<assetId>` can serve stills. */
  assetIndexes: PackAssetIndex[];
};

const coverUrl = (packId: string, file: string) =>
  `/packs/${encodeURIComponent(packId)}/assets/${encodeURIComponent(file)}`;

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
  cover?: string,
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
    ...(cover ? { cover } : {}),
  });

const kingdomLabels = [
  { id: "N" as const, name: "Arisilon", label: "Arisilon (N)" },
  { id: "E" as const, name: "Brynthia", label: "Brynthia (E)" },
  { id: "S" as const, name: "Durnin", label: "Durnin (S)" },
  { id: "W" as const, name: "Zenon", label: "Zenon (W)" },
];

// A board that cannot be read is reported as a pack issue (the host logs it), never dropped.
const playContentFor = (
  packsRoot: string,
  story: {
    base_pack: string;
    day: { move_roll: { dice: string; floor: number } };
    start: PlayContent["start"];
  },
  issues: PackV2LoadIssue[],
): PlayContent | null => {
  if (story.base_pack === "base") return PROVING_GROUNDS_PLAY;
  const spacesPath = join(packsRoot, story.base_pack, "board", "spaces.json");
  try {
    const boardJson = JSON.parse(readFileSync(spacesPath, "utf8")) as { spaces: BoardSpaceInput[] };
    return {
      board: buildBoardGraph({ kingdoms: kingdomLabels, spaces: boardJson.spaces }),
      moveRoll: { dice: story.day.move_roll.dice, floor: story.day.move_roll.floor },
      start: story.start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push({
      rule: "P2-1",
      file: `${story.base_pack}/board/spaces.json`,
      path: "(file)",
      message: `P2-1: the board for base pack ${story.base_pack} could not be read: ${message}`,
    });
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
    // A manifest that cannot be read or parsed is reported. A parsed manifest that is
    // not format 2 is a metadata-only door when `playable` is false (the Count).
    const door = classifyPackDoor(dir);
    if (door.kind === "skip") {
      const loaded = loadPackDir(dir);
      if (loaded.ok && !loaded.playable) {
        const pack = loaded.pack;
        const file = pack.cover ? basename(pack.cover) : "";
        const cover =
          file && loaded.assets.byBasename.has(file) ? coverUrl(pack.pack_id, file) : null;
        assetIndexes.push(loaded.assets);
        stories.push({
          card: {
            id: pack.pack_id,
            title: pack.title,
            tagline: pack.tagline ?? null,
            playable: false,
            players: null,
            cover,
          },
          settings: pack.settings.map((setting) => ({
            id: setting.id,
            label: setting.label,
            options: setting.options.map((option) => ({ id: option.id, label: option.label })),
            default: setting.default,
          })),
          setup: [],
          heroes: [],
        });
      }
      continue;
    }
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
    const coverFile = resolveCover(dir, "assets/cover.png");
    const cover = coverFile ? "assets/cover.png" : undefined;
    assetIndexes.push(indexAssets(dir, story.pack_id, story.assets, cover));
    // The pick pool is every base hero. Party size decides how many sit; start assignments
    // only place the ones who do.
    const heroes = loaded.base.heroes.map((hero) => ({ id: hero.id, name: hero.name }));
    const packSteps = story.setup.map((step) => ({ id: step.id, label: step.label }));
    stories.push({
      card: {
        id: story.pack_id,
        title: story.title,
        tagline: story.tagline ?? null,
        playable: story.playable ?? true,
        players: story.players,
        cover: cover ? coverUrl(story.pack_id, "cover.png") : null,
      },
      settings: (story.settings ?? []).map((setting) => ({
        id: setting.id,
        label: setting.label,
        options: setting.options.map((option) => ({ id: option.id, label: option.label })),
        default: setting.default,
      })),
      setup: mergeSetupSteps(packSteps),
      heroes,
    });

    if (story.playable && !defaultPlay) {
      defaultPlay = playContentFor(
        root,
        {
          base_pack: story.base_pack,
          day: story.day,
          start: {
            mode: story.start.mode,
            assignments: story.start.assignments.map((row) => ({
              hero: row.hero,
              kingdom: row.kingdom,
            })),
          },
        },
        issues,
      );
    }
  }

  stories.sort((a, b) => a.card.id.localeCompare(b.card.id));
  return { stories, defaultPlay, issues, assetIndexes };
};
