import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { type BoardSpaceInput, buildBoardGraph } from "../../engine/loops/chapter/board.ts";
import type { PlayContent } from "../../engine/loops/chapter/playState.ts";
import { mergeSetupSteps, type ShellStory } from "../../engine/loops/session/pack.ts";
import { PROVING_GROUNDS_PLAY } from "../../engine/loops/session/playContent.ts";
import { idSchema } from "../../protocols/pack-v2/index.ts";
import {
  indexPackAssets,
  type PackAsset,
  type PackAssetIndex,
  resolveCover,
} from "../pack/assets.ts";
import { loadPackV2Dir, type PackV2LoadIssue } from "../pack/v2/load.ts";

export type StoryCatalog = {
  stories: ShellStory[];
  defaultPlay: PlayContent | null;
  issues: PackV2LoadIssue[];
  /** Image catalogs for the packs, so `/packs/<id>/assets/<file>` can serve covers and stills. */
  assetIndexes: PackAssetIndex[];
};

const coverUrl = (packId: string, file: string) =>
  `/packs/${encodeURIComponent(packId)}/assets/${encodeURIComponent(file)}`;

const indexAssets = (
  packRoot: string,
  packId: string,
  assets: readonly {
    id: string;
    type: PackAsset["type"];
    target: PackAsset["target"];
    status: PackAsset["status"];
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

/**
 * A story pack that failed to load, as a door that is not playable. It reads only the manifest's
 * id and title; a base pack or an unreadable manifest gets no door (its issues are already
 * reported, and a manifest that cannot be read adds one more).
 */
const notReadyStory = (
  dir: string,
  folder: string,
  issues: PackV2LoadIssue[],
): ShellStory | null => {
  const manifest = ["pack.yaml", "pack.yml", "pack.json"]
    .map((file) => join(dir, file))
    .find((path) => existsSync(path));
  if (!manifest) return null;
  try {
    const parsed: unknown = parseYaml(readFileSync(manifest, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const head = parsed as Record<string, unknown>;
    if (head.kind === "base-content") return null;
    const id = typeof head.pack_id === "string" && head.pack_id !== "" ? head.pack_id : folder;
    // An id that cannot be a door is reported by the loader and gets no door (C2-14 EV-03).
    if (!idSchema.safeParse(id).success) return null;
    const title = typeof head.title === "string" && head.title !== "" ? head.title : id;
    return {
      card: { id, title, tagline: null, playable: false, players: null, cover: null },
      settings: [],
      setup: [],
      heroes: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push({
      rule: "P2-1",
      file: folder,
      path: "(file)",
      message: `P2-1: the manifest could not be read for Pick story: ${message}`,
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
    // Every door loads through v2. A folder that does not load is reported, never dropped.
    const loaded = loadPackV2Dir(dir, root);
    if (!loaded.ok) {
      issues.push(...loaded.issues);
      // A pack that fails lint still shows on Pick story, as Not ready (SCR-009), never playable.
      const notReady = notReadyStory(dir, name.name, issues);
      if (notReady) stories.push(notReady);
      continue;
    }
    if (loaded.kind === "base-content") continue;
    if (loaded.kind === "metadata") {
      // Dracula (DEC-691): listed with its title and settings, never bound as a story.
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
      continue;
    }
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
