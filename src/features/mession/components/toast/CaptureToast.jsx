import { useEffect } from "react"
import { CheckCircle2, Video, Camera, ImageDown, AlertCircle, X } from "lucide-react"

/**
 * High-Tech HUD Toast for Capture and Recording Confirmations and Errors
 */
export const CaptureToast = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      onDismiss()
    }, 3200)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null

  const isError = toast.type === "error"

  const getIcon = () => {
    switch (toast.type) {
      case "video":
        return <Video className="w-4 h-4 text-[#FF4141]" />
      case "photo":
        return <Camera className="w-4 h-4 text-[#35E0FF]" />
      case "screenshot":
        return <ImageDown className="w-4 h-4 text-[#2FE089]" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-[#FF4141]" />
      default:
        return <CheckCircle2 className="w-4 h-4 text-[#35E0FF]" />
    }
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-bounce-short">
      <div
        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[#080C14F2] border text-white shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-md ${
          isError ? "border-[#5E2222] shadow-[0_8px_24px_rgba(255,65,65,0.25)]" : "border-[#223240]"
        }`}
      >
        <div
          className={`p-1 rounded border ${
            isError ? "bg-[#251010] border-[#5E2222]" : "bg-[#162230] border-[#233544]"
          }`}
        >
          {getIcon()}
        </div>

        <div className="flex flex-col text-left">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider font-mono ${
              isError ? "text-[#FF8585]" : "text-[#8E9EAA]"
            }`}
          >
            {toast.title || (isError ? "Action Failed" : "Capture Successful")}
          </span>
          <span className="text-[12px] font-medium text-[#EEF4F8] font-mono">
            {toast.message}
          </span>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="ml-2 p-1 text-[#64748B] hover:text-[#EEF4F8] transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default CaptureToast
