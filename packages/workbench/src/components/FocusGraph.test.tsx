// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Card, Edge, Graph, RefNode } from "../graph-types.ts";
import { DENSE_AT } from "../layout.ts";
import { FocusGraph, type GraphPlaces } from "./FocusGraph.tsx";
import { PANEL_OPEN_CANCEL, PANEL_OPEN_DETAIL } from "./Panels.tsx";

let search = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const places: GraphPlaces = {
  graphHref: "/graph",
  docBase: "/doc/",
  sourceDir: "research/game-design",
  kindLabels: { idea: "Idea", question: "Question", AREA: "Area" },
  layerLabels: { core: "Core loop" },
};

function card(id: string, over: Partial<Card> = {}): Graph["nodes"][string] {
  return {
    kind: "card",
    id,
    type: "idea",
    title: `Title ${id}`,
    status: "open",
    layer: null,
    by: null,
    links: [],
    sources: [],
    body: "",
    bodyHtml: "",
    file: `cards/${id}.md`,
    data: {},
    ...over,
  };
}

function ref(id: string, foundIn: string[] = []): RefNode {
  return { kind: "ref", id, idKind: "AREA", title: `Ref ${id}`, foundIn };
}

const rels = {
  needs: { label: "needs", reverse: "needed by" },
  raises: { label: "raises", reverse: "raised by" },
};

/** F needs N0..N(count-1); each N has `deeper` further cards behind it (second step). */
function star(count: number, deeper = 0): Graph {
  const nodes: Graph["nodes"] = { F: card("F", { layer: "core", status: "decided" }) };
  const edges: Edge[] = [];
  for (let i = 0; i < count; i++) {
    nodes[`N${i}`] = card(`N${i}`);
    edges.push({ from: "F", to: `N${i}`, rel: "needs" });
    for (let k = 0; k < deeper; k++) {
      nodes[`S${i}-${k}`] = card(`S${i}-${k}`);
      edges.push({ from: `N${i}`, to: `S${i}-${k}`, rel: "raises" });
    }
  }
  return { nodes, edges, rels };
}

function mount(graph: Graph, initialFocus = "F") {
  return render(<FocusGraph graph={graph} initialFocus={initialFocus} places={places} />);
}

const gcards = () => [...document.querySelectorAll<HTMLElement>(".gcard")];
const gcard = (id: string) =>
  gcards().find((el) => el.querySelector(".gcard-id")?.textContent === id) as HTMLElement;
const ringOf = (id: string) => /ring-(\d)/.exec(gcard(id).className)?.[1];

class FakeResizeObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeEach(() => {
  search = "";
  window.history.replaceState(null, "", "/graph");
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  // jsdom lays nothing out: give the stage the size the layout reads.
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1200);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(800);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("FocusGraph layout focus", () => {
  it("puts the initial focus in the middle at ring 0 with its status and layer", () => {
    mount(star(3));
    const focus = gcard("F");
    expect(ringOf("F")).toBe("0");
    expect(focus.style.transform).toContain("translate(600px, 400px)");
    expect(focus.querySelector(".gcard-status")?.textContent).toBe("decided");
    expect(focus.querySelector(".layer-tag")?.textContent).toBe("core");
  });

  it("shows the focus card in the detail panel", () => {
    mount(star(2));
    const detail = document.querySelector(".detail") as HTMLElement;
    expect(within(detail).getByRole("heading", { level: 1 }).textContent).toBe("Title F");
    expect(within(detail).getByText("Continue from here")).toBeTruthy();
  });

  it("with no neighbours shows only the focus and no captions", () => {
    mount(star(0));
    expect(gcards()).toHaveLength(1);
    expect(document.querySelector(".stage-caption")).toBeNull();
  });
});

describe("FocusGraph neighbour chips", () => {
  it("draws each neighbour as a ring-1 card", () => {
    mount(star(4));
    for (const id of ["N0", "N1", "N2", "N3"]) expect(ringOf(id)).toBe("1");
    expect(gcards()).toHaveLength(5);
  });

  it("puts second-step cards on ring 2, small, with the id in the title attribute", () => {
    mount(star(2, 2));
    expect(ringOf("S0-0")).toBe("2");
    expect(gcard("S0-0").title).toBe("S0-0 · Title S0-0");
    expect(gcard("S0-0").querySelector(".gcard-status")).toBeNull();
    // Ring 1 cards at full size keep their status line and have no title tooltip.
    expect(gcard("N0").querySelector(".gcard-status")?.textContent).toBe("open");
    expect(gcard("N0").title).toBe("");
  });

  it("lists neighbours in both link groups of the detail panel", () => {
    const g = star(1);
    g.edges.push({ from: "N0", to: "F", rel: "raises" });
    mount(g);
    const detail = document.querySelector(".detail") as HTMLElement;
    const heads = [...detail.querySelectorAll("h2")].map((h) => h.textContent);
    expect(heads).toEqual(["Points here", "Links from here"]);
    const verbs = [...detail.querySelectorAll(".verb")].map((v) => v.textContent);
    expect(verbs).toContain("needs");
    expect(verbs).toContain("raised by");
  });

  it("draws the verb on each line, and redraws them 380 ms after the focus moves", () => {
    vi.useFakeTimers();
    const g = star(3);
    const { rerender } = mount(g);
    expect(document.querySelectorAll(".edge-verb")).toHaveLength(3);
    expect(document.querySelectorAll("line.edge")).toHaveLength(3);
    search = "focus=N0";
    rerender(<FocusGraph graph={g} initialFocus="F" places={places} />);
    expect(document.querySelector("svg.edges")).toBeNull();
    expect(document.querySelectorAll(".edge-verb")).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(380);
    });
    expect(document.querySelectorAll("line.edge")).toHaveLength(1);
    expect(document.querySelector(".edge-verb")?.textContent).toBe("needed by");
  });

  it("clicking a neighbour opens the detail panel and pushes ?focus=", () => {
    const opened = vi.fn();
    window.addEventListener(PANEL_OPEN_DETAIL, opened);
    mount(star(3));
    fireEvent.click(gcard("N1"));
    expect(opened).toHaveBeenCalledTimes(1);
    expect(window.location.pathname + window.location.search).toBe("/graph?focus=N1");
    window.removeEventListener(PANEL_OPEN_DETAIL, opened);
  });

  it("clicking the focus card opens the panel but leaves the URL alone", () => {
    const opened = vi.fn();
    window.addEventListener(PANEL_OPEN_DETAIL, opened);
    mount(star(3));
    fireEvent.click(gcard("F"));
    expect(opened).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
    window.removeEventListener(PANEL_OPEN_DETAIL, opened);
  });

  it("encodes the picked id in the URL", () => {
    const g = star(1);
    g.nodes["N 0&x"] = card("N 0&x");
    g.edges.push({ from: "F", to: "N 0&x", rel: "needs" });
    mount(g);
    fireEvent.click(gcard("N 0&x"));
    expect(window.location.search).toBe("?focus=N%200%26x");
  });

  it("a link in the detail panel picks that card too", () => {
    mount(star(2));
    const detail = document.querySelector(".detail") as HTMLElement;
    fireEvent.click(within(detail).getByText("Title N1"));
    expect(window.location.search).toBe("?focus=N1");
  });
});

describe("FocusGraph ?focus= URL", () => {
  it("a known ?focus= wins over the initial focus", () => {
    search = "focus=N1";
    mount(star(3));
    expect(ringOf("N1")).toBe("0");
    expect(ringOf("F")).toBe("1");
    const detail = document.querySelector(".detail") as HTMLElement;
    expect(within(detail).getByRole("heading", { level: 1 }).textContent).toBe("Title N1");
  });

  it("an unknown ?focus= falls back to the initial focus and cancels a pending panel open", () => {
    search = "focus=NOPE";
    const cancelled = vi.fn();
    window.addEventListener(PANEL_OPEN_CANCEL, cancelled);
    mount(star(3));
    expect(ringOf("F")).toBe("0");
    expect(cancelled).toHaveBeenCalledTimes(1);
    window.removeEventListener(PANEL_OPEN_CANCEL, cancelled);
  });

  it("a known or absent ?focus= does not cancel", () => {
    const cancelled = vi.fn();
    window.addEventListener(PANEL_OPEN_CANCEL, cancelled);
    mount(star(3));
    cleanup();
    search = "focus=N0";
    mount(star(3));
    expect(cancelled).not.toHaveBeenCalled();
    window.removeEventListener(PANEL_OPEN_CANCEL, cancelled);
  });

  it("an initial focus that is not in the graph shows no detail panel and cancels", () => {
    const cancelled = vi.fn();
    window.addEventListener(PANEL_OPEN_CANCEL, cancelled);
    mount(star(2), "GONE");
    expect(document.querySelector(".detail")).toBeNull();
    expect(cancelled).toHaveBeenCalledTimes(1);
    window.removeEventListener(PANEL_OPEN_CANCEL, cancelled);
  });

  it("re-renders on a changed ?focus= and cancels only when it turns unknown", () => {
    const cancelled = vi.fn();
    window.addEventListener(PANEL_OPEN_CANCEL, cancelled);
    const g = star(3);
    const { rerender } = mount(g);
    search = "focus=N2";
    rerender(<FocusGraph graph={g} initialFocus="F" places={places} />);
    expect(ringOf("N2")).toBe("0");
    expect(cancelled).not.toHaveBeenCalled();
    search = "focus=NOPE";
    rerender(<FocusGraph graph={g} initialFocus="F" places={places} />);
    expect(ringOf("F")).toBe("0");
    expect(cancelled).toHaveBeenCalledTimes(1);
    window.removeEventListener(PANEL_OPEN_CANCEL, cancelled);
  });
});

describe("FocusGraph dense threshold", () => {
  it(`at ${DENSE_AT} neighbours cards stay full size and the second step shows`, () => {
    mount(star(DENSE_AT, 1));
    expect(document.querySelector(".stage-caption")).toBeNull();
    expect(document.querySelectorAll(".gcard.compact")).toHaveLength(0);
    expect(document.querySelectorAll(".gcard.ring-2").length).toBeGreaterThan(0);
  });

  it(`above ${DENSE_AT} neighbours cards go compact, drop the second step and caption the verb`, () => {
    mount(star(DENSE_AT + 1, 1));
    expect(document.querySelectorAll(".gcard.compact")).toHaveLength(DENSE_AT + 1);
    expect(document.querySelectorAll(".gcard.ring-2")).toHaveLength(0);
    expect(gcard("F").classList.contains("compact")).toBe(false);
    const caption = document.querySelector(".stage-caption") as HTMLElement;
    expect(caption.textContent).toBe(`${DENSE_AT + 1} links · unlabelled lines are needs`);
    expect(caption.querySelector("b")?.textContent).toBe("needs");
    // Compact cards hide the status and carry the id/title tooltip.
    expect(gcard("N0").querySelector(".gcard-status")).toBeNull();
    expect(gcard("N0").title).toBe("N0 · Title N0");
  });

  it("labels only the lines that differ from the common verb", () => {
    vi.useFakeTimers();
    const g = star(DENSE_AT + 1);
    g.edges.push({ from: "N0", to: "F", rel: "raises" }); // N0 also "raised by" F's side
    mount(g);
    act(() => {
      vi.advanceTimersByTime(380);
    });
    const labels = [...document.querySelectorAll(".edge-verb")].map((v) => v.textContent);
    expect(labels).toEqual(["needs · raised by"]);
    expect(document.querySelectorAll("line.edge")).toHaveLength(DENSE_AT + 1);
  });

  it("without a dense focus every line carries its verb", () => {
    vi.useFakeTimers();
    mount(star(DENSE_AT));
    act(() => {
      vi.advanceTimersByTime(380);
    });
    expect(document.querySelectorAll(".edge-verb")).toHaveLength(DENSE_AT);
  });
});

describe("FocusGraph document IDs", () => {
  it("shows a ref node with its found-in links and no card actions beyond the prompt buttons", () => {
    const g = star(1);
    g.nodes.R1 = ref("R1", ["design/a.md"]);
    g.edges.push({ from: "F", to: "R1", rel: "needs" });
    search = "focus=R1";
    mount(g);
    expect(gcard("R1").querySelector(".gcard-status")?.textContent).toBe("in docs");
    expect(gcard("R1").classList.contains("is-ref")).toBe(true);
    const detail = document.querySelector(".detail") as HTMLElement;
    const link = within(detail).getByText("design/a.md").closest("a");
    expect(link?.getAttribute("href")).toBe("/doc/design/a");
  });

  it("says so when no document names a ref ID", () => {
    const g = star(1);
    g.nodes.R2 = ref("R2");
    g.edges.push({ from: "F", to: "R2", rel: "needs" });
    search = "focus=R2";
    mount(g);
    expect(screen.getByText("No document names this ID directly.")).toBeTruthy();
  });

  it("links a source inside the workbench folder and prints one outside it", () => {
    const g = star(0);
    g.nodes.F = card("F", {
      sources: [
        { file: "gdd.md", lines: "12-20" },
        { file: "../other/x.md", lines: "3" },
      ],
    });
    mount(g);
    const detail = document.querySelector(".detail") as HTMLElement;
    const link = within(detail)
      .getByText(/gdd\.md/)
      .closest("a");
    expect(link?.getAttribute("href")).toBe("/doc/gdd#L12");
    expect(within(detail).getByText(/lines 3/).textContent).toBe("research/other/x.md · lines 3");
  });
});

describe("FocusGraph detail panel", () => {
  const detailOf = () => document.querySelector(".detail") as HTMLElement;

  it("chips the focus ID with the kind label, and falls back to the raw kind", () => {
    mount(star(0));
    const chip = detailOf().querySelector(".chip") as HTMLElement;
    expect(chip.className).toContain("chip-idea");
    expect(chip.getAttribute("data-id")).toBe("F");
    expect(chip.title).toBe("Idea · click to copy");
    expect(detailOf().querySelector(".detail-head .muted")?.textContent).toBe("Idea · decided");
    cleanup();
    const g = star(0);
    g.nodes.F = card("F", { type: "mystery" as Card["type"] });
    mount(g);
    const fallback = detailOf().querySelector(".chip") as HTMLElement;
    expect(fallback.title).toBe("mystery · click to copy");
    expect(detailOf().querySelector(".detail-head .muted")?.textContent).toBe("mystery · open");
  });

  it("labels a ref node by its ID kind and says it is a document ID", () => {
    const g = star(1);
    g.nodes.R1 = ref("R1");
    g.edges.push({ from: "F", to: "R1", rel: "needs" });
    search = "focus=R1";
    mount(g);
    expect(detailOf().querySelector(".chip")?.className).toContain("chip-AREA");
    expect(detailOf().querySelector(".detail-head .muted")?.textContent).toBe(
      "Area · document ID, no card",
    );
    expect(detailOf().querySelector(".layer-line")).toBeNull();
    expect(detailOf().querySelector(".detail-actions")).not.toBeNull();
    expect(gcard("R1").className).toContain("gk-AREA");
  });

  it("shows the layer line with its label, or the raw layer when it has none", () => {
    mount(star(0));
    const line = detailOf().querySelector(".layer-line") as HTMLElement;
    expect(line.textContent).toBe("Core loop");
    expect(line.className).toContain("layer-core");
    cleanup();
    const g = star(0);
    g.nodes.F = card("F", { layer: "meta" });
    mount(g);
    expect(detailOf().querySelector(".layer-line")?.textContent).toBe("meta");
  });

  it("omits the layer line and tag when the card has no layer", () => {
    const g = star(0);
    g.nodes.F = card("F");
    mount(g);
    expect(detailOf().querySelector(".layer-line")).toBeNull();
    expect(gcard("F").querySelector(".layer-tag")).toBeNull();
  });

  it("hides the layer tag on small cards but keeps it on full-size ring 1", () => {
    const g = star(2, 1);
    g.nodes.N0 = card("N0", { layer: "core" });
    g.nodes["S0-0"] = card("S0-0", { layer: "core" });
    mount(g);
    expect(gcard("N0").querySelector(".layer-tag")?.textContent).toBe("core");
    expect(gcard("S0-0").querySelector(".layer-tag")).toBeNull();
  });

  it("prints the by line and the rendered body only when present", () => {
    const g = star(0);
    g.nodes.F = card("F", { by: "Bob, 2026-05-01", bodyHtml: "<p>Hello <b>body</b></p>" });
    mount(g);
    const d = detailOf();
    expect(d.querySelector("p.muted.small")?.textContent).toBe("Bob, 2026-05-01");
    expect(d.querySelector(".prose b")?.textContent).toBe("body");
    cleanup();
    mount(star(0));
    expect(detailOf().querySelector(".prose")).toBeNull();
    expect(detailOf().querySelector("h1 + p.muted")).toBeNull();
  });

  it("gives the three prompt buttons the card and mode", () => {
    mount(star(0));
    const btns = [...detailOf().querySelectorAll<HTMLElement>("[data-prompt]")];
    expect(btns.map((b) => [b.textContent, b.dataset.prompt, b.dataset.promptMode])).toEqual([
      ["Continue from here", "card:F", "add"],
      ["Change", "card:F", "change"],
      ["Ask", "card:F", "ask"],
    ]);
  });

  it("says None under each link heading when the card has no links", () => {
    mount(star(0));
    expect(
      [...detailOf().querySelectorAll("p.muted.small:not(.file)")].map((p) => p.textContent),
    ).toEqual(["None.", "None."]);
  });

  it("shows a link note beside the link", () => {
    const g = star(1);
    g.edges[0] = { from: "F", to: "N0", rel: "needs", note: "because reasons" };
    mount(g);
    expect(detailOf().querySelector(".link-note")?.textContent).toBe(" because reasons");
  });

  it("shows the card file path and no Found in heading for a card", () => {
    mount(star(0));
    expect(detailOf().querySelector(".file")?.textContent).toBe("cards/F.md");
    expect([...detailOf().querySelectorAll("h2")].map((h) => h.textContent)).not.toContain(
      "Found in",
    );
  });

  it("lists no Sources heading when a card has none", () => {
    mount(star(0));
    expect([...detailOf().querySelectorAll("h2")].map((h) => h.textContent)).not.toContain(
      "Sources",
    );
  });
});

describe("FocusGraph sources", () => {
  const sourcesOf = (sources: Card["sources"], sourceDir = places.sourceDir) => {
    const g = star(0);
    g.nodes.F = card("F", { sources });
    render(<FocusGraph graph={g} initialFocus="F" places={{ ...places, sourceDir }} />);
    return document.querySelector(".sources") as HTMLElement;
  };

  it("links a source with no lines to the bare document and prints no lines suffix", () => {
    const s = sourcesOf([{ file: "gdd.md" }]);
    const a = s.querySelector("a") as HTMLAnchorElement;
    expect(a.getAttribute("href")).toBe("/doc/gdd");
    expect(a.textContent).toBe("gdd.md");
  });

  it("anchors a lines range at its first line", () => {
    const a = sourcesOf([{ file: "gdd.md", lines: "7-9" }]).querySelector("a") as HTMLElement;
    expect(a.getAttribute("href")).toBe("/doc/gdd#L7");
    expect(a.textContent).toBe("gdd.md · lines 7-9");
  });

  it("prints an outside source without lines and keeps the full path in the tooltip", () => {
    const span = sourcesOf([{ file: "../other/x.md" }]).querySelector("span.mono") as HTMLElement;
    expect(span.textContent).toBe("research/other/x.md");
    expect(span.title).toBe("research/game-design/../other/x.md");
  });

  it("resolves .. against the parent of a nested sourceDir", () => {
    const span = sourcesOf([{ file: "../y.md", lines: "1" }], "a/b/c").querySelector(
      "span.mono",
    ) as HTMLElement;
    expect(span.textContent).toBe("a/b/y.md · lines 1");
  });

  it("treats a nested path inside the workbench as outside (it holds a slash)", () => {
    const s = sourcesOf([{ file: "sub/z.md" }]);
    expect(s.querySelector("a")).toBeNull();
    expect(s.querySelector("span.mono")?.textContent).toBe("sub/z.md");
  });

  it("shows a source note beside the source", () => {
    const s = sourcesOf([{ file: "gdd.md", note: "see intro" }]);
    expect(s.querySelector("li > span.muted")?.textContent).toBe(" see intro");
  });

  it("keeps two sources of the same file with different lines apart", () => {
    const s = sourcesOf([
      { file: "gdd.md", lines: "1-2" },
      { file: "gdd.md", lines: "5-6" },
    ]);
    expect([...s.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      "/doc/gdd#L1",
      "/doc/gdd#L5",
    ]);
  });

  it("links a Found in document from a ref, stripping .md and joining docBase", () => {
    const g = star(1);
    g.nodes.R1 = ref("R1", ["a/b.md", "c.md"]);
    g.edges.push({ from: "F", to: "R1", rel: "needs" });
    search = "focus=R1";
    mount(g);
    const hrefs = [...document.querySelectorAll(".sources a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/doc/a/b", "/doc/c"]);
  });
});

describe("FocusGraph card classes and unknown neighbours", () => {
  it("builds the class from ring, kind, ref flag and status (space becomes a dash)", () => {
    const g = star(1);
    g.nodes.N0 = card("N0", { type: "question", status: "needs work" as Card["status"] });
    mount(g);
    const cls = gcard("N0").className;
    expect(cls).toContain("ring-1");
    expect(cls).toContain("gk-question");
    expect(cls).toContain("st-needs-work");
    expect(cls).not.toContain("is-ref");
    expect(cls).not.toContain("compact");
  });

  it("ref cards get st-in-docs, is-ref and the ID kind class", () => {
    const g = star(1);
    g.nodes.R1 = ref("R1");
    g.edges.push({ from: "F", to: "R1", rel: "needs" });
    mount(g);
    const cls = gcard("R1").className;
    expect(cls).toContain("st-in-docs");
    expect(cls).toContain("is-ref");
    expect(cls).toContain("gk-AREA");
  });

  it("draws an edge to an ID that has no node as a question card titled by its ID", () => {
    const g = star(0);
    g.edges.push({ from: "F", to: "GHOST", rel: "needs" });
    mount(g);
    const ghost = gcard("GHOST");
    expect(ghost.className).toContain("gk-question");
    expect(ghost.className).toContain("st-in-docs");
    expect(ghost.className).not.toContain("is-ref");
    expect(ghost.querySelector(".gcard-title")?.textContent).toBe("GHOST");
    expect(ghost.querySelector(".gcard-status")?.textContent).toBe("in docs");
    expect(ghost.querySelector(".layer-tag")).toBeNull();
  });

  it("puts the focus card at full size even when it has many neighbours", () => {
    mount(star(DENSE_AT + 2));
    const focus = gcard("F");
    expect(focus.classList.contains("compact")).toBe(false);
    expect(focus.querySelector(".gcard-status")).not.toBeNull();
    expect(focus.title).toBe("");
  });

  it("clicking a ring-2 card moves the focus to it", () => {
    mount(star(2, 1));
    fireEvent.click(gcard("S1-0"));
    expect(window.location.search).toBe("?focus=S1-0");
  });

  it("clicking a Points here link opens the panel and pushes the focus", () => {
    const opened = vi.fn();
    window.addEventListener(PANEL_OPEN_DETAIL, opened);
    search = "focus=N0";
    mount(star(1));
    const detail = document.querySelector(".detail") as HTMLElement;
    const heading = [...detail.querySelectorAll("h2")].find((h) => h.textContent === "Points here");
    expect(heading).toBeTruthy();
    fireEvent.click(within(detail).getByText("Title F"));
    expect(opened).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("?focus=F");
    window.removeEventListener(PANEL_OPEN_DETAIL, opened);
  });
});

describe("FocusGraph dense verb captions", () => {
  it("captions the most common of several verbs and labels the minority", () => {
    vi.useFakeTimers();
    const g = star(DENSE_AT + 1);
    // Two neighbours F "raises" instead of "needs".
    g.edges[0] = { from: "F", to: "N0", rel: "raises" };
    g.edges[1] = { from: "F", to: "N1", rel: "raises" };
    mount(g);
    act(() => {
      vi.advanceTimersByTime(380);
    });
    expect(document.querySelector(".stage-caption b")?.textContent).toBe("needs");
    expect([...document.querySelectorAll(".edge-verb")].map((v) => v.textContent)).toEqual([
      "raises",
      "raises",
    ]);
  });

  it("draws the edges on first paint, but no verb labels on a dense focus (all common)", () => {
    mount(star(DENSE_AT + 1));
    expect(document.querySelectorAll("line.edge")).toHaveLength(DENSE_AT + 1);
    expect(document.querySelectorAll(".edge-verb")).toHaveLength(0);
  });

  it("draws the far edges (ring 2 to its ring 1 parent) when not dense", () => {
    mount(star(2, 2));
    expect(document.querySelectorAll("line.edge-far")).toHaveLength(4);
    expect(document.querySelectorAll("line.edge")).toHaveLength(2);
  });

  it("draws no far edges when dense", () => {
    mount(star(DENSE_AT + 1, 1));
    expect(document.querySelectorAll("line.edge-far")).toHaveLength(0);
  });

  it("an unknown initial focus still sits in the middle as a question card with no edges", () => {
    mount(star(1), "GONE");
    expect(ringOf("GONE")).toBe("0");
    expect(gcard("GONE").className).toContain("gk-question");
    expect(document.querySelectorAll("line")).toHaveLength(0);
  });
});
