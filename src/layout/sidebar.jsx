import { NavLink } from "react-router-dom"
import { X } from "lucide-react"
import Fly from "../assets/images/drone.svg"
import Settings from "../assets/images/settings.svg"
import Logs from "../assets/images/logs.svg"
import Plan from "../assets/images/plan.svg"
import Target from "../assets/images/target.svg"
import Waypts from "../assets/images/waypts.svg"
import Dashboard from "@/assets/images/dashboard.svg"
import AeroLogo from "@/components/AeroLogo.jsx"

const Tabs = [
    { label: "Dashboard", value: "/dashboard", Permission: "Dashboard", img: Dashboard },
    { label: "Fly", value: "/fly", Permission: "Fly", img: Fly },
    { label: "Missions", value: "/missions", Permission: "Fleet Management", img: Target },
    { label: "Plan", value: "/plan", Permission: "Geofencing", img: Plan },
    { label: "Waypts", value: "/waypts", Permission: "Alerts & Events", img: Waypts },
    { label: "Logs", value: "/logs", Permission: "Analytics", img: Logs },
    { label: "Settings", value: "/analytics", Permission: "Analytics", img: Settings },
]

const data = {
    role_type: "admin",
    description: "test",
    status: "active",
    permissions: [
        { label: "Dashboard", items: ["View"] },
        { label: "Fly", items: ["View"] },
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

const visibleTabs = Tabs.filter((tab) =>
    data?.permissions.some((view) => view.label === tab.Permission)
)

const Sidebar = ({ collapsed = false, onToggle, mobileOpen = false, onCloseMobile }) => {

    return (
        <aside
            className={`flex flex-col h-full min-h-0 shrink-0 bg-[linear-gradient(180deg,#0A0E12_0%,#06090B_100%)] text-white border-r border-[#1A2633] transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-50 w-[250px] ${
                mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            } lg:static lg:translate-x-0 lg:z-auto ${
                collapsed ? "lg:w-[72px]" : "lg:w-[200px] xl:w-[220px]"
            }`}
        >
            <div
                className={`flex items-center shrink-0 bg-[#0C111E] h-14 xl:h-16 px-3 ${
                    collapsed ? "lg:justify-center lg:px-2" : "justify-between"
                }`}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <AeroLogo className="w-5 h-5 text-[#35E0FF] shrink-0" size={20} />
                    <h1
                        className={`text-[16px] text-[#FFFFFF] font-semibold tracking-tight truncate ${
                            collapsed ? "lg:hidden" : "block"
                        }`}
                    >
                        AeroNexus
                    </h1>
                </div>

                <div className="flex items-center gap-1">
                    {/* Close Button on Mobile */}
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="flex lg:hidden items-center justify-center w-8 h-8 rounded-md text-[#A0AEC0] hover:bg-[#FFFFFF1A] hover:text-white transition"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Desktop Collapse Toggle */}
                    {onToggle && (
                        <button
                            type="button"
                            onClick={onToggle}
                            className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-md text-[#CCCCCC] hover:bg-[#FFFFFF0A] hover:text-white transition ${
                                collapsed ? "w-9 h-9" : ""
                            }`}
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {!collapsed ? (
                                <div className="w-[22px] h-[22px] rounded-full border border-[#35E0FF] flex items-center justify-center">
                                    <div className="w-[8px] h-[8px] rounded-full bg-[#35E0FF]" />
                                </div>
                            ) : (
                                <div className="w-[22px] h-[22px] rounded-full border border-[#35E0FF4D] flex items-center justify-center hover:border-[#35E0FF]">
                                    <div className="w-[8px] h-[8px] rounded-full bg-[#35E0FF]" />
                                </div>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <nav
                className={`flex flex-col flex-1 min-h-0 px-2 pt-3 pb-2 ${
                    collapsed ? "lg:overflow-visible overflow-y-auto" : "overflow-y-auto overflow-x-hidden"
                }`}
            >
                {visibleTabs.map((tab) => {
                    return (
                        <NavLink
                            to={tab.value}
                            key={tab.value}
                            end={tab.value === "/"}
                            title={collapsed ? tab.label : undefined}
                            onClick={onCloseMobile}
                            className={({ isActive }) =>
                                `relative flex items-center text-[13px] font-semibold mb-0.5 transition-all duration-100 rounded-[6px] ${
                                    collapsed
                                        ? `lg:justify-center lg:py-2.5 ${
                                              isActive
                                                  ? "bg-[#171F27B2] text-white shadow-[0px_4px_4px_0px_#00000026]"
                                                  : "text-[#CCCCCC] hover:bg-[#FFFFFF0A]"
                                          } py-2.5 pl-3 pr-2 gap-2.5`
                                        : `gap-2.5 py-2.5 pl-3 pr-2 ${
                                              isActive
                                                  ? "bg-[#171F27B2] text-[#FFFFFF] shadow-[0px_4px_4px_0px_#00000026] border-l-[3px] border-[#38BDF8]"
                                                  : "bg-inherit text-[#CCCCCC] hover:bg-[#FFFFFF0A] border-[#38BDF8]"
                                          }`
                                }`
                            }
                        >
                            <img src={tab.img} className="w-[18px] h-[18px] shrink-0" alt={tab.label} />
                            <span className={`truncate ${collapsed ? "lg:hidden block" : "block"}`}>
                                {tab.label}
                            </span>
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
