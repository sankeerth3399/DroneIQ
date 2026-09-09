import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authService } from "@/services/api/authService.js"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => authService.getToken())
  const [user, setUser] = useState(() => authService.getUser())
  const [authLoading, setAuthLoading] = useState(true)

  // Initialize and restore active session
  useEffect(() => {
    const savedToken = authService.getToken()
    const savedUser = authService.getUser()
    if (savedToken) {
      setToken(savedToken)
      setUser(savedUser)
    }
    setAuthLoading(false)

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
  }, [])

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

  const logout = useCallback(() => {
    authService.logout()
    setToken(null)
    setUser(null)
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

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export default AuthContext
