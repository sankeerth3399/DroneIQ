import React, { useState, useRef } from "react"
import { X, UploadCloud, FileCode, Check, AlertCircle } from "lucide-react"
import { parseKmlOrGeoJson, importZones } from "@/services/airspaceService.js"

export const ImportZoneModal = ({ isOpen, onClose, onZonesImported }) => {
  const [file, setFile] = useState(null)
  const [parsedZones, setParsedZones] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (selected) {
      processFile(selected)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      processFile(dropped)
    }
  }

  const processFile = (f) => {
    setFile(f)
    setError("")
    setIsProcessing(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result
        if (typeof text === "string") {
          const zones = parseKmlOrGeoJson(text, f.name)
          if (zones.length === 0) {
            setError("No valid polygon or placemark geometry found in file. Ensure KML <Placemark> or GeoJSON Polygon features exist.")
          } else {
            setParsedZones(zones)
          }
        }
      } catch (err) {
        setError(`Failed to parse file: ${err.message}`)
      } finally {
        setIsProcessing(false)
      }
    }
    reader.onerror = () => {
      setError("Failed to read the selected file.")
      setIsProcessing(false)
    }
    reader.readAsText(f)
  }

  const handleConfirmImport = () => {
    if (parsedZones.length > 0) {
      importZones(parsedZones)
      if (typeof onZonesImported === "function") {
        onZonesImported(parsedZones)
      }
      onClose()
    }
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
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-[#35E0FF] flex items-center justify-center border border-cyan-500/30">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Import KML / GeoJSON</h3>
              <p className="text-[11px] text-slate-400 font-medium">Load airspace restrictions from GIS spatial datasets</p>
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

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#CBD5E1] hover:border-[#1B68D2] bg-[#F8FAFC] hover:bg-[#EFF6FF] rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".kml,.geojson,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1B68D2] flex items-center justify-center group-hover:scale-105 transition">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#0F284E]">
                {file ? file.name : "Click to select or drag & drop a file"}
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">
                Supports Standard KML (.kml) and GeoJSON (.geojson, .json)
              </div>
            </div>
          </div>

          {/* Parsed Preview List */}
          {parsedZones.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#0F284E] flex items-center justify-between">
                <span>Detected Airspace Zones</span>
                <span className="text-[11px] font-mono text-[#1B68D2] font-semibold">
                  {parsedZones.length} feature(s)
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto border border-[#CBD5E1] rounded-xl divide-y divide-[#E2E8F0] bg-white text-xs">
                {parsedZones.map((z, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#0F284E]">{z.name}</div>
                      <div className="text-[11px] text-[#64748B]">{z.rule}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        z.type === "No-fly"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {z.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedZones.length === 0 || isProcessing}
              onClick={handleConfirmImport}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                parsedZones.length === 0
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-[#1B68D2] hover:bg-[#124E9D]"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Import {parsedZones.length > 0 ? `${parsedZones.length} Zones` : "Zones"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportZoneModal
