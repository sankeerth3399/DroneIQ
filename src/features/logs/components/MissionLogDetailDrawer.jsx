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
  Layers,
  Activity,
  Radio,
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
    if (ev.includes("COMPLETED")) return <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
    if (ev.includes("ABORTED") || ev.includes("FAILED")) return <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
    if (ev.includes("STARTED")) return <Play className="w-4 h-4 text-[#1E64D4]" />
    if (ev.includes("WAYPOINT")) return <MapPin className="w-4 h-4 text-[#0284C7]" />
    if (ev.includes("GEOFENCE")) return <Shield className="w-4 h-4 text-[#B45309]" />
    return <Info className="w-4 h-4 text-[#64748B]" />
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#091E36]/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white border-l border-[#D5E1ED] shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E2E8F0] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E64D4] flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0D233A]">
                  Audit Record · {log.id}
                </h2>
                <span className="text-xs text-[#64748B] block mt-0.5">
                  {formatLogDate(log.timestamp)} at {formatLogTime(log.timestamp)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CAD8E6] bg-white text-xs font-semibold text-[#18314C] hover:bg-[#F8FAFC] transition shadow-2xs cursor-pointer"
              title="Copy complete JSON record"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "JSON"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0D233A] hover:bg-[#F1F5F9] transition"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Overview Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Event / Milestone</span>
              <span className="text-sm font-bold text-[#0D233A] mt-0.5 block">{log.event || log.type}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Severity / Status</span>
              <span className="inline-block px-2.5 py-0.5 rounded-md font-bold text-xs bg-[#EFF6FF] text-[#1E64D4] border border-[#BFDBFE] mt-1">
                {log.status || log.severity || "Ready"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Target Aircraft</span>
              <span className="text-sm font-mono font-bold text-[#0D233A] mt-0.5 block">{log.droneId || "DRONE-001"}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Operator / Source</span>
              <span className="text-sm font-semibold text-[#0E2646] mt-0.5 block">{log.operator || "System Daemon"}</span>
            </div>
          </div>

          {/* Full Message / Details */}
          <div>
            <h3 className="text-xs font-bold text-[#18314C] uppercase tracking-wider mb-2">
              Log Details & Audit Context
            </h3>
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs sm:text-sm text-[#334155] leading-relaxed">
              {log.details || log.description || "No extended details provided."}
            </div>
          </div>

          {/* Mission & Flight Association */}
          {(log.missionId || log.flightId) && (
            <div>
              <h3 className="text-xs font-bold text-[#18314C] uppercase tracking-wider mb-2">
                Operational Associations
              </h3>
              <div className="p-4 rounded-xl bg-white border border-[#CAD8E6] flex flex-col gap-2.5 shadow-2xs">
                {log.missionId && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B] font-medium">Mission Project:</span>
                    <span className="font-bold text-[#0D233A]">
                      {log.missionName || log.missionId} ({log.missionId})
                    </span>
                  </div>
                )}
                {log.flightId && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#F1F5F9]">
                    <span className="text-[#64748B] font-medium">Recorded Flight Sortie:</span>
                    <button
                      type="button"
                      onClick={() => onViewFlight?.(log.flightId)}
                      className="font-bold text-[#15803D] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{log.flightId}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mission Event Timeline (if mission logs available) */}
          {timeline.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[#18314C] uppercase tracking-wider mb-3">
                Mission Lifecycle Timeline
              </h3>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8F0]">
                {timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border border-[#CBD5E1] flex items-center justify-center">
                      {getEventIcon(item.event)}
                    </span>
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#0D233A]">{item.event}</span>
                        <span className="font-mono text-[10px] text-[#64748B]">{formatLogTime(item.timestamp)}</span>
                      </div>
                      <p className="text-xs text-[#475569] mt-1 leading-snug">{item.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs text-[#64748B]">
          <span>Security Class: C-4 Autonomous Flight Audit</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[#CAD8E6] text-[#0D233A] hover:bg-[#F1F5F9] font-bold transition cursor-pointer"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  )
}

export default MissionLogDetailDrawer
