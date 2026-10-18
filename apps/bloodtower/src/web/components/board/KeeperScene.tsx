"use client";

import { type AvatarManifest, avatarManifestSchema } from "@talking-avatar/formats";
import { mouthFiles, TalkingAvatar } from "@talking-avatar/player";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  readBoardCaptionsEnabled,
  shouldToggleBoardCaptionsFromKeyboard,
  writeBoardCaptionsEnabled,
} from "../../lib/boardCaptions.ts";
import { KeeperBoardCaption } from "./KeeperBoardCaption.tsx";
import {
  KEEPER_BASE_URL,
  KEEPER_LINE_IDS,
  KEEPER_LINE_TEXT,
  type KeeperLineId,
  keeperCaption,
} from "./keeperLines.ts";

const KEEPER_SPEAKER = "The Keeper";

const preloadMouths = (manifest: AvatarManifest, baseUrl: string) => {
  if (typeof Image === "undefined") return;
  for (const file of mouthFiles(manifest.mouths)) {
    const image = new Image();
    image.src = `${baseUrl}${file}`;
  }
};

const FallbackCaption = ({ lineId, enabled }: { lineId: KeeperLineId; enabled: boolean }) => {
  if (!enabled) return null;
  return (
    <p className="bt-caption" data-board-caption="" data-keeper-line={lineId} aria-live="polite">
      {`${KEEPER_SPEAKER}: ${keeperCaption(lineId)}`}
    </p>
  );
};

/**
 * Story-board Keeper at grey-stair.03. It plays the line the server holds (`keeperLine`).
 * A changed line is a new player, so the old audio stops. When a line ends, the board tells
 * the server (D7 exception); the server acts only if that line is still the current one.
 */
export function KeeperScene({
  keeperLine,
  onLineEnded,
}: {
  keeperLine: number;
  onLineEnded?: (line: number) => void;
}) {
  const [manifest, setManifest] = useState<AvatarManifest | null>(null);
  const [failed, setFailed] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(() => readBoardCaptionsEnabled());
  const plateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${KEEPER_BASE_URL}manifest.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((json: unknown) => {
        const parsed = avatarManifestSchema.parse(json);
        if (cancelled) return;
        preloadMouths(parsed, KEEPER_BASE_URL);
        setManifest(parsed);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCaptions = useCallback(() => {
    setCaptionsEnabled((previous) => {
      const next = !previous;
      writeBoardCaptionsEnabled(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldToggleBoardCaptionsFromKeyboard(event)) return;
      event.preventDefault();
      toggleCaptions();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCaptions]);

  const lineId = KEEPER_LINE_IDS[keeperLine] ?? KEEPER_LINE_IDS[0];
  const fail = useCallback(() => setFailed(true), []);
  const manifestLine = manifest?.lines.find((entry) => entry.line_id === lineId) ?? undefined;
  const scriptText = manifestLine?.text ?? (lineId ? KEEPER_LINE_TEXT[lineId as KeeperLineId] : "");

  if (lineId === undefined) {
    return (
      <div className="bt-keeper" data-keeper-plate="" ref={plateRef}>
        <p className="bt-caption" data-board-caption="">
          Caption unavailable.
        </p>
      </div>
    );
  }

  const captionSlot = (
    <div className="bt-keeper-captions" data-keeper-captions="">
      {failed || !manifest ? (
        <FallbackCaption lineId={lineId} enabled={captionsEnabled} />
      ) : (
        <KeeperBoardCaption
          key={lineId}
          speakerName={manifest.name}
          lineId={lineId}
          scriptText={scriptText}
          audioPath={manifestLine?.audio}
          baseUrl={KEEPER_BASE_URL}
          enabled={captionsEnabled}
          plateRef={plateRef}
        />
      )}
    </div>
  );

  if (failed || !manifest) {
    return (
      <div className="bt-keeper" data-keeper-plate="" ref={plateRef}>
        {captionSlot}
        <button
          type="button"
          className="bt-caption-toggle"
          data-caption-toggle=""
          aria-pressed={captionsEnabled}
          onClick={toggleCaptions}
        >
          {captionsEnabled ? "Captions on" : "Captions off"}
        </button>
      </div>
    );
  }

  return (
    <div className="bt-keeper" data-keeper-plate="" ref={plateRef}>
      <TalkingAvatar
        key={keeperLine}
        className="bt-keeper-avatar"
        manifest={manifest}
        lineId={lineId}
        baseUrl={KEEPER_BASE_URL}
        onError={fail}
        onEnd={() => onLineEnded?.(keeperLine)}
      />
      {captionSlot}
      <button
        type="button"
        className="bt-caption-toggle"
        data-caption-toggle=""
        aria-pressed={captionsEnabled}
        onClick={toggleCaptions}
      >
        {captionsEnabled ? "Captions on" : "Captions off"}
      </button>
    </div>
  );
}
