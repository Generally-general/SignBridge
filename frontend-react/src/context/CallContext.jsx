import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useContext,
} from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContextInstance";
import { CallContext } from "./CallContextInstance";
import { historyService } from "../services/historyService";
import { tokenStorage } from "../utils/tokenStorage";
import { callService } from "../services/callService";
import { callAlerts } from "../utils/callAlerts";
import { callMediaConstraints } from "../utils/devicePrefs";
import { encodeFrame, decodeFrame, isNewer } from "../utils/skeletonCodec";
import {
  ATTENTION_ACCEPT_GAP_MS,
  ATTENTION_COOLDOWN_MS,
  MAX_VISIBLE_REACTIONS,
  REACTIONS,
  REACTION_MIN_GAP_MS,
} from "../utils/touchEffects";
import {
  createSpeechRecognizer,
  SPEECH_LANGUAGES,
} from "../services/speech/speechRecognizer";

const UNAVAILABLE_TEXT = {
  offline: (name) =>
    `${name} is offline right now. They will see a missed call.`,
  busy: (name) => `${name} is on another call.`,
  "no-answer": (name) => `${name} did not answer.`,
  "not-a-contact": (name) => `${name} is not in your contacts.`,
  "calling-you": (name) => `${name} is calling you.`,
};

function getCameraSender(pc, screenSenders) {
  return pc
    ?.getTransceivers()
    .find(
      (t) =>
        t.receiver?.track?.kind === "video" &&
        !screenSenders.includes(t.sender),
    )?.sender;
}

const FALLBACK_ICE_SERVERS = (() => {
  const list = [
    { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
  ];
  const url = import.meta.env.VITE_TURN_URL;
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;
  if (url && username && credential) {
    list.push({
      urls: url
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean),
      username,
      credential,
    });
  }
  return list;
})();

const hasTurn = (servers) =>
  servers.some((s) =>
    [].concat(s.urls).some((u) => typeof u === "string" && /^turns?:/.test(u)),
  );

// Debug helpers (console only). Credentials are never logged.
const describeIceServers = (servers = []) =>
  servers.map((s) =>
    (Array.isArray(s.urls) ? s.urls : [s.urls])
      .map((u) => String(u).split("?")[0])
      .join(" | "),
  );

const maskAddr = (a) => {
  if (!a) return "?";
  if (a.includes(":")) return `v6:${a.split(":").slice(0, 2).join(":")}::`;
  const p = a.split(".");
  return p.length === 4 ? `v4:${p[0]}.${p[1]}.x.x` : "mdns/host";
};

export const CallProvider = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [translationText, setTranslationText] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isChatOpenRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatToast, setChatToast] = useState(null);
  const [translationFinal, setTranslationFinal] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [speechLang, setSpeechLang] = useState(
    () => localStorage.getItem("signbridge_speech_lang") || "en-IN",
  );
  const [speechStatus, setSpeechStatus] = useState("starting");
  const [speechError, setSpeechError] = useState("");
  const [mySpeechText, setMySpeechText] = useState("");
  const [captions, setCaptions] = useState({ finals: [], interim: "" });
  const [callTranscript, setCallTranscript] = useState([]);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [callNotice, setCallNotice] = useState(null);
  const [speechSupported] = useState(() =>
    createSpeechRecognizer("webspeech").isSupported(),
  );
  const [speechConsent, setSpeechConsent] = useState(
    () => localStorage.getItem("signbridge_speech_consent") === "yes",
  );
  const [speechAutoStart, setSpeechAutoStart] = useState(
    () => localStorage.getItem("signbridge_speech_auto") === "1",
  );
  const [speechConsentPrompt, setSpeechConsentPrompt] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [remoteCameraEnabled, setRemoteCameraEnabled] = useState(true);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);

  const socket = useRef(null);
  const peerConnection = useRef(null);
  const pendingOffer = useRef(null);
  const iceQueue = useRef([]);
  const earlyIce = useRef({});
  const remoteCandidateStats = useRef({});
  const acquiredStreams = useRef(new Set());
  const resetCallStateRef = useRef(null);
  const callConnectedRef = useRef(false);
  const connectionLostTimer = useRef(null);
  const iceRestarts = useRef(0);
  const iceRestartTimer = useRef(null);
  const screenStreamRef = useRef(null);
  const screenSenders = useRef([]);
  const [skeletonMode, setSkeletonMode] = useState(false);
  const [remoteSkeleton, setRemoteSkeleton] = useState(false);
  const skeletonModeRef = useRef(false);
  const skelFrames = useRef(null);
  const skelCtrl = useRef(null);
  const touchCh = useRef(null);
  const touchSeq = useRef(0);
  const touchTimes = useRef({ react: 0, wave: 0, gotWave: 0 });
  const [reactions, setReactions] = useState([]); // { id, emoji, own }
  const [attention, setAttention] = useState(null); // { id } while the other person's wave shows
  const skelSeq = useRef(0);
  const skelLastSentAt = useRef(0);
  const skelLastEmpty = useRef(false);
  const skelAspect = useRef(4 / 3);
  const remoteSkelRef = useRef({
    hands: [],
    at: 0,
    seq: -1,
    ar: 4 / 3,
    pose: null,
    poseAt: 0,
    face: null,
    faceAt: 0,
  });
  const skelPose = useRef({ points: null, fresh: false }); // my newest body pose, not yet sent
  const skelFace = useRef({ points: null, fresh: false }); // my newest face, not yet sent
  const skelStats = useRef({
    sentBytes: 0,
    sentFrames: 0,
    recvBytes: 0,
    recvFrames: 0,
  });
  const remoteScreenIdRef = useRef(null);
  const remoteCameraIdRef = useRef(null);
  const needsRenegotiate = useRef(false);
  const negotiateRef = useRef(null);
  const stopScreenShareRef = useRef(null);

  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  const activeCallRef = useRef(activeCall);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const iceCache = useRef({ list: null, at: 0 });
  const getIceServers = useCallback(async () => {
    const cached = iceCache.current;
    if (cached.list && Date.now() - cached.at < 3 * 60 * 60 * 1000) {
      return cached.list;
    }
    const s = socket.current;
    if (s?.connected) {
      try {
        const res = await new Promise((resolve, reject) =>
          s
            .timeout(4000)
            .emit("get-ice-servers", (err, data) =>
              err ? reject(err) : resolve(data),
            ),
        );
        if (Array.isArray(res?.iceServers) && res.iceServers.length > 0) {
          const list =
            !hasTurn(res.iceServers) && hasTurn(FALLBACK_ICE_SERVERS)
              ? FALLBACK_ICE_SERVERS
              : res.iceServers;
          iceCache.current = { list, at: Date.now() };
          return list;
        }
      } catch (e) {
        console.warn(
          "Could not get ICE servers, using the fallback:",
          e.message,
        );
      }
    }
    return FALLBACK_ICE_SERVERS;
  }, []);

  const pendingSaves = useRef(new Set());
  const trackSave = useCallback((promise) => {
    pendingSaves.current.add(promise);
    promise.finally(() => pendingSaves.current.delete(promise));
    return promise;
  }, []);
  const waitForHistorySaves = useCallback(
    () => Promise.allSettled([...pendingSaves.current]),
    [],
  );

  const transcriptSeq = useRef(0);
  const addTranscript = useCallback((speaker, source, text) => {
    const clean = String(text || "").trim();
    if (!clean) return;
    transcriptSeq.current += 1;
    const entry = {
      id: transcriptSeq.current,
      speaker,
      source,
      text: clean,
      at: Date.now(),
    };
    setCallTranscript((prev) => [...prev, entry].slice(-500));
  }, []);

  const showNotice = useCallback((text, type = "info") => {
    setCallNotice({ id: Date.now(), text, type });
  }, []);
  const dismissCallNotice = useCallback(() => setCallNotice(null), []);

  // Which of these contact ids are online right now (the server only answers for your own contacts).
  const queryPresence = useCallback(
    (userIds) =>
      new Promise((resolve) => {
        const s = socket.current;
        if (!s?.connected || !userIds?.length) return resolve([]);
        s.timeout(3000).emit("presence-query", { userIds }, (err, res) =>
          resolve(err ? [] : res?.online || []),
        );
      }),
    [],
  );

  const trackStream = useCallback((s) => {
    acquiredStreams.current.add(s);
    return s;
  }, []);

  const stopAllMedia = useCallback((reason) => {
    // Senders first: covers tracks the PC still holds even if state lost them.
    peerConnection.current?.getSenders().forEach((sender) => {
      if (sender.track)
        acquiredStreams.current.add(new MediaStream([sender.track]));
    });
    let stopped = 0;
    acquiredStreams.current.forEach((s) =>
      s.getTracks().forEach((t) => {
        if (t.readyState !== "ended") {
          t.stop();
          stopped += 1;
          console.log(`📷 Stopped ${t.kind} track "${t.label}" (${reason})`);
        }
      }),
    );
    acquiredStreams.current.clear();
    console.log(`📷 stopAllMedia(${reason}): ${stopped} live track(s) stopped`);
  }, []);

  const resetCallState = useCallback(
    (shouldEmit = false) => {
      if (shouldEmit && activeCall?.roomId) {
        socket.current.emit("end-call", { roomId: activeCall.roomId });

        callService
          .end(activeCall.roomId)
          .catch((e) => console.warn("Call record (end) failed:", e.message));
      }
      if (localStream) {
        acquiredStreams.current.add(localStream);
      }
      stopAllMedia(shouldEmit ? "local hangup" : "peer hangup");
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      activeCallRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(null);
      setRemoteCameraEnabled(true);
      screenStreamRef.current = null;
      screenSenders.current = [];
      remoteScreenIdRef.current = null;
      remoteCameraIdRef.current = null;
      needsRenegotiate.current = false;
      skelFrames.current = null;
      skelCtrl.current = null;
      touchCh.current = null;
      touchTimes.current = { react: 0, wave: 0, gotWave: 0 };
      setReactions([]);
      setAttention(null);
      skeletonModeRef.current = false;
      skelLastEmpty.current = false;
      remoteSkelRef.current = {
        hands: [],
        at: 0,
        seq: -1,
        ar: 4 / 3,
        pose: null,
        poseAt: 0,
        face: null,
        faceAt: 0,
      };
      skelPose.current = { points: null, fresh: false };
      skelFace.current = { points: null, fresh: false };
      skelStats.current = {
        sentBytes: 0,
        sentFrames: 0,
        recvBytes: 0,
        recvFrames: 0,
      };
      setSkeletonMode(false);
      setRemoteSkeleton(false);
      setScreenStream(null);
      setRemoteScreenStream(null);
      setCameraEnabled(true);
      setMicEnabled(true);
      setIsChatOpen(false);
      setUnreadCount(0);
      setChatToast(null);
      setCallTranscript([]);
      setCallStartedAt(null);
      callConnectedRef.current = false;
      clearTimeout(connectionLostTimer.current);
      clearTimeout(iceRestartTimer.current);
      iceRestarts.current = 0;
      setFacingMode("user");
      setSpeechEnabled(false);
      setSpeechError("");
      setMySpeechText("");
      setCaptions({ finals: [], interim: "" });
      setTranslationText("");
      setChatMessages([]);
      iceQueue.current = [];
      earlyIce.current = [];
      pendingOffer.current = null;
      navigate("/");
    },
    [localStream, activeCall, navigate, stopAllMedia],
  );

  useEffect(() => {
    resetCallStateRef.current = resetCallState;
  }, [resetCallState]);

  useEffect(() => () => stopAllMedia("provider unmount"), [stopAllMedia]);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isMobileDevice =
      /Android|iPhone|iPad|iPod/i.test(ua) ||
      (navigator.maxTouchPoints > 1 && /Mac/i.test(navigator.platform || ""));
    console.log(
      `📷 camera switch offered: ${!!localStream && isMobileDevice} (mobile=${isMobileDevice})`,
    );
    setCanSwitchCamera(!!localStream && isMobileDevice);
  }, [localStream]);

  const switchCamera = useCallback(async () => {
    if (!localStream || !cameraEnabled) return;
    const nextFacing = facingMode === "user" ? "environment" : "user";

    // Phones usually can't open two cameras at once: release the current one first.
    localStream.getVideoTracks().forEach((t) => t.stop());

    const open = (facing) =>
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
      });

    let newStream;
    let usedFacing = nextFacing;
    try {
      newStream = await open(nextFacing);
    } catch (err) {
      console.warn("Camera switch failed, restoring previous camera:", err);
      usedFacing = facingMode;
      try {
        newStream = await open(facingMode);
      } catch (err2) {
        console.error("Could not reopen the camera:", err2);
        setCameraEnabled(false);
        socket.current?.emit("camera-status", {
          roomId: activeCall?.roomId,
          enabled: false,
        });
        return;
      }
    }

    const newVideoTrack = newStream.getVideoTracks()[0];
    const reported = newVideoTrack.getSettings?.().facingMode;
    if (reported === "user" || reported === "environment")
      usedFacing = reported;
    const updatedStream = new MediaStream([
      newVideoTrack,
      ...localStream.getAudioTracks(),
    ]);
    trackStream(newStream);
    trackStream(updatedStream);
    setLocalStream(updatedStream);
    setFacingMode(usedFacing);

    const sender = getCameraSender(
      peerConnection.current,
      screenSenders.current,
    );
    if (sender) {
      await sender.replaceTrack(newVideoTrack);
    }
  }, [localStream, cameraEnabled, facingMode, activeCall, trackStream]);

  const speechActive =
    speechEnabled && micEnabled && !!remoteStream && !!activeCall?.roomId;
  const speechRoomId = activeCall?.roomId;

  useEffect(() => {
    if (!speechActive) return undefined;

    const recognizer = createSpeechRecognizer("webspeech");
    let lastInterimSentAt = 0;
    const send = (text, final) =>
      socket.current?.emit("speech-caption", {
        roomId: speechRoomId,
        text,
        final,
        lang: speechLang,
      });

    recognizer.start({
      lang: speechLang,
      onInterim: (text) => {
        setMySpeechText(text);
        const now = Date.now();
        if (now - lastInterimSentAt >= 150) {
          lastInterimSentAt = now;
          send(text, false);
        }
      },
      onFinal: (text) => {
        setMySpeechText("");
        send(text, true);
        addTranscript("ME", "SPEECH", text);
        if (user?.id) {
          trackSave(
            historyService.saveHistory(
              user.id,
              text,
              speechRoomId,
              activeCallRef.current?.contactName,
              { source: "SPEECH", speaker: "ME" },
            ),
          );
        }
      },
      onStatus: (s) => {
        if (s !== "stopped") setSpeechStatus(s);
      },
      onError: (err) => {
        console.warn("Speech recognition:", err.code, err.message);
        if (err.fatal) {
          setSpeechError(err.message);
          setSpeechEnabled(false);
        }
      },
    });

    return () => {
      recognizer.destroy();
      setMySpeechText("");
    };
  }, [
    speechActive,
    speechRoomId,
    speechLang,
    user?.id,
    addTranscript,
    trackSave,
  ]);

  const speechUiStatus = !speechEnabled
    ? "off"
    : !micEnabled
      ? "paused"
      : !remoteStream
        ? "waiting"
        : speechStatus;

  const toggleSpeech = useCallback(() => {
    setSpeechError("");
    if (speechEnabled) {
      setSpeechEnabled(false);
      return;
    }
    if (!speechSupported) {
      setSpeechError(
        "Speech-to-text isn't supported in this browser. Use Chrome or Edge.",
      );
      return;
    }
    if (!speechConsent) {
      setSpeechConsentPrompt(true); // in-app dialog; asked again every time until allowed
      return;
    }
    setSpeechEnabled(true);
  }, [speechEnabled, speechSupported, speechConsent]);

  // Answer from the in-call consent dialog. "Not now" is never remembered.
  const answerSpeechConsent = useCallback((allow) => {
    setSpeechConsentPrompt(false);
    if (!allow) return;
    localStorage.setItem("signbridge_speech_consent", "yes");
    setSpeechConsent(true);
    setSpeechError("");
    setSpeechEnabled(true);
  }, []);

  // Used by the Settings page.
  const updateSpeechConsent = useCallback((allow) => {
    if (allow) {
      localStorage.setItem("signbridge_speech_consent", "yes");
      setSpeechConsent(true);
      return;
    }
    localStorage.removeItem("signbridge_speech_consent");
    localStorage.removeItem("signbridge_speech_auto");
    setSpeechConsent(false);
    setSpeechAutoStart(false);
    setSpeechEnabled(false);
  }, []);

  const updateSpeechAutoStart = useCallback(
    (on) => {
      if (on && !speechConsent) return;
      if (on) localStorage.setItem("signbridge_speech_auto", "1");
      else localStorage.removeItem("signbridge_speech_auto");
      setSpeechAutoStart(on);
    },
    [speechConsent],
  );

  useEffect(() => {
    if (
      activeCall?.roomId &&
      speechAutoStart &&
      speechConsent &&
      speechSupported
    ) {
      setSpeechEnabled(true);
    }
  }, [activeCall?.roomId, speechAutoStart, speechConsent, speechSupported]);

  const changeSpeechLang = useCallback((code) => {
    if (!SPEECH_LANGUAGES.some((l) => l.code === code)) return;
    setSpeechLang(code);
    localStorage.setItem("signbridge_speech_lang", code);
  }, []);

  const toggleMic = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleTranslation = useCallback(() => {
    setTranslationEnabled((prev) => !prev);
  }, []);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
    setUnreadCount(0);
    setChatToast(null);
  }, []);

  const dismissChatToast = useCallback(() => setChatToast(null), []);

  const setupPeerConnection = useCallback(
    async (stream) => {
      console.log("🛠️ Setting up PeerConnection with stream:", stream?.id);
      remoteCandidateStats.current = {};
      const forceRelay = (() => {
        try {
          return localStorage.getItem("sb_force_relay") === "1";
        } catch {
          return false;
        }
      })();
      const iceList = iceCache.current.list || FALLBACK_ICE_SERVERS;
      peerConnection.current = new RTCPeerConnection({
        iceServers: iceList,
        ...(forceRelay ? { iceTransportPolicy: "relay" } : {}),
      });
      const t0 = performance.now();
      const ts = () => `+${((performance.now() - t0) / 1000).toFixed(1)}s`;
      const localCands = {};
      console.log(
        `🧭 ICE servers (${iceCache.current.list ? "from signaling" : "FALLBACK"}), TURN present: ${hasTurn(iceList)}, policy: ${forceRelay ? "relay" : "all"}: ` +
          JSON.stringify(describeIceServers(iceList)),
      );

      {
        const pc0 = peerConnection.current;
        const frames = pc0.createDataChannel("skeleton", {
          negotiated: true,
          id: 1,
          ordered: false,
          maxRetransmits: 0,
        });
        frames.binaryType = "arraybuffer";
        frames.onmessage = (e) => {
          const frame = decodeFrame(e.data);
          if (!frame) return;
          const s = skelStats.current;
          s.recvBytes += e.data.byteLength;
          s.recvFrames += 1;
          if (!isNewer(frame.seq, remoteSkelRef.current.seq)) return;
          const nowMs = performance.now();
          remoteSkelRef.current = {
            ...remoteSkelRef.current,
            hands: frame.hands,
            seq: frame.seq,
            at: nowMs,
            ...(frame.pose ? { pose: frame.pose, poseAt: nowMs } : {}),
            ...(frame.face ? { face: frame.face, faceAt: nowMs } : {}),
          };
        };
        const ctrl = pc0.createDataChannel("skeleton-ctrl", {
          negotiated: true,
          id: 2,
        });
        ctrl.onmessage = (e) => {
          try {
            const m = JSON.parse(e.data);
            if (m?.t !== "skeleton") return;
            const on = m.on === true;
            remoteSkelRef.current = {
              hands: [],
              at: 0,
              seq: -1,
              pose: null,
              poseAt: 0,
              face: null,
              faceAt: 0,
              ar: Number(m.ar) > 0.2 && Number(m.ar) < 5 ? Number(m.ar) : 4 / 3,
            };
            setRemoteSkeleton(on);
          } catch {
            /* ignore malformed control messages */
          }
        };
        ctrl.onopen = () => {
          if (skeletonModeRef.current) {
            ctrl.send(
              JSON.stringify({
                t: "skeleton",
                on: true,
                ar: skelAspect.current,
              }),
            );
          }
        };
        skelFrames.current = frames;
        skelCtrl.current = ctrl;
        const touch = pc0.createDataChannel("touch", {
          negotiated: true,
          id: 3,
        });
        touch.onmessage = (e) => {
          try {
            const m = JSON.parse(e.data);
            if (m?.t === "reaction" && REACTIONS.includes(m.e)) {
              const id = ++touchSeq.current;
              setReactions((list) => [
                ...list.slice(-(MAX_VISIBLE_REACTIONS - 1)),
                { id, emoji: m.e, own: false },
              ]);
            } else if (m?.t === "attention") {
              const now = performance.now();
              if (now - touchTimes.current.gotWave < ATTENTION_ACCEPT_GAP_MS)
                return;
              touchTimes.current.gotWave = now;
              setAttention({ id: ++touchSeq.current });
            }
          } catch {
            /* ignore malformed messages */
          }
        };
        touchCh.current = touch;
      }

      if (stream) {
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });
      }

      peerConnection.current.ontrack = (event) => {
        const stream = event.streams[0];
        if (!stream) return;

        const isScreen =
          stream.id === remoteScreenIdRef.current ||
          (remoteCameraIdRef.current &&
            stream.id !== remoteCameraIdRef.current);
        if (isScreen) {
          setRemoteScreenStream(stream);
          return;
        }
        remoteCameraIdRef.current = stream.id;

        const videoTrack = stream.getVideoTracks()[0];

        if (videoTrack) {
          videoTrack.onended = () => {
            console.log("📴 Remote video stopped");

            setRemoteStream(null);
          };
        }

        setRemoteStream(stream);
      };

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          const c = event.candidate;
          const k = `${c.type}/${c.protocol}${c.relayProtocol ? "(" + c.relayProtocol + ")" : ""}`;
          localCands[k] = (localCands[k] || 0) + 1;
          console.log(
            `📡 ${ts()} local candidate ${k} ${maskAddr(c.address)} url=${c.url || "-"}`,
          );
          if (!activeCallRef.current?.roomId) {
            console.warn(
              `⚠️ ${ts()} candidate NOT sent: no active call roomId yet`,
            );
          }
        } else {
          console.log(
            `🏁 ${ts()} gathering done: ${JSON.stringify(localCands)}`,
          );
        }
        const currentCall = activeCallRef.current;
        if (event.candidate && currentCall?.roomId) {
          console.log(
            `📡 Sending ICE Candidate to Peer (type: ${event.candidate.type || "unknown"}, proto: ${event.candidate.protocol || "?"}${event.candidate.relayProtocol ? ", relay via " + event.candidate.relayProtocol : ""})`,
          );
          const s = socket.current;
          if (!s) {
            console.warn(
              "⚠️ ICE candidate not sent: the signaling socket is gone (logged out, token expired or reconnecting)",
            );
            return;
          }
          s.emit("ice-candidate", {
            roomId: currentCall.roomId,
            toUserId: currentCall.id,
            candidate: event.candidate,
          });
        } else if (!event.candidate) {
          console.log("📡 ICE candidate gathering complete");
        }
      };

      peerConnection.current.onconnectionstatechange = () => {
        const connState = peerConnection.current.connectionState;
        console.log(`🕸️ ${ts()} Connection State:`, connState);
        if (connState === "connected") {
          callConnectedRef.current = true;
          setCallStartedAt((t) => t ?? Date.now());
          iceRestarts.current = 0;
          clearTimeout(iceRestartTimer.current);
        }

        clearTimeout(connectionLostTimer.current);
        if (connState === "disconnected" || connState === "failed") {
          const pc = peerConnection.current;
          // Only the caller restarts ICE, so both sides never send offers at once.
          const canRestart =
            callConnectedRef.current &&
            !!pc &&
            typeof pc.restartIce === "function" &&
            !activeCallRef.current?.isIncoming &&
            iceRestarts.current < 3;

          if (canRestart) {
            clearTimeout(iceRestartTimer.current);
            iceRestartTimer.current = setTimeout(
              () => {
                const p = peerConnection.current;
                if (!p || p.connectionState === "connected") return;
                iceRestarts.current += 1;
                console.warn(`🔁 ICE restart #${iceRestarts.current}`);
                showNotice(
                  "Connection unstable, trying to reconnect…",
                  "warning",
                );
                p.restartIce();
                negotiateRef.current?.();
              },
              connState === "failed" ? 0 : 4000, // "disconnected" often heals itself
            );
          }

          connectionLostTimer.current = setTimeout(
            () => {
              if (
                !activeCallRef.current ||
                peerConnection.current?.connectionState === "connected"
              )
                return;
              showNotice(
                "The connection was lost, so the call ended.",
                "warning",
              );
              resetCallStateRef.current?.(true);
            },
            connState === "failed" ? 15000 : 20000,
          );
        }

        if (connState === "failed") {
          console.error(
            "❌ WebRTC connection failed — the ICE/TURN path between the two " +
              "peers could not be established. Check above for whether any ICE " +
              "candidate of type 'relay' was gathered; if none appear, TURN " +
              "isn't reachable or credentials are wrong.",
          );
        }
      };

      peerConnection.current.oniceconnectionstatechange = () => {
        console.log(
          `🧊 ${ts()} ICE Connection State:`,
          peerConnection.current.iceConnectionState,
        );
      };

      const pc = peerConnection.current;

      pc.onicecandidateerror = (e) => {
        const fatal = e.errorCode >= 300 && e.errorCode < 700;
        (fatal ? console.error : console.debug)(
          `🚫 ICE candidate error: code=${e.errorCode} text="${e.errorText}" url=${e.url}`,
        );
      };

      pc.onicegatheringstatechange = () => {
        console.log("🧊 ICE Gathering State:", pc.iceGatheringState);
      };

      pc.addEventListener("track", (e) => {
        console.log(`🎞️ ontrack: kind=${e.track.kind} muted=${e.track.muted}`);
      });

      const dumpIceDiagnostics = async (reason) => {
        try {
          const stats = await pc.getStats();
          const byId = {};
          stats.forEach((r) => (byId[r.id] = r));
          const cand = (id) => {
            const c = byId[id];
            return c
              ? `${c.candidateType}/${c.protocol}${c.relayProtocol ? "(" + c.relayProtocol + ")" : ""} ${maskAddr(c.address || c.ip)}`
              : "?";
          };
          const pairs = [];
          let transport = null;
          stats.forEach((r) => {
            if (r.type === "candidate-pair") {
              pairs.push(
                `${cand(r.localCandidateId)} -> ${cand(r.remoteCandidateId)} state=${r.state} nominated=${r.nominated} ` +
                  `reqSent=${r.requestsSent} reqRecv=${r.requestsReceived} respRecv=${r.responsesReceived} ` +
                  `respSent=${r.responsesSent} consent=${r.consentRequestsSent} sent=${r.bytesSent} recv=${r.bytesReceived} rtt=${r.currentRoundTripTime ?? "-"}`,
              );
            }
            if (r.type === "transport") transport = r;
          });
          console.warn(
            `🔬 ${ts()} ICE diagnostics (${reason}) ` +
              JSON.stringify({
                ice: pc.iceConnectionState,
                conn: pc.connectionState,
                gathering: pc.iceGatheringState,
                signaling: pc.signalingState,
                transport: transport && {
                  ice: transport.iceState,
                  dtls: transport.dtlsState,
                  selectedPair: transport.selectedCandidatePairId || null,
                },
                local: localCands,
                remote: remoteCandidateStats.current,
                pairCount: pairs.length,
              }),
          );
          console.warn(
            "🔬 pairs:\n" + (pairs.length ? pairs.join("\n") : "(none)"),
          );
        } catch (e) {
          console.warn("🔬 diagnostics failed:", e.message);
        }
      };

      const slowTimer = setTimeout(() => {
        if (!["connected", "closed"].includes(pc.connectionState)) {
          dumpIceDiagnostics("not connected after 8s");
        }
      }, 8000);
      pc.addEventListener("connectionstatechange", () => {
        if (["connected", "closed", "failed"].includes(pc.connectionState)) {
          clearTimeout(slowTimer);
        }
      });

      pc.addEventListener("iceconnectionstatechange", () => {
        if (["disconnected", "failed"].includes(pc.iceConnectionState)) {
          dumpIceDiagnostics(pc.iceConnectionState);
        }
      });

      pc.addEventListener("connectionstatechange", async () => {
        if (pc.connectionState !== "connected") return;
        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type === "transport" && report.selectedCandidatePairId) {
            const pair = stats.get(report.selectedCandidatePairId);
            const local = stats.get(pair?.localCandidateId);
            const remote = stats.get(pair?.remoteCandidateId);
            console.log(
              `✅ Selected ICE pair: local=${local?.candidateType} remote=${remote?.candidateType} protocol=${local?.protocol}`,
            );
          }
        });
      });
    },
    [activeCall, resetCallState],
  );

  const toggleCamera = useCallback(async () => {
    if (cameraEnabled) {
      const videoTrack = localStream?.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.stop();
      }

      const sender = getCameraSender(
        peerConnection.current,
        screenSenders.current,
      );

      if (sender) {
        await sender.replaceTrack(null);
      }

      setCameraEnabled(false);

      socket.current.emit("camera-status", {
        roomId: activeCall?.roomId,
        enabled: false,
      });
    } else {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Merge with existing audio
      const updatedStream = new MediaStream([
        newVideoTrack,
        ...localStream.getAudioTracks(),
      ]);

      trackStream(newStream);
      trackStream(updatedStream);
      setLocalStream(updatedStream);

      const sender = getCameraSender(
        peerConnection.current,
        screenSenders.current,
      );

      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      setCameraEnabled(true);

      socket.current.emit("camera-status", {
        roomId: activeCall.roomId,
        enabled: true,
      });
    }
  }, [localStream, cameraEnabled, activeCall, trackStream, facingMode]);

  const negotiate = useCallback(async () => {
    const pc = peerConnection.current;
    const call = activeCallRef.current;
    if (!pc || !call?.roomId) return;
    if (pc.signalingState !== "stable") {
      needsRenegotiate.current = true; // sent as soon as the current exchange ends
      return;
    }
    const offer = await pc.createOffer();
    if (pc.signalingState !== "stable") {
      needsRenegotiate.current = true;
      return;
    }
    await pc.setLocalDescription(offer);
    socket.current?.emit("offer", {
      roomId: call.roomId,
      toUserId: call.id,
      offer,
    });
  }, []);

  useEffect(() => {
    negotiateRef.current = negotiate;
  }, [negotiate]);

  const stopScreenShare = useCallback(async () => {
    const stream = screenStreamRef.current;
    if (!stream) return;
    screenStreamRef.current = null;
    stream.getTracks().forEach((t) => t.stop());
    setScreenStream(null);

    const pc = peerConnection.current;
    if (pc && pc.signalingState !== "closed") {
      screenSenders.current.forEach((s) => {
        try {
          pc.removeTrack(s);
        } catch {
          /* already removed */
        }
      });
    }
    screenSenders.current = [];

    const roomId = activeCallRef.current?.roomId;
    if (roomId && pc) {
      socket.current?.emit("screen-share-status", { roomId, enabled: false });
      try {
        await negotiate();
      } catch (e) {
        console.warn("Screen share stop: renegotiation failed:", e);
      }
    }
  }, [negotiate]);

  useEffect(() => {
    stopScreenShareRef.current = stopScreenShare;
  }, [stopScreenShare]);

  const startScreenShare = useCallback(async () => {
    const pc = peerConnection.current;
    const roomId = activeCallRef.current?.roomId;
    if (!pc || !roomId || screenStreamRef.current) return;
    if (remoteScreenIdRef.current) {
      showNotice(
        `${activeCallRef.current?.contactName || "The other person"} is already sharing their screen.`,
      );
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      showNotice("Screen sharing is not supported in this browser.", "warning");
      return;
    }

    let display;
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        selfBrowserSurface: "exclude",
        suppressLocalAudioPlayback: true,
        systemAudio: "include",
      });
    } catch (err) {
      if (err?.name !== "NotAllowedError" && err?.name !== "AbortError") {
        showNotice("Could not start screen sharing.", "warning");
      }
      return;
    }

    const track = display.getVideoTracks()[0];
    if (!track || !activeCallRef.current) {
      display.getTracks().forEach((t) => t.stop());
      return;
    }
    track.contentHint = "detail"; // keep text sharp
    trackStream(display);
    screenStreamRef.current = display;
    setScreenStream(display);
    screenSenders.current = [pc.addTrack(track, display)];
    const audioTrack = display.getAudioTracks()[0];
    if (audioTrack) {
      screenSenders.current.push(pc.addTrack(audioTrack, display));
    } else {
      showNotice(
        "Sharing without sound. To include it, choose a tab and tick “Share tab audio”.",
        "info",
      );
    }
    // The browser's own "Stop sharing" bar ends the track.
    track.addEventListener("ended", () => stopScreenShareRef.current?.());

    socket.current?.emit("screen-share-status", {
      roomId,
      enabled: true,
      streamId: display.id,
    });
    try {
      await negotiate();
    } catch (e) {
      console.error("Screen share failed to start:", e);
      stopScreenShare();
      showNotice("Could not start screen sharing.", "warning");
    }
  }, [negotiate, stopScreenShare, showNotice, trackStream]);

  const toggleScreenShare = useCallback(() => {
    if (screenStreamRef.current) return stopScreenShare();
    return startScreenShare();
  }, [startScreenShare, stopScreenShare]);

  const screenShareSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getDisplayMedia;

  const addRemoteCandidate = useCallback(async (candidate) => {
    const pc = peerConnection.current;
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      const type =
        (candidate.candidate?.match(/ typ (\w+)/) || [])[1] || "unknown";
      remoteCandidateStats.current[type] =
        (remoteCandidateStats.current[type] || 0) + 1;
      const f = (candidate.candidate || "").split(" ");
      console.log(
        `📥 remote candidate ${type}/${f[2] || "?"} ${maskAddr(f[4])}`,
      );
    } catch (e) {
      console.error("ICE Error:", e, candidate?.candidate);
    }
  }, []);

  const flushIceQueue = useCallback(async () => {
    const pc = peerConnection.current;
    if (!pc || !pc.remoteDescription) return;
    const queued = iceQueue.current;
    iceQueue.current = [];
    console.log(`🧊 Applying ${queued.length} queued ICE candidate(s)`);
    for (const c of queued) {
      await addRemoteCandidate(c);
    }
  }, [addRemoteCandidate]);

  const handleOffer = useCallback(async (offerData) => {
    if (!peerConnection.current || !offerData) return;
    try {
      const pc = peerConnection.current;

      if (pc.signalingState === "have-local-offer") {
        if (!activeCallRef.current?.isIncoming) {
          console.warn("Ignoring a colliding offer");
          return;
        }
        await pc.setLocalDescription({ type: "rollback" });
        needsRenegotiate.current = true;
      }

      const sdp = offerData.offer ? offerData.offer : offerData;
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(sdp),
      );

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.current.emit("answer", {
        toUserId: activeCallRef.current?.id,
        roomId: activeCallRef.current?.roomId,
        answer,
      });

      for (const candidate of iceQueue.current) {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      }
      iceQueue.current = [];

      if (needsRenegotiate.current && pc.signalingState === "stable") {
        needsRenegotiate.current = false;
        await negotiateRef.current?.();
      }
    } catch (err) {
      console.error("Error handling offer:", err);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      console.warn("🔌 Signaling not started: no user in state");
      return;
    }
    const token = tokenStorage.getToken();
    if (!token) {
      console.warn("🔌 Signaling not started: no token in localStorage");
      return;
    }

    socket.current = io(import.meta.env.VITE_SIGNALING_WS_URL, {
      auth: { token },
    });

    socket.current.on("connect", () => {
      console.log("Connected to signaling with ID:", socket.current.id);
      getIceServers();

      // If we reconnect mid-call (e.g. phone screen lock, brief network drop),
      // the server has no record of this new socket being in the room -
      // rejoin so translation/ICE broadcasts reach us again.
      if (activeCallRef.current?.roomId) {
        console.log(
          "🔁 Rejoining call room after reconnect:",
          activeCallRef.current.roomId,
        );
        socket.current.emit("join-room", {
          roomId: activeCallRef.current.roomId,
        });
      }
    });

    socket.current.on(
      "incoming-call",
      async ({ fromId, fromName, roomId, offer }) => {
        console.log("🔔 Incoming call with offer from:", fromName);

        if (activeCallRef.current && activeCallRef.current.roomId !== roomId)
          return;

        pendingOffer.current = offer;

        iceQueue.current = [];
        console.log(`🧊 ${iceQueue.current.length} early ICE candidate(s) kept for ${roomId}`);
        earlyIce.current = {};
        const incomingCall = {
          id: fromId,
          contactName: fromName,
          roomId,
          isIncoming: true,
        };
        activeCallRef.current = incomingCall;
        setActiveCall(incomingCall);
      },
    );

    socket.current.on("offer", async (data) => {
      console.log("📦 Received WebRTC Offer");
      if (!peerConnection.current) {
        console.log("⏳ PC not ready, saving offer...");
        pendingOffer.current = data;
        return;
      }
      await handleOffer(data);
    });

    socket.current.on("answer", async (data) => {
      console.log("✅ Received WebRTC Answer");
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.answer),
          );
          await flushIceQueue();
          const pc = peerConnection.current;
          if (needsRenegotiate.current && pc?.signalingState === "stable") {
            needsRenegotiate.current = false;
            await negotiateRef.current?.();
          }
        } catch (err) {
          console.error("Error applying answer:", err);
        }
      }
    });

    socket.current.on("ice-candidate", async (data) => {
      const currentRoom = activeCallRef.current?.roomId;
      if (!currentRoom) {
        const list = (earlyIce.current[data.roomId] ||= []);
        if (list.length < 200) list.push(data.candidate);
        return;
      }
      if (data.roomId !== currentRoom) {
        console.log(
          `🧊 Ignoring ICE candidate for room ${data.roomId} (active: ${currentRoom})`,
        );
        return;
      }
      const pc = peerConnection.current;
      if (pc && pc.remoteDescription) {
        await addRemoteCandidate(data.candidate);
      } else {
        iceQueue.current.push(data.candidate);
      }
    });

    socket.current.on("camera-status", ({ enabled }) => {
      setRemoteCameraEnabled(enabled);

      console.log(`👤 Peer camera is now: ${enabled ? "ON" : "OFF"}`);
    });

    socket.current.on("screen-share-status", ({ enabled, streamId }) => {
      if (enabled) {
        remoteScreenIdRef.current = streamId || "pending";
      } else {
        remoteScreenIdRef.current = null;
        setRemoteScreenStream(null);
      }
    });

    socket.current.on("chat-message", (data) => {
      setChatMessages((prev) => [...prev, { ...data, isOwn: false }]);
      callAlerts.notifyMessage(
        activeCallRef.current?.contactName,
        data?.message,
      );
      if (!isChatOpenRef.current) {
        setUnreadCount((n) => n + 1);
        setChatToast({
          id: Date.now(),
          from: activeCallRef.current?.contactName || "New message",
          message: String(data?.message ?? ""),
        });
      }
    });

    let captionClearTimer = null;
    socket.current.on("speech-caption", (data) => {
      const currentRoom = activeCallRef.current?.roomId;
      if (!currentRoom || data?.roomId !== currentRoom) return;
      const text = (data?.text || "").trim();
      if (!text) return;
      if (data.final) {
        addTranscript("THEM", "SPEECH", text);
        if (user?.id) {
          trackSave(
            historyService.saveHistory(
              user.id,
              text,
              currentRoom,
              activeCallRef.current?.contactName,
              { source: "SPEECH", speaker: "THEM" },
            ),
          );
        }
      }
      setCaptions((prev) =>
        data.final
          ? { finals: [...prev.finals, text].slice(-3), interim: "" }
          : { ...prev, interim: text },
      );
      if (captionClearTimer) clearTimeout(captionClearTimer);
      captionClearTimer = setTimeout(
        () => setCaptions({ finals: [], interim: "" }),
        10000,
      );
    });

    socket.current.on("own-translation-result", (data) => {
      const text = data?.sentence || data?.word;
      const currentCall = activeCallRef.current;
      if (text) addTranscript("ME", "SIGN", text);
      if (text && user?.id && currentCall?.roomId) {
        trackSave(
          historyService.saveHistory(
            user.id,
            text,
            currentCall.roomId,
            currentCall.contactName,
            { source: "SIGN", speaker: "ME" },
          ),
        );
      }
    });

    let translationClearTimer = null;
    socket.current.on("translation-result", (data) => {
      console.log("📥 Received translation-result:", data);
      const text = data?.sentence || data?.word;
      if (text) {
        const isFinal = data?.final !== false;
        setTranslationText(text);
        setTranslationFinal(isFinal);
        const currentCall = activeCallRef.current;
        // Only finished sentences go to history, not the interim updates.
        if (isFinal) addTranscript("THEM", "SIGN", text);
        if (isFinal && user?.id && currentCall?.roomId) {
          trackSave(
            historyService.saveHistory(
              user.id,
              text,
              currentCall.roomId,
              currentCall.contactName,
              { source: "SIGN", speaker: "THEM" },
            ),
          );
        }

        if (translationClearTimer) clearTimeout(translationClearTimer);
        translationClearTimer = setTimeout(() => {
          setTranslationText("");
        }, 6000);
      }
    });

    socket.current.on("end-call", (data) => {
      const current = activeCallRef.current;
      const currentRoom = current?.roomId;
      if (data?.roomId && data.roomId !== currentRoom) {
        console.log(
          `🤙 Ignoring end-call for room ${data.roomId} (active: ${currentRoom ?? "none"})`,
        );
        return;
      }
      console.log("🤙 Peer hung up");
      if (current && !callConnectedRef.current) {
        const name = current.contactName || "They";
        if (current.isIncoming) callAlerts.notifyMissed(name);
        showNotice(
          current.isIncoming
            ? `Missed call from ${name}`
            : `${name} declined the call`,
        );
      }
      resetCallStateRef.current?.(false);
    });

    socket.current.on("call-check", (data, ack) => {
      const inCall =
        !!data?.roomId && activeCallRef.current?.roomId === data.roomId;
      if (typeof ack === "function") ack({ inCall });
    });

    socket.current.on("call-unavailable", (data) => {
      const current = activeCallRef.current;
      if (data?.roomId && data.roomId !== current?.roomId) return;
      const name = current?.contactName || "That person";

      resetCallStateRef.current?.(data?.reason === "not-a-contact");
      const text =
        UNAVAILABLE_TEXT[data?.reason]?.(name) ??
        "The call could not be placed.";
      showNotice(text, "warning");
    });

    socket.current.on("connect_error", (err) => {
      console.error("🔐 Signaling connect_error:", err.message);
      if (err.message?.startsWith("Authentication error")) {
        logoutRef.current();
      }
    });

    socket.current.on("disconnect", (reason) => {
      console.log("⚠️ Socket disconnected:", reason);
    });

    return () => {
      console.warn("🔌 Signaling socket torn down", {
        inCall: !!activeCallRef.current?.roomId,
      });
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [
    user?.id,
    addRemoteCandidate,
    flushIceQueue,
    trackSave,
    addTranscript,
    showNotice,
    getIceServers,
  ]);

  const sendChatMessage = useCallback(
    (message) => {
      if (!message?.trim() || !socket.current || !activeCall?.roomId) return;
      const payload = {
        fromUserId: user?.id,
        message: message.trim(),
        timestamp: Date.now(),
      };
      socket.current.emit("chat-message", {
        roomId: activeCall.roomId,
        message: message.trim(),
      });
      setChatMessages((prev) => [...prev, { ...payload, isOwn: true }]);
    },
    [activeCall, user],
  );

  const sendReaction = useCallback((emoji) => {
    if (!REACTIONS.includes(emoji)) return;
    const now = performance.now();
    if (now - touchTimes.current.react < REACTION_MIN_GAP_MS) return;
    touchTimes.current.react = now;
    const id = ++touchSeq.current;
    setReactions((list) => [
      ...list.slice(-(MAX_VISIBLE_REACTIONS - 1)),
      { id, emoji, own: true },
    ]);
    const ch = touchCh.current;
    if (ch?.readyState === "open")
      ch.send(JSON.stringify({ t: "reaction", e: emoji }));
  }, []);

  // Returns true when the wave was actually sent (open channel and not within the cooldown).
  const sendAttention = useCallback(() => {
    const ch = touchCh.current;
    const now = performance.now();
    if (ch?.readyState !== "open") return false;
    if (now - touchTimes.current.wave < ATTENTION_COOLDOWN_MS) return false;
    touchTimes.current.wave = now;
    ch.send(JSON.stringify({ t: "attention" }));
    return true;
  }, []);

  const dismissReaction = useCallback(
    (id) => setReactions((list) => list.filter((r) => r.id !== id)),
    [],
  );
  const dismissAttention = useCallback(() => setAttention(null), []);

  const getConnectionStats = useCallback(async () => {
    const pc = peerConnection.current;
    return pc ? pc.getStats() : null;
  }, []);

  const toggleSkeleton = useCallback(async () => {
    const pc = peerConnection.current;
    if (!pc) return;
    const on = !skeletonModeRef.current;
    skeletonModeRef.current = on;
    setSkeletonMode(on);

    const settings = localStream?.getVideoTracks()[0]?.getSettings?.();
    skelAspect.current =
      settings?.width && settings?.height
        ? settings.width / settings.height
        : 4 / 3;

    const sender = getCameraSender(pc, screenSenders.current);
    if (sender) {
      try {
        const params = sender.getParameters();
        if (params.encodings?.length) {
          params.encodings.forEach((enc) => {
            enc.active = !on;
          });
          await sender.setParameters(params);
        }
      } catch (e) {
        console.warn("Could not change camera sending:", e.message);
      }
    }
    const ctrl = skelCtrl.current;
    if (ctrl?.readyState === "open") {
      ctrl.send(JSON.stringify({ t: "skeleton", on, ar: skelAspect.current }));
    }
    skelLastEmpty.current = false;
  }, [localStream]);

  const setSkeletonPose = useCallback((points) => {
    skelPose.current = { points, fresh: true };
  }, []);

  const setSkeletonFace = useCallback((points) => {
    skelFace.current = { points, fresh: true };
  }, []);

  // Called for every hand-tracking result; sends at most ~20 frames per second.
  const sendSkeletonFrame = useCallback((hands) => {
    if (!skeletonModeRef.current) return;
    const ch = skelFrames.current;
    if (!ch || ch.readyState !== "open" || ch.bufferedAmount > 16384) return;
    const now = performance.now();
    const empty = !hands || hands.length === 0;
    const since = now - skelLastSentAt.current;
    const pose = skelPose.current;
    const face = skelFace.current;

    if (since < 50) return;
    if (
      empty &&
      skelLastEmpty.current &&
      !pose.fresh &&
      !face.fresh &&
      since < 500
    )
      return;
    skelLastEmpty.current = empty;
    skelLastSentAt.current = now;
    const buf = encodeFrame(
      skelSeq.current++,
      hands,
      pose.fresh ? pose.points : null,
      face.fresh ? face.points : null,
    );
    pose.fresh = false;
    face.fresh = false;
    try {
      ch.send(buf);
      skelStats.current.sentBytes += buf.byteLength;
      skelStats.current.sentFrames += 1;
    } catch {
      /* channel closing */
    }
  }, []);

  const broadcastLandmarks = useCallback(
    (landmarks, hands) => {
      if (!socket.current || !activeCall?.roomId) return;
      socket.current.emit("metadata-stream", {
        roomId: activeCall.roomId,
        landmarks,
        hands,
        timestamp: Date.now(),
      });
    },
    [activeCall],
  );

  const startCall = useCallback(
    async (contact) => {
      if (activeCallRef.current) return;
      await getIceServers();
      setTranslationText("");
      setChatMessages([]);
      iceQueue.current = [];
      stopAllMedia("starting new call");
      const stream = trackStream(
        await navigator.mediaDevices.getUserMedia(callMediaConstraints()),
      );
      setLocalStream(stream);
      const roomId = `room_${Date.now()}`;

      const newCall = {
        ...contact,
        roomId,
        isIncoming: false,
      };
      activeCallRef.current = newCall;
      setActiveCall(newCall);

      await setupPeerConnection(stream);
      socket.current.emit("join-room", { roomId });

      try {
        await callService.create(contact.id, roomId);
      } catch (e) {
        if (e.response?.status === 403) {
          resetCallStateRef.current?.(false);
          showNotice(
            `${contact.contactName || "That person"} is not in your contacts.`,
            "warning",
          );
          return;
        }
        console.warn("Call record not created; call continues without it.");
      }

      // 1. Create the Offer FIRST
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      // 2. SEND EVERYTHING TOGETHER via the Personal Room
      socket.current.emit("call-request", {
        toUserId: String(contact.id),
        fromName: user?.fullName || "User",
        roomId,
        offer, // <--- Send the offer here!
      });

      navigate("/call");
    },
    [
      navigate,
      user,
      setupPeerConnection,
      stopAllMedia,
      trackStream,
      showNotice,
      getIceServers,
    ],
  );

  const answerCall = useCallback(async () => {
    if (!activeCall) return;

    try {
      await callService.accept(activeCall.roomId);
    } catch (e) {
      const status = e.response?.status;
      if (status === 409 || status === 403) {
        console.warn("Call is no longer available:", e.response?.data?.message);
        resetCallStateRef.current?.(false);
        return;
      }
      console.warn("Call record (accept) failed; continuing:", e.message);
    }

    setTranslationText("");
    setChatMessages([]);

    try {
      await getIceServers();
      let stream;
      try {
        stopAllMedia("answering call");
        stream = trackStream(
          await navigator.mediaDevices.getUserMedia(callMediaConstraints()),
        );
        setLocalStream(stream);
      } catch (e) {
        console.warn(
          "⚠️ Camera busy. Continuing with audio/empty stream for test.",
        );
        stream = new MediaStream(); // Fallback to empty stream so we can still connect
      }

      await setupPeerConnection(stream);
      socket.current.emit("join-room", { roomId: activeCall.roomId });

      if (pendingOffer.current) {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(pendingOffer.current),
        );
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        // SEND DIRECT: Use fromId so it reaches the caller immediately
        socket.current.emit("answer", {
          toUserId: activeCall.id, // The caller's ID
          roomId: activeCall.roomId,
          answer,
        });
        pendingOffer.current = null;
        await flushIceQueue();
      }

      if (activeCallRef.current?.roomId !== activeCall.roomId) {
        console.warn("Call was cancelled while answering");
        stopAllMedia("cancelled while answering");
        peerConnection.current?.close();
        peerConnection.current = null;
        return;
      }

      setActiveCall((prev) => ({ ...prev, isAccepted: true }));
      navigate("/call");
    } catch (err) {
      console.error("Answer failed", err);
    }
  }, [
    activeCall,
    navigate,
    setupPeerConnection,
    flushIceQueue,
    stopAllMedia,
    trackStream,
    getIceServers,
  ]);

  const endCall = useCallback(() => {
    resetCallState(true);
  }, [resetCallState]);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        localStream,
        remoteStream,
        startCall,
        answerCall,
        remoteCameraEnabled,
        endCall,
        micEnabled,
        toggleMic,
        cameraEnabled,
        toggleCamera,
        facingMode,
        canSwitchCamera,
        switchCamera,
        translationEnabled,
        toggleTranslation,
        translationText,
        translationFinal,
        speechEnabled,
        toggleSpeech,
        speechLang,
        changeSpeechLang,
        speechUiStatus,
        speechError,
        mySpeechText,
        captions,
        speechSupported,
        speechConsent,
        speechAutoStart,
        speechConsentPrompt,
        answerSpeechConsent,
        updateSpeechConsent,
        updateSpeechAutoStart,
        broadcastLandmarks,
        setTranslationText,
        isChatOpen,
        toggleChat,
        unreadCount,
        chatToast,
        dismissChatToast,
        waitForHistorySaves,
        callTranscript,
        callStartedAt,
        callNotice,
        dismissCallNotice,
        queryPresence,
        chatMessages,
        sendChatMessage,
        screenStream,
        isScreenSharing: !!screenStream,
        remoteScreenStream,
        screenShareSupported,
        toggleScreenShare,
        skeletonMode,
        remoteSkeleton,
        toggleSkeleton,
        getConnectionStats,
        sendSkeletonFrame,
        setSkeletonPose,
        setSkeletonFace,
        remoteSkelRef,
        skelStats,
        reactions,
        sendReaction,
        dismissReaction,
        attention,
        sendAttention,
        dismissAttention,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
