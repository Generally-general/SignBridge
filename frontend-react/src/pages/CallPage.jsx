import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { CallContext } from "../context/CallContextInstance";

import { VideoFrame } from "../components/video/VideoFrame";
import { SkeletonCanvas } from "../components/video/SkeletonCanvas";
import { TranslationOverlay } from "../components/video/TranslationOverlay";
import { NetworkSuggestion } from "../components/video/NetworkSuggestion";
import { ControlBar } from "../components/video/ControlBar";
import { CaptionsOverlay } from "../components/video/CaptionsOverlay";
import { SpeechStatus } from "../components/video/SpeechStatus";
import { Logo } from "../components/ui/Logo";
import { ChatToast } from "../components/video/ChatToast";
import { SpatialTouchDebugHud } from "../components/video/SpatialTouchDebugHud";
import { SpeechConsentModal } from "../components/video/SpeechConsentModal";
import { CallSidePanel } from "../components/video/CallSidePanel";
import { CallTimer } from "../components/video/CallTimer";
import { useSignDetection } from "../hooks/useSignDetection";
import { usePoseDetection } from "../hooks/usePoseDetection";
import { useFaceDetection } from "../hooks/useFaceDetection";
import { useSpatialTouch } from "../hooks/useSpatialTouch";
import { usePointerMode } from "../hooks/usePointerMode";
import { usePointerPrefs } from "../hooks/usePointerPrefs";
import { usePictureInPicture } from "../hooks/usePictureInPicture";
import { PointerOverlay } from "../components/video/PointerOverlay";
import { ReactionTray } from "../components/video/ReactionTray";
import { TouchEffects } from "../components/video/TouchEffects";
import {
  SPATIAL_TOUCH_CONFIG,
  isSpatialDebugEnabled,
} from "../utils/spatialTouchConfig";
import { Maximize2, Minimize2 } from "lucide-react";

const DRAG_THRESHOLD_PX = 6;
const PIP_MARGIN = 8;

export const CallPage = () => {
  const navigate = useNavigate();

  const {
    activeCall,
    localStream,
    remoteStream,
    remoteCameraEnabled,
    cameraEnabled,
    micEnabled,
    facingMode,
    endCall,
    isChatOpen,
    toggleChat,
    translationEnabled,
    broadcastLandmarks,
    remoteScreenStream,
    isScreenSharing,
    toggleScreenShare,
    skeletonMode,
    remoteSkeleton,
    sendSkeletonFrame,
    setSkeletonPose,
    setSkeletonFace,
    remoteSkelRef,
    skelStats,
    sendAttention,
  } = useContext(CallContext);

  const chatScrollRef = useRef(null);

  // ---- Spatial Touch (Air-Tap parked; pinch-scroll active) ----
  const stEventsRef = useRef([]);
  const stFramesRef = useRef([]);
  const stDebug = isSpatialDebugEnabled();
  const [stFeedback, setStFeedback] = useState(null);
  const stFeedbackTimer = useRef(null);
  const flashFeedback = (text, holdMs = 900) => {
    clearTimeout(stFeedbackTimer.current);
    setStFeedback(text);
    if (text && holdMs) {
      stFeedbackTimer.current = setTimeout(() => setStFeedback(null), holdMs);
    }
  };

  const spatialTouch = useSpatialTouch({
    onAirTap: () => {
      flashFeedback("👆 Air-Tap");
      toggleChat();
    },
    onPinchStart: () => flashFeedback("🤏 Pinch-scroll", 0),
    onPinchMove: (dragDeltaY) => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop +=
          dragDeltaY * SPATIAL_TOUCH_CONFIG.SCROLL_PIXELS_PER_UNIT;
      }
    },
    onPinchEnd: () => flashFeedback(null),
    onTelemetryEvent: stDebug
      ? (e) => {
          const buf = stEventsRef.current;
          buf.push(e);
          if (buf.length > 5000) buf.shift();
        }
      : undefined,
    onFrameSample: stDebug
      ? (s) => {
          const buf = stFramesRef.current;
          buf.push(s);
          if (buf.length > 20000) buf.shift();
        }
      : undefined,
  });

  const pointerPrefs = usePointerPrefs();
  const dragHandlerRef = useRef(null);
  const pointer = usePointerMode({
    enabled: pointerPrefs.enabled && cameraEnabled,
    dwell: pointerPrefs.dwell,
    mirror: facingMode === "user",
    onWave: () => {
      if (sendAttention()) flashFeedback("✋ Wave sent");
    },
    onDrag: (...args) => dragHandlerRef.current?.(...args),
  });
  const pointerActiveRef = useRef(false);
  pointerActiveRef.current = pointer.active;
  const pointerFrameRef = useRef(pointer.processFrame);
  pointerFrameRef.current = pointer.processFrame;

  // Hand tracking runs whenever the camera is on (Spatial Touch needs it).
  // Landmarks are only sent for translation when MY translation toggle is on.
  const translationEnabledRef = useRef(translationEnabled);
  translationEnabledRef.current = translationEnabled;
  const broadcastLandmarksRef = useRef(broadcastLandmarks);
  broadcastLandmarksRef.current = broadcastLandmarks;
  const gatedBroadcast = useCallback((landmarks, hands) => {
    if (translationEnabledRef.current && !pointerActiveRef.current)
      broadcastLandmarksRef.current?.(landmarks, hands);
  }, []);

  const sendSkeletonRef = useRef(sendSkeletonFrame);
  sendSkeletonRef.current = sendSkeletonFrame;
  const processFrameRef = useRef(spatialTouch.processFrame);
  processFrameRef.current = spatialTouch.processFrame;
  const onHandFrame = useCallback((points, meta) => {
    if (pointerActiveRef.current) {
      pointerFrameRef.current?.(points);
      processFrameRef.current?.(null, meta); // the old pinch-scroll rests while pointing
    } else {
      processFrameRef.current?.(points, meta);
    }
    sendSkeletonRef.current?.(meta?.hands ?? []);
  }, []);

  // Skeleton mode needs both hands; otherwise one is enough (Spatial Touch).
  useSignDetection(
    localStream,
    gatedBroadcast,
    cameraEnabled,
    onHandFrame,
    skeletonMode ? 2 : 1,
  );

  usePoseDetection(localStream, skeletonMode && cameraEnabled, setSkeletonPose);

  useFaceDetection(localStream, skeletonMode && cameraEnabled, setSkeletonFace);

  useEffect(() => {
    if (!activeCall) {
      navigate("/");
    }
  }, [activeCall, navigate]);

  // ---- Swap + drag for the small video ----
  const [swapped, setSwapped] = useState(false); // false: remote big, local small
  const [fitMode, setFitMode] = useState("cover");
  const [pipPos, setPipPos] = useState(null); // {x, y} px inside the stage; null = default corner
  const stageRef = useRef(null);
  const pipRef = useRef(null);
  const dragRef = useRef(null);

  const clampPos = useCallback((x, y) => {
    const stage = stageRef.current;
    const pip = pipRef.current;
    if (!stage || !pip) return { x, y };
    const maxX = Math.max(
      PIP_MARGIN,
      stage.clientWidth - pip.offsetWidth - PIP_MARGIN,
    );
    const maxY = Math.max(
      PIP_MARGIN,
      stage.clientHeight - pip.offsetHeight - PIP_MARGIN,
    );
    return {
      x: Math.min(Math.max(PIP_MARGIN, x), maxX),
      y: Math.min(Math.max(PIP_MARGIN, y), maxY),
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() =>
      setPipPos((p) => (p ? clampPos(p.x, p.y) : p)),
    );
    ro.observe(stage);
    return () => ro.disconnect();
  }, [clampPos, activeCall]);

  const onPipPointerDown = (e) => {
    const pip = pipRef.current;
    const stage = stageRef.current;
    if (!pip || !stage) return;
    const rect = pip.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left - stageRect.left,
      originY: rect.top - stageRect.top,
      moved: false,
    };
    try {
      pip.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPipPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    d.moved = true;
    setPipPos(clampPos(d.originX + dx, d.originY + dy));
  };

  const onPipPointerUp = (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    try {
      pipRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (d && !d.moved) setSwapped((s) => !s); // a tap swaps the two videos
  };

  const pipHandlers = {
    onPointerDown: onPipPointerDown,
    onPointerMove: onPipPointerMove,
    onPointerUp: onPipPointerUp,
    onPointerCancel: () => {
      dragRef.current = null;
    },
  };

  const handDrag = useRef(null);
  dragHandlerRef.current = (phase, x, y) => {
    const pip = pipRef.current;
    const stage = stageRef.current;
    if (phase === "tap") {
      setSwapped((s) => !s);
    } else if (phase === "start" && pip && stage) {
      const r = pip.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      handDrag.current = {
        sx: x,
        sy: y,
        ox: r.left - s.left,
        oy: r.top - s.top,
      };
    } else if (phase === "move" && handDrag.current) {
      const d = handDrag.current;
      setPipPos(clampPos(d.ox + x - d.sx, d.oy + y - d.sy));
    } else if (phase === "end") {
      handDrag.current = null;
    }
  };

  usePictureInPicture(
    !!remoteStream || !!remoteScreenStream,
    remoteScreenStream || remoteStream,
    localStream,
    cameraEnabled,
    endCall,
  );

  if (!activeCall) return null;

  const mainBox = "absolute inset-0 z-0";
  const pipBox =
    "absolute z-30 w-28 h-40 sm:w-56 sm:h-36 rounded-standard overflow-hidden border border-border shadow-card cursor-grab active:cursor-grabbing touch-none select-none " +
    (pipPos ? "" : "top-4 right-4 sm:top-6 sm:right-6");
  const pipStyle = pipPos ? { left: pipPos.x, top: pipPos.y } : undefined;

  const remoteIsPip = swapped;
  const localIsPip = !swapped;
  const screenMode = !!remoteScreenStream;
  const tileBox =
    "absolute z-30 right-3 w-24 h-16 sm:w-44 sm:h-28 rounded-standard overflow-hidden border border-border shadow-card";
  const remoteMovable = !screenMode && remoteIsPip;
  const localMovable = !screenMode && localIsPip;
  const mirrorLocal = facingMode === "user" ? "scale-x-[-1]" : "";

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-black overflow-hidden overscroll-none flex flex-col sm:flex-row">
      {/* Stage: videos, overlays and controls. Shrinks when the chat opens. */}
      <div
        ref={stageRef}
        className="relative flex-1 min-w-0 min-h-0 overflow-hidden"
      >
        {/* Remote video */}
        <div
          ref={remoteMovable ? pipRef : null}
          className={
            screenMode
              ? `${tileBox} top-3 sm:top-5`
              : remoteIsPip
                ? pipBox
                : mainBox
          }
          style={remoteMovable ? pipStyle : undefined}
          {...(remoteMovable ? pipHandlers : {})}
          {...(remoteMovable
            ? { "data-pointer-target": "", "data-pointer-drag": "" }
            : {})}
        >
          <VideoFrame
            stream={remoteStream}
            isLocal={false}
            objectFit={screenMode || remoteIsPip ? "cover" : fitMode}
            pipTarget={!screenMode}
            showPlaceholder={
              !remoteStream || !remoteCameraEnabled || remoteSkeleton
            }
            className="w-full h-full rounded-none"
          />
          {remoteSkeleton && (
            <div className="absolute inset-0 z-20">
              <SkeletonCanvas
                framesRef={remoteSkelRef}
                statsRef={skelStats}
                showStats={!remoteIsPip}
              />
            </div>
          )}
        </div>

        {/* Local video */}
        <div
          ref={localMovable ? pipRef : null}
          className={
            screenMode
              ? `${tileBox} top-[5.25rem] sm:top-[8.75rem]`
              : localIsPip
                ? pipBox
                : mainBox
          }
          style={localMovable ? pipStyle : undefined}
          {...(localMovable ? pipHandlers : {})}
          {...(localMovable
            ? { "data-pointer-target": "", "data-pointer-drag": "" }
            : {})}
        >
          <VideoFrame
            stream={localStream}
            isLocal={true}
            objectFit={screenMode || localIsPip ? "cover" : fitMode}
            muted={true}
            showPlaceholder={!cameraEnabled}
            className={`w-full h-full rounded-none ${mirrorLocal}`}
          />
          <div
            className={`absolute bg-surface/90 px-2 py-1 rounded-standard text-[10px] text-text-primary uppercase tracking-widest pointer-events-none ${
              screenMode || localIsPip
                ? "bottom-1.5 left-1.5"
                : "bottom-24 left-4"
            }`}
          >
            You {micEnabled ? "" : "(Muted)"}
          </div>
        </div>

        {/* The other person's shared screen fills the stage */}
        {screenMode && (
          <div className="absolute inset-0 z-[5] bg-black">
            <VideoFrame
              stream={remoteScreenStream}
              pipTarget
              objectFit="contain"
              className="w-full h-full rounded-none"
            />
            <div className="absolute bottom-24 left-4 bg-surface/90 px-2 py-1 rounded-standard text-[10px] text-text-primary uppercase tracking-widest pointer-events-none">
              {activeCall.contactName} is sharing their screen
            </div>
          </div>
        )}

        {isScreenSharing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-primary text-white px-3 py-1.5 rounded-full text-[12px] font-semibold shadow-card">
            You are sharing your screen
            <button onClick={toggleScreenShare} className="underline">
              Stop
            </button>
          </div>
        )}

        {/* Incoming translation (shown whenever the other person is sending it) */}
        <div className="absolute bottom-24 sm:bottom-28 left-0 right-0 z-20 flex flex-col items-center gap-2 px-4 pointer-events-none">
          <SpeechStatus />
          <CaptionsOverlay />
          <TranslationOverlay />
        </div>

        <ChatToast />

        <NetworkSuggestion />

        {/* Spatial Touch feedback + optional calibration panel */}
        {stFeedback && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-primary text-white text-[13px] font-semibold shadow-card pointer-events-none">
            {stFeedback}
          </div>
        )}
        <TouchEffects />
        <ReactionTray />
        <PointerOverlay pointer={pointer} />
        {stDebug && (
          <SpatialTouchDebugHud
            metricsRef={spatialTouch.metricsRef}
            eventsRef={stEventsRef}
            framesRef={stFramesRef}
          />
        )}

        {/* Call controls */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 max-w-full"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <ControlBar onEndCall={endCall} />
        </div>

        <button
          onClick={() =>
            setFitMode((m) => (m === "cover" ? "contain" : "cover"))
          }
          className="absolute top-20 left-4 sm:top-24 sm:left-6 z-10 flex items-center gap-1.5 bg-surface/90 border border-border px-2.5 py-1.5 rounded-standard text-[11px] text-text-primary"
          title="Switch between filling the screen and showing the whole frame"
        >
          {fitMode === "cover" ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
          {fitMode === "cover" ? "Show full frame" : "Fill screen"}
        </button>

        {/* Top info bar */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <div className="relative bg-surface/90 pl-9 pr-3 py-2 rounded-standard border border-border">
            <Logo
              variant="mark"
              height={18}
              alt=""
              className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-70"
            />
            <p className="text-text-primary font-medium text-[13px]">
              {activeCall.contactName}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-success text-[10px] uppercase font-bold tracking-tighter">
                Secure P2P
              </span>
              <span className="text-text-muted text-[10px]">·</span>
              <CallTimer />
            </div>
          </div>
        </div>
      </div>

      <SpeechConsentModal />

      {/* Chat: side column on desktop, bottom sheet on phones. The stage shrinks to fit. */}
      {isChatOpen && <CallSidePanel scrollRef={chatScrollRef} />}
    </div>
  );
};
