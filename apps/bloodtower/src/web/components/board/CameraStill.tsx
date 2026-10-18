"use client";

import { useEffect, useRef, useState } from "react";
import { cameraStillImageStyle } from "../../lib/cameraStillStyle.ts";
import type { CameraTrack } from "../../lib/cameraTrack.ts";
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
  spokenText: _spokenText,
}: {
  momentId: string;
  packId?: string;
  assetId: string;
  spokenText: string;
}) {
  const [track, setTrack] = useState<CameraTrack | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [reduced, setReduced] = useState(false);
  const mountAt = useRef(performance.now());

  const fallbackSrc = packStillImageUrl(assetId, packId);

  useEffect(() => {
    mountAt.current = performance.now();
    setSeconds(0);
    setTrack(null);
    let cancelled = false;
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

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const tick = (now: number) => {
      setSeconds((now - mountAt.current) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  const imageStyle = cameraStillImageStyle(track, seconds, reduced);

  const src = track ? packTrackStillUrl(track.still, packId) : fallbackSrc;

  return (
    <div className="bt-still" data-camera-still="">
      {/* biome-ignore lint/performance/noImgElement: stills are loaded from the session host URL, not static export. */}
      <img
        alt=""
        data-still={assetId}
        data-camera-track={track ? momentId : ""}
        data-camera-reduced={reduced ? "true" : "false"}
        src={src}
        style={imageStyle}
      />
    </div>
  );
}
