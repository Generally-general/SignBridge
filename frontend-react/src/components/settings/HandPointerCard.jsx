import React from "react";
import { usePointerPrefs } from "../../hooks/usePointerPrefs";
import { setPointerPref } from "../../utils/pointerPrefs";
import { pointerSupported } from "../../utils/pointerGeometry";
import { SettingRow, SettingsSection, Toggle } from "./controls";

export const HandPointerCard = () => {
  const prefs = usePointerPrefs();
  const supported = pointerSupported();
  return (
    <SettingsSection
      id="pointer"
      title="Hand pointer"
      description="Control the call screen with your hand. Press P to start and stop. Translation pauses while it is on."
    >
      {!supported && (
        <p className="p-4 text-[12px] text-warning">
          Available on computers with a mouse or trackpad. It is off on touch
          screens.
        </p>
      )}
      <SettingRow
        title="Enable hand pointer"
        hint="Press P during a call to move a cursor with your hand and pinch to click. Esc also stops it."
      >
        <Toggle
          label="Enable hand pointer"
          checked={prefs.enabled}
          disabled={!supported}
          onChange={(v) => setPointerPref("enabled", v)}
        />
      </SettingRow>
      <SettingRow
        title="Dwell click"
        hint="Hold the cursor over a button for a moment to press it. It never presses End call."
      >
        <Toggle
          label="Dwell click"
          checked={prefs.dwell}
          disabled={!supported || !prefs.enabled}
          onChange={(v) => setPointerPref("dwell", v)}
        />
      </SettingRow>
    </SettingsSection>
  );
};
