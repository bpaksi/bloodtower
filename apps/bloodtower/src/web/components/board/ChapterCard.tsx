"use client";

import type { BoardView } from "bloodtower-protocols";
import { packStillImageUrl } from "../../lib/packAsset";
import { DialogFrame } from "./DialogFrame";

export type ChapterBeat = NonNullable<NonNullable<BoardView["table"]>["chapterBeat"]>;

/** The story pack's cover stands in for each chapter's painting until per-chapter art is packed. */
const PAINTING_FILE = "cover.png";

/**
 * UI-020 on the Story board (C3/15): the chapter card at the chapter's start (painting, name,
 * goal), the same card stamped won at its end, and the close Scroll after the stamp (UI-044).
 * No button: the host ends each beat when its narration or cue ends, or after `holdMs` (EV-11).
 * Display only. Styles are local to this file.
 */
export function ChapterCard({ beat }: { beat: ChapterBeat }) {
  if (beat.stage === "close") {
    return (
      <DialogFrame
        size="compact"
        className="bt-ink-in"
        data-chapter-beat="close"
        data-chapter={beat.chapter}
        data-scroll=""
        data-hold-ms={beat.holdMs}
        role="status"
        style={{ textAlign: "center" }}
      >
        <p className="bt-label" data-chapter-stamp="" data-dialog-line="">
          {beat.label}
          {beat.name ? `: ${beat.name}` : ""} · {beat.stamp}
        </p>
        {beat.close ? (
          <p data-chapter-close="" data-dialog-line="" style={{ fontSize: "1.6em" }}>
            {beat.close}
          </p>
        ) : null}
      </DialogFrame>
    );
  }
  return (
    <DialogFrame
      className="bt-ink-in"
      data-chapter-beat={beat.stage}
      data-chapter={beat.chapter}
      data-chapter-id={beat.chapterId}
      data-cue={beat.cue ?? undefined}
      data-hold-ms={beat.holdMs}
      role="status"
      style={{ textAlign: "center" }}
    >
      <div style={{ position: "relative" }}>
        {/* biome-ignore lint/performance/noImgElement: pack stills are static files on the session host */}
        <img
          data-painting=""
          data-dialog-art=""
          src={packStillImageUrl(PAINTING_FILE)}
          alt=""
          style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }}
        />
        {beat.stamp ? (
          <span
            data-chapter-stamp=""
            style={{
              position: "absolute",
              right: "6%",
              top: "8%",
              transform: "rotate(-8deg)",
              border: "4px solid #8a1e14",
              color: "#8a1e14",
              background: "rgba(233, 217, 180, 0.85)",
              padding: "0.1em 0.5em",
              fontSize: "2em",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {beat.stamp}
          </span>
        ) : null}
      </div>
      <p className="bt-label" data-chapter-label="" data-dialog-line="">
        {beat.label}
      </p>
      {beat.name ? (
        <h1
          data-chapter-name=""
          data-dialog-line=""
          style={{ margin: "0.2em 0", fontSize: "2.4em" }}
        >
          {beat.name}
        </h1>
      ) : null}
      {beat.goal ? (
        <p data-chapter-goal="" data-dialog-line="" style={{ fontSize: "1.3em" }}>
          {beat.goal}
        </p>
      ) : null}
    </DialogFrame>
  );
}
