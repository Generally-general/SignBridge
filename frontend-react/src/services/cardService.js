import api from "./api";

const unwrap = (response) => {
  if (response.data?.success) return response.data.data;
  throw new Error(response.data?.message || "Request failed");
};

export const cardService = {
  preview: async (token) =>
    unwrap(await api.get(`/auth/cards/${encodeURIComponent(token)}`)),
  mine: async () => unwrap(await api.get("/cards/me")),
  save: async (changes) => unwrap(await api.put("/cards/me", changes)),
  turnOff: async () => unwrap(await api.delete("/cards/me")),
  connect: async (token) =>
    unwrap(await api.post(`/cards/${encodeURIComponent(token)}/connect`)),
};