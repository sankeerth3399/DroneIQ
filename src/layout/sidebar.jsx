import { useState, useMemo } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import {
    X,
    ChevronDown,
    FileText,
    MapPin,
    ShieldAlert,
    Users as UsersIcon,
    BarChart3,
    AlertTriangle,
    Compass,
    Activity,
    Radio,
    Share2,
    Plane,
    Camera,
} from "lucide-react"
import Fly from "../assets/images/drone.svg"
import Settings from "../assets/images/settings.svg"
import Logs from "../assets/images/logs.svg"
import Target from "../assets/images/target.svg"
import Dashboard from "@/assets/images/dashboard.svg"
import AeroLogo from "@/components/AeroLogo.jsx"
import droneLandscapeImg from "@/assets/images/drone_mountain_survey.jpg"
import { useAuth } from "@/hooks/useAuth.js"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { Permissions } from "@/auth/permissions.js"
import { ROLE_METADATA, Roles } from "@/auth/roleConfig.js"
import { ConnectionState } from "@/services/telemetry/telemetryTypes.js"

const ALL_TABS = [
    { label: "Command Center", value: "/dashboard", img: Dashboard },
    { label: "Mission Planning", value: "/mission-planning", icon: Compass },
    { label: "Missions", value: "/missions", requiredPermission: Permissions.VIEW_MISSIONS, img: Target },
    { label: "Geofence", value: "/geofence", icon: ShieldAlert },
    { label: "Waypoint Planning", value: "/waypoint-planning", icon: MapPin },
    { label: "Fly", value: "/fly", img: Fly },
    { label: "Live Operations", value: "/live-operations", icon: Activity },
    { label: "Remote Pilot", value: "/remote-pilot", icon: Radio },
    { label: "Swarm Control", value: "/swarm-control", icon: Share2 },
    { label: "Drone Fleet", value: "/drone-fleet", icon: Plane },
    { label: "Payloads & Sensors", value: "/payloads-sensors", icon: Camera },
    { label: "Incidents & Alerts", value: "/incidents", requiredPermission: Permissions.VIEW_INCIDENTS, icon: AlertTriangle, badge: 3 },
    { label: "Data & Analytics", value: "/analytics", icon: BarChart3 },
    { label: "Reports", value: "/reports", icon: FileText },
    { label: "Logs", value: "/logs", requiredPermission: Permissions.VIEW_LOGS, img: Logs },
    { label: "Administration", value: "/admin", img: Settings },
]

const Sidebar = ({ collapsed = false, onToggle, mobileOpen = false, onCloseMobile }) => {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, role, hasPermission } = useAuth()
    const { isLive, isStale, connectionState } = useTelemetry()
    const roleMeta = ROLE_METADATA[role] || ROLE_METADATA[Roles.VIEWER]

    const isMissionsActive = location.pathname.startsWith("/missions")

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
            className={`flex flex-col h-full min-h-0 shrink-0 bg-[linear-gradient(180deg,#102A50_0%,#0B1F3D_100%)] text-white border-r border-[#203D64] transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] ${
                mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            } lg:static lg:translate-x-0 lg:z-auto ${
                collapsed ? "lg:w-[72px]" : "lg:w-[200px] xl:w-[220px]"
            }`}
        >
            <div
                className={`flex items-center shrink-0 bg-[#0B1F3D] h-14 xl:h-16 px-3 border-b border-[#203D64] ${
                    collapsed ? "lg:justify-center lg:px-2" : "justify-between"
                }`}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <AeroLogo className="w-7 h-7 text-[#35E0FF] shrink-0" size={28} />
                    <h1
                        className={`text-[17px] xl:text-[18px] text-[#FFFFFF] font-bold tracking-tight truncate ${
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
                    const checkActive = (isActive) =>
                        isActive ||
                        (tab.value === "/admin" &&
                            (location.pathname.startsWith("/admin") ||
                                location.pathname === "/settings" ||
                                location.pathname === "/users")) ||
                        (tab.value === "/mission-planning" &&
                            (location.pathname === "/mission-planning" ||
                                location.pathname === "/missions/planning" ||
                                location.pathname === "/plan")) ||
                        (tab.value === "/missions" &&
                            (location.pathname === "/missions" ||
                                location.pathname === "/missions/details" ||
                                location.pathname === "/mission")) ||
                        (tab.value === "/geofence" &&
                            (location.pathname === "/geofence" ||
                                location.pathname === "/missions/geofence")) ||
                        (tab.value === "/waypoint-planning" &&
                            (location.pathname === "/waypoint-planning" ||
                                location.pathname === "/missions/waypoints" ||
                                location.pathname === "/waypoints" ||
                                location.pathname === "/waypts")) ||
                        (tab.value === "/fly" &&
                            (location.pathname === "/fly" ||
                                location.pathname.startsWith("/fly/"))) ||
                        (tab.value === "/incidents" &&
                            (location.pathname === "/incidents" ||
                                location.pathname === "/alerts" ||
                                location.pathname.startsWith("/incidents/"))) ||
                        (tab.value === "/live-operations" &&
                            (location.pathname === "/live-operations" ||
                                location.pathname === "/live")) ||
                        (tab.value === "/remote-pilot" &&
                            location.pathname === "/remote-pilot") ||
                        (tab.value === "/swarm-control" &&
                            (location.pathname === "/swarm-control" ||
                                location.pathname === "/swarm")) ||
                        (tab.value === "/drone-fleet" &&
                            (location.pathname === "/drone-fleet" ||
                                location.pathname === "/fleet")) ||
                        (tab.value === "/payloads-sensors" &&
                            (location.pathname === "/payloads-sensors" ||
                                location.pathname === "/payloads" ||
                                location.pathname === "/sensors"))

                    return (
                        <NavLink
                            to={tab.value}
                            key={tab.value}
                            end={tab.value === "/" || tab.value === "/missions"}
                            title={collapsed ? tab.label : undefined}
                            onClick={onCloseMobile}
                            className={({ isActive }) => {
                                const isCurrentActive = checkActive(isActive)

                                return `relative flex items-center text-[13.5px] font-semibold mb-1 transition-all duration-150 rounded-lg ${
                                    collapsed
                                        ? `lg:justify-center lg:py-2.5 ${
                                              isCurrentActive
                                                  ? "bg-[#2477D4] text-white shadow-[0_5px_14px_rgba(0,0,0,0.18)]"
                                                  : "text-[#C1D0E4] hover:bg-[#FFFFFF12] hover:text-white"
                                          } py-2.5 pl-3 pr-2 gap-2.5`
                                        : `gap-3 py-2 pl-3 pr-2.5 ${
                                              isCurrentActive
                                                  ? "bg-[#2477D4] text-white shadow-[0_5px_14px_rgba(0,0,0,0.18)] border-l-[3px] border-[#8CC8FF]"
                                                  : "bg-inherit text-[#C1D0E4] hover:bg-[#FFFFFF12] hover:text-white border-[#8CC8FF]"
                                          }`
                                }`
                            }}
                        >
                            {({ isActive }) => {
                                const isCurrentActive = checkActive(isActive)

                                return (
                                    <>
                                        {tab.icon ? (
                                            <tab.icon
                                                className={`w-5 h-5 shrink-0 transition-colors ${
                                                    isCurrentActive ? "text-[#35E0FF]" : "text-[#8E9EAA]"
                                                }`}
                                            />
                                        ) : (
                                            <img src={tab.img} className="w-5 h-5 shrink-0" alt={tab.label} />
                                        )}
                                        <span className={`truncate ${collapsed ? "lg:hidden block" : "block"}`}>
                                            {tab.label}
                                        </span>
                                        {tab.badge && !collapsed && (
                                            <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-[#DC2626] rounded-full">
                                                {tab.badge}
                                            </span>
                                        )}
                                    </>
                                )
                            }}
                        </NavLink>
                    )
                })}
            </nav>

            {!collapsed && (
                <div className="shrink-0 px-2 pb-1.5">
                    <div className="flex flex-col w-full bg-[#FFFFFF0A] px-3 py-1.5 gap-0.5 rounded-[5px] border border-[#FFFFFF12]">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${isLive ? "bg-[#57D99A] shadow-[0_0_8px_#57D99A]" : isStale ? "bg-[#F4B544]" : "bg-[#91A5BF]"}`} />
                            <h1 className={`text-[11.5px] font-semibold leading-tight ${isLive ? "text-[#8DE9B7]" : isStale ? "text-[#FFD47F]" : "text-[#C1D0E4]"}`}>
                                {isLive ? "Live telemetry" : isStale ? "Telemetry stale" : connectionState === ConnectionState.AUTHENTICATED ? "Link online, awaiting data" : connectionState === ConnectionState.CONNECTING ? "Connecting to aircraft" : "Telemetry offline"}
                            </h1>
                        </div>
                        <p className="text-[10px] text-[#FFFFFF99] font-medium leading-tight font-mono">
                            Command workspace
                        </p>
                    </div>
                </div>
            )}

            {/* IMMERSIVE AERIAL DRONE LANDSCAPE VISUAL SECTION */}
            {!collapsed && (
                <div className="relative shrink-0 w-full overflow-hidden select-none mt-auto">
                    <div className="relative w-full h-[180px] xl:h-[210px]">
                        {/* Aerial Drone Landscape Photography */}
                        <img
                            src={droneLandscapeImg}
                            alt="AeroNexus Drone Operations"
                            className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-700 ease-out hover:scale-110"
                            loading="lazy"
                        />

                        {/* Top Gradient: Seamlessly dissolves solid navy sidebar into the photo */}
                        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0B1F3D] via-[#0B1F3D]/80 to-transparent pointer-events-none" />

                        {/* Atmospheric Deep Navy Tint */}
                        <div className="absolute inset-0 bg-[#0B1F3D]/20 pointer-events-none" />

                        {/* Bottom Gradient: Deep shadow behind text for guaranteed contrast */}
                        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#06101F]/95 via-[#06101F]/60 to-transparent pointer-events-none" />

                        {/* Brand Aviation Motto Statement */}
                        <div className="absolute inset-x-0 bottom-0 p-3.5 pb-3 flex flex-col justify-end z-10">
                            <p className="text-[14px] xl:text-[15px] font-extrabold italic tracking-tight text-white leading-[1.25] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                                Plan Today.
                            </p>
                            <p className="text-[14px] xl:text-[15px] font-extrabold italic tracking-tight text-[#8CC8FF] leading-[1.25] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                                Fly Smarter.
                            </p>
                            <p className="text-[14px] xl:text-[15px] font-extrabold italic tracking-tight text-white leading-[1.25] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                                Operate Safer.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Authenticated User / Role Strip in Sidebar Footer */}
            <div
                className={`flex shrink-0 items-center bg-[#0B1F3D] gap-2 border-t border-[#203D64] ${
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                }`}
            >
                <div className="flex justify-center items-center w-9 h-9 shrink-0 rounded-full bg-[#2477D4] text-[12px] font-bold text-white font-mono shadow-sm">
                    {initials}
                </div>
                {!collapsed && (
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[13px] font-bold truncate text-white leading-tight">
                            {displayName}
                        </h1>
                        <p className={`text-[11px] font-mono font-bold truncate ${roleMeta.badgeColor.split(" ")[0]}`}>
                            {roleMeta.shortLabel}
                        </p>
                    </div>
                )}
            </div>
        </aside>
    )
}

export default Sidebar
