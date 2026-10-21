"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { backlinks, type LinkGroup, outlinks } from "../backlinks.ts";
import type { Graph, GraphNode } from "../graph-types.ts";
import { labelPoint, layout, type Neighbour } from "../layout.ts";
import { Chip } from "./Chip.tsx";
import { PANEL_OPEN_DETAIL } from "./Panels.tsx";
import { PanelToggle } from "./PanelToggle.tsx";

function parentDir(dir: string): string {
  return dir.split("/").slice(0, -1).join("/");
}

function nodeKind(n: GraphNode | undefined): string {
  if (!n) return "question";
  return n.kind === "card" ? (n.type as string) : n.idKind;
}

/** Where things live, as plain data (a server page cannot hand functions to this component). */
export type GraphPlaces = {
  /** The graph page; a focus is `<graphHref>?focus=<id>`. */
  graphHref: string;
  /** A document is `<docBase><slug>`. */
  docBase: string;
  /** Repo-relative folder that card sources are relative to. */
  sourceDir: string;
  /** Label per node kind (card type or ref ID kind). */
  kindLabels: Record<string, string>;
  /** Label per layer; empty when the workbench has no layers. */
  layerLabels: Record<string, string>;
};

function docHref(places: GraphPlaces, file: string, lines?: string): string {
  const doc = `${places.docBase}${file.replace(/\.md$/, "")}`;
  return lines ? `${doc}#L${lines.split("-")[0]}` : doc;
}

/**
 * The focus graph: one card in the centre, its links around it with the verb on each line, and
 * fainter cards one step further out. Clicking a card moves it to the centre; the URL keeps
 * ?focus= so the back button and links work.
 */
export function FocusGraph({
  graph,
  initialFocus,
  places,
}: {
  graph: Graph;
  initialFocus: string;
  places: GraphPlaces;
}) {
  const params = useSearchParams();
  const urlFocus = params.get("focus");
  const focus = urlFocus && graph.nodes[urlFocus] ? urlFocus : initialFocus;

  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 640 });
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { placed, ring1, dense } = useMemo(
    () => layout(graph, focus, size.w, size.h),
    [graph, focus, size],
  );
  const at = new Map(placed.map((p) => [p.id, p]));
  const verbs = new Map(ring1.map((n) => [n.id, n]));
  // On a busy card, the most common verb goes in a caption instead of on every line.
  const verbText = (id: string) => verbs.get(id)?.verbs.join(" · ") ?? "";
  const counts = new Map<string, number>();
  for (const n of ring1) counts.set(verbText(n.id), (counts.get(verbText(n.id)) ?? 0) + 1);
  const common = dense ? [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;

  const go = (id: string) => {
    // Below 1200 px a pick opens the detail panel over the graph (even on the focused card).
    window.dispatchEvent(new Event(PANEL_OPEN_DETAIL));
    if (id === focus) return;
    window.history.pushState(null, "", `${places.graphHref}?focus=${encodeURIComponent(id)}`);
  };

  // Edges re-draw after the cards have moved.
  const [edgesFor, setEdgesFor] = useState(focus);
  useEffect(() => {
    const t = setTimeout(() => setEdgesFor(focus), 380);
    return () => clearTimeout(t);
  }, [focus]);
  const centre = at.get(focus);

  return (
    <div className="graph-layout">
      <div className="stage" ref={stage}>
        {edgesFor === focus && centre && (
          <svg className="edges" width={size.w} height={size.h} aria-hidden="true">
            {placed
              .filter((p) => p.ring === 2 && p.via)
              .map((p) => {
                const from = at.get(p.via as string);
                return from ? (
                  <line
                    key={`2-${p.id}`}
                    className="edge-far"
                    x1={from.x}
                    y1={from.y}
                    x2={p.x}
                    y2={p.y}
                  />
                ) : null;
              })}
            {placed
              .filter((p) => p.ring === 1)
              .map((p) => (
                <line
                  key={`1-${p.id}`}
                  className="edge"
                  x1={centre.x}
                  y1={centre.y}
                  x2={p.x}
                  y2={p.y}
                />
              ))}
          </svg>
        )}
        {edgesFor === focus &&
          centre &&
          placed
            .filter((p) => p.ring === 1 && verbText(p.id) !== common)
            .map((p) => (
              <span
                key={`v-${p.id}`}
                className="edge-verb"
                style={{ left: labelPoint(centre, p).x, top: labelPoint(centre, p).y }}
              >
                {verbText(p.id)}
              </span>
            ))}
        {dense && common && (
          <p className="stage-caption">
            {ring1.length} links · unlabelled lines are <b>{common}</b>
          </p>
        )}
        {placed.map((p) => (
          <GraphCard
            key={p.id}
            node={graph.nodes[p.id]}
            id={p.id}
            ring={p.ring}
            compact={p.compact === true}
            x={p.x}
            y={p.y}
            onPick={go}
            neighbour={verbs.get(p.id)}
          />
        ))}
      </div>
      <Detail graph={graph} id={focus} onPick={go} places={places} />
    </div>
  );
}

function GraphCard(props: {
  node: GraphNode | undefined;
  id: string;
  ring: 0 | 1 | 2;
  compact: boolean;
  x: number;
  y: number;
  neighbour?: Neighbour;
  onPick: (id: string) => void;
}) {
  const { node, id, ring, compact, x, y, onPick } = props;
  const small = ring === 2 || compact;
  const kind = nodeKind(node);
  const title = node?.title ?? id;
  const status = node?.kind === "card" ? node.status : "in docs";
  return (
    <button
      type="button"
      className={`gcard ring-${ring}${compact ? " compact" : ""} gk-${kind}${node?.kind === "ref" ? " is-ref" : ""} st-${status.replace(" ", "-")}`}
      style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
      onClick={() => onPick(id)}
      title={small ? `${id} · ${title}` : undefined}
    >
      <span className="gcard-top">
        <span className="gcard-id">{id}</span>
        {!small && <span className="gcard-status">{status}</span>}
      </span>
      <span className="gcard-title">{title}</span>
      {!small && node?.kind === "card" && node.layer && (
        <span className={`layer-tag layer-${node.layer}`}>{node.layer}</span>
      )}
    </button>
  );
}

function LinkList(props: {
  title: string;
  groups: LinkGroup[];
  graph: Graph;
  onPick: (id: string) => void;
}) {
  const { title, groups, graph, onPick } = props;
  return (
    <>
      <h2>{title}</h2>
      {groups.length === 0 && <p className="muted small">None.</p>}
      {groups.map((g) => (
        <div key={g.verb} className="detail-links">
          <span className="verb">{g.verb}</span>
          <ul>
            {g.links.map((l) => (
              <li key={`${l.id}|${l.note ?? ""}`}>
                <button type="button" className="linklike" onClick={() => onPick(l.id)}>
                  <span className="mono">{l.id}</span> {graph.nodes[l.id]?.title}
                </button>
                {l.note && <span className="muted small link-note"> {l.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function Detail(props: {
  graph: Graph;
  id: string;
  onPick: (id: string) => void;
  places: GraphPlaces;
}) {
  const { graph, id, onPick, places } = props;
  const node = graph.nodes[id];
  if (!node) return null;
  const kind = nodeKind(node);

  return (
    <aside className="detail">
      <PanelToggle side="right" />
      <div className="panel-body">
        <div className="detail-head">
          <Chip id={id} kind={kind} label={places.kindLabels[kind] ?? kind} />
          <span className="muted">
            {places.kindLabels[kind] ?? kind} ·{" "}
            {node.kind === "card" ? node.status : "document ID, no card"}
          </span>
        </div>
        {node.kind === "card" && node.layer && (
          <p className={`layer-line layer-${node.layer}`}>
            {places.layerLabels[node.layer] ?? node.layer}
          </p>
        )}
        <h1>{node.title}</h1>
        {node.kind === "card" && node.by && <p className="muted small">{node.by}</p>}
        {node.kind === "card" && node.bodyHtml && (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered from our own card files
          <div className="prose small" dangerouslySetInnerHTML={{ __html: node.bodyHtml }} />
        )}

        <div className="detail-actions">
          <button
            type="button"
            className="btn-primary"
            data-prompt={`card:${id}`}
            data-prompt-mode="add"
          >
            Continue from here
          </button>
          <button
            type="button"
            className="prompt-btn"
            data-prompt={`card:${id}`}
            data-prompt-mode="change"
          >
            Change
          </button>
          <button
            type="button"
            className="prompt-btn"
            data-prompt={`card:${id}`}
            data-prompt-mode="ask"
          >
            Ask
          </button>
        </div>

        <LinkList title="Points here" groups={backlinks(graph, id)} graph={graph} onPick={onPick} />
        <LinkList
          title="Links from here"
          groups={outlinks(graph, id)}
          graph={graph}
          onPick={onPick}
        />

        {node.kind === "card" && node.sources.length > 0 && (
          <>
            <h2>Sources</h2>
            <ul className="sources">
              {node.sources.map((s) => (
                <li key={`${s.file}${s.lines}`}>
                  {s.file.includes("/") ? (
                    // Outside the workbench folder: it can't open it, so show the path.
                    <span className="mono" title={`${places.sourceDir}/${s.file}`}>
                      {s.file.replace(/^\.\.\//, `${parentDir(places.sourceDir)}/`)}
                      {s.lines ? ` · lines ${s.lines}` : ""}
                    </span>
                  ) : (
                    <Link href={docHref(places, s.file, s.lines)}>
                      {s.file}
                      {s.lines ? ` · lines ${s.lines}` : ""}
                    </Link>
                  )}
                  {s.note && <span className="muted"> {s.note}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
        {node.kind === "ref" && (
          <>
            <h2>Found in</h2>
            {node.foundIn.length === 0 ? (
              <p className="unavailable">No document names this ID directly.</p>
            ) : (
              <ul className="sources">
                {node.foundIn.map((f) => (
                  <li key={f}>
                    <Link href={docHref(places, f)}>{f}</Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {node.kind === "card" && <p className="mono muted small file">{node.file}</p>}
      </div>
    </aside>
  );
}
