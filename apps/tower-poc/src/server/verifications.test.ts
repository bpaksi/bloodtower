import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase } from "./db/client.ts";
import { verifications as table } from "./db/schema.ts";
import { createVerificationStorage } from "./db/verifications.ts";
import { createVerifications } from "./verifications.ts";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "tower-poc-verify-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const versions = { libraryVersion: "7.1.2", appVersion: "0.1.0" };

describe("Verify results (spec D14)", () => {
  it("keeps every result and shows the newest per capability, across a restart", () => {
    const path = join(dir, "tower.db");
    const first = openDatabase(path);
    let clock = 100;
    const before = createVerifications({
      storage: createVerificationStorage(first.db),
      tower: "bluetooth",
      ...versions,
      now: () => clock,
    });
    expect(before.overlay()).toEqual({});
    before.record({ capabilityId: "sound.play", result: "fail", notes: " no sound " }, "iPad");
    clock = 200;
    const outcome = before.record({ capabilityId: "sound.play", result: "pass", notes: "" }, "Mac");
    before.record({ capabilityId: "lighting.all-off", result: "partial", notes: "base" }, "iPad");
    expect(outcome).toMatchObject({ ok: true, overlay: { "sound.play": { result: "pass" } } });
    expect(first.db.select().from(table).all()).toHaveLength(3);
    first.close();

    const second = openDatabase(path);
    const after = createVerifications({
      storage: createVerificationStorage(second.db),
      tower: "bluetooth",
      ...versions,
    });
    expect(after.overlay()).toEqual({
      "sound.play": {
        id: 2,
        capabilityId: "sound.play",
        result: "pass",
        notes: "",
        diagnosticSessionId: null,
        libraryVersion: "7.1.2",
        appVersion: "0.1.0",
        testedAt: 200,
        environment: { tower: "bluetooth", client: "Mac" },
      },
      "lighting.all-off": expect.objectContaining({ id: 3, result: "partial", notes: "base" }),
    });
    second.close();
  });

  it("trims the notes", () => {
    const { db, close } = openDatabase(":memory:");
    const verifications = createVerifications({
      storage: createVerificationStorage(db),
      tower: "mock",
      ...versions,
    });
    verifications.record({ capabilityId: "sound.play", result: "fail", notes: "  silent\n" }, "a");
    expect(verifications.overlay()["sound.play"]?.notes).toBe("silent");
    close();
  });

  it("never shows a result from the other tower, nor lets it hide one", () => {
    const { db, close } = openDatabase(":memory:");
    const storage = createVerificationStorage(db);
    const real = createVerifications({ storage, tower: "bluetooth", ...versions });
    real.record({ capabilityId: "sound.play", result: "pass", notes: "" }, "iPad");
    const mock = createVerifications({ storage, tower: "mock", ...versions });
    expect(mock.overlay()).toEqual({});
    mock.record({ capabilityId: "sound.play", result: "fail", notes: "mock" }, "iPad");
    const again = createVerifications({ storage, tower: "bluetooth", ...versions });
    expect(again.overlay()["sound.play"]).toMatchObject({ result: "pass" });
    close();
  });

  it.each([
    "no.such-capability",
    // Unsupported and not exposed: the app shows nothing for them.
    "mechanics.unjam-drums",
    "seals.random-unbroken",
    // On the Diagnostics page, which has no checklist until M4.
    "diagnostics.export",
  ])("refuses %s and saves nothing", (capabilityId) => {
    const { db, close } = openDatabase(":memory:");
    const verifications = createVerifications({
      storage: createVerificationStorage(db),
      tower: "mock",
      ...versions,
    });
    const outcome = verifications.record({ capabilityId, result: "pass", notes: "" }, "a");
    expect(outcome).toMatchObject({ ok: false, reason: expect.stringContaining(capabilityId) });
    expect(db.select().from(table).all()).toHaveLength(0);
    close();
  });

  it("skips a saved row it cannot read, and says how many", () => {
    const { db, close } = openDatabase(":memory:");
    const row = {
      capabilityId: "sound.play",
      notes: "",
      libraryVersion: "7.1.2",
      appVersion: "0.1.0",
      testedAt: 5,
    };
    db.insert(table)
      .values([
        { ...row, result: "pass", environment: '{"tower":"mock","client":"a"}' },
        { ...row, result: "maybe", environment: '{"tower":"mock","client":"a"}' },
        { ...row, result: "fail", environment: "not json" },
      ])
      .run();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const verifications = createVerifications({
      storage: createVerificationStorage(db),
      tower: "mock",
      ...versions,
    });
    expect(verifications.overlay()["sound.play"]).toMatchObject({ id: 1, result: "pass" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("2 saved Verify result(s)"));
    warn.mockRestore();
    close();
  });
});
