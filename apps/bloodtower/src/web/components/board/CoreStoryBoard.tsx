"use client";

import type { BoardView } from "bloodtower-protocols";
import { joinWarning } from "../../lib/boardView";

/** v2 story board: levels, heroes, and narration only (display-only). */
export function CoreStoryBoard({ view, debug }: { view: BoardView; debug?: boolean }) {
  const warning = joinWarning(view);
  return (
    <main className="bt-board" data-screen={view.screen}>
      {warning ? (
        <p className="bt-board-warning" role="status">
          {warning}
        </p>
      ) : null}
      {view.levels.map((level) => (
        <section key={level.id} data-level={level.id}>
          <h2 className="text-xl font-semibold text-[var(--bt-accent)]">{level.label}</h2>
          <p className="text-lg whitespace-pre-wrap">{level.shows}</p>
        </section>
      ))}
      {view.narration ? (
        <p className="bt-narration" data-narration={view.narration.lineId}>
          {view.narration.text}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-3">
        {view.heroes.map((hero) => (
          <li key={hero.id} data-hero={hero.id}>
            {hero.name} — {hero.held ? "held" : "waiting"}
          </li>
        ))}
      </ul>
      {debug ? (
        <pre className="mt-4 max-h-64 overflow-auto text-xs opacity-70">
          {JSON.stringify(view, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
