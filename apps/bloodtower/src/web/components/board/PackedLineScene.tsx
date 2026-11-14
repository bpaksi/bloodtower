"use client";

import { useEffect, useRef } from "react";
import { reportAudioStartRefused } from "../../lib/audio/audioError.ts";
import {
  afterVoiceMs,
  captionOnlyMs,
  type PackedLine,
  packedFileUrl,
} from "../../lib/audio/packedLine.ts";
import { reportPageLog } from "../../lib/pageLog.ts";
import { AssetIdLabel } from "./AssetIdLabel.tsx";

/** The voice could not be fetched or decoded. The caption stays; the error is logged and toasted. */
export const PACKED_LINE_AUDIO = "packed-line-audio";

/**
 * The demo's packed line on the Story board (A1-8b-2, D49): `painting.cover` with `glow.cover`
 * over it in the same box, the exact caption, and the voice from the Mac's speakers (DEC-201).
 * Every file comes from the host by asset id. No portrait and no mouth: the Loremaster is voice
 * and caption only (DEC-843). It plays once when mounted; the board mounts it only when it sees a
 * new play (`playOnView`), so a reload does not replay it. `onDone` runs a short hold after the
 * voice ends, but never before the caption has had its reading time; with no voice, after the
 * reading time.
 */
export function PackedLineScene({
  line,
  volume,
  origin,
  onDone,
}: {
  line: PackedLine;
  /** The board's voice level, 0 to 1. */
  volume: number;
  /** The session host. Omitted, the page's own host for pack files. */
  origin?: string;
  onDone: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const failed = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);

  const finishIn = (ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => done.current(), ms);
  };

  /** The voice could not play. Logged and toasted once; the caption stays for a reading time. */
  const voiceFailed = (message: string) => {
    if (failed.current) return;
    failed.current = true;
    void reportPageLog({ level: "error", code: PACKED_LINE_AUDIO, message, source: "board" });
    finishIn(captionOnlyMs(line.caption));
  };

  // Runs once per mount; a new play is a new mount (keyed by the play number).
  // biome-ignore lint/correctness/useExhaustiveDependencies: one play per mount.
  useEffect(() => {
    startedAt.current = Date.now();
    const audio = audioRef.current;
    if (!audio) {
      finishIn(captionOnlyMs(line.caption));
      return;
    }
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.play().catch((error: unknown) => {
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError") {
        // The browser refused to start the voice (no gesture on this page yet). Logged and
        // toasted; the caption stays for a reading time. Nothing retries it.
        reportAudioStartRefused(error);
        finishIn(captionOnlyMs(line.caption));
        return;
      }
      if (name === "AbortError") {
        // The scene went away (a replay or the end) before the voice started: expected.
        void reportPageLog({
          level: "debug",
          code: PACKED_LINE_AUDIO,
          message: `The voice ${line.audio} stopped before it started.`,
          source: "board",
        });
        return;
      }
      const detail = error instanceof Error ? error.message : String(error);
      voiceFailed(`The voice ${line.audio} could not start: ${detail || name || "unknown error"}.`);
    });
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const url = (id: string) => packedFileUrl(line.packId, id, origin);

  return (
    <section
      className="bt-packed-line"
      data-packed-line={line.lineId}
      data-play={line.play}
      aria-live="polite"
    >
      {line.painting ? (
        <div className="bt-packed-picture" data-packed-picture="">
          {/* biome-ignore lint/performance/noImgElement: a packed file on the session host. */}
          <img
            className="bt-packed-layer"
            data-packed-painting={line.painting}
            src={url(line.painting)}
            alt=""
          />
          {line.glow ? (
            // biome-ignore lint/performance/noImgElement: a packed file on the session host.
            <img
              className="bt-packed-layer bt-packed-glow"
              data-packed-glow={line.glow}
              src={url(line.glow)}
              alt=""
            />
          ) : null}
        </div>
      ) : null}
      <p className="bt-packed-caption" data-board-caption="" data-packed-caption="">
        {line.caption}
      </p>
      {line.audio ? (
        // biome-ignore lint/a11y/useMediaCaption: the caption is the paragraph above.
        <audio
          ref={audioRef}
          data-packed-audio={line.audio}
          preload="auto"
          src={url(line.audio)}
          onEnded={() => finishIn(afterVoiceMs(line.caption, Date.now() - startedAt.current))}
          onError={(event) => {
            const code = event.currentTarget.error?.code;
            voiceFailed(
              `The voice ${line.audio} could not be played${
                code ? ` (media error ${code})` : ""
              }. The caption stays.`,
            );
          }}
        />
      ) : null}
      <AssetIdLabel assetId={line.lineId} />
    </section>
  );
}
