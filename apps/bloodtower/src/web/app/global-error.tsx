"use client";

import { useEffect, useRef } from "react";
import { MistCard } from "../components/errors/MistCard.tsx";
import { captureRenderError, noteBoundaryCatch } from "../lib/pageCapture.ts";
import { reportPageLog } from "../lib/pageLog.ts";
import "./globals.css";

/** Root boundary, used when the layout itself fails. Same card, still one Reload. */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const captured = captureRenderError(error);
  noteBoundaryCatch(captured.message);
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void reportPageLog({ level: "error", code: captured.code, message: captured.message });
  }, [captured.code, captured.message]);
  return (
    <html lang="en">
      <body>
        <MistCard code={captured.code} />
      </body>
    </html>
  );
}
