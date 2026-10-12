import React from 'react';
import { useCall } from '../../hooks/useCall';

export const TranslationOverlay = () => {
  const { translationText, translationFinal } = useCall();

  // Show incoming translation whenever it arrives; the sender's own toggle
  // decides whether their signs are translated at all.
  if (!translationText) {
    return null;
  }

  return (
    <div className="bg-surface border border-border rounded-card p-4 max-w-2xl mx-auto max-h-24 overflow-hidden">
      <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">
        {translationFinal ? 'Translation' : 'Translating…'}
      </p>
      <p
        className={`text-text-primary text-[15px] mt-1.5 leading-relaxed line-clamp-2 ${
          translationFinal ? '' : 'opacity-70 italic'
        }`}
      >
        {translationText}
      </p>
    </div>
  );
};