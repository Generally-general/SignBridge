import { useEffect, useMemo, useRef, useState } from "react";

const REFRESH_MS = 15000;

// Marks your contacts as online/offline. Asks the signaling server (which only answers for your own
// contacts) when the list changes, every 15 s, and when the tab regains focus.
export const usePresence = (contacts, queryPresence) => {
  const [online, setOnline] = useState(() => new Set());
  const ask = useRef(queryPresence);
  ask.current = queryPresence;

  const idsKey = contacts.map((c) => c.id).sort().join(",");

  useEffect(() => {
    if (!idsKey) {
      setOnline(new Set());
      return undefined;
    }
    const ids = idsKey.split(",").map(Number);
    let alive = true;
    let busy = false; // never ask again while a question is still waiting for its answer
    const refresh = async () => {
      if (document.hidden || busy) return;
      busy = true;
      try {
        const result = await ask.current(ids);
        if (alive) setOnline(new Set(result.map(Number)));
      } finally {
        busy = false;
      }
    };
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [idsKey]);

  return useMemo(
    () => contacts.map((c) => ({ ...c, status: online.has(Number(c.id)) ? "online" : "offline" })),
    [contacts, online],
  );
};