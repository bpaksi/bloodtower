import { portraitInitial } from "../lib/portrait";

/**
 * A framed hunter portrait. With no `src` it is the placeholder: the hunter's initial on the
 * frame. `label` is the visible text beside the frame and defaults to the name.
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
}) => (
  <span
    className={`flex items-center ${compact ? "gap-3" : "gap-4"} text-left`}
    data-portrait-card={name}
  >
    <span
      aria-hidden="true"
      className={`flex ${compact ? "h-16 w-14" : "h-28 w-24"} shrink-0 items-center justify-center overflow-hidden rounded-lg border-4 border-double border-[var(--bt-accent)] bg-[var(--bt-bg)]`}
      data-portrait-frame={src ? "image" : "placeholder"}
    >
      {src ? (
        // biome-ignore lint/performance/noImgElement: static export, no next/image loader
        <img src={src} alt="" className="h-full w-full object-cover" />
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
