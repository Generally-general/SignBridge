import React, { useCallback, useEffect, useRef, useState } from "react";
import { useCall } from "../hooks/useCall";
import { useAuth } from "../hooks/useAuth";
import { useContacts } from "../hooks/useContacts";
import { usePresence } from "../hooks/usePresence";
import { Sidebar } from "../components/layout/Sidebar";
import { AddContactModal } from "../components/contacts/AddContactModal";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { DashboardHome } from "../components/dashboard/DashboardHome";
import { userService } from "../services/userService";
import { historyService } from "../services/historyService";
import { contactService } from "../services/contactService";
import { callService } from "../services/callService";
import { countUnseenMissed } from "../utils/callLog";
import { mergeCalls, mergeLines } from "../utils/historyPaging";
import { getErrorMessage } from "../utils/validators";

const PAGE_SIZE = 20; // calls per page of the History tab

export const DashboardPage = () => {
  const { activeCall, startCall, endCall, waitForHistorySaves, queryPresence } =
    useCall();
  const { user, updateUser } = useAuth();
  const {
    contacts,
    requests,
    loading,
    error: contactsError,
    refresh,
  } = useContacts(!!user?.id);
  const contactsWithPresence = usePresence(contacts, queryPresence);

  const [addOpen, setAddOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [callHistory, setCallHistory] = useState([]);
  const [calls, setCalls] = useState([]);
  const [historyError, setHistoryError] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const historyBusy = useRef(false);
  const historyQueued = useRef(false);

  // When the History tab was last looked at: calls missed after that show as a red badge.
  const seenKey = `signbridge_calls_seen_at_${user?.id}`;
  const [seenAt, setSeenAt] = useState(() => {
    const stored = Number(localStorage.getItem(seenKey));
    if (stored) return stored;
    const now = Date.now(); // first time: older missed calls do not count as new
    localStorage.setItem(seenKey, String(now));
    return now;
  });
  const markCallsSeen = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(seenKey, String(now));
    setSeenAt(now);
  }, [seenKey]);
  const missedCount = countUnseenMissed(calls, user?.id, seenAt);

  // One page of calls, plus the saved lines of just those calls.
  const fetchHistoryPage = async (beforeId) => {
    const records = await callService.list({ limit: PAGE_SIZE, beforeId });
    const rooms = records.map((call) => call.roomId);
    let lines = [];
    try {
      lines = await historyService.getLinesForRooms(user.id, rooms);
    } catch (error) {
      // the calls are still worth showing: their lines come with the next refresh
      console.warn("Call lines unavailable:", error.message);
    }
    return { records, rooms, lines };
  };

  // Loads the newest page. Only one load runs at a time: a background refresh is skipped while one
  // is running (ifIdle), an explicit one is remembered and repeated once.
  const loadHistory = async ({ quiet = false, ifIdle = false } = {}) => {
    if (!user?.id) return;
    if (historyBusy.current) {
      if (!ifIdle) historyQueued.current = true;
      return;
    }
    historyBusy.current = true;
    if (!quiet) setHistoryError(false);
    try {
      // a history entry from the call that just ended may still be being saved
      await waitForHistorySaves();
      const { records, rooms, lines } = await fetchHistoryPage(undefined);
      setCalls((prev) => mergeCalls(prev, records));
      setCallHistory((prev) => mergeLines(prev, lines, rooms));
      if (!quiet) setHasMoreHistory(records.length >= PAGE_SIZE);
    } catch (error) {
      console.error("History load failed", error);
      if (!quiet) setHistoryError(true);
    } finally {
      historyBusy.current = false;
      if (historyQueued.current) {
        historyQueued.current = false;
        loadHistory({ quiet: true });
      }
    }
  };

  // "Load more": the next page of older calls, added below the ones already shown.
  const loadMoreHistory = async () => {
    if (loadingMoreHistory || calls.length === 0) return;
    setLoadingMoreHistory(true);
    try {
      const oldest = calls[calls.length - 1].id;
      const { records, rooms, lines } = await fetchHistoryPage(oldest);
      setCalls((prev) => mergeCalls(prev, records));
      setCallHistory((prev) => mergeLines(prev, lines, rooms));
      setHasMoreHistory(records.length >= PAGE_SIZE);
    } catch (error) {
      setActionError("Could not load older calls. Please try again.");
    } finally {
      setLoadingMoreHistory(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return undefined;
    loadHistory();
    // missed calls arrive while you are looking at the page: keep the list fresh
    const refreshQuietly = () => {
      if (!document.hidden) loadHistory({ quiet: true, ifIdle: true });
    };
    const timer = setInterval(refreshQuietly, 15000);
    window.addEventListener("focus", refreshQuietly);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshQuietly);
    };
  }, [user?.id]);

  // Sessions from before usernames existed do not carry one: fetch it once.
  useEffect(() => {
    if (user?.id && !user.username) {
      userService
        .getMe()
        .then(updateUser)
        .catch(() => {});
    }
  }, [user?.id, user?.username, updateUser]);

  const handleClearHistory = async () => {
    if (!user?.id) return;
    setActionError("");
    try {
      await callService.clearAll();
      setCalls([]);
      setCallHistory([]);
      setHasMoreHistory(false);
    } catch (error) {
      setActionError("Could not clear the history. Please try again.");
    }
  };

  const handleInitiateCall = (contact) => {
    try {
      startCall({
        id: contact.id,
        contactName: contact.fullName || contact.username,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Failed to start call handshake");
    }
  };

  // accept / decline / cancel / remove: run it, show a failure, and always refresh the lists
  const runAction = async (action) => {
    setActionError("");
    try {
      await action();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      refresh({ quiet: true });
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-57px)] bg-background">
      <Sidebar
        contacts={contactsWithPresence}
        requests={requests}
        loading={loading}
        contactsError={contactsError}
        onRetryContacts={() => refresh()}
        callHistory={callHistory}
        calls={calls}
        myId={user?.id}
        missedCount={missedCount}
        onHistoryOpened={markCallsSeen}
        hasMoreHistory={hasMoreHistory}
        loadingMoreHistory={loadingMoreHistory}
        onLoadMoreHistory={loadMoreHistory}
        onInitiateCall={handleInitiateCall}
        onClearHistory={handleClearHistory}
        historyError={historyError}
        onRetryHistory={() => loadHistory()}
        onOpenAddContact={() => setAddOpen(true)}
        onAcceptRequest={(id) => runAction(() => contactService.accept(id))}
        onDeclineRequest={(id) => runAction(() => contactService.decline(id))}
        onCancelRequest={(id) => runAction(() => contactService.cancel(id))}
        onRemoveContact={(contact) =>
          runAction(() => contactService.remove(contact.id))
        }
        notice={actionError}
      />

      <AddContactModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onChanged={() => refresh({ quiet: true })}
      />

      <main
        className={`flex-1 min-w-0 p-4 sm:p-8 ${
          activeCall ? "flex flex-col items-center justify-center" : ""
        }`}
      >
        {activeCall ? (
          <div className="text-center w-full max-w-sm">
            <Card>
              <h2 className="text-[18px] font-bold text-text-primary mb-3">
                Call in Progress
              </h2>
              <p className="text-text-secondary text-[13px] mb-6">
                {activeCall.contactName}
              </p>
              <Button variant="danger" fullWidth onClick={() => endCall()}>
                End Call
              </Button>
            </Card>
          </div>
        ) : (
          <DashboardHome
            user={user}
            contacts={contactsWithPresence}
            requests={requests}
            calls={calls}
            callHistory={callHistory}
            myId={user?.id}
            missedCount={missedCount}
            loadingContacts={loading}
            onCall={handleInitiateCall}
            onAddContact={() => setAddOpen(true)}
            onAcceptRequest={(id) => runAction(() => contactService.accept(id))}
            onDeclineRequest={(id) =>
              runAction(() => contactService.decline(id))
            }
          />
        )}
      </main>
    </div>
  );
};
