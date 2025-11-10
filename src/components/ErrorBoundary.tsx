import { Component, type ErrorInfo, type ReactNode } from 'react';

import { logger } from '../lib/logger';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Galxi ErrorBoundary captured an exception', error, { info: errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="app-error">
          <div className="app-error-card">
            <h1>Galxi hit a snag</h1>
            <p>{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <p className="app-error-meta">Try reloading to continue.</p>
            <div className="app-error-actions">
              <button type="button" className="btn btn-accent" onClick={() => window.location.reload()}>
                Reload Galxi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
