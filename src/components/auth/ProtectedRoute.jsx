import { Navigate, useLocation, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth.js"
import AccessDenied from "./AccessDenied.jsx"

/**
 * Route protection wrapper enforcing authentication and role permissions
 *
 * @param {Object} props
 * @param {string} [props.requiredPermission] - Permission required to view route
 * @param {Array<string>} [props.allowedRoles] - Roles allowed to view route
 * @param {React.ReactNode} [props.children] - Page component
 */
export const ProtectedRoute = ({ requiredPermission, allowedRoles, children }) => {
  const { isAuthenticated, hasPermission, hasAnyRole, authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-[#35E0FF] font-mono text-sm">
        Authenticating session...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    return <AccessDenied allowedRoles={allowedRoles} />
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDenied requiredPermission={requiredPermission} />
  }

  return children ? children : <Outlet />
}

export default ProtectedRoute
