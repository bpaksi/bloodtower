"use client";

import { useEffect, useState } from "react";
import { copyText } from "../clipboard.ts";

/**
 * Any element with data-id copies its ID on click or Enter, so Bob can paste an exact ID into chat.
 * One delegated listener covers chips in server-rendered markdown too.
 */
export function ChipCopy() {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const copy = (event: Event) => {
      const chip = (event.target as Element | null)?.closest?.("[data-id]");
      if (!chip) return;
      if (event instanceof KeyboardEvent && event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      const id = chip.getAttribute("data-id") ?? "";
      void copyText(id).then((ok) => setCopied(ok ? id : null));
      clearTimeout(timer);
      timer = setTimeout(() => setCopied(null), 1600);
    };
    document.addEventListener("click", copy, true);
    document.addEventListener("keydown", copy, true);
    return () => {
      document.removeEventListener("click", copy, true);
      document.removeEventListener("keydown", copy, true);
      clearTimeout(timer);
    };
  }, []);

  return (
    <output className={`toast${copied ? " toast-on" : ""}`} aria-live="polite">
      {copied ? `Copied ${copied}` : ""}
    </output>
  );
}
