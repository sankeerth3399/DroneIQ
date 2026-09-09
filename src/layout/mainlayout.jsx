import { useEffect, useRef, useState } from "react"
import { Outlet } from "react-router-dom"
// import { MapProvider } from "../components/Map/mapContainer.jsx"
import Sidebar from "../layout/sidebar.jsx"
import Header from "../components/Header/header.jsx"

const LAPTOP_BREAKPOINT = 1280

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < LAPTOP_BREAKPOINT : false
  )
  const wasBelowBreakpoint = useRef(
    typeof window !== "undefined" ? window.innerWidth < LAPTOP_BREAKPOINT : false
  )

  useEffect(() => {
    const handleResize = () => {
      const isBelow = window.innerWidth < LAPTOP_BREAKPOINT

      if (isBelow !== wasBelowBreakpoint.current) {
        setCollapsed(isBelow)
        wasBelowBreakpoint.current = isBelow
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="shrink-0 bg-[#0A0E12] shadow-[0px_1px_4px_-1px_rgba(0,0,0,0.5)] px-3 sm:px-4 xl:px-4 py-3 xl:py-4">
          <Header
            sidebarCollapsed={collapsed}
            onToggleSidebar={() => setCollapsed((prev) => !prev)}
          />
        </header>

        <main className="flex-1 min-h-0 overflow-auto">
          {/* <MapProvider>
            <Outlet />
          </MapProvider> */}
          <Outlet/>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
