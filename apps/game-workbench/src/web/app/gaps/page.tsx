import "./gaps.css";
import Link from "next/link";
import { loadGaps } from "../../lib/gaps.ts";

export const dynamic = "force-dynamic";

export default function GapsPage() {
  const { gaps, groups, titles } = loadGaps();
  const later = gaps.filter((g) => g.release === "1.1").length;
  // 1.0 groups keep the rule as their id; 1.1 groups (DEC-696) are prefixed.
  const groupId = (g: (typeof groups)[number]) =>
    g.release === "1.0" ? g.rule : `release-1.1-${g.rule}`;
  // The map links to /gaps#AREA-xxx: the first heading of an area keeps that id; later ones are
  // prefixed with their rule so no id appears twice.
  const taken = new Set<string>([...groups.map(groupId), "release-1.1"]);
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
          {later > 0 && ` The ${later} gaps on cards that wait for 1.1 come last, on their own.`}
        </p>
      </section>
      {groups.map((g, i) => (
        <section key={groupId(g)} className="gap-group" id={groupId(g)}>
          {g.release === "1.1" && groups[i - 1]?.release !== "1.1" && (
            <h2 id="release-1.1">
              Waits for 1.1 <span className="muted">{later}</span>
            </h2>
          )}
          <h2>
            {g.label} <span className="muted">{g.count}</span>
          </h2>
          {g.byArea.map((a) => (
            <div key={a.area ?? "none"} className="gap-area">
              <h3 id={anchorFor(groupId(g), a.area)}>
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
