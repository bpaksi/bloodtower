import type { CSSProperties, ReactNode } from "react";
import { TV_DESIGN_WIDTH } from "../lib/tv.ts";

/**
 * A 16:9 frame, the largest that fits the viewport, centred on black. Type scales with its width:
 * inside, write sizes with `tvPx(28)` (28 px at 1920 wide, 56 px at 3840 wide). Plain text inherits
 * a 20 design-px base size.
 */
export function TvFrame({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      data-tv-frame
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "#000",
      }}
    >
      <div
        style={{
          width: "min(100vw, calc(100vh * 16 / 9))",
          aspectRatio: "16 / 9",
          containerType: "inline-size",
        }}
      >
        <div
          style={
            {
              "--tv-px": `calc(100cqw / ${TV_DESIGN_WIDTH})`,
              width: "100%",
              height: "100%",
              overflow: "hidden",
              position: "relative",
              fontSize: "calc(20 * var(--tv-px))",
              background: "#101418",
              color: "#f2efe6",
              ...style,
            } as CSSProperties
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
