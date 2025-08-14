import React from 'react';

/**
 * Generic error boundary to prevent the entire app from crashing on render errors.
 * Wrap high‑risk or large composite trees (e.g. main app shell) with this component.
 */
interface ErrorBoundaryProps { fallback?: React.ReactNode; children?: React.ReactNode }
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean; err?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, err };
  }
  componentDidCatch(error: any, info: any) {
    // Optionally send to analytics / logging service later
    console.error('[ErrorBoundary]', error, info);
  }
  reset = () => this.setState({ hasError: false, err: undefined });
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 text-sm max-w-md mx-auto">
          <h2 className="font-semibold mb-2">Something went wrong.</h2>
          <p className="opacity-70 mb-4">An unexpected error occurred while rendering this section.</p>
          <button onClick={this.reset} className="px-3 py-1.5 rounded bg-black text-white text-xs">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
