import "./sounds.css";
import Link from "next/link";
import { loadCards } from "../../lib/cards.ts";
import { TONES } from "../../lib/feel.ts";
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
  if (f.tone) q.set("tone", f.tone);
  const s = q.toString();
  return s ? `/sounds?${s}` : "/sounds";
}

export default async function SoundsPage({
  searchParams,
}: {
  searchParams: Promise<{ tone?: string | string[] }>;
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
          {total} sounds, {recorded} with a feel recorded. Feel and length are recorded by ear in
          the sound review tool; until then a sound shows &ldquo;unavailable&rdquo;. Filter to
          choose a sound for a mechanic.
        </p>
      </section>
      <nav className="sound-filters" aria-label="Filter sounds">
        <div>
          <span className="muted">Tone</span>
          <Link href={filterHref({})} aria-current={current(!filter.tone)}>
            any
          </Link>
          {TONES.map((t) => (
            <Link key={t} href={filterHref({ tone: t })} aria-current={current(filter.tone === t)}>
              {t}
            </Link>
          ))}
        </div>
      </nav>
      {filter.tone && (
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
                <th>Tone</th>
                <th title="From the Play press to Stopped">Length</th>
                <th>Sounds like</th>
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
                    <td>{r.name}</td>
                    <td>{r.feel?.tone ?? <Unavailable />}</td>
                    <td>{length ?? <Unavailable />}</td>
                    <td>{r.feel?.soundsLike ?? <Unavailable />}</td>
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
