/**
 * Waypoint Marker HTML Generator
 * Generates circular target badge with command colors, altitude sub-tag, and selection ring
 */

export const buildWaypointMarkerHtml = (wp, isSelected) => {
  const isTakeoff = wp.type === "TAKEOFF";
  const isLand = wp.type === "LAND";
  const isRtl = wp.type === "RTL";

  let mainColor = "#35E0FF";
  let bgGlow = "rgba(53, 224, 255, 0.4)";
  let badgeText = wp.label || `WP${wp.seq || 1}`;

  if (isTakeoff) {
    mainColor = "#2FE089";
    bgGlow = "rgba(47, 224, 137, 0.45)";
  } else if (isLand) {
    mainColor = "#F59E0B";
    bgGlow = "rgba(245, 158, 11, 0.45)";
  } else if (isRtl) {
    mainColor = "#A78BFA";
    bgGlow = "rgba(167, 139, 250, 0.45)";
  }

  const selectedRing = isSelected
    ? `<div style="position: absolute; inset: -6px; border-radius: 9999px; border: 2px solid ${mainColor}; box-shadow: 0 0 16px ${mainColor}; animation: pulse 1.5s infinite;"></div>`
    : "";

  return `
    <div class="waypoint-marker-shell" data-wp-id="${wp.id}" style="position: relative; width: 34px; height: 34px; cursor: pointer; user-select: none; z-index: ${isSelected ? 40 : 30};">
      ${selectedRing}
      <div style="position: relative; width: 34px; height: 34px; border-radius: 9999px; background: rgba(8, 12, 20, 0.94); border: 2px solid ${mainColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px ${bgGlow}, 0 4px 10px rgba(0,0,0,0.85); transition: transform 0.15s ease;">
        <span style="font-family: monospace; font-size: ${badgeText.length > 3 ? "8.5px" : "11px"}; font-weight: 800; color: ${mainColor}; letter-spacing: -0.02em;">
          ${badgeText}
        </span>
      </div>
      <!-- Altitude Tag -->
      <div style="position: absolute; top: 36px; left: 50%; transform: translateX(-50%); white-space: nowrap; pointer-events: none;">
        <span style="display: inline-block; font-family: monospace; font-size: 9px; font-weight: 700; color: #EEF4F8; background: rgba(8, 12, 20, 0.92); border: 1px solid rgba(255, 255, 255, 0.18); padding: 0.5px 4px; border-radius: 3px; box-shadow: 0 2px 6px rgba(0,0,0,0.7);">
          ${wp.alt || 0}m
        </span>
      </div>
    </div>
  `;
};
