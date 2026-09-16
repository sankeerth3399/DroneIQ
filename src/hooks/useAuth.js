import { useContext } from "react"
import AuthContext from "@/context/authContextCore.js"

/**
 * Canonical useAuth Hook
 * Accesses authentication state, user credentials, login, and logout routines.
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export default useAuth
