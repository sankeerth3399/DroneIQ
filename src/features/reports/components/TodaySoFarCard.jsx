export const TodaySoFarCard = ({
  missionsStats = null,
  fleetStats = null,
  alertsList = [],
  successRate = "98%",
  flightHours = "18.4 h",
  className = "",
}) => {
  // Dynamically formatted summary items
  const missionsTotal = missionsStats?.total ?? 42
  const inProgress = missionsStats?.inProgress ?? 8
  const scheduled = missionsStats?.scheduled ?? 12
  const completed = missionsStats?.completed ?? 22

  const activeDronesCount = fleetStats?.active ?? 4
  const inAirCount = fleetStats?.inFlight ?? 1

  const items = [
    {
      num: 1,
      text: (
        <span>
          <strong className="text-[#0E2646] font-bold">{missionsTotal} missions today:</strong>{" "}
          {inProgress} in progress, {scheduled} scheduled, {completed} completed.
        </span>
      ),
    },
    {
      num: 2,
      text: (
        <span>
          <strong className="text-[#0E2646] font-bold">{activeDronesCount} drones active,</strong>{" "}
          {inAirCount} in the air across operational sites.
        </span>
      ),
    },
    {
      num: 3,
      text: (
        <span>
          <strong className="text-[#0E2646] font-bold">
            {alertsList.length > 0 ? `${alertsList.length} active alerts:` : "Alert monitoring:"}
          </strong>{" "}
          {alertsList.length > 0
            ? alertsList.slice(0, 3).map((a) => a.title || a.message || a.event).join(", ")
            : "perimeter corridor secure, thermal baseline normal, telemetry link active."}
        </span>
      ),
    },
    {
      num: 4,
      text: (
        <span>
          <strong className="text-[#0E2646] font-bold">Fleet sortie health:</strong>{" "}
          {flightHours} flight time logged today, 0 geofence violations, zero unhandled link drops.
        </span>
      ),
    },
    {
      num: 5,
      text: (
        <span>
          <strong className="text-[#0E2646] font-bold">Mission success rate this month:</strong>{" "}
          <span className="font-mono font-bold text-[#059669]">{successRate}</span>.
        </span>
      ),
    },
  ]

  return (
    <div className={`bg-white rounded-xl border border-[#D5E1ED] shadow-xs p-5 flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#EEF3F8]">
          <h3 className="text-base font-extrabold text-[#0E2646] tracking-tight">
            Today so far <span className="text-xs font-semibold text-[#64748B] font-mono">(draft)</span>
          </h3>
          <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" title="Real-time operational summary" />
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.num} className="flex items-start gap-3 text-xs leading-relaxed text-[#4A627B]">
              <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-[#1E64D4] text-white text-[11px] font-mono font-bold shadow-2xs">
                {item.num}
              </span>
              <div className="min-w-0 pt-0.5">{item.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-3.5 border-t border-[#EEF3F8] flex items-center justify-between text-[11px] text-[#6B8097]">
        <span>Auto-synced with Live Telemetry</span>
        <span className="font-mono font-semibold text-[#0E2646]">GCS v2.4</span>
      </div>
    </div>
  )
}

export default TodaySoFarCard
