import React, { Component, useState, useEffect, useMemo, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { FileText, SearchX } from "lucide-react"

import { useMission } from "@/hooks/useMission.js"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { incidentService, SEEDED_ACTIVE_ALERTS } from "@/services/api/incidentService.js"

/**
 * SearchErrorBoundary
 * Ensures any unexpected rendering error in the search palette
 * never crashes the underlying application or turns the screen blank.
 */
class SearchErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error("SearchErrorBoundary caught an error in GlobalSearchModal:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-8 p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-800">Search temporarily unavailable</h3>
            <p className="text-xs text-slate-500 mt-1">An error occurred while loading search results.</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false })
                this.props.onClose?.()
              }}
              className="mt-4 px-4 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Close Search
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * GlobalSearchModalContent
 * Search interface matching reference screenshot:
 * - White/light panel floating over dark backdrop
 * - Blue border search input with placeholder: 'Search location, camera, incident or asset...'
 * - Document icon on left, title in center, SCREEN / category on right
 * - Soft-blue highlight on selected row
 * - ArrowUp / ArrowDown navigation, Enter to select, Escape to close
 */
const GlobalSearchModalContent = ({ isOpen, onClose, initialQuery = "" }) => {
  const navigate = useNavigate()

  // Safely consume Mission and Telemetry contexts
  const missionContext = useMission() || {}
  const { projects = [], selectProject } = missionContext

  const telemetryContext = useTelemetry() || {}
  const { registeredDrones = [], telemetry, selectDrone } = telemetryContext

  const [query, setQuery] = useState(initialQuery)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Initialize alerts synchronously with SEEDED_ACTIVE_ALERTS to prevent undefined/Promise errors
  const [activeAlerts, setActiveAlerts] = useState(() =>
    Array.isArray(SEEDED_ACTIVE_ALERTS) ? SEEDED_ACTIVE_ALERTS : []
  )

  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Focus and select input on open
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery)
      setSelectedIndex(0)
      const timer = setTimeout(() => {
        try {
          if (inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select?.()
          }
        } catch {
          // ignore focus errors
        }
      }, 30)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialQuery])

  // Asynchronously fetch live active alerts without setting a Promise to state
  useEffect(() => {
    let isMounted = true
    if (isOpen) {
      const fetchAlerts = async () => {
        try {
          if (typeof incidentService?.getActiveAlerts === "function") {
            const res = await incidentService.getActiveAlerts()
            if (isMounted && Array.isArray(res)) {
              setActiveAlerts(res)
            }
          }
        } catch (err) {
          console.warn("Could not load dynamic alerts for search palette:", err)
        }
      }
      fetchAlerts()
    }
    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Canonical screens and planning sections in exact order matching reference screenshot
  const screenItems = useMemo(
    () => [
      {
        id: "scr-command-center",
        title: "Command Center",
        badge: "SCREEN",
        action: () => {
          navigate("/dashboard")
          onClose?.()
        },
      },
      {
        id: "scr-missions",
        title: "Missions",
        badge: "SCREEN",
        action: () => {
          navigate("/missions")
          onClose?.()
        },
      },
      {
        id: "scr-planning-area-flight",
        title: "Planning · Area & Flight",
        badge: "SCREEN",
        action: () => {
          navigate("/mission-planning", { state: { step: 1, tab: "plan", subStep: "area_flight" } })
          onClose?.()
        },
      },
      {
        id: "scr-planning-payload",
        title: "Planning · Payload Configuration",
        badge: "SCREEN",
        action: () => {
          navigate("/mission-planning", { state: { step: 2, tab: "payload", subStep: "payload_config" } })
          onClose?.()
        },
      },
      {
        id: "scr-planning-swarm",
        title: "Planning · Swarm Configuration",
        badge: "SCREEN",
        action: () => {
          navigate("/mission-planning", { state: { step: 3, tab: "plan", subStep: "swarm" } })
          onClose?.()
        },
      },
      {
        id: "scr-planning-geofence",
        title: "Planning · Geofencing & Safety",
        badge: "SCREEN",
        action: () => {
          navigate("/mission-planning", { state: { step: 4, tab: "safety", subStep: "geofence" } })
          onClose?.()
        },
      },
      {
        id: "scr-planning-weather",
        title: "Planning · Weather Constraints",
        badge: "SCREEN",
        action: () => {
          navigate("/mission-planning", { state: { step: 5, tab: "safety", subStep: "weather" } })
          onClose?.()
        },
      },
      {
        id: "scr-planning-scheduling",
        title: "Planning · Scheduling",
        badge: "SCREEN",
        action: () => {
          navigate("/mission-planning", { state: { step: 6, tab: "plan", subStep: "scheduling" } })
          onClose?.()
        },
      },
      {
        id: "scr-planning-flight-parameters",
        title: "Planning · Flight Parameters",
        badge: "SCREEN",
        action: () => {
          navigate("/mission-planning", { state: { step: 7, tab: "advanced", subStep: "flight_params" } })
          onClose?.()
        },
      },
      {
        id: "scr-planning-coverage",
        title: "Planning · Coverage & Capture",
        badge: "SCREEN",
        action: () => {
          navigate("/mission-planning", { state: { step: 8, tab: "plan", subStep: "coverage" } })
          onClose?.()
        },
      },
      {
        id: "scr-fly",
        title: "Fly",
        badge: "SCREEN",
        action: () => {
          navigate("/fly")
          onClose?.()
        },
      },
      {
        id: "scr-live-operations",
        title: "Live Operations",
        badge: "SCREEN",
        action: () => {
          navigate("/live-operations")
          onClose?.()
        },
      },
      {
        id: "scr-remote-pilot",
        title: "Remote Pilot",
        badge: "SCREEN",
        action: () => {
          navigate("/remote-pilot")
          onClose?.()
        },
      },
      {
        id: "scr-swarm-control",
        title: "Swarm Control",
        badge: "SCREEN",
        action: () => {
          navigate("/swarm-control")
          onClose?.()
        },
      },
      {
        id: "scr-drone-fleet",
        title: "Drone Fleet",
        badge: "SCREEN",
        action: () => {
          navigate("/drone-fleet")
          onClose?.()
        },
      },
      {
        id: "scr-payloads-sensors",
        title: "Payloads & Sensors",
        badge: "SCREEN",
        action: () => {
          navigate("/payloads-sensors")
          onClose?.()
        },
      },
      {
        id: "scr-incidents-alerts",
        title: "Incidents & Alerts",
        badge: "SCREEN",
        action: () => {
          navigate("/incidents")
          onClose?.()
        },
      },
      {
        id: "scr-analytics",
        title: "Data & Analytics",
        badge: "SCREEN",
        action: () => {
          navigate("/analytics")
          onClose?.()
        },
      },
      {
        id: "scr-reports",
        title: "Reports",
        badge: "SCREEN",
        action: () => {
          navigate("/reports")
          onClose?.()
        },
      },
      {
        id: "scr-logs",
        title: "Logs",
        badge: "SCREEN",
        action: () => {
          navigate("/logs")
          onClose?.()
        },
      },
      {
        id: "scr-admin",
        title: "Administration",
        badge: "SCREEN",
        action: () => {
          navigate("/admin")
          onClose?.()
        },
      },
    ],
    [navigate, onClose]
  )

  // Cameras and sensor payloads
  const cameraItems = useMemo(
    () => [
      {
        id: "cam-sony-rx1r",
        title: "Sony RX1R II 42MP (RGB Sensor)",
        badge: "CAMERA",
        action: () => {
          navigate("/payloads-sensors")
          onClose?.()
        },
      },
      {
        id: "cam-zenmuse-h20t",
        title: "Zenmuse H20T (Thermal & Optical Zoom)",
        badge: "CAMERA",
        action: () => {
          navigate("/payloads-sensors")
          onClose?.()
        },
      },
      {
        id: "cam-lidar-hesai",
        title: "Hesai PandarXT-32 LiDAR Scanner",
        badge: "CAMERA",
        action: () => {
          navigate("/payloads-sensors")
          onClose?.()
        },
      },
      {
        id: "cam-rededge-p",
        title: "RedEdge-P Multispectral Camera",
        badge: "CAMERA",
        action: () => {
          navigate("/payloads-sensors")
          onClose?.()
        },
      },
      {
        id: "cam-fpv-camera",
        title: "FPV Ultra-Low Latency Cockpit Camera",
        badge: "CAMERA",
        action: () => {
          navigate("/remote-pilot")
          onClose?.()
        },
      },
    ],
    [navigate, onClose]
  )

  // Aggregate all real searchable items: locations, cameras, incidents, assets, missions, screens
  const allSearchableItems = useMemo(() => {
    try {
      const items = Array.isArray(screenItems) ? [...screenItems] : []

      // 1. Locations from real projects
      if (Array.isArray(projects)) {
        projects.forEach((p) => {
          if (!p) return
          const loc = p.location || p.projectName || p.name
          if (loc) {
            items.push({
              id: `loc-${p.id || Math.random()}`,
              title: `${loc} · ${p.projectName || p.name || "Site"}`,
              badge: "LOCATION",
              action: () => {
                try {
                  if (p.id) selectProject?.(p.id)
                  navigate("/dashboard")
                  onClose?.()
                } catch {
                  onClose?.()
                }
              },
            })
          }
        })
      }

      // 2. Cameras & Payloads
      if (Array.isArray(cameraItems)) {
        items.push(...cameraItems)
      }

      // 3. Incidents & Active Alerts
      if (Array.isArray(activeAlerts)) {
        activeAlerts.forEach((a) => {
          if (!a) return
          items.push({
            id: `inc-${a.id || Math.random()}`,
            title: `${a.title || "Incident Alert"}${a.id ? ` · ${a.id}` : ""}`,
            badge: "INCIDENT",
            action: () => {
              try {
                navigate("/incidents")
                onClose?.()
              } catch {
                onClose?.()
              }
            },
          })
        })
      }

      // 4. Assets & Drones
      const safeRegistered = Array.isArray(registeredDrones) ? registeredDrones : []
      const activeCallsign = telemetry?.droneId || "DRONE-001"
      const dronesList =
        safeRegistered.length > 0
          ? safeRegistered
          : [
              { id: activeCallsign, name: "Alpha-1", model: "Quadcopter" },
              { id: "DRONE-002", name: "Bravo-2", model: "Hexacopter" },
            ]

      dronesList.forEach((d) => {
        if (!d) return
        items.push({
          id: `asset-${d.id || Math.random()}`,
          title: `${d.name || d.id || "Drone"} (${d.model || d.type || "Quadcopter"})`,
          badge: "ASSET",
          action: () => {
            try {
              if (d.id) selectDrone?.(d.id)
              navigate("/fly")
              onClose?.()
            } catch {
              onClose?.()
            }
          },
        })
      })

      // 5. Missions
      if (Array.isArray(projects)) {
        projects.forEach((p) => {
          if (!p) return
          items.push({
            id: `msn-${p.id || Math.random()}`,
            title: `${p.name || p.projectName || "Flight Mission"} (Mission)`,
            badge: "MISSION",
            action: () => {
              try {
                if (p.id) selectProject?.(p.id)
                navigate("/missions")
                onClose?.()
              } catch {
                onClose?.()
              }
            },
          })
        })
      }

      return items
    } catch (err) {
      console.error("Error aggregating search items:", err)
      return Array.isArray(screenItems) ? screenItems : []
    }
  }, [screenItems, cameraItems, projects, activeAlerts, registeredDrones, telemetry, selectProject, selectDrone, navigate, onClose])

  // Filter items safely based on query
  const filteredItems = useMemo(() => {
    try {
      const q = (typeof query === "string" ? query : "").trim().toLowerCase()
      const list = Array.isArray(allSearchableItems) ? allSearchableItems : []
      if (!q) {
        return list
      }
      return list.filter((item) => {
        if (!item) return false
        const title = typeof item.title === "string" ? item.title.toLowerCase() : ""
        const badge = typeof item.badge === "string" ? item.badge.toLowerCase() : ""
        return title.includes(q) || badge.includes(q)
      })
    } catch {
      return []
    }
  }, [allSearchableItems, query])

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredItems.length, query])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (filteredItems[selectedIndex]?.action) {
          filteredItems[selectedIndex].action()
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        onClose?.()
      }
    },
    [filteredItems, selectedIndex, onClose]
  )

  // Scroll active item into view safely
  useEffect(() => {
    try {
      if (listRef.current) {
        const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
        if (activeEl && typeof activeEl.scrollIntoView === "function") {
          activeEl.scrollIntoView({ block: "nearest" })
        }
      }
    } catch {
      // ignore DOM scroll errors
    }
  }, [selectedIndex])

  if (!isOpen) return null

  const modalMarkup = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search"
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-3 sm:pt-6 p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-100"
      >
        {/* ========================================================
            TOP SEARCH INPUT (Matching Reference Screenshot)
            ======================================================== */}
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search location, camera, incident or asset..."
            className="w-full px-4 py-3 sm:py-3.5 bg-white border border-[#3B82F6] rounded-xl outline-none text-[15px] sm:text-base text-slate-800 placeholder-slate-400 font-normal shadow-xs focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
            aria-label="Search location, camera, incident or asset"
          />
        </div>

        {/* ========================================================
            SCROLLABLE RESULTS LIST (Matching Reference Screenshot)
            ======================================================== */}
        <div
          ref={listRef}
          className="mt-3 sm:mt-4 flex-1 overflow-y-auto space-y-0.5 max-h-[58vh] pr-1.5 [scrollbar-width:thin] [scrollbar-color:#94a3b8_transparent]"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center select-none">
              <SearchX className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-700">No matching results found</h4>
              <p className="text-xs text-slate-400 mt-1">
                No location, camera, incident or asset matched &ldquo;{query}&rdquo;.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer select-none ${
                    isSelected ? "bg-[#EEF5FF]" : "hover:bg-[#F8FAFC]"
                  }`}
                >
                  {/* Left: Document icon + Title */}
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <FileText className="w-4.5 h-4.5 text-[#2563EB] shrink-0 stroke-[1.8]" />
                    <span
                      className={`text-[13.5px] sm:text-sm truncate ${
                        isSelected ? "text-slate-800 font-medium" : "text-slate-700 font-normal"
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>

                  {/* Right: Category badge (SCREEN, LOCATION, CAMERA, INCIDENT, ASSET, MISSION) */}
                  <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider shrink-0">
                    {item.badge}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )

  // Mount directly to document.body via React portal to prevent header clipping or stacking issues
  if (typeof document !== "undefined" && document.body) {
    return createPortal(modalMarkup, document.body)
  }

  return modalMarkup
}

/**
 * GlobalSearchModal wrapped in SearchErrorBoundary
 */
export const GlobalSearchModal = (props) => (
  <SearchErrorBoundary onClose={props.onClose}>
    <GlobalSearchModalContent {...props} />
  </SearchErrorBoundary>
)

export default GlobalSearchModal
