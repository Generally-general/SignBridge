import React, {
  createContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useContext,
} from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [translationText, setTranslationText] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [remoteCameraEnabled, setRemoteCameraEnabled] = useState(true);

  const socket = useRef(null);
  const peerConnection = useRef(null);
  const pendingOffer = useRef(null);
  const iceQueue = useRef([]);
  const navigate = useNavigate();
  const activeCallRef = useRef(activeCall);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const rtcConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const resetCallState = useCallback(
    (shouldEmit = false) => {
      if (shouldEmit && activeCall?.roomId) {
        socket.current.emit("end-call", { roomId: activeCall.roomId });
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(null);
      setRemoteCameraEnabled(true);
      iceQueue.current = [];
      pendingOffer.current = null;
      navigate("/");
    },
    [localStream, activeCall, navigate],
  );

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
  });

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);

  const setupPeerConnection = useCallback(
    async (stream) => {
      console.log("🛠️ Setting up PeerConnection with stream:", stream?.id);
      peerConnection.current = new RTCPeerConnection(rtcConfig);

      if (stream) {
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });
      }

      peerConnection.current.ontrack = (event) => {
        const stream = event.streams[0];
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
        if (event.candidate && activeCall?.roomId) {
          console.log("📡 Sending ICE Candidate to Peer");
          socket.current.emit("ice-candidate", {
            roomId: activeCall.roomId,
            toUserId: activeCall.id,
            candidate: event.candidate,
          });
        }
      };

      peerConnection.current.onconnectionstatechange = () => {
        console.log(
          "🕸️ Connection State:",
          peerConnection.current.connectionState,
        );
      };
    },
    [activeCall, resetCallState],
  );

  const toggleCamera = useCallback(async () => {
    if (cameraEnabled) {
      const videoTrack = localStream?.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.stop();
      }

      const sender = peerConnection.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");

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
        video: true,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Merge with existing audio
      const updatedStream = new MediaStream([
        newVideoTrack,
        ...localStream.getAudioTracks(),
      ]);

      setLocalStream(updatedStream);

      const sender = peerConnection.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      setCameraEnabled(true);

      socket.current.emit("camera-status", {
        roomId: activeCall.roomId,
        enabled: true,
      });
    }
  }, [localStream, cameraEnabled, activeCall]);

  const handleOffer = useCallback(
    async (offerData) => {
      if (!peerConnection.current || !offerData) return;
      try {
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
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    },
    [],
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    socket.current = io("http://localhost:5000", {
      auth: { token },
    });

    socket.current.on("connect", () => {
      console.log("Connected to signaling with ID:", socket.current.id);
    });

    socket.current.on(
      "incoming-call",
      async ({ fromId, fromName, roomId, offer }) => {
        console.log("🔔 Incoming call with offer from:", fromName);

        // Save the offer into our Ref immediately
        pendingOffer.current = offer;

        setActiveCall({
          id: fromId,
          contactName: fromName,
          roomId,
          isIncoming: true,
        });
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
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.answer),
        );
      }
    });

    socket.current.on("ice-candidate", async (data) => {
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        try {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(data.candidate),
          );
        } catch (e) {
          console.error("ICE Error:", e);
        }
      } else {
        iceQueue.current.push(data.candidate);
      }
    });

    socket.current.on("camera-status", ({ enabled }) => {
      setRemoteCameraEnabled(enabled);

      console.log(`👤 Peer camera is now: ${enabled ? "ON" : "OFF"}`);
    });

    socket.current.on("end-call", () => {
      console.log("🤙 Peer hung up");

      if(localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(null);
      navigate("/");
    });

    socket.current.on("offer", (data) => handleOffer(data));

    socket.current.on("metadata-stream", (data) => {
      setTranslationText("Sign detected...");
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [navigate]);

  const broadcastLandmarks = useCallback(
    (landmarks) => {
      if (socket.current && activeCall?.roomId) {
        socket.current.emit("metadata-stream", {
          roomId: activeCall.roomId,
          landmarks: landmarks,
          timestamp: Date.now(),
        });
      }
    },
    [activeCall],
  );

  const startCall = useCallback(
    async (contact) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      const roomId = `room_${Date.now()}`;

      setActiveCall({
        ...contact,
        contactName: contact.fullName,
        roomId,
        isIncoming: false,
      });

      await setupPeerConnection(stream);
      socket.current.emit("join-room", { roomId });

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
    [navigate, user, setupPeerConnection],
  );

  const answerCall = useCallback(async () => {
    if (!activeCall) return;

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
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
      }

      setActiveCall((prev) => ({ ...prev, isAccepted: true }));
      navigate("/call");
    } catch (err) {
      console.error("Answer failed", err);
    }
  }, [activeCall, navigate, setupPeerConnection]);

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
        translationEnabled,
        toggleTranslation,
        translationText,
        broadcastLandmarks,
        setTranslationText,
        isChatOpen,
        toggleChat,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
