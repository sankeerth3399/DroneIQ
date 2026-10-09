import { Menu, Bell } from "lucide-react"
import ProfileDetails from "@/components/profile/profileDetails.jsx"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { useAuth } from "@/hooks/useAuth.js"
import { useNotification } from "@/hooks/useNotification.js"
import { ConnectionState, DEFAULT_FLIGHT_MODE } from "@/services/telemetry/telemetryTypes.js"
import { ROLE_METADATA, Roles } from "@/auth/roleConfig.js"
import { Permissions } from "@/auth/permissions.js"
import ArmStatusButton from "./ArmStatusButton.jsx"
import EmergencyOverrideDeck from "@/features/fly/components/EmergencyOverrideDeck.jsx"
import GlobalInfoButton from "@/components/info/GlobalInfoButton.jsx"
import NotificationCenterModal from "@/components/notification/NotificationCenterModal.jsx"
import { useLocation } from "react-router-dom"
import AeroLogo from "@/components/AeroLogo.jsx"

const Header = ({ onToggleMobile, mobileOpen, sidebarCollapsed }) => {
    const location = useLocation()
    const { telemetry, flightMode: contextFlightMode, selectedDroneId, connectionState, isLive } = useTelemetry()
    const { role, hasPermission } = useAuth()
    const { unreadCount, isHistoryOpen, setIsHistoryOpen } = useNotification()
    const roleMeta = ROLE_METADATA[role] || ROLE_METADATA[Roles.VIEWER]
    const canOverrideFlight = typeof hasPermission === "function" ? hasPermission(Permissions.OVERRIDE_FLIGHT_COMMANDS) : false
    const canExecuteFlight = typeof hasPermission === "function" ? hasPermission(Permissions.EXECUTE_FLIGHT_COMMANDS) : false

    // Determine link display text and color based on connection state
    const getLinkDisplay = () => {
        if (connectionState === ConnectionState.STALE) {
            return { text: "Stale", color: "text-[#F59E0B]" }
        }
        if (isLive || connectionState === ConnectionState.AUTHENTICATED) {
            return { text: "Online", color: "text-[#2FE089]" }
        }
        if (connectionState === ConnectionState.CONNECTING) {
            return { text: "Connecting", color: "text-[#35E0FF]" }
        }
        if (connectionState === ConnectionState.BACKEND_UNAVAILABLE || connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.AUTH_FAILURE) {
            return { text: "Offline", color: "text-[#FF8585]" }
        }
        return { text: "Standby", color: "text-[#8E9EAA]" }
    }

    const linkInfo = getLinkDisplay()
    const battery = typeof telemetry.batteryPercentage === "number" ? Math.round(telemetry.batteryPercentage) : null
    const flightMode = contextFlightMode || DEFAULT_FLIGHT_MODE
    const satellites = typeof telemetry.gpsSatellites === "number" && telemetry.gpsSatellites > 0 ? telemetry.gpsSatellites : null

    return (
        <div className="flex items-center justify-between select-none gap-2">
            {/* LEFT: Mobile Menu Button + Adaptive Telemetry Cluster */}
            <div className="flex items-center min-w-0 gap-2 sm:gap-3 lg:gap-5">
                {/* Mobile Drawer Hamburger Button */}
                <button
                    type="button"
                    onClick={onToggleMobile}
                    className="flex lg:hidden items-center justify-center w-8 h-8 shrink-0 rounded-[6px] bg-[#121A24] border border-[#1E2E3E] text-[#35E0FF] hover:bg-[#1A2634] transition"
                    aria-label="Toggle navigation drawer"
                    aria-expanded={mobileOpen}
                >
                    <Menu className="w-4 h-4" />
                </button>

                {sidebarCollapsed && (
                    <div className="flex shrink-0 items-center gap-1.5 text-white" aria-label="AeroNexus">
                        <AeroLogo className="h-6 w-6 text-[#8CC8FF]" size={24} />
                        <span className="hidden text-[15px] font-bold sm:inline tracking-tight">AeroNexus</span>
                    </div>
                )}

                {/* ADAPTIVE TELEMETRY STRIP */}
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-5 min-w-0 overflow-hidden">
                    {/* ARMED / UNARMED INTERACTIVE STATUS BUTTON */}
                    <ArmStatusButton />

                    {/* FLIGHT MODE BADGE */}
                    <div className="inline-flex items-center gap-1.5 bg-[#193D63] border border-[#345A82] rounded-md px-2.5 sm:px-3 py-1.5 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-[#35E0FF] shadow-[0px_0px_5px_0px_#35E0FF] shrink-0" />
                        <p className="text-xs sm:text-[12px] text-[#B7F3FF] font-bold uppercase tracking-wider whitespace-nowrap">{flightMode}</p>
                    </div>

                    {/* BATTERY PERCENTAGE */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" title={battery === null ? "Battery unavailable" : `Battery: ${battery}%`}>
                        <div className="flex items-center shrink-0">
                            {battery !== null && <div className="w-[20px] h-[10px] sm:w-[24px] sm:h-[12px] border-[1.5px] border-[#C1D0E4] rounded-[2px] p-[1px]">
                                <div
                                    className={`h-full rounded-[1px] transition-all ${
                                        battery > 30 ? "bg-[#2FE089]" : battery > 15 ? "bg-[#F59E0B]" : "bg-[#FF4141]"
                                    }`}
                                    style={{
                                        width: `${Math.min(100, Math.max(0, battery))}%`
                                    }}
                                />
                            </div>}
                            {battery !== null && <div className="w-[2.5px] h-[4.5px] rounded-r-[1px] bg-[#C1D0E4] ml-[0.5px]" />}
                        </div>
                        <span className="text-xs sm:text-[13px] text-[#EEF4F8] font-bold whitespace-nowrap font-mono">
                            {battery === null ? "—" : `${battery}%`}
                        </span>
                    </div>

                    {/* WEBSOCKET / TELEMETRY LINK (Hidden on mobile < sm, visible on sm+) */}
                    <div className="hidden sm:flex flex-col shrink-0">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-current shrink-0" />
                            <span className={`text-xs sm:text-[13px] font-bold leading-none ${linkInfo.color}`}>
                                {linkInfo.text}
                            </span>
                        </div>
                    </div>

                    {/* GPS SATELLITES & FIX (Tablet & Desktop) */}
                    {satellites !== null && <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        <p className="text-xs sm:text-[13px] text-[#EEF4F8] font-bold font-mono whitespace-nowrap">
                            GPS 3D Fix ({satellites})
                        </p>
                        {/* SIGNAL STRENGTH BARS */}
                        <div className="flex items-end gap-[2px]">
                            {[4, 7, 10, 13].map((height, index) => {
                                const active = satellites >= (index + 1) * 4
                                return (
                                    <div
                                        key={height}
                                        className={`w-[2.5px] rounded-[1px] ${
                                            active ? "bg-[#35E0FF]" : "bg-[#2C3C47]"
                                        }`}
                                        style={{ height: `${height}px` }}
                                    />
                                )
                            })}
                        </div>
                    </div>}

                    {/* SELECTED DRONE BADGE (Large screens) */}
                    <div className="hidden xl:block shrink-0">
                        <p className="text-xs sm:text-[13px] text-[#35E0FF] font-bold font-mono">
                            {selectedDroneId}
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT: Emergency Override Deck, Active Role Badge, Notifications & Profile Details */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                {/* EMERGENCY FLIGHT OVERRIDE DECK (Super Admin, Fleet Manager & Flight Operator) */}
                {(canOverrideFlight || canExecuteFlight) && <EmergencyOverrideDeck />}

                {/* GLOBAL BACKEND INFO CONSOLE BUTTON (Permanent across all authenticated pages) */}
                <GlobalInfoButton />

                {/* COMPACT ACTIVE ROLE BADGE (AeroNexus Aerospace Design) */}
                <div
                    className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs sm:text-[12px] font-mono font-bold shrink-0 select-none shadow-sm ${roleMeta.badgeColor}`}
                    title={`Current Role: ${roleMeta.label} — ${roleMeta.description}`}
                >
                    <div className={`w-2 h-2 rounded-full ${roleMeta.indicatorColor}`} />
                    <span>{roleMeta.shortLabel}</span>
                </div>

                <div className="relative shrink-0">
                    <button
                        id="notification-bell-btn"
                        type="button"
                        onClick={() => setIsHistoryOpen((prev) => !prev)}
                        className="relative flex justify-center items-center w-9 h-9 sm:w-10 sm:h-10 bg-[#171F27] border border-[#223240] rounded-lg hover:bg-[#202B36] transition shrink-0 cursor-pointer"
                        title="Alerts & Notifications"
                        aria-label="Toggle Notification Center"
                        aria-expanded={isHistoryOpen}
                    >
                        <Bell className="w-4.5 h-4.5 text-[#A0B0C0] hover:text-[#35E0FF] transition" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-mono font-bold text-white shadow-[0_0_8px_#EF4444] animate-pulse">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </button>
                    <NotificationCenterModal />
                </div>
                <ProfileDetails />
            </div>
        </div>
    )
}

export default Header
