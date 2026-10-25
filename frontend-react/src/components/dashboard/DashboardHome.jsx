import React, { useMemo, useState } from "react";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  UserPlus,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";
import { Skeleton } from "../ui/Skeleton";
import { initialOf } from "../../utils/contactsUi";
import { buildCallLog } from "../../utils/callLog";
import { formatDuration } from "../../utils/formatDuration";
import {
  greetingFor,
  timeAgo,
  weekStats,
  formatTalkTime,
  peerIdOf,
  rankContacts,
} from "../../utils/dashboardStats";

const RECENT_LIMIT = 6;
const ONLINE_LIMIT = 8;

const Section = ({ title, action, children }) => (
  <section className="text-left">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-text-muted">
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

const Tile = ({ label, value, sub, tone }) => (
  <div className="bg-surface border border-border rounded-card p-4">
    <p className="text-[11px] uppercase tracking-widest text-text-muted">
      {label}
    </p>
    <p className={`text-[24px] font-bold mt-1 ${tone || "text-text-primary"}`}>
      {value}
    </p>
    {sub && <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>}
  </div>
);

const Avatar = ({ name, online, size = "w-10 h-10" }) => (
  <div className="relative shrink-0">
    <div
      className={`${size} rounded-full bg-primary/10 text-primary flex items-center justify-center text-[14px] font-bold`}
    >
      {initialOf(name)}
    </div>
    {online !== undefined && (
      <span
        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${
          online ? "bg-success" : "bg-text-muted"
        }`}
      />
    )}
  </div>
);

const KIND_ICON = {
  completed: { Icon: PhoneOutgoing, color: "text-success" },
  missed: { Icon: PhoneMissed, color: "text-danger" },
  "no-answer": { Icon: PhoneOutgoing, color: "text-text-muted" },
  declined: { Icon: PhoneMissed, color: "text-warning" },
  ringing: { Icon: Phone, color: "text-primary" },
  transcript: { Icon: Phone, color: "text-text-muted" },
};

export const DashboardHome = ({
  user,
  contacts,
  requests,
  calls,
  callHistory,
  myId,
  missedCount,
  loadingContacts,
  onCall,
  onAddContact,
  onAcceptRequest,
  onDeclineRequest,
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [showAllOnline, setShowAllOnline] = useState(false);

  const firstName = (user?.fullName || user?.username || "").split(" ")[0];
  const stats = useMemo(() => weekStats(calls, myId), [calls, myId]);
  const ranked = useMemo(
    () => rankContacts(contacts, calls, myId),
    [contacts, calls, myId],
  );
  const online = ranked.filter((c) => c.status === "online");
  const shownOnline = showAllOnline ? online : online.slice(0, ONLINE_LIMIT);
  const callByRoom = useMemo(
    () => new Map(calls.map((c) => [c.roomId, c])),
    [calls],
  );
  const contactById = useMemo(
    () => new Map(contacts.map((c) => [Number(c.id), c])),
    [contacts],
  );
  const recent = useMemo(
    () => buildCallLog(calls, callHistory, myId).slice(0, RECENT_LIMIT),
    [calls, callHistory, myId],
  );
  const incoming = requests?.incoming ?? [];

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(`@${user.username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable: nothing to do */
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-left">
        <div>
          <h1 className="text-[24px] font-bold text-text-primary">
            {greetingFor()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          {user?.username && (
            <button
              onClick={copyUsername}
              className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
              title="Copy your username to share it"
            >
              @{user.username}
              {copied ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="text-[11px] text-text-muted">
                {copied ? "Copied" : "Share it so people can add you"}
              </span>
            </button>
          )}
        </div>
        <button
          onClick={onAddContact}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-standard bg-primary text-white text-[13px] font-bold hover:bg-primary/90 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add contact
        </button>
      </div>

      {/* This week */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Calls this week" value={stats.completed} sub="completed" />
        <Tile
          label="Talk time"
          value={formatTalkTime(stats.talkSeconds)}
          sub="last 7 days"
        />
        <Tile label="People" value={stats.people} sub="spoken to this week" />
        <Tile
          label="Missed"
          value={missedCount}
          sub={missedCount ? "since you last checked" : "all caught up"}
          tone={missedCount ? "text-danger" : undefined}
        />
      </div>

      {/* Requests waiting for you */}
      {incoming.length > 0 && (
        <Section title={`Requests (${incoming.length})`}>
          <div className="grid gap-2 sm:grid-cols-2">
            {incoming.map((req) => (
              <div
                key={req.requestId}
                className="flex items-center gap-3 p-3 bg-surface border border-primary/40 rounded-card"
              >
                <Avatar name={req.fullName} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-text-primary truncate">
                    {req.fullName}
                  </p>
                  <p className="text-[11px] text-text-muted truncate">
                    @{req.username}
                  </p>
                </div>
                <button
                  onClick={() => onAcceptRequest(req.requestId)}
                  className="px-3 py-1.5 rounded-standard bg-success/10 text-success text-[12px] font-bold hover:bg-success/20"
                >
                  Accept
                </button>
                <button
                  onClick={() => onDeclineRequest(req.requestId)}
                  className="px-3 py-1.5 rounded-standard bg-muted text-text-secondary text-[12px] font-bold hover:bg-border"
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Online now */}
      <Section
        title={`Online now${online.length ? ` (${online.length})` : ""}`}
        action={
          online.length > ONLINE_LIMIT && (
            <button
              onClick={() => setShowAllOnline((v) => !v)}
              className="text-[12px] text-primary hover:underline"
            >
              {showAllOnline ? "Show fewer" : `Show all ${online.length}`}
            </button>
          )
        }
      >
        {loadingContacts && contacts.length === 0 ? (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-card" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-6 bg-surface border border-dashed border-border rounded-card text-center">
            <p className="text-[13px] text-text-secondary mb-3">
              You have no contacts yet. Add someone by their username to start
              calling.
            </p>
            <button
              onClick={onAddContact}
              className="px-4 py-2 rounded-standard bg-primary text-white text-[13px] font-bold"
            >
              Add your first contact
            </button>
          </div>
        ) : online.length === 0 ? (
          <p className="p-4 bg-surface border border-border rounded-card text-[13px] text-text-secondary text-left">
            None of your contacts are online right now. You can still call them
            from the list: they will see a missed call.
          </p>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {shownOnline.map((c) => (
              <button
                key={c.id}
                onClick={() => onCall(c)}
                className="group flex flex-col items-center gap-2 p-4 bg-surface border border-border rounded-card hover:border-primary/60 transition-all"
                title={`Call ${c.fullName || c.username}`}
              >
                <Avatar
                  name={c.fullName || c.username}
                  online
                  size="w-12 h-12"
                />
                <span className="text-[13px] font-semibold text-text-primary truncate max-w-full">
                  {c.fullName || c.username}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-primary opacity-70 group-hover:opacity-100">
                  <Phone className="w-3 h-3" /> Call
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Recent calls */}
      <Section title="Recent calls">
        {recent.length === 0 ? (
          <p className="p-4 bg-surface border border-border rounded-card text-[13px] text-text-secondary text-left">
            Your calls will appear here, with what was said in each one.
          </p>
        ) : (
          <div className="bg-surface border border-border rounded-card divide-y divide-border">
            {recent.map((item) => {
              const base = KIND_ICON[item.kind] || KIND_ICON.transcript;
              const Icon =
                item.kind === "completed" && item.incoming
                  ? PhoneIncoming
                  : base.Icon;
              const color = base.color;
              const call = callByRoom.get(item.roomId);
              const contact = call
                ? contactById.get(Number(peerIdOf(call, myId)))
                : null;
              const open = expanded === item.roomId;
              return (
                <div key={item.roomId}>
                  <div className="flex items-center gap-3 p-3">
                    <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[13px] truncate ${
                          item.kind === "missed"
                            ? "text-danger font-semibold"
                            : "text-text-primary"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {timeAgo(item.when)}
                        {item.durationSeconds != null &&
                          ` · ${formatDuration(item.durationSeconds * 1000)}`}
                        {item.entries.length > 0 &&
                          ` · ${item.entries.length} ${item.entries.length === 1 ? "line" : "lines"} saved`}
                      </p>
                    </div>
                    {contact && (
                      <button
                        onClick={() => onCall(contact)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-standard bg-primary/10 text-primary text-[12px] font-bold hover:bg-primary/20 shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {item.kind === "missed" ? "Call back" : "Call"}
                      </button>
                    )}
                    {item.entries.length > 0 && (
                      <button
                        onClick={() => setExpanded(open ? null : item.roomId)}
                        aria-expanded={open}
                        aria-label={
                          open ? "Hide what was said" : "Show what was said"
                        }
                        className="p-1.5 rounded-full text-text-secondary hover:bg-muted"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                  </div>
                  {open && (
                    <div className="px-4 pb-3 pt-1 space-y-1.5 bg-background/60">
                      {item.entries.map((entry) => (
                        <p
                          key={entry.id}
                          className="text-[12px] text-text-primary leading-snug"
                        >
                          {entry.speaker && (
                            <span className="text-[10px] text-text-muted mr-1.5">
                              {entry.speaker === "ME" ? "You" : item.peerName}
                              {entry.source === "SPEECH"
                                ? " (speech)"
                                : " (signs)"}
                              :
                            </span>
                          )}
                          &ldquo;{entry.translatedText}&ldquo;
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
};
