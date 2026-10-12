const KEY_ENABLED = "signbridge_pointer_enabled";
const KEY_DWELL = "signbridge_pointer_dwell";
const EVENT = "signbridge:pointer-prefs";

const read = (key, fallback) => {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
};

export const getPointerPrefs = () => ({
  enabled: read(KEY_ENABLED, true),
  dwell: read(KEY_DWELL, false),
});

export const setPointerPref = (name, value) => {
  try {
    window.localStorage.setItem(name === "dwell" ? KEY_DWELL : KEY_ENABLED, value ? "1" : "0");
  } catch {
    /* private mode: the choice just is not remembered */
  }
  window.dispatchEvent(new Event(EVENT));
};

export const POINTER_PREFS_EVENT = EVENT;

export const POINTER_BISECT = (() => {
  try {
    return window.localStorage.getItem("signbridge_ptr_bisect") || "";
  } catch {
    return "";
  }
})();