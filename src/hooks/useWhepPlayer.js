import { useState, useEffect, useRef, useCallback } from "react"

const RETRY_DELAYS = [1000, 2000, 4000, 10000]
const MAX_AUTO_RETRIES = 4
const ICE_GATHERING_TIMEOUT_MS = 2500

/**
 * Reusable WebRTC / WHEP Player Hook
 * Manages RTCPeerConnection lifecycle, SDP offer/answer negotiation with MediaMTX,
 * automatic bounded reconnect, and track binding to an HTML5 <video> element.
 *
 * @param {Object} options
 * @param {string|null} options.webrtcUrl - Full WHEP endpoint URL (e.g. "http://localhost:8889/drone-001-camera/whep")
 * @param {boolean} [options.enabled=true] - Toggle active playback
 * @param {Function} [options.onStatusChange] - Optional status change callback
 * @returns {Object} { videoRef, isPlaying, isLoading, error, connectionState, retry }
 */
export function useWhepPlayer({ webrtcUrl, enabled = true, onStatusChange } = {}) {
  const videoRef = useRef(null)
  const pcRef = useRef(null)
  const retryTimeoutRef = useRef(null)
  const retryCountRef = useRef(0)
  const isUnmountedRef = useRef(false)
  const activeNegotiationIdRef = useRef(0)
  const connectRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [connectionState, setConnectionState] = useState("idle") // 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'offline'

  const updateState = useCallback(
    (newState, err = null) => {
      if (isUnmountedRef.current) return
      setConnectionState(newState)
      if (err !== undefined) setError(err)
      onStatusChange?.(newState, err)
    },
    [onStatusChange]
  )

  /**
   * Complete teardown of active WebRTC PeerConnection & video source
   */
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (pcRef.current) {
      try {
        const pc = pcRef.current
        pc.ontrack = null
        pc.onicecandidate = null
        pc.oniceconnectionstatechange = null
        pc.onconnectionstatechange = null
        pc.onicegatheringstatechange = null
        pc.close()
      } catch (err) {
        if (import.meta.env?.DEV) {
          console.debug("[WHEP] Error closing peer connection:", err)
        }
      }
      pcRef.current = null
    }

    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null
      } catch {
        // Ignore
      }
    }

    setIsPlaying(false)
  }, [])

  /**
   * Schedule bounded exponential backoff reconnect
   */
  const scheduleReconnect = useCallback(
    (reason) => {
      cleanup()

      if (isUnmountedRef.current || !enabled || !webrtcUrl) {
        updateState("offline", null)
        return
      }

      if (retryCountRef.current < MAX_AUTO_RETRIES) {
        const delay = RETRY_DELAYS[retryCountRef.current] || 10000
        retryCountRef.current += 1

        if (import.meta.env?.DEV) {
          console.log(
            `[WHEP] Connection disrupted (${reason}). Retrying in ${delay / 1000}s (attempt ${retryCountRef.current}/${MAX_AUTO_RETRIES})...`
          )
        }

        updateState("reconnecting", "WebRTC connection lost. Retrying...")
        setIsLoading(true)

        retryTimeoutRef.current = setTimeout(() => {
          if (!isUnmountedRef.current) {
            connectRef.current?.()
          }
        }, delay)
      } else {
        if (import.meta.env?.DEV) {
          console.warn("[WHEP] Max reconnect attempts reached. Switching to offline.")
        }
        updateState("offline", "Camera stream currently offline")
        setIsLoading(false)
      }
    },
    [cleanup, enabled, webrtcUrl, updateState]
  )

  /**
   * Initiate WHEP WebRTC negotiation
   */
  const connect = useCallback(async () => {
    cleanup()

    // Yield to microtask so setState is not invoked synchronously within effect call
    await Promise.resolve()
    if (isUnmountedRef.current) return

    if (!enabled || !webrtcUrl) {
      updateState("idle", null)
      setIsLoading(false)
      return
    }

    const negotiationId = ++activeNegotiationIdRef.current
    setIsLoading(true)
    setError(null)
    updateState("connecting")

    if (typeof RTCPeerConnection === "undefined") {
      updateState("failed", "WebRTC is not supported in this browser")
      setIsLoading(false)
      return
    }

    try {
      if (import.meta.env?.DEV) {
        console.log(`[WHEP] [${negotiationId}] Creating peer connection for:`, webrtcUrl)
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
        bundlePolicy: "max-bundle",
      })
      pcRef.current = pc

      // Add receiving video transceiver only
      pc.addTransceiver("video", {
        direction: "recvonly",
      })

      // Track incoming video
      pc.ontrack = (event) => {
        if (activeNegotiationIdRef.current !== negotiationId) return
        if (import.meta.env?.DEV) {
          console.log(`[WHEP] [${negotiationId}] Video track received`)
        }

        if (event.streams && event.streams[0] && videoRef.current) {
          videoRef.current.srcObject = event.streams[0]
          setIsPlaying(true)
          setIsLoading(false)
          setError(null)
          updateState("connected")
          retryCountRef.current = 0 // Reset retry counter upon successful playback
        }
      }

      // Monitor PeerConnection state
      pc.onconnectionstatechange = () => {
        if (activeNegotiationIdRef.current !== negotiationId) return
        const state = pc.connectionState
        if (import.meta.env?.DEV) {
          console.log(`[WHEP] [${negotiationId}] Connection state changed: ${state}`)
        }

        if (state === "connected") {
          setIsLoading(false)
          setError(null)
          updateState("connected")
          retryCountRef.current = 0
        } else if (state === "failed") {
          scheduleReconnect("peer connection failed")
        } else if (state === "disconnected") {
          scheduleReconnect("peer connection disconnected")
        }
      }

      // Monitor ICE connection state
      pc.oniceconnectionstatechange = () => {
        if (activeNegotiationIdRef.current !== negotiationId) return
        const iceState = pc.iceConnectionState
        if (import.meta.env?.DEV) {
          console.log(`[WHEP] [${negotiationId}] ICE connection state: ${iceState}`)
        }

        if (iceState === "failed") {
          scheduleReconnect("ICE connection failed")
        } else if (iceState === "disconnected") {
          scheduleReconnect("ICE disconnected")
        }
      }

      // Create and set local SDP offer
      if (import.meta.env?.DEV) {
        console.log(`[WHEP] [${negotiationId}] Creating SDP offer`)
      }
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Wait for ICE gathering to complete with safe timeout
      await new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve()
          return
        }

        let resolved = false
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true
            if (import.meta.env?.DEV) {
              console.debug(`[WHEP] [${negotiationId}] ICE gathering timeout reached, proceeding`)
            }
            resolve()
          }
        }, ICE_GATHERING_TIMEOUT_MS)

        const handleIceState = () => {
          if (pc.iceGatheringState === "complete" && !resolved) {
            resolved = true
            clearTimeout(timer)
            pc.removeEventListener("icegatheringstatechange", handleIceState)
            resolve()
          }
        }
        pc.addEventListener("icegatheringstatechange", handleIceState)
      })

      if (activeNegotiationIdRef.current !== negotiationId) return

      // POST offer to WHEP endpoint
      if (import.meta.env?.DEV) {
        console.log(`[WHEP] [${negotiationId}] Sending SDP offer to: ${webrtcUrl}`)
      }

      const response = await fetch(webrtcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
        },
        body: pc.localDescription?.sdp || offer.sdp,
      })

      if (activeNegotiationIdRef.current !== negotiationId) return

      if (!response.ok && response.status !== 201) {
        throw new Error(`Media server returned HTTP ${response.status}`)
      }

      const answerSdp = await response.text()
      if (import.meta.env?.DEV) {
        console.log(`[WHEP] [${negotiationId}] SDP answer received`)
      }

      if (!answerSdp || !answerSdp.includes("v=")) {
        throw new Error("Invalid SDP answer received from media server")
      }

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      })

      if (import.meta.env?.DEV) {
        console.log(`[WHEP] [${negotiationId}] Remote description set. Connection established`)
      }
    } catch (err) {
      if (activeNegotiationIdRef.current !== negotiationId) return

      if (import.meta.env?.DEV) {
        console.warn(`[WHEP] [${negotiationId}] WebRTC connection negotiation error:`, err.message)
      }

      // Do not expose raw technical stack traces to the user
      scheduleReconnect("negotiation failed")
    }
  }, [cleanup, enabled, webrtcUrl, updateState, scheduleReconnect])

  // Keep connectRef up to date
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  /**
   * Manual user retry action: resets counter and restarts connection immediately
   */
  const retry = useCallback(() => {
    retryCountRef.current = 0
    connect()
  }, [connect])

  // Lifecycle: connect whenever webrtcUrl or enabled changes, clean up on unmount
  useEffect(() => {
    isUnmountedRef.current = false
    retryCountRef.current = 0

    let timer = null
    if (enabled && webrtcUrl) {
      timer = setTimeout(() => {
        if (!isUnmountedRef.current) {
          connect()
        }
      }, 0)
    }

    return () => {
      isUnmountedRef.current = true
      if (timer) clearTimeout(timer)
      cleanup()
    }
  }, [webrtcUrl, enabled, connect, cleanup])

  return {
    videoRef,
    isPlaying,
    isLoading,
    error,
    connectionState,
    retry,
  }
}

export default useWhepPlayer
