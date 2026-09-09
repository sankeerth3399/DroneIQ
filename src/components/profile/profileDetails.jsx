import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import UserBold from "@/assets/images/userBold.svg"
import { useAuth } from "@/context/AuthContext.jsx"

const getLoggedInUser = (user) => {
    const username = user?.username || localStorage.getItem("firstName") || "Operator"
    const role = user?.role || localStorage.getItem("role") || "Pilot"

    return {
        firstName: username,
        lastName: "",
        role,
        fullName: username,
        initials: username.slice(0, 2).toUpperCase() || "OP",
    }
}

const ProfileDropdown = () => {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const [open, setOpen] = useState(false)
    const containerRef = useRef(null)
    const { firstName, role, fullName, initials } = getLoggedInUser(user)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleLogout = () => {
        logout()
        setOpen(false)
        navigate("/")
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex justify-center items-center w-9 h-9 xl:w-[34px] xl:h-[34px] bg-[#171F27] rounded-[8px] hover:bg-[#E8EDF3] transition"
                aria-label="Open profile"
                aria-expanded={open}
            >
                <img src={UserBold} alt="userIcon" className="w-5 h-5" />
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] rounded-[10px] border border-[#E5E7EB] bg-white shadow-[0_8px_24px_rgba(17,23,38,0.12)] overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F1F2F5]">
                        <div className="flex justify-center items-center w-10 h-10 shrink-0 rounded-full bg-[#059EB2] text-white text-[13px] font-semibold">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[14px] text-[#111726] font-semibold truncate">{fullName}</p>
                            <p className="text-[12px] text-[#707A8C] font-normal truncate capitalize">{role || "—"}</p>
                        </div>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                        <div>
                            <p className="text-[11px] text-[#707A8C] font-normal">First name</p>
                            <p className="text-[13px] text-[#111726] font-medium truncate">{firstName || "—"}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-[#707A8C] font-normal">Last name</p>
                            <p className="text-[13px] text-[#111726] font-medium truncate">{lastName || "—"}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-[#707A8C] font-normal">Role</p>
                            <p className="text-[13px] text-[#111726] font-medium truncate capitalize">{role || "—"}</p>
                        </div>
                    </div>
                    <div className="border-t border-[#F1F2F5] p-2">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] text-[#DC2626] font-medium hover:bg-[#FEF2F2] transition"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProfileDropdown
