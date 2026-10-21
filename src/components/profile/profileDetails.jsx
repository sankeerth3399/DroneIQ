import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, User, Zap } from "lucide-react"
import { useAuth } from "@/hooks/useAuth.js"
import { Roles, ROLE_METADATA } from "@/auth/roleConfig.js"

const ProfileDropdown = () => {
    const navigate = useNavigate()
    const { user, role, logout, devSwitchRole } = useAuth()
    const [open, setOpen] = useState(false)
    const containerRef = useRef(null)

    const roleMeta = ROLE_METADATA[role] || ROLE_METADATA[Roles.VIEWER]
    const username = user?.username || "Operator"
    const email = user?.email || `${username.toLowerCase()}@aeronexus.io`
    const initials = username.slice(0, 2).toUpperCase() || "OP"

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleLogout = () => {
        logout()
        setOpen(false)
        navigate("/login")
    }

    const handleQuickRoleSwitch = (newRole) => {
        if (devSwitchRole) {
            devSwitchRole(newRole)
        }
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-2 px-1.5 py-1 rounded-full hover:bg-white/5 transition cursor-pointer select-none border border-transparent hover:border-[#1E3A5F] group"
                aria-label="Open profile menu"
                aria-expanded={open}
            >
                <div className="flex justify-center items-center w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-[#1B68D2] text-white text-[12px] font-bold shadow-sm ring-1 ring-white/10">
                    {initials}
                </div>
                <div className="hidden xl:flex flex-col text-left leading-tight min-w-0 max-w-[130px]">
                    <span className="text-[12px] font-bold text-white truncate group-hover:text-[#38BDF8] transition">{username}</span>
                    <span className="text-[10px] text-[#8EA3BE] truncate">{roleMeta.label || "Operations Centre"}</span>
                </div>
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[280px] max-w-[calc(100vw-24px)] rounded-[10px] border border-[#223240] bg-[#0B1017E6] shadow-[0_12px_36px_rgba(0,0,0,0.85)] backdrop-blur-md overflow-hidden font-mono text-white select-none animate-in fade-in slide-in-from-top-2">
                    {/* Top Identity Strip */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1A2633] bg-[#080C14]">
                        <div className="flex justify-center items-center w-10 h-10 shrink-0 rounded-full bg-[#059EB2] text-white text-[13px] font-bold shadow-md">
                            {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] text-[#EEF4F8] font-bold truncate leading-tight">{username}</p>
                            <p className="text-[11px] text-[#8E9EAA] truncate">{email}</p>
                        </div>
                    </div>

                    {/* Active Role Status */}
                    <div className="px-4 py-3 border-b border-[#1A2633] space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wider text-[#8E9EAA]">Assigned Role</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleMeta.badgeColor}`}>
                                {roleMeta.shortLabel}
                            </span>
                        </div>
                        <p className="text-[10px] text-[#8E9EAA] leading-relaxed">
                            {roleMeta.description}
                        </p>
                    </div>

                    {/* DEV-ONLY FAST ROLE SWITCHER (strictly enabled only in development) */}
                    {import.meta.env.DEV && (
                        <div className="px-4 py-2.5 bg-[#070A10] border-b border-[#1A2633]">
                            <div className="flex items-center gap-1 text-[9.5px] font-bold text-[#F59E0B] uppercase tracking-wider mb-2">
                                <Zap className="w-3 h-3 text-[#F59E0B]" />
                                <span>DEV ONLY — ROLE SWITCHER</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {Object.values(Roles).map((r) => {
                                    const meta = ROLE_METADATA[r]
                                    const isActive = role === r
                                    return (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => handleQuickRoleSwitch(r)}
                                            className={`px-2 py-1 rounded text-[9px] font-bold border transition text-left truncate ${
                                                isActive
                                                    ? "bg-[#35E0FF26] text-[#35E0FF] border-[#35E0FF]"
                                                    : "bg-[#121A24] text-[#8E9EAA] border-[#1E2E3E] hover:text-white hover:border-[#35E0FF66]"
                                            }`}
                                        >
                                            {meta.shortLabel}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Logout Button */}
                    <div className="p-2">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-[12px] text-[#FF8585] hover:text-[#FF4141] hover:bg-[#2E1414] transition cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out Operator</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProfileDropdown
