import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

// fake Spring backend: users 1 and 2 are contacts; everything else is not
let hits = 0;
const backend = http.createServer((req, res) => {
  hits += 1;
  const url = new URL(req.url, "http://x");
  if (req.headers["x-internal-key"] !== "secret") { res.statusCode = 403; return res.end("{}"); }
  const a = url.searchParams.get("a"), b = url.searchParams.get("b");
  const yes = [a, b].sort().join("|") === "1|2";
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ success: true, data: { contacts: yes } }));
});
await new Promise((r) => backend.listen(0, r));
process.env.BACKEND_URL = `http://localhost:${backend.address().port}`;
process.env.INTERNAL_API_KEY = "secret";
const { registerSocketEvents } = await import("./roomHandler.js");

const sent = [];
const mk = (id, userId) => {
  const h = {};
  return { id, userId, rooms: new Set([id]), handlers: h, join() {}, on(e, f) { h[e] = f; },
    to(room) { return { to() { return this; }, emit: (ev, p) => sent.push({ room, ev, p }) }; },
    emit: (ev, p) => sent.push({ room: "self", ev, p }) };
};
const io = { sockets: { sockets: new Map(), adapter: { rooms: new Map() } }, to: () => ({ emit() {} }) };
const one = mk("S1", 1); const three = mk("S3", 3);
io.sockets.adapter.rooms.set("user:2", new Set(["S2"]));
registerSocketEvents(io, one); registerSocketEvents(io, three);

test("a contact can be called", async () => {
  sent.length = 0;
  await one.handlers["call-request"]({ toUserId: 2, fromName: "Ana", roomId: "room_a", offer: {} });
  assert.ok(sent.some((s) => s.ev === "incoming-call" && s.room === "user:2"));
  assert.ok(!sent.some((s) => s.ev === "call-unavailable"));
});

test("someone who is not a contact is refused and nobody is rung", async () => {
  sent.length = 0;
  await three.handlers["call-request"]({ toUserId: 2, fromName: "Cara", roomId: "room_b", offer: {} });
  assert.ok(!sent.some((s) => s.ev === "incoming-call"));
  const refusal = sent.find((s) => s.ev === "call-unavailable");
  assert.equal(refusal.room, "self");
  assert.equal(refusal.p.reason, "not-a-contact");
});

test("a yes answer is cached for a short time", async () => {
  hits = 0;
  await one.handlers["call-request"]({ toUserId: 2, fromName: "Ana", roomId: "room_c", offer: {} });
  await one.handlers["call-request"]({ toUserId: 2, fromName: "Ana", roomId: "room_d", offer: {} });
  assert.equal(hits, 0); // already cached by the first test
});

test("if the backend cannot be reached the call is refused (fail closed)", async () => {
  backend.close();
  sent.length = 0;
  await three.handlers["call-request"]({ toUserId: 2, fromName: "Cara", roomId: "room_e", offer: {} });
  assert.ok(sent.some((s) => s.ev === "call-unavailable"));
  assert.ok(!sent.some((s) => s.ev === "incoming-call"));
});
