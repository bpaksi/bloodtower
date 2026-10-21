import type { CSSProperties } from "react";

/** A grey box labelled with the asset it stands for. */
export function Placeholder({
  label,
  width,
  height,
  style,
}: {
  /** The asset it stands for, e.g. "ART hero portrait: Paladin". */
  label: string;
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
}) {
  return (
    <div
      role="img"
      aria-label={`Placeholder: ${label}`}
      data-placeholder={label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        width,
        height,
        minHeight: "2em",
        background: "#8a8a8a",
        color: "#1a1a1a",
        border: "2px dashed #5a5a5a",
        padding: "0.25em 0.5em",
        textAlign: "center",
        overflow: "hidden",
        ...style,
      }}
    >
      {label}
    </div>
  );
}
