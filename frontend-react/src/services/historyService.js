import api from "./api"

export const historyService = {
  
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
}