// Starts the real server and reads its state, so a missing import fails here, not in a browser.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const port = 4899;

test("the server starts with a new draft and reports the 60 spaces", async () => {
  // A file of its own, so the test never reads or writes the board map on the Desktop.
  const dir = await mkdtemp(join(tmpdir(), "board-map-"));
  const dataFile = join(dir, "board-map.json");
  const child = spawn(process.execPath, [join(here, "server.mjs")], {
    env: { ...process.env, PORT: String(port), DATA_FILE: dataFile },
  });
  try {
    await new Promise((resolve, reject) => {
      child.stdout.on("data", (chunk) => {
        if (String(chunk).includes("Board map entry tool")) resolve();
      });
      child.stderr.on("data", (chunk) => reject(new Error(String(chunk))));
      child.on("exit", (code) => reject(new Error(`server exited with ${code}`)));
    });
    const res = await fetch(`http://127.0.0.1:${port}/api/state`);
    assert.equal(res.status, 200);
    const state = await res.json();
    assert.equal(state.spaces.length, 60);
    assert.equal(state.regions.length, 3);
    assert.equal(state.file, dataFile);
  } finally {
    child.kill();
    await rm(dir, { recursive: true, force: true });
  }
});
