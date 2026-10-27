// Starts the sound review tool at http://127.0.0.1:4791. Every change is saved to
// ~/Desktop/sound-feel.json (DATA_FILE moves it), and that file is the tool's output. `MOCK=1` uses
// the mock tower and keeps its own file in data/, so a mock run never touches the real one.
import { constants } from "node:fs";
import { copyFile, mkdir, readFile, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { SOUND_COUNT } from "@dark-tower/tower";
import { createMockTower } from "@dark-tower/tower/runtime";
import { BluetoothAdapterFactory, BluetoothPlatform } from "ultimatedarktower";
import { type Draft, parseDraft } from "./model.ts";
import { startServer } from "./server.ts";
import { createReviewTower } from "./tower.ts";

const here = import.meta.dirname;
const appDir = join(here, "..");

const parseMock = (value: string | undefined) => {
  if (value === undefined || value === "" || value === "0") return false;
  if (value === "1") return true;
  throw new Error(`MOCK must be 1 or 0, got "${value}".`);
};
const parsePort = (value: string | undefined) => {
  if (value === undefined || value === "") return 4791;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be an integer from 0 to 65535, got "${value}".`);
  }
  return port;
};

const mock = parseMock(process.env.MOCK) ? createMockTower() : undefined;
const draftPath =
  process.env.DATA_FILE ||
  (mock ? join(appDir, "data", "sounds.mock.json") : join(homedir(), "Desktop", "sound-feel.json"));
// Where the draft lived before it moved to the Desktop. Copied, never moved, so nothing is lost.
const oldDraftPath = join(appDir, "data", "sounds.json");

if (!process.env.DATA_FILE && !mock) {
  try {
    await mkdir(dirname(draftPath), { recursive: true });
    await copyFile(oldDraftPath, draftPath, constants.COPYFILE_EXCL);
    console.log(`Copied the draft from ${oldDraftPath} to ${draftPath}.`);
  } catch (error) {
    // No old draft, or the Desktop file is already there: nothing to copy.
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "EEXIST") throw error;
  }
}

const seed = async () => JSON.parse(await readFile(join(here, "seed.json"), "utf8")) as Draft;

/**
 * The saved draft, or the reviews carried over from tower-poc when there is none yet. Loading never
 * stops the tool: bad entries are dropped and listed, and a file that is not JSON is moved aside,
 * never overwritten, and the tool starts from the seed.
 */
const loadDraft = async (): Promise<{ draft: Draft; problems: string[] }> => {
  let text: string;
  try {
    text = await readFile(draftPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.log(
        `No draft at ${draftPath} yet: starting from the tower-poc reviews (src/seed.json).`,
      );
      return { draft: await seed(), problems: [] };
    }
    const message = (error as Error).message;
    console.error(`Could not read ${draftPath}: ${message}. Starting from the seed.`);
    return {
      draft: await seed(),
      problems: [`could not read the draft (${message}); started from the seed`],
    };
  }
  const parsed = parseDraft(text, SOUND_COUNT);
  if (parsed.draft) return { draft: parsed.draft, problems: parsed.problems };
  const aside = draftPath.replace(/(\.json)?$/, `.broken-${Date.now()}.json`);
  await rename(draftPath, aside);
  return {
    draft: await seed(),
    problems: [
      `${parsed.problems.join("; ")}. The file was moved to ${aside}; started from the seed.`,
    ],
  };
};

const loaded = await loadDraft();
for (const problem of loaded.problems) console.error(`draft: ${problem}`);

const tower = createReviewTower(() =>
  mock ? mock.adapter : BluetoothAdapterFactory.create(BluetoothPlatform.NODE),
);
const server = await startServer({
  tower,
  draft: loaded.draft,
  loadProblems: loaded.problems,
  draftPath,
  publicDir: join(appDir, "public"),
  port: parsePort(process.env.PORT),
});
const address = server.address();
const port = typeof address === "object" && address ? address.port : "?";
console.log(`Sound review tool at http://127.0.0.1:${port}`);
console.log(mock ? "Tower: mock (MOCK=1)" : "Tower: real, over Bluetooth (MOCK=1 for the mock)");
console.log(`Saving to ${draftPath}`);
