import React, { useState } from "react"
import { X, ShieldAlert, AlertTriangle, Check, Plus } from "lucide-react"
import { saveAirspaceZone } from "@/services/airspaceService.js"

export const AddZoneModal = ({ isOpen, onClose, onZoneAdded, activeSite = "Refinery" }) => {
  const [name, setName] = useState("")
  const [type, setType] = useState("No-fly")
  const [rule, setRule] = useState("")
  const [site, setSite] = useState(activeSite)
  const [minAlt, setMinAlt] = useState("0")
  const [maxAlt, setMaxAlt] = useState("120")
  const [radius, setRadius] = useState("100")
  const [latitude, setLatitude] = useState("17.3880")
  const [longitude, setLongitude] = useState("78.4865")
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Please provide a zone name.")
      return
    }

    const latNum = parseFloat(latitude)
    const lngNum = parseFloat(longitude)
    const radNum = parseFloat(radius) || 100

    const newZone = {
      id: `zone-${Date.now()}`,
      name: name.trim(),
      type: type,
      rule: rule.trim() || (type === "No-fly" ? "Never enter" : "Altitude restrictions apply"),
      site: site || activeSite,
      breaches30d: 0,
      minAlt: parseFloat(minAlt) || 0,
      maxAlt: parseFloat(maxAlt) || 120,
      center: { lat: latNum, lng: lngNum },
      radiusMeters: radNum,
      coordinates: [
        { lat: latNum + 0.001, lng: lngNum - 0.001 },
        { lat: latNum + 0.001, lng: lngNum + 0.001 },
        { lat: latNum - 0.001, lng: lngNum + 0.001 },
        { lat: latNum - 0.001, lng: lngNum - 0.001 },
      ],
    }

    saveAirspaceZone(newZone)
    if (typeof onZoneAdded === "function") {
      onZoneAdded(newZone)
    }
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-lg w-full border border-[#CBD5E1] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-[#0B192C] px-5 py-4 flex items-center justify-between border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-[#35E0FF] flex items-center justify-center border border-blue-500/30">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Add Airspace Zone</h3>
              <p className="text-[11px] text-slate-400 font-medium">Define a new local No-Fly Zone or Restricted Area</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Zone Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0F284E] block">
              Zone Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Helipad Exclusion Corridor, Tank Farm Sub-Area"
              className="w-full text-xs bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#1B68D2] rounded-lg px-3 py-2 text-[#0F284E] outline-none font-medium"
            />
          </div>

          {/* Type Selector (Segmented) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0F284E] block">Zone Classification</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("No-fly")}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === "No-fly"
                    ? "bg-red-50 text-red-700 border-red-300 ring-2 ring-red-200"
                    : "bg-[#F8FAFC] text-slate-600 border-[#CBD5E1] hover:bg-slate-100"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                <span>No-Fly Zone</span>
              </button>

              <button
                type="button"
                onClick={() => setType("Restricted")}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === "Restricted"
                    ? "bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-200"
                    : "bg-[#F8FAFC] text-slate-600 border-[#CBD5E1] hover:bg-slate-100"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Restricted Area</span>
              </button>
            </div>
          </div>

          {/* Rule / Restriction */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0F284E] block">Restriction Rule</label>
            <input
              type="text"
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              placeholder={type === "No-fly" ? "e.g. Never enter, 500 m radius when active" : "e.g. 60 m minimum altitude, No overflight below 40 m"}
              className="w-full text-xs bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#1B68D2] rounded-lg px-3 py-2 text-[#0F284E] outline-none font-medium"
            />
          </div>

          {/* Site / Project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F284E] block">Associated Site</label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g. North Ridge Dam, Refinery"
                className="w-full text-xs bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#1B68D2] rounded-lg px-3 py-2 text-[#0F284E] outline-none font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F284E] block">Radius (meters)</label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full text-xs bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#1B68D2] rounded-lg px-3 py-2 text-[#0F284E] outline-none font-mono font-medium"
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F284E] block">Latitude</label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full text-xs bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#1B68D2] rounded-lg px-3 py-2 text-[#0F284E] outline-none font-mono font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F284E] block">Longitude</label>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full text-xs bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#1B68D2] rounded-lg px-3 py-2 text-[#0F284E] outline-none font-mono font-medium"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#1B68D2] hover:bg-[#124E9D] rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Zone Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddZoneModal
