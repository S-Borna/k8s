import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary fångade:", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen grid place-items-center px-6 py-20">
          <div className="glass max-w-md rounded-3xl p-8 text-center">
            <AlertTriangle className="mx-auto mb-3 text-amber" size={28} />
            <h1 className="font-display text-2xl text-text">Något gick fel</h1>
            <p className="mt-2 text-sm text-text-muted">
              {this.state.error.message || "Okänt fel — testa att ladda om sidan."}
            </p>
            <button
              onClick={() => {
                this.reset();
                window.location.reload();
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-amber/40 bg-amber/15 px-4 py-2 text-sm text-amber transition hover:bg-amber/25"
            >
              <RotateCw size={14} />
              Ladda om
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
