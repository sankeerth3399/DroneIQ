import { useState, useMemo } from "react"
import {
  Settings as SettingsIcon,
  Users,
  Shield,
  UserPlus,
  Radio,
  Sliders,
  CheckCircle2,
  Lock,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth.js"
import { Roles, ROLE_METADATA } from "@/auth/roleConfig.js"
import { Permissions } from "@/auth/permissions.js"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { API_BASE_URL, WS_BASE_URL } from "@/config/env.js"

const DEFAULT_USERS = [
  {
    id: "usr-01",
    username: "superadmin",
    name: "Alex Vance",
    email: "superadmin@aeronexus.io",
    role: Roles.SUPER_ADMIN,
    status: "Active",
    lastActive: "Active Now",
  },
  {
    id: "usr-02",
    username: "fleet_manager",
    name: "Marcus Brody",
    email: "fleet_manager@aeronexus.io",
    role: Roles.FLEET_MANAGER,
    status: "Active",
    lastActive: "12m ago",
  },
  {
    id: "usr-03",
    username: "pilot",
    name: "Sarah Chen",
    email: "pilot@aeronexus.io",
    role: Roles.FLIGHT_OPERATOR,
    status: "Active",
    lastActive: "2h ago",
  },
  {
    id: "usr-04",
    username: "viewer",
    name: "Elena Rostova",
    email: "viewer@aeronexus.io",
    role: Roles.VIEWER,
    status: "Active",
    lastActive: "1d ago",
  },
]

export const SettingsPage = ({ initialTab = "system" }) => {
  const { hasPermission, role: currentRole } = useAuth()
  const { showToast } = useTelemetry()

  const canSystemConfig = hasPermission(Permissions.SYSTEM_CONFIG)
  const canManageUsers = hasPermission(Permissions.MANAGE_USERS) || hasPermission(Permissions.INVITE_USERS)

  // Default active tab based on role capabilities
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab === "users" && canManageUsers) return "users"
    if (canSystemConfig) return "system"
    if (canManageUsers) return "users"
    return "system"
  })

  // System Configuration State
  const [sysConfig, setSysConfig] = useState({
    wsUrl: `${WS_BASE_URL}/ws/telemetry`,
    apiUrl: API_BASE_URL,
    telemetryRate: "20Hz",
    safetyBuffer: "15",
    maxCeiling: "120",
    failsafeMode: "RTL",
  })

  const [sysSaved, setSysSaved] = useState(false)

  // Team & Users State
  const [teamUsers, setTeamUsers] = useState(() => {
    try {
      const stored = localStorage.getItem("aeronexus_team_users")
      return stored ? JSON.parse(stored) : DEFAULT_USERS
    } catch {
      return DEFAULT_USERS
    }
  })

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: "",
    username: "",
    email: "",
    role: Roles.FLIGHT_OPERATOR,
  })

  // Roles available for assignment based on actor's role
  const assignableRoles = useMemo(() => {
    if (currentRole === Roles.SUPER_ADMIN) {
      return [
        Roles.SUPER_ADMIN,
        Roles.FLEET_MANAGER,
        Roles.FLIGHT_OPERATOR,
        Roles.VIEWER,
      ]
    }
    // FLEET_MANAGER can only assign FLIGHT_OPERATOR and VIEWER
    return [Roles.FLIGHT_OPERATOR, Roles.VIEWER]
  }, [currentRole])

  const handleSaveSystemConfig = (e) => {
    e.preventDefault()
    if (!canSystemConfig) {
      showToast("Access Denied: Super Admin permissions required to modify system configuration.", "error")
      return
    }
    setSysSaved(true)
    showToast("System configurations saved successfully.", "success")
    setTimeout(() => setSysSaved(false), 2500)
  }

  const handleCreateUser = (e) => {
    e.preventDefault()
    if (!inviteForm.username.trim() || !inviteForm.email.trim()) {
      showToast("Username and Email are required.", "warning")
      return
    }

    // Double check: Fleet Manager cannot create SUPER_ADMIN or FLEET_MANAGER
    if (
      currentRole === Roles.FLEET_MANAGER &&
      (inviteForm.role === Roles.SUPER_ADMIN || inviteForm.role === Roles.FLEET_MANAGER)
    ) {
      showToast("Permission Denied: Fleet Managers can only invite Flight Operators and Viewers.", "error")
      return
    }

    const newUser = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      username: inviteForm.username.trim(),
      name: inviteForm.name.trim() || inviteForm.username.trim(),
      email: inviteForm.email.trim(),
      role: inviteForm.role,
      status: "Active",
      lastActive: "Invited",
    }

    const updated = [newUser, ...teamUsers]
    setTeamUsers(updated)
    try {
      localStorage.setItem("aeronexus_team_users", JSON.stringify(updated))
    } catch {
      // Ignore
    }

    setIsInviteOpen(false)
    setInviteForm({
      name: "",
      username: "",
      email: "",
      role: Roles.FLIGHT_OPERATOR,
    })
    showToast(`User ${newUser.username} added successfully with role ${newUser.role}.`, "success")
  }

  const handleChangeUserRole = (userId, newRole) => {
    if (currentRole !== Roles.SUPER_ADMIN) {
      showToast("Access Denied: Only Super Admin can change user roles.", "error")
      return
    }
    const updated = teamUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    setTeamUsers(updated)
    try {
      localStorage.setItem("aeronexus_team_users", JSON.stringify(updated))
    } catch {
      // Ignore
    }
    showToast("Operator role updated successfully.", "success")
  }

  const handleDeleteUser = (userId) => {
    if (currentRole !== Roles.SUPER_ADMIN) {
      showToast("Access Denied: Only Super Admin can delete users.", "error")
      return
    }
    const updated = teamUsers.filter((u) => u.id !== userId)
    setTeamUsers(updated)
    try {
      localStorage.setItem("aeronexus_team_users", JSON.stringify(updated))
    } catch {
      // Ignore
    }
    showToast("User removed from fleet directory.", "info")
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-y-auto bg-[#06090E] p-4 sm:p-6 lg:p-8 select-none font-sans text-white">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#1A2633]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#142232] border border-[#203C54] text-[#35E0FF]">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#EEF4F8] font-mono">
              SYSTEM SETTINGS & GOVERNANCE
            </h1>
            <p className="text-xs text-[#8E9EAA]">
              AeroNexus GCS Infrastructure, Telemetry, and Access Control
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0C111E] border border-[#1E2E3E]">
          {canSystemConfig && (
            <button
              type="button"
              onClick={() => setActiveTab("system")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition ${
                activeTab === "system"
                  ? "bg-[#35E0FF1A] text-[#35E0FF] border border-[#35E0FF4D]"
                  : "text-[#8E9EAA] hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>System Configuration</span>
            </button>
          )}

          {canManageUsers && (
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition ${
                activeTab === "users"
                  ? "bg-[#35E0FF1A] text-[#35E0FF] border border-[#35E0FF4D]"
                  : "text-[#8E9EAA] hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team & Users</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: SYSTEM CONFIGURATION (SUPER_ADMIN ONLY) */}
      {activeTab === "system" && (
        <div className="mt-6 max-w-4xl space-y-6">
          {!canSystemConfig ? (
            <div className="p-4 rounded-lg bg-[#1B1212] border border-[#5E2222] text-[#FF8585] text-xs font-mono flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>System Configuration is restricted to Super Admin (SUPER_ADMIN). Displaying read-only parameters.</span>
            </div>
          ) : null}

          <form onSubmit={handleSaveSystemConfig} className="space-y-6">
            {/* Network & Endpoints */}
            <div className="p-5 rounded-xl bg-[#0B1017] border border-[#1A2633] space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold font-mono text-[#35E0FF]">
                <Radio className="w-4 h-4" />
                <span>COMMUNICATION & TELEMETRY BACKEND</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-[#8E9EAA] mb-1.5">WebSocket Telemetry URL</label>
                  <input
                    type="text"
                    disabled={!canSystemConfig}
                    value={sysConfig.wsUrl}
                    onChange={(e) => setSysConfig({ ...sysConfig, wsUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#080C14] border border-[#223240] text-white focus:outline-none focus:border-[#35E0FF] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[#8E9EAA] mb-1.5">REST API Endpoint</label>
                  <input
                    type="text"
                    disabled={!canSystemConfig}
                    value={sysConfig.apiUrl}
                    onChange={(e) => setSysConfig({ ...sysConfig, apiUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#080C14] border border-[#223240] text-white focus:outline-none focus:border-[#35E0FF] disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Flight Safety Defaults */}
            <div className="p-5 rounded-xl bg-[#0B1017] border border-[#1A2633] space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold font-mono text-[#2FE089]">
                <Shield className="w-4 h-4" />
                <span>FLIGHT SAFETY PROTOCOLS</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-[#8E9EAA] mb-1.5">Sampling Rate</label>
                  <select
                    disabled={!canSystemConfig}
                    value={sysConfig.telemetryRate}
                    onChange={(e) => setSysConfig({ ...sysConfig, telemetryRate: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#080C14] border border-[#223240] text-white focus:outline-none focus:border-[#35E0FF] disabled:opacity-50"
                  >
                    <option value="10Hz">10 Hz (Low Bandwidth)</option>
                    <option value="20Hz">20 Hz (Standard GCS)</option>
                    <option value="50Hz">50 Hz (High Precision)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8E9EAA] mb-1.5">Geofence Buffer (m)</label>
                  <input
                    type="number"
                    disabled={!canSystemConfig}
                    value={sysConfig.safetyBuffer}
                    onChange={(e) => setSysConfig({ ...sysConfig, safetyBuffer: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#080C14] border border-[#223240] text-white focus:outline-none focus:border-[#35E0FF] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[#8E9EAA] mb-1.5">Max Altitude Ceiling (m AGL)</label>
                  <input
                    type="number"
                    disabled={!canSystemConfig}
                    value={sysConfig.maxCeiling}
                    onChange={(e) => setSysConfig({ ...sysConfig, maxCeiling: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#080C14] border border-[#223240] text-white focus:outline-none focus:border-[#35E0FF] disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {canSystemConfig && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#35E0FF] hover:bg-[#25C8E5] text-[#0A0E16] font-mono font-bold text-xs shadow-[0_0_12px_rgba(53,224,255,0.3)] transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{sysSaved ? "Settings Saved" : "Save Configurations"}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 2: TEAM & USERS (SUPER_ADMIN + FLEET_MANAGER) */}
      {activeTab === "users" && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold font-mono text-[#EEF4F8]">
                FLEET OPERATOR & ROLE DIRECTORY
              </h2>
              <p className="text-xs text-[#8E9EAA]">
                Manage role assignments and operational privileges.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#35E0FF1A] hover:bg-[#35E0FF2E] border border-[#1A5A68] hover:border-[#35E0FF] text-[#35E0FF] font-mono text-xs font-semibold transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Operator</span>
            </button>
          </div>

          {/* Mobile Operator Cards (< sm) */}
          <div className="sm:hidden divide-y divide-[#1A2633] rounded-xl border border-[#1A2633] bg-[#0B1017] overflow-hidden">
            {teamUsers.map((u) => {
              const meta = ROLE_METADATA[u.role] || ROLE_METADATA[Roles.VIEWER]
              return (
                <div key={u.id} className="p-3.5 space-y-2.5 font-mono">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white text-xs">{u.name}</div>
                      <div className="text-[10px] text-[#8E9EAA]">@{u.username} • {u.email}</div>
                    </div>
                    <span className="text-[10px] text-[#2FE089] shrink-0">{u.status}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#16222E]">
                    <div>
                      <span className="text-[9px] text-[#64748B] block">ASSIGNED ROLE</span>
                      {currentRole === Roles.SUPER_ADMIN && u.username !== "superadmin" ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                          className="mt-0.5 bg-[#080C14] border border-[#203C54] text-[#35E0FF] text-[10.5px] rounded px-2 py-1 font-mono focus:outline-none focus:border-[#35E0FF] cursor-pointer"
                        >
                          <option value={Roles.SUPER_ADMIN}>SUPER_ADMIN</option>
                          <option value={Roles.FLEET_MANAGER}>FLEET_MANAGER</option>
                          <option value={Roles.FLIGHT_OPERATOR}>FLIGHT_OPERATOR</option>
                          <option value={Roles.VIEWER}>VIEWER</option>
                        </select>
                      ) : (
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badgeColor}`}>
                          {meta.shortLabel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#8E9EAA]">{u.lastActive}</span>
                      {currentRole === Roles.SUPER_ADMIN && u.username !== "superadmin" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded text-[#FF8585] hover:bg-[#FF41411A] transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Revoke operator credentials"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop/Tablet User Table (sm+) */}
          <div className="hidden sm:block rounded-xl border border-[#1A2633] bg-[#0B1017] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#080C14] border-b border-[#1A2633] text-[#8E9EAA]">
                  <tr>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2633]">
                  {teamUsers.map((u) => {
                    const meta = ROLE_METADATA[u.role] || ROLE_METADATA[Roles.VIEWER]
                    return (
                      <tr key={u.id} className="hover:bg-[#121A24] transition">
                        <td className="py-3 px-4 font-semibold text-white">
                          <div>{u.name}</div>
                          <div className="text-[10px] text-[#8E9EAA]">@{u.username}</div>
                        </td>
                        <td className="py-3 px-4 text-[#8E9EAA]">{u.email}</td>
                        <td className="py-3 px-4">
                          {currentRole === Roles.SUPER_ADMIN && u.username !== "superadmin" ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                              className="bg-[#0B1017] border border-[#203C54] text-[#35E0FF] text-[10.5px] rounded px-2 py-1 font-mono focus:outline-none focus:border-[#35E0FF] cursor-pointer"
                              title="Change operator role"
                            >
                              <option value={Roles.SUPER_ADMIN}>SUPER_ADMIN</option>
                              <option value={Roles.FLEET_MANAGER}>FLEET_MANAGER</option>
                              <option value={Roles.FLIGHT_OPERATOR}>FLIGHT_OPERATOR</option>
                              <option value={Roles.VIEWER}>VIEWER</option>
                            </select>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badgeColor}`}>
                              {meta.shortLabel}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#2FE089]">{u.status}</td>
                        <td className="py-3 px-4 text-[#8E9EAA]">{u.lastActive}</td>
                        <td className="py-3 px-4 text-right">
                          {currentRole === Roles.SUPER_ADMIN && u.username !== "superadmin" ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1 rounded text-[#FF8585] hover:bg-[#FF41411A] transition cursor-pointer"
                              title="Revoke operator credentials"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[#556677] text-[10px] font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INVITE OPERATOR MODAL */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md max-h-[calc(100dvh-24px)] overflow-y-auto rounded-xl bg-[#0B1017] border border-[#223240] p-4 sm:p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#1A2633] pb-3">
              <span className="text-sm font-bold text-white">INVITE / REGISTER OPERATOR</span>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="text-[#8E9EAA] hover:text-white p-1 min-h-[36px] min-w-[36px] flex items-center justify-center text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-[#8E9EAA] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marcus Broderick"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#080C14] border border-[#223240] text-white focus:outline-none focus:border-[#35E0FF]"
                />
              </div>

              <div>
                <label className="block text-[#8E9EAA] mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. mbroderick"
                  value={inviteForm.username}
                  onChange={(e) => setInviteForm({ ...inviteForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#080C14] border border-[#223240] text-white focus:outline-none focus:border-[#35E0FF]"
                />
              </div>

              <div>
                <label className="block text-[#8E9EAA] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. operator@aeronexus.io"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#080C14] border border-[#223240] text-white focus:outline-none focus:border-[#35E0FF]"
                />
              </div>

              <div>
                <label className="block text-[#8E9EAA] mb-1">Assign Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#080C14] border border-[#223240] text-white focus:outline-none focus:border-[#35E0FF]"
                >
                  {assignableRoles.map((r) => {
                    const meta = ROLE_METADATA[r]
                    return (
                      <option key={r} value={r}>
                        {meta.label} ({meta.shortLabel})
                      </option>
                    )
                  })}
                </select>
                {currentRole === Roles.FLEET_MANAGER && (
                  <p className="text-[10px] text-[#F59E0B] mt-1">
                    Fleet Managers may only assign Flight Operator or Viewer roles.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1A2633]">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-3 py-1.5 rounded text-[#8E9EAA] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#35E0FF] text-[#0A0E16] font-bold hover:bg-[#25C8E5] transition"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
