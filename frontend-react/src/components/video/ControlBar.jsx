import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  PhoneOff,
  Type,
  RefreshCw,
  ScreenShare,
  ScreenShareOff,
  Hand,
} from "lucide-react";
import { useCall } from "../../hooks/useCall";

// One row of the "More" menu.
const MenuItem = ({ icon, label, active, disabled, onClick, hint }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={active}
    title={hint}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-standard text-left text-sm transition-colors disabled:opacity-40 ${
      active ? "bg-primary text-white" : "text-text-primary hover:bg-muted"
    }`}
  >
    <span className="w-5 h-5 flex items-center justify-center shrink-0">
      {icon}
    </span>
    <span className="flex-1 truncate">{label}</span>
    {active && (
      <span className="text-[10px] uppercase tracking-widest">On</span>
    )}
  </button>
);

export const ControlBar = ({ onEndCall }) => {
  const {
    micEnabled,
    toggleMic,
    cameraEnabled,
    toggleCamera,
    canSwitchCamera,
    switchCamera,
    translationEnabled,
    toggleTranslation,
    speechEnabled,
    toggleSpeech,
    isChatOpen,
    toggleChat,
    unreadCount,
    screenShareSupported,
    isScreenSharing,
    remoteScreenStream,
    toggleScreenShare,
    skeletonMode,
    toggleSkeleton,
  } = useCall();

  const [menuOpen, setMenuOpen] = useState(false);
  const barRef = useRef(null);

  // Close the menu on an outside click, an outside hand-pointer tap, or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const closeIfOutside = (target) => {
      if (barRef.current && !(target && barRef.current.contains(target)))
        setMenuOpen(false);
    };
    const onClick = (e) => closeIfOutside(e.target);
    const onTap = (e) =>
      closeIfOutside(document.elementFromPoint(e.detail.x, e.detail.y));
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("sb-pointer-tap", onTap);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("sb-pointer-tap", onTap);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const btn = "p-2 sm:p-3 rounded-full transition-all duration-300";
  const pick = (fn) => () => {
    setMenuOpen(false);
    fn();
  };
  // A dot on the "More" button when something inside it is switched on.
  const moreActive = isScreenSharing || skeletonMode || speechEnabled;

  return (
    <div
      ref={barRef}
      className="relative flex gap-1.5 sm:gap-2 justify-center items-center p-2 sm:p-3 bg-surface border border-border rounded-full"
    >
      {menuOpen && (
        <div
          role="menu"
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 max-w-[calc(100vw-2rem)] p-1.5 bg-surface border border-border rounded-card shadow-card space-y-0.5"
        >
          <MenuItem
            icon={
              <span className="text-[11px] font-bold leading-5 text-center">
                CC
              </span>
            }
            label={
              speechEnabled ? "Stop my captions" : "Captions for my speech"
            }
            active={speechEnabled}
            onClick={pick(toggleSpeech)}
          />
          {screenShareSupported && (
            <MenuItem
              icon={
                isScreenSharing ? (
                  <ScreenShareOff className="w-5 h-5" />
                ) : (
                  <ScreenShare className="w-5 h-5" />
                )
              }
              label={isScreenSharing ? "Stop sharing screen" : "Share screen"}
              active={isScreenSharing}
              disabled={!!remoteScreenStream && !isScreenSharing}
              hint={
                remoteScreenStream && !isScreenSharing
                  ? "The other person is sharing their screen"
                  : undefined
              }
              onClick={pick(toggleScreenShare)}
            />
          )}
          <MenuItem
            icon={<Hand className="w-5 h-5" />}
            label="Low-data mode (hands only)"
            active={skeletonMode}
            onClick={pick(toggleSkeleton)}
            hint="Send only your hand movements instead of video"
          />
          {canSwitchCamera && (
            <MenuItem
              icon={<RefreshCw className="w-5 h-5" />}
              label="Switch camera"
              disabled={!cameraEnabled}
              onClick={pick(switchCamera)}
            />
          )}
        </div>
      )}

      <button
        onClick={toggleMic}
        className={`${btn} ${micEnabled ? "bg-muted text-text-primary" : "bg-danger text-white"}`}
        title={micEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {micEnabled ? (
          <Mic className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </button>

      <button
        onClick={toggleCamera}
        className={`${btn} ${cameraEnabled ? "bg-muted text-text-primary" : "bg-danger text-white"}`}
        title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {cameraEnabled ? (
          <Video className="w-5 h-5" />
        ) : (
          <VideoOff className="w-5 h-5" />
        )}
      </button>

      <button
        onClick={toggleChat}
        className={`${btn} relative ${isChatOpen ? "bg-primary text-white" : "bg-muted text-text-primary"}`}
        title="Chat"
      >
        <MessageSquare className="w-5 h-5" />
        {unreadCount > 0 && !isChatOpen && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <button
        onClick={toggleTranslation}
        className={`${btn} ${translationEnabled ? "bg-primary text-white" : "bg-muted text-text-primary"}`}
        title={
          translationEnabled
            ? "Stop translating my signs"
            : "Translate my signs for the other person"
        }
      >
        <Type className="w-5 h-5" />
      </button>

      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={`${btn} relative ${menuOpen ? "bg-primary text-white" : "bg-muted text-text-primary"}`}
        title="More options"
      >
        <span className="flex items-center justify-center gap-[3px] w-5 h-5">
          <span className="w-1 h-1 rounded-full bg-current" />
          <span className="w-1 h-1 rounded-full bg-current" />
          <span className="w-1 h-1 rounded-full bg-current" />
        </span>
        {moreActive && !menuOpen && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface" />
        )}
      </button>

      <div className="w-px h-8 bg-border" />

      <button
        onClick={onEndCall}
        data-pointer-confirm
        className={`${btn} bg-danger text-white hover:bg-danger/90`}
        title="End call"
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    </div>
  );
};
