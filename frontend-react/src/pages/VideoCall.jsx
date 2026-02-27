import { useEffect, useRef, useState } from "react";
import { socket } from "../services/socket";

const VideoCall = () => {
    const localVideo = useRef(null);
    const remoteVideo = useRef(null);
    const peerConnection = useRef(null);
    const [subtitle, setSubtitle] = useState("");

    const roomId = new URLSearchParams(window.location.search).get("room");


    useEffect(() => {
        startCall();
        socket.on("offer", async (data) => {
            await peerConnection.current.setRemoteDescription(data.offer);

            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);

            socket.emit("answer", {
                answer,
                roomId
            });
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

        setInterval(() => {
            socket.emit("metadata-stream", {
                roomId,
                gestureText: "HELLO",
            });
        }, 5000);

        return () => {
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
            socket.off("metadata-stream");
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



    return (
        <div style={{ position: "relative" }}>
            <video ref={localVideo} autoPlay muted />
            <video ref={remoteVideo} autoPlay />
            <div style={{
                position: "absolute",
                bottom: "20px",
                background: "black",
                color: "white",
                padding: "10px"
            }}>
                {subtitle}
            </div>
        </div>
    );
};

export default VideoCall;