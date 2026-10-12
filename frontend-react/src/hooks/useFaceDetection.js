import { useEffect, useRef } from "react";
import { pickFace } from "../utils/faceFeatures";
import { runExclusive } from "../utils/mediapipeQueue";

const FACE_INTERVAL_MS = 120; // about 8 face results per second

// Finds the face (eyes, eyebrows, lips, outline) in the local camera and passes the points to
// onFace. It only runs while `enabled` is true (skeleton mode), and the model is downloaded only then.
// If the model cannot be loaded, onStatus("unavailable") is called and skeleton mode carries on without the face.
export const useFaceDetection = (stream, enabled, onFace, onStatus) => {
  const onFaceRef = useRef(onFace);
  onFaceRef.current = onFace;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!stream || !enabled) return undefined;
    let alive = true;
    let mesh = null;
    let timer = 0;
    let busy = false;
    let failures = 0;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream(stream.getVideoTracks());

    (async () => {
      try {
        onStatusRef.current?.("loading");
        const mod = await import("@mediapipe/face_mesh");
        if (!alive) return;
        const FaceMesh = mod.FaceMesh || mod.default?.FaceMesh;
        mesh = new FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        mesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false, // no iris points: lighter
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        mesh.onResults((results) => {
          if (alive) onFaceRef.current?.(pickFace(results.multiFaceLandmarks?.[0]));
        });
        await runExclusive(() => {
          if (!alive) return undefined;
          return mesh.initialize();
        });
        if (!alive) return;
        await video.play();
        if (!alive) return;
        onStatusRef.current?.("running");

        const loop = async () => {
          if (!alive) return;
          if (!busy && !video.paused && video.readyState >= 2) {
            busy = true;
            
            try {
              await mesh.send({ image: video });
              failures = 0;
            } catch (err) {
              failures += 1;
              if (alive) console.warn("Face frame failed:", err.message);
              // A model that keeps failing will not recover: stop instead of retrying forever.
              if (failures >= 5) {
                alive = false;
                onStatusRef.current?.("unavailable");
              }
            }
            busy = false;
          }
          if (alive) timer = setTimeout(loop, FACE_INTERVAL_MS);
        };
        loop();
      } catch (err) {
        if (!alive) return;
        console.warn("Face model unavailable, continuing without the face:", err.message);
        onStatusRef.current?.("unavailable");
      }
    })();

    return () => {
      alive = false;
      clearTimeout(timer);
      try {
        mesh?.close();
      } catch {
        /* already closed */
      }
      video.pause();
      video.srcObject = null;
    };
  }, [stream, enabled]);
};