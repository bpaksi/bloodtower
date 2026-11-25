import { parseStatsLines, STATS_COPY } from "../../../engine/views/stats.ts";

/**
 * The game's stats on the Story board (SCR-019, DEC-627, C3/17). It paints the lines the host sent
 * on the `game-stats` level and decides nothing itself. A finished game (its first row is the
 * outcome) is "Tonight's tale": the stored stats, the key moments after the gold, then the length
 * against the best and the average and the ratings per seat. A quit game keeps C2's read-out.
 */
export function GameStats({ label, shows }: { label: string; shows: string }) {
  const { rows, moments, momentsAfter } = parseStatsLines(shows);
  const stored = rows[0]?.label === "Outcome";
  const row = (entry: { label: string; value: string }) => (
    <div key={entry.label} className="bt-stat-row" data-stat-row={entry.label}>
      <dt>{entry.label}</dt>
      <dd data-stat-value="">{entry.value}</dd>
    </div>
  );
  return (
    <div data-startup-panel="game-stats" data-game-stats-board={stored ? "stored" : "quit"}>
      <p className="bt-kicker">{stored ? label : "Tonight's games"}</p>
      <h1 className="bt-startup-title">{stored ? STATS_COPY.title : label}</h1>
      <dl className="bt-stat-rows" data-stat-rows="">
        {rows.slice(0, momentsAfter).map(row)}
        {moments.length > 0 ? (
          <div className="bt-stat-moments" data-key-moments="">
            <dt>{STATS_COPY.momentsTitle}</dt>
            <dd>
              <ul>
                {moments.map((moment, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a moment can repeat, and the list never reorders.
                  <li key={`${index}-${moment}`} data-key-moment="">
                    {moment}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
        {rows.slice(momentsAfter).map(row)}
      </dl>
    </div>
  );
}
