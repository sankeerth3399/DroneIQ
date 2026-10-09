/**
 * Waypoint Marker HTML Generator matching the AeroNexus DroneIQ reference styling
 * Features circular electric cyan border, dark midnight core, bold WP number,
 * and high-contrast altitude tag below.
 */

export const buildWaypointMarkerHtml = (wp, isSelected = false) => {
  const seqNum = wp?.seq ?? wp?.sequence ?? 1;
  const badgeText = `WP${seqNum}`;
  const rawAlt = typeof wp?.alt === "number" ? wp.alt : typeof wp?.altitude === "number" ? wp.altitude : 50;
  const altitude = Math.round(rawAlt);

  const cyanColor = "#35E0FF";
  const cyanGlow = "rgba(53, 224, 255, 0.55)";
  const bgDark = "#08131F";

  const selectedRing = isSelected
    ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; border: 2px solid ${cyanColor}; box-shadow: 0 0 14px ${cyanColor}; animation: pulse 1.5s infinite; pointer-events: none;"></div>`
    : "";

  return `
    <div class="waypoint-marker-shell" data-wp-id="${wp?.id || badgeText}" style="position: relative; width: 28px; height: 28px; cursor: pointer; user-select: none; z-index: ${isSelected ? 45 : 35}; transform-origin: 50% 50%;">
      ${selectedRing}
      <!-- High-contrast Circular Cyan Waypoint Marker Shell (Compact 28px) -->
      <div class="waypoint-circle" style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background: ${bgDark}; border: 2px solid ${cyanColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px ${cyanGlow}, 0 3px 8px rgba(0, 0, 0, 0.95); transition: transform 0.15s ease, border-color 0.15s ease;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif; font-size: ${badgeText.length > 3 ? "9px" : "10px"}; font-weight: 800; color: ${cyanColor}; letter-spacing: -0.02em; line-height: 1; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95); pointer-events: none;">
          ${badgeText}
        </span>
      </div>
      <!-- Altitude Tag Pill Below Marker (Proportionally Compact) -->
      <div class="waypoint-alt-pill" style="position: absolute; top: 30px; left: 50%; transform: translateX(-50%); white-space: nowrap; pointer-events: none;">
        <span style="display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 9px; font-weight: 700; color: #FFFFFF; background: ${bgDark}; border: 1px solid rgba(53, 224, 255, 0.4); padding: 0.5px 4px; border-radius: 3px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.9); letter-spacing: -0.02em; line-height: 1.2;">
          ${altitude}m
        </span>
      </div>
    </div>
  `;
};
