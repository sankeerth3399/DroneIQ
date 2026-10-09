import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  BatteryCharging,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { analyticsService } from "@/services/api/analyticsService.js"

const KPI_CONFIG = [
  { id: "missions", label: "Missions", icon: Route, tone: "blue", keys: ["missions30Days", "totalMissions", "missionCount", "totalFlights", "missions"] },
  { id: "hours", label: "Flight Hours", icon: Clock3, tone: "purple", keys: ["flightHours", "totalFlightHours"] },
  { id: "success", label: "Mission Success", icon: ShieldCheck, tone: "green", keys: ["missionSuccessRate", "successRate"] },
  { id: "data", label: "Data Captured", icon: Database, tone: "navy", keys: ["dataCapturedTb", "dataCapturedTB", "dataCaptured", "totalDataCaptured"] },
  { id: "detections", label: "AI Detections", icon: Sparkles, tone: "orange", keys: ["aiDetections", "totalDetections", "detectionCount", "detections"] },
]

const DETECTION_COLORS = ["#2C7BD9", "#F06B37", "#1FAF7A", "#EDA600", "#E783A8", "#7357D9"]
const OUTCOME_COLORS = { completed: "#1BAA77", late: "#F0AB00", failed: "#E64A4A" }

const useChartInspect = () => {
  const [tooltip, setTooltip] = useState(null)

  const showTooltip = useCallback((event, title, rows, pinned = false) => {
    const pointer = event?.nativeEvent || event
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const tooltipWidth = Math.min(276, viewportWidth - 24)
    const tooltipHeight = 132
    const pointerX = Number.isFinite(pointer?.clientX) ? pointer.clientX : viewportWidth / 2
    const pointerY = Number.isFinite(pointer?.clientY) ? pointer.clientY : viewportHeight / 2
    const left = Math.min(Math.max(12, pointerX + 14), Math.max(12, viewportWidth - tooltipWidth - 12))
    const top = Math.min(Math.max(12, pointerY + 14), Math.max(12, viewportHeight - tooltipHeight - 12))
    setTooltip({ title, rows, left, top, pinned })
  }, [])

  const hideTooltip = useCallback(() => {
    setTooltip((current) => current?.pinned ? current : null)
  }, [])

  useEffect(() => {
    if (!tooltip?.pinned) return undefined
    const timeout = setTimeout(() => setTooltip(null), 4000)
    return () => clearTimeout(timeout)
  }, [tooltip?.pinned, tooltip?.title, tooltip?.left, tooltip?.top])

  return { tooltip, showTooltip, hideTooltip }
}

const ChartTooltip = ({ tooltip }) => {
  if (!tooltip || typeof document === "undefined") return null
  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[9999] w-[min(276px,calc(100vw-24px))] rounded-[7px] border border-[#355278] bg-[#10223D] px-3 py-2.5 text-white shadow-[0_10px_30px_rgba(10,26,49,0.28)]"
      style={{ left: tooltip.left, top: tooltip.top }}
    >
      <p className="mb-1.5 text-[12px] font-semibold leading-4 text-white">{tooltip.title}</p>
      <div className="space-y-1">
        {tooltip.rows.map((row, index) => <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-4 text-[11px] leading-4"><span className="text-[#C0D0E2]">{row.label}</span><strong className="text-right font-semibold text-white">{row.value}</strong></div>)}
      </div>
      {tooltip.pinned && <p className="mt-2 border-t border-white/10 pt-1.5 text-[9px] text-[#A8BDD5]">Tap elsewhere to dismiss</p>}
    </div>,
    document.body
  )
}

const DEMO_ANALYTICS_OVERVIEW = {
  kpis: {
    missions: { value: 548, changePercent: 27, changeLabel: "vs. last month" },
    flightHours: { value: 1140, unit: "hrs" },
    missionSuccessRate: { value: 98, unit: "%" },
    dataCaptured: { value: 6.2, unit: "TB" },
    aiDetections: { value: 312, detail: "92% confirmed on review" },
  },
  missionsPerDayByOutcome: [
    { date: "3 Sep", completed: 32, completedLate: 2, aborted: 1 },
    { date: "4 Sep", completed: 34, completedLate: 3, aborted: 0 },
    { date: "5 Sep", completed: 37, completedLate: 2, aborted: 2 },
    { date: "6 Sep", completed: 36, completedLate: 3, aborted: 0 },
    { date: "7 Sep", completed: 33, completedLate: 2, aborted: 1 },
    { date: "8 Sep", completed: 37, completedLate: 2, aborted: 1 },
    { date: "9 Sep", completed: 35, completedLate: 3, aborted: 0 },
    { date: "10 Sep", completed: 34, completedLate: 2, aborted: 2 },
    { date: "11 Sep", completed: 30, completedLate: 2, aborted: 0 },
    { date: "12 Sep", completed: 36, completedLate: 3, aborted: 2 },
    { date: "13 Sep", completed: 31, completedLate: 2, aborted: 2 },
    { date: "14 Sep", completed: 36, completedLate: 3, aborted: 2 },
    { date: "15 Sep", completed: 34, completedLate: 2, aborted: 1 },
    { date: "16 Sep", completed: 36, completedLate: 3, aborted: 0 },
  ],
  missionsByUseCase: [
    { name: "Infrastructure inspection", count: 142 },
    { name: "Security and perimeter", count: 118 },
    { name: "Highway corridor patrol", count: 96 },
    { name: "Oil and gas assets", count: 64 },
    { name: "Water and canals", count: 58 },
    { name: "Mapping and survey", count: 41 },
    { name: "Emergency response", count: 29 },
  ],
  detectionsByType: [
    { type: "Thermal anomalies", count: 98 },
    { type: "Vehicles and objects", count: 84 },
    { type: "People", count: 52 },
    { type: "Asset defects", count: 46 },
    { type: "Smoke, water, other", count: 32 },
  ],
  fleetUtilization: [
    { date: "3 Sep", percent: 70 }, { date: "4 Sep", percent: 75 },
    { date: "5 Sep", percent: 72 }, { date: "6 Sep", percent: 75 },
    { date: "7 Sep", percent: 68 }, { date: "8 Sep", percent: 75 },
    { date: "9 Sep", percent: 71 }, { date: "10 Sep", percent: 68 },
    { date: "11 Sep", percent: 68 }, { date: "12 Sep", percent: 76 },
    { date: "13 Sep", percent: 76 }, { date: "14 Sep", percent: 69 },
    { date: "15 Sep", percent: 72 }, { date: "16 Sep", percent: 72 },
  ],
  actionableInsights: [
    { title: "Battery swaps account for recurring downtime", description: "Review charging turnaround and battery rotation for the active fleet.", severity: "medium" },
    { title: "Multi-drone missions show higher throughput", description: "Compare coordinated mission duration against single-aircraft routes.", severity: "info" },
    { title: "Review recent geofence events", description: "Inspect boundary events and confirm the configured operational buffers.", severity: "warning" },
  ],
}

const unwrapOverview = (response) => {
  const data = response?.data ?? response
  return data?.overview && typeof data.overview === "object" ? data.overview : data
}

const firstValue = (object, keys) => {
  for (const key of keys) {
    const value = object?.[key]
    if (value !== undefined && value !== null && value !== "") return value
  }
  return null
}

const toNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

const formatMetric = (value, key) => {
  if (value === null || value === undefined || value === "") return "N/A"
  if (typeof value === "object") {
    const raw = firstValue(value, ["value", "total", "count", "amount"])
    if (raw === null) return "N/A"
    const unit = firstValue(value, ["unit", "units"])
    return `${typeof raw === "number" ? raw.toLocaleString() : raw}${unit ? `${unit === "%" ? "" : " "}${unit}` : ""}`
  }
  if (typeof value === "number") {
    const suffix = key === "success" ? "%" : key === "hours" ? " hrs" : ""
    return `${value.toLocaleString()}${suffix}`
  }
  return String(value)
}

const normalizeMissionDays = (overview) => {
  const source = firstValue(overview, ["missionsPerDayByOutcome", "missionsPerDay", "dailyMissionOutcomes", "missionActivityByDay", "activityTrend"])
  if (!Array.isArray(source)) return []
  return source.map((row) => {
    const date = firstValue(row, ["date", "day", "label", "timestamp"])
    const completed = toNumber(firstValue(row, ["completed", "completedOnTime", "successful", "success"]))
    const late = toNumber(firstValue(row, ["completedLate", "completed_late", "late", "lateCompleted"]))
    const failed = toNumber(firstValue(row, ["abortedOrFailed", "aborted", "failed", "cancelled"]))
    return date && (completed !== null || late !== null || failed !== null)
      ? { date: String(date), completed: completed || 0, late: late || 0, failed: failed || 0 }
      : null
  }).filter(Boolean)
}

const normalizeUseCases = (overview) => {
  const source = firstValue(overview, ["missionsByUseCase", "useCaseBreakdown", "missionsByCategory", "missionUseCases"])
  if (!Array.isArray(source)) return []
  return source.map((row) => {
    const label = firstValue(row, ["useCase", "name", "category", "label"])
    const value = toNumber(firstValue(row, ["missions", "count", "total", "value"]))
    const percentage = toNumber(firstValue(row, ["percentage", "percent", "share"]))
    return label && value !== null ? { label: String(label), value, percentage } : null
  }).filter(Boolean)
}

const normalizeDetections = (overview) => {
  const source = firstValue(overview, ["detectionsByType", "detectionTypes", "aiDetectionsByType", "detectionBreakdown"])
  if (!Array.isArray(source)) return []
  return source.map((row, index) => {
    const name = firstValue(row, ["type", "name", "category", "label"])
    const value = toNumber(firstValue(row, ["count", "detections", "total", "value"]))
    return name && value !== null ? { name: String(name), value, color: DETECTION_COLORS[index % DETECTION_COLORS.length] } : null
  }).filter(Boolean)
}

const normalizeUtilization = (overview) => {
  const source = firstValue(overview, ["fleetUtilization", "utilizationTrend", "fleetUtilizationTrend"])
  if (!Array.isArray(source)) return []
  return source.map((row) => {
    const date = firstValue(row, ["date", "day", "label", "timestamp"])
    const value = toNumber(firstValue(row, ["utilizationPercent", "utilization", "percent", "percentage", "value"]))
    return date && value !== null ? { date: String(date), value } : null
  }).filter(Boolean)
}

const getInsights = (overview) => {
  const data = firstValue(overview, ["actionableInsights", "insights", "recommendations", "actionsToTake"])
  if (!Array.isArray(data)) return []
  return data.map((item) => {
    if (typeof item === "string") return { title: item, detail: "" }
    return {
      title: firstValue(item, ["title", "heading", "action", "name"]),
      detail: firstValue(item, ["description", "detail", "summary", "reason"]),
      severity: firstValue(item, ["severity", "priority", "type"]),
    }
  }).filter((item) => item.title)
}

const MetricCard = ({ metric, overview }) => {
  const Icon = metric.icon
  const kpis = overview?.kpis || overview?.metrics || overview
  const raw = firstValue(kpis, metric.keys)
  const change = typeof raw === "object" ? firstValue(raw, ["changePercent", "change", "comparison"]) : null
  const detail = typeof raw === "object" ? firstValue(raw, ["detail", "subtitle", "changeLabel", "comparisonLabel"]) : null
  const value = formatMetric(raw, metric.id)
  const toneClasses = {
    blue: "bg-[#1768D2]",
    purple: "bg-[#6952D9]",
    green: "bg-[#138B32]",
    navy: "bg-[#173A78]",
    orange: "bg-[#F0642D]",
  }
  return (
    <article className="analytics-card flex min-h-[86px] min-w-0 items-center gap-3 px-3.5 py-3.5 sm:gap-3.5 sm:px-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[7px] text-white shadow-sm sm:h-12 sm:w-12 ${toneClasses[metric.tone]}`}>
        <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-[#5D7289]">{metric.label}</p>
        <p className="mt-0.5 truncate text-[22px] font-bold leading-6 text-[#132F54] sm:text-[24px]">{value}</p>
        <p className="mt-1 truncate text-[10px] text-[#718197]">{change !== null ? `↑ ${change}% ${detail || "vs. previous period"}` : detail || (raw !== null ? "Period total" : "No comparison reported")}</p>
      </div>
    </article>
  )
}

const AnalyticsCard = ({ title, className = "", children, action, onAction }) => (
  <section className={`analytics-card min-w-0 overflow-hidden ${className}`}>
    <div className="flex min-h-[52px] items-center justify-between gap-2 px-4 pt-2.5 sm:px-5">
      <h2 className="truncate text-[14px] font-bold text-[#17365F] sm:text-[15px]">{title}</h2>
      {action && <button type="button" onClick={onAction} className="shrink-0 text-[11px] font-semibold text-[#246FC0] hover:text-[#144E90]">{action}</button>}
    </div>
    {children}
  </section>
)

const EmptyChart = ({ children = "No backend data available for this period" }) => (
  <div className="flex h-full min-h-[150px] items-center justify-center px-4 text-center text-[11px] text-[#788BA0]">{children}</div>
)

const ChartLegend = ({ items }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pt-1.5">
    {items.map((item) => <span key={item.id} className="inline-flex items-center gap-1.5 text-[10px] text-[#61768E]"><span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: item.color }} />{item.label}</span>)}
  </div>
)

const MissionsPerDayChart = ({ data }) => {
  const inspect = useChartInspect()
  if (!data.length) return <EmptyChart />
  const width = 760
  const height = 206
  const pad = { top: 15, right: 8, bottom: 28, left: 34 }
  const plotHeight = height - pad.top - pad.bottom
  const plotWidth = width - pad.left - pad.right
  const maxValue = Math.max(1, ...data.map((row) => row.completed + row.late + row.failed))
  const yMax = Math.ceil(maxValue / 10) * 10 || 10
  const slotWidth = plotWidth / data.length
  const barWidth = Math.min(24, slotWidth * 0.65)
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="relative px-2 pb-2 pt-1" onPointerLeave={inspect.hideTooltip}>
      <ChartLegend items={[{ id: "complete", label: "Completed", color: OUTCOME_COLORS.completed }, { id: "late", label: "Completed late", color: OUTCOME_COLORS.late }, { id: "failed", label: "Aborted or failed", color: OUTCOME_COLORS.failed }]} />
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-[208px] w-full" role="img" aria-label="Missions per day by outcome">
        {ticks.map((fraction) => {
          const y = pad.top + plotHeight * (1 - fraction)
          const tick = Number((yMax * fraction).toFixed(1))
          return <g key={fraction}><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#E5ECF4" strokeWidth="1" /><text x={pad.left - 6} y={y + 3} textAnchor="end" fill="#71849A" fontSize="12">{tick}</text></g>
        })}
        <line x1={pad.left} y1={pad.top + plotHeight} x2={width - pad.right} y2={pad.top + plotHeight} stroke="#CFD9E4" />
        {data.map((row, index) => {
          const x = pad.left + index * slotWidth + (slotWidth - barWidth) / 2
          let yBase = pad.top + plotHeight
          const values = [[row.completed, OUTCOME_COLORS.completed], [row.late, OUTCOME_COLORS.late], [row.failed, OUTCOME_COLORS.failed]]
          const bars = values.map(([value, color], partIndex) => {
            const barHeight = (value / yMax) * plotHeight
            yBase -= barHeight
            return <rect key={partIndex} x={x} y={yBase} width={barWidth} height={Math.max(0, barHeight)} fill={color} rx={partIndex === values.length - 1 ? 1 : 0}><title>{`${row.date}: ${value}`}</title></rect>
          })
          const labelStep = data.length > 12 ? 2 : data.length > 8 ? 2 : 1
          const label = index % labelStep === 0 || index === data.length - 1
          const total = row.completed + row.late + row.failed
          const rows = [
            { label: "Completed", value: row.completed },
            { label: "Completed late", value: row.late },
            { label: "Aborted or failed", value: row.failed },
            { label: "Total missions", value: total },
          ]
          const inspectBar = (event, pinned = false) => inspect.showTooltip(event, row.date, rows, pinned)
          return <g key={`${row.date}-${index}`} className="cursor-crosshair" onPointerEnter={(event) => inspectBar(event)} onPointerMove={(event) => inspectBar(event)} onClick={(event) => inspectBar(event, true)}>{bars}{label && <text x={x + barWidth / 2} y={height - 9} textAnchor="middle" fill="#657A91" fontSize="12">{row.date}</text>}</g>
        })}
      </svg>
      <ChartTooltip tooltip={inspect.tooltip} />
    </div>
  )
}

const UseCaseChart = ({ data }) => {
  const inspect = useChartInspect()
  if (!data.length) return <EmptyChart />
  const max = Math.max(1, ...data.map((row) => row.value))
  return (
    <div className="relative flex flex-col gap-3 px-4 pb-4 pt-4" onPointerLeave={inspect.hideTooltip}>
      {data.slice(0, 8).map((row) => {
        const tooltipRows = [{ label: "Missions", value: row.value }, ...(row.percentage === null ? [] : [{ label: "Share", value: `${row.percentage}%` }])]
        const show = (event, pinned = false) => inspect.showTooltip(event, row.label, tooltipRows, pinned)
        return <button key={row.label} type="button" aria-label={`${row.label}: ${row.value} missions`} className="grid w-full grid-cols-[minmax(130px,0.9fr)_minmax(60px,1.6fr)_38px] items-center gap-2.5 text-left" onPointerEnter={(event) => show(event)} onPointerMove={(event) => show(event)} onClick={(event) => show(event, true)}>
          <span className="truncate text-[10px] text-[#526A84]">{row.label}</span>
          <span className="h-3 overflow-hidden rounded-[3px] bg-[#EFF4FA]"><span className="block h-full rounded-[3px] bg-[#2E7BD8]" style={{ width: `${Math.max(1, (row.value / max) * 100)}%` }} /></span>
          <strong className="text-right text-[10px] font-semibold text-[#203A5D]">{row.value.toLocaleString()}</strong>
        </button>
      })}
      <ChartTooltip tooltip={inspect.tooltip} />
    </div>
  )
}

const DetectionDonut = ({ data, total }) => {
  const inspect = useChartInspect()
  const sum = data.reduce((result, row) => result + row.value, 0)
  if (!data.length || sum === 0) return <EmptyChart />
  const radius = 47
  const circumference = 2 * Math.PI * radius
  const segments = data.map((item, index) => ({
    ...item,
    length: (item.value / sum) * circumference,
    offset: data.slice(0, index).reduce((value, previous) => value + (previous.value / sum) * circumference, 0),
  }))

  return (
    <div className="relative flex min-h-[220px] items-center justify-center gap-3 px-3 py-4 sm:gap-5 sm:px-4" onPointerLeave={inspect.hideTooltip}>
      <div className="relative h-[160px] w-[160px] shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${sum} detections by type`}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#EDF2F7" strokeWidth="19" />
          {segments.map((item) => {
            const rows = [{ label: "Detections", value: item.value }, { label: "Share", value: `${Math.round(item.value / sum * 100)}%` }]
            const show = (event, pinned = false) => inspect.showTooltip(event, item.name, rows, pinned)
            return <circle key={item.name} cx="60" cy="60" r={radius} fill="none" stroke={item.color} strokeWidth="19" strokeDasharray={`${item.length} ${circumference - item.length}`} strokeDashoffset={-item.offset} className="cursor-pointer" onPointerEnter={(event) => show(event)} onPointerMove={(event) => show(event)} onClick={(event) => show(event, true)}><title>{`${item.name}: ${item.value}`}</title></circle>
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <strong className="text-[22px] font-bold leading-6 text-[#17365F]">{total ?? sum}</strong>
          <span className="text-[10px] text-[#718197]">Detections</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {data.slice(0, 6).map((item) => (
          <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_34px_32px] items-center gap-2 text-[10px]">
            <span className="flex min-w-0 items-center gap-2 text-[#536B85]"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate">{item.name}</span></span>
            <strong className="text-right text-[#203A5D]">{item.value}</strong>
            <span className="text-right text-[#718197]">{Math.round(item.value / sum * 100)}%</span>
          </div>
        ))}
      </div>
      <ChartTooltip tooltip={inspect.tooltip} />
    </div>
  )
}

const UtilizationChart = ({ data }) => {
  const inspect = useChartInspect()
  const [activeIndex, setActiveIndex] = useState(null)
  if (!data.length) return <EmptyChart />
  const width = 500
  const height = 210
  const pad = { top: 12, right: 10, bottom: 27, left: 34 }
  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom
  const points = data.map((row, index) => ({
    x: pad.left + (data.length > 1 ? index / (data.length - 1) : 0.5) * plotWidth,
    y: pad.top + (1 - Math.max(0, Math.min(100, row.value)) / 100) * plotHeight,
    ...row,
  }))
  const line = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ")
  const area = `${line} L ${points.at(-1).x} ${pad.top + plotHeight} L ${points[0].x} ${pad.top + plotHeight} Z`
  const average = Math.round(data.reduce((sum, row) => sum + row.value, 0) / data.length)
  const labelStep = data.length > 7 ? Math.ceil(data.length / 7) : 1
  const activePoint = activeIndex === null ? null : points[activeIndex]
  const inspectNearestPoint = (event, pinned = false) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const viewX = ((event.clientX - bounds.left) / bounds.width) * width
    const nearestIndex = points.reduce((closest, point, index) => Math.abs(point.x - viewX) < Math.abs(points[closest].x - viewX) ? index : closest, 0)
    const point = points[nearestIndex]
    setActiveIndex(nearestIndex)
    inspect.showTooltip(event, point.date, [{ label: "Fleet utilization", value: `${point.value}%` }], pinned)
  }

  return (
    <div className="relative px-3 pb-2 pt-3" onPointerLeave={() => { inspect.hideTooltip(); if (!inspect.tooltip?.pinned) setActiveIndex(null) }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[190px] w-full cursor-crosshair" role="img" aria-label="Fleet utilisation trend" onPointerEnter={(event) => inspectNearestPoint(event)} onPointerMove={(event) => inspectNearestPoint(event)} onClick={(event) => { inspectNearestPoint(event, true); setTimeout(() => setActiveIndex(null), 4000) }}>
        {[0, 25, 50, 75, 100].map((value) => {
          const y = pad.top + (1 - value / 100) * plotHeight
          return <g key={value}><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#E5ECF4" /><text x={pad.left - 6} y={y + 3} textAnchor="end" fill="#71849A" fontSize="12">{value}</text></g>
        })}
        <path d={area} fill="#2F7DDD" fillOpacity="0.12" />
        <path d={line} fill="none" stroke="#2F7DDD" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />
        {activePoint && <g pointerEvents="none"><line x1={activePoint.x} y1={pad.top} x2={activePoint.x} y2={height - pad.bottom} stroke="#2F7DDD" strokeWidth="1.2" strokeDasharray="3 3" /><circle cx={activePoint.x} cy={activePoint.y} r="5" fill="#FFFFFF" stroke="#2F7DDD" strokeWidth="2.5" /></g>}
        {points.map((point, index) => <g key={`${point.date}-${index}`}><circle cx={point.x} cy={point.y} r="3.2" fill="#2F7DDD"><title>{`${point.date}: ${point.value}%`}</title></circle>{(index % labelStep === 0 || index === points.length - 1) && <text x={point.x} y={height - 7} textAnchor="middle" fill="#657A91" fontSize="12">{point.date}</text>}</g>)}
      </svg>
      <p className="px-2 pb-2 text-[10px] text-[#687E95]">Average utilization: <strong className="text-[#405C79]">{average}%</strong></p>
      <ChartTooltip tooltip={inspect.tooltip} />
    </div>
  )
}

const InsightsList = ({ insights }) => {
  if (!insights.length) return <EmptyChart>No backend insight data available</EmptyChart>
  const icons = [BatteryCharging, Route, AlertTriangle]
  return (
    <div className="flex flex-col gap-2.5 px-3.5 pb-4 pt-3">
      {insights.slice(0, 3).map((insight, index) => {
        const Icon = icons[index % icons.length]
        const tone = String(insight.severity || "").toLowerCase()
        return <article key={`${insight.title}-${index}`} className="analytics-insight-card flex min-h-[58px] items-start gap-2.5 px-3 py-2.5"><Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone === "critical" || tone === "high" ? "text-[#DB5047]" : "text-[#2879CE]"}`} /><div className="min-w-0"><h3 className="text-[10px] font-bold leading-4 text-[#244260]">{insight.title}</h3>{insight.detail && <p className="mt-0.5 line-clamp-2 text-[9px] leading-[1.4] text-[#647991]">{insight.detail}</p>}</div></article>
      })}
    </div>
  )
}

const FooterStrip = () => {
  const items = [
    { icon: CheckCircle2, title: "Plan with Confidence", subtitle: "Accurate, efficient and safe missions." },
    { icon: Activity, title: "Multi-Drone, Multi-Use", subtitle: "Any industry. Any environment." },
    { icon: BarChart3, title: "From Data to Decisions", subtitle: "Turn aerial data into real value." },
    { icon: ShieldCheck, title: "Safer Operations", subtitle: "People. Assets. Communities." },
  ]
  return (
    <footer className="analytics-footer grid grid-cols-1 gap-3 border-b border-[#8CA7C4] px-3 py-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:gap-2">
      {items.map(({ icon: Icon, title, subtitle }, index) => <div key={title} className={`flex min-w-0 items-center gap-2.5 px-2 ${index ? "xl:border-l xl:border-[#CED9E5] xl:pl-4" : ""}`}><Icon className="h-6 w-6 shrink-0 text-[#173F78]" /><span className="min-w-0"><strong className="block truncate text-[10px] font-bold text-[#18375D]">{title}</strong><span className="mt-0.5 block truncate text-[9px] text-[#718197]">{subtitle}</span></span></div>)}
      <p className="flex items-center px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#183B69]">ONE FLEET. ANY MISSION.<br />ALWAYS READY.</p>
    </footer>
  )
}

export const AnalyticsOverview = ({ onOpenDashboard }) => {
  const [overview, setOverview] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDemoData, setIsDemoData] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const response = await analyticsService.getBackendOverview()
      const data = unwrapOverview(response)
      if (!data || typeof data !== "object") throw new Error("Analytics overview returned no data")
      setOverview(data)
      setIsDemoData(false)
      setUpdatedAt(new Date())
    } catch {
      setOverview(DEMO_ANALYTICS_OVERVIEW)
      setIsDemoData(true)
      setUpdatedAt(new Date())
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const initialTimer = setTimeout(refresh, 0)
    const interval = setInterval(refresh, 60000)
    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [refresh])

  const kpis = overview?.kpis || overview?.metrics || overview
  const missions = normalizeMissionDays(overview || {})
  const useCases = normalizeUseCases(overview || {})
  const detections = normalizeDetections(overview || {})
  const utilization = normalizeUtilization(overview || {})
  const insights = getInsights(overview || {})
  const detectionTotal = toNumber(firstValue(kpis, ["aiDetections", "totalDetections", "detectionCount"]))
    ?? (detections.length ? detections.reduce((sum, item) => sum + item.value, 0) : null)
  const missionsAction = () => onOpenDashboard("missions")
  const flightsAction = () => onOpenDashboard("flights")
  const safetyAction = () => onOpenDashboard("safety")
  const fleetAction = () => onOpenDashboard("fleet")
  const exportOverview = () => {
    if (overview) analyticsService.exportData("csv", [overview], "aeronexus_analytics_overview")
  }

  return (
    <div className="analytics-page min-h-full w-full overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 sm:py-5 xl:px-6 xl:py-5">
      <div className="mx-auto flex w-full max-w-[1780px] flex-col gap-4">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h1 className="text-[27px] font-bold leading-[1.15] text-[#17365F] sm:text-[30px]">Data &amp; Analytics</h1>
            <p className="mt-1.5 text-[13px] leading-5 text-[#536B85] sm:text-[14px]">What the fleet flew, what it captured and what it found, across every use case.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {isDemoData && <span className="rounded-[4px] border border-[#E8D5AE] bg-[#FFF8EA] px-2.5 py-1.5 text-[10px] font-semibold text-[#8B641E]">DEMO DATA · BACKEND UNAVAILABLE</span>}
            {updatedAt && <span className="text-[10px] text-[#7B8DA1]">Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            <button type="button" onClick={refresh} disabled={isRefreshing} className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-[#D6E0EA] bg-white text-[#54728F] hover:bg-[#F4F8FC] disabled:opacity-50" title="Refresh analytics" aria-label="Refresh analytics"><RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} /></button>
            <button type="button" onClick={exportOverview} disabled={!overview} className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-[#D6E0EA] bg-white text-[#54728F] hover:bg-[#F4F8FC] disabled:opacity-50" title="Export overview" aria-label="Export analytics overview"><ArrowDownToLine className="h-4 w-4" /></button>
            <button type="button" onClick={flightsAction} className="hidden h-9 items-center gap-1 rounded-[5px] bg-[#1768D2] px-3 text-[10px] font-semibold text-white hover:bg-[#1157B8] md:inline-flex">Flight details</button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5" aria-label="Analytics KPIs">
          {KPI_CONFIG.map((metric) => <MetricCard key={metric.id} metric={metric} overview={overview} />)}
        </section>

        <section className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <AnalyticsCard title="MISSIONS PER DAY, BY OUTCOME" action="Details" onAction={flightsAction} className="min-h-[278px]">
            {isLoading && !overview ? <EmptyChart>Loading backend analytics…</EmptyChart> : <MissionsPerDayChart data={missions} />}
          </AnalyticsCard>
          <AnalyticsCard title="MISSIONS BY USE CASE (30 DAYS)" action="Details" onAction={missionsAction} className="min-h-[278px]">
            {isLoading && !overview ? <EmptyChart>Loading backend analytics…</EmptyChart> : <UseCaseChart data={useCases} />}
          </AnalyticsCard>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          <AnalyticsCard title="DETECTIONS BY TYPE" action="Details" onAction={safetyAction} className="min-h-[270px]">
            <DetectionDonut data={detections} total={detectionTotal} />
          </AnalyticsCard>
          <AnalyticsCard title="FLEET UTILISATION" action="Details" onAction={fleetAction} className="min-h-[270px]">
            <UtilizationChart data={utilization} />
          </AnalyticsCard>
          <AnalyticsCard title="WHAT TO ACT ON" action="Safety" onAction={safetyAction} className="min-h-[270px]">
            <InsightsList insights={insights} />
          </AnalyticsCard>
        </section>

        <FooterStrip />
      </div>
    </div>
  )
}

export default AnalyticsOverview
