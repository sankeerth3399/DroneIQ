import { useEffect } from "react"
import LoginForm from "./LoginForm.jsx"

/**
 * LoginModal: Accessible popup dialog presenting the AeroNexus GCS Operator Sign In.
 * Follows SRP (modal lifecycle & accessibility) and OCP (dialog wrapper).
 */
export const LoginModal = ({ isOpen, onClose, onSuccess }) => {
  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="operator-sign-in-heading"
      className="gcs-modal-backdrop"
      onClick={(e) => {
        // Close when clicking directly on backdrop
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="gcs-modal-panel">
        <LoginForm
          onSuccess={onSuccess}
          onCancel={onClose}
          showCloseButton={true}
        />
      </div>
    </div>
  )
}

export default LoginModal
