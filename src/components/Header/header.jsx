import { useState, useEffect, useRef, useMemo } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import {
  Menu,
  Search,
  Bell,
  Layers,
  ChevronDown,
  Check,
  Compass,
  Plane,
  AlertTriangle,
  FileText,
  Activity,
  Sun,
  X,
} from "lucide-react"
import ProfileDetails from "@/components/profile/profileDetails.jsx"
import { useTelemetry } from "@/hooks/useTelemetry.js"
import { useAuth } from "@/hooks/useAuth.js"
import { useNotification } from "@/hooks/useNotification.js"
import { useMission } from "@/hooks/useMission.js"
import { ConnectionState } from "@/services/telemetry/telemetryTypes.js"
import { Permissions } from "@/auth/permissions.js"
import EmergencyOverrideDeck from "@/features/fly/components/EmergencyOverrideDeck.jsx"
import GlobalInfoButton from "@/components/info/GlobalInfoButton.jsx"
import NotificationCenterModal from "@/components/notification/NotificationCenterModal.jsx"

// 6 Core Operational Workflow Stages matching reference
const WORKFLOW_STAGES = [
  { id: "plan", label: "Plan", path: "/mission-planning" },
  { id: "orchestrate", label: "Orchestrate", path: "/missions" },
  { id: "fly", label: "Fly", path: "/fly" },
  { id: "monitor", label: "Monitor", path: "/live-operations" },
  { id: "analyze", label: "Analyze", path: "/analytics" },
  { id: "act", label: "Act", path: "/incidents" },
]

const Header = ({ onToggleMobile, mobileOpen }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { telemetry, connectionState, isLive } = useTelemetry()
  const { hasPermission } = useAuth()
  const { unreadCount, isHistoryOpen, setIsHistoryOpen } = useNotification()
  const { projects = [], currentProject, selectProject } = useMission()

  // Permissions for flight overrides
  const canOverrideFlight = typeof hasPermission === "function" ? hasPermission(Permissions.OVERRIDE_FLIGHT_COMMANDS) : false
  const canExecuteFlight = typeof hasPermission === "function" ? hasPermission(Permissions.EXECUTE_FLIGHT_COMMANDS) : false

  // Live ticking date and clock
  const [currentDate, setCurrentDate] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Live formatted Date: "Tue, 16 Sep 2026"
  const formattedDate = useMemo(() => {
    return currentDate.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }, [currentDate])

  // Live formatted Time: "08:42 AM"
  const formattedTime = useMemo(() => {
    return currentDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }, [currentDate])

  // Active workflow stage based on route
  const activeWorkflowStage = useMemo(() => {
    const path = location.pathname.toLowerCase()
    if (path === "/mission-planning" || path === "/plan" || path === "/waypoint-planning" || path === "/geofence") {
      return "plan"
    }
    if (path.startsWith("/missions")) {
      return "orchestrate"
    }
    if (path.startsWith("/fly")) {
      return "fly"
    }
    if (path === "/live-operations" || path === "/dashboard" || path === "/" || path === "/remote-pilot" || path === "/swarm-control") {
      return "monitor"
    }
    if (path.startsWith("/analytics") || path.startsWith("/reports") || path.startsWith("/logs")) {
      return "analyze"
    }
    if (path.startsWith("/incidents") || path.startsWith("/alerts") || path.startsWith("/admin") || path.startsWith("/drone-fleet") || path.startsWith("/payloads-sensors") || path.startsWith("/users")) {
      return "act"
    }
    return null
  }, [location.pathname])

  // Search input state and keyboard listener
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const searchInputRef = useRef(null)
  const searchContainerRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        !document.activeElement?.isContentEditable
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Dismiss search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Search filter options
  const quickNavLinks = [
    { label: "Command Center", path: "/dashboard", icon: Activity, category: "Page" },
    { label: "Fly Operations", path: "/fly", icon: Plane, category: "Page" },
    { label: "Mission Planning", path: "/mission-planning", icon: Compass, category: "Page" },
    { label: "Missions", path: "/missions", icon: Layers, category: "Page" },
    { label: "Incidents & Alerts", path: "/incidents", icon: AlertTriangle, category: "Page" },
    { label: "Reports & Logs", path: "/reports", icon: FileText, category: "Page" },
  ]

  const filteredSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []

    const results = []

    // 1. Matching Projects
    projects.forEach((p) => {
      const name = p.projectName || p.name || p.id
      if (name.toLowerCase().includes(q)) {
        results.push({
          type: "project",
          id: p.id,
          title: name,
          subtitle: `Project · ${p.location || "Active Site"}`,
          action: () => {
            selectProject(p.id)
            setSearchQuery("")
            setSearchFocused(false)
          },
        })
      }
    })

    // 2. Matching Drones
    if (telemetry?.droneId && telemetry.droneId.toLowerCase().includes(q)) {
      results.push({
        type: "drone",
        id: telemetry.droneId,
        title: telemetry.droneId,
        subtitle: `Drone · ${telemetry.flightMode || "GUIDED"}`,
        action: () => {
          navigate("/fly")
          setSearchQuery("")
          setSearchFocused(false)
        },
      })
    }

    // 3. Matching Pages
    quickNavLinks.forEach((link) => {
      if (link.label.toLowerCase().includes(q)) {
        results.push({
          type: "page",
          id: link.path,
          title: link.label,
          subtitle: link.category,
          action: () => {
            navigate(link.path)
            setSearchQuery("")
            setSearchFocused(false)
          },
        })
      }
    })

    return results.slice(0, 5)
  }, [searchQuery, projects, telemetry, selectProject, navigate])

  // Project dropdown menu state
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const projectDropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target)) {
        setProjectDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Authentic weather check (only show when genuine temperature exists in telemetry)
  const genuineWeather = typeof telemetry?.temperature === "number" ? Math.round(telemetry.temperature) : null

  // Telemetry connection status text & color
  const connectionDotClass = useMemo(() => {
    if (isLive || connectionState === ConnectionState.AUTHENTICATED) {
      return "bg-[#2FE089] shadow-[0_0_8px_#2FE089]"
    }
    if (connectionState === ConnectionState.STALE) {
      return "bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]"
    }
    if (connectionState === ConnectionState.CONNECTING) {
      return "bg-[#35E0FF] animate-pulse"
    }
    return "bg-[#64748B]"
  }, [isLive, connectionState])

  return (
    <div className="flex items-center justify-between w-full h-full select-none gap-2 sm:gap-3">
      {/* ========================================================
          LEFT: BRANDING & NAVIGATION WORKFLOW
          ======================================================== */}
      <div className="flex items-center min-w-0 gap-2 sm:gap-3 lg:gap-4 shrink-0">
        {/* Mobile Hamburger Drawer Button */}
        <button
          type="button"
          onClick={onToggleMobile}
          className="flex lg:hidden items-center justify-center w-8 h-8 rounded-md bg-[#0F223A] border border-[#1E3A5F] text-[#38BDF8] hover:bg-[#162E4E] transition"
          aria-label="Toggle navigation drawer"
          aria-expanded={mobileOpen}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* AeroNexus / DroneOps IQ Branding */}
        <Link to="/dashboard" className="flex items-center gap-2.5 text-left group shrink-0">
          {/* 4-Circle Quad-Rotor / Clover Brand Icon */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#122A4C] to-[#0A182B] border border-[#1E3A5F] shadow-sm shrink-0 group-hover:border-[#38BDF8] transition-colors">
            <svg
              className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#38BDF8]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="2.5" />
              <rect x="14" y="3" width="7" height="7" rx="2.5" />
              <rect x="3" y="14" width="7" height="7" rx="2.5" />
              <rect x="14" y="14" width="7" height="7" rx="2.5" />
            </svg>
          </div>

          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-1">
              <span className="text-[14px] sm:text-[15px] font-black tracking-tight text-white">DroneOps</span>
              <span className="text-[14px] sm:text-[15px] font-black tracking-tight text-[#38BDF8]">IQ</span>
            </div>
            <span className="text-[9.5px] sm:text-[10px] text-[#8EA3BE] font-medium tracking-tight mt-0.5 truncate max-w-[190px] sm:max-w-none">
              Drone Operations Intelligence Platform
            </span>
          </div>
        </Link>

        {/* Thin Vertical Divider */}
        <div className="hidden lg:block h-6 w-[1px] bg-[#1E3A5F] shrink-0" />

        {/* Workflow Navigation: Plan → Orchestrate → Fly → Monitor → Analyze → Act */}
        <div className="hidden lg:flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1 text-[11.5px] tracking-tight">
            {WORKFLOW_STAGES.map((stage, idx) => {
              const isActive = activeWorkflowStage === stage.id
              return (
                <div key={stage.id} className="flex items-center">
                  <Link
                    to={stage.path}
                    className={`font-semibold transition-all px-1 py-0.5 rounded ${
                      isActive
                        ? "text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] underline decoration-[#38BDF8] decoration-2 underline-offset-4"
                        : "text-[#8EA3BE] hover:text-white"
                    }`}
                  >
                    {stage.label}
                  </Link>
                  {idx < WORKFLOW_STAGES.length - 1 && (
                    <span className="text-[#3A5373] text-[10.5px] select-none mx-0.5">→</span>
                  )}
                </div>
              )
            })}
          </div>
          <span className="text-[9.5px] text-[#5D7694] italic tracking-tight hidden 2xl:block leading-none mt-0.5">
            Smarter missions. Safer operations. Greater impact.
          </span>
        </div>
      </div>

      {/* ========================================================
          CENTER: SEARCH FIELD & PROJECT SELECTOR
          ======================================================== */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-center flex-1 max-w-2xl px-2">
        {/* Compact Search Bar with [/] indicator */}
        <div ref={searchContainerRef} className="relative min-w-[140px] sm:w-60 md:w-64 lg:w-72">
          <div className="relative flex items-center bg-[#0C1B2E] border border-[#1E3A5F] rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-inner focus-within:border-[#38BDF8] focus-within:ring-1 focus-within:ring-[#38BDF8]/40 transition">
            <Search className="w-3.5 h-3.5 text-[#7E95B1] mr-1.5 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search missions, drones, locations…"
              className="bg-transparent text-xs text-white placeholder-[#5A7391] outline-none w-full min-w-0"
              aria-label="Search missions, drones, locations"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[#7E95B1] hover:text-white transition ml-1"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded border border-[#1E3A5F] bg-[#10243B] text-[9.5px] font-mono text-[#7E95B1] select-none shrink-0 ml-1">
                /
              </span>
            )}
          </div>

          {/* Quick Search Popover Dropdown */}
          {searchFocused && filteredSearchResults.length > 0 && (
            <div className="absolute top-[calc(100%+6px)] left-0 w-full z-50 rounded-lg border border-[#1E3A5F] bg-[#0A1626] shadow-[0_12px_28px_rgba(0,0,0,0.7)] backdrop-blur-md overflow-hidden py-1">
              <div className="px-3 py-1 text-[10px] font-bold text-[#5A7391] uppercase tracking-wider">
                Matching Results
              </div>
              {filteredSearchResults.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={item.action}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#142944] flex items-center justify-between transition cursor-pointer text-xs"
                >
                  <span className="font-semibold text-white truncate">{item.title}</span>
                  <span className="text-[10px] text-[#7E95B1] shrink-0 ml-2">{item.subtitle}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project Selector */}
        <div ref={projectDropdownRef} className="relative hidden md:flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold tracking-wider uppercase text-[#7E95B1] shrink-0">
            PROJECT
          </span>

          {/* Active Project Pill */}
          <button
            type="button"
            onClick={() => setProjectDropdownOpen((prev) => !prev)}
            className="bg-[#1B68D2] hover:bg-[#2074e6] text-white px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
            aria-label="Select project"
            aria-expanded={projectDropdownOpen}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[120px] lg:max-w-[160px]">
              {currentProject?.projectName || currentProject?.name || "Active Project"}
            </span>
            <ChevronDown className="w-3 h-3 text-white/80 shrink-0" />
          </button>

          {/* Inactive Project Pills (Displayed if space allows) */}
          <div className="hidden xl:flex items-center gap-1.5">
            {projects
              .filter((p) => p.id !== currentProject?.id)
              .slice(0, 2)
              .map((p) => {
                const name = p.projectName || p.name || p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProject(p.id)}
                    className="border border-[#1E3A5F] hover:border-[#38BDF8] text-[#8EA3BE] hover:text-white px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer shrink-0 truncate max-w-[120px]"
                    title={`Switch to ${name}`}
                  >
                    {name}
                  </button>
                )
              })}
          </div>

          {/* Full Project List Dropdown Menu */}
          {projectDropdownOpen && (
            <div className="absolute top-[calc(100%+6px)] right-0 z-50 w-64 rounded-lg border border-[#1E3A5F] bg-[#0A1626] shadow-[0_12px_28px_rgba(0,0,0,0.7)] backdrop-blur-md overflow-hidden py-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[#5A7391] uppercase tracking-wider border-b border-[#162A44]">
                Available Projects ({projects.length})
              </div>
              <div className="max-h-60 overflow-y-auto">
                {projects.map((p) => {
                  const isSelected = p.id === currentProject?.id
                  const name = p.projectName || p.name || p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        selectProject(p.id)
                        setProjectDropdownOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition cursor-pointer ${
                        isSelected ? "bg-[#1B68D2]/20 text-[#38BDF8]" : "text-[#CAD5E2] hover:bg-[#142944] hover:text-white"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold truncate">{name}</p>
                        <p className="text-[10px] text-[#7E95B1] truncate">{p.location || "Operational Site"}</p>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          RIGHT: OPERATIONAL INFORMATION, NOTIFICATIONS & PROFILE
          ======================================================== */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Genuine Weather Information (Only when genuine temperature data exists) */}
        {genuineWeather !== null && (
          <>
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#E2E8F0] font-medium" title="Telemetry Ambient Temperature">
              <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>{genuineWeather}°C</span>
            </div>
            <span className="hidden lg:inline text-[#1E3A5F] select-none">|</span>
          </>
        )}

        {/* Live Date: "Tue, 16 Sep 2026" */}
        <span className="hidden xl:inline text-xs text-[#8EA3BE] font-medium whitespace-nowrap">
          {formattedDate}
        </span>

        <span className="hidden xl:inline text-[#1E3A5F] select-none">|</span>

        {/* Live Time: "08:42 AM" */}
        <span className="hidden sm:inline text-xs text-white font-mono font-semibold whitespace-nowrap">
          {formattedTime}
        </span>

        {/* Live Telemetry Status Dot */}
        <div className="flex items-center" title={`Telemetry Connection: ${connectionState}`}>
          <div className={`w-2 h-2 rounded-full ${connectionDotClass}`} />
        </div>

        <span className="text-[#1E3A5F] select-none">|</span>

        {/* Preserved Emergency Override Deck (Strictly for authorized operators) */}
        {(canOverrideFlight || canExecuteFlight) && <EmergencyOverrideDeck />}

        {/* Preserved Global Backend Info Console Button */}
        <GlobalInfoButton />

        {/* Notification Bell with Dynamic Unread Badge */}
        <div className="relative shrink-0">
          <button
            id="notification-bell-btn"
            type="button"
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            className="relative flex justify-center items-center w-8 h-8 rounded-full hover:bg-white/5 text-[#8EA3BE] hover:text-[#38BDF8] transition cursor-pointer"
            title="Alerts & Notifications"
            aria-label="Toggle Notification Center"
            aria-expanded={isHistoryOpen}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute 0 top-0.5 right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#EF4444] text-[9.5px] font-bold text-white shadow-[0_0_6px_#EF4444]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <NotificationCenterModal />
        </div>

        {/* User Avatar, Name and Role Trigger */}
        <ProfileDetails />
      </div>
    </div>
  )
}

export default Header
