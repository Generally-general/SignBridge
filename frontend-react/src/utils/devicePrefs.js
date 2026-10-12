
const KEYS = {
  camera: "signbridge_camera_id",
  mic: "signbridge_mic_id",
  speaker: "signbridge_speaker_id",
};

export const getDevicePref = (kind) => {
  try {
    return window.localStorage.getItem(KEYS[kind]) || "";
  } catch {
    return "";
  }
};

export const setDevicePref = (kind, id) => {
  try {
    if (id) window.localStorage.setItem(KEYS[kind], id);
    else window.localStorage.removeItem(KEYS[kind]);
  } catch {
    /* private mode: the choice just is not remembered */
  }
};

export const callMediaConstraints = () => {
  const camera = getDevicePref("camera");
  const mic = getDevicePref("mic");
  return {
    video: camera ? { deviceId: { ideal: camera } } : true,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(mic ? { deviceId: { ideal: mic } } : {}),
    },
  };
};