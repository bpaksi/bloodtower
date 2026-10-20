import type { HTMLAttributes, ReactNode } from "react";

export type DialogFrameSize = "default" | "compact";

/**
 * The Story board's only modal chrome: the Illusionist `dialog-frame` asset
 * (public/board/dialog-frame/README.md), a 9-slice SVG ink border over the parchment tile.
 * Start-up dialogs (visuals step 3), the Sound dialog (step 1) and the in-game waiting dialog
 * (step 9) all draw their frame here; no other component or rule draws dialog chrome.
 *
 * Props:
 * - `size`: "default" (40px frame, fills the width its parent gives it; start-up dialogs) or
 *   "compact" (32px frame, as wide as its content up to 34rem; small dialogs such as Sound or
 *   waiting).
 * - `className`: extra classes on the frame, such as `bt-ink-in` for the opening motion.
 * - Any other div attribute (`role`, `aria-*`, `data-*`) goes to the frame element.
 */
export function DialogFrame({
  size = "default",
  className,
  children,
  ...rest
}: {
  size?: DialogFrameSize;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div
      {...rest}
      className={className ? `bt-dialog-frame ${className}` : "bt-dialog-frame"}
      data-illusionist-asset="dialog-frame"
      data-dialog-size={size}
    >
      {children}
    </div>
  );
}
