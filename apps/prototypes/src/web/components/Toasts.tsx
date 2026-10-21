"use client";
import { logger } from "../lib/logger.ts";
import { useLogState } from "../lib/useLogState.ts";
import { ToastList } from "./ToastList.tsx";

/** Shows every logged error as a toast. Repeats collapse into one toast with a count. */
export function Toasts() {
  const { toasts } = useLogState();
  return <ToastList toasts={toasts} onDismiss={(id) => logger.dismissToast(id)} />;
}
