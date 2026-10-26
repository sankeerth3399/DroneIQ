import { useEffect, useRef, useState, useCallback } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "../layout/sidebar.jsx"
import Header from "../components/Header/header.jsx"
import FlightToast from "@/components/toast/FlightToast.jsx"
import GlobalInfoPanel from "@/components/info/GlobalInfoPanel.jsx"

const LAPTOP_BREAKPOINT = 1024
const COMPACT_HEIGHT_BREAKPOINT = 620

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < 1280 || window.innerHeight < COMPACT_HEIGHT_BREAKPOINT
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const userHasToggled = useRef(false)
  const wasBelowBreakpoint = useRef(
    typeof window !== "undefined" ? window.innerWidth < LAPTOP_BREAKPOINT : false
  )

  const handleToggleSidebar = useCallback(() => {
    userHasToggled.current = true
    setCollapsed((prev) => !prev)
  }, [])

  const handleToggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev)
  }, [])

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false)
  }, [])

  // Responsive resize handler accounting for both viewport width and height
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const isBelow = w < LAPTOP_BREAKPOINT

      // Close mobile drawer when transitioning UP to desktop size
      if (!isBelow && wasBelowBreakpoint.current) {
        setMobileOpen(false)
      }
      wasBelowBreakpoint.current = isBelow

      // If user hasn't explicitly locked in a manual preference, adaptively set collapse
      if (!userHasToggled.current) {
        if (w >= LAPTOP_BREAKPOINT && (w < 1280 || h < COMPACT_HEIGHT_BREAKPOINT)) {
          setCollapsed(true)
        } else if (w >= 1280 && h >= COMPACT_HEIGHT_BREAKPOINT) {
          setCollapsed(false)
        }
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Global Escape key handler to close mobile navigation drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileOpen])

  return (
    <div className="command-app relative flex flex-col h-[100dvh] min-h-[100dvh] w-full max-w-full overflow-hidden bg-[#EEF3F8]">
      {/* Global HUD Flight Safety Notification Toast */}
      <FlightToast />

      {/* Top Header Bar (Full-width edge-to-edge, responsive height) */}
      <header className="command-topbar relative shrink-0 bg-[#08182B] border-b border-[#162A44] px-3 sm:px-4 z-40 h-13 sm:h-14 flex items-center">
        <Header
          sidebarCollapsed={collapsed}
          onToggleSidebar={handleToggleSidebar}
          onToggleMobile={handleToggleMobile}
          mobileOpen={mobileOpen}
        />
      </header>

      {/* Main Row: Sidebar on Left, Workspace on Right */}
      <div className="flex-1 flex min-w-0 min-h-0 w-full overflow-hidden relative">
        {/* Mobile Drawer Backdrop Overlay (< lg) */}
        {mobileOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Close navigation sidebar"
            onClick={handleCloseMobile}
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Enter") handleCloseMobile()
            }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          />
        )}

        {/* Sidebar (Overlay drawer on mobile < lg, responsive flex-column on desktop >= lg) */}
        <Sidebar
          collapsed={collapsed}
          onToggle={handleToggleSidebar}
          mobileOpen={mobileOpen}
          onCloseMobile={handleCloseMobile}
        />

        {/* Page Workspace Outlet: Fluid resizing when sidebar expands or collapses */}
        <main className="command-workspace flex-1 min-h-0 min-w-0 w-full h-full flex flex-col overflow-hidden relative bg-[#EEF3F8] transition-all duration-200">
          <Outlet />
        </main>
      </div>

      {/* Global Floating Backend Info Console */}
      <GlobalInfoPanel />
    </div>
  )
}

export default MainLayout

