import React, { Component } from "react"
import { AlertTriangle, RotateCcw, Home, RefreshCw, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react"

/**
 * AeroNexus Mission Planning Error Boundary
 * Prevents uncaught React render exceptions from turning the entire screen blank.
 * Provides diagnostics, Retry action, Reset to Step 1, and Navigation recovery.
 */
export class MissionErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("[AeroNexus MissionErrorBoundary caught an error]:", error, errorInfo)
    this.setState({ errorInfo })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (typeof this.props.onRetry === "function") {
      this.props.onRetry()
    }
  }

  handleResetToStep1 = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (typeof this.props.onResetStep === "function") {
      this.props.onResetStep(1)
    } else {
      window.location.href = "/mission-planning?step=1"
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoDashboard = () => {
    window.location.href = "/dashboard"
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "An unexpected runtime error occurred while planning the mission."
      const stackTrace = this.state.error?.stack || this.state.errorInfo?.componentStack || ""

      return (
        <div className="w-full h-full min-h-[480px] flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 select-none">
          <div className="max-w-2xl w-full bg-white rounded-2xl border border-[#CBD5E1] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header Strip */}
            <div className="bg-[#0B192C] px-6 py-4 flex items-center justify-between border-b border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Mission Planning Recovery System
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    AeroNexus Ground Control Station · Safe Mode Active
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Non-Fatal Intercept
              </span>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F284E]">
                    Workspace Render Interrupted
                  </h4>
                  <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                    The Mission Planning interface prevented an uncaught exception from terminating your session.
                    Your flight project and waypoints remain securely stored in your local mission database.
                  </p>
                </div>
              </div>

              {/* Error Summary Box */}
              <div className="bg-[#04070B] rounded-xl p-3.5 border border-slate-800 text-left font-mono">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-1">
                  Exception Diagnostics:
                </div>
                <div className="text-xs text-red-400 font-semibold break-words">
                  {errorMessage}
                </div>

                {stackTrace && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                      className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-sans font-semibold cursor-pointer"
                    >
                      <span>{this.state.showDetails ? "Hide Stack Trace" : "View Stack Trace"}</span>
                      {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {this.state.showDetails && (
                      <pre className="mt-2 text-[10px] text-slate-400 overflow-x-auto max-h-40 p-2 bg-black/60 rounded border border-slate-800/80 leading-normal whitespace-pre-wrap">
                        {stackTrace}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="h-10 px-5 rounded-xl bg-[#1B68D2] hover:bg-[#124E9D] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Mission Planning</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleResetToStep1}
                  className="h-10 px-4 rounded-xl border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#1E293B] text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Reset to Step 1 (Area & Flight)</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleReload}
                  className="h-10 px-4 rounded-xl border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#1E293B] text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Reload Page</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleGoDashboard}
                  className="h-10 px-4 rounded-xl border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F284E] text-xs font-bold transition flex items-center gap-2 cursor-pointer ml-auto"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
              </div>
            </div>

            {/* Footer Trust Strip */}
            <div className="bg-[#F8FAFC] px-6 py-2.5 border-t border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center justify-between">
              <span>AeroNexus High-Reliability Mission System</span>
              <span className="font-mono">Fail-Safe Active · Zero Data Loss</span>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default MissionErrorBoundary
