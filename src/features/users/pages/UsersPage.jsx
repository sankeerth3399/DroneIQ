import { useState, useEffect, useMemo } from "react"
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Clock,
  Check,
  X,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth.js"
import { Roles, ROLE_METADATA } from "@/auth/roleConfig.js"
import { Permissions } from "@/auth/permissions.js"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { userService } from "@/services/api/userService.js"

export const UsersPage = () => {
  const { user: currentUser, role: currentRole, hasPermission } = useAuth()
  const { showToast } = useTelemetry()

  const canInvite = hasPermission(Permissions.INVITE_USERS)
  const canManageRoles = hasPermission(Permissions.MANAGE_USERS) || currentRole === Roles.SUPER_ADMIN

  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: "",
    username: "",
    email: "",
    role: Roles.FLIGHT_OPERATOR,
  })

  // Confirmation modal for deleting user
  const [userToDelete, setUserToDelete] = useState(null)

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

  // Load users from service on mount
  useEffect(() => {
    let active = true
    userService.getUsers()
      .then((data) => {
        if (active) {
          setUsers(Array.isArray(data) ? data : [])
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          console.error("[UsersPage] Failed to fetch users:", err)
          setError("Failed to load operator directory. Please verify backend connection.")
          setIsLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const data = await userService.getUsers()
      setUsers(Array.isArray(data) ? data : [])
      showToast("Operator directory refreshed.", "info")
    } catch (err) {
      console.error("[UsersPage] Failed to refresh users:", err)
      setError("Failed to load operator directory. Please verify backend connection.")
      showToast("Could not load users directory.", "error")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle Invite / Create User
  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!inviteForm.username.trim() || !inviteForm.email.trim()) {
      showToast("Username and Email are required.", "warning")
      return
    }

    // Role boundary validation
    if (
      currentRole === Roles.FLEET_MANAGER &&
      (inviteForm.role === Roles.SUPER_ADMIN || inviteForm.role === Roles.FLEET_MANAGER)
    ) {
      showToast("Access Denied: Fleet Managers can only invite Flight Operators and Viewers.", "error")
      return
    }

    setIsSubmitting(true)
    try {
      const created = await userService.inviteUser({
        name: inviteForm.name.trim(),
        username: inviteForm.username.trim(),
        email: inviteForm.email.trim(),
        role: inviteForm.role,
      })

      setUsers((prev) => [created, ...prev.filter((u) => u.id !== created.id && u.username !== created.username)])
      setIsInviteOpen(false)
      setInviteForm({
        name: "",
        username: "",
        email: "",
        role: Roles.FLIGHT_OPERATOR,
      })
      showToast(`Operator @${created.username} invited successfully.`, "success")
    } catch (err) {
      console.error("[UsersPage] Invite error:", err)
      showToast(err.message || "Failed to invite operator.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Role Change
  const handleChangeUserRole = async (userId, newRole) => {
    if (!canManageRoles) {
      showToast("Access Denied: Only Super Admin can modify operator roles.", "error")
      return
    }

    try {
      await userService.updateUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      showToast(`Operator role updated to ${newRole}.`, "success")
    } catch (err) {
      console.error("[UsersPage] Role change error:", err)
      showToast("Failed to update operator role.", "error")
    }
  }

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!userToDelete) return
    if (!canManageRoles) {
      showToast("Access Denied: Only Super Admin can delete operators.", "error")
      setUserToDelete(null)
      return
    }

    try {
      await userService.deleteUser(userToDelete.id)
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id))
      showToast(`Operator @${userToDelete.username} removed from directory.`, "info")
    } catch (err) {
      console.error("[UsersPage] Delete error:", err)
      showToast("Failed to remove operator.", "error")
    } finally {
      setUserToDelete(null)
    }
  }

  // Filtered list based on search and role
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== "ALL" && u.role !== roleFilter) {
        return false
      }
      // Search filter
      if (!searchTerm.trim()) return true
      const query = searchTerm.toLowerCase().trim()
      const name = (u.name || "").toLowerCase()
      const username = (u.username || "").toLowerCase()
      const email = (u.email || "").toLowerCase()
      return name.includes(query) || username.includes(query) || email.includes(query)
    })
  }, [users, roleFilter, searchTerm])

  return (
    <div className="relative h-full min-h-0 w-full overflow-y-auto bg-[#06090E] p-4 sm:p-6 lg:p-8 select-none font-sans text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1A2633]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#142232] border border-[#203C54] text-[#35E0FF]">
            <UsersIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#EEF4F8] font-mono">
              USER MANAGEMENT & FLEET DIRECTORY
            </h1>
            <p className="text-xs text-[#8E9EAA]">
              AeroNexus GCS Pilot Registry, Role Assignments, and Operational Privileges
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0C111E] hover:bg-[#141C28] border border-[#1E2E3E] text-[#8E9EAA] hover:text-white font-mono text-xs transition cursor-pointer disabled:opacity-50"
            title="Refresh operator list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#35E0FF]" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canInvite && (
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#35E0FF1A] hover:bg-[#35E0FF2E] border border-[#1A5A68] hover:border-[#35E0FF] text-[#35E0FF] font-mono text-xs font-semibold shadow-[0_0_12px_rgba(53,224,255,0.15)] transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Operator</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Notice Banner for Fleet Managers */}
      {currentRole === Roles.FLEET_MANAGER && (
        <div className="mt-4 p-3 rounded-lg bg-[#151D28] border border-[#1E3A52] text-xs font-mono flex items-center gap-2.5 text-[#38BDF8]">
          <Shield className="w-4 h-4 shrink-0 text-[#35E0FF]" />
          <span>
            Fleet Manager Station: You may invite Flight Operators and Viewers. Role elevation and account deletion require Super Admin authority.
          </span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, @username, or email..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#0B1017] border border-[#1A2633] text-white placeholder-[#64748B] focus:outline-none focus:border-[#35E0FF] transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role Filter Chips / Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[#8E9EAA] hidden sm:inline flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "All Roles" },
              { id: Roles.SUPER_ADMIN, label: "Super Admin" },
              { id: Roles.FLEET_MANAGER, label: "Fleet Mgr" },
              { id: Roles.FLIGHT_OPERATOR, label: "Operator" },
              { id: Roles.VIEWER, label: "Viewer" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                  roleFilter === tab.id
                    ? "bg-[#35E0FF26] text-[#35E0FF] border border-[#35E0FF4D]"
                    : "bg-[#0B1017] border border-[#1A2633] text-[#8E9EAA] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-4">
        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-[#1F1315] border border-[#5E2222] text-[#FF8585] text-xs font-mono flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1 rounded bg-[#FF414126] border border-[#FF41414D] hover:bg-[#FF41414D] text-white transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="rounded-xl border border-[#1A2633] bg-[#0B1017] p-6 space-y-4">
            <div className="flex items-center justify-center py-12 gap-3 text-sm font-mono text-[#35E0FF]">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Accessing Operator Registry...</span>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          /* Empty State */
          <div className="rounded-xl border border-[#1A2633] bg-[#0B1017] p-8 text-center font-mono">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#142232] border border-[#203C54] flex items-center justify-center text-[#8E9EAA] mb-3">
              <UsersIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#EEF4F8]">No operators found</h3>
            <p className="text-xs text-[#8E9EAA] mt-1 max-w-sm mx-auto">
              {searchTerm || roleFilter !== "ALL"
                ? "No users matched your search filters. Try clearing your search or selecting all roles."
                : "No users have been registered yet. Invite your first operator to get started."}
            </p>
            {(searchTerm || roleFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("")
                  setRoleFilter("ALL")
                }}
                className="mt-3 px-3 py-1.5 rounded-md bg-[#171F27] border border-[#223240] text-xs text-[#35E0FF] hover:text-white transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Operator Cards (< sm) */}
            <div className="sm:hidden divide-y divide-[#1A2633] rounded-xl border border-[#1A2633] bg-[#0B1017] overflow-hidden">
              {filteredUsers.map((u) => {
                const meta = ROLE_METADATA[u.role] || ROLE_METADATA[Roles.VIEWER]
                const isSelf = currentUser?.username === u.username
                const isSuperAdminAccount = u.username === "superadmin"

                return (
                  <div key={u.id} className="p-4 space-y-3 font-mono">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-xs truncate flex items-center gap-1.5">
                          <span>{u.name || u.username}</span>
                          {isSelf && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#35E0FF26] text-[#35E0FF] border border-[#35E0FF4D]">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-[#8E9EAA] truncate">
                          @{u.username} • {u.email}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#102A20] text-[#2FE089] border border-[#1F4A38] shrink-0">
                        {u.status || "Active"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#16222E]">
                      <div>
                        <span className="text-[9px] text-[#64748B] block uppercase tracking-wider">Assigned Role</span>
                        {canManageRoles && !isSuperAdminAccount ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                            className="mt-1 bg-[#080C14] border border-[#203C54] text-[#35E0FF] text-[11px] rounded px-2 py-1 font-mono focus:outline-none focus:border-[#35E0FF] cursor-pointer"
                          >
                            <option value={Roles.SUPER_ADMIN}>SUPER_ADMIN</option>
                            <option value={Roles.FLEET_MANAGER}>FLEET_MANAGER</option>
                            <option value={Roles.FLIGHT_OPERATOR}>FLIGHT_OPERATOR</option>
                            <option value={Roles.VIEWER}>VIEWER</option>
                          </select>
                        ) : (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badgeColor}`}>
                            {meta.shortLabel}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[#8E9EAA] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#64748B]" />
                          {u.lastActive || "Recent"}
                        </span>

                        {canManageRoles && !isSuperAdminAccount && !isSelf && (
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 rounded text-[#FF8585] hover:bg-[#FF41411A] transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center border border-transparent hover:border-[#FF41414D]"
                            title="Revoke operator credentials"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop / Tablet User Table (sm+) */}
            <div className="hidden sm:block rounded-xl border border-[#1A2633] bg-[#0B1017] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#080C14] border-b border-[#1A2633] text-[#8E9EAA]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Operator</th>
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold">Assigned Role</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Last Active</th>
                      <th className="py-3 px-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2633]">
                    {filteredUsers.map((u) => {
                      const meta = ROLE_METADATA[u.role] || ROLE_METADATA[Roles.VIEWER]
                      const isSelf = currentUser?.username === u.username
                      const isSuperAdminAccount = u.username === "superadmin"

                      return (
                        <tr key={u.id} className="hover:bg-[#121A24] transition">
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span>{u.name || u.username}</span>
                              {isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#35E0FF26] text-[#35E0FF] border border-[#35E0FF4D]">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#8E9EAA]">@{u.username}</div>
                          </td>

                          <td className="py-3.5 px-4 text-[#8E9EAA]">{u.email}</td>

                          <td className="py-3.5 px-4">
                            {canManageRoles && !isSuperAdminAccount ? (
                              <select
                                value={u.role}
                                onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                                className="bg-[#080C14] border border-[#203C54] text-[#35E0FF] text-[11px] rounded px-2 py-1 font-mono focus:outline-none focus:border-[#35E0FF] cursor-pointer"
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

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#102A20] text-[#2FE089] text-[10px] border border-[#1F4A38]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2FE089]" />
                              {u.status || "Active"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[#8E9EAA]">{u.lastActive || "Active Now"}</td>

                          <td className="py-3.5 px-4 text-right">
                            {canManageRoles && !isSuperAdminAccount && !isSelf ? (
                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                className="p-1.5 rounded text-[#FF8585] hover:bg-[#FF41411A] transition cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-[#FF41414D]"
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
          </>
        )}
      </div>

      {/* INVITE / REGISTER OPERATOR MODAL */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-[#0B1017] border border-[#223240] p-5 sm:p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#1A2633] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#35E0FF]" />
                <span className="text-sm font-bold text-white uppercase tracking-wider">
                  Invite / Register Operator
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="text-[#8E9EAA] hover:text-white p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-[#8E9EAA] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marcus Brody"
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
                  placeholder="e.g. mbrody"
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
                  placeholder="e.g. mbrody@aeronexus.io"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#080C14] border border-[#223240] text-white focus:outline-none focus:border-[#35E0FF]"
                />
              </div>

              <div>
                <label className="block text-[#8E9EAA] mb-1">Assign Initial Role</label>
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
                  <p className="text-[10px] text-[#F59E0B] mt-1.5">
                    Fleet Managers may only assign Flight Operator or Viewer roles.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1A2633]">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-3.5 py-1.5 rounded text-[#8E9EAA] hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#35E0FF] text-[#0A0E16] font-bold hover:bg-[#25C8E5] transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Send Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-xl bg-[#0B1017] border border-[#5E2222] p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-2.5 text-[#FF8585]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-bold uppercase">Revoke Operator Access</span>
            </div>

            <p className="text-[#8E9EAA] leading-relaxed">
              Are you sure you want to revoke credentials for <strong className="text-white">@{userToDelete.username}</strong> ({userToDelete.name})? This operator will immediately lose access to AeroNexus GCS.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1A2633]">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 rounded text-[#8E9EAA] hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-1.5 rounded bg-[#FF4141] hover:bg-[#E03030] text-white font-bold transition"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPage
