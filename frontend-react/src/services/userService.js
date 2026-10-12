import api from "./api";

const unwrap = (response) => {
  if (response.data?.success) return response.data.data;
  throw new Error(response.data?.message || "Request failed");
};

export const userService = {
  // Your own profile: { id, fullName, email, username, searchable }
  getMe: async () => unwrap(await api.get("/users/me")),

  // Send only the fields that changed: { fullName?, username?, searchable? }
  updateProfile: async (changes) => unwrap(await api.put("/users/me", changes)),
  changePassword: async (currentPassword, newPassword) =>
    unwrap(await api.put("/users/me/password", { currentPassword, newPassword })),
};