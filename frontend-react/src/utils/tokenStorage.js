const TOKEN_KEY = "signbridge_token";
const USER_KEY = "signbridge_user";

const LEGACY_KEYS = ["token", "refreshToken", "user"];

const decodePayload = (token) => {
  try {
    const part = token.split(".")[1];
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
};

export const tokenStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),

  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },

  setSession: (user, token) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
  },

  clear: () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  },

  purgeLegacy: () => LEGACY_KEYS.forEach((k) => localStorage.removeItem(k)),

  isExpired: (token) => {
    const claims = token ? decodePayload(token) : null;
    if (!claims || typeof claims.exp !== "number") return true;
    return claims.exp * 1000 <= Date.now() + 5000;
  },
};