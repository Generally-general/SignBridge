import test from "node:test";
import assert from "node:assert/strict";
import { formatDuration } from "./formatDuration.js";
import { buildTranscriptText } from "./transcriptText.js";

test("formatDuration shows mm:ss and switches to h:mm:ss after an hour", () => {
  assert.equal(formatDuration(0), "00:00");
  assert.equal(formatDuration(999), "00:00");
  assert.equal(formatDuration(1000), "00:01");
  assert.equal(formatDuration(83000), "01:23");
  assert.equal(formatDuration(59 * 60 * 1000 + 59000), "59:59");
  assert.equal(formatDuration(3725000), "1:02:05");
});

test("formatDuration is safe for bad input", () => {
  assert.equal(formatDuration(-5000), "00:00");
  assert.equal(formatDuration(NaN), "00:00");
  assert.equal(formatDuration(undefined), "00:00");
});

test("transcript text labels who said it and how, with call-relative times", () => {
  const t0 = 1_000_000;
  const text = buildTranscriptText({
    peerName: "Priya",
    startedAt: t0,
    entries: [
      { speaker: "ME", source: "SIGN", text: "Hello, how are you?", at: t0 + 12_000 },
      { speaker: "THEM", source: "SPEECH", text: "I am fine.", at: t0 + 15_000 },
    ],
  });
  const lines = text.trim().split("\n");
  assert.match(lines[0], /with Priya/);
  assert.ok(lines.includes("[00:12] You (signs): Hello, how are you?"));
  assert.ok(lines.includes("[00:15] Priya (speech): I am fine."));
});

test("transcript text works without a start time or peer name", () => {
  const text = buildTranscriptText({ entries: [{ speaker: "THEM", source: "SIGN", text: "Hi", at: Date.now() }] });
  assert.match(text, /Them \(signs\): Hi/);
});