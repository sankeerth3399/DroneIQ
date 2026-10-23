import rgbCameraImg from "./rgb-camera.png";
import thermalCameraImg from "./thermal-camera.png";
import lidarSensorImg from "./lidar-sensor.png";
import multispectralCameraImg from "./multispectral-camera.png";
import gasSensorImg from "./gas-sensor.png";
import zoomCameraImg from "./zoom-camera.png";
import speakerSirenImg from "./speaker-siren.png";
import dropMechanismImg from "./drop-mechanism.png";

export const PAYLOAD_IMAGES = {
  rgb: rgbCameraImg,
  "rgb-camera": rgbCameraImg,
  thermal: thermalCameraImg,
  "thermal-camera": thermalCameraImg,
  lidar: lidarSensorImg,
  "lidar-sensor": lidarSensorImg,
  multispectral: multispectralCameraImg,
  "multispectral-camera": multispectralCameraImg,
  gas: gasSensorImg,
  "gas-sensor": gasSensorImg,
  zoom: zoomCameraImg,
  "zoom-camera": zoomCameraImg,
  speaker: speakerSirenImg,
  "speaker-siren": speakerSirenImg,
  drop: dropMechanismImg,
  "drop-mechanism": dropMechanismImg,
};

/**
 * Safely resolves a payload product image by id, slug, or title string.
 * Returns null if not recognized, allowing a graceful icon fallback.
 */
export const getPayloadImage = (idOrName) => {
  if (!idOrName) return null;
  const key = String(idOrName).toLowerCase().trim();
  if (PAYLOAD_IMAGES[key]) return PAYLOAD_IMAGES[key];

  if (key.includes("rgb")) return rgbCameraImg;
  if (key.includes("thermal")) return thermalCameraImg;
  if (key.includes("lidar")) return lidarSensorImg;
  if (key.includes("multi")) return multispectralCameraImg;
  if (key.includes("gas")) return gasSensorImg;
  if (key.includes("zoom")) return zoomCameraImg;
  if (key.includes("speaker") || key.includes("siren")) return speakerSirenImg;
  if (key.includes("drop")) return dropMechanismImg;

  return null;
};

export {
  rgbCameraImg,
  thermalCameraImg,
  lidarSensorImg,
  multispectralCameraImg,
  gasSensorImg,
  zoomCameraImg,
  speakerSirenImg,
  dropMechanismImg,
};

export default PAYLOAD_IMAGES;
