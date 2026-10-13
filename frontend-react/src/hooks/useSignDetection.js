import { useContext, useEffect, useRef } from "react";
import * as mpHands from "@mediapipe/hands";
import { CallContext } from "../context/CallContextInstance";
import { buildHandPayload } from "../utils/handPayload";
import { runExclusive } from "../utils/mediapipeQueue";

// onLandmarks(firstHandXYZ, hands): called for frames where a hand is visible.
// maxHands: 2 while translating (many signs use both hands), 1 otherwise (Spatial Touch uses one).
const resolveHands = () => mpHands.Hands || mpHands.default?.Hands || window.Hands;

export const useSignDetection = (stream, onLandmarks, cameraEnabled, onFrame, maxHands = 1) => {
  const { setTranslationText } = useContext(CallContext);
  const videoRef = useRef(document.createElement("video"));
  const handsRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!stream || !cameraEnabled) {
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      return;
    }

    let isActive = true;
    const video = videoRef.current;

    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream(stream.getVideoTracks());

    const HandsCtor = resolveHands();
    if (!HandsCtor) {
      console.error("MediaPipe Hands failed to load (no constructor in this build)");
      return undefined;
    }
    const hands = new HandsCtor({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: maxHands,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      if (isActive && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const firstHand = results.multiHandLandmarks[0];
        const flatPoints = firstHand.map((point) => [point.x, point.y, point.z]);
        const { hands: handPoints, first } = buildHandPayload(results);
        onLandmarks(first, handPoints);
        // MediaPipe assumes a mirrored (selfie) image; our feed isn't mirrored,
        // so its Left/Right labels are swapped. Normalised for display only.
        const rawLabel = results.multiHandedness?.[0]?.label ?? null;
        const handedness =
          rawLabel === "Left" ? "Right" : rawLabel === "Right" ? "Left" : null;
        onFrame?.(flatPoints, { handedness, hands: handPoints });
      } else if (isActive) {
        onFrame?.(null, { hands: [] });
      }
    });

    const processVideo = async () => {
      if (!isActive || video.paused || video.ended) return;
      try {
        await hands.send({ image: video });
        if (isActive) requestAnimationFrame(processVideo);
      } catch (err) {
        console.error("MediaPipe Send Error:", err);
      }
    };

    const startVideo = async () => {
      try {
        // Load the hand model on its own turn: see utils/mediapipeQueue.js.
        await runExclusive(() => (isActive ? hands.initialize() : undefined));
        if (!isActive) return;
        if (video.paused) {
          await video.play();
          processVideo();
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("AI Video Play Error:", err);
        }
      }
    };

    startVideo();

    return () => {
      isActive = false;
      hands.close();
      video.pause();
      video.srcObject = null;
    };
  }, [stream, cameraEnabled, maxHands]);
};