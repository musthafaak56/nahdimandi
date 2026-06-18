import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Render error:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white p-6">
          <div className="max-w-md rounded-2xl border border-stone-900/10 bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-ink">Something went wrong.</h1>
            <p className="mt-2 text-sm text-ink/70">
              The page hit an unexpected error. Reload to try again.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-4 rounded-full border border-stone-900/10 bg-white px-4 py-2 text-sm font-semibold text-clove transition hover:border-ember/40 hover:text-ember"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
