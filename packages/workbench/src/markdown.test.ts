import { describe, expect, it } from "vitest";
import { makeIdScheme } from "./ids.ts";
import { chipHtml, makeRenderer } from "./markdown.ts";

const ids = makeIdScheme({
  sources: [String.raw`ZZ-(?:CHR|LOC)-\d{3}`, String.raw`MEC-\d+`],
  kindOf: (id) =>
    id.startsWith("ZZ-CHR") ? "character" : id.startsWith("ZZ") ? "location" : "mechanic",
  labels: { character: "Character", location: "Location" },
});
const render = makeRenderer({ ids, docHref: (s) => `/z/doc/${s}` });

describe("chipHtml", () => {
  it("makes a focusable button-like chip with kind class, id and labelled title", () => {
    expect(chipHtml("ZZ-CHR-004", ids)).toBe(
      '<span class="chip chip-character" data-id="ZZ-CHR-004" role="button" tabindex="0" title="Character · click to copy">ZZ-CHR-004</span>',
    );
  });
  it("uses each ID's own kind, and the raw kind when it has no label", () => {
    const loc = chipHtml("ZZ-LOC-001", ids);
    expect(loc).toContain("chip chip-location");
    expect(loc).toContain('title="Location · click to copy"');
    const mec = chipHtml("MEC-7", ids);
    expect(mec).toContain("chip chip-mechanic");
    expect(mec).toContain('data-id="MEC-7"');
    expect(mec).toContain('title="mechanic · click to copy"');
  });
});

describe("makeRenderer: IDs", () => {
  it("turns IDs mid-sentence into chips and leaves other text alone", () => {
    const html = render("Meet ZZ-CHR-004 at ZZ-LOC-001, using MEC-5.");
    expect(html).toContain(chipHtml("ZZ-CHR-004", ids));
    expect(html).toContain(chipHtml("ZZ-LOC-001", ids));
    expect(html).toContain(chipHtml("MEC-5", ids));
    expect(html).toContain("Meet ");
    expect(html).toContain(" at ");
  });
  it("does not chip an ID that runs on into more digits", () => {
    expect(render("ZZ-CHR-0041")).not.toContain('class="chip');
  });
  // Known product bug: the tokenizer's `start` regex has no leading word boundary, so the ID is
  // chipped inside "XZZ-CHR-004" (extractIds/parseSections skip it). Remove `.fails` when fixed.
  it.fails("does not chip an ID glued to a preceding word", () => {
    expect(render("XZZ-CHR-004")).not.toContain('class="chip');
  });
  it("does not chip IDs inside code", () => {
    const html = render("`ZZ-CHR-004`\n\n```\nZZ-LOC-001\n```");
    expect(html).not.toContain('class="chip');
    expect(html).toContain("<code>ZZ-CHR-004</code>");
  });
  it("chips IDs in headings, lists and links", () => {
    const html = render("## About ZZ-CHR-004\n\n- ZZ-LOC-001\n\n[see MEC-2](https://x.y)");
    expect(html.match(/class="chip /g)).toHaveLength(3);
  });
});

describe("makeRenderer: headings", () => {
  it("gives h1 an anchor and no Prompt button", () => {
    const html = render("# Title Here");
    expect(html).toContain('<h1 id="title-here">Title Here</h1>');
    expect(html).not.toContain("prompt-btn");
  });
  it("gives h2 and deeper a Prompt button scoped to the section anchor", () => {
    for (const depth of [2, 3, 4, 5, 6]) {
      const html = render(`${"#".repeat(depth)} The Cast`);
      expect(html).toContain(`<h${depth} id="the-cast">The Cast`);
      expect(html).toContain('class="prompt-btn"');
      expect(html).toContain('data-prompt="sec:the-cast"');
      expect(html).toContain(`</button></h${depth}>`);
    }
  });
  it("numbers repeated heading texts, across depths", () => {
    const html = render("## Notes\n\n### Notes\n\n## Notes");
    expect(html).toContain('id="notes"');
    expect(html).toContain('id="notes-2"');
    expect(html).toContain('id="notes-3"');
    expect(html).toContain('data-prompt="sec:notes-3"');
  });
  it("restarts the count on every render", () => {
    expect(render("## Notes")).toContain('id="notes"');
    const again = render("## Notes");
    expect(again).toContain('id="notes"');
    expect(again).not.toContain("notes-2");
  });
  it("falls back to 'section' for headings with no word characters", () => {
    const html = render("## ???\n\n## !!!");
    expect(html).toContain('id="section"');
    expect(html).toContain('id="section-2"');
  });
  it("keeps chips inside the heading text and its anchor", () => {
    const html = render("## Agnes ZZ-CHR-004");
    expect(html).toContain('id="agnes-zz-chr-004"');
    expect(html).toContain(chipHtml("ZZ-CHR-004", ids));
  });
});

describe("makeRenderer: links", () => {
  it("sends a sibling .md to the workbench doc, keeping the hash", () => {
    const html = render("[spec](spec.md) and [more](./my-doc.md#cast)");
    expect(html).toContain('<a href="/z/doc/spec">spec</a>');
    expect(html).toContain('<a href="/z/doc/my-doc#cast">more</a>');
    expect(html).not.toContain("target=");
  });
  it("opens http(s) links in a new tab without a referrer", () => {
    const html = render("[a](https://a.b/c) [b](http://a.b)");
    expect(html).toContain('<a href="https://a.b/c" target="_blank" rel="noreferrer">a</a>');
    expect(html).toContain('<a href="http://a.b" target="_blank" rel="noreferrer">b</a>');
  });
  it("turns relative links outside the folder into text with a title", () => {
    const html = render("[img](../pics/a.png) [sub](docs/x.md)");
    expect(html).toContain(
      '<span class="outside-link" title="Outside this folder: ../pics/a.png">img</span>',
    );
    expect(html).toContain(
      '<span class="outside-link" title="Outside this folder: docs/x.md">sub</span>',
    );
    expect(html).not.toContain("<a ");
  });
  it("keeps hash links on the page, with no target", () => {
    const html = render("[up](#top)");
    expect(html).toContain('<a href="#top">up</a>');
    expect(html).not.toContain("target=");
  });
  it("renders formatting and chips inside link text", () => {
    const html = render("[**bold** ZZ-LOC-001](spec.md)");
    expect(html).toContain('<a href="/z/doc/spec"><strong>bold</strong> ');
    expect(html).toContain(chipHtml("ZZ-LOC-001", ids));
  });
});

describe("makeRenderer: GFM", () => {
  it("renders tables, strikethrough and task lists", () => {
    const html = render("| a | b |\n|---|---|\n| 1 | 2 |\n\n~~gone~~\n\n- [x] done\n- [ ] todo");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>a</th>");
    expect(html).toContain("<td>2</td>");
    expect(html).toContain("<del>gone</del>");
    expect(html).toContain('type="checkbox"');
    expect(html.match(/checked/g)).toHaveLength(1);
  });
  it("autolinks bare URLs as external links", () => {
    const html = render("see https://example.com/x now");
    expect(html).toContain('<a href="https://example.com/x" target="_blank" rel="noreferrer">');
  });
  it("returns a string and handles empty input", () => {
    expect(render("")).toBe("");
    expect(typeof render("plain")).toBe("string");
  });
});
