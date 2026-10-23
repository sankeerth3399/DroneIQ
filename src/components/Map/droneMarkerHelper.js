/**
 * Top-Down Drone Aircraft Marker Generator
 * Features 1.5x length directional arrow, dual carbon arms, motor beacons, and callsign chip
 */

/**
 * Natural orientation offset of the drone SVG asset.
 * The SVG's directional arrow points directly North / Up (0° in SVG space).
 * Therefore VISUAL_MARKER_OFFSET is 0°.
 */
export const VISUAL_MARKER_OFFSET = 0;

export const getVisualRotation = (heading = 0) => {
  return ((heading + VISUAL_MARKER_OFFSET) % 360 + 360) % 360;
};

export const buildDroneMarkerLabelHtml = (callsign, options = {}) => {
  const {
    name = null,
    selected = false,
  } = options;

  const borderColor = selected ? "#35E0FF" : "rgba(53, 224, 255, 0.45)";
  const cleanId = callsign ? String(callsign).trim() : "DRONE";
  const cleanName = name && String(name).trim() !== cleanId ? String(name).trim() : "";

  return `
    <div style="display: inline-flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; font-size: 11px; font-weight: 700; color: #FFFFFF; background: rgba(11, 25, 44, 0.95); border: 1.5px solid ${borderColor}; padding: 2px 7px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.85); backdrop-filter: blur(4px); white-space: nowrap;">
      <span style="color: #FFFFFF; letter-spacing: 0.02em;">${cleanId}</span>
      ${cleanName ? `<span style="color: #8CC8FF; font-weight: 600; font-size: 10px; margin-left: 4px;">· ${cleanName}</span>` : ""}
    </div>
  `;
};

export const updateDroneMarkerDom = (markerEl, callsign, heading, options = {}) => {
  if (!markerEl) return;
  const rotator = markerEl.querySelector(".drone-marker-rotator");
  if (rotator) {
    const visualRot = getVisualRotation(heading);
    rotator.style.transform = `rotate(${visualRot}deg)`;
  }
  const labelEl = markerEl.querySelector(".drone-marker-label");
  if (labelEl) {
    labelEl.innerHTML = buildDroneMarkerLabelHtml(callsign, options);
  }
};

export const buildDroneMarkerHtml = (callsign, initialHeading = 0, options = {}) => {
  const visualRot = getVisualRotation(initialHeading);
  return `
    <div class="drone-marker-shell" style="position: relative; width: 68px; height: 68px; cursor: pointer; pointer-events: auto; z-index: 50;">
      <!-- Scaler wrapper for responsive map zoom scaling -->
      <div class="drone-marker-scaler" style="position: relative; width: 100%; height: 100%; transform: scale(1); transform-origin: 50% 50%; transition: transform 0.2s ease;">
        <!-- Rotator Element: pivots around center (50% 50%), isolates rotation from Mappls translation -->
        <div class="drone-marker-rotator" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform-origin: 50% 50%; transform: rotate(${visualRot}deg); transition: transform 0.08s linear; will-change: transform;">
          <svg width="68" height="68" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 10px rgba(53, 224, 255, 0.75)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.9));">
            <!-- Subtle Range / Sensor Circle -->
            <circle cx="50" cy="54" r="38" stroke="#35E0FF" stroke-width="1.2" stroke-opacity="0.22" stroke-dasharray="4 4" />

            <!-- Rear Motor Carbon Arms -->
            <line x1="50" y1="54" x2="22" y2="76" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="22" y2="76" stroke="#1F3A4E" stroke-width="2.5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="78" y2="76" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="78" y2="76" stroke="#1F3A4E" stroke-width="2.5" stroke-linecap="round" />

            <!-- Front Motor Carbon Arms -->
            <line x1="50" y1="54" x2="20" y2="40" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="20" y2="40" stroke="#35E0FF" stroke-width="2.5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="80" y2="40" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="80" y2="40" stroke="#35E0FF" stroke-width="2.5" stroke-linecap="round" />

            <!-- Rear Motors / Rotors (Distinct crimson/amber nav beacons for rear distinction) -->
            <circle cx="22" cy="76" r="9.5" fill="#0A0F16" stroke="#1A2D3C" stroke-width="2" />
            <circle cx="22" cy="76" r="4" fill="#FF4757" fill-opacity="0.85" />
            <circle cx="78" cy="76" r="9.5" fill="#0A0F16" stroke="#1A2D3C" stroke-width="2" />
            <circle cx="78" cy="76" r="4" fill="#FF4757" fill-opacity="0.85" />

            <!-- Front Motors / Rotors (Cyan motor hubs) -->
            <circle cx="20" cy="40" r="9.5" fill="#0A0F16" stroke="#35E0FF" stroke-width="2" />
            <circle cx="20" cy="40" r="4" fill="#35E0FF" />
            <circle cx="80" cy="40" r="9.5" fill="#0A0F16" stroke="#35E0FF" stroke-width="2" />
            <circle cx="80" cy="40" r="4" fill="#35E0FF" />

            <!-- Central Avionics Body / Fuselage -->
            <rect x="38" y="42" width="24" height="26" rx="6" fill="#070B10" stroke="#224054" stroke-width="2" />
            <!-- Center Status Core (Emerald Green LED) -->
            <circle cx="50" cy="54" r="4" fill="#2FE089" stroke="#070B10" stroke-width="1.2" />

            <!-- PROMINENT DIRECTIONAL ARROW / NOSE (1.5x body length, pointing North / 0° forward) -->
            <!-- High-contrast dark outline -->
            <polygon points="50,3 67,35 50,25 33,35" fill="#04070A" stroke="#04070A" stroke-width="3.5" stroke-linejoin="round" />
            <!-- Bright Neon Cyan Primary Arrow -->
            <polygon points="50,5 65,33 50,24 35,33" fill="#35E0FF" stroke="#35E0FF" stroke-width="1.2" stroke-linejoin="round" />
            <!-- Directional Facet Highlight & White Spine Keel -->
            <polygon points="50,5 65,33 50,24" fill="#1EB8D8" fill-opacity="0.5" />
            <line x1="50" y1="6" x2="50" y2="24" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>

        <!-- Dynamic Callsign & Telemetry Info Badge (Anchored below, non-rotating so text remains horizontal) -->
        <div class="drone-marker-label" style="position: absolute; top: 70px; left: 50%; transform: translateX(-50%); white-space: nowrap; pointer-events: none; z-index: 60;">
          ${buildDroneMarkerLabelHtml(callsign, options)}
        </div>
      </div>
    </div>
  `;
};

/**
 * Top-Down Simulated Drone Aircraft Marker Generator
 * Features vivid electric purple/violet color scheme, animated pulsing halo,
 * directional flight arrow, and explicit SIMULATION badge.
 */
export const buildSimulatedDroneMarkerHtml = (initialHeading = 0, altitude = 50, label = "SIMULATION") => {
  const visualRot = getVisualRotation(initialHeading);
  return `
    <div class="sim-drone-marker-shell" style="position: relative; width: 68px; height: 68px; cursor: pointer; pointer-events: auto; z-index: 65;">
      <div class="sim-drone-marker-scaler" style="position: relative; width: 100%; height: 100%;">
        <!-- Pulsing Aura Halo for Simulation Aircraft -->
        <div style="position: absolute; inset: 4px; border-radius: 50%; background: rgba(168, 85, 247, 0.22); border: 1.5px solid rgba(192, 132, 252, 0.7); box-shadow: 0 0 16px rgba(192, 132, 252, 0.75); animation: pulse 1.8s infinite; pointer-events: none;"></div>

        <!-- Rotator Element -->
        <div class="sim-drone-marker-rotator" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform: rotate(${visualRot}deg); transition: transform 0.08s linear; will-change: transform;">
          <svg width="68" height="68" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 12px rgba(192, 132, 252, 0.95)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.9));">
            <!-- Simulated Sensor Range Circle -->
            <circle cx="50" cy="54" r="38" stroke="#C084FC" stroke-width="1.2" stroke-opacity="0.35" stroke-dasharray="4 4" />

            <!-- Rear Motor Carbon Arms -->
            <line x1="50" y1="54" x2="22" y2="76" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="22" y2="76" stroke="#4C1D95" stroke-width="2.5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="78" y2="76" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="78" y2="76" stroke="#4C1D95" stroke-width="2.5" stroke-linecap="round" />

            <!-- Front Motor Carbon Arms -->
            <line x1="50" y1="54" x2="20" y2="40" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="20" y2="40" stroke="#C084FC" stroke-width="2.5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="80" y2="40" stroke="#05080C" stroke-width="5" stroke-linecap="round" />
            <line x1="50" y1="54" x2="80" y2="40" stroke="#C084FC" stroke-width="2.5" stroke-linecap="round" />

            <!-- Rear Motors -->
            <circle cx="22" cy="76" r="9.5" fill="#0A0F16" stroke="#4C1D95" stroke-width="2" />
            <circle cx="22" cy="76" r="4" fill="#F472B6" fill-opacity="0.9" />
            <circle cx="78" cy="76" r="9.5" fill="#0A0F16" stroke="#4C1D95" stroke-width="2" />
            <circle cx="78" cy="76" r="4" fill="#F472B6" fill-opacity="0.9" />

            <!-- Front Motors -->
            <circle cx="20" cy="40" r="9.5" fill="#0A0F16" stroke="#C084FC" stroke-width="2" />
            <circle cx="20" cy="40" r="4" fill="#E879F9" />
            <circle cx="80" cy="40" r="9.5" fill="#0A0F16" stroke="#C084FC" stroke-width="2" />
            <circle cx="80" cy="40" r="4" fill="#E879F9" />

            <!-- Fuselage -->
            <rect x="38" y="42" width="24" height="26" rx="6" fill="#0E071A" stroke="#7E22CE" stroke-width="2" />
            <circle cx="50" cy="54" r="4" fill="#C084FC" stroke="#0E071A" stroke-width="1.2" />

            <!-- Directional Flight Arrow -->
            <polygon points="50,3 67,35 50,25 33,35" fill="#04070A" stroke="#04070A" stroke-width="3.5" stroke-linejoin="round" />
            <polygon points="50,5 65,33 50,24 35,33" fill="#C084FC" stroke="#C084FC" stroke-width="1.2" stroke-linejoin="round" />
            <polygon points="50,5 65,33 50,24" fill="#9333EA" fill-opacity="0.5" />
            <line x1="50" y1="6" x2="50" y2="24" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>

        <!-- Simulation Callout Pill -->
        <div class="sim-drone-marker-label" style="position: absolute; top: 70px; left: 50%; transform: translateX(-50%); white-space: nowrap; pointer-events: none; z-index: 60;">
          <div style="display: inline-flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; font-weight: 700; color: #FFFFFF; background: rgba(19, 10, 31, 0.95); border: 1.5px solid #C084FC; padding: 2px 7px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.85); backdrop-filter: blur(4px); white-space: nowrap; gap: 5px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #C084FC; box-shadow: 0 0 6px #C084FC;"></span>
            <span style="color: #F3E8FF; letter-spacing: 0.04em;">${label}</span>
            <span style="color: #C084FC; font-weight: 600;">${Math.round(altitude)}m</span>
          </div>
        </div>
      </div>
    </div>
  `;
};

export const updateSimulatedDroneMarkerDom = (markerEl, heading = 0, altitude = 50, label = "SIMULATION") => {
  if (!markerEl) return;
  const rotator = markerEl.querySelector(".sim-drone-marker-rotator");
  if (rotator) {
    const visualRot = getVisualRotation(heading);
    rotator.style.transform = `rotate(${visualRot}deg)`;
  }
  const labelEl = markerEl.querySelector(".sim-drone-marker-label");
  if (labelEl) {
    labelEl.innerHTML = `
      <div style="display: inline-flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; font-weight: 700; color: #FFFFFF; background: rgba(19, 10, 31, 0.95); border: 1.5px solid #C084FC; padding: 2px 7px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.85); backdrop-filter: blur(4px); white-space: nowrap; gap: 5px;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #C084FC; box-shadow: 0 0 6px #C084FC;"></span>
        <span style="color: #F3E8FF; letter-spacing: 0.04em;">${label}</span>
        <span style="color: #C084FC; font-weight: 600;">${Math.round(altitude)}m</span>
      </div>
    `;
  }
};
