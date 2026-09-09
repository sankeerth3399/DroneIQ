import Notification from "@/assets/images/notification.svg"
import ProfileDetails from "@/components/profile/profileDetails.jsx"
import { useTelemetry } from "@/context/TelemetryContext.jsx"
import { ConnectionState } from "@/services/telemetry/telemetryTypes.js"

const Header = () => {
    const { telemetry, selectedDroneId, connectionState, isLive } = useTelemetry()

    // Determine link display text and color based on connection state
    const getLinkDisplay = () => {
        if (isLive || connectionState === ConnectionState.AUTHENTICATED) {
            return { text: "Online _ Live", color: "text-[#2FE089]" }
        }
        if (connectionState === ConnectionState.CONNECTING) {
            return { text: "Connecting...", color: "text-[#35E0FF]" }
        }
        if (connectionState === ConnectionState.STALE) {
            return { text: "Stale Telemetry", color: "text-[#F59E0B]" }
        }
        if (connectionState === ConnectionState.BACKEND_UNAVAILABLE) {
            return { text: "Backend Offline", color: "text-[#FF8585]" }
        }
        return { text: "Standby", color: "text-[#8E9EAA]" }
    }

    const linkInfo = getLinkDisplay()
    const battery = typeof telemetry.batteryPercentage === "number" ? Math.round(telemetry.batteryPercentage) : 84
    const isArmed = Boolean(telemetry.armed)
    const flightMode = telemetry.flightMode || "AUTO"
    const satellites = telemetry.gpsSatellites || 16

    return (
        <div className="flex items-center justify-between select-none">
            <div className="flex items-center shrink-0">
                <div className="flex flex-start hidden md:flex items-center gap-6">
                    {/* ARMED / DISARMED STATUS BADGE */}
                    <div className={`inline-flex items-center gap-2 rounded-[4px] px-[12px] py-[6px] border ${
                        isArmed
                            ? "bg-[#5C1F1F] border-[#7A2B2B]"
                            : "bg-[#1B2836] border-[#2A3E52]"
                    }`}>
                        <div className={`w-[6px] h-[6px] rounded-full ${
                            isArmed
                                ? "bg-[#FF4141] shadow-[0px_0px_5px_0px_#FF4141]"
                                : "bg-[#8E9EAA]"
                        }`} />
                        <p className={`text-[11px] font-semibold ${isArmed ? "text-[#FFB3B3]" : "text-[#8E9EAA]"}`}>
                            {isArmed ? "ARMED" : "DISARMED"}
                        </p>
                    </div>

                    {/* FLIGHT MODE BADGE */}
                    <div className="inline-flex items-center gap-2 bg-[#1A5A68] border border-[#215D6B] rounded-[4px] px-[12px] py-[6px]">
                        <div className="w-[6px] h-[6px] rounded-full bg-[#35E0FF] shadow-[0px_0px_5px_0px_#35E0FF]" />
                        <p className="text-[11px] text-[#B7F3FF] font-semibold uppercase">{flightMode}</p>
                    </div>

                    {/* WEBSOCKET / TELEMETRY LINK */}
                    <div className="flex flex-col">
                        <h4 className="text-[10px] text-[#5D707C] font-medium leading-tight">
                            LINK
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className={`text-[13px] font-semibold leading-none ${linkInfo.color}`}>
                                {linkInfo.text}
                            </span>
                        </div>
                    </div>

                    {/* BATTERY PERCENTAGE */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="flex items-center shrink-0">
                            <div className="w-[22px] h-[11px] sm:w-[26px] sm:h-[13px] border-[2px] border-[#9AACB8] rounded-[2px]">
                                <div
                                    className={`h-full rounded-[1px] transition-all ${
                                        battery > 30 ? "bg-[#2FE089]" : battery > 15 ? "bg-[#F59E0B]" : "bg-[#FF4141]"
                                    }`}
                                    style={{
                                        width: `${Math.min(100, Math.max(0, battery))}%`
                                    }}
                                />
                            </div>

                            <div className="w-[3px] h-[5px] rounded-r-[1px] bg-[#9AACB8] ml-[1px]" />
                        </div>

                        <p className="m-0 text-[12px] sm:text-[14px] text-[#EEF4F8] font-semibold whitespace-nowrap">
                            {battery}%
                        </p>
                    </div>

                    {/* GPS SATELLITES & FIX */}
                    <div>
                        <p className="text-[13px] text-[#EEF4F8] font-semibold font-mono">
                            GPS 3D Fix ({satellites})
                        </p>
                    </div>

                    {/* SIGNAL STRENGTH BARS */}
                    <div className="flex items-end gap-[2px]">
                        {[4, 7, 10, 13].map((height, index) => {
                            const active = satellites >= (index + 1) * 4
                            return (
                                <div
                                    key={height}
                                    className={`w-[3px] rounded-[1px] ${
                                        active ? "bg-[#35E0FF]" : "bg-[#2C3C47]"
                                    }`}
                                    style={{ height: `${height}px` }}
                                />
                            )
                        })}
                    </div>

                    {/* SELECTED DRONE BADGE */}
                    <div>
                        <p className="text-[13px] text-[#35E0FF] font-semibold font-mono">
                            {selectedDroneId}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 xl:gap-4">
                <button
                    type="button"
                    className="flex justify-center items-center w-9 h-9 xl:w-[34px] xl:h-[34px] bg-[#171F27] rounded-[8px] hover:bg-[#202B36] transition"
                    title="Notifications"
                >
                    <img src={Notification} alt="notification" className="w-5 h-5" />
                </button>
                <ProfileDetails />
            </div>
        </div>
    )
}

export default Header
