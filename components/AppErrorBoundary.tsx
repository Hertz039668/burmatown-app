import React from 'react';

type State = { hasError: boolean; message?: string };

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(err: any): State { return { hasError: true, message: err?.message || 'Unexpected error' }; }
  componentDidCatch(error: any, info: any) { console.error('App error boundary caught', error, info); }
  render() {
    if(this.state.hasError) {
      return <div className="p-6 text-sm text-red-700">Something went wrong: {this.state.message} <button className="underline" onClick={()=>location.reload()}>Reload</button></div>;
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
