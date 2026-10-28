import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard.ts";
import { idFamily } from "./ids.ts";
import { linkTarget } from "./markdown.ts";
import { anchorMaker, slugify } from "./sections.ts";

describe("idFamily", () => {
  it("strips the trailing number and dash", () => {
    expect(idFamily("R-ENG-20")).toBe("R-ENG");
    expect(idFamily("AST-T04")).toBe("AST-T");
    expect(idFamily("E17")).toBe("E");
    expect(idFamily("DRA-CHR-004")).toBe("DRA-CHR");
    expect(idFamily("R-ENG-20b")).toBe("R-ENG");
  });
});

describe("slugify and anchorMaker", () => {
  it("lowercases, drops tags and punctuation, joins words with dashes", () => {
    expect(slugify("The  Cast & Crew!")).toBe("the-cast-crew");
    expect(slugify("A <code>b</code> c")).toBe("a-b-c");
  });
  it("numbers repeated headings from -2 and falls back to 'section'", () => {
    const a = anchorMaker();
    expect([a("Intro"), a("Intro"), a("Intro"), a("???"), a("???")]).toEqual([
      "intro",
      "intro-2",
      "intro-3",
      "section",
      "section-2",
    ]);
  });
  it("keeps separate counters per maker", () => {
    expect(anchorMaker()("X")).toBe("x");
    expect(anchorMaker()("X")).toBe("x");
  });
});

describe("linkTarget", () => {
  const docHref = (s: string) => `/doc/${s}`;
  it("keeps http(s) links external", () => {
    expect(linkTarget("https://a.b/c", docHref)).toEqual({
      kind: "external",
      href: "https://a.b/c",
    });
    expect(linkTarget("http://a.b", docHref).kind).toBe("external");
  });
  it("opens a sibling .md in the workbench, keeping its hash", () => {
    expect(linkTarget("spec.md", docHref)).toEqual({ kind: "doc", href: "/doc/spec" });
    expect(linkTarget("./my-doc.md#cast", docHref)).toEqual({
      kind: "doc",
      href: "/doc/my-doc#cast",
    });
  });
  it("keeps in-page hashes", () => {
    expect(linkTarget("#cast", docHref)).toEqual({ kind: "doc", href: "#cast" });
  });
  it("marks everything else relative as outside", () => {
    expect(linkTarget("../x.md", docHref).kind).toBe("outside");
    expect(linkTarget("sub/x.md", docHref).kind).toBe("outside");
    expect(linkTarget("img.png", docHref)).toEqual({ kind: "outside", href: "img.png" });
  });
});

describe("copyText", () => {
  afterEach(() => vi.unstubAllGlobals());

  const refuse = {
    clipboard: {
      writeText: async () => {
        throw new Error("refused");
      },
    },
  };

  function fakeDom(execResult: boolean) {
    const appended: unknown[] = [];
    const area = {
      value: "",
      style: {} as Record<string, string>,
      attrs: {} as Record<string, string>,
      selected: false,
      removed: false,
      setAttribute(k: string, v: string) {
        this.attrs[k] = v;
      },
      select() {
        this.selected = true;
      },
      remove() {
        this.removed = true;
      },
    };
    const host = { append: (el: unknown) => appended.push(el) };
    const doc = {
      createElement: () => area,
      querySelector: vi.fn(() => null as unknown),
      body: host,
      execCommand: vi.fn(() => execResult),
    };
    vi.stubGlobal("document", doc);
    return { area, doc, appended };
  }

  it("uses the async clipboard when it works", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { doc } = fakeDom(true);
    expect(await copyText("hi")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hi");
    expect(doc.execCommand).not.toHaveBeenCalled();
  });

  it("falls back to a hidden textarea and cleans it up", async () => {
    vi.stubGlobal("navigator", refuse);
    const { area, doc, appended } = fakeDom(true);
    expect(await copyText("yo")).toBe(true);
    expect(area.value).toBe("yo");
    expect(area.attrs.readonly).toBe("");
    expect(area.selected).toBe(true);
    expect(area.removed).toBe(true);
    expect(appended).toEqual([area]);
    expect(doc.execCommand).toHaveBeenCalledWith("copy");
  });

  it("attaches inside an open dialog and reports a refused copy", async () => {
    vi.stubGlobal("navigator", refuse);
    const { doc, appended, area } = fakeDom(false);
    const inDialog: unknown[] = [];
    doc.querySelector.mockReturnValue({ append: (el: unknown) => inDialog.push(el) });
    expect(await copyText("z")).toBe(false);
    expect(doc.querySelector).toHaveBeenCalledWith("dialog[open]");
    expect(inDialog).toEqual([area]);
    expect(appended).toEqual([]);
    expect(area.removed).toBe(true);
  });
});
