import { ChipCopy, HistoryButtons, PromptStarter } from "@dark-tower/workbench/components";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sidebar } from "../components/Sidebar.tsx";
import { loadCards } from "../lib/cards.ts";
import { GAME_PROMPT } from "../lib/prompt.ts";
import "@dark-tower/workbench/styles/globals.css";
import "@dark-tower/workbench/styles/graph.css";

export const metadata: Metadata = {
  title: "Game Workbench",
  description: "Read-only view of the Return to Dark Tower game design document.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // A card that does not parse is left out of every page and listed here instead.
  const { errors } = loadCards();
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <Sidebar />
          <div className="main">
            <header className="topbar">
              <HistoryButtons />
              <input
                className="search"
                type="search"
                placeholder="Find an ID or a word (coming)"
                aria-label="Find an ID or a word"
                disabled
              />
              <button type="button" className="btn-primary" data-prompt="new">
                New idea
              </button>
              <span className="readonly">Read-only · changes go through Claude</span>
            </header>
            {errors.length > 0 && (
              <div className="card-errors" role="alert">
                <b>
                  {errors.length} card file{errors.length === 1 ? "" : "s"} could not be read
                </b>
                <ul>
                  {errors.map((e) => (
                    <li key={e} className="mono">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <main className="content">{children}</main>
          </div>
        </div>
        <ChipCopy />
        <PromptStarter config={GAME_PROMPT} />
      </body>
    </html>
  );
}
