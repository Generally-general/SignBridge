
export const QUALITY_LIMITS = {
  lossFraction: 0.08, // the other side reports more than 8% of my video packets lost
  rttMs: 800, // round trip longer than 0.8 s
  outgoingBps: 150000, // the browser estimates less than 150 kbps available for sending
  minFps: 10, // the browser is limiting my video for bandwidth and it runs below 10 fps
  warmupSamples: 3, // ignore the first samples of a call: the estimate is still ramping up
  badToSuggest: 3, // consecutive weak samples before the connection counts as poor
  goodToRecover: 5, // consecutive fine samples before it counts as recovered
};

// Reads the few numbers we need from an RTCStatsReport. Anything the browser does not report is null.
export const readSample = (report) => {
  const s = { loss: null, rttMs: null, outgoingBps: null, limitedByBandwidth: false, fps: null };
  if (!report || typeof report.forEach !== "function") return s;
  report.forEach((stat) => {
    if (stat.type === "remote-inbound-rtp" && stat.kind === "video") {
      if (typeof stat.fractionLost === "number")
        s.loss = Math.max(s.loss ?? 0, stat.fractionLost);
      if (typeof stat.roundTripTime === "number" && s.rttMs === null)
        s.rttMs = stat.roundTripTime * 1000;
    } else if (stat.type === "candidate-pair" && (stat.selected || (stat.nominated && stat.state === "succeeded"))) {
      if (typeof stat.currentRoundTripTime === "number")
        s.rttMs = Math.max(s.rttMs ?? 0, stat.currentRoundTripTime * 1000);
      if (typeof stat.availableOutgoingBitrate === "number")
        s.outgoingBps = stat.availableOutgoingBitrate;
    } else if (stat.type === "outbound-rtp" && stat.kind === "video" && stat.contentType !== "screenshare") {
      if (stat.qualityLimitationReason === "bandwidth") s.limitedByBandwidth = true;
      if (typeof stat.framesPerSecond === "number")
        s.fps = s.fps === null ? stat.framesPerSecond : Math.min(s.fps, stat.framesPerSecond);
    }
  });
  return s;
};

// The reasons one sample looks weak (an empty list = fine).
export const judgeSample = (s, limits = QUALITY_LIMITS) => {
  const reasons = [];
  if (s.loss !== null && s.loss > limits.lossFraction) reasons.push("loss");
  if (s.rttMs !== null && s.rttMs > limits.rttMs) reasons.push("latency");
  if (s.outgoingBps !== null && s.outgoingBps > 0 && s.outgoingBps < limits.outgoingBps)
    reasons.push("bandwidth");
  if (s.limitedByBandwidth && s.fps !== null && s.fps < limits.minFps) reasons.push("limited");
  return reasons;
};

// Keeps a short history so one bad sample does not trigger a suggestion and one good sample does not
// cancel it. push(sample) returns { poor, reasons }.
export const createQualityMonitor = (limits = QUALITY_LIMITS) => {
  let seen = 0;
  let bad = 0;
  let good = 0;
  let poor = false;
  let reasons = [];
  return {
    push(sample) {
      seen += 1;
      if (seen <= limits.warmupSamples) return { poor, reasons };
      const now = judgeSample(sample, limits);
      if (now.length > 0) {
        bad += 1;
        good = 0;
        reasons = now;
        if (bad >= limits.badToSuggest) poor = true;
      } else {
        good += 1;
        bad = 0;
        if (poor && good >= limits.goodToRecover) {
          poor = false;
          reasons = [];
        }
      }
      return { poor, reasons };
    },
  };
};