import { useState, useEffect, useCallback } from "react"
import { analyticsService } from "@/services/api/analyticsService.js"
import { droneService } from "@/services/api/droneService.js"
import { projectService } from "@/services/projectService.js"
import { userService } from "@/services/api/userService.js"
import { useTelemetry } from "@/hooks/useTelemetry.js"

const DEFAULT_FILTERS = {
  range: "Last 7 Days",
  droneId: "ALL",
  missionId: "ALL",
  operator: "ALL",
  flightMode: "ALL",
  missionStatus: "ALL",
  startDate: "",
  endDate: "",
}

export function useAnalytics() {
  const { isLive, selectedDroneId } = useTelemetry()

  // activeDashboard: null = Analytics Landing Page, string = Detailed Dashboard ID
  const [activeDashboard, setActiveDashboard] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const navigateToDashboard = useCallback((dashboardId) => {
    setActiveDashboard(dashboardId)
  }, [])

  const navigateToLanding = useCallback(() => {
    setActiveDashboard(null)
  }, [])

  // Primary analytical datasets
  const [fleetData, setFleetData] = useState(null)
  const [flightData, setFlightData] = useState(null)
  const [missionData, setMissionData] = useState(null)
  const [telemetryData, setTelemetryData] = useState(null)
  const [batteryData, setBatteryData] = useState(null)
  const [incidentData, setIncidentData] = useState(null)
  const [operatorData, setOperatorData] = useState(null)
  const [flightHistory, setFlightHistory] = useState([])

  // Selection state
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [flightDetail, setFlightDetail] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Filter dropdown data
  const [drones, setDrones] = useState([])
  const [missions, setMissions] = useState([])
  const [operators, setOperators] = useState([])

  // Status
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        const [
          fleetRes,
          flightRes,
          missionRes,
          telemRes,
          batteryRes,
          incidentRes,
          operatorRes,
          historyRes,
          dronesRes,
          usersRes,
        ] = await Promise.all([
          analyticsService.getFleetOverview(filters),
          analyticsService.getFlightAnalytics(filters),
          analyticsService.getMissionAnalytics(filters),
          analyticsService.getTelemetryHealth(filters),
          analyticsService.getBatteryAnalytics(filters),
          analyticsService.getSafetyIncidents(filters),
          analyticsService.getOperatorActivity(filters),
          analyticsService.getFlightHistory(filters),
          droneService.getDrones(),
          userService.getUsers(),
        ])

        if (!active) return

        setFleetData(fleetRes)
        setFlightData(flightRes)
        setMissionData(missionRes)
        setTelemetryData(telemRes)
        setBatteryData(batteryRes)
        setIncidentData(incidentRes)
        setOperatorData(operatorRes)
        setFlightHistory(historyRes.flights || [])

        setDrones(Array.isArray(dronesRes) ? dronesRes : [])
        setMissions(projectService.getProjects() || [])
        setOperators(Array.isArray(usersRes) ? usersRes : [])
      } catch (err) {
        if (!active) return
        console.error("[useAnalytics] Loading error:", err)
        setError("Failed to load analytics data. Please retry.")
      } finally {
        if (active) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    run()

    return () => {
      active = false
    }
  }, [filters])

  const refreshAnalytics = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const [
        fleetRes,
        flightRes,
        missionRes,
        telemRes,
        batteryRes,
        incidentRes,
        operatorRes,
        historyRes,
        dronesRes,
        usersRes,
      ] = await Promise.all([
        analyticsService.getFleetOverview(filters),
        analyticsService.getFlightAnalytics(filters),
        analyticsService.getMissionAnalytics(filters),
        analyticsService.getTelemetryHealth(filters),
        analyticsService.getBatteryAnalytics(filters),
        analyticsService.getSafetyIncidents(filters),
        analyticsService.getOperatorActivity(filters),
        analyticsService.getFlightHistory(filters),
        droneService.getDrones(),
        userService.getUsers(),
      ])

      setFleetData(fleetRes)
      setFlightData(flightRes)
      setMissionData(missionRes)
      setTelemetryData(telemRes)
      setBatteryData(batteryRes)
      setIncidentData(incidentRes)
      setOperatorData(operatorRes)
      setFlightHistory(historyRes.flights || [])

      setDrones(Array.isArray(dronesRes) ? dronesRes : [])
      setMissions(projectService.getProjects() || [])
      setOperators(Array.isArray(usersRes) ? usersRes : [])
    } catch (err) {
      console.error("[useAnalytics] Refresh error:", err)
      setError("Failed to refresh analytics data.")
    } finally {
      setIsRefreshing(false)
    }
  }, [filters])

  // Filter controls
  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }))
  }

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const handleApplyFilters = () => {
    refreshAnalytics()
  }

  // Drill-down flight selection
  const handleSelectFlight = async (flight) => {
    setSelectedFlight(flight)
    setIsDetailOpen(true)
    try {
      const detail = await analyticsService.getFlightDetail(flight.id)
      setFlightDetail(detail)
    } catch {
      setFlightDetail({ flight, telemetrySamples: [] })
    }
  }

  const handleCloseDetail = () => {
    setIsDetailOpen(false)
    setSelectedFlight(null)
    setFlightDetail(null)
  }

  // Export handler
  const handleExport = (format = "csv") => {
    if (format === "report") {
      window.print()
      return
    }
    analyticsService.exportData(format, flightHistory, `aeronexus_${activeDashboard}_analytics`)
  }

  return {
    isLive,
    selectedDroneId,
    activeDashboard,
    setActiveDashboard,
    navigateToDashboard,
    navigateToLanding,
    filters,
    handleFilterChange,
    handleResetFilters,
    handleApplyFilters,
    fleetData,
    flightData,
    missionData,
    telemetryData,
    batteryData,
    incidentData,
    operatorData,
    flightHistory,
    drones,
    missions,
    operators,
    selectedFlight,
    flightDetail,
    isDetailOpen,
    handleSelectFlight,
    handleCloseDetail,
    isLoading,
    isRefreshing,
    error,
    refresh: refreshAnalytics,
    handleExport,
  }
}

export default useAnalytics
