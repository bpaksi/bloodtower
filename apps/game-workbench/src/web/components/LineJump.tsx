"use client";

import { useEffect } from "react";

/**
 * Card sources point at doc lines (#L131). Headings are the only anchors in a rendered doc, so
 * jump to the innermost section that holds the line and flash it.
 */
export function LineJump({
  sections,
}: {
  sections: { anchor: string; start: number; end: number }[];
}) {
  useEffect(() => {
    const jump = () => {
      const m = /^#L(\d+)$/.exec(window.location.hash);
      if (!m) return;
      const line = Number(m[1]);
      const hit = sections.filter((s) => s.start <= line && line <= s.end).at(-1);
      const el = hit && document.getElementById(hit.anchor);
      if (!el) return;
      el.scrollIntoView({ block: "start" });
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 1600);
    };
    jump();
    window.addEventListener("hashchange", jump);
    return () => window.removeEventListener("hashchange", jump);
  }, [sections]);
  return null;
}
