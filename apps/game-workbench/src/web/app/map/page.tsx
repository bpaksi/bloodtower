import { gapsPerArea } from "@dark-tower/workbench/server";
import Link from "next/link";
import { buildGraph } from "../../lib/cards.ts";
import { loadGaps } from "../../lib/gaps.ts";
import { LAYER_LABEL, LAYERS } from "../../lib/graph-types.ts";
import { areaProgress } from "../../lib/progress.ts";

export const dynamic = "force-dynamic";

export default function MapPage() {
  const { graph } = buildGraph();
  const perArea = gapsPerArea(loadGaps().gaps);
  const rows = areaProgress(graph).filter((r) => r.members.some((m) => m.type !== "area"));
  const sum = (k: "decided" | "proposed" | "open") => rows.reduce((n, r) => n + r[k], 0);
  const total = sum("decided") + sum("proposed") + sum("open");

  return (
    <>
      <section className="page-head">
        <h1>Map and progress</h1>
        <p className="muted">
          One row per area. <b className="k-decided">Decided</b> is settled by you,{" "}
          <b className="k-proposed">proposed</b> is drafted and waiting for your call,{" "}
          <b className="k-open">open</b> is still a question or an unexplored idea.
        </p>
      </section>

      <dl className="stats">
        <div>
          <dt>Decided overall</dt>
          <dd>{total ? `${Math.round((sum("decided") / total) * 100)}%` : "unavailable"}</dd>
        </div>
        <div>
          <dt>Decided</dt>
          <dd>{sum("decided")}</dd>
        </div>
        <div>
          <dt>Proposed</dt>
          <dd>{sum("proposed")}</dd>
        </div>
        <div>
          <dt>Open</dt>
          <dd>{sum("open")}</dd>
        </div>
      </dl>

      <div className="areas">
        {rows.map((r) => {
          const n = r.decided + r.proposed + r.open;
          const w = (k: number) => `${n ? (k / n) * 100 : 0}%`;
          return (
            <section key={r.area.id} className="area-row">
              <header>
                <Link href={`/?focus=${r.area.id}`} className="area-name">
                  <span className="mono muted">{r.area.id}</span> {r.area.title}
                </Link>
                <span className="area-pct">
                  {r.percent === null ? "—" : `${r.percent}% decided`}
                  {" · "}
                  <Link href={`/gaps#${r.area.id}`} className="area-gaps">
                    {perArea.get(r.area.id) ?? 0} gaps
                  </Link>
                </span>
              </header>
              <div className="bar" aria-hidden="true">
                <span className="seg-decided" style={{ width: w(r.decided) }} />
                <span className="seg-proposed" style={{ width: w(r.proposed) }} />
                <span className="seg-open" style={{ width: w(r.open) }} />
              </div>
              <p className="area-counts muted">
                {r.decided} decided · {r.proposed} proposed · {r.open} open
                <span className="area-layers">
                  {LAYERS.filter((l) => r.byLayer[l] > 0).map((l) => (
                    <span key={l} className={`layer-tag layer-${l}`} title={LAYER_LABEL[l]}>
                      {l} {r.byLayer[l]}
                    </span>
                  ))}
                </span>
              </p>
              {(r.openQuestions.length > 0 || r.conflicts.length > 0) && (
                <ul className="area-todo">
                  {r.conflicts.map((c) => (
                    <li key={`${c.from.id}-${c.to}`}>
                      <span className="todo-kind conflict">conflict</span>
                      <Link href={`/?focus=${c.from.id}`}>
                        <span className="mono">{c.from.id}</span> {c.from.title}
                      </Link>
                      <span className="muted"> ↔ {c.to}</span>
                      {c.note && <span className="muted"> · {c.note}</span>}
                    </li>
                  ))}
                  {r.openQuestions.map((q) => (
                    <li key={q.id}>
                      <span className="todo-kind">question</span>
                      <Link href={`/?focus=${q.id}`}>
                        <span className="mono">{q.id}</span> {q.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
