const KEY = "signbridge.pendingCard";

export const pendingCard = {
  set(token) {
    try {
      sessionStorage.setItem(KEY, token);
    } catch {
      /* storage blocked: the person just opens the link again */
    }
  },
  get() {
    try {
      return sessionStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};