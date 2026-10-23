import { useEffect, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { LogOut, Zap, Check } from "lucide-react"
import { useAuth } from "@/hooks/useAuth.js"
import { Roles, ROLE_METADATA } from "@/auth/roleConfig.js"

const ProfileDropdown = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, role, logout, devSwitchRole } = useAuth()
    const [open, setOpen] = useState(false)
    const containerRef = useRef(null)

    const roleMeta = ROLE_METADATA[role] || ROLE_METADATA[Roles.VIEWER]
    const username = user?.username || "Commander Alex Vance"
    const email = user?.email || "alex.vance@aeronexus.io"
    const initials = username.slice(0, 2).toUpperCase() || "CO"

    // Close on outside click (using capture phase so stopPropagation in children does not prevent closing)
    // and close on Escape key press
    useEffect(() => {
        if (!open) return

        const handlePointerDown = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false)
            }
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setOpen(false)
            }
        }

        document.addEventListener("pointerdown", handlePointerDown, true)
        window.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown, true)
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [open])

    // Close dropdown whenever navigating between routes or query parameters (e.g. Mission Planning steps)
    useEffect(() => {
        setOpen(false)
    }, [location.pathname, location.search, location.key])

    const handleLogout = () => {
        setOpen(false)
        logout()
        navigate("/login")
    }

    const handleQuickRoleSwitch = (newRole) => {
        if (devSwitchRole) {
            devSwitchRole(newRole)
        }
        setOpen(false)
    }

    return (
        <div className="relative shrink-0 flex items-center" ref={containerRef}>
            {/* Header User Profile Trigger Button */}
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full transition-all duration-150 cursor-pointer select-none border ${
                    open
                        ? "bg-[#10223A] border-[#38BDF8] ring-1 ring-[#38BDF8]/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]"
                        : "border-[#1E3A5F] bg-[#0A182B]/60 hover:bg-[#10223A] hover:border-[#38BDF8]/60"
                } group`}
                aria-label="Open user profile menu"
                aria-expanded={open}
                aria-haspopup="true"
            >
                <div className="flex justify-center items-center w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-[#1B68D2] text-white text-[12px] font-bold shadow-sm ring-1 ring-white/10">
                    {initials}
                </div>
                <div className="hidden xl:flex flex-col text-left leading-tight min-w-0 max-w-[130px]">
                    <span className="text-[12px] font-bold text-white truncate group-hover:text-[#38BDF8] transition">
                        {username}
                    </span>
                    <span className="text-[10px] text-[#8EA3BE] truncate">
                        {roleMeta.label || "Operations Centre"}
                    </span>
                </div>
            </button>

            {/* Profile & Fast Role Switcher Dropdown */}
            {open && (
                <div
                    className="absolute right-0 top-full mt-2 z-50 w-[280px] sm:w-[290px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-80px)] overflow-y-auto rounded-xl border border-[#223547] bg-[#080D16FA] shadow-[0_16px_40px_rgba(0,0,0,0.92)] backdrop-blur-md font-mono text-white select-none animate-in fade-in slide-in-from-top-1"
                    role="menu"
                    aria-label="User Profile and Role Options"
                >
                    {/* Top Identity Strip */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1A2633] bg-[#0A121E]">
                        <div className="flex justify-center items-center w-9 h-9 shrink-0 rounded-full bg-[#1B68D2] text-white text-[13px] font-bold shadow-md ring-1 ring-white/15">
                            {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] text-[#EEF4F8] font-bold truncate leading-tight">
                                {username}
                            </p>
                            <p className="text-[11px] text-[#8E9EAA] truncate font-sans">
                                {email}
                            </p>
                        </div>
                    </div>

                    {/* Active Role Status */}
                    <div className="px-4 py-3 border-b border-[#1A2633] space-y-1.5 bg-[#080C14]">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wider text-[#8E9EAA]">
                                Assigned Role
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleMeta.badgeColor}`}>
                                {roleMeta.shortLabel}
                            </span>
                        </div>
                        <p className="text-[10px] text-[#8E9EAA] leading-relaxed">
                            {roleMeta.description}
                        </p>
                    </div>

                    {/* DEV-ONLY FAST ROLE SWITCHER (strictly enabled in development) */}
                    {import.meta.env.DEV && (
                        <div className="px-4 py-3 bg-[#060A10] border-b border-[#1A2633]">
                            <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-[#F59E0B] uppercase tracking-wider mb-2">
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
                                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold border transition text-left truncate cursor-pointer ${
                                                isActive
                                                    ? "bg-[#35E0FF26] text-[#35E0FF] border-[#35E0FF] shadow-[0_0_8px_rgba(53,224,255,0.25)]"
                                                    : "bg-[#0F1722] text-[#8E9EAA] border-[#1E2E3E] hover:text-white hover:border-[#35E0FF66] hover:bg-[#15202E]"
                                            }`}
                                        >
                                            <span className="truncate">{meta.shortLabel}</span>
                                            {isActive && <Check className="w-3 h-3 text-[#35E0FF] shrink-0 ml-1" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Logout Button */}
                    <div className="p-2 bg-[#080D16]">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-[#FF8585] hover:text-[#FF4141] hover:bg-[#2E1414] transition cursor-pointer"
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
