// Turns the server's call records and the saved transcript lines into the rows of the History tab.
//
// A call that nobody answered is stored as CANCELLED. For the person who was called that is a
// MISSED call; for the person who called it is "no answer".

const STALE_RINGING_MS = 2 * 60 * 1000;

export const describeCall = (call, myId, now = Date.now()) => {
  const incoming = Number(call.receiverId) === Number(myId);
  const peerName = (incoming ? call.callerName : call.receiverName) || "Unknown";
  const created = call.createdAt ? new Date(call.createdAt).getTime() : now;

  // older data: a call left "ringing" for ever was never answered
  const status = call.status === "RINGING" && now - created > STALE_RINGING_MS ? "CANCELLED" : call.status;

  let kind;
  if (status === "ACCEPTED" || status === "ENDED") kind = "completed";
  else if (status === "REJECTED") kind = "declined";
  else if (status === "CANCELLED") kind = incoming ? "missed" : "no-answer";
  else kind = "ringing";

  const titles = {
    missed: `Missed call from ${peerName}`,
    "no-answer": `${peerName} did not answer`,
    declined: incoming ? `You declined ${peerName}` : `${peerName} declined`,
    completed: incoming ? `Call from ${peerName}` : `Call to ${peerName}`,
    ringing: incoming ? `${peerName} is calling` : `Calling ${peerName}`,
  };

  return {
    kind,
    incoming,
    peerName,
    title: titles[kind],
    durationSeconds: kind === "completed" && call.durationSeconds != null ? call.durationSeconds : null,
  };
};

// One row per call, newest first. Calls with no saved lines still appear (missed calls, short calls),
// and old lines whose call record is gone still appear.
export const buildCallLog = (calls, entries, myId, now = Date.now()) => {
  const byRoom = new Map();
  for (const call of calls) byRoom.set(call.roomId, { roomId: call.roomId, call, entries: [] });
  for (const entry of entries) {
    const key = entry.roomId || `entry-${entry.id}`;
    if (!byRoom.has(key)) byRoom.set(key, { roomId: key, call: null, entries: [] });
    byRoom.get(key).entries.push(entry);
  }

  return [...byRoom.values()]
    .map((group) => {
      const lines = group.entries
        .slice()
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      if (group.call) {
        return { roomId: group.roomId, ...describeCall(group.call, myId, now), when: group.call.createdAt, entries: lines };
      }
      const peerName = lines[0]?.peerName || "Unknown";
      return {
        roomId: group.roomId,
        kind: "transcript",
        incoming: null,
        peerName,
        title: `Call with ${peerName}`,
        durationSeconds: null,
        when: lines[0]?.timestamp,
        entries: lines,
      };
    })
    .sort((a, b) => new Date(b.when) - new Date(a.when));
};

// Missed calls newer than the moment the History tab was last looked at.
export const countUnseenMissed = (calls, myId, seenAtMs, now = Date.now()) =>
  calls.filter(
    (call) =>
      describeCall(call, myId, now).kind === "missed" && new Date(call.createdAt).getTime() > seenAtMs,
  ).length;