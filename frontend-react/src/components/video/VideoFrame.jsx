import React, { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
      video.load(); // 💥 forces repaint
    }
  }, [stream]);

  return (
    <motion.div
      className={`relative bg-slate-900 rounded-lg overflow-hidden ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <video
        key={stream ? stream.id : "no-stream"}
        ref={videoRef}
        autoPlay
        muted={muted}
        playsInline
        className={`w-full h-full object-${objectFit} ${showPlaceholder ? "opacity-0" : "opacity-100"}`}
      />

      <AnimatePresence>
        {showPlaceholder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full mx-auto mb-4 flex items-center justify-center border border-white/10">
                <span className="text-3xl filter grayscale opacity-50">
                  {isLocal ? "👤" : "📡"}
                </span>
              </div>
              <p className={`text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] ${isLocal ? 'scale-x-[-1]' : ''}`}>
                {isLocal ? "Camera Muted" : "Feed Paused"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
