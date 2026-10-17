"use client";

import { useEffect, useState } from "react";
import { portraitInitial } from "../lib/portrait";

/**
 * A framed hunter portrait. With no `src`, or when the image fails to load, it is the
 * placeholder: the hunter's initial on the frame. The image's alt text is the hunter's name. `label` is the visible text beside the frame and defaults to the name.
 */
export const PortraitCard = ({
  name,
  label,
  src,
  compact,
}: {
  name: string;
  label?: string;
  src?: string;
  compact?: boolean;
}) => {
  const [failed, setFailed] = useState(false);
  // A new URL gets a fresh try.
  // biome-ignore lint/correctness/useExhaustiveDependencies: src is the reset trigger
  useEffect(() => setFailed(false), [src]);
  const showImage = Boolean(src) && !failed;
  return (
    <span
      className={`flex items-center ${compact ? "gap-3" : "gap-4"} text-left`}
      data-portrait-card={name}
    >
      <span
        aria-hidden="true"
        className={`flex ${compact ? "h-16 w-14" : "h-28 w-24"} shrink-0 items-center justify-center overflow-hidden rounded-lg border-4 border-double border-[var(--bt-accent)] bg-[var(--bt-bg)]`}
        data-portrait-frame={showImage ? "image" : "placeholder"}
      >
        {showImage ? (
          // biome-ignore lint/performance/noImgElement: static export, no next/image loader
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <span
            className={`${compact ? "text-3xl" : "text-5xl"} font-semibold text-[var(--bt-accent)]`}
          >
            {portraitInitial(name)}
          </span>
        )}
      </span>
      <span className={compact ? "text-lg" : "text-xl"}>{label ?? name}</span>
    </span>
  );
};
