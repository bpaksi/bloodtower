"use client";

import { type AvatarManifest, avatarManifestSchema } from "@talking-avatar/formats";
import { mouthFiles, TalkingAvatar } from "@talking-avatar/player";
import { useCallback, useEffect, useState } from "react";
import { KEEPER_BASE_URL, KEEPER_LINE_IDS, keeperCaption } from "./keeperLines.ts";

const preloadMouths = (manifest: AvatarManifest, baseUrl: string) => {
  if (typeof Image === "undefined") return;
  for (const file of mouthFiles(manifest.mouths)) {
    const image = new Image();
    image.src = `${baseUrl}${file}`;
  }
};

const Captions = () => (
  <div className="bt-keeper-captions" data-keeper-captions="">
    {KEEPER_LINE_IDS.map((id) => (
      <p key={id} className="bt-caption" data-keeper-line={id}>
        {keeperCaption(id)}
      </p>
    ))}
  </div>
);

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

  const lineId = KEEPER_LINE_IDS[keeperLine] ?? KEEPER_LINE_IDS[0];
  const fail = useCallback(() => setFailed(true), []);

  if (failed || !manifest || lineId === undefined) {
    return (
      <div className="bt-keeper">
        <Captions />
      </div>
    );
  }

  return (
    <div className="bt-keeper">
      <TalkingAvatar
        key={keeperLine}
        manifest={manifest}
        lineId={lineId}
        baseUrl={KEEPER_BASE_URL}
        onError={fail}
        onEnd={() => onLineEnded?.(keeperLine)}
      />
    </div>
  );
}
