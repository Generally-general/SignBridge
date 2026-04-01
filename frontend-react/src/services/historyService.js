import api from "./api"

export const historyService = {
  getCallHistory: async (userId) => {
    try {
      const response = await api.get(`/history/user/${userId}`);
      console.log("History API Raw Response:", response.data);

      if (response.data && response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching history from backend:", error);
      return [];
    }
  }
}

