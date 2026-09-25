import { useEffect, useState, useMemo } from "react"
import {
  X,
  Target,
  ExternalLink,
  Clock,
  User,
  Plane,
  Shield,
  MapPin,
  FileCode,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Play,
  Upload,
  Info,
} from "lucide-react"
import { logService, formatLogDate, formatLogTime } from "@/services/api/logService.js"

export const MissionLogDetailDrawer = ({
  log,
  isOpen,
  onClose,
  onViewFlight,
}) => {
  const [copied, setCopied] = useState(false)

  // Compute timeline whenever log changes
  const timeline = useMemo(() => {
    return log?.missionId ? logService.getMissionTimeline(log.missionId) : []
  }, [log])

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !log) return null

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getEventIcon = (event = "") => {
    const ev = event.toUpperCase()
    if (ev.includes("COMPLETED")) return <CheckCircle2 className="w-3.5 h-3.5 text-[#2FE089]" />
    if (ev.includes("ABORTED") || ev.includes("FAILED")) return <AlertTriangle className="w-3.5 h-3.5 text-[#FF4141]" />
    if (ev.includes("STARTED")) return <Play className="w-3.5 h-3.5 text-[#38BDF8]" />
    if (ev.includes("WAYPOINT")) return <MapPin className="w-3.5 h-3.5 text-[#35E0FF]" />
    if (ev.includes("GEOFENCE")) return <Shield className="w-3.5 h-3.5 text-[#F59E0B]" />
    if (ev.includes("UPLOADED")) return <Upload className="w-3.5 h-3.5 text-[#A855F7]" />
    return <Info className="w-3.5 h-3.5 text-[#94A3B8]" />
  }

  // Waypoints extraction
  const waypoints = log.waypoints || (log.waypoint ? [log.waypoint] : [])
  const geofence = log.geofence

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-mono select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-over Content Container */}
      <div className="relative w-full max-w-xl bg-[#090D14] border-l border-[#1A2633] text-[#EEF4F8] shadow-2xl flex flex-col h-full z-10 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1A2633] flex items-center justify-between bg-[#0C121C]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#35E0FF1A] border border-[#35E0FF33] text-[#35E0FF] shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white truncate">
                  {log.missionName || log.projectName}
                </h2>
                <span className="text-[10px] text-[#35E0FF] bg-[#35E0FF1A] px-1.5 py-0.5 rounded border border-[#35E0FF33]">
                  {log.missionId}
                </span>
              </div>
              <p className="text-[11px] text-[#8E9EAA] truncate mt-0.5">
                Audit Record • {log.event}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141F2C] text-[#8E9EAA] hover:text-white hover:bg-[#1E2E42] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 scrollbar-thin">
          {/* Section 1: Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#06090E] p-3.5 rounded-xl border border-[#16212E] text-xs">
            <div>
              <span className="text-[10px] text-[#64748B] block">STATUS</span>
              <span className="font-bold text-[#35E0FF]">{log.status}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#64748B] block">FLIGHT MODE</span>
              <span className="font-bold text-[#A855F7]">{log.flightMode || "GUIDED"}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#64748B] block">DRONE</span>
              <span className="font-bold text-white flex items-center gap-1">
                <Plane className="w-3 h-3 text-[#35E0FF]" />
                {log.droneId}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#64748B] block">OPERATOR</span>
              <span className="font-bold text-[#CBD5E1] truncate block flex items-center gap-1">
                <User className="w-3 h-3 text-[#38BDF8]" />
                {log.operator}
              </span>
            </div>
          </div>

          {/* Bidirectional Link to Flight Log */}
          {log.flightId && (
            <div className="p-3 rounded-xl bg-[#0D1E1E] border border-[#2FE08933] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full bg-[#2FE089] animate-ping shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    Sortie Telemetry Linked: {log.flightId}
                  </div>
                  <div className="text-[10px] text-[#8E9EAA]">
                    MAVLink flight trajectory and binary logs recorded
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onViewFlight?.(log.flightId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2FE0891F] text-[#2FE089] border border-[#2FE08940] hover:bg-[#2FE089] hover:text-[#06090E] transition text-xs font-semibold shrink-0 cursor-pointer"
              >
                <span>View Flight</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Section 2: Milestone Details */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#8E9EAA] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#35E0FF]" />
              Event Description & Parameters
            </h3>
            <div className="p-3.5 rounded-xl bg-[#06090E] border border-[#16212E] space-y-2 text-xs">
              <p className="text-[#EEF4F8] leading-relaxed">{log.details}</p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#141E2B] text-[11px]">
                <div>
                  <span className="text-[#64748B]">Timestamp:</span>{" "}
                  <span className="text-white">
                    {formatLogDate(log.timestamp)} {formatLogTime(log.timestamp)}
                  </span>
                </div>
                {log.missionResult && (
                  <div>
                    <span className="text-[#64748B]">Result:</span>{" "}
                    <span className="text-[#2FE089] font-medium">{log.missionResult}</span>
                  </div>
                )}
                {log.duration && log.duration !== "--" && (
                  <div>
                    <span className="text-[#64748B]">Duration:</span>{" "}
                    <span className="text-white">{log.duration}</span>
                  </div>
                )}
                {log.distance && log.distance !== "--" && (
                  <div>
                    <span className="text-[#64748B]">Distance:</span>{" "}
                    <span className="text-white">{log.distance}</span>
                  </div>
                )}
                {log.batteryUsed && (
                  <div>
                    <span className="text-[#64748B]">Battery Expended:</span>{" "}
                    <span className="text-[#F59E0B] font-bold">{log.batteryUsed}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Chronological Mission Timeline */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-[#8E9EAA] uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#35E0FF]" />
              Chronological Mission Lifecycle ({timeline.length} Milestones)
            </h3>

            <div className="p-3.5 rounded-xl bg-[#06090E] border border-[#16212E]">
              {timeline.length === 0 ? (
                <div className="text-xs text-[#64748B] py-2">No previous events logged for this mission.</div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#1A2633]">
                  {timeline.map((item) => {
                    const isSelected = item.id === log.id
                    return (
                      <div key={item.id} className="relative group">
                        {/* Dot indicator */}
                        <div
                          className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-[#0B1017] ${
                            isSelected
                              ? "border-[#35E0FF] bg-[#35E0FF33] shadow-[0_0_8px_#35E0FF]"
                              : "border-[#1E293B]"
                          }`}
                        >
                          {getEventIcon(item.event)}
                        </div>

                        {/* Event details */}
                        <div
                          className={`p-2 rounded-lg border transition ${
                            isSelected
                              ? "bg-[#35E0FF0F] border-[#35E0FF4D]"
                              : "bg-[#090D14] border-[#141F2C] hover:border-[#1E2E42]"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-white flex items-center gap-1">
                              {item.event}
                            </span>
                            <span className="text-[#64748B] font-mono">
                              {formatLogTime(item.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8E9EAA] mt-1 leading-normal line-clamp-2">
                            {item.details}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Waypoints Breakdown (if present) */}
          {waypoints.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#8E9EAA] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#35E0FF]" />
                Waypoint Sequence ({waypoints.length} Total)
              </h3>
              <div className="rounded-xl border border-[#16212E] bg-[#06090E] overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#0A0E16] text-[#64748B] border-b border-[#16212E] text-[10px] uppercase">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Coordinates</th>
                      <th className="p-2">Alt</th>
                      <th className="p-2">Hold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141F2C] text-[#CBD5E1]">
                    {waypoints.map((wp, idx) => (
                      <tr key={idx} className="hover:bg-[#0B1017]">
                        <td className="p-2 font-bold text-[#35E0FF]">WP {wp.seq || idx + 1}</td>
                        <td className="p-2 font-mono text-[10px] text-[#94A3B8]">
                          {wp.lat ? `${Number(wp.lat).toFixed(5)}, ${Number(wp.lng).toFixed(5)}` : "Position Staged"}
                        </td>
                        <td className="p-2 text-white">{wp.alt ? `${wp.alt}m` : "50m"}</td>
                        <td className="p-2 text-[#8E9EAA]">{wp.holdTime ? `${wp.holdTime}s` : "0s"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Geofence Details (if present) */}
          {geofence && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#8E9EAA] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#F59E0B]" />
                Geofence Containment Boundary
              </h3>
              <div className="p-3 rounded-xl bg-[#06090E] border border-[#16212E] grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[#64748B] block">TYPE</span>
                  <span className="text-white font-bold capitalize">{geofence.type || "Polygon"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] block">VERTICES</span>
                  <span className="text-[#35E0FF] font-bold">
                    {geofence.polygon?.length || 4} Boundary Points
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] block">AREA</span>
                  <span className="text-[#2FE089] font-bold">
                    {Math.round((geofence.areaM2 || 579000) / 10000)} ha
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Raw Event JSON Inspector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#8E9EAA] uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-[#64748B]" />
                Raw Event Payload
              </h3>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 text-[10px] text-[#35E0FF] hover:underline cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-[#2FE089]" />
                    <span className="text-[#2FE089]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#05080E] border border-[#16212E] text-[10px] text-[#A6ACCD] overflow-x-auto max-h-48 leading-relaxed">
              {JSON.stringify(log, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1A2633] bg-[#0C121C] flex items-center justify-between">
          <span className="text-[11px] text-[#64748B]">Log Record ID: {log.id}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#16212E] text-[#CBD5E1] hover:text-white hover:bg-[#223246] transition text-xs font-semibold cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  )
}

export default MissionLogDetailDrawer
