"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "../lib/logger.ts";

/** Catches an error thrown while a page renders, logs it (panel + toast) and shows it in place. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(
      error.message || error.name,
      `${error.stack ?? ""}\n${info.componentStack ?? ""}`,
      "RENDER_ERROR",
    );
  }

  override render() {
    if (this.state.error) {
      return <p role="alert">This page failed: {this.state.error.message}. See the log panel.</p>;
    }
    return this.props.children;
  }
}
