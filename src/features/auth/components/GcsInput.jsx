import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

/**
 * GcsInput: Reusable accessible GCS input field with optional password visibility toggle.
 * Follows SRP and LSP (accepts standard input attributes).
 */
export const GcsInput = ({
  id,
  label,
  type = "text",
  className = "",
  containerClassName = "",
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordField = type === "password"
  const computedType = isPasswordField ? (showPassword ? "text" : "password") : type

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[13px] font-medium text-[var(--gcs-text-label)] mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          type={computedType}
          className={`gcs-input ${isPasswordField ? "pr-10" : ""} ${className}`}
          {...props}
        />

        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gcs-text-muted)] hover:text-slate-300 focus:outline-none focus:text-[var(--gcs-accent-cyan)] transition-colors p-0.5"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
}

export default GcsInput
