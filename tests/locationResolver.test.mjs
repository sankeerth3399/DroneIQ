import assert from 'node:assert/strict';
import { resolveDroneDisplayPosition } from '../src/services/telemetry/telemetryTypes.js';

const fallback = { latitude: 17.385, longitude: 78.4867 };

assert.deepEqual(
  resolveDroneDisplayPosition({ liveDroneConnected: false, validLiveGps: false, activeDroneId: null }),
  { ...fallback, source: 'HYDERABAD_FALLBACK' },
  'No live drone should stay in Hyderabad'
);

assert.deepEqual(
  resolveDroneDisplayPosition({
    liveDroneConnected: true,
    validLiveGps: true,
    activeDroneId: 'DRONE-001',
    latitude: 17.412345,
    longitude: 78.498765,
  }),
  { latitude: 17.412345, longitude: 78.498765, source: 'LIVE_TELEMETRY' },
  'Live drone with valid GPS should use actual coordinates'
);

assert.deepEqual(
  resolveDroneDisplayPosition({
    liveDroneConnected: false,
    validLiveGps: true,
    activeDroneId: 'DRONE-001',
    latitude: 37.415458,
    longitude: -122.04145,
  }),
  { ...fallback, source: 'HYDERABAD_FALLBACK' },
  'Disconnected live state must ignore stale or foreign coordinates'
);

console.log('locationResolver tests passed');
