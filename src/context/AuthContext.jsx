import { useState, useEffect, useCallback } from "react"
import { AuthContext } from "./authContextCore.js"
import { authService } from "@/services/api/authService.js"

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => authService.getToken())
  const [user, setUser] = useState(() => authService.getUser())
  const [authLoading, setAuthLoading] = useState(false)

  const logout = useCallback(() => {
    authService.logout()
    setToken(null)
    setUser(null)
  }, [])

  // Manage auth event listeners
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("[AuthContext] Session expired or 401 received. Logging out.")
      logout()
    }

    const handleGlobalLogout = () => {
      setToken(null)
      setUser(null)
    }

    window.addEventListener("aeronexus:unauthorized", handleUnauthorized)
    window.addEventListener("aeronexus:logout", handleGlobalLogout)

    return () => {
      window.removeEventListener("aeronexus:unauthorized", handleUnauthorized)
      window.removeEventListener("aeronexus:logout", handleGlobalLogout)
    }
  }, [logout])

  const login = useCallback(async ({ username, password }) => {
    setAuthLoading(true)
    try {
      const result = await authService.login({ username, password })
      setToken(result.token)
      setUser(result.user)
      return result
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    authLoading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
