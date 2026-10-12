import { useCallback, useEffect, useRef, useState } from "react";
import { contactService } from "../services/contactService";

const POLL_MS = 15000;

// Contacts and pending requests. Refreshed every 15 s while the tab is visible, and
// whenever the tab regains focus, so a request sent to you shows up without a reload.
//
// Only one load runs at a time. On a slow server, starting another every few seconds would make
// things worse. Background refreshes are skipped while one is running; an explicit refresh
// (after accepting a request, say) is remembered and runs once right after the current one.
export const useContacts = (enabled) => {
  const [contacts, setContacts] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const alive = useRef(true);
  const inFlight = useRef(null);
  const queued = useRef(false);

  const refresh = useCallback((options = {}) => {
    const { quiet = false, ifIdle = false } = options;
    if (inFlight.current) {
      if (!ifIdle) queued.current = true;
      return inFlight.current;
    }
    if (!quiet) setLoading(true);

    const run = (async () => {
      // independent on purpose: one failing request must not blank the other list
      const [c, r] = await Promise.allSettled([contactService.list(), contactService.requests()]);
      if (!alive.current) return;
      if (c.status === "fulfilled") {
        setContacts(c.value);
        setError(false);
      } else {
        console.error("Contacts load failed", c.reason);
        setError(true);
      }
      if (r.status === "fulfilled") setRequests(r.value);
      else console.error("Requests load failed", r.reason);
      if (!quiet) setLoading(false);
    })().finally(() => {
      inFlight.current = null;
      if (queued.current && alive.current) {
        queued.current = false;
        refresh({ quiet: true });
      }
    });

    inFlight.current = run;
    return run;
  }, []);

  useEffect(() => {
    alive.current = true;
    if (!enabled) return undefined;

    refresh();
    const tick = () => {
      if (!document.hidden) refresh({ quiet: true, ifIdle: true });
    };
    const timer = setInterval(tick, POLL_MS);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled, refresh]);

  return { contacts, requests, loading, error, refresh };
};