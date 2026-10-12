// The History tab loads the call list a page at a time. These merge a freshly loaded page into what is
// already on screen, so refreshing the newest page never throws away older pages that were loaded.

// Newest first. A call that is loaded again replaces the old copy (its status may have changed).
export const mergeCalls = (existing, incoming) => {
  const byRoom = new Map(existing.map((call) => [call.roomId, call]));
  for (const call of incoming) byRoom.set(call.roomId, call);
  return [...byRoom.values()].sort((a, b) => b.id - a.id);
};

// Replace the lines of the reloaded calls with the fresh ones; every other call keeps its lines.
export const mergeLines = (existing, incoming, roomIds) => {
  const reloaded = new Set(roomIds);
  const seen = new Set();
  const merged = [];
  for (const line of [...existing.filter((l) => !reloaded.has(l.roomId)), ...incoming]) {
    if (seen.has(line.id)) continue;
    seen.add(line.id);
    merged.push(line);
  }
  return merged;
};