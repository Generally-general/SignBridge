import { useEffect, useState } from "react";
import { POINTER_PREFS_EVENT, getPointerPrefs } from "../utils/pointerPrefs";

export const usePointerPrefs = () => {
  const [prefs, setPrefs] = useState(getPointerPrefs);
  useEffect(() => {
    const update = () => setPrefs(getPointerPrefs());
    window.addEventListener(POINTER_PREFS_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(POINTER_PREFS_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return prefs;
};