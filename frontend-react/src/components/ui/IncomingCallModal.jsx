import React, { useContext } from 'react'
import { CallContext } from '../../context/CallContext'
import { Phone, PhoneOff } from 'lucide-react';
import { Button } from './Button';

const IncomingCallModal = () => {
  const { activeCall, answerCall, endCall } = useContext(CallContext);

  if(!activeCall || !activeCall.isIncoming || activeCall.isAccepted) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-indigo-900 border border-cyan-400/30 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full">
        <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <Phone className="text-white w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{activeCall.contactName || "Unknown Caller"}</h2>
        <p className="text-cyan-400/70 mb-8 font-medium">Incoming SignBridge Call...</p>
        
        <div className="flex gap-4">
          <Button 
            variant="danger" 
            className="flex-1 flex items-center justify-center gap-2"
            onClick={endCall}
          >
            <PhoneOff size={18} /> Decline
          </Button>
          <Button 
            variant="primary" 
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 border-none"
            onClick={answerCall}
          >
            <Phone size={18} /> Answer
          </Button>
        </div>
      </div>
    </div>
  )
}

export default IncomingCallModal;