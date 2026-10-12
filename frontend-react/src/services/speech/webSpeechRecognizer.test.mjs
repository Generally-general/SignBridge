import test from "node:test";
import assert from "node:assert/strict";
import { WebSpeechRecognizer } from "./webSpeechRecognizer.js";

class FakeRec {
  static instances = [];
  constructor() {
    FakeRec.instances.push(this);
    this.started = 0;
    this.stopped = 0;
    this.aborted = 0;
  }
  start() { this.started += 1; }
  stop() { this.stopped += 1; }
  abort() { this.aborted += 1; }
}
const last = () => FakeRec.instances[FakeRec.instances.length - 1];
const res = (text, isFinal) => {
  const r = [{ transcript: text }];
  r.isFinal = isFinal;
  return r;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const make = (extra = {}) => {
  FakeRec.instances = [];
  let t = 0;
  const events = { interim: [], final: [], status: [], error: [] };
  const rec = new WebSpeechRecognizer({
    getCtor: () => FakeRec,
    restartBaseMs: 5,
    now: () => t,
    ...extra,
  });
  const ok = rec.start({
    lang: "en-IN",
    onInterim: (x) => events.interim.push(x),
    onFinal: (x) => events.final.push(x),
    onStatus: (x) => events.status.push(x),
    onError: (x) => events.error.push(x),
  });
  return { rec, ok, events, advance: (ms) => (t += ms) };
};

test("unsupported browser reports a fatal error and does not start", () => {
  const events = [];
  const rec = new WebSpeechRecognizer({ getCtor: () => undefined });
  assert.equal(rec.isSupported(), false);
  assert.equal(rec.start({ onError: (e) => events.push(e) }), false);
  assert.equal(events[0].code, "unsupported");
  assert.equal(events[0].fatal, true);
});

test("configures continuous interim recognition in the requested language", () => {
  const { ok } = make();
  assert.equal(ok, true);
  const r = last();
  assert.equal(r.lang, "en-IN");
  assert.equal(r.continuous, true);
  assert.equal(r.interimResults, true);
  assert.equal(r.started, 1);
});

test("identical interim text is reported once", () => {
  const { events } = make();
  const r = last();
  r.onresult({ resultIndex: 0, results: [res("hello", false)] });
  r.onresult({ resultIndex: 0, results: [res("hello", false)] });
  r.onresult({ resultIndex: 0, results: [res("hello there", false)] });
  assert.deepEqual(events.interim, ["hello", "hello there"]);
});

test("only results from resultIndex onward are processed", () => {
  const { events } = make();
  const r = last();
  r.onresult({ resultIndex: 0, results: [res("first sentence", true)] });
  r.onresult({ resultIndex: 1, results: [res("first sentence", true), res("second", false)] });
  assert.deepEqual(events.final, ["first sentence"]);
  assert.deepEqual(events.interim, ["second"]);
});

test("a repeated final result inside the window is dropped, a different one is kept", () => {
  const { events, advance } = make();
  const r = last();
  r.onresult({ resultIndex: 0, results: [res("good morning", true)] });
  advance(500);
  r.onresult({ resultIndex: 0, results: [res("good morning", true)] });
  advance(3000);
  r.onresult({ resultIndex: 0, results: [res("good morning", true)] }); // genuinely said again later
  r.onresult({ resultIndex: 0, results: [res("how are you", true)] });
  assert.deepEqual(events.final, ["good morning", "good morning", "how are you"]);
});

test("a healthy session ending restarts listening", async () => {
  const { advance } = make();
  advance(10000);
  last().onend();
  await sleep(120);
  assert.equal(FakeRec.instances.length, 2);
  assert.equal(last().started, 1);
});

test("stop() prevents any restart", async () => {
  const { rec } = make();
  rec.stop();
  last().onend();
  await sleep(60);
  assert.equal(FakeRec.instances.length, 1);
});

test("permission denial is fatal and does not retry", async () => {
  const { events } = make();
  last().onerror({ error: "not-allowed" });
  last().onend();
  await sleep(60);
  assert.equal(events.error[0].code, "not-allowed");
  assert.equal(events.error[0].fatal, true);
  assert.equal(FakeRec.instances.length, 1);
  assert.equal(events.status.at(-1), "stopped");
});

test("no-speech is benign and listening resumes", async () => {
  const { events, advance } = make();
  advance(10000);
  last().onerror({ error: "no-speech" });
  last().onend();
  await sleep(120);
  assert.equal(events.error.length, 0);
  assert.equal(FakeRec.instances.length, 2);
});

test("repeated quick failures end in a fatal 'unstable' error", async () => {
  const { events } = make({ maxQuickFailures: 3 });
  for (let i = 0; i < 6; i++) {
    last().onerror({ error: "network" });
    last().onend(); // session died immediately, no time passed
    await sleep(60);
  }
  const fatal = events.error.find((e) => e.fatal);
  assert.equal(fatal.code, "unstable");
  assert.equal(events.error.filter((e) => e.code === "network").length >= 1, true);
});

test("events from a replaced instance are ignored", async () => {
  const { events, advance } = make();
  advance(10000);
  const old = last();
  old.onend();
  await sleep(120);
  old.onresult({ resultIndex: 0, results: [res("ghost", true)] });
  assert.deepEqual(events.final, []);
});

test("destroy() aborts and silences everything", () => {
  const { rec } = make();
  const r = last();
  rec.destroy();
  assert.equal(r.aborted, 1);
  assert.equal(r.onresult, null);
});