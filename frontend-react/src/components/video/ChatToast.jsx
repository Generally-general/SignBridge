import React, { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useCall } from "../../hooks/useCall";

// Small popup that slides in from the right edge when a chat message arrives
// while the chat panel is closed. Tap it to open the chat.
export const ChatToast = () => {
  const { chatToast, dismissChatToast, toggleChat } = useCall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!chatToast) {
      setVisible(false);
      return undefined;
    }
    const raf = requestAnimationFrame(() => setVisible(true)); // slide in
    const hide = setTimeout(() => setVisible(false), 4500); // slide out
    const clear = setTimeout(dismissChatToast, 4800);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hide);
      clearTimeout(clear);
    };
  }, [chatToast, dismissChatToast]);

  if (!chatToast) return null;

  return (
    <button
      type="button"
      onClick={toggleChat}
      aria-live="polite"
      className={`absolute right-0 top-1/2 -translate-y-1/2 z-40 max-w-[75%] sm:max-w-xs text-left bg-surface border border-border rounded-l-card shadow-card px-3 py-2 flex items-start gap-2 transition-transform duration-300 ${
        visible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold text-text-muted truncate">
          {chatToast.from}
        </span>
        <span className="block text-[13px] text-text-primary line-clamp-2 break-words">
          {chatToast.message}
        </span>
      </span>
    </button>
  );
};
