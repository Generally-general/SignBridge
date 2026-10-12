import { POSE_SOURCE_IDS } from "./skeletonCodec";

// MediaPipe's 33 body landmarks -> the 13 upper-body points we send: [x, y, visibility].
// Returns null when the result is not a full body model.
export const pickUpperBody = (landmarks) => {
  if (!Array.isArray(landmarks) || landmarks.length < 33) return null;
  return POSE_SOURCE_IDS.map((id) => {
    const p = landmarks[id];
    return [p.x, p.y, typeof p.visibility === "number" ? p.visibility : 0];
  });
};