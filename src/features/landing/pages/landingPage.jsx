import { useState } from "react"
import {
    Zap,
    Crosshair,
    Diamond,
    CircleDot,
    Settings,
    LayoutGrid,
    Menu,
    X,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import DashboardImg from "@/assets/images/sampleImg.png"
import LoginModal from "@/features/auth/components/LoginModal.jsx"
import AeroLogo from "@/components/AeroLogo.jsx"

const navItems = [
    { label: "Platform", id: "platform" },
    { label: "Capabilities", id: "capabilities" },
    { label: "Mission flow", id: "mission-flow" },
    { label: "Enterprise", id: "enterprise" },
]

const stats = [
    { value: "99.9%", label: "Uptime SLA" },
    { value: "<200ms", label: "Telemetry latency" },
    { value: "1,000+", label: "Fleet scale" },
    { value: "MAVLink 2", label: "Native protocol" },
]

const capabilities = [
    {
        title: "Real-time telemetry",
        code: "FR-DASH",
        body: "Sub-200ms telemetry streams for attitude, GPS, battery, sensor state and flight status.",
        icon: Zap,
    },
    {
        title: "Mission planning",
        code: "FR-PLAN",
        body: "Waypoints, survey grids and corridors with automatic geofence and airspace validation.",
        icon: Crosshair,
    },
    {
        title: "Fleet management",
        code: "FR-ENT",
        body: "Manage 1 to 1,000+ vehicles with live status, scheduling, maintenance and RBAC.",
        icon: Diamond,
    },
    {
        title: "Live video feed",
        code: "FR-FEED",
        body: "HD and thermal streams with recording, picture-in-picture and operational analytics.",
        icon: CircleDot,
    },
    {
        title: "Vehicle health",
        code: "FR-CAL",
        body: "Calibration, parameters, motor tuning and predictive maintenance workflows in context.",
        icon: Settings,
    },
    {
        title: "Flight analytics",
        code: "FR-LOG",
        body: "Replay telemetry, detect anomalies, export reports and understand battery trends.",
        icon: LayoutGrid,
    },
]

const missionSteps = [
    { step: "01", title: "Plan", body: "Define the area, waypoints, altitude, and abort points." },
    { step: "02", title: "Brief", body: "Assign aircraft, check weather, and lock the mission package." },
    { step: "03", title: "Fly", body: "Monitor telemetry and intervene with live commands when needed." },
    { step: "04", title: "Review", body: "Export logs, footage, and outcomes into the operations record." },
]

const enterprisePoints = [
    { title: "Role-based access", body: "Separate planners, pilots, and observers with least-privilege roles." },
    { title: "Fleet scale", body: "Operate hundreds of vehicles from a single ground-control workspace." },
    { title: "On-prem or cloud", body: "Deploy in your VPC or air-gapped network with the same operator UI." },
]

const sectionClass =
    "scroll-mt-16 w-full border-b border-white/10"

const sectionInnerClass =
    "mx-auto flex w-full max-w-6xl flex-col items-center px-4 sm:px-6 py-16 md:py-20"

const Landing = () => {
    const navigate = useNavigate()
    const [isLoginOpen, setIsLoginOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    return (
        <div className="w-full min-h-screen bg-black">
            <header className="sticky top-0 z-50 relative flex items-center justify-between gap-4 px-4 sm:px-6 md:px-10 lg:px-16 py-3 sm:py-4 border-b border-white/20 bg-black/90 backdrop-blur-sm">
                <a href="#platform" className="shrink-0 flex items-center gap-2 sm:gap-2.5 text-xl sm:text-2xl font-bold tracking-tight text-white hover:opacity-95 transition-opacity">
                    <AeroLogo className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" size={24} />
                    <span>AeroNexus</span>
                </a>
                <nav className="absolute left-1/2 hidden -translate-x-1/2 md:flex items-center gap-6 lg:gap-10 text-sm">
                    {navItems.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={() => setIsLoginOpen(true)}
                        className="h-8 sm:h-9 whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm font-medium text-gray-300 hover:text-white border border-cyan-400 rounded-[6px] transition-colors"
                    >
                        Sign in
                    </button>
                    <button
                        type="button"
                        className="hidden sm:inline-flex items-center justify-center h-8 sm:h-9 whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-[6px] bg-cyan-400 text-black hover:bg-cyan-300 transition-colors"
                    >
                        Request Demo
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                        className="flex md:hidden items-center justify-center w-8 h-8 rounded-md bg-[#121A24] border border-[#1E2E3E] text-cyan-400 hover:bg-[#1A2634] transition"
                        aria-label="Toggle navigation menu"
                    >
                        {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                </div>
            </header>

            {/* Mobile Navigation Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-x-0 top-[53px] sm:top-[65px] z-40 bg-black/95 border-b border-cyan-400/30 p-5 md:hidden backdrop-blur-md shadow-2xl">
                    <nav className="flex flex-col gap-4">
                        {navItems.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-base font-medium text-white/80 hover:text-cyan-400 py-1 transition-colors"
                            >
                                {item.label}
                            </a>
                        ))}
                        <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMobileMenuOpen(false)
                                    setIsLoginOpen(true)
                                }}
                                className="w-full py-2.5 text-center text-sm font-semibold rounded-[6px] border border-cyan-400 text-white hover:bg-cyan-400/10 transition"
                            >
                                Sign In to GCS
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-full py-2.5 text-center text-sm font-semibold rounded-[6px] bg-cyan-400 text-black hover:bg-cyan-300 transition"
                            >
                                Request Demo
                            </button>
                        </div>
                    </nav>
                </div>
            )}

            <main className="w-full">
                <section
                    id="platform"
                    className="scroll-mt-24 w-full border-b border-white/10"
                >
                    <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 sm:px-6 pt-12 sm:pt-16 pb-12 sm:pb-16 text-center">
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] text-white">
                            Ground Control.
                            <br />
                            <span className="text-cyan-400">Redefined.</span>
                        </h1>

                        <p className="mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg md:text-xl text-white/70 leading-relaxed px-2">
                            Enterprise UAV fleet operations, real time
                        </p>

                        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto px-4">
                            <button
                                type="button"
                                onClick={() => setIsLoginOpen(true)}
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-black bg-cyan-400 rounded-[6px] hover:bg-cyan-300 transition-colors"
                            >
                                Launch platform
                            </button>
                            <a
                                href="#capabilities"
                                className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-[6px] text-white border border-cyan-400 hover:bg-cyan-400/10 transition-colors text-center"
                            >
                                Explore capabilities
                            </a>
                        </div>

                        <div className="mt-12 sm:mt-16 grid w-full max-w-3xl grid-cols-2 md:grid-cols-4 border border-[#1e3038] bg-[rgba(7,14,18,0.88)]">
                            {stats.map((stat, index) => (
                                <div
                                    key={stat.label}
                                    className={`px-3 sm:px-4 py-4 sm:py-5 ${index < stats.length - 1
                                            ? "md:border-r md:border-[#1e3038]"
                                            : ""
                                        } ${index % 2 === 0 ? "max-md:border-r max-md:border-[#1e3038]" : ""} ${index < 2 ? "max-md:border-b max-md:border-[#1e3038]" : ""
                                        }`}
                                >
                                    <strong className="block font-mono text-[14px] sm:text-[15px] font-bold text-cyan-400">
                                        {stat.value}
                                    </strong>
                                    <span className="mt-1 block text-[8.5px] sm:text-[9px] uppercase tracking-[0.06em] text-[#526873]">
                                        {stat.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 sm:mt-16 w-full max-w-5xl">
                            <img
                                src={DashboardImg}
                                alt="Dashboard preview"
                                className="mx-auto w-full h-auto rounded-xl border border-[#1e3038]"
                            />
                        </div>
                    </div>
                </section>

                <section id="capabilities" className={sectionClass}>
                    <div className={sectionInnerClass}>
                        <p className="text-xs uppercase tracking-[0.18em] text-cyan-400">Platform Capabilities</p>
                        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-white">
                            One command layer.
                            <br />
                            Every mission surface.
                        </h2>
                        <p className="mt-4 max-w-2xl text-white/65 leading-relaxed text-center">
                            Designed around the way operators actually work: see the mission, understand the vehicle, act quickly, and keep a complete record.
                        </p>
                        <div className="mt-12 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {capabilities.map((item) => {
                                const Icon = item.icon
                                return (
                                    <article
                                        key={item.code}
                                        className="border border-[#1e3038] bg-[rgba(7,14,18,0.88)] p-6 text-left"
                                    >
                                        <Icon
                                            className="size-5 text-cyan-400"
                                            strokeWidth={1.75}
                                            aria-hidden
                                        />
                                        <div className="mt-4 flex items-baseline justify-between gap-3">
                                            <h3 className="text-lg font-semibold text-white">
                                                {item.title}
                                            </h3>
                                            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-[#526873]">
                                                {item.code}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm leading-relaxed text-white/60">
                                            {item.body}
                                        </p>
                                    </article>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <section id="mission-flow" className={sectionClass}>
                    <div className={sectionInnerClass}>
                        <p className="text-xs uppercase tracking-[0.18em] text-cyan-400">Connected Mission Lifecucle</p>
                        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-white">
                            Plan. Fyl. Respond. Learn.
                        </h2>
                        <p className="mt-4 max-w-2xl text-white/65 leading-relaxed text-center">
                            Every stage of the operation stays connected, giving operators context before launch and a traceable record after landing.
                        </p>
                        <ol className="mt-12 grid w-full grid-cols-1 md:grid-cols-4 border border-[#1e3038] bg-[rgba(7,14,18,0.88)]">
                            {missionSteps.map((item, index) => (
                                <li
                                    key={item.step}
                                    className={`p-6 text-left ${index !== 0
                                            ? "border-t md:border-t-0 md:border-l border-[#1e3038]"
                                            : ""
                                        }`}
                                >
                                    <span className="font-mono text-sm font-bold text-cyan-400">{item.step}</span>
                                    <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-white/60">{item.body}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section id="enterprise" className={`${sectionClass} border-b-0`}>
                    <div className={`${sectionInnerClass} pb-24`}>
                        <p className="text-xs uppercase tracking-[0.18em] text-cyan-400">Enterprise</p>
                        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-white">
                            Ready for regulated operations
                        </h2>
                        <p className="mt-4 max-w-2xl text-white/65 leading-relaxed">
                            Access control, scale, and deployment options for organizations that cannot treat GCS as a toy.
                        </p>
                        <div className="mt-12 grid w-full gap-4 md:grid-cols-3">
                            {enterprisePoints.map((item) => (
                                <article
                                    key={item.title}
                                    className="border border-[#1e3038] bg-[rgba(7,14,18,0.88)] p-6 text-left"
                                >
                                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-white/60">{item.body}</p>
                                </article>
                            ))}
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-5">
                            <button className="px-5 py-2.5 text-sm font-semibold rounded-[6px] bg-cyan-400 text-black hover:bg-cyan-300 transition-colors">
                                Request Demo
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <LoginModal
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                onSuccess={() => {
                    setIsLoginOpen(false)
                    navigate("/dashboard")
                }}
            />
        </div>
    )
}

export default Landing
