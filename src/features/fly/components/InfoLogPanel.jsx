import { useEffect, useRef, useState } from "react"
import { Info, Trash2, X } from "lucide-react"
import { telemetryClient } from "@/services/telemetry/telemetryClient.js"

const getEventType = (payload) => {
  if (!payload || typeof payload !== "object") return "BACKEND"
  return payload.level ?? payload.severity ?? payload.type ?? payload.event ?? "BACKEND"
}

const getEventTimestamp = (payload, receivedAt) => {
  if (payload && typeof payload === "object") {
    const timestamp = payload.timestamp ?? payload.time ?? payload.createdAt ?? payload.datetime
    if (timestamp !== undefined && timestamp !== null) return String(timestamp)
  }
  return new Date(receivedAt).toISOString()
}

const getEventContent = (payload) =>
  typeof payload === "string" ? payload : JSON.stringify(payload)

const InfoLogPanel = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [events, setEvents] = useState([])
  const scrollRef = useRef(null)
  const eventIdRef = useRef(0)

  useEffect(() => {
    return telemetryClient.onBackendEvent((payload, receivedAt) => {
      eventIdRef.current += 1
      setEvents((current) => [
        ...current,
        {
          id: eventIdRef.current,
          timestamp: getEventTimestamp(payload, receivedAt),
          type: String(getEventType(payload)),
          content: getEventContent(payload),
        },
      ])
    })
  }, [])

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events, isOpen])

  return (
    <div className="relative shrink-0 font-mono">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] border px-2 sm:h-9 sm:px-2.5 text-[10px] font-bold tracking-wide transition ${
          isOpen
            ? "border-[#35E0FF] bg-[#10242B] text-[#B7F3FF] shadow-[0_0_10px_rgba(53,224,255,0.2)]"
            : "border-[#24424C] bg-[#101920] text-[#69DDF1] hover:border-[#35E0FF] hover:bg-[#14252C]"
        }`}
        title="Toggle backend information console"
        aria-label="Toggle INFO console"
        aria-expanded={isOpen}
      >
        <Info className="h-3.5 w-3.5" />
        <span>INFO</span>
      </button>

      {isOpen && (
        <section
          className="fixed right-2 top-[60px] z-[80] flex h-[min(420px,calc(100dvh-72px))] w-[min(680px,calc(100vw-16px))] flex-col overflow-hidden rounded-[5px] border border-[#29414A] bg-[#080D12F5] text-[#D9E3E8] shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-md sm:right-3 sm:top-[64px]"
          aria-label="Backend information console"
        >
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#1E3039] bg-[#0D151B] px-2.5">
            <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold tracking-wide">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2FE089] shadow-[0_0_6px_#2FE089]" />
              <span className="text-[#35E0FF]">BACKEND INFO</span>
              <span className="text-[#647782]">/</span>
              <span className="truncate text-[#8E9EAA]">{events.length} EVENTS</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setEvents([])}
                className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[#8E9EAA] transition hover:bg-[#17242B] hover:text-[#35E0FF]"
                title="Clear displayed messages"
                aria-label="Clear displayed messages"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[#8E9EAA] transition hover:bg-[#17242B] hover:text-white"
                title="Close INFO console"
                aria-label="Close INFO console"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2 scrollbar-thin">
            {events.length === 0 ? (
              <div className="py-3 text-[11px] text-[#70818A]">
                Waiting for backend messages...
              </div>
            ) : (
              <div className="space-y-1.5">
                {events.map((event) => (
                  <div key={event.id} className="grid grid-cols-[minmax(0,1fr)] gap-x-2 text-[10px] leading-[1.5] sm:grid-cols-[auto_auto_minmax(0,1fr)]">
                    <span className="break-all text-[#AAB6BC]">[{event.timestamp}]</span>
                    <span className="font-semibold text-[#35E0FF]">{event.type}:</span>
                    <pre className="m-0 whitespace-pre-wrap break-all font-mono text-[#E0E8EC]">{event.content}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default InfoLogPanel