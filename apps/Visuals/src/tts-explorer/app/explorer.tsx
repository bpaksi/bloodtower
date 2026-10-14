"use client";

import { type CSSProperties, useEffect, useState } from "react";
import type { ModelInfo, Speaker, Voice } from "../lib/gemini.ts";
import type { HistoryEntry } from "../lib/store.ts";

export const css: Record<string, CSSProperties> = {
  page: {
    fontFamily: "system-ui, sans-serif",
    background: "#14110f",
    color: "#e8e0d0",
    minHeight: "100vh",
    padding: 24,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(380px, 1fr) minmax(320px, 1fr)",
    gap: 24,
    maxWidth: 1300,
    margin: "0 auto",
  },
  card: {
    background: "#211c18",
    border: "1px solid #3a322b",
    borderRadius: 8,
    padding: 16,
  },
  label: {
    display: "block",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#b8a888",
    margin: "12px 0 4px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0f0d0b",
    color: "#e8e0d0",
    border: "1px solid #3a322b",
    borderRadius: 4,
    padding: 8,
    font: "inherit",
  },
  btn: {
    background: "#8a5a2b",
    color: "#fff",
    border: 0,
    borderRadius: 4,
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 600,
  },
  link: { color: "#d9a066", fontSize: 12 },
};

export const tab = (active: boolean): CSSProperties => ({
  padding: "6px 14px",
  border: "1px solid #3a322b",
  background: active ? "#8a5a2b" : "transparent",
  color: "#e8e0d0",
  cursor: "pointer",
});

interface Meta {
  models: ModelInfo[];
  voices: Voice[];
  keySet: boolean;
}

function VoiceSelect(props: {
  id: string;
  voices: Voice[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      id={props.id}
      style={css.input}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    >
      {props.voices.map((v) => (
        <option key={v.name} value={v.name}>
          {v.name} — {v.desc}
        </option>
      ))}
    </select>
  );
}

export function Player({ src, autoPlay }: { src: string; autoPlay?: boolean }) {
  return (
    <audio src={src} controls autoPlay={autoPlay} preload="none" style={{ width: "100%" }}>
      <track kind="captions" />
    </audio>
  );
}

export default function Explorer() {
  const [meta, setMeta] = useState<Meta>({
    models: [],
    voices: [],
    keySet: true,
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [model, setModel] = useState("gemini-3.8-flash-tts");
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [voice, setVoice] = useState("Charon");
  const [style, setStyle] = useState("speak as a weary old ranger on a dark forest road");
  const [text, setText] = useState(
    "The road narrows here. Mind the roots... and whatever watches from between the trees.",
  );
  const [backstory, setBackstory] = useState("");
  const [scene, setScene] = useState("");
  const [speakers, setSpeakers] = useState<Speaker[]>([
    { name: "Ranger", voice: "Algenib" },
    { name: "Stranger", voice: "Enceladus" },
  ]);
  const [script, setScript] = useState(
    "Ranger: Who goes there? Step into the lantern light.\nStranger: Only a traveler, friend. The tower calls to me as it calls to you.",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [current, setCurrent] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((m: Meta) => setMeta(m));
    fetch("/api/history")
      .then((r) => r.json())
      .then((h: HistoryEntry[]) => setHistory(h));
  }, []);

  const generate = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          mode,
          voice,
          style,
          text,
          backstory,
          scene,
          speakers,
          script,
        }),
      });
      const j = (await r.json()) as HistoryEntry & { error?: string };
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      setCurrent(j);
      setHistory((h) => [j, ...h]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const setSpeaker = (i: number, patch: Partial<Speaker>) =>
    setSpeakers((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div>
      {!meta.keySet && (
        <p style={{ color: "#f88", textAlign: "center" }}>
          GEMINI_API_KEY is not set on the server.
        </p>
      )}
      <div style={css.grid}>
        <section style={css.card}>
          <label style={css.label} htmlFor="model">
            Model
          </label>
          <select
            id="model"
            style={css.input}
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {meta.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} — {m.note}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 12 }}>
            <button type="button" style={tab(mode === "single")} onClick={() => setMode("single")}>
              Single speaker
            </button>
            <button type="button" style={tab(mode === "multi")} onClick={() => setMode("multi")}>
              Multi speaker (2)
            </button>
          </div>

          <label style={css.label} htmlFor="style">
            Style / direction
          </label>
          <input
            id="style"
            style={css.input}
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          />
          <label style={css.label} htmlFor="backstory">
            Character backstory (optional, folded into style)
          </label>
          <textarea
            id="backstory"
            style={css.input}
            rows={2}
            value={backstory}
            onChange={(e) => setBackstory(e.target.value)}
          />
          <label style={css.label} htmlFor="scene">
            Scene (optional, folded into style)
          </label>
          <textarea
            id="scene"
            style={css.input}
            rows={2}
            value={scene}
            onChange={(e) => setScene(e.target.value)}
          />

          {mode === "single" ? (
            <>
              <label style={css.label} htmlFor="voice">
                Voice ({meta.voices.length})
              </label>
              <VoiceSelect id="voice" voices={meta.voices} value={voice} onChange={setVoice} />
              <label style={css.label} htmlFor="text">
                Text (verbatim; inline tags like &lt;sigh&gt; &lt;short pause&gt; work on 3.8)
              </label>
              <textarea
                id="text"
                style={css.input}
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          ) : (
            <>
              {speakers.map((s, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed two-slot list
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={css.label} htmlFor={`sp-name-${i}`}>
                      Speaker {i + 1} name
                    </label>
                    <input
                      id={`sp-name-${i}`}
                      style={css.input}
                      value={s.name}
                      onChange={(e) => setSpeaker(i, { name: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={css.label} htmlFor={`sp-voice-${i}`}>
                      Voice
                    </label>
                    <VoiceSelect
                      id={`sp-voice-${i}`}
                      voices={meta.voices}
                      value={s.voice}
                      onChange={(v) => setSpeaker(i, { voice: v })}
                    />
                  </div>
                </div>
              ))}
              <label style={css.label} htmlFor="script">
                Dialog script (&quot;Name: line&quot; per line)
              </label>
              <textarea
                id="script"
                style={css.input}
                rows={7}
                value={script}
                onChange={(e) => setScript(e.target.value)}
              />
            </>
          )}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <button type="button" style={css.btn} disabled={busy} onClick={generate}>
              {busy ? "Generating…" : "Generate"}
            </button>
            {err && <span style={{ color: "#f88" }}>{err}</span>}
          </div>
          {current && (
            <div style={{ marginTop: 16 }}>
              <Player key={current.url} src={current.url} autoPlay />
              <small>
                {current.seconds}s audio · {current.ms} ms ·{" "}
                <a style={css.link} href={current.url} download={current.file}>
                  download
                </a>
              </small>
            </div>
          )}
        </section>

        <section style={css.card}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>History ({history.length})</h2>
          {history.map((h) => (
            <div key={h.id} style={{ borderTop: "1px solid #3a322b", padding: "10px 0" }}>
              <div style={{ fontSize: 12, color: "#b8a888" }}>
                {h.model} ·{" "}
                {h.mode === "multi"
                  ? (h.speakers ?? []).map((s) => `${s.name}=${s.voice}`).join(", ")
                  : h.voice}{" "}
                · {h.seconds}s
              </div>
              {h.style && <div style={{ fontSize: 12, fontStyle: "italic" }}>{h.style}</div>}
              <div
                style={{
                  fontSize: 13,
                  whiteSpace: "pre-wrap",
                  margin: "4px 0",
                }}
              >
                {h.text}
              </div>
              <Player src={h.url} />
              <a style={css.link} href={h.url} download={h.file}>
                Download {h.file}
              </a>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
