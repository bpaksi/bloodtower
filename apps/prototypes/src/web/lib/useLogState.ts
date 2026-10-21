"use client";
import { useSyncExternalStore } from "react";
import { type LogState, logger } from "./logger.ts";

export function useLogState(): LogState {
  return useSyncExternalStore(logger.subscribe, logger.getState, logger.getState);
}
