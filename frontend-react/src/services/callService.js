import api from './api';


const run = async (label, request) => {
  try {
    const res = await request();
    
    return res.data.data;
  } catch (e) {
    console.warn(
      `📒 call record ${label}: FAILED http=${e.response?.status} ` +
        `message="${e.response?.data?.message ?? e.message}"`,
    );
    throw e;
  }
};

const enc = encodeURIComponent;

export const callService = {
  create: (receiverId, roomId) =>
    run('create', () => api.post('/calls', { receiverId, roomId })),
  accept: (roomId) => run('accept', () => api.post(`/calls/${enc(roomId)}/accept`)),
  end: (roomId) => run('end', () => api.post(`/calls/${enc(roomId)}/end`)),
  list: async ({ limit = 20, beforeId } = {}) =>
    (await api.get('/calls', { params: { limit, beforeId } })).data.data,
  clearAll: async () => {
    const response = await api.delete('/calls');
    if (!response.data?.success) throw new Error(response.data?.message || 'Could not clear history');
  },
};