import React, { useState, useMemo } from "react"
import { Plus, UploadCloud, Search, ShieldAlert, AlertTriangle, Layers } from "lucide-react"

export const ZoneRegisterCard = ({
  zones = [],
  fenceEvents = null,
  onOpenAddZone,
  onOpenImport,
}) => {
  const [searchTerm, setSearchTerm] = useState("")

  // Calculate genuine breach counts per zone strictly from actual 30-day recorded events
  const breachCountsByZone = useMemo(() => {
    const map = {}
    if (fenceEvents?.events && Array.isArray(fenceEvents.events)) {
      fenceEvents.events.forEach((ev) => {
        if (ev.type === "BREACH") {
          if (ev.zoneId) map[ev.zoneId] = (map[ev.zoneId] || 0) + 1
          if (ev.zoneName) map[ev.zoneName] = (map[ev.zoneName] || 0) + 1
        }
      })
    }
    return map
  }, [fenceEvents])

  const filteredZones = useMemo(() => {
    if (!searchTerm.trim()) return zones
    const term = searchTerm.toLowerCase()
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(term) ||
        z.type.toLowerCase().includes(term) ||
        (z.rule || "").toLowerCase().includes(term) ||
        (z.site || "").toLowerCase().includes(term) ||
        (z.source || "").toLowerCase().includes(term)
    )
  }, [zones, searchTerm])

  return (
    <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs p-5 flex flex-col justify-between h-full">
      <div className="space-y-3.5">
        {/* Header with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#0F284E] tracking-tight">Zone register</h3>
            <span className="text-[11px] font-mono font-medium text-slate-500">
              ({filteredZones.length} {filteredZones.length === 1 ? "zone" : "zones"})
            </span>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search zones or rules..."
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg outline-none focus:border-[#1B68D2] text-[#0F284E] font-medium placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Zone Register Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-slate-500 font-semibold text-[11px]">
                <th className="py-2.5 pr-4 font-semibold">Zone</th>
                <th className="py-2.5 px-3 font-semibold">Type</th>
                <th className="py-2.5 px-3 font-semibold">Rule</th>
                <th className="py-2.5 pl-3 font-semibold text-right">Breaches (30 days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] font-medium text-slate-700">
              {filteredZones.map((z) => {
                const isNoFly = (z.type || "").toLowerCase().includes("no-fly")
                const breachCount = breachCountsByZone[z.id] ?? breachCountsByZone[z.name] ?? 0
                const isMappls = z.source === "DGCA / Mappls" || z.isMappls

                return (
                  <tr key={z.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 pr-4 font-bold text-[#0F284E] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{z.name}</span>
                        {isMappls && (
                          <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            Mappls
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                          isNoFly
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {isNoFly ? (
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                        )}
                        <span>{z.type}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#334155] whitespace-nowrap">
                      {z.rule}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono font-bold text-[#0F284E] whitespace-nowrap pr-2">
                      {breachCount}
                    </td>
                  </tr>
                )
              })}

              {filteredZones.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-slate-400 font-medium">
                    {searchTerm
                      ? `No zones matching "${searchTerm}".`
                      : "No registered zones found. Use \"+ Add Zone\" or \"Import KML / GeoJSON\" to register boundaries."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Action Buttons matching reference screenshot */}
      <div className="mt-5 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenAddZone}
          className="h-8 px-3 rounded-lg border border-[#1B68D2] hover:bg-[#EFF6FF] text-[#1B68D2] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-[#1B68D2]" />
          <span>Add Zone</span>
        </button>

        <button
          type="button"
          onClick={onOpenImport}
          className="h-8 px-3 rounded-lg border border-[#1B68D2] hover:bg-[#EFF6FF] text-[#1B68D2] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <UploadCloud className="w-3.5 h-3.5 text-[#1B68D2]" />
          <span>Import KML / GeoJSON</span>
        </button>
      </div>
    </div>
  )
}

export default ZoneRegisterCard

