import { useEffect } from "react"
import { CheckCircle2, Video, Camera, ImageDown, X } from "lucide-react"

/**
 * High-Tech HUD Toast for Capture and Recording Confirmations
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

  const getIcon = () => {
    switch (toast.type) {
      case "video":
        return <Video className="w-4 h-4 text-[#FF4141]" />
      case "photo":
        return <Camera className="w-4 h-4 text-[#35E0FF]" />
      case "screenshot":
        return <ImageDown className="w-4 h-4 text-[#2FE089]" />
      default:
        return <CheckCircle2 className="w-4 h-4 text-[#35E0FF]" />
    }
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-bounce-short">
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[#080C14F2] border border-[#223240] text-white shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-md">
        <div className="p-1 rounded bg-[#162230] border border-[#233544]">
          {getIcon()}
        </div>

        <div className="flex flex-col text-left">
          <span className="text-[10px] font-semibold text-[#8E9EAA] uppercase tracking-wider font-mono">
            {toast.title || "Capture Successful"}
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
