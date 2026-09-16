/**
 * Top-Down Drone Aircraft Marker Generator
 * Features 1.5x length directional arrow, dual carbon arms, motor beacons, and callsign chip
 */

export const buildDroneMarkerHtml = (callsign, initialHeading = 0) => {
  return `
    <div class="drone-marker-shell" style="position: relative; width: 68px; height: 68px; cursor: pointer; pointer-events: auto; z-index: 50;">
      <!-- Scaler wrapper for responsive map zoom scaling -->
      <div class="drone-marker-scaler" style="position: relative; width: 100%; height: 100%; transform: scale(1); transform-origin: 50% 50%; transition: transform 0.2s ease;">
        <!-- Rotator Element: pivots around center (50% 50%), isolates rotation from Mappls translation -->
        <div class="drone-marker-rotator" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform-origin: 50% 50%; transform: rotate(${initialHeading}deg); transition: transform 0.08s linear; will-change: transform;">
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

        <!-- Callsign Badge (Anchored below, non-rotating so text remains horizontal) -->
        <div style="position: absolute; top: 70px; left: 50%; transform: translateX(-50%); white-space: nowrap; pointer-events: none;">
          <span style="display: inline-block; font-family: monospace; font-size: 9.5px; font-weight: 700; color: #35E0FF; background: rgba(8, 12, 20, 0.92); border: 1px solid rgba(53, 224, 255, 0.5); padding: 1px 5px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.7); letter-spacing: 0.05em;">
            ${callsign}
          </span>
        </div>
      </div>
    </div>
  `;
};
