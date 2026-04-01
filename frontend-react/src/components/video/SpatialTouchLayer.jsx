import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export const SpatialTouchLayer = ({ canvasRef, className = '' }) => {
  useEffect(() => {
    if (canvasRef?.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [canvasRef]);

  return (
    <motion.canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    />
  );
};
