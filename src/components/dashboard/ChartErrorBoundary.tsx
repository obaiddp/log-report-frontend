import { Component, type ErrorInfo, type ReactNode } from "react";

interface ChartErrorBoundaryProps {
  /** Short label used in the fallback box (e.g. "Status breakdown"). */
  title?: string;
  children: ReactNode;
}

interface ChartErrorBoundaryState {
  failed: boolean;
}

/**
 * Wraps exactly one chart. A crash inside a single chart (bad label, NaN,
 * a recharts edge case) must never blank the whole section — the boundary
 * swaps only that chart for a small fallback box and keeps the rest of the
 * dashboard working.
 */
export class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  state: ChartErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Intentionally silent: the fallback box communicates the failure in
    // the UI, and chart errors are not actionable for the user.
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div
          role="status"
          className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground"
        >
          <p className="font-medium text-foreground">
            {this.props.title ?? "Chart"} failed to render.
          </p>
          <p>The rest of the dashboard is unaffected.</p>
        </div>
      );
    }
    return this.props.children;
  }
}