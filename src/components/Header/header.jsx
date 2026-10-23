import { useState, useEffect, useRef, useMemo } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import {
  Menu,
  Search,
  Bell,
  Layers,
  ChevronDown,
  Check,
  Sun,
} from "lucide-react"
import AeroLogo from "@/components/AeroLogo.jsx"
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
import GlobalSearchModal from "@/components/search/GlobalSearchModal.jsx"

// 6 Core Operational Workflow Stages matching reference
const WORKFLOW_STAGES = [
  { id: "plan", label: "Plan", path: "/mission-planning" },
  { id: "orchestrate", label: "Orchestrate", path: "/missions" },
  { id: "fly", label: "Fly", path: "/fly" },
  { id: "monitor", label: "Monitor", path: "/live-operations" },
  { id: "analyze", label: "Analyze", path: "/analytics" },
  { id: "act", label: "Act", path: "/incidents" },
]

/**
 * Header - AeroNexus Unified Command Center Header
 * Layout Order:
 * AeroNexus Branding → Workflow Navigation → Global Search → Project Selector → Date/Status Information → Emergency Deck → INFO → Notifications → User Profile
 * Responsive to all zoom levels (80% - 200%) and screen sizes (320px - 1920px).
 */
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

  // Global Search Modal State and Keyboard Shortcuts (/ and Ctrl+K / Cmd+K)
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      // '/' key or 'Ctrl+K' / 'Cmd+K' opens global command palette
      if (
        (e.key === "/" &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA" &&
          !document.activeElement?.isContentEditable) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault()
        setIsGlobalSearchOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

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
    <div className="flex items-center justify-between w-full h-full min-w-0 select-none gap-2 sm:gap-3">
      {/* ========================================================
          1. LEFT: AERONEXUS BRANDING → WORKFLOW NAVIGATION
          ======================================================== */}
      <div className="flex items-center min-w-0 gap-2 sm:gap-3 lg:gap-3.5 shrink-0">
        {/* Mobile Hamburger Drawer Button (< lg) */}
        <button
          type="button"
          onClick={onToggleMobile}
          className="flex lg:hidden items-center justify-center w-8 h-8 rounded-md bg-[#0F223A] border border-[#1E3A5F] text-[#38BDF8] hover:bg-[#162E4E] transition cursor-pointer shrink-0"
          aria-label="Toggle navigation drawer"
          aria-expanded={mobileOpen}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Sole Primary AeroNexus Branding (Zero DroneOps IQ, Minimal Horizontal Footprint) */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-left group shrink-0"
          title="AeroNexus Command Center"
        >
          <AeroLogo className="w-6 h-6 text-[#35E0FF] shrink-0" size={24} />
          <span className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-[#38BDF8] transition-colors">
            AeroNexus
          </span>
        </Link>

        {/* Subtle Vertical Divider */}
        <div className="hidden lg:block h-5 w-[1px] bg-[#1E3A5F]/80 shrink-0" />

        {/* Workflow Navigation: Plan → Orchestrate → Fly → Monitor → Analyze → Act */}
        <nav
          aria-label="Operational Workflow"
          className="hidden lg:flex items-center gap-0.5 text-xs tracking-tight shrink-0"
        >
          {WORKFLOW_STAGES.map((stage, idx) => {
            const isActive = activeWorkflowStage === stage.id
            return (
              <div key={stage.id} className="flex items-center">
                <Link
                  to={stage.path}
                  className={`font-semibold transition-all px-1.5 py-0.5 rounded text-[11px] xl:text-xs ${
                    isActive
                      ? "text-[#38BDF8] bg-[#38BDF8]/15 drop-shadow-[0_0_8px_rgba(56,189,248,0.35)] font-bold"
                      : "text-[#8EA3BE] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {stage.label}
                </Link>
                {idx < WORKFLOW_STAGES.length - 1 && (
                  <span className="text-[#3A5373] text-[10px] select-none mx-0.5">→</span>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* ========================================================
          2. CENTER: GLOBAL SEARCH → PROJECT SELECTOR
          ======================================================== */}
      <div className="flex items-center gap-2 min-w-0 justify-center flex-1 max-w-xl px-1 sm:px-2">
        {/* Mobile Search Button (< sm) */}
        <button
          type="button"
          onClick={() => setIsGlobalSearchOpen(true)}
          className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full bg-[#0C1B2E] hover:bg-[#12263F] border border-[#1E3A5F] hover:border-[#38BDF8] text-[#7E95B1] hover:text-[#38BDF8] transition shrink-0 cursor-pointer shadow-inner"
          aria-label="Open search"
          title="Search missions, drones, locations (/)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Global Search Field (Fluid Resizing for Zoom Adaptability) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsGlobalSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setIsGlobalSearchOpen(true)
            }
          }}
          className="relative hidden sm:flex items-center bg-[#0C1B2E] hover:bg-[#0F223A] border border-[#1E3A5F] hover:border-[#38BDF8]/60 focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30 rounded-full px-3 py-1 sm:py-1.5 shadow-inner transition cursor-pointer w-full min-w-[110px] max-w-[260px] md:max-w-[290px] shrink group select-none"
          title="Search missions, drones, locations (Press / or Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-[#7E95B1] group-hover:text-[#38BDF8] mr-2 shrink-0 transition-colors" />
          <span className="text-xs text-[#5A7391] group-hover:text-[#8EA3BE] truncate flex-1 transition-colors">
            Search missions, drones…
          </span>
          <kbd className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[9.5px] font-mono font-semibold text-[#7E95B1] bg-[#10243B] border border-[#1E3A5F] rounded select-none shrink-0 ml-1.5 shadow-2xs">
            /
          </kbd>
        </div>

        {/* Project Selector (Fluid Dropdown, Never Overlapping) */}
        <div ref={projectDropdownRef} className="relative hidden md:flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold tracking-wider uppercase text-[#7E95B1] shrink-0">
            PROJECT
          </span>

          {/* Active Project Pill */}
          <button
            type="button"
            onClick={() => setProjectDropdownOpen((prev) => !prev)}
            className="bg-[#1B68D2] hover:bg-[#2074e6] text-white px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer max-w-[140px] lg:max-w-[180px]"
            aria-label="Select active project"
            aria-expanded={projectDropdownOpen}
          >
            <Layers className="w-3.5 h-3.5 shrink-0 text-[#93C5FD]" />
            <span className="truncate">
              {currentProject?.projectName || currentProject?.name || "Active Project"}
            </span>
            <ChevronDown className="w-3 h-3 text-white/80 shrink-0" />
          </button>

          {/* Project Selection Dropdown */}
          {projectDropdownOpen && (
            <div className="absolute top-[calc(100%+6px)] right-0 z-50 w-64 rounded-xl border border-[#1E3A5F] bg-[#0A1626FA] shadow-[0_16px_36px_rgba(0,0,0,0.85)] backdrop-blur-md overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 font-mono">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[#5A7391] uppercase tracking-wider border-b border-[#162A44] flex items-center justify-between">
                <span>Available Projects</span>
                <span className="text-[#38BDF8]">{projects.length}</span>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-[#162A44]/50">
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
                        isSelected ? "bg-[#1B68D2]/20 text-[#38BDF8] font-bold" : "text-[#CAD5E2] hover:bg-[#142944] hover:text-white"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate">{name}</p>
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
          3. RIGHT: DATE/STATUS → EMERGENCY DECK → INFO → NOTIFICATIONS → USER PROFILE
          ======================================================== */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 justify-end">
        {/* Telemetry Ambient Temperature (if telemetry has temperature) */}
        {genuineWeather !== null && (
          <>
            <div className="hidden 2xl:flex items-center gap-1.5 text-xs text-[#E2E8F0] font-medium" title="Telemetry Ambient Temperature">
              <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>{genuineWeather}°C</span>
            </div>
            <span className="hidden 2xl:inline text-[#1E3A5F] select-none">|</span>
          </>
        )}

        {/* Live Date: "Tue, 16 Sep 2026" */}
        <span className="hidden 2xl:inline text-xs text-[#8EA3BE] font-medium whitespace-nowrap">
          {formattedDate}
        </span>

        <span className="hidden 2xl:inline text-[#1E3A5F] select-none">|</span>

        {/* Live Clock: "08:42 AM" */}
        <span className="hidden md:inline text-xs text-white font-mono font-semibold whitespace-nowrap">
          {formattedTime}
        </span>

        {/* Live Telemetry Status Dot */}
        <div className="flex items-center px-0.5" title={`Telemetry Connection: ${connectionState}`}>
          <div className={`w-2 h-2 rounded-full ${connectionDotClass}`} />
        </div>

        <span className="hidden sm:inline text-[#1E3A5F] select-none">|</span>

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
              <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#EF4444] text-[9.5px] font-bold text-white shadow-[0_0_6px_#EF4444]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <NotificationCenterModal />
        </div>

        {/* User Profile and Fast Role Switcher */}
        <ProfileDetails />
      </div>

      {/* Global Search Command Palette Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
      />
    </div>
  )
}

export default Header
