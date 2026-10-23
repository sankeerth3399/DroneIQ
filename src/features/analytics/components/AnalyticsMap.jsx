import MapContainer from "@/components/Map/mapContainer.jsx"

export const AnalyticsMap = ({
  waypoints = [],
  geofence = null,
  telemetry = null,
  height = "320px",
  showAirspace = true,
}) => {
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-[#1A2633] bg-[#0A0E16]"
      style={{ height }}
    >
      <div className="absolute inset-0 map-shell">
        <MapContainer
          mapStyle="normal"
          showAirspace={showAirspace}
          waypoints={waypoints}
          geofence={geofence}
          telemetry={telemetry}
          showMissionRoute={true}
          pageType="analytics"
        />
      </div>
    </div>
  )
}

export default AnalyticsMap
