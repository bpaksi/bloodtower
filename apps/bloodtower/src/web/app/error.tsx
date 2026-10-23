"use client";

import { useEffect, useRef } from "react";
import { MistCard } from "../components/errors/MistCard.tsx";
import { captureRenderError, noteBoundaryCatch } from "../lib/pageCapture.ts";
import { reportPageLog } from "../lib/pageLog.ts";

/** Next.js page boundary. One mist card. `reset` is not called: nothing retries on its own. */
export default function PageError({
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
  return <MistCard code={captured.code} />;
}
