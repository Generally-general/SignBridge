import api from './api';

export const userService = {
  getAllUsers: async () => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      console.error("Error fetching users from backend:", error);
      throw error;
    }
  }
};