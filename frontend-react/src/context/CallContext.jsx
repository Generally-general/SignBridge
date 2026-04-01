import React, { createContext, useState, useCallback } from 'react';

export const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const [activeCall, setActiveCall] = useState(null);
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [translationText, setTranslationText] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const startCall = useCallback((callData) => {
    setActiveCall(callData);
  }, []);

  const endCall = useCallback(() => {
    setActiveCall(null);
    setTranslationText('');
  }, []);

  const toggleTranslation = useCallback(() => {
    setTranslationEnabled((prev) => !prev);
  }, []);

  const toggleMic = useCallback(() => {
    setMicEnabled((prev) => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraEnabled((prev) => !prev);
  }, []);

  const updateTranslation = useCallback((text) => {
    setTranslationText(text);
  }, []);

  const value = {
    activeCall,
    startCall,
    endCall,
    translationEnabled,
    toggleTranslation,
    translationText,
    updateTranslation,
    micEnabled,
    toggleMic,
    cameraEnabled,
    toggleCamera,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
