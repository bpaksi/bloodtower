import { Suspense } from "react";
import { FocusGraph } from "../components/FocusGraph.tsx";
import { PromptScopes } from "../components/PromptScopes.tsx";
import { buildGraph } from "../lib/cards.ts";
import type { PromptScope } from "../lib/prompt.ts";

// Read the cards on every request so edits made through Claude show on reload.
export const dynamic = "force-dynamic";

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  const { graph } = buildGraph();
  const cards = Object.values(graph.nodes).filter((n) => n.kind === "card");
  if (cards.length === 0) {
    return (
      <section className="page-head">
        <h1>No cards yet</h1>
        <p className="muted">
          Use New idea to start a thread. Cards live in research/game-design/cards.
        </p>
      </section>
    );
  }
  const firstOpen =
    cards.find((c) => c.id === "AREA-000") ??
    cards.find((c) => c.type === "idea" && c.status === "open") ??
    cards[0];
  const initial = focus && graph.nodes[focus] ? focus : (firstOpen?.id as string);

  // One prompt scope per node: the card file (or the document ID), plus its neighbours' IDs.
  const scopes: Record<string, PromptScope> = {};
  for (const n of Object.values(graph.nodes)) {
    const near = graph.edges
      .filter((e) => e.from === n.id || e.to === n.id)
      .map((e) => (e.from === n.id ? e.to : e.from));
    scopes[`card:${n.id}`] = {
      file: n.kind === "card" ? n.file : null,
      section: [`${n.id} ${n.title}`],
      lines: null,
      ids: [n.id, ...new Set(near)],
    };
  }

  return (
    <>
      <PromptScopes scopes={scopes} />
      <Suspense>
        <FocusGraph graph={graph} initialFocus={initial} />
      </Suspense>
    </>
  );
}
