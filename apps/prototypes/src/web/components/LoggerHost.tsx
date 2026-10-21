"use client";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { logger } from "../lib/logger.ts";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { LogPanel } from "./LogPanel.tsx";
import { Toasts } from "./Toasts.tsx";

/** Mounted once in the root layout: global error handlers, the log panel, the toasts and a boundary. */
export function LoggerHost({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => logger.installGlobalHandlers(window), []);
  return (
    <>
      <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
      <Toasts />
      <LogPanel />
    </>
  );
}
