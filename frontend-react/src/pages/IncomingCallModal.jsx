import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, X } from 'lucide-react';
import { useCall } from '../hooks/useCall';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const IncomingCallModal = ({ caller, onAccept, onReject }) => {
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    if (onAccept) {
      await onAccept();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
      >
        <Card className="max-w-md">
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Phone className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Incoming Call
            </h2>
            <p className="text-xl text-cyan-400 font-semibold mb-6">
              {caller?.name || 'Unknown Caller'}
            </p>

            <div className="flex gap-3">
              <Button
                variant="danger"
                onClick={onReject}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Decline
              </Button>
              <Button
                variant="primary"
                onClick={handleAccept}
                isLoading={isAccepting}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Accept
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};
