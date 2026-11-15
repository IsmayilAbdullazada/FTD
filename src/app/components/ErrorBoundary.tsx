import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '@/shared/lib/logger';
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    reportError('Application render failed', error);
  }
  render() {
    if (this.state.failed)
      return (
        <main role="alert" className="p-8 text-center">
          <h1>Something went wrong</h1>
          <p>Please reload the page to try again.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </main>
      );
    return this.props.children;
  }
}
