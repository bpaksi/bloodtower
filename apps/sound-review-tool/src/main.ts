// Starts the sound review tool at http://127.0.0.1:4791. `MOCK=1` uses the mock tower and keeps
// its own draft and export in data/, so a mock run never touches the real ones.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createMockTower } from "@dark-tower/tower/runtime";
import { BluetoothAdapterFactory, BluetoothPlatform } from "ultimatedarktower";
import type { Draft } from "./model.ts";
import { startServer } from "./server.ts";
import { createReviewTower } from "./tower.ts";

const here = import.meta.dirname;
const appDir = join(here, "..");
const repoRoot = join(appDir, "..", "..");

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
const draftPath = join(appDir, "data", mock ? "sounds.mock.json" : "sounds.json");
const exportPath = mock
  ? join(appDir, "data", "sound-feel.mock.json")
  : join(repoRoot, "research", "game-design", "sound-feel.json");

/** The saved draft, or the reviews carried over from tower-poc when there is none yet. */
const loadDraft = async (): Promise<Draft> => {
  try {
    return JSON.parse(await readFile(draftPath, "utf8")) as Draft;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    console.log(
      `No draft at ${draftPath} yet: starting from the tower-poc reviews (src/seed.json).`,
    );
    return JSON.parse(await readFile(join(here, "seed.json"), "utf8")) as Draft;
  }
};

const tower = createReviewTower(() =>
  mock ? mock.adapter : BluetoothAdapterFactory.create(BluetoothPlatform.NODE),
);
const server = await startServer({
  tower,
  draft: await loadDraft(),
  draftPath,
  exportPath,
  publicDir: join(appDir, "public"),
  port: parsePort(process.env.PORT),
});
const address = server.address();
const port = typeof address === "object" && address ? address.port : "?";
console.log(`Sound review tool at http://127.0.0.1:${port}`);
console.log(mock ? "Tower: mock (MOCK=1)" : "Tower: real, over Bluetooth (MOCK=1 for the mock)");
console.log(`Draft in ${draftPath}`);
