import { useState, useEffect } from "react";
import MapLoad from "@/components/Map/mapContainer.jsx";
import { useDroneTelemetry } from "@/features/mession/hooks/useDroneTelemetry.js";
import useMissionPlanner from "@/features/mession/hooks/useMissionPlanner.js";

// Planner HUD components
import MissionPlanningToolbar from "@/features/mession/components/planner/MissionPlanningToolbar.jsx";
import WaypointPlacementBanner from "@/features/mession/components/planner/WaypointPlacementBanner.jsx";
import WaypointDetailsPanel from "@/features/mession/components/planner/WaypointDetailsPanel.jsx";
import MissionItemListHUD from "@/features/mession/components/planner/MissionItemListHUD.jsx";
import MissionSummaryHUD from "@/features/mession/components/planner/MissionSummaryHUD.jsx";

// Planner Modals
import MissionSettingsModal from "@/features/mession/components/planner/MissionSettingsModal.jsx";
import MissionPreviewModal from "@/features/mession/components/planner/MissionPreviewModal.jsx";
import MissionStorageModal from "@/features/mession/components/planner/MissionStorageModal.jsx";
import MissionUploadModal from "@/features/mession/components/planner/MissionUploadModal.jsx";
import ClearMissionModal from "@/features/mession/components/planner/ClearMissionModal.jsx";

const mapStyleOptions = [
  { id: "normal", label: "Normal Map" },
  { id: "satellite", label: "Satellite Map" },
];

/**
 * MissionsPage - Professional QGroundControl-Style Mission Planning View
 * Keeps the map as the primary full-bleed workspace while overlaying
 * non-intrusive floating HUD panels for waypoint placement, drag manipulation,
 * parameter adjustments, flight plan simulation, and upload.
 */
const MissionsPage = () => {
  const [mapStyle, setMapStyle] = useState("normal");
  const { telemetry } = useDroneTelemetry();
  const planner = useMissionPlanner();

  // Modal dialog states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [storageTab, setStorageTab] = useState("save");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);

  // Global keyboard shortcuts (Undo, Redo, Cancel placement, Deselect)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger hotkeys if typing inside an input or textarea
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Undo: Ctrl+Z (or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        planner.undo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        planner.redo();
      }
      // Escape: Cancel placement or close selected waypoint
      else if (e.key === "Escape") {
        if (planner.isPlacingMode) {
          planner.cancelPlacingMode();
        } else if (planner.selectedWaypointId) {
          planner.setSelectedWaypointId(null);
        }
      }
      // Delete / Backspace: Remove selected waypoint
      else if ((e.key === "Delete" || e.key === "Backspace") && planner.selectedWaypointId) {
        planner.deleteWaypoint(planner.selectedWaypointId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [planner]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#06090E] select-none">
      {/* 100% Full-bleed Map View */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <MapLoad
          mapStyle={mapStyle}
          telemetry={telemetry}
          waypoints={planner.items}
          selectedWaypointId={planner.selectedWaypointId}
          onWaypointSelect={(id) => planner.setSelectedWaypointId(id)}
          onWaypointDrag={planner.updateWaypointCoordinates}
          onWaypointDragEnd={planner.finishWaypointDrag}
          onMapClick={(coords) => {
            if (planner.isPlacingMode) {
              planner.addWaypointAtCoordinates(coords);
            }
          }}
          isPlacingWaypoint={planner.isPlacingMode}
          showMissionRoute={true}
        />
      </div>

      {/* ==================== TOP HUD OVERLAY ==================== */}

      {/* 1. Live Mission GPS & Telemetry Status Chip (Top-Left) */}
      <div className="absolute top-3 left-3 z-10 hidden sm:flex items-center gap-2 bg-[#080C14CC] border border-[#1A2633] backdrop-blur-md rounded-lg px-3 py-1.5 shadow-lg pointer-events-auto">
        <span className="h-2 w-2 rounded-full bg-[#2FE089] animate-pulse" />
        <span className="font-mono text-[10px] sm:text-xs font-semibold text-[#35E0FF]">
          {typeof telemetry?.latitude === "number" ? telemetry.latitude.toFixed(6) : "17.385000"}° N,{" "}
          {typeof telemetry?.longitude === "number" ? telemetry.longitude.toFixed(6) : "78.486700"}° E
        </span>
        <span className="text-[10px] text-[#5D707C] font-mono">|</span>
        <span className="font-mono text-[10px] sm:text-xs text-[#94A3B8]">
          ALT {typeof telemetry?.altitude === "number" ? telemetry.altitude.toFixed(1) : "120.0"}m
        </span>
      </div>

      {/* 2. Floating Mission Planning Toolbar (Top-Center) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100vw-24px)] sm:max-w-none">
        <MissionPlanningToolbar
          planner={planner}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenPreview={() => setIsPreviewOpen(true)}
          onOpenSave={() => {
            setStorageTab("save");
            setIsStorageOpen(true);
          }}
          onOpenLoad={() => {
            setStorageTab("load");
            setIsStorageOpen(true);
          }}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenClear={() => setIsClearOpen(true)}
        />
      </div>

      {/* 3. Floating Map Style Selector (Top-Right) */}
      <div className="absolute top-3 right-3 z-10 flex items-center bg-[#080C14CC] border border-[#1A2633] backdrop-blur-md rounded-lg p-1 shadow-lg gap-1 pointer-events-auto">
        {mapStyleOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMapStyle(opt.id)}
            className={`px-2.5 py-1 text-[10px] sm:text-xs font-mono font-semibold rounded-md transition ${
              mapStyle === opt.id
                ? "bg-[#35E0FF2E] border border-[#1A5A68] text-[#35E0FF] shadow-[0_0_8px_rgba(53,224,255,0.25)]"
                : "text-[#5D707C] hover:text-[#94A3B8]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 4. Active Waypoint Placement Banner (Below Toolbar) */}
      {planner.isPlacingMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <WaypointPlacementBanner
            placingType={planner.placingType}
            onCancel={planner.cancelPlacingMode}
          />
        </div>
      )}

      {/* ==================== FLOATING PANELS ==================== */}

      {/* 5. Waypoint Details Editor Panel (Floating on Right) */}
      {planner.selectedWaypoint && (
        <div className="absolute top-16 right-3 z-20 pointer-events-auto">
          <WaypointDetailsPanel
            waypoint={planner.selectedWaypoint}
            onUpdate={planner.updateWaypoint}
            onDelete={planner.deleteWaypoint}
            onClose={() => planner.setSelectedWaypointId(null)}
          />
        </div>
      )}

      {/* ==================== BOTTOM HUD PANELS ==================== */}

      {/* 6. Mission Items List HUD (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-auto max-w-[280px] sm:max-w-xs">
        <MissionItemListHUD
          items={planner.items}
          selectedWaypointId={planner.selectedWaypointId}
          onSelectWaypoint={(id) => planner.setSelectedWaypointId(id)}
          onMoveOrder={planner.moveWaypointOrder}
          onDeleteWaypoint={planner.deleteWaypoint}
        />
      </div>

      {/* 7. Mission Metrics Summary HUD (Bottom-Right) */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-auto max-w-xs">
        <MissionSummaryHUD
          itemsCount={planner.items.length}
          formattedDistance={planner.formattedDistance}
          formattedDuration={planner.formattedDuration}
          maxAltitude={planner.maxAltitude}
        />
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <MissionSettingsModal
          settings={planner.missionSettings}
          onSaveSettings={(newSettings) =>
            planner.setMissionSettings((prev) => ({ ...prev, ...newSettings }))
          }
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Preview Modal */}
      {isPreviewOpen && (
        <MissionPreviewModal
          missionName={planner.missionName}
          items={planner.items}
          formattedDistance={planner.formattedDistance}
          maxAltitude={planner.maxAltitude}
          formattedDuration={planner.formattedDuration}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {/* Save & Load Storage Modal */}
      <MissionStorageModal
        isOpen={isStorageOpen}
        initialTab={storageTab}
        onClose={() => setIsStorageOpen(false)}
        planner={planner}
      />

      {/* Mission Upload Modal (Simulation Mode Ready) */}
      <MissionUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        planner={planner}
        telemetry={telemetry}
      />

      {/* Clear Mission Confirmation Modal */}
      <ClearMissionModal
        isOpen={isClearOpen}
        onClose={() => setIsClearOpen(false)}
        onConfirm={planner.clearMission}
        itemCount={planner.items.length}
      />
    </div>
  );
};

export default MissionsPage;
