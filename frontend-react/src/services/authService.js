import api from './api';

export const authService = {
  register: async (name, email, password) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    const apiResponse = response.data;

    if(apiResponse.success) {
      const payload = apiResponse.data;

      localStorage.setItem('token', payload.token);
      localStorage.setItem('refreshToken', payload.refreshToken);
      localStorage.setItem('user', JSON.stringify(payload.userResponse));

      return payload;
    } else {
      throw new Error(apiResponse.message || 'Login failed');
    }
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },
};
