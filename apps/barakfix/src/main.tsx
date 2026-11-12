import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow p-6 max-w-md">
            <h1 className="text-xl font-bold text-red-700 mb-2">Une erreur est survenue</h1>
            <p className="text-sm text-slate-700 mb-1">{this.state.error.message}</p>
            <button
              onClick={() => location.reload()}
              className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
