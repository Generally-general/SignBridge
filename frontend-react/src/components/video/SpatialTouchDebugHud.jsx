import React, { useEffect, useState } from "react";
import {
  SPATIAL_TOUCH_CONFIG as CFG,
  SPATIAL_TOUCH_DEFAULTS as DEFAULTS,
  saveSpatialOverrides,
  resetSpatialOverrides,
} from "../../utils/spatialTouchConfig";

const TUNABLE = [
  ["AIR_TAP_VELOCITY_THRESHOLD", 0.005],
  ["AIR_TAP_VELOCITY_THRESHOLD_PALM", 0.05],
  ["AIR_TAP_REST_VELOCITY_PALM", 0.05],
  ["AIR_TAP_MIN_EXCURSION_PALM", 0.1],
  ["AIR_TAP_RETURN_RADIUS_PALM", 0.05],
  ["AIR_TAP_MIN_ACTIVE_MS", 5],
  ["AIR_TAP_MAX_ACTIVE_MS", 25],
  ["AIR_TAP_COOLDOWN_MS", 50],
  ["VELOCITY_SMOOTHING_MS", 10],
  ["PINCH_TAP_OPEN_FROM", 0.1],
  ["PINCH_TAP_MAX_MS", 25],
  ["PINCH_TAP_MAX_DRIFT_PALM", 0.05],
  ["PINCH_ENGAGE_THRESHOLD", 0.01],
  ["PINCH_RELEASE_THRESHOLD", 0.01],
  ["PINCH_DRAG_MIN_DELTA", 0.005],
  ["PINCH_DRAG_ARM_MS", 25],
  ["PINCH_DRAG_IDLE_MS", 50],
  ["MAX_MISSED_MS", 50],
];

const BLOCK_TYPES = {
  air_tap: "Air-Tap trials",
  pinch_scroll: "Pinch-scroll trials",
  idle_signing: "Idle / signing (expect none)",
};

const count = (events, type) => events.filter((e) => e.type === type).length;

export const SpatialTouchDebugHud = ({ metricsRef, eventsRef, framesRef }) => {
  const [open, setOpen] = useState(true);
  const [m, setM] = useState({ ...metricsRef.current });
  const [recent, setRecent] = useState([]);
  const [tick, setTick] = useState(0);
  const [blockType, setBlockType] = useState("air_tap");
  const [attempts, setAttempts] = useState(10);
  const [label, setLabel] = useState("");
  const [active, setActive] = useState(null);
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    const id = setInterval(() => {
      setM({ ...metricsRef.current });
      setRecent(eventsRef.current.filter((e) => e.type !== "PINCH_MOVE").slice(-8));
    }, 100);
    return () => clearInterval(id);
  }, [metricsRef, eventsRef]);

  const startBlock = () =>
    setActive({
      type: blockType,
      attempts: Number(attempts) || 0,
      label,
      startIdx: eventsRef.current.length,
      startPerf: performance.now(),
      startedAt: Date.now(),
    });

  const stopBlock = () => {
    const slice = eventsRef.current.slice(active.startIdx);
    const frames = framesRef.current.filter((f) => f.t >= active.startPerf);
    const durationS = (Date.now() - active.startedAt) / 1000;
    const taps = count(slice, "AIR_TAP");
    const pinches = count(slice, "PINCH_START");
    const meanDt = frames.length
      ? frames.reduce((a, f) => a + (f.dt || 0), 0) / frames.length
      : 0;
    const summary = {
      type: active.type,
      label: active.label,
      attempts: active.attempts,
      durationS: Number(durationS.toFixed(1)),
      airTapsDetected: taps,
      pinchScrollsDetected: pinches,
      tapCandidates: count(slice, "TAP_CANDIDATE_ENTER"),
      tapRejected: count(slice, "TAP_REJECTED"),
      pinchStaticReleases: count(slice, "PINCH_HOLD_RELEASED_STATIC"),
      frames: frames.length,
      meanFps: meanDt ? Number((1000 / meanDt).toFixed(1)) : null,
      maxSmoothedVelocity: frames.length ? Math.max(...frames.map((f) => f.v)) : null,
      maxRawVelocity: frames.length ? Math.max(...frames.map((f) => f.iv)) : null,
      startPerf: Math.round(active.startPerf),
      endPerf: Math.round(performance.now()),
      config: { ...CFG },
    };
    const detected =
      active.type === "air_tap" ? taps : active.type === "pinch_scroll" ? pinches : null;
    if (detected !== null && active.attempts > 0) {
      // success = min(detected, attempts) / attempts; surplus reported separately.
      summary.successRate = Number((Math.min(detected, active.attempts) / active.attempts).toFixed(3));
      summary.extraTriggers = Math.max(0, detected - active.attempts);
    }
    if (active.type === "idle_signing") {
      summary.falsePositives = taps + pinches;
      summary.falsePositivesPerMinute = Number(((taps + pinches) / (durationS / 60)).toFixed(2));
    }
    setBlocks((b) => [...b, summary]);
    setActive(null);
  };

  const download = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      config: { ...CFG },
      defaults: { ...DEFAULTS },
      blocks,
      events: eventsRef.current,
      frames: framesRef.current,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `spatial-touch-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const fmt = (v, d = 3) => (typeof v === "number" ? v.toFixed(d) : "-");

  return (
    <div className="absolute bottom-24 left-2 z-[60] w-72 max-h-[70vh] overflow-y-auto bg-black/85 text-white text-[10px] font-mono p-2 rounded">
      <div className="flex justify-between items-center mb-1">
        <b>Spatial Touch debug</b>
        <button onClick={() => setOpen((o) => !o)}>{open ? "hide" : "show"}</button>
      </div>
      {open && (
        <>
          <div>
            state: <b>{m.state}</b> | hand: {m.handPresent ? m.handedness ?? "?" : "none"} | fps: {fmt(m.fps, 1)}
          </div>
          <div>
            velocity: {fmt(m.velocity)} | peak(2s): <b>{fmt(m.peakVelocity)}</b>
          </div>
          <div>
            pinch: {fmt(m.pinchDist, 2)} (engage &lt; {CFG.PINCH_ENGAGE_THRESHOLD})
          </div>
                    <div className="flex gap-1 items-center">
            mode:
            <select
              className="bg-black/50 border border-white/20"
              defaultValue={CFG.AIR_TAP_MODE}
              disabled={!!active}
              onChange={(e) => {
                CFG.AIR_TAP_MODE = e.target.value;
                setTick((t) => t + 1);
              }}
            >
              <option value="velocity">velocity</option>
              <option value="pinch">pinch-tap</option>
            </select>
            units:
            <select
              className="bg-black/50 border border-white/20"
              defaultValue={CFG.AIR_TAP_VELOCITY_UNITS}
              disabled={!!active}
              onChange={(e) => {
                CFG.AIR_TAP_VELOCITY_UNITS = e.target.value;
                setTick((t) => t + 1);
              }}
            >
              <option value="palm">palm</option>
              <option value="image">image (paper)</option>
            </select>
          </div>
          <div>
            gamma ({CFG.AIR_TAP_VELOCITY_UNITS}):{" "}
            {CFG.AIR_TAP_VELOCITY_UNITS === "palm"
              ? CFG.AIR_TAP_VELOCITY_THRESHOLD_PALM
              : CFG.AIR_TAP_VELOCITY_THRESHOLD}
          </div>

          <div className="mt-2 border-t border-white/20 pt-1">
            <b>Recent events</b>
            {recent.map((e, i) => (
              <div key={i}>{e.type}</div>
            ))}
          </div>

          <div className="mt-2 border-t border-white/20 pt-1">
            <b>Trial block</b>
            <div className="flex gap-1 my-1">
              <select
                className="bg-black/50 border border-white/20 flex-1"
                value={blockType}
                onChange={(e) => setBlockType(e.target.value)}
                disabled={!!active}
              >
                {Object.entries(BLOCK_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                type="number"
                className="w-12 bg-black/50 border border-white/20"
                value={attempts}
                onChange={(e) => setAttempts(e.target.value)}
                disabled={!!active}
                title="Number of attempts you will perform"
              />
            </div>
            <input
              className="w-full bg-black/50 border border-white/20 mb-1"
              placeholder="label: motion style / condition"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={!!active}
            />
            {active ? (
              <button className="bg-red-600 px-2" onClick={stopBlock}>Stop block</button>
            ) : (
              <button className="bg-green-700 px-2" onClick={startBlock}>Start block</button>
            )}
            {blocks.map((b, i) => (
              <div key={i} className="mt-1 text-yellow-200">
                #{i + 1} {b.type} [{b.label || "no label"}]:{" "}
                {b.successRate !== undefined
                  ? `${b.successRate * 100}% (${b.airTapsDetected || b.pinchScrollsDetected}/${b.attempts}, +${b.extraTriggers})`
                  : `FP ${b.falsePositives} (${b.falsePositivesPerMinute}/min)`}
                {" "}maxV {b.maxSmoothedVelocity?.toFixed(3)} @ {b.meanFps}fps
              </div>
            ))}
          </div>

          <div className="mt-2 border-t border-white/20 pt-1">
            <b>Tuning</b> (live; * = changed)
            {TUNABLE.map(([key, step]) => (
              <label key={`${key}-${tick}`} className="flex items-center justify-between gap-1">
                <span className="truncate">
                  {key}
                  {CFG[key] !== DEFAULTS[key] ? " *" : ""}
                </span>
                <input
                  type="number"
                  step={step}
                  defaultValue={CFG[key]}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) CFG[key] = v;
                  }}
                  className="w-16 bg-black/50 border border-white/20"
                />
              </label>
            ))}
            <div className="flex gap-1 mt-1">
              <button className="bg-blue-700 px-2" onClick={saveSpatialOverrides}>Save</button>
              <button
                className="bg-gray-600 px-2"
                onClick={() => {
                  resetSpatialOverrides();
                  setTick((t) => t + 1);
                }}
              >
                Reset to paper defaults
              </button>
            </div>
          </div>

          <div className="mt-2 flex gap-1">
            <button className="bg-indigo-700 px-2" onClick={download}>Download JSON</button>
            <button
              className="bg-gray-600 px-2"
              onClick={() => {
                eventsRef.current.length = 0;
                framesRef.current.length = 0;
                setBlocks([]);
              }}
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
};