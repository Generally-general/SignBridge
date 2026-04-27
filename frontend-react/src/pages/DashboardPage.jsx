import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCall } from "../hooks/useCall";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Phone, Users, Clock } from "lucide-react";
import { userService } from "../services/userService";
import { historyService } from "../services/historyService";

export const DashboardPage = () => {
  const { activeCall, startCall } = useCall();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [callHistory, setCallHistory] = useState([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await userService.getAllUsers();
        setContacts(data);
      } catch (error) {
        console.error("Failed to load users from SSMS:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      const rawUser = localStorage.getItem('signbridge_user') || localStorage.getItem('user');
      const currentUser = JSON.parse(rawUser);

      if(!currentUser || !currentUser.id) {
        console.error("No user ID found in storage");
        return;
      }

      console.log("Fetching history for user Id:", currentUser.id);
      

      const [usersData, historyData] = await Promise.all([
        userService.getAllUsers(),
        historyService.getCallHistory(currentUser.id)
      ]);

      const otherUsers = usersData.filter(user => user.id != currentUser.id);
      setContacts(otherUsers);
      setCallHistory(historyData);
    } catch (error) {
      console.error("Dashboard load failed", error);
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, []);

  const handleInitiateCall = (contact) => {
    try {
    startCall({
      id: contact.id,
      contactName: contact.fullName || contact.email,
      timestamp: new Date(),
    });
    navigate("/call");
    } catch (error) {
      console.error("Failed to start call handshake");
      
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Sidebar */}
      <Sidebar
        contacts={contacts}
        loading={loading}
        callHistory={callHistory}
        onInitiateCall={handleInitiateCall}
      />

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center p-8"
      >
        {activeCall ? (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <Card>
              <h2 className="text-2xl font-bold text-white mb-4">
                Call in Progress
              </h2>
              <p className="text-white/70 mb-6">{activeCall.contactName}</p>
              <Button
                variant="danger"
                onClick={() => {
                  startCall(null);
                  navigate("/");
                }}
              >
                End Call
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-8"
            >
              <Phone className="w-12 h-12 text-white" />
            </motion.div>

            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to SignBridge
            </h1>
            <p className="text-xl text-white/70 mb-12">
              Select a contact from the sidebar to start a video call
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="flex flex-col items-center">
                  <Phone className="w-8 h-8 text-cyan-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    HD Video Calls
                  </h3>
                  <p className="text-white/70 text-sm">
                    Crystal clear video for sign language communication
                  </p>
                </div>
              </Card>

              <Card>
                <div className="flex flex-col items-center">
                  <Users className="w-8 h-8 text-cyan-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    AI Translation
                  </h3>
                  <p className="text-white/70 text-sm">
                    Real-time text overlay for accessibility
                  </p>
                </div>
              </Card>

              <Card>
                <div className="flex flex-col items-center">
                  <Clock className="w-8 h-8 text-cyan-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Call History
                  </h3>
                  <p className="text-white/70 text-sm">
                    Keep track of all your calls and contacts
                  </p>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
};
