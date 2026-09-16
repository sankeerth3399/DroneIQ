import { useState, useEffect, useCallback, useMemo } from "react"
import { AuthContext } from "./authContextCore.js"
import { authService } from "@/services/api/authService.js"
import { normalizeRole, getRolePermissions, Roles } from "@/auth/roleConfig.js"

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

    const handleRoleChanged = () => {
      setToken(authService.getToken())
      setUser(authService.getUser())
    }

    window.addEventListener("aeronexus:unauthorized", handleUnauthorized)
    window.addEventListener("aeronexus:logout", handleGlobalLogout)
    window.addEventListener("aeronexus:role-changed", handleRoleChanged)

    return () => {
      window.removeEventListener("aeronexus:unauthorized", handleUnauthorized)
      window.removeEventListener("aeronexus:logout", handleGlobalLogout)
      window.removeEventListener("aeronexus:role-changed", handleRoleChanged)
    }
  }, [logout])

  const login = useCallback(async ({ username, password, requestedRole }) => {
    setAuthLoading(true)
    try {
      const result = await authService.login({ username, password, requestedRole })
      setToken(result.token)
      setUser(result.user)
      return result
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const devSwitchRole = useCallback((newRole) => {
    const res = authService.devSwitchRole(newRole)
    if (res) {
      setToken(res.token)
      setUser(res.user)
    }
    return res
  }, [])

  // Derived effective permission set
  const permissions = useMemo(() => {
    if (!user || !user.role) return new Set()
    return getRolePermissions(user.role, user.authorities)
  }, [user])

  const hasPermission = useCallback(
    (permission) => {
      if (!permission) return true
      if (!user) return false
      return permissions.has(permission)
    },
    [user, permissions]
  )

  const hasRole = useCallback(
    (targetRole) => {
      if (!user || !user.role) return false
      return normalizeRole(user.role) === normalizeRole(targetRole)
    },
    [user]
  )

  const hasAnyRole = useCallback(
    (allowedRoles) => {
      if (!user || !user.role) return false
      if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true
      const current = normalizeRole(user.role)
      return allowedRoles.some((r) => normalizeRole(r) === current)
    },
    [user]
  )

  const getToken = useCallback(() => {
    return token || authService.getToken()
  }, [token])

  const value = {
    token,
    user,
    role: user?.role ? normalizeRole(user.role) : Roles.VIEWER,
    permissions,
    isAuthenticated: Boolean(token),
    authLoading,
    login,
    logout,
    hasRole,
    hasAnyRole,
    hasPermission,
    getToken,
    devSwitchRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
