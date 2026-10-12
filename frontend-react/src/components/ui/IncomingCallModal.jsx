import React, { useContext, useEffect, useState } from "react";
import { CallContext } from "../../context/CallContextInstance";
import { Phone, PhoneOff } from "lucide-react";
import { callAlerts, loadAlertPrefs } from "../../utils/callAlerts";
import { FlashOverlay } from "./FlashOverlay";

const IncomingCallModal = () => {
  const { activeCall, answerCall, endCall } = useContext(CallContext);
  const ringing =
    !!activeCall && !!activeCall.isIncoming && !activeCall.isAccepted;
  const roomId = activeCall?.roomId;
  const name = activeCall?.contactName;
  const [flash, setFlash] = useState(false);

  // While the call is ringing: flash, vibrate, notify, flash the tab title (each one can be switched off in
  // Settings). Everything stops the moment the call is answered, declined or gone.
  useEffect(() => {
    if (!ringing) return undefined;
    setFlash(loadAlertPrefs().flash);
    callAlerts.start({ name, roomId });
    return () => callAlerts.stop();
  }, [ringing, roomId, name]);

  if (!ringing) return null;

  return (
    <>
      {flash && <FlashOverlay />}
      <div
        role="alertdialog"
        aria-label="Incoming call"
        aria-live="assertive"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      >
        <div className="bg-surface border border-border p-8 rounded-card text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="text-primary w-7 h-7" />
          </div>
          <h2 className="text-[18px] font-bold text-text-primary mb-1">
            {name || "Unknown Caller"}
          </h2>
          <p className="text-text-secondary text-[13px] mb-8">
            Incoming SignBridge Call...
          </p>

          <div className="flex gap-3">
            <button
              onClick={endCall}
              className="flex-1 rounded-standard px-4 py-2 text-[13px] font-bold bg-danger text-white hover:bg-danger/90 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <PhoneOff size={16} /> Decline
            </button>
            <button
              onClick={answerCall}
              className="flex-1 rounded-standard px-4 py-2 text-[13px] font-bold bg-success text-white hover:bg-success/90 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Phone size={16} /> Answer
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default IncomingCallModal;
