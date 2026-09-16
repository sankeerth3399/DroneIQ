import { useNavigate } from "react-router-dom"
import { ShieldAlert, ArrowLeft, LayoutDashboard, Plane } from "lucide-react"
import { useAuth } from "@/hooks/useAuth.js"
import { ROLE_METADATA, Roles } from "@/auth/roleConfig.js"

/**
 * High-tech AeroNexus HUD Access Denied View
 * Rendered when a user navigates directly to an unauthorized URL route.
 */
export const AccessDenied = ({
  title = "ACCESS RESTRICTED",
  message = "You do not have the required authorities or role permissions to view this secure station.",
  requiredPermission,
  allowedRoles,
}) => {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const roleMeta = ROLE_METADATA[role] || ROLE_METADATA[Roles.VIEWER]

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full p-4 sm:p-6 text-center select-none font-sans">
      {/* Outer Cybernetic Card */}
      <div className="relative max-w-lg w-full bg-[#0B1017E6] border border-[#223240] rounded-xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-md overflow-hidden">
        {/* Top Glowing HUD Accent */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF4141] to-transparent" />

        {/* Shield Alert Icon */}
        <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-[#2E1414] border border-[#5E2222] shadow-[0_0_15px_rgba(255,65,65,0.25)]">
          <ShieldAlert className="w-7 h-7 text-[#FF4141]" />
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-wider text-[#EEF4F8] uppercase">
          {title}
        </h1>

        {/* Subtitle / Message */}
        <p className="mt-2 text-sm text-[#8E9EAA] leading-relaxed">
          {message}
        </p>

        {/* User Context Details Strip */}
        <div className="mt-6 p-3.5 rounded-lg bg-[#080C14] border border-[#1A2633] text-left text-xs font-mono space-y-1.5">
          <div className="flex items-center justify-between text-[#8E9EAA]">
            <span>AUTHENTICATED OPERATOR:</span>
            <span className="text-[#EEF4F8] font-semibold">{user?.username || "Guest"}</span>
          </div>

          <div className="flex items-center justify-between text-[#8E9EAA]">
            <span>ACTIVE ROLE:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleMeta.badgeColor}`}>
              {roleMeta.shortLabel}
            </span>
          </div>

          {requiredPermission && (
            <div className="flex items-center justify-between text-[#8E9EAA]">
              <span>REQUIRED PERMISSION:</span>
              <span className="text-[#FF8585]">{requiredPermission}</span>
            </div>
          )}

          {Array.isArray(allowedRoles) && allowedRoles.length > 0 && (
            <div className="flex items-center justify-between text-[#8E9EAA]">
              <span>AUTHORIZED ROLES:</span>
              <span className="text-[#35E0FF]">{allowedRoles.join(" / ")}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/fly")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#35E0FF1A] hover:bg-[#35E0FF2E] border border-[#1A5A68] hover:border-[#35E0FF] text-[#35E0FF] text-xs font-mono font-semibold transition"
          >
            <Plane className="w-3.5 h-3.5" />
            <span>Return to Fly HUD</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#171F27] hover:bg-[#202B36] border border-[#223240] text-[#EEF4F8] text-xs font-mono font-semibold transition"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-[#8E9EAA]" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[#8E9EAA] hover:text-white text-xs font-mono transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccessDenied
