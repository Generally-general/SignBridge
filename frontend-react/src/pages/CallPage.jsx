import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';
import { useCall } from '../hooks/useCall';
import { useNavigate } from 'react-router-dom';
import { VideoFrame } from '../components/video/VideoFrame';
import { TranslationOverlay } from '../components/video/TranslationOverlay';
import { LocalVideoPiP } from '../components/layout/LocalVideoPiP';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const CallPage = () => {
  const { activeCall, endCall } = useCall();
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const navigate = useNavigate();
  const callTimerRef = useRef(null);

  // Initialize local stream (mock for now)
  useEffect(() => {
    const initializeLocalStream = async () => {
      try {
        // Mock stream - in production, this would be actual WebRTC
        const stream = new MediaStream();
        setLocalStream(stream);
      } catch (error) {
        console.error('Failed to access camera:', error);
      }
    };

    initializeLocalStream();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Call timer
  useEffect(() => {
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  const handleEndCall = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    endCall();
    navigate('/');
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  if (!activeCall) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Card className="max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">No Active Call</h2>
            <p className="text-white/70 mb-6">
              You don't have an active call right now. Go to the dashboard to
              start calling.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/')}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-screen bg-slate-900 overflow-hidden"
    >
      {/* Remote Video - Fullscreen */}
      <div className="absolute inset-0">
        <VideoFrame stream={remoteStream} className="w-full h-full" />

        {/* Translation Overlay */}
        <div className="absolute bottom-0 left-0 right-0">
          <TranslationOverlay />
        </div>

        {/* Call Info - Top Center */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 flex items-center gap-4"
        >
          <div className="text-center">
            <p className="text-white font-semibold">{activeCall.contactName}</p>
            <p className="text-cyan-400 text-sm">{formatDuration(callDuration)}</p>
          </div>
        </motion.div>
      </div>

      {/* Local Video PiP */}
      <LocalVideoPiP stream={localStream} onEndCall={handleEndCall} />
    </motion.div>
  );
};
