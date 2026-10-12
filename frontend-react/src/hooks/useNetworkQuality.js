import { useEffect, useState } from "react";
import { createQualityMonitor, readSample } from "../utils/networkQuality";

const NOT_POOR = { poor: false, reasons: [] };

// Polls the call's WebRTC statistics while `active` and reports whether my upload looks too weak
// for smooth video. getStats: () => Promise<RTCStatsReport | null>.
export const useNetworkQuality = (getStats, active, intervalMs = 2000) => {
  const [quality, setQuality] = useState(NOT_POOR);

  useEffect(() => {
    if (!active || !getStats) {
      setQuality(NOT_POOR);
      return undefined;
    }
    const monitor = createQualityMonitor();
    let alive = true;
    let timer = 0;

    const tick = async () => {
      try {
        const report = await getStats();
        if (!alive) return;
        if (report) {
          const next = monitor.push(readSample(report));
          setQuality((prev) =>
            prev.poor === next.poor && prev.reasons.join() === next.reasons.join() ? prev : next,
          );
        }
      } catch {
        /* the connection is closing: try again next time */
      }
      if (alive) timer = setTimeout(tick, intervalMs);
    };
    timer = setTimeout(tick, intervalMs);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [active, getStats, intervalMs]);

  return quality;
};