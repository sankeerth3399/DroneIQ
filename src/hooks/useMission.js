import { useContext } from "react";
import MissionContext from "@/context/missionContextCore.js";

/**
 * Hook to access centralized mission, project, and geofence state.
 */
export function useMission() {
  const context = useContext(MissionContext);
  if (!context) {
    throw new Error("useMission must be used within a MissionProvider");
  }
  return context;
}

export default useMission;
