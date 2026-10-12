import React from "react";
import { useCall } from "../../hooks/useCall";
import { SPEECH_LANGUAGES } from "../../services/speech/speechRecognizer";
import { SettingRow, SettingSelect, SettingsSection, Toggle } from "./controls";

export const CaptionsCard = () => {
  const {
    speechSupported,
    speechConsent,
    speechAutoStart,
    speechLang,
    updateSpeechConsent,
    updateSpeechAutoStart,
    changeSpeechLang,
  } = useCall();

  return (
    <SettingsSection
      id="captions"
      title="Speech captions"
      description="Turns what you say into captions for the other person. Changes apply immediately."
    >
      {!speechSupported && (
        <p className="p-4 text-[12px] text-warning">
          This browser doesn&apos;t support speech-to-text. Use Chrome or Edge.
        </p>
      )}
      <SettingRow
        title="Allow speech-to-text"
        hint="Your microphone audio is transcribed by your browser's speech service (in Chrome and Edge it is sent to the browser vendor). Only the text goes to the other person."
      >
        <Toggle
          label="Allow speech-to-text"
          checked={speechConsent}
          disabled={!speechSupported}
          onChange={updateSpeechConsent}
        />
      </SettingRow>
      <SettingRow
        title="Start captions automatically"
        hint="Turn captions on when a call starts."
      >
        <Toggle
          label="Start captions automatically"
          checked={speechAutoStart}
          disabled={!speechSupported || !speechConsent}
          onChange={updateSpeechAutoStart}
        />
      </SettingRow>
      <SettingRow
        title="Spoken language"
        hint="The language you speak in calls."
        stackOnMobile
      >
        <SettingSelect
          ariaLabel="Spoken language"
          value={speechLang}
          onChange={changeSpeechLang}
          options={SPEECH_LANGUAGES.map((l) => ({
            value: l.code,
            label: l.label,
          }))}
        />
      </SettingRow>
    </SettingsSection>
  );
};
