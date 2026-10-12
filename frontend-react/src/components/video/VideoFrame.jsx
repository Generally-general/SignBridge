import React, { useRef, useEffect } from "react";
import { getDevicePref } from "../../utils/devicePrefs";

export const VideoFrame = ({
  stream,
  muted,
  className = "",
  objectFit = "cover",
  isLocal = false,
  showPlaceholder = false,
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().catch((e) => console.error("Video play failed:", e));
      };
    } else {
      video.pause();
      video.srcObject = null;
      video.load();
    }
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    const id = getDevicePref("speaker");
    if (!isLocal && id && video?.setSinkId) video.setSinkId(id).catch(() => {});
  }, [stream, isLocal]);

  return (
    <div className={`relative bg-black rounded-standard overflow-hidden ${className}`}>
      <video
        key={stream ? stream.id : "no-stream"}
        ref={videoRef}
        autoPlay
        muted={muted}
        playsInline
        style={{ objectFit }}
        className={`w-full h-full ${showPlaceholder ? "opacity-0" : "opacity-100"}`}
      />

      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface z-10">
          <div className="text-center">
            <div className="w-14 h-14 bg-muted rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl grayscale opacity-60">
                {isLocal ? "👤" : "📡"}
              </span>
            </div>
            <p className="text-text-muted text-[11px] font-semibold uppercase tracking-widest">
              {isLocal ? "Camera Muted" : "Feed Paused"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};