import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from '../../hooks/useDraggable';
import { VideoFrame } from '../video/VideoFrame';
import { SpatialTouchLayer } from '../video/SpatialTouchLayer';
import { ControlBar } from '../video/ControlBar';

export const LocalVideoPiP = ({ stream, onEndCall }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { position, isDragging, handleMouseDown } = useDraggable({
    x: window.innerWidth - 340,
    y: window.innerHeight - 400,
  });

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = 320;
      canvasRef.current.height = 240;
    }
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className="fixed w-80 h-60 bg-slate-900 rounded-lg shadow-2xl border border-white/20 overflow-hidden z-50 cursor-move"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={(e) => handleMouseDown(e, containerRef)}
      drag
      dragMomentum={false}
      whileHover={{ scale: 1.02 }}
    >
      <div className="relative w-full h-full">
        {/* Video Frame */}
        <VideoFrame stream={stream} isLocal={true} className="w-full h-full" />

        {/* Spatial Touch Layer */}
        <SpatialTouchLayer canvasRef={canvasRef} />

        {/* Control Bar - Overlay at bottom */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center px-2">
          <ControlBar onEndCall={onEndCall} />
        </div>
      </div>
    </motion.div>
  );
};
