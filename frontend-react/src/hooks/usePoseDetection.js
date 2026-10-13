import { useEffect, useRef } from "react";
import { pickUpperBody } from "../utils/poseUpperBody";
import { runExclusive } from "../utils/mediapipeQueue";

const POSE_INTERVAL_MS = 110; // about 9 pose results per second: arms and head move slowly

// Finds the upper body (head, shoulders, elbows, wrists) in the local camera and passes the points to
// onPose. It only runs while `enabled` is true (skeleton mode), and the model is downloaded only then.
// If the model cannot be loaded, onStatus("unavailable") is called and skeleton mode carries on with hands only.
export const usePoseDetection = (stream, enabled, onPose, onStatus) => {
  const onPoseRef = useRef(onPose);
  onPoseRef.current = onPose;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!stream || !enabled) return undefined;
    let alive = true;
    let pose = null;
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
        const mod = await import("@mediapipe/pose");
        if (!alive) return;
        const Pose = mod.Pose || mod.default?.Pose || window.Pose;
        pose = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });
        pose.setOptions({
          modelComplexity: 0, // the lightest model: phones and older laptops
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        pose.onResults((results) => {
          if (alive) onPoseRef.current?.(pickUpperBody(results.poseLandmarks));
        });
        await runExclusive(() => {
          if (!alive) return undefined;
          return pose.initialize();
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
              await pose.send({ image: video });
              failures = 0;
            } catch (err) {
              failures += 1;
              if (alive) console.warn("Pose frame failed:", err.message);
              // A model that keeps failing will not recover: stop instead of retrying forever.
              if (failures >= 5) {
                alive = false;
                onStatusRef.current?.("unavailable");
              }
            }
            busy = false;
          }
          if (alive) timer = setTimeout(loop, POSE_INTERVAL_MS);
        };
        loop();
      } catch (err) {
        if (!alive) return;
        console.warn("Pose model unavailable, continuing with hands only:", err.message);
        onStatusRef.current?.("unavailable");
      }
    })();

    return () => {
      alive = false;
      clearTimeout(timer);
      try {
        pose?.close();
      } catch {
        /* already closed */
      }
      video.pause();
      video.srcObject = null;
    };
  }, [stream, enabled]);
};