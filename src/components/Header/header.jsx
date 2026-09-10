import { Menu } from "lucide-react"
import Notification from "@/assets/images/notification.svg"
import ProfileDetails from "@/components/profile/profileDetails.jsx"
import { useTelemetry } from "@/context/TelemetryContext.jsx"
import { ConnectionState } from "@/services/telemetry/telemetryTypes.js"

const Header = ({ onToggleMobile, mobileOpen }) => {
    const { telemetry, selectedDroneId, connectionState, isLive } = useTelemetry()

    // Determine link display text and color based on connection state
    const getLinkDisplay = () => {
        if (isLive || connectionState === ConnectionState.AUTHENTICATED) {
            return { text: "Online", color: "text-[#2FE089]" }
        }
        if (connectionState === ConnectionState.CONNECTING) {
            return { text: "Connecting", color: "text-[#35E0FF]" }
        }
        if (connectionState === ConnectionState.STALE) {
            return { text: "Stale", color: "text-[#F59E0B]" }
        }
        if (connectionState === ConnectionState.BACKEND_UNAVAILABLE) {
            return { text: "Offline", color: "text-[#FF8585]" }
        }
        return { text: "Standby", color: "text-[#8E9EAA]" }
    }

    const linkInfo = getLinkDisplay()
    const battery = typeof telemetry.batteryPercentage === "number" ? Math.round(telemetry.batteryPercentage) : 84
    const isArmed = Boolean(telemetry.armed)
    const flightMode = telemetry.flightMode || "AUTO"
    const satellites = telemetry.gpsSatellites || 16

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

                {/* ADAPTIVE TELEMETRY STRIP */}
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-5 min-w-0 overflow-hidden">
                    {/* ARMED / DISARMED STATUS BADGE */}
                    <div
                        className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 sm:px-2.5 py-1 border shrink-0 ${
                            isArmed
                                ? "bg-[#5C1F1F] border-[#7A2B2B]"
                                : "bg-[#1B2836] border-[#2A3E52]"
                        }`}
                        title={isArmed ? "Vehicle is ARMED" : "Vehicle is DISARMED"}
                    >
                        <div
                            className={`w-[6px] h-[6px] rounded-full shrink-0 ${
                                isArmed
                                    ? "bg-[#FF4141] shadow-[0px_0px_5px_0px_#FF4141]"
                                    : "bg-[#8E9EAA]"
                            }`}
                        />
                        <p className={`text-[10px] sm:text-[11px] font-semibold whitespace-nowrap ${isArmed ? "text-[#FFB3B3]" : "text-[#8E9EAA]"}`}>
                            {isArmed ? "ARMED" : "DISARMED"}
                        </p>
                    </div>

                    {/* FLIGHT MODE BADGE */}
                    <div className="inline-flex items-center gap-1.5 bg-[#1A5A68] border border-[#215D6B] rounded-[4px] px-2 sm:px-2.5 py-1 shrink-0">
                        <div className="w-[5px] h-[5px] rounded-full bg-[#35E0FF] shadow-[0px_0px_5px_0px_#35E0FF] shrink-0" />
                        <p className="text-[10px] sm:text-[11px] text-[#B7F3FF] font-semibold uppercase whitespace-nowrap">{flightMode}</p>
                    </div>

                    {/* BATTERY PERCENTAGE */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" title={`Battery: ${battery}%`}>
                        <div className="flex items-center shrink-0">
                            <div className="w-[20px] h-[10px] sm:w-[24px] sm:h-[12px] border-[1.5px] border-[#9AACB8] rounded-[2px] p-[1px]">
                                <div
                                    className={`h-full rounded-[1px] transition-all ${
                                        battery > 30 ? "bg-[#2FE089]" : battery > 15 ? "bg-[#F59E0B]" : "bg-[#FF4141]"
                                    }`}
                                    style={{
                                        width: `${Math.min(100, Math.max(0, battery))}%`
                                    }}
                                />
                            </div>
                            <div className="w-[2.5px] h-[4.5px] rounded-r-[1px] bg-[#9AACB8] ml-[0.5px]" />
                        </div>
                        <span className="text-[11px] sm:text-[13px] text-[#EEF4F8] font-semibold whitespace-nowrap font-mono">
                            {battery}%
                        </span>
                    </div>

                    {/* WEBSOCKET / TELEMETRY LINK (Hidden on tiny < 480px, compact on sm) */}
                    <div className="hidden xs:flex flex-col shrink-0">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                            <span className={`text-[11px] sm:text-[12px] font-semibold leading-none ${linkInfo.color}`}>
                                {linkInfo.text}
                            </span>
                        </div>
                    </div>

                    {/* GPS SATELLITES & FIX (Tablet & Desktop) */}
                    <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        <p className="text-[12px] text-[#EEF4F8] font-semibold font-mono whitespace-nowrap">
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
                    </div>

                    {/* SELECTED DRONE BADGE (Large screens) */}
                    <div className="hidden xl:block shrink-0">
                        <p className="text-[12px] text-[#35E0FF] font-semibold font-mono">
                            {selectedDroneId}
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT: Notifications & Profile Details */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                <button
                    type="button"
                    className="flex justify-center items-center w-8 h-8 sm:w-9 sm:h-9 bg-[#171F27] border border-[#223240] rounded-[8px] hover:bg-[#202B36] transition shrink-0"
                    title="Notifications"
                >
                    <img src={Notification} alt="notification" className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <ProfileDetails />
            </div>
        </div>
    )
}

export default Header
