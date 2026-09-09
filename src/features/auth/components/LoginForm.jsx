import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, AlertCircle, Loader2 } from "lucide-react"
import AeroLogo from "./AeroLogo.jsx"
import GcsCornerBrackets from "./GcsCornerBrackets.jsx"
import GcsInput from "./GcsInput.jsx"
import GcsSelect from "./GcsSelect.jsx"
import { useAuth } from "@/context/AuthContext.jsx"
import { loginWithSSO } from "../services/authService.js"

const ROLE_OPTIONS = [
  "Pilot",
  "Mission Operator",
  "Administrator",
  "Observer",
]

/**
 * LoginForm: GCS Operator Sign In presentation and submission component.
 * Connects to DroneIQ backend via POST /api/auth/login.
 */
export const LoginForm = ({ onSuccess, onCancel, showCloseButton = false }) => {
  const navigate = useNavigate()
  const { login } = useAuth()

  // Form states matching default screenshot reference
  const [email, setEmail] = useState("admin")
  const [password, setPassword] = useState("admin123")
  const [role, setRole] = useState("Pilot")
  const [rememberDevice, setRememberDevice] = useState(true)

  // Status states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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
      setError(err.message || "Authentication failed. Please verify credentials or check backend availability.")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = () => {
    // TODO: Connect to forgot-password flow.
    alert("Forgot password flow initiated. Password reset instructions will be sent to the registered email.")
  }

  const handleRequestAccess = () => {
    // TODO: Connect Request Access to the appropriate route/page.
    if (onCancel) {
      onCancel()
    }
    navigate("/landing#enterprise")
  }

  const handleSSO = async () => {
    try {
      // TODO: Integrate SAML/OIDC SSO authentication.
      await loginWithSSO()
      alert("Redirecting to SAML / OIDC Single Sign-On identity provider...")
    } catch (err) {
      setError(err.message || "SSO initialization failed.")
    }
  }

  return (
    <div className="gcs-panel w-full max-w-[400px] px-6 sm:px-7 pt-8 pb-7 shadow-2xl">
      {/* Corner HUD Brackets */}
      <GcsCornerBrackets />

      {/* Optional Close Button (for modal dialogs) */}
      {showCloseButton && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close sign in dialog"
          className="absolute right-3.5 top-3.5 text-[var(--gcs-text-muted)] hover:text-white p-1 rounded transition-colors focus:outline-none focus:text-[var(--gcs-accent-cyan)]"
        >
          <span className="text-xl leading-none">&times;</span>
        </button>
      )}

      {/* Branding Header */}
      <div className="flex items-center justify-center gap-2.5">
        <AeroLogo className="w-[22px] h-[22px] text-[var(--gcs-accent-cyan)]" size={22} />
        <span className="text-[22px] font-bold tracking-tight text-white leading-none">
          AeroNexus
        </span>
        <span className="gcs-badge-cyan">
          GCS
        </span>
      </div>

      {/* Title & Subtitle */}
      <div className="text-center mt-6 mb-7">
        <h1
          id="operator-sign-in-heading"
          className="text-[21px] font-semibold text-[var(--gcs-text-light)] tracking-tight"
        >
          Operator Sign In
        </h1>
        <p className="text-[13.5px] text-[var(--gcs-text-muted)] mt-1.5 font-normal">
          Authenticate to access the GCS platform.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 flex items-center gap-2 px-3 py-2 rounded-[4px] bg-red-950/40 border border-red-800/60 text-red-300 text-[12.5px]"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email Field */}
        <GcsInput
          id="operator-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="s.chen@aeronexus.io"
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

        {/* Role Select (Demo) */}
        <GcsSelect
          id="operator-role"
          label="Role (demo)"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />

        {/* Remember Device & Forgot Password */}
        <div className="flex items-center justify-between pt-1 text-[13px]">
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
            <span className="text-[var(--gcs-text-label)]">Remember device</span>
          </label>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="gcs-link"
          >
            Forgot password?
          </button>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="gcs-btn-primary mt-6"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#0A0E16]" />
              <span>Signing in...</span>
            </>
          ) : (
            "Sign In"
          )}
        </button>

        {/* Request Access */}
        <div className="text-center text-[13px] text-[var(--gcs-text-label)] pt-1">
          <span>No account? </span>
          <button
            type="button"
            onClick={handleRequestAccess}
            className="gcs-link font-medium ml-1"
          >
            Request access
          </button>
        </div>

        {/* Subtle Horizontal Divider */}
        <div className="pt-2">
          <div className="border-t border-[var(--gcs-border-subtle)] w-full" />
        </div>

        {/* SSO Button */}
        <button
          type="button"
          onClick={handleSSO}
          className="gcs-btn-secondary"
        >
          <span>Sign in with SSO</span>
          <span className="text-[var(--gcs-text-muted)] ml-1.5 text-[12.5px] font-normal">
            (SAML / OIDC)
          </span>
        </button>
      </form>
    </div>
  )
}

export default LoginForm
