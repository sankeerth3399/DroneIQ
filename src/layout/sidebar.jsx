import { useState, useEffect } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
    ChevronDown,
    LayoutDashboard,
    Truck,
    MapPinned,
    Bell,
    ChartColumn,
    UserCog,
    Shield,
    Users,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react"
import Fly from "../assets/images/drone.svg"
import Settings from "../assets/images/settings.svg"
import Logs from "../assets/images/logs.svg"
import Plan from "../assets/images/plan.svg"
import Target from "../assets/images/target.svg"
import Waypts from "../assets/images/waypts.svg"
import Dashboard from "@/assets/images/dashboard.svg"
import AeroLogo from "@/components/AeroLogo.jsx"


// import ThinqxLogo from "@/assets/images/thinqxLogo.svg"

const Tabs = [
    { label: "Dashboard", value: "/dashboard", Permission: "Dashboard",img : Dashboard },
    { label: "Fly", value: "/fly", Permission: "Fly", img : Fly },
    { label: "Mission", value: "/mission", Permission: "Fleet Management", img : Target },
    { label: "Plan", value: "/plan", Permission: "Geofencing", img : Plan },
    { label: "Waypts", value: "/waypts", Permission: "Alerts & Events", img : Waypts },
    { label: "Logs", value: "/logs", Permission: "Analytics", img : Logs },
    { label: "Settings", value: "/analytics", Permission: "Analytics", img : Settings },
]

const data = {
    role_type: "admin",
    description: "test",
    status: "active",
    permissions: [
        { label: "Dashboard", items: ["View"] },
        {label: "Fly", items: ["View"]},
        {
            label: "Fleet Management",
            items: ["View", "Add Vehicle", "Edit Vehicle", "Delete Vehicle"],
        },
        {
            label: "Geofencing",
            items: ["View", "Create Zone", "Edit Zone", "Delete Zone"],
        },
        { label: "Alerts & Events", items: ["View"] },
        { label: "Analytics", items: ["View"] },
    ],
}

const Sidebar = ({ collapsed = false, onToggle }) => {
    const location = useLocation()
    const [visbleTab, setVisbleTab] = useState()
    const [openDropdown, setOpenDropdown] = useState(null)

    // const firstName = localStorage.getItem("firstName")
    // const LastName = localStorage.getItem("lastName")
    // const Role = localStorage.getItem("role")
    // const first_last_name = `${firstName?.slice(0, 1) || ""}${LastName?.slice(0, 1) || ""}`

    useEffect(() => {
        setVisbleTab(
            Tabs.filter((tab) => data?.permissions.some((view) => view.label === tab.Permission))
        )
    }, [])
    return (
        <aside
            className={`relative flex flex-col h-full min-h-0 shrink-0 bg-[linear-gradient(180deg,#0A0E12_0%,#06090B_100%)] text-white transition-[width] duration-300 ease-in-out ${
                collapsed ? "w-[72px]" : "w-[200px] lg:w-[220px] xl:w-[240px]"
            }`}
        >
            <div
                className={`flex items-center shrink-0 bg-[#0C111E] h-14 xl:h-16 ${
                    collapsed ? "justify-center px-2" : "justify-between px-3"
                }`}
            >
                {!collapsed ? (
                    <>
                        <div className="flex items-center gap-2.5 min-w-0">
                            <AeroLogo className="w-5 h-5 text-[#35E0FF] shrink-0" size={20} />
                            <h1 className="text-[16px] text-[#FFFFFF] font-semibold tracking-tight truncate">AeroNexus</h1>
                        </div>
                        {onToggle && (
                            <button
                                type="button"
                                onClick={onToggle}
                                className="flex items-center justify-center w-8 h-8 rounded-md text-[#CCCCCC] hover:bg-[#FFFFFF0A] hover:text-white transition"
                                aria-label="Collapse sidebar"
                            >
                                <div className="w-[22px] h-[22px] rounded-full border border-[#35E0FF] flex items-center justify-center">
                                    <div className="w-[8px] h-[8px] rounded-full bg-[#35E0FF]" />
                                </div>
                            </button>
                        )}
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="flex items-center justify-center w-9 h-9 rounded-md text-[#CCCCCC] hover:bg-[#FFFFFF0A] hover:text-white transition"
                        aria-label="Expand sidebar"
                        title="Expand sidebar"
                    >
                        <AeroLogo className="w-5 h-5 text-[#35E0FF]" size={20} />
                    </button>
                )}
            </div>

            <nav
                className={`flex flex-col flex-1 min-h-0 px-2 pt-3 pb-2 ${
                    collapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
                }`}
            >
                {visbleTab?.map((tab) => {
                    const Icon = tab.icon

                    if (tab.children?.length) {
                        const isOpen = openDropdown === tab.value
                        const parentActive = isChildActive(tab.children)

                        if (collapsed) {
                            return (
                                <div key={tab.value} className="relative mb-0.5 group">
                                    <button
                                        type="button"
                                        title={tab.label}
                                        className={`relative flex w-full items-center justify-center py-2.5 rounded-[8px] transition-all duration-300 ${
                                            parentActive
                                                ? "bg-[#0555A0] text-white"
                                                : "text-[#CCCCCC] hover:bg-[#FFFFFF0A]"
                                        }`}
                                    >
                                        {/* <Icon className="w-[18px] h-[18px]" /> */}
                                        <img src={tab.img} className="w-[18px] h-[18px]"/>
                                    </button>
                                </div>
                            )
                        }
                    }

                    return (
                        <NavLink
                            to={tab.value}
                            key={tab.value}
                            end={tab.value === "/"}
                            title={collapsed ? tab.label : undefined}
                            className={({ isActive }) =>
                                `relative flex items-center text-[13px] font-semibold mb-0.5 transition-all duration-100 rounded-[6px] ${
                                    collapsed
                                        ? `justify-center py-2.5 ${
                                              isActive
                                                  ? "bg-[#171F27B2] text-white shadow-[0px_4px_4px_0px_#00000026]"
                                                  : "text-[#CCCCCC] hover:bg-[#FFFFFF0A]"
                                          }`
                                        : `gap-2.5 py-2.5 pl-3 pr-2 ${
                                              isActive
                                                  ? "bg-[#171F27B2] text-[#FFFFFF] shadow-[0px_4px_4px_0px_#00000026] border-l-[3px] border-[#38BDF8]"
                                                  : "bg-inherit text-[#CCCCCC] hover:bg-[#FFFFFF0A]  border-[#38BDF8]"
                                          }`
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {/* {isActive && !collapsed && (
                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-full w-[2px] rounded bg-[#35E0FF] shadow-[0px_0px_8px_0px_#35E0FF]" />
                                    )} */}
                                    <img src={tab.img} className="w-[18px] h-[18px] shrink-0" />
                                    {!collapsed && <span className="truncate">{tab.label}</span>}
                                </>
                            )}
                        </NavLink>
                    )
                })}
            </nav>

            {!collapsed && (
                <div className="shrink-0 px-2 pb-2">
                    <div className="flex flex-col w-full bg-[#FFFFFF0A] px-3 py-2 gap-1 rounded-lg">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#66E599]" />
                            <h1 className="text-[10px] text-[#66E599] font-normal leading-tight">
                                All Systems Operational
                            </h1>
                        </div>
                        <p className="text-[10px] text-[#FFFFFF4D] font-normal leading-tight">
                            TagGPS Fleet v2.4.1
                        </p>
                    </div>
                </div>
            )}

            <div
                className={`flex shrink-0 items-center bg-[#0C111E] gap-2 ${
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                }`}
            >
                <div className="flex justify-center items-center w-8 h-8 shrink-0 rounded-full bg-[#059EB2] text-[11px] font-semibold">
                    {/* {first_last_name.toUpperCase()} */}
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        {/* <h1 className="text-[12px] font-semibold truncate">{firstName}</h1> */}
                        {/* <p className="text-[10px] text-[#FFFFFF73] font-normal truncate">{Role}</p> */}
                    </div>
                )}
            </div>
        </aside>
    )
}

export default Sidebar
