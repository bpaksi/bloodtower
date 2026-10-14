"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { loadVerifyMode, setVerifyMode, useVerifyMode } from "@/lib/verifyMode";

/** Turns Verify mode on or off on this device. It shows a page's Verify checklist. */
export function VerifyToggle() {
  const on = useVerifyMode((mode) => mode.on);
  useEffect(loadVerifyMode, []);
  return (
    <Button
      type="button"
      variant={on ? "default" : "outline"}
      className="h-11 px-4"
      aria-pressed={on}
      onClick={() => setVerifyMode(!on)}
    >
      Verify mode
    </Button>
  );
}
