import { join } from "node:path";
import { HUNTER_IDS, INVESTIGATION_ACTIONS } from "burgomaster-funeral-poc-protocols";
import { describe, expect, it } from "vitest";
import { authorizeAsset, loadCatalog, spokenWords } from "./catalog.ts";

const assets = join(import.meta.dirname, "../../../assets");
const catalog = loadCatalog(assets);

describe("loadCatalog", () => {
  it("reads the opening lines, stills and heartbeat cue from the asset folder", () => {
    const opening = catalog.moments.get("n2-burgomasters-funeral.01");
    expect(opening?.lines[0]?.text).toContain("Vellmoor buries its burgomaster");
    expect(opening?.lines[0]?.durationMs).toBeGreaterThan(1_000);
    expect(opening?.stillPath).toContain("n2-burgomasters-funeral.01");
    expect(opening?.musicPath).toContain("plainchant.wav");

    const second = catalog.moments.get("n2-burgomasters-funeral.02");
    expect(second?.lines).toHaveLength(2);
    expect(second?.lines[0]?.text).toContain("She ran after Lenka");
    expect(second?.lines[1]?.speaker.toLowerCase()).toContain("wren");

    const investigate = catalog.moments.get("n2-burgomasters-funeral.investigate");
    expect(investigate?.cue?.cue).toBe("heartbeat");
    expect(investigate?.cue?.effect).toBe("pulse");
    expect(investigate?.cue?.audioPath).toContain("heartbeat-fallback.wav");
    expect(investigate?.lines[0]?.text).toContain("The mourners keep their vigil");
  });

  it("has one private finding per hunter and action, and a portrait that is not cropped in code", () => {
    expect(catalog.findings).toHaveLength(HUNTER_IDS.length * INVESTIGATION_ACTIONS.length);
    expect(catalog.cards).toHaveLength(INVESTIGATION_ACTIONS.length);
    for (const hunter of HUNTER_IDS) {
      expect(catalog.portraits[hunter]).toMatch(/portraits\/.+\.png$/);
    }
    const agnes = catalog.findings.find(
      (item) => item.hunter === "agnes" && item.action === "examine-body",
    );
    expect(agnes?.text).toContain("Two bites");
    expect(agnes?.stillPath).toContain(".private.agnes");
  });
});

describe("spokenWords", () => {
  it("drops the script's emphasis marks", () => {
    expect(spokenWords("a wake *here*.")).toBe("a wake here.");
  });
});

describe("authorizeAsset", () => {
  const finding = catalog.findings.find(
    (item) => item.hunter === "agnes" && item.action === "examine-body",
  );
  const still = catalog.byPath.get(finding?.stillPath ?? "");
  const portrait = catalog.byPath.get(catalog.portraits.agnes);

  it("serves a portrait with no token, and a private still only after it was delivered", () => {
    expect(authorizeAsset(portrait, undefined)).toEqual({ ok: true });
    expect(authorizeAsset(still, undefined)).toEqual({ ok: false, status: 403 });
    expect(authorizeAsset(still, { role: "dashboard" })).toEqual({ ok: false, status: 403 });
    expect(authorizeAsset(still, { role: "device", held: ["agnes"], delivered: [] })).toEqual({
      ok: false,
      status: 403,
    });
    expect(
      authorizeAsset(still, {
        role: "device",
        held: ["agnes"],
        delivered: [finding?.momentId ?? ""],
      }),
    ).toEqual({ ok: true });
    expect(
      authorizeAsset(still, {
        role: "device",
        held: ["tomas"],
        delivered: [finding?.momentId ?? ""],
      }),
    ).toEqual({ ok: false, status: 403 });
    expect(authorizeAsset(undefined, { role: "dashboard" })).toEqual({ ok: false, status: 404 });
  });
});
