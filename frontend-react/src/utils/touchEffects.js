// Shared constants and helpers for reactions and the "get attention" wave.
// Apple's emoji where the device has them, otherwise Noto (loaded from Google Fonts).
export const EMOJI_FONT =
  '"Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
export const REACTIONS = ["👍", "❤️", "👏", "😂", "🙏"];

export const REACTION_MIN_GAP_MS = 300; // sender: at most ~3 reactions a second
export const REACTION_LIFETIME_MS = 2600;
export const MAX_VISIBLE_REACTIONS = 12;

export const ATTENTION_COOLDOWN_MS = 5000; // sender: one wave every 5 s
export const ATTENTION_ACCEPT_GAP_MS = 3000; // receiver ignores waves closer together than this
export const ATTENTION_LIFETIME_MS = 5000;

// Two soft notes. Silent if the browser blocks audio; the visual cue still shows.
export const playChime = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.16;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
    setTimeout(() => ctx.close?.(), 900);
  } catch {
    /* audio blocked: the visual cue is enough */
  }
};