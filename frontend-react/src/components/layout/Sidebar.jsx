import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Users, Clock, Plus } from "lucide-react";
import { Button } from "../ui/Button";
import { callService } from "../../services/callService";

export const Sidebar = ({ contacts, loading, callHistory, onInitiateCall }) => {
  const [activeTab, setActiveTab] = useState("contacts");

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-64 bg-gradient-to-b from-slate-900 to-indigo-900 border-r border-white/10 flex flex-col h-screen"
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab("contacts")}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all ${
            activeTab === "contacts"
              ? "bg-cyan-400/20 text-cyan-400 border-b-2 border-cyan-400"
              : "text-white/70 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">Contacts</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all ${
            activeTab === "history"
              ? "bg-cyan-400/20 text-cyan-400 border-b-2 border-cyan-400"
              : "text-white/70 hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">History</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence mode="Wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-white/5 rounded-xl animate-pulse"
                />
              ))}
            </motion.div>
          ) : activeTab === "contacts" ? (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <motion.div
                    key={contact.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onInitiateCall(contact)}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-cyan-400/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-white font-bold border border-white/10">
                          {contact.fullName?.charAt(0) || "?"}
                        </div>
                        {contact.status === "online" && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate text-sm">
                          {contact.fullName}
                        </p>
                        <p className="text-white/40 text-[10px] uppercase tracking-tighter">
                          {contact.status || "offline"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-10 opacity-40 text-[#A1A1AA]">
                  <Users size={40} className="mx-auto mb-2" />
                  <p className="text-xs">No contacts found</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {callHistory.length > 0 ? (
                callHistory.map((call) => (
                  <div
                    key={call.id}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl group"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest italic">Translated</p>
                        <span className="text-[10px] text-white/30 italic">
                          {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-white text-sm font-medium leading-tight">
                        "{call.translatedText}"
                      </p>
                      <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[10px] text-white/40 font-mono">ID: {call.id}</span>
                        <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-white/60 font-bold uppercase">ISL</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-40">
                  <Clock className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-xs">History is empty</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Contact Button */}
      {activeTab === 'contacts' && (
        <div className="p-4 bg-slate-900/50 backdrop-blur-sm border-t border-white/10">
          <Button variant="primary" size="sm" className="w-full shadow-lg shadow-cyan-500/20 items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      )}
    </motion.aside>
  );
};
