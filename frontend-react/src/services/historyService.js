import api from "./api"

export const historyService = {
  getCallHistory: async (userId) => {
    const response = await api.get(`/history/user/${userId}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || "History request failed");
  },

  getLinesForRooms: async (userId, roomIds) => {
    if (!roomIds.length) return [];
    const response = await api.get(`/history/user/${userId}/rooms`, {
      params: { ids: roomIds.join(",") },
    });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || "History request failed");
  },

  saveHistory: async (userId, translatedText, roomId, peerName, meta = {}) => {
    try {
      await api.post(`/history/save`, {
        userId: String(userId),
        roomId,
        peerName,
        translatedText,
        source: meta.source,
        speaker: meta.speaker,
      });
    } catch (error) {
      console.error("Error saving history:", error);
    }
  },

  clearHistory: async (userId) => {
    try {
      await api.delete(`/history/user/${userId}`);
      return true;
    } catch (error) {
      console.error("Error clearing history:", error);
      return false;
    }
  },
}