import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Video } from "lucide-react";
import { Button } from "../ui/Button";
import { SettingRow, SettingSelect, SettingsSection } from "./controls";
import { getDevicePref, setDevicePref } from "../../utils/devicePrefs";

const SINK_SUPPORTED =
  typeof HTMLMediaElement !== "undefined" &&
  "setSinkId" in HTMLMediaElement.prototype;

const labelOf = (d, fallback, i) => d.label || `${fallback} ${i + 1}`;

export const DevicesCard = () => {
  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.enumerateDevices;
  const [list, setList] = useState({ camera: [], mic: [], speaker: [] });
  const [named, setNamed] = useState(false);
  const [chosen, setChosen] = useState(() => ({
    camera: getDevicePref("camera"),
    mic: getDevicePref("mic"),
    speaker: getDevicePref("speaker"),
  }));
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [level, setLevel] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef({ ctx: null, raf: 0 });

  const refresh = useCallback(async () => {
    if (!supported) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setList({
        camera: all.filter((d) => d.kind === "videoinput" && d.deviceId),
        mic: all.filter((d) => d.kind === "audioinput" && d.deviceId),
        speaker: all.filter((d) => d.kind === "audiooutput" && d.deviceId),
      });
      setNamed(all.some((d) => d.label));
    } catch (e) {
      console.warn("Could not list devices:", e.message);
    }
  }, [supported]);

  useEffect(() => {
    refresh();
    if (!supported) return undefined;
    navigator.mediaDevices.addEventListener?.("devicechange", refresh);
    return () =>
      navigator.mediaDevices.removeEventListener?.("devicechange", refresh);
  }, [refresh, supported]);

  const stopTest = useCallback(() => {
    cancelAnimationFrame(audioRef.current.raf);
    audioRef.current.ctx?.close().catch(() => {});
    audioRef.current = { ctx: null, raf: 0 };
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTesting(false);
    setLevel(0);
  }, []);

  useEffect(() => stopTest, [stopTest]);

  const startTest = useCallback(
    async (pick) => {
      stopTest();
      setError("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: pick.camera ? { deviceId: { ideal: pick.camera } } : true,
          audio: pick.mic ? { deviceId: { ideal: pick.mic } } : true,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setTesting(true);
        refresh(); // device names are only available once access is granted

        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC && stream.getAudioTracks().length) {
          const ctx = new AC();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(analyser);
          const data = new Uint8Array(analyser.fftSize);
          const tick = () => {
            analyser.getByteTimeDomainData(data);
            let peak = 0;
            for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
            setLevel(Math.min(1, peak / 64));
            audioRef.current.raf = requestAnimationFrame(tick);
          };
          audioRef.current = { ctx, raf: requestAnimationFrame(tick) };
        }
      } catch (e) {
        setError(
          e.name === "NotAllowedError"
            ? "Access was blocked. Allow the camera and microphone in the browser's site settings."
            : "Could not open the camera or microphone. Is another app using it?",
        );
      }
    },
    [refresh, stopTest],
  );

  const choose = (kind, id) => {
    setDevicePref(kind, id);
    const next = { ...chosen, [kind]: id };
    setChosen(next);
    if (testing && kind !== "speaker") startTest(next);
  };

  const valueFor = (kind) =>
    list[kind].some((d) => d.deviceId === chosen[kind]) ? chosen[kind] : "";
  const options = (kind, fallback, defaultLabel) => [
    { value: "", label: defaultLabel },
    ...list[kind].map((d, i) => ({
      value: d.deviceId,
      label: labelOf(d, fallback, i),
    })),
  ];

  if (!supported) {
    return (
      <SettingsSection id="devices" title="Camera and audio">
        <p className="p-4 text-[12px] text-warning">
          This page needs a secure (https) connection to reach your camera and
          microphone.
        </p>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      id="devices"
      title="Camera and audio"
      description="Used the next time you start or answer a call. Saved on this device."
    >
      <SettingRow title="Camera" stackOnMobile>
        <SettingSelect
          ariaLabel="Camera"
          value={valueFor("camera")}
          onChange={(id) => choose("camera", id)}
          options={options("camera", "Camera", "Default camera")}
        />
      </SettingRow>
      <SettingRow title="Microphone" stackOnMobile>
        <SettingSelect
          ariaLabel="Microphone"
          value={valueFor("mic")}
          onChange={(id) => choose("mic", id)}
          options={options("mic", "Microphone", "Default microphone")}
        />
      </SettingRow>
      {SINK_SUPPORTED && (
        <SettingRow
          title="Speaker"
          hint="Where you hear the other person. Not available in every browser."
          stackOnMobile
        >
          <SettingSelect
            ariaLabel="Speaker"
            value={valueFor("speaker")}
            onChange={(id) => choose("speaker", id)}
            options={options("speaker", "Speaker", "Default speaker")}
          />
        </SettingRow>
      )}

      <div className="p-4 space-y-3">
        {!named && !testing && (
          <p className="text-[12px] text-text-muted">
            Device names are hidden until you allow access. Press the test
            button to see them.
          </p>
        )}
        <div className="relative aspect-video max-w-sm rounded-card overflow-hidden bg-black border border-border">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${testing ? "" : "opacity-0"}`}
          />
          {!testing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted">
              <Video className="w-6 h-6" />
              <span className="text-[12px]">Camera preview</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 max-w-sm">
          <Mic className="w-4 h-4 text-text-muted shrink-0" />
          <div
            className="flex-1 h-2 rounded-full bg-border overflow-hidden"
            role="meter"
            aria-label="Microphone level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level * 100)}
          >
            <div
              className="h-full bg-success transition-[width] duration-75"
              style={{ width: `${Math.round(level * 100)}%` }}
            />
          </div>
        </div>
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <Button onClick={testing ? stopTest : () => startTest(chosen)}>
          {testing ? "Stop test" : "Test camera and microphone"}
        </Button>
      </div>
    </SettingsSection>
  );
};
