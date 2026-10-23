"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  type CapturedPageError,
  captureRenderError,
  noteBoundaryCatch,
} from "../../lib/pageCapture.ts";
import { MistCard } from "./MistCard.tsx";

interface BoundaryState {
  captured: CapturedPageError | null;
}

/**
 * Catches a render error, logs it through `onError`, and shows the mist card.
 * Event handlers and rejected promises are caught by `installPageCapture` instead.
 */
export class PageErrorBoundary extends Component<
  { children: ReactNode; onError: (captured: CapturedPageError) => void },
  BoundaryState
> {
  override state: BoundaryState = { captured: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { captured: captureRenderError(error) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    const captured = captureRenderError(error, info.componentStack ?? undefined);
    noteBoundaryCatch(captured.message);
    this.props.onError(captured);
  }

  override render() {
    if (this.state.captured) return <MistCard code={this.state.captured.code} />;
    return this.props.children;
  }
}
