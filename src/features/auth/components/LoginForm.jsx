import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Check, AlertCircle, Loader2 } from "lucide-react"
import AeroLogo from "./AeroLogo.jsx"
import GcsCornerBrackets from "./GcsCornerBrackets.jsx"
import GcsInput from "./GcsInput.jsx"
import { useAuth } from "@/hooks/useAuth.js"
import { showAlert, AlertTypes, AlertCategories } from "@/services/notification/alertService.js"

export const APP_VERSION = "2.6.0-rbac"
export const BUILD_DATE = "2026-09-17"

/**
 * LoginForm: AeroNexus GCS Sign In presentation and submission component.
 * Connects to DroneIQ backend via POST /api/auth/login.
 * Backend determines and returns authoritative RBAC role.
 */
export const LoginForm = ({ onSuccess, onCancel, showCloseButton = false }) => {
  const navigate = useNavigate()
  const { login } = useAuth()

  // Form states - prefilled with default administrator account for fast verification
  const [email, setEmail] = useState("superadmin")
  const [password, setPassword] = useState("admin123")
  const [rememberDevice, setRememberDevice] = useState(true)

  // Status states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__AERONEXUS_BUILD__ = {
        version: APP_VERSION,
        buildDate: BUILD_DATE,
        authEndpoint: "/api/auth/login",
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    // Username / Email validation
    const identifier = email.trim()
    if (!identifier) {
      setError("Username or email address is required.")
      return
    }

    // Password validation
    if (!password) {
      setError("Password is required.")
      return
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.")
      return
    }

    try {
      setLoading(true)
      await login({
        username: identifier,
        password,
      })

      showAlert({
        type: AlertTypes.SUCCESS,
        title: "Login Successful",
        message: `Welcome back to AeroNexus, ${identifier}.`,
        category: AlertCategories.SECURITY,
        key: "AUTH_STATUS",
      })

      if (rememberDevice) {
        localStorage.setItem("aeronexus_remembered_email", identifier)
      } else {
        localStorage.removeItem("aeronexus_remembered_email")
      }

      if (onSuccess) {
        onSuccess()
      } else {
        navigate("/dashboard")
      }
    } catch (err) {
      const msg = err.status === 401 || err.message?.toLowerCase().includes("invalid") || err.message?.toLowerCase().includes("credential")
        ? "Invalid username or password."
        : (err.message || "Invalid username or password.")
      setError(msg)
      showAlert({
        type: AlertTypes.ERROR,
        title: "Login Failed",
        message: msg,
        category: AlertCategories.SECURITY,
        key: "AUTH_STATUS",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = () => {
    showAlert({
      type: AlertTypes.INFO,
      title: "Password Reset",
      message: "Password reset instructions will be sent to the registered email.",
      category: AlertCategories.SECURITY,
    })
  }

  return (
    <div className="gcs-panel gcs-auth-panel w-full max-w-[360px] px-6 pt-7 pb-6 shadow-2xl">
      {/* Corner HUD Brackets */}
      <GcsCornerBrackets />

      {/* Optional Close Button (for modal dialogs) */}
      {showCloseButton && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close sign in dialog"
          className="absolute right-3.5 top-3.5 text-[var(--gcs-text-muted)] hover:text-white p-1 rounded transition-colors focus:outline-none focus:text-[var(--gcs-accent-cyan)] cursor-pointer"
        >
          <span className="text-xl leading-none">&times;</span>
        </button>
      )}

      {/* Branding Header */}
      <div className="flex items-center justify-center gap-2">
        <AeroLogo className="w-[21px] h-[21px] text-[var(--gcs-accent-cyan)]" size={21} />
        <span className="text-[20px] font-bold tracking-tight text-white leading-none font-mono">
          AeroNexus
        </span>
        <span className="gcs-badge-cyan">
          GCS
        </span>
      </div>

      {/* Title & Subtitle */}
      <div className="text-center mt-5 mb-6">
        <h1
          id="aeronexus-signin-heading"
          className="text-[18px] font-bold text-[var(--gcs-text-light)] tracking-tight font-mono"
        >
          AeroNexus GCS Sign In
        </h1>
        <p className="text-[12px] text-[var(--gcs-text-muted)] mt-1.5 font-normal">
          Authenticate with RBAC role privileges.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 flex items-center gap-2 px-3 py-2 rounded-[4px] bg-red-950/40 border border-red-800/60 text-red-300 text-[12.5px] font-mono"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4 font-mono">
        {/* Username / Email Field */}
        <GcsInput
          id="operator-username"
          label="Username / Email"
          type="text"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="superadmin, fleet_manager, pilot, viewer"
        />

        {/* Password Field */}
        <GcsInput
          id="operator-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {/* Remember Device & Forgot Password */}
        <div className="flex items-center justify-between pt-1 text-[13px] font-sans">
          <label
            htmlFor="remember-device"
            className="inline-flex items-center gap-2 cursor-pointer select-none"
          >
            <input
              id="remember-device"
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="sr-only"
            />
            <span
              className={`w-4 h-4 rounded-[3px] flex items-center justify-center transition-colors ${
                rememberDevice
                  ? "bg-[var(--gcs-accent-cyan)] text-[#0A0E16]"
                  : "bg-[var(--gcs-bg-input)] border border-[var(--gcs-border-input)]"
              }`}
            >
              {rememberDevice && <Check className="w-3 h-3 stroke-[3]" />}
            </span>
            <span className="text-[var(--gcs-text-label)] text-xs">Remember device</span>
          </label>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="gcs-link text-xs cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="gcs-btn-primary mt-6 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#0A0E16]" />
              <span>Authenticating...</span>
            </>
          ) : (
            "Authenticate & Launch GCS"
          )}
        </button>

        {/* Non-sensitive Build Identifier Footer */}
        <div className="text-center text-[9px] text-[var(--gcs-text-muted)] font-mono mt-5 pt-3 border-t border-[var(--gcs-border-subtle)] opacity-70 select-none">
          AeroNexus Platform v{APP_VERSION}
        </div>
      </form>
    </div>
  )
}

export default LoginForm
