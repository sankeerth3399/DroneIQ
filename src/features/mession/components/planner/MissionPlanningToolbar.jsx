import { useState, useRef, useEffect } from "react";
import {
  Plus,
  ChevronDown,
  Edit3,
  Trash2,
  RotateCcw,
  RotateCw,
  Settings,
  Eye,
  Save,
  FolderOpen,
  UploadCloud,
  XSquare,
  PlaneTakeoff,
  PlaneLanding,
  Navigation,
  Crosshair,
} from "lucide-react";

export default function MissionPlanningToolbar({
  planner,
  onOpenSettings,
  onOpenPreview,
  onOpenSave,
  onOpenLoad,
  onOpenUpload,
  onOpenClear,
}) {
  const {
    items,
    selectedWaypointId,
    isPlacingMode,
    placingType,
    startPlacingMode,
    cancelPlacingMode,
    deleteWaypoint,
    canUndo,
    canRedo,
    undo,
    redo,
  } = planner;

  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setItemDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPlacingType = (type) => {
    startPlacingMode(type);
    setItemDropdownOpen(false);
  };

  const hasSelected = Boolean(selectedWaypointId);
  const hasItems = items.length > 0;

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl bg-[#080C14F2] border border-[#1A2633] backdrop-blur-md shadow-2xl text-[10px] sm:text-xs font-mono select-none pointer-events-auto max-w-full overflow-x-auto scrollbar-none">
      {/* 1. Quick + Waypoint Button */}
      <button
        type="button"
        onClick={() => {
          if (isPlacingMode && placingType === "WAYPOINT") {
            cancelPlacingMode();
          } else {
            startPlacingMode("WAYPOINT");
          }
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition shrink-0 ${
          isPlacingMode && placingType === "WAYPOINT"
            ? "bg-[#35E0FF] text-[#06090E] shadow-[0_0_12px_rgba(53,224,255,0.6)] animate-pulse"
            : "bg-[#35E0FF1A] text-[#35E0FF] border border-[#35E0FF4D] hover:bg-[#35E0FF2E]"
        }`}
        title="Add Waypoint by clicking on the map"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">Waypoint</span>
      </button>

      {/* 2. + Mission Item Dropdown (Takeoff, Land, RTL, Waypoint) */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setItemDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[#EEF4F8] bg-[#0E1520] border border-[#1C2834] hover:border-[#35E0FF4D] hover:text-[#35E0FF] transition"
          title="Add specific mission command (Takeoff, Land, RTL)"
        >
          <span className="hidden sm:inline">+ Item</span>
          <ChevronDown className="w-3 h-3 text-[#8E9EAA]" />
        </button>

        {itemDropdownOpen && (
          <div className="absolute top-full mt-1.5 left-0 z-50 w-44 rounded-xl bg-[#080C14F5] border border-[#1C2834] shadow-2xl backdrop-blur-lg p-1.5 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleSelectPlacingType("WAYPOINT")}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[#EEF4F8] hover:bg-[#35E0FF1A] hover:text-[#35E0FF] transition text-[11px]"
            >
              <Crosshair className="w-3.5 h-3.5 text-[#35E0FF]" />
              <span>Normal Waypoint</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlacingType("TAKEOFF")}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[#EEF4F8] hover:bg-[#2FE0891A] hover:text-[#2FE089] transition text-[11px]"
            >
              <PlaneTakeoff className="w-3.5 h-3.5 text-[#2FE089]" />
              <span>Takeoff Point</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlacingType("LAND")}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[#EEF4F8] hover:bg-[#F59E0B1A] hover:text-[#F59E0B] transition text-[11px]"
            >
              <PlaneLanding className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Land Point</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlacingType("RTL")}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[#EEF4F8] hover:bg-[#A78BFA1A] hover:text-[#A78BFA] transition text-[11px]"
            >
              <Navigation className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span>Return to Launch (RTL)</span>
            </button>
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-[#1C2834] shrink-0 mx-0.5" />

      {/* 3. Delete Selected */}
      <button
        type="button"
        disabled={!hasSelected}
        onClick={() => deleteWaypoint(selectedWaypointId)}
        className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg transition shrink-0 ${
          hasSelected
            ? "text-[#FF4757] hover:bg-[#FF47571A] border border-transparent hover:border-[#FF47574D]"
            : "text-[#475569] cursor-not-allowed"
        }`}
        title={hasSelected ? "Delete selected waypoint" : "Select a waypoint to delete"}
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Delete</span>
      </button>

      {/* 4. Clear Mission */}
      <button
        type="button"
        disabled={!hasItems}
        onClick={onOpenClear}
        className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg transition shrink-0 ${
          hasItems
            ? "text-[#94A3B8] hover:text-white hover:bg-[#1E293B]"
            : "text-[#475569] cursor-not-allowed"
        }`}
        title="Clear all mission items"
      >
        <XSquare className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Clear</span>
      </button>

      <div className="w-[1px] h-4 bg-[#1C2834] shrink-0 mx-0.5" />

      {/* 5. Undo & Redo */}
      <button
        type="button"
        disabled={!canUndo}
        onClick={undo}
        className={`p-1.5 rounded-lg transition shrink-0 ${
          canUndo
            ? "text-[#EEF4F8] hover:bg-[#1E293B] hover:text-[#35E0FF]"
            : "text-[#475569] cursor-not-allowed"
        }`}
        title="Undo (Ctrl+Z)"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        disabled={!canRedo}
        onClick={redo}
        className={`p-1.5 rounded-lg transition shrink-0 ${
          canRedo
            ? "text-[#EEF4F8] hover:bg-[#1E293B] hover:text-[#35E0FF]"
            : "text-[#475569] cursor-not-allowed"
        }`}
        title="Redo (Ctrl+Y)"
      >
        <RotateCw className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-[#1C2834] shrink-0 mx-0.5" />

      {/* 6. Settings */}
      <button
        type="button"
        onClick={onOpenSettings}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[#EEF4F8] hover:bg-[#1E293B] hover:text-[#35E0FF] transition shrink-0"
        title="Mission Default Settings"
      >
        <Settings className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">Settings</span>
      </button>

      {/* 7. Preview */}
      <button
        type="button"
        disabled={!hasItems}
        onClick={onOpenPreview}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition shrink-0 ${
          hasItems
            ? "text-[#EEF4F8] hover:bg-[#1E293B] hover:text-[#35E0FF]"
            : "text-[#475569] cursor-not-allowed"
        }`}
        title="Preview flight plan breakdown"
      >
        <Eye className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">Preview</span>
      </button>

      {/* 8. Save / Load */}
      <button
        type="button"
        disabled={!hasItems}
        onClick={onOpenSave}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition shrink-0 ${
          hasItems
            ? "text-[#EEF4F8] hover:bg-[#1E293B] hover:text-[#35E0FF]"
            : "text-[#475569] cursor-not-allowed"
        }`}
        title="Save Mission to Local Storage"
      >
        <Save className="w-3.5 h-3.5" />
        <span className="hidden xl:inline">Save</span>
      </button>

      <button
        type="button"
        onClick={onOpenLoad}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[#EEF4F8] hover:bg-[#1E293B] hover:text-[#35E0FF] transition shrink-0"
        title="Load Mission from Local Storage"
      >
        <FolderOpen className="w-3.5 h-3.5" />
        <span className="hidden xl:inline">Load</span>
      </button>

      {/* 9. Upload Mission Button */}
      <button
        type="button"
        disabled={!hasItems}
        onClick={onOpenUpload}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
          hasItems
            ? "bg-[#2FE0891A] text-[#2FE089] border border-[#2FE0894D] hover:bg-[#2FE0892E] shadow-[0_0_10px_rgba(47,224,137,0.2)]"
            : "text-[#475569] bg-[#0E1520] border border-[#1C2834] cursor-not-allowed"
        }`}
        title="Upload Mission Plan to Drone (Simulation Ready)"
      >
        <UploadCloud className="w-3.5 h-3.5" />
        <span>Upload</span>
      </button>
    </div>
  );
}
