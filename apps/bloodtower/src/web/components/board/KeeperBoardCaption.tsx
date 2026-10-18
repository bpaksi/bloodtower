"use client";

import { type RefObject, useEffect, useState } from "react";
import {
  type BoardCaptionCue,
  captionAtTime,
  formatBoardCaption,
  loadVttCues,
} from "../../lib/boardCaptions.ts";

/**
 * Script captions for the Keeper plate. Sits outside TalkingAvatar so flex overflow
 * on the player cannot clip the line. Times cues from a sibling `.vtt` when present.
 */
export function KeeperBoardCaption({
  speakerName,
  lineId,
  scriptText,
  audioPath,
  baseUrl,
  enabled,
  plateRef,
}: {
  speakerName: string;
  lineId: string;
  scriptText: string;
  audioPath?: string;
  baseUrl: string;
  enabled: boolean;
  plateRef: RefObject<HTMLDivElement | null>;
}) {
  const [cues, setCues] = useState<BoardCaptionCue[]>([]);
  const [timedText, setTimedText] = useState<string | null>(null);
  const fullCaption = formatBoardCaption(speakerName, scriptText);

  useEffect(() => {
    if (!audioPath) {
      setCues([]);
      return;
    }
    let cancelled = false;
    void loadVttCues(baseUrl, audioPath).then((loaded) => {
      if (!cancelled) setCues(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [audioPath, baseUrl]);

  useEffect(() => {
    setTimedText(null);
    const audio = plateRef.current?.querySelector("audio");
    if (audio === null || audio === undefined) return;

    const sync = () => {
      if (cues.length > 0) {
        const active = captionAtTime(cues, audio.currentTime);
        setTimedText(active ? formatBoardCaption(speakerName, active.text) : null);
        return;
      }
      setTimedText(fullCaption);
    };

    audio.addEventListener("timeupdate", sync);
    audio.addEventListener("seeked", sync);
    audio.addEventListener("play", sync);
    audio.addEventListener("loadedmetadata", sync);
    audio.addEventListener("ended", sync);
    sync();
    return () => {
      audio.removeEventListener("timeupdate", sync);
      audio.removeEventListener("seeked", sync);
      audio.removeEventListener("play", sync);
      audio.removeEventListener("loadedmetadata", sync);
      audio.removeEventListener("ended", sync);
    };
  }, [cues, fullCaption, plateRef, speakerName]);

  if (!enabled) return null;

  const visible = cues.length > 0 ? timedText : fullCaption;

  return (
    <p className="bt-caption" data-board-caption="" data-keeper-line={lineId} aria-live="polite">
      {visible ?? ""}
    </p>
  );
}
