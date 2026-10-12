import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Send, Download } from "lucide-react";
import { useCall } from "../../hooks/useCall";
import { buildTranscriptText } from "../../utils/transcriptText";

const NEAR_BOTTOM_PX = 80;

// Side panel of the call: Chat and Transcript tabs. Both lists open at the NEWEST line.
// `scrollRef` is attached to whichever list is showing (Spatial Touch pinch-scroll uses it).
export const CallSidePanel = ({ scrollRef }) => {
  const {
    activeCall,
    chatMessages,
    sendChatMessage,
    callTranscript,
    callStartedAt,
    toggleChat,
  } = useCall();
  const [tab, setTab] = useState("chat");
  const [chatInput, setChatInput] = useState("");
  const stickToBottom = useRef(true);

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // Opening the panel or switching tab: start at the newest line, without animation.
  useLayoutEffect(() => {
    stickToBottom.current = true;
    jumpToBottom();
  }, [tab]);

  // New items while open: glide to them, unless the reader scrolled up to read older ones.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current)
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatMessages.length, callTranscript.length]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput("");
    stickToBottom.current = true; // your own message always scrolls into view
  };

  const saveTranscript = () => {
    const text = buildTranscriptText({
      entries: callTranscript,
      peerName: activeCall?.contactName,
      startedAt: callStartedAt,
    });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `signbridge-transcript-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tabClass = (name) =>
    `flex-1 py-2 text-[13px] font-medium rounded-standard transition-all ${
      tab === name
        ? "bg-primary/10 text-primary"
        : "text-text-secondary hover:bg-muted"
    }`;

  return (
    <aside className="shrink-0 w-full h-[45%] sm:h-full sm:w-80 bg-surface border-t sm:border-t-0 sm:border-l border-border p-4 flex flex-col z-40">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex flex-1 gap-1">
          <button onClick={() => setTab("chat")} className={tabClass("chat")}>
            Chat
          </button>
          <button
            onClick={() => setTab("transcript")}
            className={tabClass("transcript")}
          >
            Transcript
          </button>
        </div>
        <button
          onClick={toggleChat}
          className="p-1.5 rounded-standard text-text-secondary hover:bg-muted transition-all"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {tab === "chat" ? (
        <>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 mb-3"
          >
            {chatMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-text-muted text-[13px]">
                No messages yet
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[80%] px-3 py-2 rounded-standard text-[13px] ${
                    msg.isOwn
                      ? "self-end bg-primary text-white"
                      : "self-start bg-muted text-text-primary"
                  }`}
                >
                  {msg.message}
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 h-10 bg-background border border-border rounded-standard px-3 text-[12px] text-text-primary focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-standard hover:bg-primary/90 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      ) : (
        <>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 mb-3"
          >
            {callTranscript.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center text-text-muted text-[13px] px-4">
                Sentences from signs and speech appear here for the whole call
              </div>
            ) : (
              callTranscript.map((e) => (
                <div
                  key={e.id}
                  className={`rounded-standard px-3 py-2 text-[13px] ${
                    e.speaker === "ME"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex justify-between gap-2 text-[10px] text-text-muted mb-0.5">
                    <span>
                      {e.speaker === "ME"
                        ? "You"
                        : activeCall?.contactName || "Them"}{" "}
                      · {e.source === "SPEECH" ? "speech" : "signs"}
                    </span>
                    <span>
                      {new Date(e.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-text-primary break-words">{e.text}</p>
                </div>
              ))
            )}
          </div>
          <button
            onClick={saveTranscript}
            disabled={callTranscript.length === 0}
            className="flex items-center justify-center gap-2 h-10 rounded-standard border border-border text-[12px] font-semibold text-text-primary hover:bg-muted transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Save transcript (.txt)
          </button>
        </>
      )}
    </aside>
  );
};
