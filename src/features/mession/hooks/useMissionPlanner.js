import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  calculateMissionDistance,
  calculateMissionDuration,
  calculateMaxAltitude,
  formatDistance,
  formatDuration,
  renumberMissionItems,
  validateMissionPlan,
} from "../utils/missionCalculations.js";

const DEFAULT_SETTINGS = {
  defaultAlt: 50,
  defaultSpeed: 8.5,
  defaultHoldTime: 0,
  defaultHeading: "Auto",
  onComplete: "RTL", // "RTL" | "LAND" | "HOVER"
};

const STORAGE_KEY_CURRENT_MISSION = "aeronexus_active_mission_plan";
const STORAGE_KEY_SAVED_MISSIONS = "aeronexus_saved_missions_list";

/**
 * Single source of truth mission state hook for QGroundControl-style waypoint planning
 */
export function useMissionPlanner() {
  const [missionName, setMissionName] = useState("AeroNexus Mission 01");
  const [missionSettings, setMissionSettings] = useState(DEFAULT_SETTINGS);

  // Initialize from local cache if existing, else start with clean state
  const [items, setItems] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_CURRENT_MISSION);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.items)) {
          return renumberMissionItems(parsed.items);
        }
      }
    } catch {
      // Ignore cache parse errors
    }
    return [];
  });

  // Undo / Redo history stacks
  const [history, setHistory] = useState([items]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Active placement mode
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [placingType, setPlacingType] = useState("WAYPOINT");

  // Selected item state
  const [selectedWaypointId, setSelectedWaypointId] = useState(null);

  // Push new state snapshot to undo/redo history
  const pushToHistory = useCallback((newItems) => {
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, newItems];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Persist active mission items to local cache
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_CURRENT_MISSION,
        JSON.stringify({
          name: missionName,
          settings: missionSettings,
          items,
        })
      );
    } catch {
      // Safe ignore storage quota
    }
  }, [items, missionName, missionSettings]);

  // Sync selected waypoint if deleted
  useEffect(() => {
    if (selectedWaypointId && !items.some((it) => it.id === selectedWaypointId)) {
      setSelectedWaypointId(items[0]?.id || null);
    }
  }, [items, selectedWaypointId]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    const nextIdx = historyIndex - 1;
    setHistoryIndex(nextIdx);
    setItems(history[nextIdx]);
  }, [canUndo, historyIndex, history]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const nextIdx = historyIndex + 1;
    setHistoryIndex(nextIdx);
    setItems(history[nextIdx]);
  }, [canRedo, historyIndex, history]);

  // Start adding waypoint on map
  const startPlacingMode = useCallback((type = "WAYPOINT") => {
    setPlacingType(type);
    setIsPlacingMode(true);
  }, []);

  const cancelPlacingMode = useCallback(() => {
    setIsPlacingMode(false);
  }, []);

  // Add waypoint at given GPS coordinate
  const addWaypointAtCoordinates = useCallback(
    (coords, overrideType) => {
      if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") return;

      const type = overrideType || placingType || "WAYPOINT";
      const newId = `wp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      let alt = missionSettings.defaultAlt;
      if (type === "LAND" || type === "RTL") alt = 0;
      if (type === "TAKEOFF") alt = Math.min(missionSettings.defaultAlt, 30);

      const newItem = {
        id: newId,
        type,
        lat: Number(coords.lat.toFixed(6)),
        lng: Number(coords.lng.toFixed(6)),
        alt,
        speed: missionSettings.defaultSpeed,
        holdTime: missionSettings.defaultHoldTime,
        heading: missionSettings.defaultHeading,
        customHeading: 0,
      };

      setItems((prev) => {
        const next = renumberMissionItems([...prev, newItem]);
        pushToHistory(next);
        return next;
      });

      setSelectedWaypointId(newId);
    },
    [placingType, missionSettings, pushToHistory]
  );

  // Real-time drag updates (fast coordinate updating without cluttering undo history)
  const updateWaypointCoordinates = useCallback((id, coords) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              lat: Number(coords.lat.toFixed(6)),
              lng: Number(coords.lng.toFixed(6)),
            }
          : it
      )
    );
  }, []);

  // Finish dragging waypoint (records single step in undo history)
  const finishWaypointDrag = useCallback(
    (id, coords) => {
      setItems((prev) => {
        const next = prev.map((it) =>
          it.id === id
            ? {
                ...it,
                lat: Number(coords.lat.toFixed(6)),
                lng: Number(coords.lng.toFixed(6)),
              }
            : it
        );
        pushToHistory(next);
        return next;
      });
    },
    [pushToHistory]
  );

  // Update specific waypoint properties (alt, speed, hold, heading)
  const updateWaypoint = useCallback(
    (id, updates) => {
      setItems((prev) => {
        const next = renumberMissionItems(
          prev.map((it) => (it.id === id ? { ...it, ...updates } : it))
        );
        pushToHistory(next);
        return next;
      });
    },
    [pushToHistory]
  );

  // Delete selected or specific waypoint
  const deleteWaypoint = useCallback(
    (id) => {
      const targetId = id || selectedWaypointId;
      if (!targetId) return;

      setItems((prev) => {
        const next = renumberMissionItems(prev.filter((it) => it.id !== targetId));
        pushToHistory(next);
        return next;
      });

      if (selectedWaypointId === targetId) {
        setSelectedWaypointId(null);
      }
    },
    [selectedWaypointId, pushToHistory]
  );

  // Reorder waypoint sequence (direction: -1 for UP, +1 for DOWN)
  const moveWaypointOrder = useCallback(
    (index, direction) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= items.length) return;

      setItems((prev) => {
        const reordered = [...prev];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(targetIndex, 0, moved);
        const next = renumberMissionItems(reordered);
        pushToHistory(next);
        return next;
      });
    },
    [items.length, pushToHistory]
  );

  // Clear all items with confirmation
  const clearMission = useCallback(() => {
    setItems([]);
    setSelectedWaypointId(null);
    setIsPlacingMode(false);
    pushToHistory([]);
  }, [pushToHistory]);

  // Selected item helper
  const selectedWaypoint = useMemo(() => {
    return items.find((it) => it.id === selectedWaypointId) || null;
  }, [items, selectedWaypointId]);

  // Dynamic calculations
  const totalDistance = useMemo(() => calculateMissionDistance(items), [items]);
  const formattedDistance = useMemo(() => formatDistance(totalDistance), [totalDistance]);

  const totalDuration = useMemo(
    () => calculateMissionDuration(items, missionSettings.defaultSpeed),
    [items, missionSettings.defaultSpeed]
  );
  const formattedDuration = useMemo(() => formatDuration(totalDuration), [totalDuration]);

  const maxAltitude = useMemo(() => calculateMaxAltitude(items), [items]);

  const validation = useMemo(() => validateMissionPlan(items), [items]);

  // LocalStorage Saved Missions management
  const listSavedMissions = useCallback(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SAVED_MISSIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }, []);

  const saveMissionToStorage = useCallback(
    (customName) => {
      const nameToUse = (customName || missionName || "Mission").trim();
      const savedList = listSavedMissions();

      const newMissionEntry = {
        id: `mission-${Date.now()}`,
        name: nameToUse,
        timestamp: new Date().toISOString(),
        items,
        settings: missionSettings,
        stats: {
          itemsCount: items.length,
          distance: formattedDistance,
          duration: formattedDuration,
          maxAlt: maxAltitude,
        },
      };

      const updated = [newMissionEntry, ...savedList.filter((m) => m.name !== nameToUse)];
      localStorage.setItem(STORAGE_KEY_SAVED_MISSIONS, JSON.stringify(updated));
      setMissionName(nameToUse);
      return newMissionEntry;
    },
    [missionName, items, missionSettings, formattedDistance, formattedDuration, maxAltitude, listSavedMissions]
  );

  const loadMissionFromStorage = useCallback(
    (missionId) => {
      const savedList = listSavedMissions();
      const target = savedList.find((m) => m.id === missionId);
      if (!target || !Array.isArray(target.items)) return false;

      const restoredItems = renumberMissionItems(target.items);
      setItems(restoredItems);
      setMissionName(target.name || "Restored Mission");
      if (target.settings) {
        setMissionSettings((prev) => ({ ...prev, ...target.settings }));
      }
      setSelectedWaypointId(restoredItems[0]?.id || null);
      pushToHistory(restoredItems);
      return true;
    },
    [listSavedMissions, pushToHistory]
  );

  const deleteSavedMissionFromStorage = useCallback(
    (missionId) => {
      const savedList = listSavedMissions();
      const updated = savedList.filter((m) => m.id !== missionId);
      localStorage.setItem(STORAGE_KEY_SAVED_MISSIONS, JSON.stringify(updated));
      return updated;
    },
    [listSavedMissions]
  );

  return {
    missionName,
    setMissionName,
    missionSettings,
    setMissionSettings,
    items,
    selectedWaypointId,
    setSelectedWaypointId,
    selectedWaypoint,
    isPlacingMode,
    placingType,
    startPlacingMode,
    cancelPlacingMode,
    addWaypointAtCoordinates,
    updateWaypointCoordinates,
    finishWaypointDrag,
    updateWaypoint,
    deleteWaypoint,
    moveWaypointOrder,
    clearMission,
    canUndo,
    canRedo,
    undo,
    redo,
    totalDistance,
    formattedDistance,
    totalDuration,
    formattedDuration,
    maxAltitude,
    validation,
    listSavedMissions,
    saveMissionToStorage,
    loadMissionFromStorage,
    deleteSavedMissionFromStorage,
  };
}

export default useMissionPlanner;
