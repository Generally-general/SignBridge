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

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    if (response.data.success) return response.data.message;
    throw new Error(response.data.message || 'Could not send the reset link');
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    if (response.data.success) return true;
    throw new Error(response.data.message || 'Could not reset the password');
  },

  usernameAvailable: async (username) => {
    const response = await api.get('/auth/username-available', { params: { u: username } });
    if (response.data.success) return response.data.data;
    throw new Error(response.data.message || 'Could not check username');
  },
};
