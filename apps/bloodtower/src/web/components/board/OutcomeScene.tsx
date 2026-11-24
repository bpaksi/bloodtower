"use client";

import type { BoardView } from "bloodtower-protocols";
import { packStillImageUrl } from "../../lib/packAsset";
import { DialogFrame } from "./DialogFrame";

export type Outcome = NonNullable<NonNullable<BoardView["table"]>["outcome"]>;

/** The story pack's cover stands in for the ending painting until per-outcome art is packed. */
const PAINTING_FILE = "cover.png";

/**
 * SCR-018 on the Story board (C3/16): the win or loss outcome scene (ending painting + Loremaster
 * caption), the closing line on a win (chapter-1 or finale), and the one-line summary before
 * Game stats. No button: the host moves on when narration or cue ends, or after `holdMs`.
 * Display only. Styles are local to this file.
 */
export function OutcomeScene({ outcome }: { outcome: Outcome }) {
  if (outcome.stage === "summary") {
    return (
      <DialogFrame
        size="compact"
        className="bt-ink-in"
        data-outcome-scene={outcome.sceneId}
        data-outcome-stage="summary"
        data-outcome={outcome.outcome}
        data-hold-ms={outcome.holdMs}
        role="status"
        style={{ textAlign: "center" }}
      >
        <p
          data-outcome-summary=""
          data-dialog-line=""
          style={{ fontSize: "1.6em", margin: "0.4em 0" }}
        >
          {outcome.summary}
        </p>
      </DialogFrame>
    );
  }

  return (
    <DialogFrame
      className="bt-ink-in"
      data-outcome-scene={outcome.sceneId}
      data-outcome-stage={outcome.stage}
      data-outcome={outcome.outcome}
      data-outcome-reason={outcome.reason ?? undefined}
      data-outcome-closing={outcome.closingId ?? undefined}
      data-cue={outcome.cue ?? undefined}
      data-hold-ms={outcome.holdMs}
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
      </div>
      {outcome.caption ? (
        <p
          data-outcome-caption=""
          data-dialog-line=""
          style={{ fontSize: "1.5em", margin: "0.8em 0 0.2em" }}
        >
          {outcome.caption}
        </p>
      ) : null}
    </DialogFrame>
  );
}
