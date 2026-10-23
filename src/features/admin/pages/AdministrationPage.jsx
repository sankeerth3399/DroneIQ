import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users as UsersIcon,
  UserCheck,
  UserPlus,
  Sliders,
  Database,
  Radio,
  Wifi,
  WifiOff,
  Activity,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Unlock,
  Server,
  Video,
  Layers,
  Key,
  Cpu,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react"

import { useAuth } from "@/hooks/useAuth.js"
import { Roles, ROLE_METADATA } from "@/auth/roleConfig.js"
import { Permissions } from "@/auth/permissions.js"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { userService } from "@/services/api/userService.js"
import { API_BASE_URL, WS_BASE_URL } from "@/config/env.js"
import { showAlert, AlertTypes, AlertCategories } from "@/services/notification/alertService.js"
import BottomInfoStrip from "@/features/reports/components/BottomInfoStrip.jsx"

// LocalStorage Keys
const STORAGE_KEY_MISSION_RULES = "aeronexus_mission_rules_config"

// Default Mission Rules for AeroNexus DroneIQ
const DEFAULT_MISSION_RULES = [
  {
    id: "rule-geofence-req",
    name: "Geofence Required Before Planning",
    behaviour: "A valid geofence boundary must be configured and saved before waypoint planning is permitted.",
    enforced: true,
    status: true,
    category: "Safety Interlock",
  },
  {
    id: "rule-waypoints-inside",
    name: "Waypoints Confined to Geofence",
    behaviour: "All planned waypoints must strictly reside within the active geofence perimeter coordinates.",
    enforced: true,
    status: true,
    category: "Boundary Integrity",
  },
  {
    id: "rule-route-segments",
    name: "Route Segments Boundary Confinement",
    behaviour: "Flight path vectors and interconnecting transit segments must not cross or breach outside the geofence.",
    enforced: true,
    status: true,
    category: "Boundary Integrity",
  },
  {
    id: "rule-no-duplicate-vertices",
    name: "Duplicate / Coincident Vertices Prohibited",
    behaviour: "Geofence polygon editor automatically rejects duplicate, coincident, or zero-distance adjacent vertices.",
    enforced: true,
    status: true,
    category: "Geometry Validation",
  },
  {
    id: "rule-no-self-intersect",
    name: "Self-Intersecting Geofences Prohibited",
    behaviour: "Polygon edge crossings (figure-8s, bowtie geometries) are strictly prevented by validation algorithms.",
    enforced: true,
    status: true,
    category: "Geometry Validation",
  },
  {
    id: "rule-no-zero-area",
    name: "Zero-Area Geofences Prohibited",
    behaviour: "Geofence boundary must enclose a positive non-zero area with at least 3 non-collinear vertices.",
    enforced: true,
    status: true,
    category: "Geometry Validation",
  },
  {
    id: "rule-confirm-arm",
    name: "ARM Requires User Confirmation",
    behaviour: "Operator two-step modal confirmation required prior to motor energization and propulsion arming.",
    enforced: false,
    status: true,
    category: "Command Safeguard",
  },
  {
    id: "rule-confirm-disarm",
    name: "DISARM Requires User Confirmation",
    behaviour: "Explicit confirmation prompt required before executing motor disarm sequence in-flight or on ground.",
    enforced: false,
    status: true,
    category: "Command Safeguard",
  },
  {
    id: "rule-confirm-takeoff",
    name: "TAKEOFF Requires User Confirmation",
    behaviour: "Safety checklist validation and confirmation modal required before automated vertical ascent.",
    enforced: false,
    status: true,
    category: "Command Safeguard",
  },
  {
    id: "rule-confirm-land",
    name: "LAND Requires User Confirmation",
    behaviour: "Operator prompt required before initiating descent and touchdown landing protocol.",
    enforced: false,
    status: true,
    category: "Command Safeguard",
  },
  {
    id: "rule-confirm-start-mission",
    name: "START MISSION Requires User Confirmation",
    behaviour: "Pre-flight safety checklist and operator confirmation required before automated waypoint mission execution.",
    enforced: false,
    status: true,
    category: "Mission Execution",
  },
  {
    id: "rule-confirm-flight-mode",
    name: "Flight-Mode Changes Require User Confirmation",
    behaviour: "Transitioning flight modes (GUIDED, AUTO, RTL, LOITER, STABILIZE) prompts safety modal confirmation.",
    enforced: false,
    status: true,
    category: "Flight Dynamics",
  },
  {
    id: "rule-unarmed-joystick-inhibit",
    name: "Unarmed Joystick Movement Inhibit",
    behaviour: "Joysticks and manual pitch/roll/yaw inputs are strictly locked out when drone motors are disarmed.",
    enforced: true,
    status: true,
    category: "Safety Interlock",
  },
  {
    id: "rule-authoritative-telemetry",
    name: "Authoritative Live Telemetry",
    behaviour: "Valid live telemetry overrides cached estimates and directly drives real-time map positioning and KPIs.",
    enforced: true,
    status: true,
    category: "Telemetry Ingestion",
  },
  {
    id: "rule-offline-fallback",
    name: "Operational Hyderabad Fallback",
    behaviour: "Fallback to operational Hyderabad coordinates when no valid live drone telemetry stream is present.",
    enforced: true,
    status: true,
    category: "Operational Fallback",
  },
  {
    id: "rule-simulator-isolation",
    name: "Simulator Telemetry Isolation",
    behaviour: "Simulator/mock telemetry packets are explicitly tagged and isolated from production flight telemetry.",
    enforced: true,
    status: true,
    category: "Telemetry Ingestion",
  },
]

export const AdministrationPage = ({ initialTab = "users" }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user: currentUser, role: currentRole, hasPermission } = useAuth()
  const { connectionState, isLive } = useTelemetry()

  // Permissions
  const canManageUsers = hasPermission(Permissions.MANAGE_USERS) || currentRole === Roles.SUPER_ADMIN
  const canInviteUsers = hasPermission(Permissions.INVITE_USERS) || currentRole === Roles.SUPER_ADMIN || currentRole === Roles.FLEET_MANAGER
  const canSystemConfig = hasPermission(Permissions.SYSTEM_CONFIG) || currentRole === Roles.SUPER_ADMIN
  const isViewer = currentRole === Roles.VIEWER

  // Active Tab state ("users", "rules", "integrations")
  const paramTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(() => {
    if (paramTab === "rules" || paramTab === "mission-rules") return "rules"
    if (paramTab === "integrations") return "integrations"
    if (paramTab === "users" || paramTab === "roles") return "users"
    return initialTab || "users"
  })

  // Synchronize URL search params when activeTab changes
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey)
    setSearchParams({ tab: tabKey }, { replace: true })
  }

  // ==========================================
  // TAB 1: USERS & ROLES STATE
  // ==========================================
  const [users, setUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [showUserDirectory, setShowUserDirectory] = useState(false)
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState("ALL")
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [inviteForm, setInviteForm] = useState({
    name: "",
    username: "",
    email: "",
    role: Roles.FLIGHT_OPERATOR,
  })

  // Load registered users on mount
  useEffect(() => {
    let active = true
    userService.getUsers()
      .then((data) => {
        if (active) {
          setUsers(Array.isArray(data) ? data : [])
          setIsLoadingUsers(false)
        }
      })
      .catch((err) => {
        if (active) {
          console.warn("[AdministrationPage] Error fetching users:", err.message)
          setIsLoadingUsers(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  // User counts per role
  const roleUserCounts = useMemo(() => {
    const counts = {
      [Roles.SUPER_ADMIN]: 0,
      [Roles.FLEET_MANAGER]: 0,
      [Roles.FLIGHT_OPERATOR]: 0,
      [Roles.VIEWER]: 0,
    }
    users.forEach((u) => {
      const r = u.role || Roles.VIEWER
      if (counts[r] !== undefined) counts[r]++
    })
    return counts
  }, [users])

  // Roles available for assignment based on actor's role
  const assignableRoles = useMemo(() => {
    if (currentRole === Roles.SUPER_ADMIN) {
      return [Roles.SUPER_ADMIN, Roles.FLEET_MANAGER, Roles.FLIGHT_OPERATOR, Roles.VIEWER]
    }
    return [Roles.FLIGHT_OPERATOR, Roles.VIEWER]
  }, [currentRole])

  // Filtered users for user management sub-panel
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !userSearchTerm.trim() ||
        u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
      const matchesRole = userRoleFilter === "ALL" || u.role === userRoleFilter
      return matchesSearch && matchesRole
    })
  }, [users, userSearchTerm, userRoleFilter])

  // Handle Invite User
  const handleInviteSubmit = async (e) => {
    e.preventDefault()
    if (!inviteForm.username || !inviteForm.email) {
      showAlert({
        type: AlertTypes.WARNING,
        title: "Required Fields Missing",
        message: "Username and Email are mandatory for account creation.",
        category: AlertCategories.SECURITY,
      })
      return
    }

    setIsSubmittingInvite(true)
    try {
      const created = await userService.inviteUser(inviteForm)
      setUsers((prev) => [created, ...prev.filter((u) => u.username !== created.username)])
      setIsInviteModalOpen(false)
      setInviteForm({
        name: "",
        username: "",
        email: "",
        role: Roles.FLIGHT_OPERATOR,
      })
      showAlert({
        type: AlertTypes.SUCCESS,
        title: "User Created",
        message: `Account for ${created.username} created successfully.`,
        category: AlertCategories.SECURITY,
      })
    } catch (err) {
      showAlert({
        type: AlertTypes.ERROR,
        title: "Failed to Create User",
        message: err.message || "An unexpected error occurred.",
        category: AlertCategories.SECURITY,
      })
    } finally {
      setIsSubmittingInvite(false)
    }
  }

  // Handle Role Change
  const handleRoleChange = async (userId, newRole) => {
    if (!canManageUsers) return
    try {
      await userService.updateUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      showAlert({
        type: AlertTypes.SUCCESS,
        title: "Role Updated",
        message: `Operator role updated to ${newRole}.`,
        category: AlertCategories.SECURITY,
      })
    } catch (err) {
      showAlert({
        type: AlertTypes.ERROR,
        title: "Role Update Failed",
        message: err.message || "Could not update role.",
        category: AlertCategories.SECURITY,
      })
    }
  }

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete || !canManageUsers) return
    try {
      await userService.deleteUser(userToDelete.id)
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id))
      showAlert({
        type: AlertTypes.SUCCESS,
        title: "User Removed",
        message: `Account for ${userToDelete.username} deleted.`,
        category: AlertCategories.SECURITY,
      })
      setUserToDelete(null)
    } catch (err) {
      showAlert({
        type: AlertTypes.ERROR,
        title: "Deletion Failed",
        message: err.message || "Could not delete user account.",
        category: AlertCategories.SECURITY,
      })
    }
  }

  // ==========================================
  // TAB 2: MISSION RULES STATE
  // ==========================================
  const [missionRules, setMissionRules] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_MISSION_RULES
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MISSION_RULES)
      if (!stored) return DEFAULT_MISSION_RULES
      const parsed = JSON.parse(stored)
      // Merge stored with defaults to ensure all 16 rules exist
      return DEFAULT_MISSION_RULES.map((def) => {
        const found = parsed.find((p) => p.id === def.id)
        return found ? { ...def, status: found.status } : def
      })
    } catch {
      return DEFAULT_MISSION_RULES
    }
  })

  const [rulesFilter, setRulesFilter] = useState("ALL")
  const [rulesSearch, setRulesSearch] = useState("")

  // Toggle configurable rule
  const handleToggleRule = (ruleId) => {
    if (!canSystemConfig) {
      showAlert({
        type: AlertTypes.WARNING,
        title: "Access Restricted",
        message: "Modifying mission rules requires Super Admin privileges.",
        category: AlertCategories.SECURITY,
      })
      return
    }

    setMissionRules((prev) => {
      const updated = prev.map((r) => {
        if (r.id === ruleId && !r.enforced) {
          return { ...r, status: !r.status }
        }
        return r
      })
      try {
        localStorage.setItem(STORAGE_KEY_MISSION_RULES, JSON.stringify(updated))
      } catch (e) {
        console.warn("Storage error saving rules:", e)
      }
      return updated
    })
  }

  // Reset rules to default
  const handleResetRules = () => {
    if (!canSystemConfig) return
    setMissionRules(DEFAULT_MISSION_RULES)
    try {
      localStorage.setItem(STORAGE_KEY_MISSION_RULES, JSON.stringify(DEFAULT_MISSION_RULES))
      showAlert({
        type: AlertTypes.SUCCESS,
        title: "Rules Reset",
        message: "Mission rules have been restored to baseline defaults.",
        category: AlertCategories.SYSTEM,
      })
    } catch (e) {
      console.warn("Storage error resetting rules:", e)
    }
  }

  const filteredMissionRules = useMemo(() => {
    return missionRules.filter((r) => {
      const matchesSearch =
        !rulesSearch.trim() ||
        r.name.toLowerCase().includes(rulesSearch.toLowerCase()) ||
        r.behaviour.toLowerCase().includes(rulesSearch.toLowerCase()) ||
        r.category.toLowerCase().includes(rulesSearch.toLowerCase())
      const matchesFilter =
        rulesFilter === "ALL" ||
        (rulesFilter === "ENFORCED" && r.enforced) ||
        (rulesFilter === "CONFIGURABLE" && !r.enforced)
      return matchesSearch && matchesFilter
    })
  }, [missionRules, rulesSearch, rulesFilter])

  // ==========================================
  // TAB 3: INTEGRATIONS STATE
  // ==========================================
  const [apiPingStatus, setApiPingStatus] = useState("CHECKING") // "ONLINE" | "OFFLINE" | "CHECKING"
  const [isPingingApi, setIsPingingApi] = useState(false)

  const checkApiHealth = async () => {
    setIsPingingApi(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`, { method: "GET" }).catch(() => null)
      if (res && (res.ok || res.status === 200 || res.status === 404)) {
        setApiPingStatus("ONLINE")
      } else {
        // Fallback test on api/drones or base url
        const droneRes = await fetch(`${API_BASE_URL}/api/drones`, { method: "GET" }).catch(() => null)
        setApiPingStatus(droneRes ? "ONLINE" : "OFFLINE")
      }
    } catch {
      setApiPingStatus("OFFLINE")
    } finally {
      setIsPingingApi(false)
    }
  }

  useEffect(() => {
    checkApiHealth()
  }, [])

  // Integration Specifications
  const integrationsList = useMemo(() => {
    const wsIsActive = connectionState === "CONNECTED" || isLive
    const wsStatusLabel = wsIsActive
      ? "Connected"
      : connectionState === "CONNECTING"
      ? "Connecting"
      : "Configured (Standby)"

    return [
      {
        id: "rest-api",
        name: "REST API",
        icon: Server,
        purpose: "Frontend ↔ Spring Boot backend",
        endpoint: `${API_BASE_URL || "http://localhost:8080"}`,
        status: apiPingStatus === "ONLINE" ? "Connected" : "Configured",
        statusType: apiPingStatus === "ONLINE" ? "success" : "info",
        details: "Core REST controllers for drone missions, authentication, alerts and fleet analytics.",
        action: "Ping Server",
      },
      {
        id: "ws-telemetry",
        name: "WebSocket Telemetry",
        icon: Radio,
        purpose: "Real-time drone telemetry",
        endpoint: `${WS_BASE_URL}/ws/telemetry`,
        status: wsStatusLabel,
        statusType: wsIsActive ? "success" : "warning",
        details: "Full-duplex STOMP/SockJS channel delivering 20Hz drone coordinates, attitude & battery packets.",
        action: "Reconnect",
      },
      {
        id: "kafka",
        name: "Apache Kafka",
        icon: Layers,
        purpose: "Telemetry messaging / backend event pipeline",
        endpoint: "localhost:9092 (Broker)",
        status: "Configured",
        statusType: "info",
        details: "Distributed event streaming cluster ingesting high-throughput drone telemetry into topics: drone.telemetry.raw, drone.commands.",
        action: "View Topics",
      },
      {
        id: "database",
        name: "Database / Persistence",
        icon: Database,
        purpose: "Mission persistence, audit logs & operator accounts",
        endpoint: "Spring Data JPA / PostgreSQL & LocalStorage Cache",
        status: "Connected",
        statusType: "success",
        details: "Relational persistence layer backed by Spring Data JPA with resilient client-side storage cache.",
        action: "Inspect Storage",
      },
      {
        id: "webrtc",
        name: "WebRTC / WHEP",
        icon: Video,
        purpose: "Live camera/FPV streaming",
        endpoint: "MediaMTX WHEP Endpoint (/whep)",
        status: "Configured",
        statusType: "info",
        details: "Ultra-low latency sub-second camera stream playback using WebRTC HTTP Egress Protocol (WHEP).",
        action: "Test Stream",
      },
      {
        id: "mediamtx",
        name: "MediaMTX Gateway",
        icon: Cpu,
        purpose: "Video streaming / media infrastructure",
        endpoint: "http://localhost:8889 (MediaMTX RTSP/WHEP Server)",
        status: "Configured",
        statusType: "info",
        details: "Standalone high-performance media server converting RTSP drone feeds to WHEP WebRTC egress.",
        action: "Verify Gateway",
      },
      {
        id: "jwt-auth",
        name: "Authentication / JWT",
        icon: Key,
        purpose: "Bearer-token authentication and RBAC",
        endpoint: "RFC 7519 HMAC-SHA256 Token Sessions",
        status: currentUser ? "Connected" : "Configured",
        statusType: currentUser ? "success" : "info",
        details: "Cryptographic token verification ensuring least-privilege role-based access control across all operations.",
        action: "Inspect Session",
      },
    ]
  }, [apiPingStatus, connectionState, isLive, currentUser])

  // Display user name and role for signed-in section
  const currentDisplayName = currentUser?.name || currentUser?.username || "Operator"
  const currentRoleMeta = ROLE_METADATA[currentRole] || ROLE_METADATA[Roles.VIEWER]
  const currentUserEmail = currentUser?.email || "ops@aeronexus.io"

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto overflow-x-hidden bg-[#F0F4F9] font-sans">
      {/* ================================================== */}
      {/* 1. DELETE USER CONFIRMATION MODAL                  */}
      {/* ================================================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E36]/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#D5E1ED] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-[#DC2626] mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0D233A]">Confirm Account Deletion</h3>
                <p className="text-xs text-[#64748B]">This action is irreversible.</p>
              </div>
            </div>
            <p className="text-sm text-[#334155] leading-relaxed mb-6">
              Are you sure you want to deactivate and remove user{" "}
              <strong className="text-[#0D233A] font-semibold">
                “{userToDelete.name || userToDelete.username}”
              </strong>{" "}
              ({userToDelete.email})? Their permissions and session tokens will be revoked immediately.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#475569] hover:text-[#0D233A] hover:bg-[#F1F5F9] border border-[#D5E1ED] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs transition cursor-pointer"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 2. INVITE / CREATE USER MODAL                      */}
      {/* ================================================== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E36]/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#D5E1ED] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E64D4] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0D233A]">Invite / Create Operator</h3>
                  <p className="text-xs text-[#64748B]">Assign account credentials & RBAC role</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0D233A] hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#18314C] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Commander Jane Doe"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAFC] border border-[#CAD8E6] text-sm text-[#0E2646] font-medium placeholder-[#94A3B8] focus:border-[#1E64D4] focus:ring-2 focus:ring-[#1E64D4]/20 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18314C] mb-1.5">
                  Username <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. pilot_jane"
                  value={inviteForm.username}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAFC] border border-[#CAD8E6] text-sm text-[#0E2646] font-medium placeholder-[#94A3B8] focus:border-[#1E64D4] focus:ring-2 focus:ring-[#1E64D4]/20 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18314C] mb-1.5">
                  Email Address <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. jane.doe@aeronexus.io"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAFC] border border-[#CAD8E6] text-sm text-[#0E2646] font-medium placeholder-[#94A3B8] focus:border-[#1E64D4] focus:ring-2 focus:ring-[#1E64D4]/20 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18314C] mb-1.5">
                  Assigned RBAC Role <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAFC] border border-[#CAD8E6] text-sm text-[#0E2646] font-medium focus:border-[#1E64D4] focus:ring-2 focus:ring-[#1E64D4]/20 focus:outline-none transition"
                >
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_METADATA[r]?.label || r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#475569] hover:bg-[#F1F5F9] border border-[#D5E1ED] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#1E64D4] hover:bg-[#1553B8] text-white shadow-xs transition cursor-pointer"
                >
                  {isSubmittingInvite ? "Creating..." : "Confirm & Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 3. MAIN PAGE CONTAINER                             */}
      {/* ================================================== */}
      <div className="mx-auto flex w-full max-w-[1780px] flex-col gap-6 p-4 sm:p-5 xl:p-6 2xl:p-7">
        {/* ================================================== */}
        {/* PAGE HEADER                                        */}
        {/* ================================================== */}
        <header className="flex flex-col gap-3 pb-3 border-b border-[#D5E1ED] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0D233A] tracking-tight leading-tight">
              Administration
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#4F657F] font-medium">
              Users, mission rules and the systems AeroNexus DroneIQ talks to.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isViewer ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs font-semibold text-[#92400E]">
                <ShieldAlert className="h-4 w-4" />
                Auditor Mode · Read-Only Access
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs font-semibold text-[#15803D]">
                <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
                System Active · {currentRoleMeta.label} Authority
              </span>
            )}
          </div>
        </header>

        {/* ================================================== */}
        {/* MAIN ADMINISTRATION CARD                           */}
        {/* ================================================== */}
        <section className="bg-white rounded-2xl border border-[#D5E1ED] shadow-sm p-6 sm:p-7 flex flex-col">
          {/* Card Header matching reference */}
          <div className="flex items-center gap-2 pb-4 border-b border-[#E2E8F0]">
            <SettingsIcon className="w-5 h-5 text-[#1E64D4]" />
            <h2 className="text-base sm:text-lg font-bold text-[#0D233A] tracking-tight">
              Administration
            </h2>
          </div>

          {/* Tab Navigation matching reference */}
          <div className="flex items-center gap-2 pt-4 pb-5 border-b border-[#E2E8F0] overflow-x-auto">
            <button
              type="button"
              onClick={() => handleTabChange("users")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 ${
                activeTab === "users"
                  ? "bg-[#1E64D4] text-white shadow-xs"
                  : "bg-transparent text-[#475569] hover:text-[#0D233A] hover:bg-[#F1F5F9]"
              }`}
            >
              Users & Roles
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("rules")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 ${
                activeTab === "rules"
                  ? "bg-[#1E64D4] text-white shadow-xs"
                  : "bg-transparent text-[#475569] hover:text-[#0D233A] hover:bg-[#F1F5F9]"
              }`}
            >
              Mission Rules
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("integrations")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 ${
                activeTab === "integrations"
                  ? "bg-[#1E64D4] text-white shadow-xs"
                  : "bg-transparent text-[#475569] hover:text-[#0D233A] hover:bg-[#F1F5F9]"
              }`}
            >
              Integrations
            </button>
          </div>

          {/* ================================================== */}
          {/* TAB 1: USERS & ROLES CONTENT                       */}
          {/* ================================================== */}
          {activeTab === "users" && (
            <div className="pt-2 flex flex-col">
              {/* Users & Roles Overview Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      <th className="py-3 px-3 w-[220px]">Role</th>
                      <th className="py-3 px-3 text-center w-[100px]">Users</th>
                      <th className="py-3 px-3">Can</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {/* SUPER_ADMIN */}
                    <tr className="hover:bg-[#F8FAFC] transition">
                      <td className="py-3.5 px-3 align-top">
                        <div className="font-bold text-[#0D233A]">SUPER_ADMIN</div>
                        <div className="text-xs text-[#64748B]">Super Admin</div>
                      </td>
                      <td className="py-3.5 px-3 align-top text-center font-bold text-[#1E64D4]">
                        {roleUserCounts[Roles.SUPER_ADMIN] || 1}
                      </td>
                      <td className="py-3.5 px-3 text-[#334155] leading-relaxed">
                        Manage users, manage drones, manage system configuration, create/update/delete missions, execute flight commands, emergency overrides, publish telemetry, triage incidents, export evidence
                      </td>
                    </tr>

                    {/* FLEET_MANAGER */}
                    <tr className="hover:bg-[#F8FAFC] transition">
                      <td className="py-3.5 px-3 align-top">
                        <div className="font-bold text-[#0D233A]">FLEET_MANAGER</div>
                        <div className="text-xs text-[#64748B]">Fleet Manager</div>
                      </td>
                      <td className="py-3.5 px-3 align-top text-center font-bold text-[#1E64D4]">
                        {roleUserCounts[Roles.FLEET_MANAGER] || 1}
                      </td>
                      <td className="py-3.5 px-3 text-[#334155] leading-relaxed">
                        Invite/manage users where permitted, manage drones, create/update missions, emergency overrides, publish telemetry, triage incidents, export evidence
                      </td>
                    </tr>

                    {/* FLIGHT_OPERATOR */}
                    <tr className="hover:bg-[#F8FAFC] transition">
                      <td className="py-3.5 px-3 align-top">
                        <div className="font-bold text-[#0D233A]">FLIGHT_OPERATOR</div>
                        <div className="text-xs text-[#64748B]">Flight Operator</div>
                      </td>
                      <td className="py-3.5 px-3 align-top text-center font-bold text-[#1E64D4]">
                        {roleUserCounts[Roles.FLIGHT_OPERATOR] || 1}
                      </td>
                      <td className="py-3.5 px-3 text-[#334155] leading-relaxed">
                        Create/update missions, execute routine flight commands, publish telemetry, triage incidents, operate drones
                      </td>
                    </tr>

                    {/* VIEWER */}
                    <tr className="hover:bg-[#F8FAFC] transition">
                      <td className="py-3.5 px-3 align-top">
                        <div className="font-bold text-[#0D233A]">VIEWER</div>
                        <div className="text-xs text-[#64748B]">Viewer / Auditor</div>
                      </td>
                      <td className="py-3.5 px-3 align-top text-center font-bold text-[#1E64D4]">
                        {roleUserCounts[Roles.VIEWER] || 1}
                      </td>
                      <td className="py-3.5 px-3 text-[#334155] leading-relaxed">
                        Read-only access, view drones, view missions, view telemetry, view analytics/logs where permitted, no flight execution, no administrative modifications
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signed in user footer indicator matching reference */}
              <div className="pt-4 mt-3 border-t border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-[#64748B]">
                <div>
                  Signed in:{" "}
                  <strong className="text-[#0D233A] font-semibold">
                    {currentDisplayName}
                  </strong>{" "}
                  ({currentUserEmail}), {currentRoleMeta.label}.
                </div>

                {/* Administration User Actions for Authorized Managers */}
                {canInviteUsers && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUserDirectory((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CAD8E6] text-xs font-bold text-[#18314C] hover:bg-[#F8FAFC] transition cursor-pointer"
                    >
                      <UsersIcon className="w-3.5 h-3.5 text-[#1E64D4]" />
                      <span>{showUserDirectory ? "Hide User Directory" : "Manage User Directory"}</span>
                      {showUserDirectory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E64D4] hover:bg-[#1553B8] text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Invite Operator</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Individual User Management Directory */}
              {showUserDirectory && canInviteUsers && (
                <div className="mt-5 pt-5 border-t border-[#E2E8F0] flex flex-col gap-4 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#0D233A]">Operator Directory & Access Control</h3>
                      <p className="text-xs text-[#64748B]">View active operator accounts, assign RBAC roles, or revoke access.</p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Search */}
                      <div className="relative">
                        <input
                          type="text"
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          placeholder="Search operators..."
                          className="w-48 sm:w-60 h-9 pl-8 pr-3 rounded-lg bg-[#F8FAFC] border border-[#CAD8E6] text-xs font-medium text-[#0E2646] placeholder-[#94A3B8] focus:border-[#1E64D4] focus:outline-none"
                        />
                        <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>

                      {/* Filter */}
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="h-9 px-2.5 rounded-lg bg-[#F8FAFC] border border-[#CAD8E6] text-xs font-medium text-[#0E2646] focus:border-[#1E64D4] focus:outline-none"
                      >
                        <option value="ALL">All Roles</option>
                        <option value={Roles.SUPER_ADMIN}>Super Admin</option>
                        <option value={Roles.FLEET_MANAGER}>Fleet Manager</option>
                        <option value={Roles.FLIGHT_OPERATOR}>Flight Operator</option>
                        <option value={Roles.VIEWER}>Viewer</option>
                      </select>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                    <table className="w-full min-w-[580px] text-left border-collapse text-xs">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Operator</th>
                          <th className="py-2.5 px-3">Username</th>
                          <th className="py-2.5 px-3">Assigned Role</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] bg-white">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-[#94A3B8]">
                              No matching operator accounts found.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => {
                            const isSelf = u.username === currentUser?.username
                            const isSuperAccount = u.username === "superadmin"

                            return (
                              <tr key={u.id || u.username} className="hover:bg-[#F8FAFC] transition">
                                <td className="py-3 px-3 font-semibold text-[#0D233A]">
                                  {u.name || u.username}
                                  <span className="block text-[11px] font-normal text-[#64748B]">{u.email}</span>
                                </td>
                                <td className="py-3 px-3 font-mono text-[#334155]">{u.username}</td>
                                <td className="py-3 px-3">
                                  {canManageUsers && !isSuperAccount ? (
                                    <select
                                      value={u.role}
                                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                      className="h-8 px-2 rounded-md bg-[#F8FAFC] border border-[#CAD8E6] text-xs font-semibold text-[#0E2646] focus:border-[#1E64D4]"
                                    >
                                      {assignableRoles.map((r) => (
                                        <option key={r} value={r}>
                                          {r}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="font-semibold text-[#1E64D4]">{u.role}</span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                                    <Check className="w-3 h-3" />
                                    Active
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {canManageUsers && !isSelf && !isSuperAccount && (
                                    <button
                                      type="button"
                                      onClick={() => setUserToDelete(u)}
                                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition cursor-pointer"
                                      title="Delete Account"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 2: MISSION RULES CONTENT                       */}
          {/* ================================================== */}
          {activeTab === "rules" && (
            <div className="pt-2 flex flex-col">
              {/* Filter and Search Bar for Rules */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-2 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="text-sm font-bold text-[#0D233A]">AeroNexus Flight & Mission Rules</h3>
                  <p className="text-xs text-[#64748B]">
                    Deterministic safety boundaries and operational safeguards governing flight execution.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={rulesSearch}
                      onChange={(e) => setRulesSearch(e.target.value)}
                      placeholder="Search mission rules..."
                      className="w-48 sm:w-64 h-9 pl-8 pr-3 rounded-lg bg-[#F8FAFC] border border-[#CAD8E6] text-xs font-medium text-[#0E2646] placeholder-[#94A3B8] focus:border-[#1E64D4] focus:outline-none"
                    />
                    <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <select
                    value={rulesFilter}
                    onChange={(e) => setRulesFilter(e.target.value)}
                    className="h-9 px-2.5 rounded-lg bg-[#F8FAFC] border border-[#CAD8E6] text-xs font-medium text-[#0E2646] focus:border-[#1E64D4] focus:outline-none"
                  >
                    <option value="ALL">All Rules (16)</option>
                    <option value="ENFORCED">System Enforced</option>
                    <option value="CONFIGURABLE">Configurable</option>
                  </select>

                  {canSystemConfig && (
                    <button
                      type="button"
                      onClick={handleResetRules}
                      className="h-9 px-3 rounded-lg border border-[#CAD8E6] text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition cursor-pointer"
                      title="Reset all rules to baseline"
                    >
                      Reset Defaults
                    </button>
                  )}
                </div>
              </div>

              {/* Rules Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      <th className="py-3 px-3 w-[260px]">Rule</th>
                      <th className="py-3 px-3">Setting / Behaviour</th>
                      <th className="py-3 px-3 text-right w-[160px]">Status / On-Off</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {filteredMissionRules.map((rule) => {
                      return (
                        <tr key={rule.id} className="hover:bg-[#F8FAFC] transition">
                          <td className="py-3.5 px-3 align-top">
                            <div className="font-bold text-[#0D233A]">{rule.name}</div>
                            <span className="inline-block mt-1 text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] border border-[#E2E8F0] px-2 py-0.5 rounded-md">
                              {rule.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 align-middle text-[#334155] leading-relaxed">
                            {rule.behaviour}
                          </td>
                          <td className="py-3.5 px-3 align-middle text-right">
                            {rule.enforced ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                                <Lock className="w-3 h-3 text-[#16A34A]" />
                                Enforced
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-2 justify-end">
                                <button
                                  type="button"
                                  disabled={!canSystemConfig}
                                  onClick={() => handleToggleRule(rule.id)}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    rule.status ? "bg-[#1E64D4]" : "bg-[#CBD5E1]"
                                  } ${!canSystemConfig ? "opacity-60 cursor-not-allowed" : ""}`}
                                  title={!canSystemConfig ? "Super Admin authority required to edit" : "Toggle rule"}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      rule.status ? "translate-x-5" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                                <span className={`text-xs font-bold ${rule.status ? "text-[#1E64D4]" : "text-[#64748B]"}`}>
                                  {rule.status ? "ON" : "OFF"}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Policy Footer Note */}
              <div className="pt-4 mt-3 border-t border-[#F1F5F9] text-xs text-[#64748B]">
                <Info className="w-3.5 h-3.5 inline mr-1 text-[#1E64D4]" />
                System Enforced rules are core safety primitives hard-coded into geometric and telemetry pipelines. Configurable rules govern operator prompt workflows.
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 3: INTEGRATIONS CONTENT                        */}
          {/* ================================================== */}
          {activeTab === "integrations" && (
            <div className="pt-2 flex flex-col">
              {/* Header Note */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-2 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="text-sm font-bold text-[#0D233A]">Connected Systems & Protocols</h3>
                  <p className="text-xs text-[#64748B]">
                    Active communication interfaces, telemetry message brokers, and streaming infrastructure.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={checkApiHealth}
                    disabled={isPingingApi}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CAD8E6] text-xs font-bold text-[#18314C] hover:bg-[#F8FAFC] transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#1E64D4] ${isPingingApi ? "animate-spin" : ""}`} />
                    <span>Ping Systems</span>
                  </button>
                </div>
              </div>

              {/* Integrations Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      <th className="py-3 px-3 w-[220px]">Integration</th>
                      <th className="py-3 px-3">Purpose & Architecture</th>
                      <th className="py-3 px-3 w-[240px]">Endpoint / Address</th>
                      <th className="py-3 px-3 text-right w-[150px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {integrationsList.map((item) => {
                      const ItemIcon = item.icon
                      const isSuccess = item.status === "Connected"
                      const isWarning = item.status === "Connecting"

                      return (
                        <tr key={item.id} className="hover:bg-[#F8FAFC] transition">
                          <td className="py-3.5 px-3 align-top">
                            <div className="flex items-center gap-2.5 font-bold text-[#0D233A]">
                              <span className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] text-[#1E64D4] flex items-center justify-center shrink-0">
                                <ItemIcon className="w-4 h-4" />
                              </span>
                              <span>{item.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 align-top">
                            <div className="font-semibold text-[#0E2646]">{item.purpose}</div>
                            <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{item.details}</p>
                          </td>
                          <td className="py-3.5 px-3 align-top">
                            <span className="font-mono text-xs px-2 py-1 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] break-all block">
                              {item.endpoint}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 align-top text-right">
                            {isSuccess ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                                {item.status}
                              </span>
                            ) : isWarning ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                                <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
                                {item.status}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#1E64D4] border border-[#BFDBFE]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#1E64D4]" />
                                {item.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Status Note */}
              <div className="pt-4 mt-3 border-t border-[#F1F5F9] text-xs text-[#64748B] flex items-center justify-between">
                <span>
                  All integration endpoints conform to the unified AeroNexus enterprise communication protocol.
                </span>
                <span className="font-mono text-[11px] text-[#94A3B8]">
                  Node: droneiq-edge-01
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ================================================== */}
        {/* BOTTOM VALUE PROPOSITION STRIP                     */}
        {/* ================================================== */}
        <BottomInfoStrip />
      </div>
    </div>
  )
}

export default AdministrationPage
