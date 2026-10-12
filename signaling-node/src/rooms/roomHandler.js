import http from "http";
import https from "https";
import { createIceServerProvider } from "./iceServers.js";
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const getIceServers = createIceServerProvider({
  keyId: process.env.CF_TURN_KEY_ID,
  apiToken: process.env.CF_TURN_API_TOKEN,
});


const BATCH_MS = 200;
const MAX_BATCH_FRAMES = 12;
const MAX_PENDING_FRAMES = 200;
const AI_TIMEOUT_MS = 3000;
const FINALIZE_TIMEOUT_MS = 1500;
const BACKEND_URL = process.env.BACKEND_URL || "https://localhost:8080";
// Works with no setup in development; set INTERNAL_API_KEY (here and in Spring) for a real deployment.
const INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY || (process.env.NODE_ENV === "production" ? "" : "signbridge-dev-internal-key");

const CONTACT_CACHE_MS = 30_000;

// Calls our own Spring backend. On this machine its self-signed certificate is accepted automatically.
function backendRequest(path, method = "GET") {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const secure = url.protocol === "https:";
    const options = { method, headers: { "X-Internal-Key": INTERNAL_API_KEY }, timeout: 2500 };
    if (secure && ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) {
      options.rejectUnauthorized = false;
    }
    const req = (secure ? https : http).request(url, options, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(raw); } catch { /* not JSON */ }
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json });
      });
    });
    req.on("timeout", () => req.destroy(new Error("timed out")));
    req.on("error", reject);
    req.end();
  });
}
const TICK_MARGIN_MS = 80; // added to the engine's "retry_in_ms"

const RING_TIMEOUT_MS = Number(process.env.RING_TIMEOUT_MS) || 40_000;
const RING_GRACE_MS = Number(process.env.RING_GRACE_MS) || 3_000;
const DISCONNECT_GRACE_MS = Number(process.env.DISCONNECT_GRACE_MS) || 20_000;
const PRESENCE_MAX_IDS = 200;
const CONTACT_LIST_CACHE_MS = 30_000;
const CALL_CHECK_TIMEOUT_MS = Number(process.env.CALL_CHECK_TIMEOUT_MS) || 1500;
const GLARE_RESEND_MS = Number(process.env.GLARE_RESEND_MS) || 300;


const activeCalls = new Map();
const CALL_RECORD_TTL_MS = 6 * 60 * 60 * 1000;


const signSessions = new Map();

async function postJson(path, body, timeoutMs = AI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`AI service ${path} returned`, response.status);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`AI service ${path} failed:`, err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function deliver(io, session, result) {
  const u = result.utterance;
  if (!u || !result.changed) return;

  const payload = {
    roomId: session.roomId,
    word: result.word ?? u.words[u.words.length - 1] ?? null,
    sentence: u.sentence,
    words: u.words,
    final: u.final,
    confidence: u.confidence,
    emotion: result.emotion,
    timestamp: Date.now(),
  };

  console.log(
    `📢 translation-result room=${session.roomId} final=${u.final} words=[${u.words.join(", ")}] -> "${u.sentence}"`,
  );

  const senderSocket = session.senderSocketId
    ? io.sockets.sockets.get(session.senderSocketId)
    : null;

  if (senderSocket) {
    // everyone else in the room sees it; the signer never sees their own
    // signs reflected back as "translation"
    senderSocket.to(session.roomId).emit("translation-result", payload);
    // the signer is told only about finished sentences, for their own history log
    if (u.final) senderSocket.emit("own-translation-result", payload);
  } else {
    io.to(session.roomId).emit("translation-result", payload);
  }
}

function armTick(io, key, delayMs) {
  const session = signSessions.get(key);
  if (!session) return;
  if (session.tickTimer) clearTimeout(session.tickTimer);
  session.tickTimer = setTimeout(() => runTick(io, key), delayMs + TICK_MARGIN_MS);
}

function handleResult(io, key, session, result) {
  if (!result) return;
  deliver(io, session, result);
  if (result.retry_in_ms !== null && result.retry_in_ms !== undefined) {
    armTick(io, key, result.retry_in_ms);
  }
}

async function runTick(io, key) {
  const session = signSessions.get(key);
  if (!session) return;
  session.tickTimer = null;
  const result = await postJson("/tick", { session_id: session.sessionId });
  handleResult(io, key, session, result);
}

async function flush(io, key) {
  const session = signSessions.get(key);
  if (!session) return;
  if (session.flushTimer) {
    clearTimeout(session.flushTimer);
    session.flushTimer = null;
  }
  if (session.busy || session.frames.length === 0) return;

  session.busy = true;
  const frames = session.frames;
  session.frames = [];
  try {
    const result = await postJson("/ingest", { session_id: session.sessionId, frames });
    handleResult(io, key, session, result);
  } finally {
    session.busy = false;
    if (signSessions.has(key) && session.frames.length > 0) {
      scheduleFlush(io, key, BATCH_MS);
    }
  }
}

function scheduleFlush(io, key, delayMs) {
  const session = signSessions.get(key);
  if (!session || session.flushTimer) return;
  session.flushTimer = setTimeout(() => flush(io, key), delayMs);
}

function dropRoomSessions(roomId) {
  for (const [key, session] of signSessions) {
    if (session.roomId !== roomId) continue;
    if (session.flushTimer) clearTimeout(session.flushTimer);
    if (session.tickTimer) clearTimeout(session.tickTimer);
    signSessions.delete(key);
    postJson("/session/end", { session_id: session.sessionId });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const contactCache = new Map(); // "1|2" -> time of the last "yes"

async function areContacts(userA, userB) {
  const key = [String(userA), String(userB)].sort().join("|");
  const cachedAt = contactCache.get(key);
  if (cachedAt && Date.now() - cachedAt < CONTACT_CACHE_MS) return true;

  if (!INTERNAL_API_KEY) {
    console.error("INTERNAL_API_KEY is not set: refusing every call (set it here and in the backend).");
    return false;
  }
  try {
    const response = await backendRequest(
      `/api/internal/contacts/check?a=${encodeURIComponent(userA)}&b=${encodeURIComponent(userB)}`,
    );
    if (!response.ok) {
      console.error("Contact check returned", response.status);
      return false;
    }
    const yes = response.json?.data?.contacts === true;
    if (yes) contactCache.set(key, Date.now());
    return yes;
  } catch (err) {
    console.error("Contact check failed (refusing the call):", err.message);
    return false; // fail closed
  }
}

// A call is ending: send the frames still buffered, close the sentence that is still waiting for
// its pause, and deliver it. Without this the last sentence of every call was silently lost.
async function finalizeRoomSessions(io, roomId) {
  const sessions = [...signSessions.values()].filter((s) => s.roomId === roomId);
  await Promise.all(
    sessions.map(async (session) => {
      if (session.flushTimer) {
        clearTimeout(session.flushTimer);
        session.flushTimer = null;
      }
      if (session.tickTimer) {
        clearTimeout(session.tickTimer);
        session.tickTimer = null;
      }
      for (let i = 0; i < 10 && session.busy; i++) await sleep(50); // let an in-flight batch finish
      if (session.frames.length) {
        const frames = session.frames;
        session.frames = [];
        await postJson("/ingest", { session_id: session.sessionId, frames }, FINALIZE_TIMEOUT_MS);
      }
      const result = await postJson("/finalize", { session_id: session.sessionId }, FINALIZE_TIMEOUT_MS);
      if (result) deliver(io, session, result);
    }),
  );
}

const isOnline = (io, userId) => (io.sockets.adapter.rooms.get(`user:${userId}`)?.size || 0) > 0;

function userInCall(userId) {
  const id = String(userId);
  for (const [roomId, call] of activeCalls) {
    if (call.callerId === id || call.calleeId === id) return roomId;
  }
  return null;
}

function findRingingCall(fromId, toId) {
  for (const [roomId, call] of activeCalls) {
    if (call.callerId === fromId && call.calleeId === toId && !call.answeredAt) return [roomId, call];
  }
  return null;
}

const socketsOf = (io, userId) =>
  [...(io.sockets.adapter.rooms.get(`user:${userId}`) || [])]
    .map((id) => io.sockets.sockets.get(id))
    .filter(Boolean);

// Ask one connected app a question and wait (briefly) for its answer; null if it does not answer.
const ask = (socket, event, payload) =>
  new Promise((resolve) => {
    if (typeof socket.timeout !== "function") return resolve(null);
    socket.timeout(CALL_CHECK_TIMEOUT_MS).emit(event, payload, (err, answer) => resolve(err ? null : answer));
  });

// The server's list of calls can outlive a call (a network that dropped at the wrong moment, a closed tab,
// an app that reset itself). So "busy" is only believed when at least one of the two apps says it is really in
// that call. If neither does, the call is a leftover: it is removed and the new call goes ahead.
async function confirmCallIsReal(io, roomId) {
  const call = activeCalls.get(roomId);
  if (!call) return false;
  const sockets = [call.callerId, call.calleeId].flatMap((id) => socketsOf(io, id));
  const answers = await Promise.all(sockets.map((s) => ask(s, "call-check", { roomId })));
  if (answers.some((a) => a && a.inCall === true)) return true;

  if (activeCalls.has(roomId)) {
    console.log(`call ${roomId} was a leftover (neither app is in it): removed`);
    io.to(`user:${call.callerId}`).emit("end-call", { roomId });
    io.to(`user:${call.calleeId}`).emit("end-call", { roomId });
    endCallRecord(roomId);
    closeCallRecord(roomId);
  }
  return false;
}

// Forget a call on the server: timers, state and the sign-language sessions of its room.
function endCallRecord(roomId) {
  const call = activeCalls.get(roomId);
  if (call) {
    clearTimeout(call.ringTimer);
    for (const timer of Object.values(call.graceTimers)) clearTimeout(timer);
    activeCalls.delete(roomId);
  }
  dropRoomSessions(roomId);
}

// Tell Spring to close the call record when the SERVER decided the call is over (nobody answered,
// the person was offline or busy, someone vanished). Best effort: a failure is only logged.
// Not used for ordinary hang-ups: the clients close their own records, which keeps "declined" apart from "cancelled".
async function closeCallRecord(roomId) {
  if (!INTERNAL_API_KEY) return;
  try {
    const response = await backendRequest(`/api/internal/calls/${encodeURIComponent(roomId)}/close`, "POST");
    if (!response.ok) console.error("Closing call record returned", response.status);
  } catch (err) {
    console.error("Closing call record failed:", err.message);
  }
}

function onRingTimeout(io, roomId) {
  const call = activeCalls.get(roomId);
  if (!call || call.answeredAt) return;
  console.log(`call ${roomId} was not answered within ${RING_TIMEOUT_MS} ms`);
  io.to(`user:${call.callerId}`).emit("call-unavailable", { roomId, reason: "no-answer" });
  io.to(`user:${call.calleeId}`).emit("end-call", { roomId }); // removes the ringing screen
  endCallRecord(roomId);
  closeCallRecord(roomId);
}

// Every socket of this user is gone. Calls they were in are ended after a short grace period,
// unless they come back (see the reconnect check in registerSocketEvents).
function handleUserGone(io, userId) {
  const me = String(userId);
  for (const [roomId, call] of activeCalls) {
    if (call.callerId !== me && call.calleeId !== me) continue;
    if (call.graceTimers[me]) continue;
    const peerId = me === call.callerId ? call.calleeId : call.callerId;
    const delay = call.answeredAt ? DISCONNECT_GRACE_MS : RING_GRACE_MS;

    call.graceTimers[me] = setTimeout(() => {
      const current = activeCalls.get(roomId);
      if (!current || isOnline(io, me)) return;
      if (!current.answeredAt) {
        if (me === current.callerId) io.to(`user:${peerId}`).emit("end-call", { roomId });
        else io.to(`user:${peerId}`).emit("call-unavailable", { roomId, reason: "offline" });
      } else {
        io.to(`user:${peerId}`).to(roomId).emit("end-call", { roomId });
      }
      console.log(`call ${roomId}: user ${me} did not come back, call ended`);
      endCallRecord(roomId);
      closeCallRecord(roomId);
    }, delay);
  }
}

// Who a user may see as online: their contacts only. Asked from Spring and cached briefly.
const contactListCache = new Map(); // userId -> { at, ids: Set<string> }

async function contactIdsOf(userId) {
  const key = String(userId);
  const hit = contactListCache.get(key);
  if (hit && Date.now() - hit.at < CONTACT_LIST_CACHE_MS) return hit.ids;
  if (!INTERNAL_API_KEY) return new Set();
  try {
    const response = await backendRequest(`/api/internal/contacts/of?u=${encodeURIComponent(key)}`);
    if (!response.ok) throw new Error(`status ${response.status}`);
    const ids = new Set((response.json?.data?.contacts || []).map(String));
    contactListCache.set(key, { at: Date.now(), ids });
    return ids;
  } catch (err) {
    console.error("Contact list lookup failed:", err.message);
    return hit?.ids || new Set();
  }
}

export const registerSocketEvents = (io, socket) => {
  const personalRoom = `user:${socket.userId}`;
  socket.join(personalRoom);
  console.log(`Signaling: User ${socket.userId} joined their personal room: ${personalRoom}`);

  for (const call of activeCalls.values()) {
    const timer = call.graceTimers[String(socket.userId)];
    if (timer) {
      clearTimeout(timer);
      delete call.graceTimers[String(socket.userId)];
    }
  }

  socket.on("call-request", async ({ toUserId, fromName, roomId, offer }) => {
    if (!(await areContacts(socket.userId, toUserId))) {
      console.warn(`call-request refused: ${socket.userId} -> ${toUserId} are not contacts`);
      socket.emit("call-unavailable", { roomId, reason: "not-a-contact" });
      return;
    }
    if (!roomId || toUserId === undefined || toUserId === null) return;
    if (String(toUserId) === String(socket.userId)) return;

    // Checked only after the contact check, so strangers cannot learn who is online.
    if (!isOnline(io, toUserId)) {
      socket.emit("call-unavailable", { roomId, reason: "offline" });
      closeCallRecord(roomId); // they will see it as a missed call
      return;
    }
    const reverse = findRingingCall(String(toUserId), String(socket.userId));
    if (reverse) {
      const [reverseRoom, reverseCall] = reverse;
      socket.emit("call-unavailable", { roomId, reason: "calling-you" });
      closeCallRecord(roomId);
      setTimeout(() => {
        if (activeCalls.has(reverseRoom)) {
          socket.emit("incoming-call", {
            fromId: reverseCall.callerId,
            fromName: reverseCall.fromName,
            roomId: reverseRoom,
            offer: reverseCall.offer,
          });
        }
      }, GLARE_RESEND_MS);
      return;
    }

    const busyRoom = userInCall(toUserId);
    if (busyRoom && (await confirmCallIsReal(io, busyRoom))) {
      socket.emit("call-unavailable", { roomId, reason: "busy" });
      closeCallRecord(roomId);
      return;
    }

    const now = Date.now();
    for (const [id, c] of activeCalls) {
      if (now - c.createdAt > CALL_RECORD_TTL_MS) endCallRecord(id);
    }
    activeCalls.set(roomId, {
      callerId: String(socket.userId),
      calleeId: String(toUserId),
      createdAt: now,
      answeredAt: null,
      fromName,
      offer,
      ringTimer: setTimeout(() => onRingTimeout(io, roomId), RING_TIMEOUT_MS),
      graceTimers: {},
    });

    socket.to(`user:${toUserId}`).emit("incoming-call", {
      fromId: socket.userId,
      fromName,
      roomId,
      offer,
    });
  });

  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", { userId: socket.userId });
    const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    console.log(`Peer ${socket.id} (user ${socket.userId}) joined call room: ${roomId} — room now has ${roomSize} member(s)`);
  });

  socket.on("get-ice-servers", async (ack) => {
    if (typeof ack !== "function") return;
    ack({ iceServers: await getIceServers() });
  });

  socket.on("offer", (data) => {
    socket.to(data.roomId).emit("offer", data);
  });

  socket.on("answer", (data) => {
    const call = data?.roomId ? activeCalls.get(data.roomId) : null;
    if (call && String(socket.userId) === call.calleeId && !call.answeredAt) {
      call.answeredAt = Date.now();
      clearTimeout(call.ringTimer);
    }
    socket.to(`user:${data.toUserId}`).emit("answer", {
      fromId: socket.userId,
      answer: data.answer,
    });
  });

  socket.on("ice-candidate", (data) => {
    if (data.toUserId) {
      socket.to(`user:${data.toUserId}`).emit("ice-candidate", data);
    } else {
      socket.to(data.roomId).emit("ice-candidate", data);
    }
  });

  socket.on("camera-status", ({ roomId, enabled }) => {
    if (!roomId) return;
    socket.to(roomId).emit("camera-status", { enabled });
  });

  socket.on("screen-share-status", ({ roomId, enabled, streamId } = {}) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    socket.to(roomId).emit("screen-share-status", {
      enabled: !!enabled,
      streamId: typeof streamId === "string" ? streamId.slice(0, 100) : undefined,
    });
  });

  socket.on("chat-message", ({ roomId, message }) => {
    if (!roomId || !message) return;
    socket.to(roomId).emit("chat-message", {
      fromUserId: socket.userId,
      message,
      timestamp: Date.now(),
    });
  });

  // Speech-to-text captions: relayed to the other participant(s) only.
  let captionTokens = 20;
  let captionRefilledAt = Date.now();
  const allowCaption = (final) => {
    const now = Date.now();
    captionTokens = Math.min(20, captionTokens + ((now - captionRefilledAt) / 1000) * 20);
    captionRefilledAt = now;
    if (final) return true; // finished sentences are never dropped
    if (captionTokens < 1) return false;
    captionTokens -= 1;
    return true;
  };

  socket.on("speech-caption", ({ roomId, text, final } = {}) => {
    if (!roomId || typeof text !== "string") return;
    const call = activeCalls.get(roomId);
    if (call) {
      const me = String(socket.userId);
      if (me !== call.callerId && me !== call.calleeId) return;
    } else if (!socket.rooms.has(roomId)) {
      return;
    }
    const clean = text.trim().slice(0, 500);
    if (!clean || !allowCaption(!!final)) return;
    socket.to(roomId).emit("speech-caption", {
      roomId,
      text: clean,
      final: !!final,
      fromUserId: socket.userId,
      timestamp: Date.now(),
    });
  });

  socket.on("end-call", async ({ roomId }) => {
    if (!roomId) return;

    const call = activeCalls.get(roomId);
    let target = socket.to(roomId);

    if (call) {
      const me = String(socket.userId);
      if (me !== call.callerId && me !== call.calleeId) return; // not a participant
      const peerId = me === call.callerId ? call.calleeId : call.callerId;
      // One broadcast to the call room AND the peer's personal room;
      // socket.io delivers once per socket even if it matches both.
      target = target.to(`user:${peerId}`);
    } else if (!socket.rooms.has(roomId)) {
      return; // unknown call and not in the room: ignore
    }

    try {
      await finalizeRoomSessions(io, roomId);
    } catch (err) {
      console.error("Closing the last sentence failed:", err.message);
    }
    target.emit("end-call", { roomId });
    endCallRecord(roomId);
  });

  socket.on("presence-query", async (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => { };
    const ids = Array.isArray(payload?.userIds)
      ? payload.userIds.slice(0, PRESENCE_MAX_IDS).map(String)
      : [];
    if (ids.length === 0) return reply({ online: [] });
    const contactIds = await contactIdsOf(socket.userId);
    reply({
      online: ids.filter((id) => contactIds.has(id) && isOnline(io, id)).map((id) => Number(id)),
    });
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id && !roomId.startsWith("user:")) {
        finalizeRoomSessions(io, roomId).finally(() => {
          if (!activeCalls.has(roomId)) dropRoomSessions(roomId);
        });
      }
    }
    if ((io.sockets.adapter.rooms.get(personalRoom)?.size || 0) <= 1) {
      handleUserGone(io, socket.userId);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });

  socket.on("metadata-stream", (data) => {
    const { roomId, landmarks } = data || {};
    if (!roomId || !landmarks) return;

    // If we know who is in this call, ignore anyone else.
    const call = activeCalls.get(roomId);
    if (call) {
      const me = String(socket.userId);
      if (me !== call.callerId && me !== call.calleeId) return;
    }

    socket.to(roomId).emit("metadata-stream", data);

    const key = `${roomId}|${socket.userId}`;
    let session = signSessions.get(key);
    if (!session) {
      session = {
        roomId,
        sessionId: key,
        senderSocketId: socket.id,
        frames: [],
        busy: false,
        flushTimer: null,
        tickTimer: null,
      };
      signSessions.set(key, session);
    }
    session.senderSocketId = socket.id;

    const hands = Array.isArray(data.hands) ? data.hands.slice(0, 2) : undefined;
    session.frames.push({ t: data.timestamp ?? Date.now(), landmarks, hands });
    if (session.frames.length > MAX_PENDING_FRAMES) {
      session.frames.splice(0, session.frames.length - MAX_PENDING_FRAMES);
    }

    if (session.frames.length >= MAX_BATCH_FRAMES) {
      flush(io, key);
    } else {
      scheduleFlush(io, key, BATCH_MS);
    }
  });
};