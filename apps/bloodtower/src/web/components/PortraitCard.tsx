"use client";

import { useState } from "react";
import { portraitInitial } from "../lib/portrait";

/**
 * A framed hunter portrait. With no `src`, or when the image fails to load, it is the
 * placeholder: the hunter's initial on the frame. `label` is the visible text beside the frame
 * and defaults to the name.
 */
export const PortraitCard = ({
  name,
  label,
  src,
  compact,
  frameOnly,
  accessibleLabel,
}: {
  name: string;
  label?: string;
  src?: string;
  compact?: boolean;
  /** Portrait frame only; pair with board cartouche copy beside the frame. */
  frameOnly?: boolean;
  /** Spoken label when `frameOnly` (defaults to `label` or `name`). */
  accessibleLabel?: string;
}) => {
  // The failure belongs to the URL that failed, so a new URL gets a fresh try with no reset step.
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const showImage = Boolean(src) && failedSrc !== src;
  const spoken = accessibleLabel ?? label ?? name;
  const frame = (
    <span
      aria-hidden="true"
      className={`flex ${compact ? "h-16 w-14" : "h-28 w-24"} shrink-0 items-center justify-center overflow-hidden rounded-lg border-4 border-double border-[var(--bt-accent)] bg-[var(--bt-bg)]`}
      data-portrait-frame={showImage ? "image" : "placeholder"}
    >
      {showImage ? (
        // biome-ignore lint/performance/noImgElement: static export, no next/image loader
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span
          className={`${compact ? "text-3xl" : "text-5xl"} font-semibold text-[var(--bt-accent)]`}
        >
          {portraitInitial(name)}
        </span>
      )}
    </span>
  );
  if (frameOnly) {
    return (
      <span className="bt-cart-portrait-frame" data-portrait-card={name}>
        <span className="sr-only">{spoken}</span>
        {frame}
      </span>
    );
  }
  return (
    <span
      className={`flex items-center ${compact ? "gap-3" : "gap-4"} text-left`}
      data-portrait-card={name}
    >
      {frame}
      <span className={compact ? "text-lg" : "text-xl"}>{label ?? name}</span>
    </span>
  );
};
