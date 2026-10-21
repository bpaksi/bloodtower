"use client";
import { useEffect, useMemo, useState } from "react";
import { TuningPanel } from "../../../components/TuningPanel.tsx";
import { TvFrame } from "../../../components/TvFrame.tsx";
import { createRng } from "../../../lib/rng.ts";
import { defaultValues } from "../../../lib/tuning.ts";
import { tvPx } from "../../../lib/tv.ts";
import { assignHolders, LAYOUTS, type LayoutId } from "./data.ts";
import { FIELDS } from "./fields.ts";
import { Layout } from "./layouts.tsx";

export default function BoardPage() {
  const [layout, setLayout] = useState<LayoutId>("waiting");
  const [values, setValues] = useState(defaultValues(FIELDS));
  const [seed, setSeed] = useState("1");
  const [clean, setClean] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const l = q.get("layout");
    const found = LAYOUTS.find((x) => x.id === l);
    if (found) setLayout(found.id);
    if (q.get("clean") === "1") setClean(true);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const i = LAYOUTS.findIndex((x) => x.id === layout);
      const go = (d: number) => {
        const next = LAYOUTS[(i + d + LAYOUTS.length) % LAYOUTS.length];
        if (next) setLayout(next.id);
      };
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "h") setClean((c) => !c);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout]);

  const holders = useMemo(() => assignHolders(createRng(seed)), [seed]);
  const min = Number(values.minTextPx);
  const sizes = {
    min,
    body: Number(values.bodyPx),
    heading: Number(values.headingPx),
    big: Number(values.bigPx),
  };

  return (
    <>
      <TvFrame style={{ fontSize: tvPx(min) }}>
        <Layout id={layout} sizes={sizes} holders={holders} />
      </TvFrame>
      {!clean && (
        <div
          style={{
            position: "fixed",
            top: 8,
            left: 8,
            maxWidth: 380,
            maxHeight: "90vh",
            overflow: "auto",
            background: "rgba(0,0,0,0.85)",
            color: "#eee",
            padding: 8,
            fontSize: 14,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLayout(l.id)}
                aria-pressed={l.id === layout}
                title={l.cards}
                style={{ fontWeight: l.id === layout ? "bold" : "normal" }}
              >
                {l.name}
              </button>
            ))}
          </div>
          <p style={{ margin: "6px 0" }}>Arrow keys switch layouts; H hides these controls.</p>
          <label>
            Seed (hero holders){" "}
            <input value={seed} onChange={(e) => setSeed(e.target.value)} size={8} />
          </label>
          <TuningPanel fields={FIELDS} values={values} onChange={setValues} />
          <button type="button" onClick={() => setClean(true)}>
            Hide controls
          </button>
        </div>
      )}
    </>
  );
}
