import "./sounds.css";
import Link from "next/link";
import { loadCards } from "../../lib/cards.ts";
import { MOODS, READS_AS } from "../../lib/feel.ts";
import {
  filterSounds,
  formatLength,
  parseSoundFilter,
  type SoundFilter,
  soundGroups,
} from "../../lib/sounds.ts";

export const dynamic = "force-dynamic";

/** aria-current only on the chosen filter, never "false". */
const current = (on: boolean) => (on ? "true" : undefined);

const Unavailable = () => <span className="unavailable">unavailable</span>;

function filterHref(f: SoundFilter): string {
  const q = new URLSearchParams();
  if (f.mood) q.set("mood", f.mood);
  if (f.readsAs) q.set("reads", f.readsAs);
  const s = q.toString();
  return s ? `/sounds?${s}` : "/sounds";
}

export default async function SoundsPage({
  searchParams,
}: {
  searchParams: Promise<{ mood?: string; reads?: string }>;
}) {
  const filter = parseSoundFilter(await searchParams);
  const all = soundGroups(loadCards().cards);
  const groups = filterSounds(all, filter);
  const total = all.reduce((n, g) => n + g.rows.length, 0);
  const recorded = all.reduce((n, g) => n + g.rows.filter((r) => r.feel).length, 0);
  const shown = groups.reduce((n, g) => n + g.rows.length, 0);
  return (
    <>
      <section className="page-head">
        <h1>Tower sounds</h1>
        <p className="muted">
          {total} sounds, {recorded} with a feel recorded. Feel and length are recorded by ear on
          tower-poc&apos;s Sounds page; until then a sound shows &ldquo;unavailable&rdquo;. Filter
          to choose a sound for a mechanic.
        </p>
      </section>
      <nav className="sound-filters" aria-label="Filter sounds">
        <div>
          <span className="muted">Mood</span>
          <Link
            href={filterHref({ ...filter, mood: undefined })}
            aria-current={current(!filter.mood)}
          >
            any
          </Link>
          {MOODS.map((m) => (
            <Link
              key={m}
              href={filterHref({ ...filter, mood: m })}
              aria-current={current(filter.mood === m)}
            >
              {m}
            </Link>
          ))}
        </div>
        <div>
          <span className="muted">Reads as</span>
          <Link
            href={filterHref({ ...filter, readsAs: undefined })}
            aria-current={current(!filter.readsAs)}
          >
            any
          </Link>
          {READS_AS.map((r) => (
            <Link
              key={r}
              href={filterHref({ ...filter, readsAs: r })}
              aria-current={current(filter.readsAs === r)}
            >
              {r}
            </Link>
          ))}
        </div>
      </nav>
      {(filter.mood || filter.readsAs) && (
        <p className="muted">
          {shown} of {total} match.
        </p>
      )}
      {groups.map((g) => (
        <section key={g.area ?? "none"} className="sound-group" id={g.area ?? undefined}>
          <h2>
            {g.category} <span className="muted">{g.rows.length}</span>
          </h2>
          <table className="sound-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Mood</th>
                <th>Reads as</th>
                <th>Strength</th>
                <th>Length</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => {
                const length = formatLength(r.feel?.lengthMs);
                return (
                  <tr key={r.id} data-sound={r.id}>
                    <td>
                      <Link href={`/?focus=${r.id}`} className="mono">
                        {r.id}
                      </Link>
                    </td>
                    <td>
                      {r.name}
                      {r.feel?.avoid && <span className="sound-avoid">avoid</span>}
                    </td>
                    <td>{r.feel?.mood ?? <Unavailable />}</td>
                    <td>{r.feel?.readsAs ?? <Unavailable />}</td>
                    <td>{r.feel?.strength ?? <Unavailable />}</td>
                    <td>{length ?? <Unavailable />}</td>
                    <td>{r.feel?.note ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
      {groups.length === 0 && <p>No sound matches this filter yet.</p>}
    </>
  );
}
