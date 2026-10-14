"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { STORIES } from "../data/stories/index.ts";
import type { RenderResult } from "../lib/stories/render.ts";
import { css, Player } from "./explorer.tsx";

const MODELS = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"];

export default function Scenarios() {
  const [storyId, setStoryId] = useState(STORIES[0].id);
  const story = STORIES.find((s) => s.id === storyId) ?? STORIES[0];
  const [scenarioId, setScenarioId] = useState(story.scenarios[0].id);
  const scenario = story.scenarios.find((s) => s.id === scenarioId) ?? story.scenarios[0];
  const [model, setModel] = useState(MODELS[0]);
  const [result, setResult] = useState<RenderResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const people = useMemo(
    () => [story.narrator, ...story.characters.filter((c) => scenario.cast.includes(c.id))],
    [story, scenario],
  );
  const nameOf = (id: string) =>
    id === "narrator" ? "Narrator" : (story.characters.find((c) => c.id === id)?.name ?? id);

  const render = useCallback(
    async (generate: boolean) => {
      setErr("");
      if (generate) setBusy(true);
      try {
        const r = await fetch("/api/scenarios/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId, scenarioId, model, generate }),
        });
        const j = (await r.json()) as RenderResult & { error?: string };
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        setResult(j);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [storyId, scenarioId, model],
  );

  // On selection change, load whatever is already cached (no API calls).
  useEffect(() => {
    setResult(null);
    render(false);
  }, [render]);

  return (
    <div style={css.grid}>
      <section style={css.card}>
        <label style={css.label} htmlFor="story">
          Story
        </label>
        <select
          id="story"
          style={css.input}
          value={storyId}
          onChange={(e) => {
            const s = STORIES.find((x) => x.id === e.target.value) ?? STORIES[0];
            setStoryId(s.id);
            setScenarioId(s.scenarios[0].id);
          }}
        >
          {STORIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 13, color: "#b8a888" }}>{story.summary}</p>

        <label style={css.label} htmlFor="scenario">
          Scenario
        </label>
        <select
          id="scenario"
          style={css.input}
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
        >
          {story.scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>

        <label style={css.label} htmlFor="sc-model">
          Model
        </label>
        <select
          id="sc-model"
          style={css.input}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <h2 style={{ fontSize: 18 }}>Scene</h2>
        <p style={{ fontSize: 14, lineHeight: 1.5 }}>{scenario.scene}</p>

        <h2 style={{ fontSize: 18 }}>Characters</h2>
        {people.map((c) => (
          <div key={c.id} style={{ borderTop: "1px solid #3a322b", padding: "8px 0" }}>
            <strong>{c.name}</strong>{" "}
            <span style={{ fontSize: 12, color: "#d9a066" }}>
              {c.voice} · “{c.style}”
            </span>
            <div style={{ fontSize: 12, color: "#b8a888", fontStyle: "italic" }}>
              {c.voiceReason}
            </div>
            <div style={{ fontSize: 13 }}>{c.backstory}</div>
          </div>
        ))}
      </section>

      <section style={css.card}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button type="button" style={css.btn} disabled={busy} onClick={() => render(true)}>
            {busy ? "Generating…" : result?.full ? "Regenerate missing (cached)" : "Generate scene"}
          </button>
          {result && (
            <small>
              {result.lines.length - result.missing}/{result.lines.length} lines cached
              {result.generatedNow ? ` · ${result.generatedNow} generated now` : ""}
            </small>
          )}
          {err && <span style={{ color: "#f88" }}>{err}</span>}
          {result?.stopReason && (
            <span style={{ color: "#f88" }}>Stopped early: {result.stopReason}</span>
          )}
        </div>
        {result?.full && (
          <div style={{ marginTop: 12 }}>
            <Player key={result.full.url} src={result.full.url} />
            <small>
              Full scene · {result.full.seconds}s ·{" "}
              <a style={css.link} href={result.full.url} download={`${storyId}-${scenarioId}.wav`}>
                download
              </a>
            </small>
          </div>
        )}

        <h2 style={{ fontSize: 18 }}>Script</h2>
        <ol style={{ paddingLeft: 20 }}>
          {scenario.script.map((line, i) => {
            const r = result?.lines[i];
            return (
              <li key={`${line.speaker}:${line.text}`} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#d9a066" }}>
                  {nameOf(line.speaker)}
                  {line.style ? ` · (${line.style})` : ""}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontStyle: line.speaker === "narrator" ? "italic" : "normal",
                  }}
                >
                  {line.text}
                </div>
                {r?.url && <Player src={r.url} />}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
