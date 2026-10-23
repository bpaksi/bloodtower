"use client";

import { type ReactNode, useEffect, useState } from "react";
import { type CapturedPageError, installPageCapture } from "../../lib/pageCapture.ts";
import { reportPageLog } from "../../lib/pageLog.ts";
import { MistCard } from "./MistCard.tsx";
import { PageErrorBoundary } from "./PageErrorBoundary.tsx";

/**
 * On every page: a React error boundary, `window.onerror` and `unhandledrejection`.
 * An error the page cannot recover from shows the mist card. The line is shipped either way.
 */
export function PageCapture({ children }: { children: ReactNode }) {
  const [mist, setMist] = useState<CapturedPageError | null>(null);

  useEffect(() => {
    return installPageCapture(window, (captured) => {
      void reportPageLog({ level: "error", code: captured.code, message: captured.message });
      setMist(captured);
    });
  }, []);

  return (
    <PageErrorBoundary
      onError={(captured) => {
        void reportPageLog({ level: "error", code: captured.code, message: captured.message });
      }}
    >
      {mist ? <MistCard code={mist.code} /> : children}
    </PageErrorBoundary>
  );
}
