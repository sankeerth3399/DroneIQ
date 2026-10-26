import { useState, useMemo } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import {
    X,
    ChevronLeft,
    ChevronRight,
    Compass,
    Activity,
    Radio,
    Share2,
    Plane,
    Camera,
    Shield,
    AlertTriangle,
    BarChart3,
    FileText,
} from "lucide-react"
import Settings from "../assets/images/settings.svg"
import Target from "../assets/images/target.svg"
import Dashboard from "@/assets/images/dashboard.svg"
import AeroLogo from "@/components/AeroLogo.jsx"
import { useAuth } from "@/hooks/useAuth.js"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { Permissions } from "@/auth/permissions.js"
import { ROLE_METADATA, Roles } from "@/auth/roleConfig.js"

// Exact 13 Core Navigation Items in Preserved Operational Sequence
const ALL_TABS = [
    { label: "Command Center", value: "/dashboard", img: Dashboard },
    { label: "Mission Planning", value: "/mission-planning", icon: Compass },
    { label: "Missions", value: "/missions", requiredPermission: Permissions.VIEW_MISSIONS, img: Target },
    { label: "Live Operations", value: "/live-operations", icon: Activity },
    { label: "Remote Pilot", value: "/remote-pilot", icon: Radio },
    { label: "Swarm Control", value: "/swarm-control", icon: Share2 },
    { label: "Drone Fleet", value: "/drone-fleet", icon: Plane },
    { label: "Payloads & Sensors", value: "/payloads-sensors", icon: Camera },
    { label: "Geofencing & Airspace", value: "/geofencing-airspace", icon: Shield },
    { label: "Incidents & Alerts", value: "/incidents", requiredPermission: Permissions.VIEW_INCIDENTS, icon: AlertTriangle, badge: 3 },
    { label: "Data & Analytics", value: "/analytics", icon: BarChart3 },
    { label: "Reports", value: "/reports", icon: FileText },
    { label: "Administration", value: "/admin", img: Settings },
]

const Sidebar = ({ collapsed = false, onToggle, mobileOpen = false, onCloseMobile }) => {
    const location = useLocation()
    const { user, role, hasPermission } = useAuth()
    const { isLive, isStale } = useTelemetry()
    const roleMeta = ROLE_METADATA[role] || ROLE_METADATA[Roles.VIEWER]

    // Filter tabs dynamically based on user's active permissions
    const visibleTabs = useMemo(() => {
        return ALL_TABS.filter((tab) => {
            if (!tab.requiredPermission) return true
            return hasPermission(tab.requiredPermission)
        })
    }, [hasPermission])

    const displayName = user?.username || "Operator"
    const initials = displayName.slice(0, 2).toUpperCase()

    // Active route detector mapping all application paths to the 13 navigation destinations
    const checkActive = (tabValue, isActive) => {
        if (isActive) return true
        const path = location.pathname.toLowerCase()

        if (tabValue === "/dashboard") {
            return path === "/dashboard" || path === "/"
        }
        if (tabValue === "/mission-planning") {
            return (
                path === "/mission-planning" ||
                path === "/missions/planning" ||
                path === "/plan" ||
                path === "/geofence" ||
                path === "/missions/geofence" ||
                path === "/waypoint-planning" ||
                path === "/missions/waypoints" ||
                path === "/waypoints" ||
                path === "/waypts"
            )
        }
        if (tabValue === "/missions") {
            return path === "/missions" || path === "/missions/details" || path === "/mission"
        }
        if (tabValue === "/live-operations") {
            return path === "/live-operations" || path === "/live"
        }
        if (tabValue === "/remote-pilot") {
            return path === "/remote-pilot"
        }
        if (tabValue === "/swarm-control") {
            return path === "/swarm-control" || path === "/swarm"
        }
        if (tabValue === "/drone-fleet") {
            return path === "/drone-fleet" || path === "/fleet"
        }
        if (tabValue === "/payloads-sensors") {
            return path === "/payloads-sensors" || path === "/payloads" || path === "/sensors"
        }
        if (tabValue === "/geofencing-airspace") {
            return path === "/geofencing-airspace" || path === "/airspace"
        }
        if (tabValue === "/incidents") {
            return path === "/incidents" || path === "/alerts" || path.startsWith("/incidents/")
        }
        if (tabValue === "/analytics") {
            return path === "/analytics"
        }
        if (tabValue === "/reports") {
            return path === "/reports"
        }
        if (tabValue === "/admin") {
            return (
                path.startsWith("/admin") ||
                path === "/settings" ||
                path === "/users"
            )
        }
        return false
    }

    return (
        <aside
            className={`flex flex-col h-full min-h-0 shrink-0 bg-[linear-gradient(180deg,#102A50_0%,#0B1F3D_100%)] text-white border-r border-[#203D64] transition-all duration-200 ease-in-out fixed inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] ${
                mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            } lg:static lg:translate-x-0 lg:z-auto ${
                collapsed ? "lg:w-[68px]" : "lg:w-[210px] xl:w-[220px]"
            }`}
        >
            {/* Mobile Drawer Header (< lg): Shows AeroNexus Branding & Close Button */}
            <div className="flex lg:hidden items-center justify-between shrink-0 bg-[#0B1F3D] h-13 px-3.5 border-b border-[#203D64]">
                <div className="flex items-center gap-2.5 min-w-0">
                    <AeroLogo className="w-6 h-6 text-[#35E0FF] shrink-0" size={24} />
                    <span className="text-[16px] text-white font-bold tracking-tight">
                        AeroNexus
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onCloseMobile}
                    className="flex items-center justify-center w-8 h-8 rounded-md text-[#A0AEC0] hover:bg-white/10 hover:text-white transition cursor-pointer"
                    aria-label="Close sidebar"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Desktop Sidebar Compact Control Strip (>= lg) */}
            <div
                className={`hidden lg:flex items-center shrink-0 bg-[#0B1F3D]/80 h-9 border-b border-[#203D64]/60 select-none ${
                    collapsed ? "justify-center px-1" : "justify-between px-3"
                }`}
            >
                {!collapsed && (
                    <span className="text-[10px] font-bold tracking-wider uppercase text-[#6B8BAF]">
                        Navigation
                    </span>
                )}

                {onToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="flex items-center justify-center w-6 h-6 rounded-md text-[#A0AEC0] hover:bg-white/10 hover:text-white transition cursor-pointer"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? (
                            <ChevronRight className="w-4 h-4 text-[#35E0FF]" />
                        ) : (
                            <ChevronLeft className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Navigation List: Exactly 13 items with compact, perfectly fitting rows */}
            <nav
                className={`flex flex-col flex-1 min-h-0 px-2 py-1.5 ${
                    collapsed ? "overflow-y-auto lg:overflow-visible" : "overflow-y-auto overflow-x-hidden"
                }`}
            >
                {visibleTabs.map((tab) => {
                    return (
                        <NavLink
                            to={tab.value}
                            key={tab.value}
                            end={tab.value === "/" || tab.value === "/missions"}
                            title={collapsed ? tab.label : undefined}
                            onClick={onCloseMobile}
                            className={({ isActive }) => {
                                const isCurrentActive = checkActive(tab.value, isActive)

                                return `relative flex items-center transition-all duration-150 rounded-lg group select-none ${
                                    collapsed
                                        ? `lg:justify-center w-10 h-9 xl:h-10 mx-auto my-[2px] ${
                                              isCurrentActive
                                                  ? "bg-[#2477D4] text-white shadow-xs"
                                                  : "text-[#C1D0E4] hover:bg-white/10 hover:text-white"
                                          } py-2 pl-3 pr-2 gap-2.5`
                                        : `h-[34px] xl:h-[36px] my-[2px] px-2.5 gap-2.5 ${
                                              isCurrentActive
                                                  ? "bg-[#2477D4] text-white shadow-xs border-l-[3px] border-[#38BDF8]"
                                                  : "text-[#C1D0E4] hover:bg-white/10 hover:text-white"
                                          }`
                                }`
                            }}
                        >
                            {({ isActive }) => {
                                const isCurrentActive = checkActive(tab.value, isActive)

                                return (
                                    <>
                                        {/* Icon or SVG Image */}
                                        {tab.icon ? (
                                            <tab.icon
                                                className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                                                    isCurrentActive ? "text-[#35E0FF]" : "text-[#8E9EAA] group-hover:text-white"
                                                }`}
                                            />
                                        ) : (
                                            <img
                                                src={tab.img}
                                                className={`w-4.5 h-4.5 shrink-0 transition-opacity ${
                                                    isCurrentActive ? "opacity-100" : "opacity-75 group-hover:opacity-100"
                                                }`}
                                                alt={tab.label}
                                            />
                                        )}

                                        {/* Text Label (Hidden when collapsed on desktop, visible in mobile drawer & expanded desktop) */}
                                        <span
                                            className={`text-[13px] xl:text-[13.5px] font-semibold truncate leading-none ${
                                                collapsed ? "lg:hidden block" : "block"
                                            }`}
                                        >
                                            {tab.label}
                                        </span>

                                        {/* Uncollapsed Badge */}
                                        {tab.badge && !collapsed && (
                                            <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold text-white bg-[#DC2626] rounded-full shrink-0">
                                                {tab.badge}
                                            </span>
                                        )}

                                        {/* Collapsed Dot Badge on Icon */}
                                        {tab.badge && collapsed && (
                                            <span className="hidden lg:block absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-[#0B1F3D]" />
                                        )}

                                        {/* Collapsed Floating Tooltip on Desktop Hover */}
                                        {collapsed && (
                                            <div className="absolute left-[calc(100%+10px)] z-50 px-2.5 py-1.5 rounded-md bg-[#08182B] text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-[#203D64] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden lg:flex items-center gap-2">
                                                <span>{tab.label}</span>
                                                {tab.badge && (
                                                    <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[9.5px] font-bold text-white bg-[#DC2626] rounded-full">
                                                        {tab.badge}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )
                            }}
                        </NavLink>
                    )
                })}
            </nav>

            {/* Compact Live Telemetry Status Strip */}
            {!collapsed ? (
                <div className="shrink-0 px-2.5 py-1.5">
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs">
                        <div
                            className={`w-2 h-2 rounded-full shrink-0 ${
                                isLive ? "bg-[#57D99A] shadow-[0_0_8px_#57D99A]" : isStale ? "bg-[#F4B544]" : "bg-[#91A5BF]"
                            }`}
                        />
                        <span
                            className={`text-[11px] font-medium truncate ${
                                isLive ? "text-[#8DE9B7]" : isStale ? "text-[#FFD47F]" : "text-[#C1D0E4]"
                            }`}
                        >
                            {isLive ? "Live telemetry" : isStale ? "Telemetry stale" : "Telemetry standby"}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="shrink-0 py-1.5 flex justify-center" title={`Telemetry: ${isLive ? "Live" : "Standby"}`}>
                    <div
                        className={`w-2 h-2 rounded-full ${
                            isLive ? "bg-[#57D99A] shadow-[0_0_8px_#57D99A]" : isStale ? "bg-[#F4B544]" : "bg-[#91A5BF]"
                        }`}
                    />
                </div>
            )}

            {/* Authenticated User / Role Strip in Sidebar Footer */}
            <div
                className={`flex shrink-0 items-center bg-[#0B1F3D] border-t border-[#203D64] ${
                    collapsed ? "justify-center h-11 px-1" : "h-12 px-3 gap-2.5"
                }`}
            >
                <div
                    className="flex justify-center items-center w-7.5 h-7.5 shrink-0 rounded-full bg-[#2477D4] text-[11px] font-bold text-white font-mono shadow-xs"
                    title={collapsed ? `${displayName} (${roleMeta.shortLabel})` : undefined}
                >
                    {initials}
                </div>
                {!collapsed && (
                    <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-bold truncate text-white leading-tight">
                            {displayName}
                        </p>
                        <p className={`text-[10px] font-mono font-bold truncate ${roleMeta.badgeColor.split(" ")[0]}`}>
                            {roleMeta.shortLabel}
                        </p>
                    </div>
                )}
            </div>
        </aside>
    )
}

export default Sidebar

