import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export const VideoFrame = ({ 
  stream, 
  isLocal = false, 
  className = '',
  objectFit = 'cover'
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
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
        ref={videoRef}
        autoPlay
        muted={isLocal}
        playsInline
        className={`w-full h-full object-${objectFit}`}
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">📹</span>
            </div>
            <p className="text-white/70 text-sm">
              {isLocal ? 'Local camera' : 'Waiting for video...'}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};
