import "./gaps.css";
import { LATER_RELEASES } from "@dark-tower/workbench";
import Link from "next/link";
import { loadGaps } from "../../lib/gaps.ts";

export const dynamic = "force-dynamic";

export default function GapsPage() {
  const { gaps, groups, titles } = loadGaps();
  const count = (release: string) => gaps.filter((g) => g.release === release).length;
  const later = LATER_RELEASES.filter((r) => count(r) > 0);
  // 1.0 groups keep the rule as their id; 1.1 and 1.2 groups (DEC-696, DEC-812) are prefixed
  // with their release.
  const groupId = (g: (typeof groups)[number]) =>
    g.release === "1.0" ? g.rule : `release-${g.release}-${g.rule}`;
  // The map links to /gaps#AREA-xxx: the first heading of an area keeps that id; later ones are
  // prefixed with their rule so no id appears twice.
  const taken = new Set<string>([
    ...groups.map(groupId),
    ...LATER_RELEASES.map((r) => `release-${r}`),
  ]);
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
          {later.map(
            (r) => ` The ${count(r)} gaps on cards that wait for ${r} come after, on their own.`,
          )}
        </p>
      </section>
      {groups.map((g, i) => (
        <section key={groupId(g)} className="gap-group" id={groupId(g)}>
          {g.release !== "1.0" && groups[i - 1]?.release !== g.release && (
            <h2 id={`release-${g.release}`}>
              Waits for {g.release} <span className="muted">{count(g.release)}</span>
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
