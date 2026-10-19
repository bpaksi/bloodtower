import { describe, expect, it } from "vitest";
import { groupDocs, loadDoc, loadDocs, parseDoc } from "./content.ts";

describe("content", () => {
  it("reads title, status and IDs from a doc", () => {
    const doc = parseDoc("x.md", "# Sessions\n\nStatus: **draft**, 2026-10-14.\n\nR-SES-1 and Q2.");
    expect(doc).toMatchObject({ slug: "x", title: "Sessions", status: "draft, 2026-10-14." });
    expect(doc.ids).toEqual(["R-SES-1", "Q2"]);
  });

  it("leaves a missing status as null (unavailable), not empty", () => {
    expect(parseDoc("y.md", "# Y\n").status).toBeNull();
  });

  it("loads the real design folder and puts every doc in a group", () => {
    const docs = loadDocs();
    expect(docs.length).toBeGreaterThan(0);
    const grouped = groupDocs(docs).flatMap((g) => g.docs);
    expect(grouped).toHaveLength(docs.length);
  });

  it("refuses slugs that could leave the folder", () => {
    expect(loadDoc("../../package")).toBeNull();
    expect(loadDoc("README")).toBeNull();
  });
});
