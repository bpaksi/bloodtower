"use client";

import { type RefObject, useEffect, useState } from "react";
import {
  type BoardCaptionCue,
  captionDisplayAtTime,
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
  const [visible, setVisible] = useState<string>("");
  const fullCaption = formatBoardCaption(speakerName, scriptText);

  useEffect(() => {
    setCues([]);
    setVisible(fullCaption);
    if (!audioPath) return;
    let cancelled = false;
    void loadVttCues(baseUrl, audioPath).then((loaded) => {
      if (!cancelled) setCues(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [audioPath, baseUrl, fullCaption]);

  useEffect(() => {
    setVisible(fullCaption);
    const audio = plateRef.current?.querySelector("audio");
    if (audio === null || audio === undefined) return;

    const sync = () => {
      setVisible(captionDisplayAtTime(cues, audio.currentTime, speakerName, fullCaption));
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

  return (
    <p className="bt-caption" data-board-caption="" data-keeper-line={lineId} aria-live="polite">
      {visible}
    </p>
  );
}
