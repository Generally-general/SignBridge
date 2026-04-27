import api from './api';

export const userService = {
  getAllUsers: async () => {
    try {
      const response = await api.get('/users');
      if(response.data && response.data.success) {
        return response.data.data.content;
      }
      return [];
    } catch (error) {
      console.error("Error fetching users from backend:", error);
      throw error;
    }
  }
};