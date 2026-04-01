import React from 'react';
import { motion } from 'framer-motion';
import { useCall } from '../../hooks/useCall';

export const TranslationOverlay = () => {
  const { translationText, translationEnabled } = useCall();

  if (!translationEnabled || !translationText) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent"
    >
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 max-w-2xl mx-auto">
        <p className="text-white text-sm font-medium">Translation:</p>
        <p className="text-cyan-400 text-base mt-2 leading-relaxed">
          {translationText}
        </p>
      </div>
    </motion.div>
  );
};
