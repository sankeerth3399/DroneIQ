import { useState, useEffect, useRef } from "react"
import { Video, Square, Camera, ImageDown, Disc, HardDrive } from "lucide-react"

/**
 * High-Tech Camera Controls for Video Recording, Photo Capture, and Screenshot
 * 
 * Features:
 * - Start / Stop Video Recording with live timer and pulsing state indicator
 * - Photo Shutter button with visual flash feedback
 * - Screenshot button with confirmation toast
 * - Media storage and resolution telemetry indicators
 */
export const CameraControls = ({
  onCaptureToast,
  onTriggerFlash,
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [photoCount, setPhotoCount] = useState(1)
  const [screenshotCount, setScreenshotCount] = useState(1)
  const timerRef = useRef(null)

  // Live recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    return `${hrs > 0 ? `${String(hrs).padStart(2, "0")}:` : ""}${String(
      mins
    ).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  // Toggle Video Recording
  const handleToggleRecord = (e) => {
    e.stopPropagation()
    if (!isRecording) {
      setRecordSeconds(0)
      setIsRecording(true)
      onCaptureToast?.({
        type: "video",
        title: "Recording Started",
        message: "Video recording in 4K 60FPS (H.265)",
      })
    } else {
      setIsRecording(false)
      const durationStr = formatTimer(recordSeconds)
      const filename = `VID_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${String(
        Math.floor(Math.random() * 9000 + 1000)
      )}.mp4`
      onCaptureToast?.({
        type: "video",
        title: "Recording Saved",
        message: `${filename} (${durationStr} • ${(recordSeconds * 6.2).toFixed(1)} MB)`,
      })
    }
  }

  // Take Photo
  const handleTakePhoto = (e) => {
    e.stopPropagation()
    onTriggerFlash?.()

    const filename = `IMG_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${String(
      photoCount
    ).padStart(4, "0")}.JPG`
    setPhotoCount((prev) => prev + 1)

    onCaptureToast?.({
      type: "photo",
      title: "Photo Captured",
      message: `${filename} (12.4 MP • RAW+JPG)`,
    })
  }

  // Take Screenshot
  const handleScreenshot = (e) => {
    e.stopPropagation()
    onTriggerFlash?.()

    const filename = `SCREEN_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${String(
      screenshotCount
    ).padStart(3, "0")}.PNG`
    setScreenshotCount((prev) => prev + 1)

    onCaptureToast?.({
      type: "screenshot",
      title: "Screenshot Captured",
      message: `${filename} saved to local gallery`,
    })
  }

  return (
    <div
      className="flex flex-col gap-1.5 p-2 rounded-xl bg-[#080C14E6] border border-[#1E293B] backdrop-blur-md shadow-2xl z-20 pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between gap-2 px-1 text-[9px] font-mono text-[#8E9EAA]">
        <div className="flex items-center gap-1 text-[#35E0FF]">
          <Disc className="w-3 h-3" />
          <span className="font-semibold">CAM REC</span>
        </div>
        <span className="bg-[#121B24] border border-[#233544] px-1 py-0.5 rounded text-[8px] text-[#A0B0BC]">
          4K 60P
        </span>
      </div>

      {/* Recording Status Bar (Active when recording) */}
      {isRecording && (
        <div className="flex items-center justify-between px-2 py-1 rounded bg-[#FF41411A] border border-[#FF41414D] text-[10px] font-mono animate-pulse">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#FF4141] shadow-[0_0_6px_#FF4141]" />
            <span className="font-bold text-[#FF8585]">REC</span>
          </div>
          <span className="font-bold text-[#FFFFFF]">{formatTimer(recordSeconds)}</span>
        </div>
      )}

      {/* Action Buttons Group */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Record Video Button */}
        <button
          type="button"
          onClick={handleToggleRecord}
          className={`flex flex-col items-center justify-center p-2 rounded-lg border transition ${
            isRecording
              ? "bg-[#FF41412A] border-[#FF4141] text-[#FF8585] shadow-[0_0_12px_rgba(255,65,65,0.4)]"
              : "bg-[#111A24] border-[#223344] text-[#E2E8F0] hover:border-[#FF4141] hover:text-[#FF8585]"
          }`}
          title={isRecording ? "Stop Recording" : "Start Video Recording"}
        >
          {isRecording ? (
            <Square className="w-4 h-4 fill-current" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Video className="w-4 h-4" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#FF4141]" />
            </div>
          )}
          <span className="text-[9px] font-mono mt-1 font-medium">
            {isRecording ? "Stop" : "Record"}
          </span>
        </button>

        {/* Photo Button */}
        <button
          type="button"
          onClick={handleTakePhoto}
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#111A24] border border-[#223344] text-[#E2E8F0] hover:border-[#35E0FF] hover:text-[#35E0FF] transition shadow-sm active:scale-95"
          title="Capture High-Res Photo"
        >
          <Camera className="w-4 h-4" />
          <span className="text-[9px] font-mono mt-1 font-medium">Photo</span>
        </button>

        {/* Screenshot Button */}
        <button
          type="button"
          onClick={handleScreenshot}
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#111A24] border border-[#223344] text-[#E2E8F0] hover:border-[#2FE089] hover:text-[#2FE089] transition shadow-sm active:scale-95"
          title="Capture GCS Screenshot"
        >
          <ImageDown className="w-4 h-4" />
          <span className="text-[9px] font-mono mt-1 font-medium">Screen</span>
        </button>
      </div>

      {/* Storage & Codec Footer */}
      <div className="flex items-center justify-between px-1 text-[8px] font-mono text-[#64748B]">
        <div className="flex items-center gap-1">
          <HardDrive className="w-2.5 h-2.5" />
          <span>SD: 128GB</span>
        </div>
        <span className="text-[#35E0FF88]">H.265 / HEVC</span>
      </div>
    </div>
  )
}

export default CameraControls
