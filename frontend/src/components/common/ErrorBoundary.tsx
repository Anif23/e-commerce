import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '../ui/Button';

interface State {
  error: Error | null;
}

/**
 * Last line of defence: a crash in one screen should never blank the whole app.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-ink-50 px-6">
        <div className="surface max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-ink-900">Something broke</h1>
          <p className="mt-2 text-sm text-ink-500">
            The page hit an unexpected error. Reloading usually clears it.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-ink-100 p-3 text-left text-xs text-ink-600">
            {error.message}
          </pre>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            Reload the app
          </Button>
        </div>
      </div>
    );
  }
}
