
import { describeCall } from "./callLog";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const greetingFor = (now = new Date()) => {
  const h = now.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};


export const timeAgo = (iso, now = Date.now()) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} d ago`;
  return new Date(t).toLocaleDateString([], { day: "numeric", month: "short" });
};

export const weekStats = (calls, myId, now = Date.now()) => {
  let completed = 0;
  let talkSeconds = 0;
  const people = new Set();
  for (const call of calls) {
    const created = call.createdAt ? new Date(call.createdAt).getTime() : NaN;
    if (!Number.isFinite(created) || now - created > WEEK_MS) continue;
    const info = describeCall(call, myId, now);
    if (info.kind !== "completed") continue;
    completed += 1;
    talkSeconds += info.durationSeconds || 0;
    people.add(info.incoming ? call.callerId : call.receiverId);
  }
  return { completed, talkSeconds, people: people.size };
};

export const formatTalkTime = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};

export const peerIdOf = (call, myId) =>
  Number(call.receiverId) === Number(myId) ? call.callerId : call.receiverId;


export const rankContacts = (contacts, calls, myId) => {
  const counts = new Map();
  for (const call of calls) {
    const id = Number(peerIdOf(call, myId));
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return contacts
    .map((c) => ({ ...c, callCount: counts.get(Number(c.id)) || 0 }))
    .sort(
      (a, b) =>
        (b.status === "online") - (a.status === "online") ||
        b.callCount - a.callCount ||
        String(a.fullName || a.username).localeCompare(String(b.fullName || b.username)),
    );
};