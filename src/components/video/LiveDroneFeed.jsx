import { useState, useEffect, useRef, useCallback } from "react"
import {
  RotateCw,
  Maximize,
  Minimize,
  PictureInPicture2,
  VideoOff,
  Radio,
  Wifi,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth.js"
import { useWhepPlayer } from "@/hooks/useWhepPlayer.js"
import { videoService, getStreamIdFromDroneId } from "@/services/videoService.js"

/**
 * LiveDroneFeed Component
 * Renders real-time WebRTC / WHEP video stream from MediaMTX
 * for the selected drone camera with AeroNexus dark/cyan aerospace HUD design.
 *
 * @param {Object} props
 * @param {string} props.droneId - Selected drone identifier (e.g. "DRONE-001")
 * @param {string} [props.cameraType="main"] - Camera stream mode ("main" or "fpv")
 * @param {string} [props.className=""] - Optional wrapper container CSS classes
 */
export function LiveDroneFeed({ droneId = "DRONE-001", cameraType = "main", className = "" }) {
  const containerRef = useRef(null)
  const isUnmountedRef = useRef(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [streamInfo, setStreamInfo] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)

  const { token, isAuthenticated } = useAuth()
  const streamId = getStreamIdFromDroneId(droneId, cameraType)

  // Fetch Stream Metadata from Backend Video API
  const fetchStreamMetadata = useCallback(() => {
    if (!token && !isAuthenticated) {
      setFetchError("No authentication token available")
      setStreamInfo(null)
      setIsFetchingMetadata(false)
      return
    }

    setIsFetchingMetadata(true)
    setFetchError(null)

    if (import.meta.env?.DEV) {
      console.log(`[LiveDroneFeed] Requesting stream metadata for drone: ${droneId} (${streamId})`)
    }

    videoService
      .getVideoStream(streamId)
      .then((data) => {
        if (!isUnmountedRef.current) {
          setStreamInfo(data)
          setFetchError(null)
          setIsFetchingMetadata(false)
        }
      })
      .catch((err) => {
        if (!isUnmountedRef.current) {
          const status = err?.status
          let friendlyMsg = "Camera stream currently offline"
          if (status === 401) {
            friendlyMsg = "Unauthorized: Session expired"
          } else if (status === 403) {
            friendlyMsg = "Access Denied to camera feed"
          } else if (status === 404) {
            friendlyMsg = "Camera stream not found"
          } else if (err?.isNetworkError) {
            friendlyMsg = "Video service unreachable"
          }

          if (import.meta.env?.DEV) {
            console.warn(`[LiveDroneFeed] Failed to resolve stream for ${streamId}:`, err.message)
          }
          setFetchError(friendlyMsg)
          setStreamInfo(null)
          setIsFetchingMetadata(false)
        }
      })
  }, [droneId, streamId, token, isAuthenticated])

  // Refetch metadata asynchronously whenever droneId, streamId, or auth token changes
  useEffect(() => {
    isUnmountedRef.current = false
    const timer = setTimeout(() => {
      if (!isUnmountedRef.current) {
        fetchStreamMetadata()
      }
    }, 0)

    return () => {
      isUnmountedRef.current = true
      clearTimeout(timer)
    }
  }, [fetchStreamMetadata])

  // Extract WHEP URL from backend stream metadata
  const webrtcUrl = streamInfo?.webrtcUrl || null

  // WebRTC WHEP Player Hook
  const {
    videoRef,
    isPlaying,
    isLoading: isPlayerLoading,
    error: playerError,
    connectionState,
    retry: retryPlayer,
  } = useWhepPlayer({
    webrtcUrl,
    enabled: Boolean(webrtcUrl && (token || isAuthenticated)),
  })

  // Fullscreen support
  const toggleFullscreen = useCallback(async (e) => {
    e?.stopPropagation()
    const elem = containerRef.current
    if (!elem) return

    try {
      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen()
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen()
        }
        setIsFullscreen(true)
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen()
        }
        setIsFullscreen(false)
      }
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.debug("[LiveDroneFeed] Fullscreen error:", err)
      }
    }
  }, [])

  // Picture-in-Picture support
  const canPip =
    typeof document !== "undefined" &&
    Boolean(document.pictureInPictureEnabled) &&
    typeof HTMLVideoElement !== "undefined"

  const togglePip = useCallback(
    async (e) => {
      e?.stopPropagation()
      const video = videoRef.current
      if (!video) return

      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture()
        } else if (video !== document.pictureInPictureElement) {
          await video.requestPictureInPicture()
        }
      } catch (err) {
        if (import.meta.env?.DEV) {
          console.debug("[LiveDroneFeed] PiP error:", err)
        }
      }
    },
    [videoRef]
  )

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement === containerRef.current))
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Manual Refresh / Retry
  const handleRetry = useCallback(
    (e) => {
      e?.stopPropagation()
      if (!streamInfo) {
        fetchStreamMetadata()
      } else {
        retryPlayer()
      }
    },
    [streamInfo, fetchStreamMetadata, retryPlayer]
  )

  // Combined Loading & Error States
  const isLoading = isFetchingMetadata || isPlayerLoading
  const effectiveError = fetchError || playerError

  // Determine HUD Status Badge
  const getStatusBadge = () => {
    if (isPlaying && connectionState === "connected") {
      return {
        label: "LIVE",
        dotClass: "bg-[#2FE089] shadow-[0_0_8px_#2FE089] animate-pulse",
        textClass: "text-[#2FE089]",
        borderClass: "border-[#2FE08940] bg-[#08120ECC]",
      }
    }
    if (isLoading || connectionState === "connecting" || connectionState === "reconnecting") {
      return {
        label: "CONNECTING...",
        dotClass: "bg-[#F59E0B] shadow-[0_0_8px_#F59E0B] animate-ping",
        textClass: "text-[#F59E0B]",
        borderClass: "border-[#F59E0B40] bg-[#140F08CC]",
      }
    }
    if (effectiveError || connectionState === "failed" || connectionState === "offline") {
      return {
        label: "OFFLINE",
        dotClass: "bg-[#FF4D4D] shadow-[0_0_6px_#FF4D4D]",
        textClass: "text-[#FF8585]",
        borderClass: "border-[#5E2222] bg-[#140808CC]",
      }
    }
    return {
      label: "STANDBY",
      dotClass: "bg-[#35E0FF] shadow-[0_0_6px_#35E0FF]",
      textClass: "text-[#35E0FF]",
      borderClass: "border-[#1A5A68] bg-[#080E14CC]",
    }
  }

  const status = getStatusBadge()

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-[#04070B] select-none ${className}`}
    >
      {/* HTML5 Live WebRTC Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* OFFLINE / STANDBY / CONNECTING HUD PLACEHOLDER (Visible when not actively playing) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-[#05080C] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0A131E] via-[#05080C] to-[#020406]">
          {/* Subtle Aerospace Reticle Background */}
          <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
            <div className="w-36 h-36 rounded-full border border-dashed border-[#35E0FF44]" />
            <div className="w-20 h-20 rounded-full border border-[#35E0FF33]" />
            <div className="absolute w-44 h-[1px] bg-[#35E0FF33]" />
            <div className="absolute h-44 w-[1px] bg-[#35E0FF33]" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-2 max-w-[85%]">
            {isLoading ? (
              <Radio className="w-6 h-6 text-[#F59E0B] animate-pulse" />
            ) : effectiveError ? (
              <VideoOff className="w-6 h-6 text-[#FF6B7A]" />
            ) : (
              <Radio className="w-6 h-6 text-[#35E0FF]" />
            )}

            <div className="flex flex-col items-center">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#64748B]">
                {droneId} • {streamId}
              </span>
              <p className="font-mono text-[10px] sm:text-[11px] font-semibold text-[#CBD5E1] mt-0.5">
                {isLoading
                  ? "Connecting to camera..."
                  : effectiveError || "Camera stream currently offline"}
              </p>
            </div>

            {/* Quick Action Button */}
            {!isLoading && (
              <button
                type="button"
                onClick={handleRetry}
                className="mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#35E0FF1A] border border-[#35E0FF4D] text-[#35E0FF] hover:bg-[#35E0FF2E] hover:border-[#35E0FF] font-mono text-[9px] font-bold shadow-[0_0_8px_rgba(53,224,255,0.15)] transition active:scale-95 cursor-pointer"
                title="Retry connecting to WebRTC stream"
              >
                <RotateCw className="w-2.5 h-2.5" />
                <span>RETRY FEED</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TOP HUD BAR: Status Badge (Left) & Controls (Right) */}
      <div className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between pointer-events-none">
        {/* Status Pill Badge */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border backdrop-blur-md shadow-lg pointer-events-auto transition-all ${status.borderClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
          <span className={`font-mono text-[8px] sm:text-[9px] font-bold tracking-wider ${status.textClass}`}>
            {status.label}
          </span>
          <span className="text-[#475569] font-mono text-[8px] hidden xs:inline">|</span>
          <span className="text-[#94A3B8] font-mono text-[8px] hidden xs:inline uppercase">
            {cameraType}
          </span>
        </div>

        {/* Video Control Action Overlay */}
        <div className="flex items-center gap-1 bg-[#080C14CC] border border-[#1E293B] rounded-md p-0.5 backdrop-blur-md shadow-lg pointer-events-auto">
          {/* Refresh / Retry */}
          <button
            type="button"
            onClick={handleRetry}
            className={`p-1 rounded text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#35E0FF1A] transition active:scale-95 cursor-pointer ${
              isLoading ? "animate-spin text-[#35E0FF]" : ""
            }`}
            title="Refresh stream connection"
            aria-label="Refresh video stream"
          >
            <RotateCw className="w-3 h-3" />
          </button>

          {/* Picture-in-Picture */}
          {canPip && isPlaying && (
            <button
              type="button"
              onClick={togglePip}
              className="p-1 rounded text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#35E0FF1A] transition active:scale-95 cursor-pointer"
              title="Pop out in Picture-in-Picture"
              aria-label="Picture-in-Picture"
            >
              <PictureInPicture2 className="w-3 h-3" />
            </button>
          )}

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1 rounded text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#35E0FF1A] transition active:scale-95 cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="w-3 h-3" />
            ) : (
              <Maximize className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* BOTTOM-LEFT STREAM TELEMETRY HUD OVERLAY (When Playing) */}
      {isPlaying && (
        <div className="absolute bottom-2 left-2 z-20 pointer-events-none flex items-center gap-2 px-2 py-0.5 rounded bg-[#06090ECC] border border-[#16222F] backdrop-blur-sm text-[8px] font-mono text-[#8E9EAA]">
          <div className="flex items-center gap-1 text-[#2FE089]">
            <Wifi className="w-2.5 h-2.5" />
            <span className="font-semibold">WHEP</span>
          </div>
          <span className="text-[#334155]">•</span>
          <span className="text-[#35E0FF] font-semibold uppercase">{droneId}</span>
        </div>
      )}
    </div>
  )
}

export default LiveDroneFeed
