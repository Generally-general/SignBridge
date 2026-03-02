import { useEffect, useRef, useState } from "react";
import { socket } from "../services/socket";

const VideoCall = () => {
    const localVideo = useRef(null);
    const remoteVideo = useRef(null);
    const peerConnection = useRef(null);
    const [subtitle, setSubtitle] = useState("");

    const roomId =
        new URLSearchParams(window.location.search).get("room") || "test-room";

    useEffect(() => {

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);

            startCall();

           
            const interval = setInterval(() => {
                socket.emit("metadata-stream", {
                    roomId,
                    userId: "123",
                    timestamp: Date.now(),
                    gestureText: "I NEED WATER",
                    hands: [],
                    face: { emotion: "neutral" }
                });
            }, 5000);

            
            socket._aiInterval = interval;
        });

        socket.on("offer", async (data) => {
            await peerConnection.current.setRemoteDescription(data.offer);
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit("answer", { answer, roomId });
        });

        socket.on("answer", async (data) => {
            await peerConnection.current.setRemoteDescription(data.answer);
        });

        socket.on("ice-candidate", async (data) => {
            await peerConnection.current.addIceCandidate(data.candidate);
        });

        socket.on("metadata-stream", (data) => {
            console.log("Received metadata:", data);
            setSubtitle(data.gestureText);
        });

        socket.on("connect_error", (err) => {
            console.log("Socket connection error:", err.message);
        });

        return () => {
            socket.off("connect");
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
            socket.off("metadata-stream");

            if (socket._aiInterval) {
                clearInterval(socket._aiInterval);
            }
        };

    }, []);
    const startCall = async () => {
        peerConnection.current = new RTCPeerConnection();
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        localVideo.current.srcObject = stream;

        stream.getTracks().forEach(track => {
            peerConnection.current.addTrack(track, stream);
        });

        peerConnection.current.ontrack = (event) => {
            remoteVideo.current.srcObject = event.streams[0];
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", {
                    candidate: event.candidate,
                    roomId
                });
            }
        };

        peerConnection.current.onconnectionstatechange = () => {
            console.log("Connection State:", peerConnection.current.connectionState);
        };

        socket.emit("join-room", { roomId });

        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);

        socket.emit("offer", {
            offer,
            roomId
        });
    };

    const getSubtitleColor = () => {
        if (!subtitle) return "white";
        if (subtitle.includes("!")) return "red";
        return "white";
    };

    return (
        <div style={{ position: "relative" }}>
            <video ref={localVideo} autoPlay muted />
            <video ref={remoteVideo} autoPlay />
            <div style={{
                position: "absolute",
                bottom: "20px",
                background: "black",
                color: getSubtitleColor(),
                padding: "10px"
            }}>
                {subtitle}
            </div>
        </div>
    );
};

export default VideoCall;