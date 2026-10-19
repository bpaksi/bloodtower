import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChipCopy } from "../components/ChipCopy.tsx";
import { Sidebar } from "../components/Sidebar.tsx";
import { workbenchFonts } from "./fonts.ts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Workbench",
  description: "Read-only view of the Return to Dark Tower game design document.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={workbenchFonts}>
      <body>
        <div className="shell">
          <Sidebar />
          <div className="main">
            <header className="topbar">
              <input
                className="search"
                type="search"
                placeholder="Find an ID or a word (coming)"
                aria-label="Find an ID or a word"
                disabled
              />
              <span className="readonly">Read-only · edit by asking Claude</span>
            </header>
            <main className="content">{children}</main>
          </div>
        </div>
        <ChipCopy />
      </body>
    </html>
  );
}
