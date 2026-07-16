import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { logError } from "@/lib/errors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(error, { errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-flora-bgFrom to-flora-bgTo px-4">
          <div className="w-full max-w-md rounded-4xl bg-white/70 p-8 text-center shadow-card backdrop-blur-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-flora-chip">
              <AlertTriangle className="h-8 w-8 text-flora-muted" aria-hidden="true" />
            </div>
            <h1 className="mb-2 text-xl font-semibold text-flora-ink">
              Something went wrong
            </h1>
            <p className="mb-6 text-sm text-flora-muted">
              We hit an unexpected error. Try again, or refresh the page if
              it keeps happening.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 rounded-2xl bg-flora-chip p-3 text-left text-xs text-flora-ink">
                <summary className="cursor-pointer font-medium">
                  Error Details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-flora-muted">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-full bg-flora-ink px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-110">
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full border border-flora-ink/15 px-6 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip">
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
