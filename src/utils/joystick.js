/**
 * Joystick Direction & Control Helpers
 */

const DEADZONE = 0.04;

/**
 * Calculates human-readable joystick direction relative to standard pitch/roll inputs
 * @param {number} pitch - Vertical input: +1 (Forward), -1 (Backward)
 * @param {number} roll  - Horizontal input: +1 (Right), -1 (Left)
 * @returns {string} Direction label
 */
export function getJoystickDirectionLabel(pitch = 0, roll = 0) {
  const p = Math.abs(pitch) > DEADZONE ? pitch : 0;
  const r = Math.abs(roll) > DEADZONE ? roll : 0;
  if (p === 0 && r === 0) return "NEUTRAL";
  if (p > 0 && r === 0) return "FORWARD";
  if (p < 0 && r === 0) return "BACKWARD";
  if (r > 0 && p === 0) return "RIGHT";
  if (r < 0 && p === 0) return "LEFT";
  if (p > 0 && r > 0) return "FORWARD-RIGHT";
  if (p > 0 && r < 0) return "FORWARD-LEFT";
  if (p < 0 && r > 0) return "BACKWARD-RIGHT";
  if (p < 0 && r < 0) return "BACKWARD-LEFT";
  return "NEUTRAL";
}
