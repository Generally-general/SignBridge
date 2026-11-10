import api from "./api";

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;

const toKey = (b64) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = () =>
  !!VAPID &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const pushService = {
  async isSubscribed() {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  },
  async enable() {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      throw new Error("Notifications are blocked. Allow them in the browser's site settings.");
    }
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toKey(VAPID),
      }));
    const j = sub.toJSON();
    await api.post("/push/subscriptions", {
      endpoint: j.endpoint,
      p256dh: j.keys.p256dh,
      auth: j.keys.auth,
    });
  },
  async disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await api
      .delete("/push/subscriptions", { params: { endpoint: sub.endpoint } })
      .catch(() => { });
    await sub.unsubscribe();
  },
};