import api from "./api";

// Every backend answer looks like { success, message, data }.
const unwrap = (response) => {
  if (response.data?.success) return response.data.data;
  throw new Error(response.data?.message || "Request failed");
};

export const contactService = {
  list: async () => unwrap(await api.get("/contacts")),
  requests: async () => unwrap(await api.get("/contacts/requests")),
  search: async (q) => unwrap(await api.get("/users/search", { params: { q } })),
  // -> { relationship }
  send: async (username) => unwrap(await api.post("/contacts/requests", { username })),
  accept: async (requestId) => unwrap(await api.post(`/contacts/requests/${requestId}/accept`)),
  decline: async (requestId) => unwrap(await api.post(`/contacts/requests/${requestId}/decline`)),
  cancel: async (requestId) => unwrap(await api.delete(`/contacts/requests/${requestId}`)),
  remove: async (userId) => unwrap(await api.delete(`/contacts/${userId}`)),
};