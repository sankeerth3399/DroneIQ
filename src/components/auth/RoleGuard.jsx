import React from "react"
import { useAuth } from "@/hooks/useAuth.js"

/**
 * Reusable Role & Permission Guard Component
 * Conditionally renders children or fallback based on active user authorities.
 *
 * @param {Object} props
 * @param {string} [props.permission] - Single required permission
 * @param {Array<string>} [props.permissions] - Multiple permissions to check
 * @param {boolean} [props.requireAll=false] - Whether all specified permissions are required
 * @param {Array<string>} [props.allowedRoles] - Specific roles allowed
 * @param {React.ReactNode} props.children - Protected elements
 * @param {React.ReactNode} [props.fallback=null] - Rendered when unauthorized
 * @param {boolean} [props.renderDisabled=false] - If true, clones children with disabled state
 * @param {string} [props.tooltip] - Optional tooltip for disabled element
 */
export const RoleGuard = ({
  permission,
  permissions = [],
  requireAll = false,
  allowedRoles = [],
  children,
  fallback = null,
  renderDisabled = false,
  tooltip,
}) => {
  const { hasPermission, hasAnyRole, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return fallback
  }

  let isAllowed = true

  // Check role requirement
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    isAllowed = hasAnyRole(allowedRoles)
  }

  // Check single permission requirement
  if (isAllowed && permission) {
    isAllowed = hasPermission(permission)
  }

  // Check multiple permissions
  if (isAllowed && Array.isArray(permissions) && permissions.length > 0) {
    if (requireAll) {
      isAllowed = permissions.every((p) => hasPermission(p))
    } else {
      isAllowed = permissions.some((p) => hasPermission(p))
    }
  }

  if (isAllowed) {
    return <>{children}</>
  }

  if (renderDisabled && React.isValidElement(children)) {
    return (
      <div className="relative inline-flex group" title={tooltip || "Action restricted for your role"}>
        {React.cloneElement(children, {
          disabled: true,
          "aria-disabled": "true",
          className: `${children.props.className || ""} opacity-40 cursor-not-allowed pointer-events-none select-none`,
        })}
      </div>
    )
  }

  return fallback
}

export default RoleGuard
