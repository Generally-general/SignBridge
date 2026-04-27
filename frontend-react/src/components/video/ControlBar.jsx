import React, { useRef } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  PhoneOff,
} from "lucide-react";
import { useCall } from "../../hooks/useCall";
import { Button } from "../ui/Button";

export const ControlBar = ({ onEndCall }) => {
  const {
    micEnabled,
    toggleMic,
    cameraEnabled,
    toggleCamera,
    translationEnabled,
    toggleTranslation,
    isChatOpen,
    toggleChat,
  } = useCall();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3 justify-center items-center p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full"
    >
      <motion.button
        onClick={toggleMic}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`p-3 rounded-full transition-all ${
          micEnabled ? "bg-cyan-400 text-slate-900" : "bg-red-500 text-white"
        }`}
        title={micEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {micEnabled ? (
          <Mic className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </motion.button>

      <motion.button
        onClick={toggleCamera}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`p-3 rounded-full transition-all ${
          cameraEnabled ? "bg-cyan-400 text-slate-900" : "bg-red-500 text-white"
        }`}
        title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {cameraEnabled ? (
          <Video className="w-5 h-5" />
        ) : (
          <VideoOff className="w-5 h-5" />
        )}
      </motion.button>

      <motion.button
        onClick={toggleChat}
        className={`p-3 rounded-full transition-all ${
          isChatOpen ? "bg-cyan-400 text-slate-900" : "bg-white/10 text-white"
        }`}
      >
        <MessageSquare className="w-5 h-5" />
      </motion.button>

      <div className="w-px h-8 bg-white/20" />

      <motion.button
        onClick={onEndCall}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
        title="End call"
      >
        <PhoneOff className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
};
