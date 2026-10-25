"use client";

import { OPENING_PLACEHOLDER } from "bloodtower-protocols";
import { useEffect, useRef, useState } from "react";
import { cameraStillImageStyle } from "../../lib/cameraStillStyle.ts";
import type { CameraTrack } from "../../lib/cameraTrack.ts";
import { STILL_ASPECT_DEFAULT } from "../../lib/cameraTrack.ts";
import { fetchCameraTrack, packTrackStillUrl } from "../../lib/packCamera.ts";
import { pageServerOrigin } from "../../lib/serverOrigin.ts";
import { KeeperScene } from "./KeeperScene.tsx";

const PACK_ID = "test";

/**
 * grey-stair.04 painting and glow. Served only once those pack files are declared.
 * Not the landing window mask.
 */
const MOTION_PAINTING = "/packs/test/assets/grey-stair-04.png";
const MOTION_MASK = "/packs/test/assets/grey-stair-04-glow.png";

const fileUrl = (path: string) => `${pageServerOrigin()}${path}`;

const imageLoads = (src: string): Promise<boolean> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0);
    image.onerror = () => resolve(false);
    image.src = src;
  });

const headOk = async (src: string): Promise<boolean> => {
  try {
    const response = await fetch(src, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
};

function UnavailableStill() {
  return (
    <div data-still-state="unavailable">
      <p className="bt-caption" data-board-caption="">
        {OPENING_PLACEHOLDER}
      </p>
    </div>
  );
}

function PanningStill({ momentId }: { momentId: string }) {
  const [track, setTrack] = useState<CameraTrack | null>(null);
  const [missing, setMissing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [containerAspect, setContainerAspect] = useState(STILL_ASPECT_DEFAULT);
  const [stillAspect, setStillAspect] = useState(STILL_ASPECT_DEFAULT);
  const mountAt = useRef(performance.now());
  const well = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchCameraTrack(momentId, PACK_ID).then(async (next) => {
      if (cancelled) return;
      if (!next) {
        setMissing(true);
        return;
      }
      const src = packTrackStillUrl(next.still, PACK_ID);
      const ok = await imageLoads(src);
      if (cancelled) return;
      if (!ok) {
        setMissing(true);
        return;
      }
      setTrack(next);
    });
    return () => {
      cancelled = true;
    };
  }, [momentId]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const element = well.current;
    if (!element || typeof ResizeObserver !== "function") return;
    const sync = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setContainerAspect(width / height);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !track) return;
    let frame = 0;
    const tick = (now: number) => {
      setSeconds((now - mountAt.current) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, track]);

  if (missing || !track) {
    return missing ? <UnavailableStill /> : null;
  }

  const src = packTrackStillUrl(track.still, PACK_ID);
  const imageStyle = cameraStillImageStyle(track, seconds, reduced, containerAspect, stillAspect);

  return (
    <div className="bt-still" data-camera-still="" ref={well}>
      {/* biome-ignore lint/performance/noImgElement: the still is a pack file on the session host. */}
      <img
        alt=""
        data-camera-track={momentId}
        data-camera-reduced={reduced ? "true" : "false"}
        src={src}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) setStillAspect(naturalWidth / naturalHeight);
        }}
        style={imageStyle}
      />
    </div>
  );
}

function MotionStill() {
  const [ready, setReady] = useState<"pending" | "ready" | "missing">("pending");
  const painting = fileUrl(MOTION_PAINTING);
  const mask = fileUrl(MOTION_MASK);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([headOk(painting), imageLoads(painting), headOk(mask), imageLoads(mask)]).then(
      ([paintingHead, paintingImage, maskHead, maskImage]) => {
        if (cancelled) return;
        setReady(paintingHead && paintingImage && maskHead && maskImage ? "ready" : "missing");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [painting, mask]);

  if (ready !== "ready") {
    return ready === "missing" ? <UnavailableStill /> : null;
  }

  return (
    <div className="bt-motion-still" data-motion-still="">
      {/* biome-ignore lint/performance/noImgElement: the painting is a pack file on the session host. */}
      <img alt="" src={painting} />
      <div
        className="bt-motion-glow"
        data-motion-glow=""
        style={{ backgroundImage: `url("${mask}")` }}
      />
    </div>
  );
}

/** Story-board opening moment. Missing stills stay unavailable. No stand-in art. */
export function OpeningMoment({ momentId }: { momentId: string }) {
  if (momentId === "grey-stair.03") return <KeeperScene keeperLine={0} />;
  if (momentId === "grey-stair.04") return <MotionStill />;
  return <PanningStill momentId={momentId} />;
}
