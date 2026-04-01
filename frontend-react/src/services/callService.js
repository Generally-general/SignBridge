import api from './api';

export const callService = {
  initiate: async (contactId) => {
    const response = await api.post('/calls/initiate', {
      contactId,
    });
    return response.data;
  },

  answer: async (callId) => {
    const response = await api.post(`/calls/${callId}/answer`);
    return response.data;
  },

  reject: async (callId) => {
    const response = await api.post(`/calls/${callId}/reject`);
    return response.data;
  },

  end: async (callId) => {
    const response = await api.post(`/calls/${callId}/end`);
    return response.data;
  },

  getContacts: async () => {
    const response = await api.get('/contacts');
    return response.data;
  },

  getCallHistory: async () => {
    const response = await api.get('/calls/history');
    return response.data;
  },

  sendTranslation: async (callId, translationText) => {
    const response = await api.post(`/calls/${callId}/translation`, {
      text: translationText,
    });
    return response.data;
  },
};
