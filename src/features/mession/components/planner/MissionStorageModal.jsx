import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Save,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
} from "lucide-react";

export default function MissionStorageModal({
  isOpen,
  initialTab = "save",
  onClose,
  planner,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [nameInput, setNameInput] = useState("");
  const [savedMissions, setSavedMissions] = useState([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [loadErrorMsg, setLoadErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  const {
    missionName,
    setMissionName,
    items,
    formattedDistance,
    formattedDuration,
    maxAltitude,
    listSavedMissions,
    saveMissionToStorage,
    loadMissionFromStorage,
    deleteSavedMissionFromStorage,
    addWaypointAtCoordinates,
  } = planner;

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setNameInput(missionName || `Survey Mission ${new Date().toLocaleDateString()}`);
      setSavedMissions(listSavedMissions());
      setSaveSuccessMsg("");
      setLoadErrorMsg("");
    }
  }, [isOpen, initialTab, missionName, listSavedMissions]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    saveMissionToStorage(nameInput.trim());
    setSavedMissions(listSavedMissions());
    setSaveSuccessMsg(`Mission "${nameInput.trim()}" saved successfully!`);
    setTimeout(() => {
      setSaveSuccessMsg("");
      onClose();
    }, 1200);
  };

  const handleLoad = (id) => {
    const success = loadMissionFromStorage(id);
    if (success) {
      onClose();
    } else {
      setLoadErrorMsg("Failed to load mission data.");
    }
  };

  const handleDelete = (id) => {
    const updated = deleteSavedMissionFromStorage(id);
    setSavedMissions(updated);
  };

  const handleExportJson = (mission) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mission, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${mission.name.replace(/\s+/g, "_")}_plan.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          // Save and load directly
          const newName = parsed.name || file.name.replace(/\.[^/.]+$/, "");
          localStorage.setItem(
            "aeronexus_saved_missions",
            JSON.stringify([
              {
                id: `imported-${Date.now()}`,
                name: newName,
                timestamp: new Date().toISOString(),
                items: parsed.items,
                settings: parsed.settings || {},
                stats: parsed.stats || {},
              },
              ...listSavedMissions(),
            ])
          );
          setSavedMissions(listSavedMissions());
          loadMissionFromStorage(`imported-${Date.now()}`);
          onClose();
        } else {
          setLoadErrorMsg("Invalid mission plan format: No waypoints found in JSON.");
        }
      } catch (err) {
        setLoadErrorMsg("Error parsing JSON file. Please ensure it is valid JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06090ECC] backdrop-blur-md select-none">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#080C14] border border-[#1A2633] p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1A2633]">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#35E0FF]" />
            <h2 className="text-base font-bold text-[#EEF4F8] font-sans tracking-wide">
              Mission Storage & Archives
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E9EAA] hover:text-white hover:bg-[#151D28] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 mt-4 p-1 rounded-xl bg-[#0E1520] border border-[#1A2633]">
          <button
            type="button"
            onClick={() => setActiveTab("save")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
              activeTab === "save"
                ? "bg-[#35E0FF1A] border border-[#35E0FF4D] text-[#35E0FF] shadow-[0_0_10px_rgba(53,224,255,0.2)]"
                : "text-[#8E9EAA] hover:text-white"
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Current Mission</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("load")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
              activeTab === "load"
                ? "bg-[#35E0FF1A] border border-[#35E0FF4D] text-[#35E0FF] shadow-[0_0_10px_rgba(53,224,255,0.2)]"
                : "text-[#8E9EAA] hover:text-white"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Saved Missions ({savedMissions.length})</span>
          </button>
        </div>

        {/* Error / Success Notifications */}
        {saveSuccessMsg && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2FE0891A] border border-[#2FE0894D] text-[#2FE089] text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
        {loadErrorMsg && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FF47571A] border border-[#FF47574D] text-[#FF4757] text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadErrorMsg}</span>
          </div>
        )}

        {/* Body content */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-thin">
          {activeTab === "save" ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#8E9EAA] mb-1.5">
                  MISSION NAME
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Area Alpha Perimeter Survey"
                  className="w-full bg-[#0E1520] border border-[#1A2633] focus:border-[#35E0FF] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#EEF4F8] outline-none transition"
                  required
                />
              </div>

              {/* Current plan metrics card */}
              <div className="p-3.5 rounded-xl bg-[#0E1520] border border-[#1A2633] space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#5D707C]">
                  Current Plan Summary
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1 font-mono">
                  <div className="p-2 rounded-lg bg-[#080C14] border border-[#151F2C]">
                    <div className="text-[10px] text-[#8E9EAA]">Waypoints</div>
                    <div className="text-sm font-bold text-[#35E0FF]">{items.length}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#080C14] border border-[#151F2C]">
                    <div className="text-[10px] text-[#8E9EAA]">Distance</div>
                    <div className="text-sm font-bold text-[#EEF4F8]">{formattedDistance}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#080C14] border border-[#151F2C]">
                    <div className="text-[10px] text-[#8E9EAA]">Flight Time</div>
                    <div className="text-sm font-bold text-[#EEF4F8]">{formattedDuration}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#080C14] border border-[#151F2C]">
                    <div className="text-[10px] text-[#8E9EAA]">Max Alt</div>
                    <div className="text-sm font-bold text-[#2FE089]">{maxAltitude}m</div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-semibold text-[#8E9EAA] bg-[#0E1520] border border-[#1A2633] hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={items.length === 0}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-mono font-bold transition shadow-lg ${
                    items.length > 0
                      ? "bg-[#35E0FF] hover:bg-[#6EEBFF] text-[#06090E] shadow-[0_0_15px_rgba(53,224,255,0.4)]"
                      : "bg-[#1A2633] text-[#475569] cursor-not-allowed"
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save to Storage</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {/* Import JSON button */}
              <div className="flex items-center justify-between pb-2">
                <span className="text-[11px] font-mono text-[#8E9EAA]">
                  {savedMissions.length} saved mission{savedMissions.length !== 1 ? "s" : ""} in browser storage
                </span>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    className="hidden"
                    onChange={handleImportJson}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono text-[#35E0FF] bg-[#35E0FF1A] border border-[#35E0FF33] hover:bg-[#35E0FF2E] transition"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Import JSON</span>
                  </button>
                </div>
              </div>

              {savedMissions.length === 0 ? (
                <div className="py-12 text-center text-[#5D707C] font-mono text-xs">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No saved missions found.</p>
                  <p className="text-[11px] mt-1">Switch to "Save Current Mission" to archive your plan.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedMissions.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-[#0E1520] border border-[#1A2633] hover:border-[#35E0FF4D] transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#EEF4F8] font-sans truncate">
                            {m.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#35E0FF1A] text-[#35E0FF]">
                            {m.items?.length || 0} WP
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-[#8E9EAA] mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#5D707C]" />
                            {new Date(m.timestamp).toLocaleDateString()} {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span>{m.stats?.distance || "—"}</span>
                          <span>•</span>
                          <span>{m.stats?.duration || "—"}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleExportJson(m)}
                          className="p-1.5 rounded-lg text-[#8E9EAA] hover:text-[#35E0FF] hover:bg-[#151D28] transition"
                          title="Export JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 rounded-lg text-[#8E9EAA] hover:text-[#FF4757] hover:bg-[#FF47571A] transition"
                          title="Delete saved mission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoad(m.id)}
                          className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-[#35E0FF1A] border border-[#35E0FF4D] text-[#35E0FF] hover:bg-[#35E0FF] hover:text-[#06090E] transition"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
