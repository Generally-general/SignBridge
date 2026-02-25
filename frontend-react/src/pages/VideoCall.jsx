import { useEffect, useRef } from "react";
import { socket } from "../services/socket";

const VideoCall = () => {
    const localVideo = useRef(null);
    const remoteVideo = useRef(null);
    const peerConnection = useRef(null);

    useEffect(() => {
        startCall();
        socket.on("offer", (data) => {
            console.log("Offer received:", data);
        });

        return () => {
            socket.off("offer");
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
                    roomId: "room1"
                });
            }
        };

        socket.emit("join-room", { roomId: "room1" });

        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);

        socket.emit("offer", {
            offer,
            roomId: "room1"
        });
    };

    socket.on("offer", async (data) => {
        await peerConnection.current.setRemoteDescription(data.offer);

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        socket.emit("answer", {
            answer,
            roomId: "room1"
        });
    });

    socket.on("answer", async (data) => {
        await peerConnection.current.setRemoteDescription(data.answer);
    });

    socket.on("ice-candidate", async (data) => {
        await peerConnection.current.addIceCandidate(data.candidate);
    });

    return (
        <div>
            <video ref={localVideo} autoPlay muted />
            <video ref={remoteVideo} autoPlay />
        </div>
    );
};

export default VideoCall;