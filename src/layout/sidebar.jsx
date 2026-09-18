import { useState, useMemo } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { X, ChevronDown, FileText, MapPin, ShieldAlert, Users as UsersIcon } from "lucide-react"
import Fly from "../assets/images/drone.svg"
import Settings from "../assets/images/settings.svg"
import Logs from "../assets/images/logs.svg"
import Target from "../assets/images/target.svg"
import Dashboard from "@/assets/images/dashboard.svg"
import AeroLogo from "@/components/AeroLogo.jsx"
import { useAuth } from "@/hooks/useAuth.js"
import { Permissions } from "@/auth/permissions.js"
import { ROLE_METADATA, Roles } from "@/auth/roleConfig.js"

const ALL_TABS = [
    { label: "Dashboard", value: "/dashboard", img: Dashboard },
    { label: "Fly", value: "/fly", img: Fly },
    { label: "Missions", value: "/missions", requiredPermission: Permissions.VIEW_MISSIONS, img: Target, isDropdown: true },
    { label: "Logs", value: "/logs", requiredPermission: Permissions.VIEW_LOGS, img: Logs },
    { label: "Users", value: "/users", icon: UsersIcon },
    { label: "Settings", value: "/settings", img: Settings },
]

const missionSubItems = [
    { label: "Mission Details", value: "/missions/details", icon: FileText },
    { label: "Create Geofence", value: "/missions/geofence", icon: ShieldAlert },
    { label: "Waypoint Planning", value: "/missions/waypoints", icon: MapPin },
]

const Sidebar = ({ collapsed = false, onToggle, mobileOpen = false, onCloseMobile }) => {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, role, hasPermission } = useAuth()
    const roleMeta = ROLE_METADATA[role] || ROLE_METADATA[Roles.VIEWER]

    const isMissionsActive = location.pathname.startsWith("/missions")
    const [missionsExpanded, setMissionsExpanded] = useState(true)
    const [prevPath, setPrevPath] = useState(location.pathname)

    if (location.pathname !== prevPath) {
        setPrevPath(location.pathname)
        if (isMissionsActive) {
            setMissionsExpanded(true)
        }
    }

    // Filter tabs dynamically based on user's active permissions
    const visibleTabs = useMemo(() => {
        return ALL_TABS.filter((tab) => {
            if (!tab.requiredPermission) return true
            return hasPermission(tab.requiredPermission)
        })
    }, [hasPermission])

    const displayName = user?.username || "Operator"
    const initials = displayName.slice(0, 2).toUpperCase()

    return (
        <aside
            className={`flex flex-col h-full min-h-0 shrink-0 bg-[linear-gradient(180deg,#0A0E12_0%,#06090B_100%)] text-white border-r border-[#1A2633] transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] ${
                mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            } lg:static lg:translate-x-0 lg:z-auto ${
                collapsed ? "lg:w-[72px]" : "lg:w-[200px] xl:w-[220px]"
            }`}
        >
            <div
                className={`flex items-center shrink-0 bg-[#0C111E] h-14 xl:h-16 px-3 ${
                    collapsed ? "lg:justify-center lg:px-2" : "justify-between"
                }`}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <AeroLogo className="w-5 h-5 text-[#35E0FF] shrink-0" size={20} />
                    <h1
                        className={`text-[16px] text-[#FFFFFF] font-semibold tracking-tight truncate ${
                            collapsed ? "lg:hidden" : "block"
                        }`}
                    >
                        AeroNexus
                    </h1>
                </div>

                <div className="flex items-center gap-1">
                    {/* Close Button on Mobile */}
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="flex lg:hidden items-center justify-center w-9 h-9 rounded-md text-[#A0AEC0] hover:bg-[#FFFFFF1A] hover:text-white transition cursor-pointer"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Desktop Collapse Toggle */}
                    {onToggle && (
                        <button
                            type="button"
                            onClick={onToggle}
                            className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-md text-[#CCCCCC] hover:bg-[#FFFFFF0A] hover:text-white transition ${
                                collapsed ? "w-9 h-9" : ""
                            }`}
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {!collapsed ? (
                                <div className="w-[22px] h-[22px] rounded-full border border-[#35E0FF] flex items-center justify-center">
                                    <div className="w-[8px] h-[8px] rounded-full bg-[#35E0FF]" />
                                </div>
                            ) : (
                                <div className="w-[22px] h-[22px] rounded-full border border-[#35E0FF4D] flex items-center justify-center hover:border-[#35E0FF]">
                                    <div className="w-[8px] h-[8px] rounded-full bg-[#35E0FF]" />
                                </div>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <nav
                className={`flex flex-col flex-1 min-h-0 px-2 pt-3 pb-2 ${
                    collapsed ? "lg:overflow-visible overflow-y-auto" : "overflow-y-auto overflow-x-hidden"
                }`}
            >
                {visibleTabs.map((tab) => {
                    if (tab.isDropdown) {
                        return (
                            <div key={tab.value} className="mb-0.5">
                                {/* Parent Dropdown Header */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (collapsed) {
                                            navigate("/missions/details")
                                            onCloseMobile?.()
                                        } else {
                                            setMissionsExpanded((prev) => !prev)
                                        }
                                    }}
                                    title={collapsed ? "Missions" : undefined}
                                    className={`w-full relative flex items-center text-[13px] font-semibold transition-all duration-100 rounded-[6px] ${
                                        collapsed
                                            ? `lg:justify-center lg:py-2.5 ${
                                                  isMissionsActive
                                                      ? "bg-[#171F27B2] text-white shadow-[0px_4px_4px_0px_#00000026]"
                                                      : "text-[#CCCCCC] hover:bg-[#FFFFFF0A]"
                                              } py-2.5 pl-3 pr-2 gap-2.5`
                                            : `justify-between py-2.5 pl-3 pr-2.5 gap-2 ${
                                                  isMissionsActive
                                                      ? "bg-[#171F2780] text-[#FFFFFF] border-l-[3px] border-[#38BDF8]"
                                                      : "bg-inherit text-[#CCCCCC] hover:bg-[#FFFFFF0A]"
                                              }`
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <img src={tab.img} className="w-[18px] h-[18px] shrink-0" alt={tab.label} />
                                        <span className={`truncate uppercase tracking-wider text-[12px] font-bold ${collapsed ? "lg:hidden block" : "block"}`}>
                                            {tab.label}
                                        </span>
                                    </div>

                                    {!collapsed && (
                                        <ChevronDown
                                            className={`w-3.5 h-3.5 text-[#8E9EAA] transition-transform duration-200 ${
                                                missionsExpanded ? "rotate-0 text-[#35E0FF]" : "-rotate-90"
                                            }`}
                                        />
                                    )}
                                </button>

                                {/* Child Subitems Menu */}
                                {!collapsed && missionsExpanded && (
                                    <div className="flex flex-col mt-0.5 mb-1 pl-4 border-l border-[#1A2633] ml-3.5 space-y-0.5">
                                        {missionSubItems.map((sub) => {
                                            const SubIcon = sub.icon
                                            return (
                                                <NavLink
                                                    to={sub.value}
                                                    key={sub.value}
                                                    onClick={onCloseMobile}
                                                    className={({ isActive }) =>
                                                        `flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] text-[11px] font-medium transition-colors ${
                                                            isActive
                                                                ? "bg-[#35E0FF1A] text-[#35E0FF] border-l-2 border-[#35E0FF] font-semibold"
                                                                : "text-[#94A3B8] hover:text-white hover:bg-[#FFFFFF0A]"
                                                        }`
                                                    }
                                                >
                                                    <SubIcon className="w-3 h-3 shrink-0 opacity-70" />
                                                    <span className="truncate">{sub.label}</span>
                                                </NavLink>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    return (
                        <NavLink
                            to={tab.value}
                            key={tab.value}
                            end={tab.value === "/"}
                            title={collapsed ? tab.label : undefined}
                            onClick={onCloseMobile}
                            className={({ isActive }) =>
                                `relative flex items-center text-[13px] font-semibold mb-0.5 transition-all duration-100 rounded-[6px] ${
                                    collapsed
                                        ? `lg:justify-center lg:py-2.5 ${
                                              isActive
                                                  ? "bg-[#171F27B2] text-white shadow-[0px_4px_4px_0px_#00000026]"
                                                  : "text-[#CCCCCC] hover:bg-[#FFFFFF0A]"
                                          } py-2.5 pl-3 pr-2 gap-2.5`
                                        : `gap-2.5 py-2.5 pl-3 pr-2 ${
                                              isActive
                                                  ? "bg-[#171F27B2] text-[#FFFFFF] shadow-[0px_4px_4px_0px_#00000026] border-l-[3px] border-[#38BDF8]"
                                                  : "bg-inherit text-[#CCCCCC] hover:bg-[#FFFFFF0A] border-[#38BDF8]"
                                          }`
                                }`
                            }
                        >
                            {tab.icon ? (
                                <tab.icon className="w-[18px] h-[18px] shrink-0 text-[#8E9EAA]" />
                            ) : (
                                <img src={tab.img} className="w-[18px] h-[18px] shrink-0" alt={tab.label} />
                            )}
                            <span className={`truncate ${collapsed ? "lg:hidden block" : "block"}`}>
                                {tab.label}
                            </span>
                        </NavLink>
                    )
                })}
            </nav>

            {!collapsed && (
                <div className="shrink-0 px-2 pb-2">
                    <div className="flex flex-col w-full bg-[#FFFFFF0A] px-3 py-2 gap-1 rounded-lg">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#66E599]" />
                            <h1 className="text-[10px] text-[#66E599] font-normal leading-tight">
                                All Systems Operational
                            </h1>
                        </div>
                        <p className="text-[10px] text-[#FFFFFF4D] font-normal leading-tight font-mono">
                            AeroNexus GCS v2.4.1
                        </p>
                    </div>
                </div>
            )}

            {/* Authenticated User / Role Strip in Sidebar Footer */}
            <div
                className={`flex shrink-0 items-center bg-[#0C111E] gap-2 border-t border-[#1A2633] ${
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                }`}
            >
                <div className="flex justify-center items-center w-8 h-8 shrink-0 rounded-full bg-[#059EB2] text-[11px] font-semibold text-white font-mono">
                    {initials}
                </div>
                {!collapsed && (
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[12px] font-semibold truncate text-[#EEF4F8] leading-tight font-mono">
                            {displayName}
                        </h1>
                        <p className={`text-[9.5px] font-mono font-semibold truncate ${roleMeta.badgeColor.split(" ")[0]}`}>
                            {roleMeta.shortLabel}
                        </p>
                    </div>
                )}
            </div>
        </aside>
    )
}

export default Sidebar
