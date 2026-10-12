import React from "react";
import { useCall } from "../../hooks/useCall";
import { SPEECH_LANGUAGES } from "../../services/speech/speechRecognizer";

const LABELS = {
  starting: "starting microphone…",
  listening: "listening",
  paused: "paused (microphone muted)",
  waiting: "starts when the call connects",
};

// Shows whether MY speech is being turned into captions, and any problem.
export const SpeechStatus = () => {
  const {
    speechEnabled,
    speechUiStatus,
    speechError,
    speechLang,
    changeSpeechLang,
    mySpeechText,
  } = useCall();

  if (!speechEnabled && !speechError) return null;

  return (
    <div className="pointer-events-auto max-w-full bg-surface/95 border border-border rounded-full px-3 py-1.5 flex items-center gap-2 text-[11px] text-text-primary">
      {speechError ? (
        <span className="text-danger">{speechError}</span>
      ) : (
        <>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              speechUiStatus === "listening" ? "bg-success animate-pulse" : "bg-text-muted"
            }`}
          />
          <span className="shrink-0">Captions: {LABELS[speechUiStatus] || speechUiStatus}</span>
          <select
            value={speechLang}
            onChange={(e) => changeSpeechLang(e.target.value)}
            className="bg-background border border-border rounded px-1 text-[11px] shrink-0"
            title="Spoken language"
          >
            {SPEECH_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          {mySpeechText && (
            <span className="italic opacity-70 truncate max-w-[10rem]">{mySpeechText}</span>
          )}
        </>
      )}
    </div>
  );
};