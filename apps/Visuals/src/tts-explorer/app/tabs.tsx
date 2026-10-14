"use client";

import { useState } from "react";
import Explorer, { css, tab } from "./explorer.tsx";
import Scenarios from "./scenarios.tsx";

export default function Tabs() {
  const [view, setView] = useState<"scenarios" | "explorer">("scenarios");
  return (
    <main style={css.page}>
      <h1 style={{ textAlign: "center", fontWeight: 300 }}>Gemini TTS Explorer</h1>
      <nav style={{ textAlign: "center", marginBottom: 20 }}>
        <button
          type="button"
          style={tab(view === "scenarios")}
          onClick={() => setView("scenarios")}
        >
          Scenarios
        </button>
        <button type="button" style={tab(view === "explorer")} onClick={() => setView("explorer")}>
          Free-form explorer
        </button>
      </nav>
      {view === "scenarios" ? <Scenarios /> : <Explorer />}
    </main>
  );
}
