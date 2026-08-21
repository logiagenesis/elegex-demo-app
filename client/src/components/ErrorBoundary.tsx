import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorId: null };
  }

  componentDidCatch(error: Error) {
    const errorId = `ELX-${Date.now().toString(36).toUpperCase()}`;
    const recoveryEvent = { errorId, message: error.message, path: window.location.pathname, capturedAt: new Date().toISOString() };
    console.error("[Elegex] Application recovery boundary", recoveryEvent);
    try { window.sessionStorage.setItem("elegex:last-client-recovery", JSON.stringify(recoveryEvent)); } catch { /* Storage can be unavailable in hardened browsing modes. */ }
    this.setState({ errorId });
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-[#F5F7FB] p-6 text-[#14213D]">
          <section className="w-full max-w-xl rounded-[1.75rem] border border-[#E4EAF4] bg-white p-8 text-center shadow-[0_20px_60px_rgba(24,54,108,0.10)] sm:p-10">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FFF0F2] text-[#C63550]"><AlertTriangle className="h-7 w-7" /></span>
            <p className="mt-6 text-xs font-bold tracking-[0.16em] text-[#195FE6]">ELEGEX RECOVERY</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">This workspace view could not load.</h1>
            <p className="mt-3 text-sm leading-6 text-[#667085]">Your data has not been changed. Retry the view first; if the issue persists, reload the application and quote the recovery identifier to the workspace administrator.</p>
            <p className="mt-4 font-mono text-xs font-semibold text-[#50617F]">{this.state.errorId || "ELX-RECOVERING"}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button onClick={this.reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D6E2F6] bg-white px-4 py-2.5 text-sm font-semibold text-[#195FE6] transition hover:bg-[#F5F8FF]"><RotateCcw className="h-4 w-4" />Retry view</button>
              <button onClick={() => window.location.assign("/")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#195FE6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#124FC3]"><Home className="h-4 w-4" />Return to workspace</button>
            </div>
            <button onClick={() => window.location.reload()} className="mt-5 text-sm font-semibold text-[#667085] underline-offset-4 hover:text-[#195FE6] hover:underline">Reload application</button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
