"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type CameraTrack,
  estimateSpeechDurationSeconds,
  frameAtClock,
  frameAtTime,
  frameToTransform,
  prefersReducedMotion,
} from "../../lib/cameraTrack.ts";
import { packStillImageUrl } from "../../lib/packAsset.ts";
import { fetchCameraTrack, packTrackStillUrl, preloadStill } from "../../lib/packCamera.ts";

/**
 * Story-board still with an optional camera track (pan/zoom). Falls back to a static image
 * when no track is present or while the track loads.
 */
export function CameraStill({
  momentId,
  packId,
  assetId,
  spokenText,
}: {
  momentId: string;
  packId?: string;
  assetId: string;
  spokenText: string;
}) {
  const [track, setTrack] = useState<CameraTrack | null>(null);
  const [seconds, setSeconds] = useState(0);
  const reduced = prefersReducedMotion();

  const fallbackSrc = packStillImageUrl(assetId, packId);

  useEffect(() => {
    let cancelled = false;
    setTrack(null);
    setSeconds(0);
    void fetchCameraTrack(momentId, packId).then((next) => {
      if (cancelled) return;
      setTrack(next);
      if (next) {
        preloadStill(packTrackStillUrl(next.still, packId));
      } else {
        preloadStill(fallbackSrc);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [momentId, packId, fallbackSrc]);

  const src = track ? packTrackStillUrl(track.still, packId) : fallbackSrc;

  const speechDuration = useMemo(() => estimateSpeechDurationSeconds(spokenText), [spokenText]);

  useEffect(() => {
    if (!track || reduced) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      setSeconds((now - start) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [track, reduced]);

  const frame = track
    ? reduced
      ? frameAtTime(track, Number.POSITIVE_INFINITY)
      : frameAtClock(track, seconds, speechDuration)
    : null;

  const transform = frame ? frameToTransform(frame) : undefined;

  return (
    <div className="bt-still" data-camera-still="">
      {/* biome-ignore lint/performance/noImgElement: stills are loaded from the session host URL, not static export. */}
      <img
        alt=""
        data-still={assetId}
        data-camera-track={track ? momentId : ""}
        src={src}
        style={
          transform
            ? {
                transform,
                transition: reduced ? undefined : "transform 0.05s linear",
              }
            : undefined
        }
      />
    </div>
  );
}
