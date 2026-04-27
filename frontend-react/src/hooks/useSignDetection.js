import { useEffect, useRef } from "react";
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';
import { analyzeGesture } from "../utils/SignLogic";

export const useSignDetection = (stream, onLandmarks, cameraEnabled) => {
  const videoRef = useRef(document.createElement('video'));
  const handsRef = useRef(null);

  useEffect(() => {
    if (!stream || !cameraEnabled) {
      console.log("AI Pipe: Paused (Camera Off)");
      return;
    }

    let isActive = true;
    const video = videoRef.current;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      if (isActive && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        onLandmarks(results.multiHandLandmarks);
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
        if (video.paused) {
          await video.play();
          console.log("🤖 AI Pipe: Video playing, starting loop");
          processVideo();
        }
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("🤖 AI Pipe: Play interrupted (normal during hardware swap)");
        } else {
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
  }, [stream, cameraEnabled]);
};