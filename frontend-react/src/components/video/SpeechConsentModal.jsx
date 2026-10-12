import React from "react";
import { useCall } from "../../hooks/useCall";

// In-app consent dialog for speech-to-text. Replaces window.confirm, which
// browsers can suppress ("prevent this page from creating more dialogs").
// Declining is never remembered, so tapping CC asks again.
export const SpeechConsentModal = () => {
  const { speechConsentPrompt, answerSpeechConsent } = useCall();

  if (!speechConsentPrompt) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="speech-consent-title"
    >
      <div className="bg-surface border border-border rounded-card p-5 max-w-sm w-full">
        <h2
          id="speech-consent-title"
          className="text-text-primary font-semibold text-[16px] mb-2"
        >
          Turn on speech captions?
        </h2>
        <p className="text-text-secondary text-[13px] leading-relaxed mb-4">
          Your microphone audio is transcribed by your browser&apos;s speech
          service. In Chrome and Edge that audio is sent to the browser
          vendor&apos;s servers. Only the resulting text is sent to the other
          person. You can change this any time in Settings.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => answerSpeechConsent(true)}
            className="flex-1 bg-primary text-white rounded-standard px-4 py-2 text-[13px] font-bold"
          >
            Allow and turn on
          </button>
          <button
            onClick={() => answerSpeechConsent(false)}
            className="flex-1 rounded-standard px-4 py-2 text-[13px] font-bold text-text-secondary hover:bg-muted"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};
