import React, { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { FlashOverlay } from "../ui/FlashOverlay";
import {
  callAlerts,
  loadAlertPrefs,
  requestNotificationPermission,
  saveAlertPrefs,
} from "../../utils/callAlerts";
import { SettingRow, SettingsSection, Toggle } from "./controls";

const OPTIONS = [
  {
    key: "flash",
    label: "Flash the screen",
    hint: "A soft green pulse over the whole screen when a call comes in.",
  },
  {
    key: "vibrate",
    label: "Vibrate",
    hint: "Phones that allow it (Android with Chrome). iPhones do not let web pages vibrate.",
  },
  {
    key: "notify",
    label: "Browser notifications",
    hint: "A pop-up for calls, missed calls and messages while this tab is in the background.",
  },
  {
    key: "title",
    label: "Flash the browser tab title",
    hint: 'The tab shows "Incoming call" so you notice it in the tab bar.',
  },
  {
    key: "sound",
    label: "Play a ringtone",
    hint: "Off by default. Turn it on if you would like to hear calls.",
  },
];

const TEST_MS = 5000;

// How the app gets your attention for a call without relying on sound.
export const CallAlertsCard = () => {
  const [prefs, setPrefs] = useState(() => loadAlertPrefs());
  const [permission, setPermission] = useState(() =>
    typeof window !== "undefined" && window.Notification
      ? window.Notification.permission
      : "unsupported",
  );
  const [testing, setTesting] = useState(false);
  const timer = useRef(null);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      callAlerts.stop();
    },
    [],
  );

  const change = async (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveAlertPrefs(next);
    if (key === "notify" && value)
      setPermission(await requestNotificationPermission());
  };

  const test = () => {
    setTesting(true);
    callAlerts.start({
      name: "Test caller",
      roomId: "test",
      forceNotify: true,
    });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      callAlerts.stop();
      setTesting(false);
    }, TEST_MS);
  };

  return (
    <SettingsSection
      id="alerts"
      title="Call alerts"
      description="Ways to notice an incoming call without hearing it. Saved on this device."
    >
      {testing && prefs.flash && <FlashOverlay />}
      {OPTIONS.map(({ key, label, hint }) => (
        <SettingRow key={key} title={label} hint={hint}>
          <Toggle
            label={label}
            checked={prefs[key]}
            onChange={(v) => change(key, v)}
          />
        </SettingRow>
      ))}

      <div className="p-4 space-y-3">
        {prefs.notify && permission === "denied" && (
          <p className="text-[12px] text-warning">
            Notifications are blocked for this site. Allow them in the browser&apos;s
            site settings (the icon next to the address).
          </p>
        )}
        {prefs.notify && permission === "default" && (
          <div>
            <p className="text-[12px] text-text-muted mb-2">
              Notifications need your permission. Your browser will ask when you
              press the button.
            </p>
            <Button
              onClick={async () =>
                setPermission(await requestNotificationPermission())
              }
            >
              Allow notifications
            </Button>
          </div>
        )}
        {prefs.notify && permission === "granted" && (
          <p className="text-[12px] text-success">Notifications are allowed.</p>
        )}
        {prefs.notify && permission === "unsupported" && (
          <p className="text-[12px] text-text-muted">
            This browser does not support notifications.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={test} disabled={testing}>
            {testing ? "Testing for 5 seconds..." : "Test the alerts"}
          </Button>
          <p className="text-[11px] text-text-muted">
            To see the notification, switch to another tab while the test runs.
          </p>
        </div>
      </div>
    </SettingsSection>
  );
};
