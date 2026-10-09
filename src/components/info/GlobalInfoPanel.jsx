import { useState, useEffect, useRef, useMemo } from "react"
import { 
  Trash2, 
  X, 
  Search, 
  Copy, 
  Check, 
  ArrowDownToLine, 
  Terminal,
  Radio,
  Layers,
  ShieldAlert
} from "lucide-react"
import { useBackendInfo } from "@/hooks/useBackendInfo.js"

/**
 * Format timestamp into readable time string
 */
const formatEventTime = (timestamp) => {
  if (!timestamp) return ""
  try {
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return String(timestamp)
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    const seconds = String(d.getSeconds()).padStart(2, "0")
    const ms = String(d.getMilliseconds()).padStart(3, "0")
    return `${hours}:${minutes}:${seconds}.${ms}`
  } catch {
    return String(timestamp)
  }
}

/**
 * Get color styling for event type pill
 */
const getTypeBadgeStyle = (type = "") => {
  const upper = String(type).toUpperCase()
  if (upper.includes("ERROR") || upper.includes("FAIL") || upper.includes("DANGER") || upper.includes("AUTH_FAILURE")) {
    return "border-[#7F1D1D] bg-[#2A0E13] text-[#FCA5A5]"
  }
  if (upper.includes("WARN") || upper.includes("DISCONNECT") || upper.includes("STALE")) {
    return "border-[#78350F] bg-[#291807] text-[#FCD34D]"
  }
  if (upper.includes("SUCCESS") || upper.includes("ACK") || upper.includes("AUTH_SUCCESS") || upper.includes("ARMED")) {
    return "border-[#065F46] bg-[#062418] text-[#6EE7B7]"
  }
  if (upper.includes("COMMAND") || upper.includes("CMD") || upper.includes("EXECUTE") || upper.includes("TAKEOFF") || upper.includes("LAND")) {
    return "border-[#1E40AF] bg-[#0E1E38] text-[#93C5FD]"
  }
  if (upper.includes("TELEMETRY") || upper.includes("MAVLINK")) {
    return "border-[#0E7490] bg-[#08232C] text-[#67E8F9]"
  }
  return "border-[#1E3A52] bg-[#0B1A28] text-[#35E0FF]"
}

/**
 * Single backend event record row
 */
const BackendEventRow = ({ event }) => {
  const [copied, setCopied] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const handleCopy = () => {
    try {
      const textToCopy = typeof event.raw === "string" 
        ? event.raw 
        : JSON.stringify(event.raw || event, null, 2)
      navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard error
    }
  }

  const timeDisplay = formatEventTime(event.timestamp)

  return (
    <div className="group rounded-[5px] border border-[#162B3D] bg-[#08121CF0] hover:border-[#224562] p-2 transition text-xs">
      {/* Meta Bar */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#122332] text-[10.5px]">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span
            className="text-[#7A93A6] shrink-0 font-mono"
            title={event.hasBackendTimestamp ? `Backend timestamp: ${event.timestamp}` : `Receive time (fallback): ${event.timestamp}`}
          >
            [{event.hasBackendTimestamp ? "" : "Recv: "}{timeDisplay || event.timestamp}]
          </span>

          <span className={`px-1.5 py-0.2 rounded-[3px] border text-[9.5px] font-bold tracking-wider font-mono shrink-0 ${getTypeBadgeStyle(event.type)}`}>
            {event.type}
          </span>

          {event.severity && event.severity !== event.type && (
            <span className="px-1.5 py-0.2 rounded-[3px] bg-[#22150E] border border-[#522812] text-[#F97316] text-[9.5px] font-mono shrink-0">
              {event.severity}
            </span>
          )}

          {event.event && event.event !== event.type && (
            <span className="px-1.5 py-0.2 rounded-[3px] bg-[#0D2428] border border-[#19454E] text-[#2DD4BF] text-[9.5px] font-mono shrink-0">
              {event.event}
            </span>
          )}

          {event.droneId && (
            <span className="px-1.5 py-0.2 rounded-[3px] bg-[#0D2434] border border-[#174868] text-[#35E0FF] text-[9.5px] font-mono shrink-0">
              DRONE: {event.droneId}
            </span>
          )}

          {event.missionId && (
            <span className="px-1.5 py-0.2 rounded-[3px] bg-[#1F1735] border border-[#3E2D69] text-[#C084FC] text-[9.5px] font-mono shrink-0">
              MSN: {event.missionId}
            </span>
          )}

          {event.source && (
            <span className="text-[#5D778B] text-[9.5px] font-mono truncate hidden sm:inline" title={event.source}>
              src: {event.source}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#647C90] hover:text-[#35E0FF] hover:bg-[#122434] transition cursor-pointer"
          title="Copy raw backend payload to clipboard"
          aria-label="Copy event payload"
        >
          {copied ? <Check className="h-3 w-3 text-[#2FE089]" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>

      {/* Content Display */}
      <div className="pt-1.5">
        {event.message ? (
          <div className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[#D2E4F0]">
            {event.message}
          </div>
        ) : null}

        {/* If no human-readable message, render formatted JSON content directly */}
        {!event.message && !event.isPlainString && (
          <pre className="m-0 whitespace-pre-wrap break-all font-mono text-[10.5px] leading-relaxed text-[#B9D5E8] bg-[#04080E] p-2 rounded border border-[#101E2B] max-h-48 overflow-y-auto scrollbar-thin">
            {typeof event.content === "string" ? event.content : JSON.stringify(event.raw || event, null, 2)}
          </pre>
        )}

        {/* If message exists AND structured data/metadata or raw payload is present, provide expandable details */}
        {event.message && (event.data || event.metadata || (!event.isPlainString && typeof event.raw === "object")) && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setShowRaw((prev) => !prev)}
              className="text-[10px] text-[#35E0FF] hover:underline cursor-pointer flex items-center gap-1 font-mono select-none"
            >
              <span>{showRaw ? "▾ Hide payload details" : "▸ View payload details"}</span>
            </button>
            {showRaw && (
              <pre className="mt-1 m-0 whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-[#A5C3D8] bg-[#04080E] p-2 rounded border border-[#101E2B] max-h-44 overflow-y-auto scrollbar-thin">
                {JSON.stringify(event.raw || { data: event.data, metadata: event.metadata }, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Global Floating Backend Info Console
 * 
 * Mounted globally at MainLayout level.
 * Stays visible across page transitions until user closes or toggles it off.
 */
export const GlobalInfoPanel = () => {
  const { isOpen, closeConsole, clearEvents, events } = useBackendInfo()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("ALL")
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef(null)

  // Listen for Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeConsole()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, closeConsole])

  // Filter events based on active category & search query
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Category filter: default ALL permits 100% of events without filtering
      if (activeFilter === "COMMAND") {
        const t = (ev.type || "").toUpperCase()
        if (!t.includes("COMMAND") && !t.includes("CMD") && !t.includes("TAKEOFF") && !t.includes("ARM") && !t.includes("LAND")) {
          return false
        }
      } else if (activeFilter === "TELEMETRY") {
        const t = (ev.type || "").toUpperCase()
        if (!t.includes("TELEMETRY") && !t.includes("MAVLINK") && !t.includes("GPS") && !t.includes("BATTERY")) {
          return false
        }
      } else if (activeFilter === "ALERT") {
        const t = (ev.type || "").toUpperCase()
        const s = (ev.severity || "").toUpperCase()
        if (!t.includes("ERROR") && !t.includes("WARN") && !t.includes("FAIL") && !t.includes("ALERT") && !t.includes("BREACH") && !s.includes("WARN") && !s.includes("ERROR")) {
          return false
        }
      } else if (activeFilter === "SYSTEM") {
        const t = (ev.type || "").toUpperCase()
        if (!t.includes("AUTH") && !t.includes("WEBSOCKET") && !t.includes("BOOT") && !t.includes("BACKEND") && !t.includes("SYNC") && !t.includes("SYSTEM")) {
          return false
        }
      }

      // Text search
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      const contentStr = String(ev.content || "").toLowerCase()
      const messageStr = String(ev.message || "").toLowerCase()
      const typeStr = String(ev.type || "").toLowerCase()
      const droneStr = String(ev.droneId || "").toLowerCase()
      const missionStr = String(ev.missionId || "").toLowerCase()
      const sourceStr = String(ev.source || "").toLowerCase()
      const eventStr = String(ev.event || "").toLowerCase()

      return (
        contentStr.includes(query) ||
        messageStr.includes(query) ||
        typeStr.includes(query) ||
        droneStr.includes(query) ||
        missionStr.includes(query) ||
        sourceStr.includes(query) ||
        eventStr.includes(query)
      )
    })
  }, [events, activeFilter, searchQuery])

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (isOpen && autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filteredEvents, isOpen, autoScroll])

  // Detect user manual scroll up to temporarily disengage autoScroll
  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30
    if (isAtBottom && !autoScroll) {
      setAutoScroll(true)
    } else if (!isAtBottom && autoScroll) {
      setAutoScroll(false)
    }
  }

  if (!isOpen) return null

  return (
    <aside
      id="global-backend-info-console"
      aria-label="Backend information console"
      className="fixed z-[9999] right-2 sm:right-3 md:right-4 top-[64px] sm:top-[70px] w-[calc(100vw-16px)] sm:w-[580px] md:w-[680px] lg:w-[740px] max-w-[calc(100vw-16px)] h-[min(480px,calc(100dvh-84px))] flex flex-col overflow-hidden rounded-lg border border-[#203D54] bg-[#070D14F5] text-[#D9E3E8] shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-md font-mono select-text"
    >
      {/* Top Header Bar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#1A3144] bg-[#0B1520] px-3 select-none">
        {/* Title + Event Count */}
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold tracking-wide font-mono">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FE089] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FE089] shadow-[0_0_8px_#2FE089]" />
          </span>
          <span className="text-[#35E0FF] tracking-wider">BACKEND INFO</span>
          <span className="text-[#48657B]">/</span>
          <span className="truncate text-[#8EADC4] text-[11px] font-semibold">
            {events.length} {events.length === 1 ? "EVENT" : "EVENTS"}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* Auto-scroll toggle */}
          <button
            type="button"
            onClick={() => {
              setAutoScroll((prev) => !prev)
              if (!autoScroll && scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
              }
            }}
            className={`flex h-7 px-1.5 items-center gap-1 rounded-[3px] text-[10px] font-mono transition cursor-pointer ${
              autoScroll
                ? "bg-[#112433] text-[#35E0FF] border border-[#1E4562]"
                : "text-[#7A93A6] hover:bg-[#122332] hover:text-[#AEC7DC]"
            }`}
            title={autoScroll ? "Auto-scroll active (click to pause)" : "Auto-scroll paused (click to follow newest)"}
            aria-label="Toggle auto-scroll"
          >
            <ArrowDownToLine className="h-3 w-3" />
            <span className="hidden sm:inline">{autoScroll ? "Scroll: ON" : "Scroll: OFF"}</span>
          </button>

          {/* Clear Messages */}
          <button
            type="button"
            onClick={clearEvents}
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[#7A93A6] transition hover:bg-[#1B2936] hover:text-[#FF6B6B] cursor-pointer"
            title="Clear displayed messages from frontend console"
            aria-label="Clear displayed messages"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* Close Console */}
          <button
            type="button"
            onClick={closeConsole}
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[#7A93A6] transition hover:bg-[#1B2936] hover:text-white cursor-pointer"
            title="Close console (Esc)"
            aria-label="Close console"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142636] bg-[#081018] px-3 py-1.5 text-[11px] select-none">
        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {[
            { id: "ALL", label: "All" },
            { id: "COMMAND", label: "Commands" },
            { id: "TELEMETRY", label: "Telemetry" },
            { id: "ALERT", label: "Alerts" },
            { id: "SYSTEM", label: "System" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveFilter(cat.id)}
              className={`px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-semibold transition cursor-pointer ${
                activeFilter === cat.id
                  ? "bg-[#163548] text-[#35E0FF] border border-[#2B5E80]"
                  : "text-[#698497] hover:text-[#A0BDD3] hover:bg-[#0D1A25]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-1.5 bg-[#050A0F] border border-[#162B3B] rounded-[4px] px-2 py-0.5 text-[10.5px] min-w-[140px] sm:min-w-[190px]">
          <Search className="h-3 w-3 text-[#5A7486] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages, drones, codes..."
            className="bg-transparent border-none text-[#D2E4F0] placeholder:text-[#4A6375] focus:outline-none w-full min-w-0"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[#698497] hover:text-white"
              aria-label="Clear filter search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Main Event Stream Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-2 scrollbar-thin"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[#698497]">
            <Terminal className="h-8 w-8 text-[#284860] mb-2 stroke-[1.5]" />
            <p className="text-xs font-semibold text-[#8EADC4]">
              {events.length === 0 ? "Waiting for backend messages..." : "No events match current filter"}
            </p>
            <p className="text-[10.5px] text-[#556F82] mt-1 max-w-xs">
              {events.length === 0 
                ? "Live WebSocket connection active. Inbound telemetry, commands and system events will stream here automatically."
                : "Try clearing search filter or selecting 'All'"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => (
              <BackendEventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Status Footer */}
      <div className="flex h-6 shrink-0 items-center justify-between border-t border-[#122332] bg-[#060B11] px-3 text-[9.5px] text-[#5D778B] select-none font-mono">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#35E0FF]" />
          <span>WebSocket Stream Active</span>
          {filteredEvents.length !== events.length && (
            <span className="text-[#8EADC4]">({filteredEvents.length}/{events.length} shown)</span>
          )}
        </div>
        <div className="hidden sm:block">
          <span>Press <kbd className="px-1 py-0.5 rounded bg-[#101E2B] text-[#8EADC4] border border-[#1B3247]">Esc</kbd> to close</span>
        </div>
      </div>
    </aside>
  )
}

export default GlobalInfoPanel
