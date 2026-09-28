/**
 * Joystick Direction & Control Helpers
 */

const DEADZONE = 0.04;

/**
 * Calculates human-readable joystick direction relative to standard pitch/roll/throttle/yaw inputs
 * @param {number} pitch    - Vertical right-stick: +1 (Forward), -1 (Backward)
 * @param {number} roll     - Horizontal right-stick: +1 (Right), -1 (Left)
 * @param {number} throttle - Vertical left-stick: +1 (Climb), -1 (Descend)
 * @param {number} yaw      - Horizontal left-stick: +1 (Yaw Right), -1 (Yaw Left)
 * @returns {string} Direction label
 */
export function getJoystickDirectionLabel(pitch = 0, roll = 0, throttle = 0, yaw = 0) {
  const p = Math.abs(pitch) > DEADZONE ? pitch : 0;
  const r = Math.abs(roll) > DEADZONE ? roll : 0;
  const t = Math.abs(throttle) > DEADZONE ? throttle : 0;
  const y = Math.abs(yaw) > DEADZONE ? yaw : 0;

  if (p === 0 && r === 0 && t === 0 && y === 0) return "NEUTRAL";
  if (p > 0 && r === 0) return "FORWARD";
  if (p < 0 && r === 0) return "BACKWARD";
  if (r > 0 && p === 0) return "RIGHT";
  if (r < 0 && p === 0) return "LEFT";
  if (p > 0 && r > 0) return "FORWARD-RIGHT";
  if (p > 0 && r < 0) return "FORWARD-LEFT";
  if (p < 0 && r > 0) return "BACKWARD-RIGHT";
  if (p < 0 && r < 0) return "BACKWARD-LEFT";

  // If right stick is neutral, check left stick (Throttle & Yaw)
  if (t > 0 && y === 0) return "CLIMB";
  if (t < 0 && y === 0) return "DESCEND";
  if (y > 0 && t === 0) return "YAW RIGHT";
  if (y < 0 && t === 0) return "YAW LEFT";
  if (t > 0 && y > 0) return "CLIMB + YAW R";
  if (t > 0 && y < 0) return "CLIMB + YAW L";
  if (t < 0 && y > 0) return "DESCEND + YAW R";
  if (t < 0 && y < 0) return "DESCEND + YAW L";

  return "ACTIVE";
}

/**
 * Short movement abbreviation for Dev HUD (Section 26)
 * Format: N / F / B / L / R / YAW-L / YAW-R / CLIMB / DESCEND
 */
export function getMovementAbbreviation(pitch = 0, roll = 0, throttle = 0, yaw = 0) {
  const p = Math.abs(pitch) > 0.08 ? pitch : 0;
  const r = Math.abs(roll) > 0.08 ? roll : 0;
  const t = Math.abs(throttle) > 0.08 ? throttle : 0;
  const y = Math.abs(yaw) > 0.08 ? yaw : 0;

  if (p === 0 && r === 0 && t === 0 && y === 0) return "N";
  if (t > 0) return "CLIMB";
  if (t < 0) return "DESCEND";
  if (y > 0) return "YAW-R";
  if (y < 0) return "YAW-L";
  if (p > 0 && r === 0) return "F";
  if (p < 0 && r === 0) return "B";
  if (r > 0 && p === 0) return "R";
  if (r < 0 && p === 0) return "L";
  if (p > 0 && r > 0) return "F-R";
  if (p > 0 && r < 0) return "F-L";
  if (p < 0 && r > 0) return "B-R";
  if (p < 0 && r < 0) return "B-L";

  return "ACTIVE";
}
