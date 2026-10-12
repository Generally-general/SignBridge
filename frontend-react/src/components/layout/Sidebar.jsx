import React, { useEffect, useState } from "react";
import {
  Users,
  Clock,
  Search,
  Trash2,
  UserPlus,
  UserMinus,
  Inbox,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
} from "lucide-react";
import { Skeleton } from "../ui/Skeleton";
import { Badge } from "../ui/Badge";
import { Logo } from "../ui/Logo";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { initialOf } from "../../utils/contactsUi";
import { buildCallLog } from "../../utils/callLog";
import { formatDuration } from "../../utils/formatDuration";

const EMPTY_REQUESTS = { incoming: [], outgoing: [] };

export const Sidebar = ({
  contacts,
  requests = EMPTY_REQUESTS,
  loading,
  contactsError = false,
  onRetryContacts,
  callHistory,
  calls = [],
  myId,
  missedCount = 0,
  onHistoryOpened,
  hasMoreHistory = false,
  loadingMoreHistory = false,
  onLoadMoreHistory,
  onInitiateCall,
  onClearHistory,
  historyError,
  onRetryHistory,
  onOpenAddContact,
  onAcceptRequest,
  onDeclineRequest,
  onCancelRequest,
  onRemoveContact,
  notice = "",
}) => {
  const [activeTab, setActiveTab] = useState("contacts");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCallId, setExpandedCallId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const incomingCount = requests.incoming.length;

  // one row per call: every call record, plus any old transcript lines without a record
  const callLog = React.useMemo(
    () => buildCallLog(calls, callHistory, myId),
    [calls, callHistory, myId],
  );

  // looking at the History tab means the missed calls have been seen
  useEffect(() => {
    if (activeTab === "history") onHistoryOpened?.();
  }, [activeTab, calls, onHistoryOpened]);

  const needle = searchQuery.toLowerCase();
  const filteredContacts = contacts.filter(
    (contact) =>
      (contact.fullName || "").toLowerCase().includes(needle) ||
      (contact.username || "").toLowerCase().includes(needle),
  );

  const tabClass = (name) =>
    `relative flex-1 min-w-0 py-2.5 px-1 flex items-center justify-center gap-1 text-[12px] font-medium transition-all ${
      activeTab === name
        ? "bg-primary/10 text-primary"
        : "text-text-secondary hover:bg-muted"
    }`;

  return (
    <aside className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-r border-border flex flex-col h-auto md:h-[calc(100vh-57px)] md:sticky md:top-0 md:self-start shrink-0">
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("contacts")}
          className={tabClass("contacts")}
        >
          <Users className="w-4 h-4" />
          <span>Contacts</span>
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={tabClass("requests")}
        >
          <Inbox className="w-4 h-4" />
          <span>Requests</span>
          {incomingCount > 0 && (
            <span
              aria-label={`${incomingCount} new requests`}
              className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center"
            >
              {incomingCount > 9 ? "9+" : incomingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={tabClass("history")}
        >
          <Clock className="w-4 h-4" />
          <span>History</span>
          {missedCount > 0 && (
            <span
              aria-label={`${missedCount} missed calls`}
              className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center"
            >
              {missedCount > 9 ? "9+" : missedCount}
            </span>
          )}
        </button>
      </div>

      {notice && <p className="px-3 pt-2 text-[11px] text-danger">{notice}</p>}

      {activeTab === "history" && callLog.length > 0 && (
        <div className="px-3 pt-3">
          <button
            onClick={() => setConfirmClear(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-standard text-[11px] font-semibold text-danger hover:bg-danger/5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        </div>
      )}

      {activeTab === "contacts" && (
        <div className="p-3 border-b border-border flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full h-9 bg-background border border-border rounded-standard py-2 pl-9 pr-3 text-[12px] text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-all"
            />
          </div>
          <button
            onClick={onOpenAddContact}
            title="Add contact"
            aria-label="Add contact"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-standard bg-primary text-white hover:bg-primary/90 transition-all"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 max-h-72 md:max-h-none">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : activeTab === "contacts" ? (
          <div className="flex flex-col gap-2">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => onInitiateCall(contact)}
                  className="group p-3 bg-surface border border-border rounded-standard hover:border-primary/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center text-text-primary font-semibold text-[13px]">
                        {initialOf(contact.fullName)}
                      </div>
                      {contact.status === "online" && (
                        <div
                          aria-label="Online"
                          title="Online"
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-surface"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-medium truncate text-[13px]">
                        {contact.fullName}
                      </p>
                      {contact.username && (
                        <p className="text-text-muted truncate text-[11px]">
                          @{contact.username}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmRemove(contact);
                      }}
                      aria-label={`Remove ${contact.fullName}`}
                      title="Remove contact"
                      className="shrink-0 p-1.5 rounded-standard text-text-muted hover:text-danger hover:bg-danger/5 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : contactsError ? (
              <div className="text-center py-10 border border-dashed border-border rounded-card">
                <p className="text-[13px] text-danger mb-2">
                  Couldn&apos;t load contacts
                </p>
                <button
                  onClick={onRetryContacts}
                  className="text-[12px] font-semibold text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-border rounded-card px-3">
                <Logo
                  variant="mark"
                  height={36}
                  alt=""
                  className="mx-auto mb-2 opacity-30"
                />
                <p className="text-[13px] text-text-secondary mb-3">
                  {searchQuery ? "No matching contacts" : "No contacts yet"}
                </p>
                {!searchQuery && (
                  <button
                    onClick={onOpenAddContact}
                    className="text-[12px] font-semibold text-primary hover:underline"
                  >
                    Add your first contact
                  </button>
                )}
              </div>
            )}
          </div>
        ) : activeTab === "requests" ? (
          <div className="flex flex-col gap-4">
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                Received
              </h3>
              {requests.incoming.length === 0 ? (
                <p className="text-[12px] text-text-muted">No new requests</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {requests.incoming.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-3 bg-surface border border-border rounded-standard"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center text-text-primary font-semibold text-[13px] shrink-0">
                          {initialOf(req.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-text-primary font-medium truncate text-[13px]">
                            {req.fullName}
                          </p>
                          <p className="text-text-muted truncate text-[11px]">
                            @{req.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onAcceptRequest(req.requestId)}
                          className="flex-1 py-1.5 rounded-standard bg-primary text-white text-[12px] font-bold hover:bg-primary/90 transition-all"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onDeclineRequest(req.requestId)}
                          className="flex-1 py-1.5 rounded-standard bg-muted text-text-secondary text-[12px] font-bold hover:bg-muted/70 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                Sent
              </h3>
              {requests.outgoing.length === 0 ? (
                <p className="text-[12px] text-text-muted">
                  No requests waiting for an answer
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {requests.outgoing.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-3 bg-surface border border-border rounded-standard flex items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-text-primary font-medium truncate text-[13px]">
                          {req.fullName}
                        </p>
                        <p className="text-text-muted truncate text-[11px]">
                          @{req.username} - waiting
                        </p>
                      </div>
                      <button
                        onClick={() => onCancelRequest(req.requestId)}
                        className="shrink-0 text-[12px] font-semibold text-text-secondary hover:text-danger transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {callLog.length > 0 ? (
              callLog.map((item) => {
                const isExpanded = expandedCallId === item.roomId;
                const hasLines = item.entries.length > 0;
                const missed = item.kind === "missed";
                const Icon =
                  item.kind === "missed"
                    ? PhoneMissed
                    : item.kind === "transcript"
                      ? Clock
                      : item.incoming
                        ? PhoneIncoming
                        : PhoneOutgoing;
                const header = (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        missed
                          ? "text-danger"
                          : item.kind === "completed"
                            ? "text-primary"
                            : "text-text-muted"
                      }`}
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <p
                        className={`text-[13px] font-medium truncate ${
                          missed ? "text-danger" : "text-text-primary"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-text-muted text-[11px]">
                        {item.when
                          ? new Date(item.when).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : ""}
                        {item.durationSeconds != null &&
                          ` · ${formatDuration(item.durationSeconds * 1000)}`}
                      </p>
                    </div>
                    {hasLines && (
                      <Badge variant="primary">{item.entries.length}</Badge>
                    )}
                  </>
                );
                return (
                  <div
                    key={item.roomId}
                    className="bg-surface border border-border rounded-standard overflow-hidden"
                  >
                    {hasLines ? (
                      <button
                        onClick={() =>
                          setExpandedCallId(isExpanded ? null : item.roomId)
                        }
                        className="w-full p-3 flex items-center gap-3 hover:bg-muted transition-all"
                      >
                        {header}
                      </button>
                    ) : (
                      <div className="w-full p-3 flex items-center gap-3">
                        {header}
                      </div>
                    )}

                    {isExpanded && (
                      <div className="border-t border-border p-3 flex flex-col gap-2 bg-background">
                        {item.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex justify-between items-start gap-2"
                          >
                            <p className="text-text-primary text-[12px] leading-tight">
                              {entry.speaker && (
                                <span className="text-[10px] text-text-muted mr-1.5">
                                  {entry.speaker === "ME"
                                    ? "You"
                                    : item.peerName}
                                  {entry.source === "SPEECH"
                                    ? " (speech)"
                                    : " (signs)"}
                                  :
                                </span>
                              )}
                              "{entry.translatedText}"
                            </p>
                            <span className="text-[10px] text-text-muted shrink-0">
                              {new Date(entry.timestamp).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 border border-dashed border-border rounded-card">
                <Logo
                  variant="mark"
                  height={36}
                  alt=""
                  className="mx-auto mb-2 opacity-30"
                />
                {historyError ? (
                  <>
                    <p className="text-[13px] text-danger mb-2">
                      Couldn&apos;t load history
                    </p>
                    <button
                      onClick={onRetryHistory}
                      className="text-[12px] font-semibold text-primary hover:underline"
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  <p className="text-[13px] text-text-secondary">
                    History is empty
                  </p>
                )}
              </div>
            )}
            {callLog.length > 0 && hasMoreHistory && (
              <button
                onClick={onLoadMoreHistory}
                disabled={loadingMoreHistory}
                className="w-full py-2 rounded-standard border border-border text-[12px] font-semibold text-text-secondary hover:bg-muted transition-all disabled:opacity-50"
              >
                {loadingMoreHistory ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title="Remove contact?"
        size="sm"
      >
        <p className="text-[13px] text-text-secondary mb-5">
          {confirmRemove?.fullName} (@{confirmRemove?.username}) will no longer
          be able to call you, and you won&apos;t be able to call them. You can
          add them again later.
        </p>
        <div className="flex gap-3">
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              onRemoveContact(confirmRemove);
              setConfirmRemove(null);
            }}
          >
            Remove
          </Button>
          <button
            onClick={() => setConfirmRemove(null)}
            className="flex-1 rounded-standard px-4 py-2 text-[13px] font-bold text-text-secondary hover:bg-muted transition-all"
          >
            Cancel
          </button>
        </div>
      </Modal>
      <Modal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear history?"
        size="sm"
      >
        <p className="text-[13px] text-text-secondary mb-5">
          This removes your call list and your saved translations from your
          account. The other person&apos;s history is not affected, and this
          cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              onClearHistory();
              setConfirmClear(false);
            }}
          >
            Clear
          </Button>
          <button
            onClick={() => setConfirmClear(false)}
            className="flex-1 rounded-standard px-4 py-2 text-[13px] font-bold text-text-secondary hover:bg-muted transition-all"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </aside>
  );
};
