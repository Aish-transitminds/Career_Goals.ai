/**
 * AbroadPath AI - Global & Chunk-Loading Error Boundary
 * File: src/components/common/ErrorBoundary.tsx
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('ChunkLoadError');

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-8 text-center space-y-6">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                {isChunkError ? 'Application Update Available' : 'Something unexpected happened'}
              </h2>
              <p className="text-sm text-slate-600">
                {isChunkError
                  ? 'A newer version or route module could not be loaded into the current session. Reloading will fetch the latest verified assets.'
                  : 'An error occurred while loading this view. You can reload the page or return to the home screen.'}
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left bg-slate-100 p-3 rounded-lg text-xs text-rose-700 overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center font-poppins">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-[6px] text-sm font-semibold text-[#0B1026] bg-[#FF5E00] hover:bg-[#E65400] shadow-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2 text-[#0B1026]" />
                Reload Application
              </button>
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-[6px] text-sm font-semibold text-white bg-[#0B1026] hover:bg-[#151B3A] transition-colors"
              >
                <Home className="w-4 h-4 mr-2 text-[#FF5E00]" />
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
