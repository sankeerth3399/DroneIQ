import { useEffect, useRef, useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "../layout/sidebar.jsx"
import Header from "../components/Header/header.jsx"

const LAPTOP_BREAKPOINT = 1024

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1280 : false
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const wasBelowBreakpoint = useRef(
    typeof window !== "undefined" ? window.innerWidth < LAPTOP_BREAKPOINT : false
  )

  useEffect(() => {
    const handleResize = () => {
      const isBelow = window.innerWidth < LAPTOP_BREAKPOINT
      if (isBelow) {
        setMobileOpen(false)
      }

      if (isBelow !== wasBelowBreakpoint.current) {
        setCollapsed(window.innerWidth < 1280)
        wasBelowBreakpoint.current = isBelow
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#06090E]">
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close navigation sidebar"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter") setMobileOpen(false)
          }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar (Overlay on mobile < lg, in-flow on desktop >= lg) */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="shrink-0 bg-[#0A0E12] border-b border-[#1A2633] px-2.5 sm:px-4 py-2 sm:py-2.5 lg:py-3 z-30">
          <Header
            sidebarCollapsed={collapsed}
            onToggleSidebar={() => setCollapsed((prev) => !prev)}
            onToggleMobile={() => setMobileOpen((prev) => !prev)}
            mobileOpen={mobileOpen}
          />
        </header>

        <main className="flex-1 min-h-0 overflow-auto relative">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
