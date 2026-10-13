// M1 hardware spike. Bob runs this at the Mac with the tower nearby:
//
//   pnpm -F tower-poc-server spike
//
// It is the first code in this repo that loads the Bluetooth library and talks to the real tower.
// It refuses to run without a terminal, loads Bluetooth only after a typed confirmation, asks before
// every step, never retries, and always disconnects. Every packet goes to a JSONL file under
// research/tower/spikes/. The steps themselves are in spikeSteps.ts.
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { instrumentAdapter } from "../instrumentedAdapter.ts";
import { type Answer, runSpike, type SpikeIo, type SpikeTower } from "./spikeSteps.ts";

const HELD_ROTATION_SEQUENCES = [
  "rotationAllDrums",
  "rotationDrumTop",
  "rotationDrumMiddle",
  "rotationDrumBottom",
];

const main = async () => {
  if (!stdin.isTTY || !stdout.isTTY) {
    console.error(
      "The spike needs a person at a terminal: it asks before every step. It will not run from a script or a pipe.",
    );
    process.exitCode = 1;
    return;
  }

  const prompt = createInterface({ input: stdin, output: stdout });
  const started = Date.now();
  const stamp = new Date(started).toISOString().replace(/[:.]/g, "-");
  const here = dirname(fileURLToPath(import.meta.url));
  const folder = resolve(here, "../../../../../research/tower/spikes");
  const logFile = join(folder, `spike-${stamp}.jsonl`);
  mkdirSync(folder, { recursive: true });

  const log = (record: Record<string, unknown>) =>
    appendFileSync(logFile, `${JSON.stringify({ ms: Date.now() - started, ...record })}\n`);

  console.log("Dark Tower hardware spike (M1 steps 5 and 6)\n");
  console.log("This connects to the real tower. Drums will spin during calibration and rotation.");
  console.log("You are asked before every step and can skip any of them.");
  console.log(`The log goes to ${logFile}\n`);

  const go = await prompt.question("Type YES to switch on Bluetooth and begin: ");
  if (go.trim() !== "YES") {
    console.log("Nothing was loaded and nothing was sent.");
    prompt.close();
    return;
  }

  // Loaded only now. Importing the library is harmless; creating the Node adapter loads noble.
  const { UltimateDarkTower, BluetoothAdapterFactory, BluetoothPlatform, LIGHT_EFFECTS } =
    await import("ultimatedarktower");
  const { TOWER_AUDIO_LIBRARY, TOWER_LIGHT_SEQUENCES } = await import("ultimatedarktowerdata");

  log({
    type: "start",
    at: new Date(started).toISOString(),
    node: process.version,
    platform: process.platform,
  });

  const adapter = instrumentAdapter(
    BluetoothAdapterFactory.create(BluetoothPlatform.NODE),
    (event) => log({ type: "adapter", ...event }),
  );
  const tower = new UltimateDarkTower({ adapter, diagnostics: { enabled: true } });

  const io: SpikeIo = {
    confirm: async (warning): Promise<Answer> => {
      console.log(`  ${warning}`);
      const reply = (await prompt.question("  [r] run   [s] skip   [q] quit > "))
        .trim()
        .toLowerCase();
      if (reply === "r" || reply === "run") return "run";
      if (reply === "q" || reply === "quit") return "quit";
      return "skip";
    },
    observe: async (question) => (await prompt.question(`  ${question} > `)).trim(),
    say: (line) => console.log(line),
    log,
    wait: (ms) => new Promise((done) => setTimeout(done, ms)),
  };

  // Every number the steps send is looked up here. A missing one stops the run before connecting.
  const known = (value: number | undefined, what: string) => {
    if (value === undefined) throw new Error(`${what} is not in the installed catalog`);
    return value;
  };
  const sequences = TOWER_LIGHT_SEQUENCES as Record<string, number>;
  const catalog = {
    soundIndex: known(Object.values(TOWER_AUDIO_LIBRARY)[0]?.value, "the first sound"),
    lightEffectOn: known(LIGHT_EFFECTS.on, "the light effect 'on'"),
    rotationSequences: HELD_ROTATION_SEQUENCES.map((name) => ({
      name,
      value: known(sequences[name], `the light sequence ${name}`),
    })),
  };

  try {
    const results = await runSpike(tower as unknown as SpikeTower, io, catalog);
    log({ type: "results", results });
    console.log("\nResults:");
    for (const [id, result] of Object.entries(results)) console.log(`  ${result.padEnd(9)} ${id}`);
  } finally {
    // The library's own recorder output names this tower (serial number), so it is kept out of git.
    const diagnosticsFile = join(folder, `spike-${stamp}.diagnostics.local.json`);
    try {
      writeFileSync(diagnosticsFile, tower.exportDiagnosticsJSON());
      console.log(`\nLibrary diagnostics (not for committing): ${diagnosticsFile}`);
    } catch (error) {
      console.log(`\nCould not write the library diagnostics: ${error}`);
    }
    console.log(`Spike log (commit this): ${logFile}`);
    prompt.close();
  }
};

await main();
// noble keeps the process alive after disconnecting.
process.exit(process.exitCode ?? 0);
