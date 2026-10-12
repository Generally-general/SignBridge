import api from './api';

export const authService = {
  register: async (fullName, email, password, username) => {
    const response = await api.post('/auth/register', {
      fullName,
      email,
      password,
      username,
    });

    if(response.data.success) return response.data.data;

    throw new Error(response.data.message || 'Registration failed');
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    const apiResponse = response.data;

    if(apiResponse.success) {
      return apiResponse.data;
    } else {
      throw new Error(apiResponse.message || 'Login failed');
    }
  },

  usernameAvailable: async (username) => {
    const response = await api.get('/auth/username-available', { params: { u: username } });
    if (response.data.success) return response.data.data;
    throw new Error(response.data.message || 'Could not check username');
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
