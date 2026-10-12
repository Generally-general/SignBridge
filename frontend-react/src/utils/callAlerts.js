// Ways of noticing a call that do not depend on hearing the ringtone:
//   flash     the screen flashes (drawn by FlashOverlay, switched here)
//   vibrate   the phone buzzes in a repeating pattern
//   notify    a browser notification while this tab or window is in the background
//   sound     an optional ringtone (off by default)
//   title     the browser tab's title flashes "Incoming call"
// Each one can be switched off in Settings. The choices are stored in this browser.

const PREFS_KEY = "signbridge_call_alerts";

export const DEFAULT_ALERT_PREFS = {
  flash: true,
  vibrate: true,
  notify: true,
  sound: false,
  title: true,
};

export const loadAlertPrefs = (storage) => {
  try {
    const saved = JSON.parse((storage ?? window.localStorage).getItem(PREFS_KEY) || "{}");
    const prefs = { ...DEFAULT_ALERT_PREFS };
    for (const key of Object.keys(DEFAULT_ALERT_PREFS)) {
      if (typeof saved[key] === "boolean") prefs[key] = saved[key];
    }
    return prefs;
  } catch {
    return { ...DEFAULT_ALERT_PREFS };
  }
};

export const saveAlertPrefs = (prefs, storage) => {
  try {
    (storage ?? window.localStorage).setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode or full storage: the choice just is not remembered */
  }
};

const VIBRATION_PATTERN = [500, 250, 500, 250, 500];
const VIBRATION_EVERY_MS = 3000;
const TITLE_EVERY_MS = 1000;
const SOUND_EVERY_MS = 2000;

// A two-tone ring, made with the browser's audio engine (no audio file needed).
const createRingtone = (AudioContextClass, env) => {
  let ctx = null;
  let timer = null;

  const beep = (at, freq, length) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + length + 0.02);
  };
  const phrase = () => {
    beep(ctx.currentTime, 880, 0.25);
    beep(ctx.currentTime + 0.35, 660, 0.25);
  };

  return {
    start() {
      if (!AudioContextClass) return;
      try {
        ctx = ctx || new AudioContextClass();
        ctx.resume?.(); // a browser may keep it silent until the person has clicked something
        phrase();
        timer = env.setInterval(phrase, SOUND_EVERY_MS);
      } catch {
        /* no audio available */
      }
    },
    stop() {
      if (timer) env.clearInterval(timer);
      timer = null;
    },
  };
};

const browserEnv = () => ({
  window,
  document,
  navigator,
  storage: window.localStorage,
  Notification: window.Notification,
  AudioContext: window.AudioContext || window.webkitAudioContext,
  setInterval: (...a) => window.setInterval(...a),
  clearInterval: (...a) => window.clearInterval(...a),
});

export const createCallAlerter = (env = browserEnv()) => {
  let ringing = null;

  const away = () => env.document.hidden || (env.document.hasFocus ? !env.document.hasFocus() : false);
  const canNotify = () => !!env.Notification && env.Notification.permission === "granted";

  const show = (title, options) => {
    try {
      const n = new env.Notification(title, options);
      n.onclick = () => {
        env.window?.focus?.();
        n.close?.();
      };
      return n;
    } catch {
      return null; // some phones only allow notifications through a service worker
    }
  };

  const stop = () => {
    if (!ringing) return;
    ringing.timers.forEach((t) => env.clearInterval(t));
    ringing.ringtone?.stop();
    if (ringing.vibrating) env.navigator.vibrate?.(0);
    if (ringing.titleChanged) env.document.title = ringing.originalTitle;
    ringing.notification?.close?.();
    ringing = null;
  };

  // forceNotify: show the notification even though the tab is in front (the "Test" button).
  const start = ({ name, roomId, forceNotify = false }) => {
    stop();
    const prefs = loadAlertPrefs(env.storage);
    const state = {
      timers: [],
      originalTitle: env.document.title,
      titleChanged: false,
      vibrating: false,
      ringtone: null,
      notification: null,
    };
    const who = name || "Someone";

    if (prefs.vibrate && typeof env.navigator?.vibrate === "function") {
      const buzz = () => env.navigator.vibrate(VIBRATION_PATTERN);
      buzz();
      state.vibrating = true;
      state.timers.push(env.setInterval(buzz, VIBRATION_EVERY_MS));
    }

    if (prefs.sound) {
      state.ringtone = createRingtone(env.AudioContext, env);
      state.ringtone.start();
    }

    if (prefs.title) {
      let on = false;
      state.titleChanged = true;
      const flip = () => {
        on = !on;
        env.document.title = on ? `📞 Incoming call: ${who}` : state.originalTitle;
      };
      flip();
      state.timers.push(env.setInterval(flip, TITLE_EVERY_MS));
    }

    if (prefs.notify && canNotify() && (forceNotify || away())) {
      state.notification = show("Incoming call", {
        body: `${who} is calling you`,
        tag: `call-${roomId ?? "x"}`,
        requireInteraction: true,
      });
    }

    ringing = state;
  };

  const quiet = (title, body, tag) => {
    const prefs = loadAlertPrefs(env.storage);
    if (!prefs.notify || !canNotify() || !away()) return;
    show(title, { body, tag });
  };

  return {
    start,
    stop,
    isRinging: () => ringing !== null,
    notifyMissed: (name) => quiet("Missed call", `Missed call from ${name || "someone"}`, `missed-${name}`),
    notifyMessage: (name, text) =>
      quiet(`Message from ${name || "your contact"}`, String(text ?? "").slice(0, 120), `chat-${name}`),
  };
};

// The one used by the app. It connects to the browser only when it is first used.
let shared = null;
const getShared = () => (shared ??= createCallAlerter());
export const callAlerts = {
  start: (...args) => getShared().start(...args),
  stop: () => getShared().stop(),
  isRinging: () => getShared().isRinging(),
  notifyMissed: (...args) => getShared().notifyMissed(...args),
  notifyMessage: (...args) => getShared().notifyMessage(...args),
};

// For the Settings page: ask the browser for permission (must come from a click).
export const requestNotificationPermission = async (NotificationClass = window.Notification) => {
  if (!NotificationClass) return "unsupported";
  if (NotificationClass.permission !== "default") return NotificationClass.permission;
  try {
    return await NotificationClass.requestPermission();
  } catch {
    return "denied";
  }
};