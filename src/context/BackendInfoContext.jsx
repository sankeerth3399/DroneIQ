import { useState, useEffect, useCallback, useMemo } from "react"
import { BackendInfoContext } from "./backendInfoContextCore.js"
import { backendInfoService } from "@/services/telemetry/backendInfoService.js"

export const BackendInfoProvider = ({ children }) => {
  const [events, setEvents] = useState(() => backendInfoService.getEvents())
  const [isOpen, setIsOpen] = useState(false)

  // Subscribe to backend event updates from centralized singleton
  useEffect(() => {
    return backendInfoService.subscribe((updatedEvents) => {
      setEvents(updatedEvents)
    })
  }, [])

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const openConsole = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeConsole = useCallback(() => {
    setIsOpen(false)
  }, [])

  const clearEvents = useCallback(() => {
    backendInfoService.clearEvents()
  }, [])

  const addEvent = useCallback((payload, receivedAt) => {
    return backendInfoService.addEvent(payload, receivedAt)
  }, [])

  const value = useMemo(
    () => ({
      events,
      isOpen,
      setIsOpen,
      toggleOpen,
      openConsole,
      closeConsole,
      clearEvents,
      addEvent,
      eventCount: events.length,
    }),
    [events, isOpen, toggleOpen, openConsole, closeConsole, clearEvents, addEvent]
  )

  return (
    <BackendInfoContext.Provider value={value}>
      {children}
    </BackendInfoContext.Provider>
  )
}

export default BackendInfoProvider
