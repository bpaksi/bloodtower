import "./gaps.css";
import Link from "next/link";
import { loadGaps } from "../../lib/gaps.ts";

export const dynamic = "force-dynamic";

export default function GapsPage() {
  const { gaps, groups, titles } = loadGaps();
  // The map links to /gaps#AREA-xxx: the first heading of an area keeps that id; later ones are
  // prefixed with their rule so no id appears twice.
  const taken = new Set<string>(groups.map((g) => g.rule));
  const anchorFor = (rule: string, area: string | null) => {
    if (!area) return undefined;
    const id = taken.has(area) ? `${rule}-${area}` : area;
    taken.add(id);
    return id;
  };
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
              <h3 id={anchorFor(g.rule, a.area)}>
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
