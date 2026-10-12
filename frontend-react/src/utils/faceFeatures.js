import { FACE_SOURCE_IDS } from "./skeletonCodec";


export const pickFace = (landmarks) => {
  if (!Array.isArray(landmarks) || landmarks.length < 468) return null;
  return FACE_SOURCE_IDS.map((id) => [landmarks[id].x, landmarks[id].y]);
};