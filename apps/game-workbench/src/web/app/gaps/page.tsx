import "./gaps.css";
import Link from "next/link";
import { loadGaps } from "../../lib/gaps.ts";

export const dynamic = "force-dynamic";

export default function GapsPage() {
  const { gaps, groups, titles } = loadGaps();
  return (
    <>
      <section className="page-head">
        <h1>Gaps</h1>
        <p className="muted">
          {gaps.length} gaps: places where the design is thin. They are warnings, not errors. Each
          row opens its card; a card in several areas is listed under each.
        </p>
      </section>
      {groups.map((g) => (
        <section key={g.rule} className="gap-group" id={g.rule}>
          <h2>
            {g.label} <span className="muted">{g.count}</span>
          </h2>
          {g.byArea.map((a) => (
            <div key={a.area ?? "none"} className="gap-area">
              <h3 id={a.area ? `${a.area}` : undefined}>
                {a.area ? (
                  <>
                    <span className="mono muted">{a.area}</span> {titles[a.area] ?? a.area}
                  </>
                ) : (
                  "No area"
                )}{" "}
                <span className="muted">{a.gaps.length}</span>
              </h3>
              <ul>
                {a.gaps.map((gap) => (
                  <li key={`${gap.id}-${gap.detail ?? ""}`}>
                    <Link href={`/?focus=${gap.id}`}>
                      <span className="mono">{gap.id}</span> {gap.title}
                    </Link>
                    {gap.detail && <span className="muted"> · {gap.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
