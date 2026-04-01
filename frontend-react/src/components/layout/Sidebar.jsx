import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { callService } from '../../services/callService';

export const Sidebar = ({ contacts, loading, callHistory, onInitiateCall }) => {
  const [activeTab, setActiveTab] = useState('contacts');

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-64 bg-gradient-to-b from-slate-900 to-indigo-900 border-r border-white/10 flex flex-col h-screen"
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all ${
            activeTab === 'contacts'
              ? 'bg-cyan-400/20 text-cyan-400 border-b-2 border-cyan-400'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">Contacts</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'bg-cyan-400/20 text-cyan-400 border-b-2 border-cyan-400'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">History</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-white/5 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : activeTab === 'contacts' ? (
          <div className="space-y-2">
            {contacts.length > 0 ? (
              contacts.map((contact) => (
                <motion.div
                  key={contact.id}
                  whileHover={{ x: 5 }}
                  onClick={() => onInitiateCall(contact.id)}
                  className="p-3 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{contact.fullName}</p>
                      <p className="text-white/50 text-xs">
                        {contact.status || 'offline'}
                      </p>
                    </div>
                    {contact.status === 'online' && (
                      <div className="w-3 h-3 bg-green-400 rounded-full" />
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-white/50 text-sm text-center py-8">
                No contacts yet
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {callHistory.length > 0 ? (
              callHistory.map((call) => (
                <motion.div
                  key={call.id}
                  className="p-3 bg-white/10 border border-white/20 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{call.translatedText}</p>
                      <p className="text-white/50 text-xs">{new Date(call.timestamp).toLocaleString}</p>
                    </div>
                    <span className="text-cyan-400 text-xs">
                      ISL
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-white/50 text-sm text-center py-8">
                No call history
              </p>
            )}
          </div>
        )}
      </div>

      {/* Add Contact Button */}
      {activeTab === 'contacts' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border-t border-white/10"
        >
          <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Add Contact
          </Button>
        </motion.div>
      )}
    </motion.aside>
  );
};
