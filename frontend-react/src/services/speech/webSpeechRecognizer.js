// Speech-to-text provider backed by the browser's Web Speech API.
//
// Provider interface (any other provider, e.g. a server-side Whisper one, must match it):
//   isSupported(): boolean
//   start({ lang, onInterim(text), onFinal(text), onStatus(status), onError(err) }): boolean
//   stop(): void      stop listening, letting a pending final result arrive
//   destroy(): void   stop immediately and drop all callbacks
// status: "starting" | "listening" | "stopped"
// err:    { code, message, fatal }

const defaultGetCtor = () =>
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

const FATAL_MESSAGES = {
  "not-allowed": "Microphone or speech permission was denied.",
  "service-not-allowed": "The browser's speech service is not allowed on this page.",
  "audio-capture": "No microphone was found.",
  "language-not-supported": "This language is not supported by the browser's speech service.",
};

export class WebSpeechRecognizer {
  constructor({
    getCtor = defaultGetCtor,
    restartBaseMs = 250,
    restartMaxMs = 4000,
    maxQuickFailures = 5,
    healthySessionMs = 3000,
    duplicateWindowMs = 2000,
    now = () => Date.now(),
  } = {}) {
    this._getCtor = getCtor;
    this._restartBaseMs = restartBaseMs;
    this._restartMaxMs = restartMaxMs;
    this._maxQuickFailures = maxQuickFailures;
    this._healthySessionMs = healthySessionMs;
    this._duplicateWindowMs = duplicateWindowMs;
    this._now = now;

    this._rec = null;
    this._active = false;
    this._opts = null;
    this._quickFailures = 0;
    this._startedAt = 0;
    this._restartTimer = null;
    this._lastInterim = "";
    this._lastFinal = "";
    this._lastFinalAt = 0;
  }

  isSupported() {
    return !!this._getCtor();
  }

  start({ lang = "en-IN", onInterim, onFinal, onStatus, onError } = {}) {
    const Ctor = this._getCtor();
    if (!Ctor) {
      onError?.({
        code: "unsupported",
        message: "Speech-to-text isn't supported in this browser. Use Chrome or Edge.",
        fatal: true,
      });
      return false;
    }
    this.destroy();
    this._opts = { lang, onInterim, onFinal, onStatus, onError };
    this._active = true;
    this._quickFailures = 0;
    this._lastInterim = "";
    this._lastFinal = "";
    this._begin(Ctor);
    return true;
  }

  stop() {
    this._active = false;
    this._clearRestart();
    try {
      this._rec?.stop();
    } catch {
      /* already stopped */
    }
  }

  destroy() {
    this._active = false;
    this._clearRestart();
    const rec = this._rec;
    this._rec = null;
    if (rec) {
      rec.onstart = rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    }
    this._opts = null;
  }

  // ---- internals ------------------------------------------------------
  _clearRestart() {
    if (this._restartTimer) {
      clearTimeout(this._restartTimer);
      this._restartTimer = null;
    }
  }

  _status(s) {
    this._opts?.onStatus?.(s);
  }

  _begin(Ctor = this._getCtor()) {
    if (!this._active || !Ctor) return;
    const rec = new Ctor();
    rec.lang = this._opts.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // ignore events from an instance that has been replaced
    const current = () => rec === this._rec;
    rec.onstart = () => current() && this._status("listening");
    rec.onresult = (e) => current() && this._handleResult(e);
    rec.onerror = (e) => current() && this._handleError(e);
    rec.onend = () => current() && this._handleEnd();

    this._rec = rec;
    this._startedAt = this._now();
    this._status("starting");
    try {
      rec.start();
    } catch {
      // InvalidStateError: a previous session is still shutting down
      this._scheduleRestart();
    }
  }

  _handleResult(e) {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i];
      const text = (result[0]?.transcript || "").trim();
      if (!text) continue;
      if (result.isFinal) {
        this._emitFinal(text);
      } else {
        interim += (interim ? " " : "") + text;
      }
    }
    if (interim && interim !== this._lastInterim) {
      this._lastInterim = interim;
      this._opts?.onInterim?.(interim);
    }
  }

  _emitFinal(text) {
    const t = this._now();
    // Some mobile browsers re-deliver the same final result; drop exact repeats.
    if (text === this._lastFinal && t - this._lastFinalAt < this._duplicateWindowMs) return;
    this._lastFinal = text;
    this._lastFinalAt = t;
    this._lastInterim = "";
    this._opts?.onFinal?.(text);
  }

  _handleError(e) {
    const code = e?.error || "unknown";
    if (code === "no-speech" || code === "aborted") return; // benign; onend will follow

    if (FATAL_MESSAGES[code]) {
      this._fail({ code, message: FATAL_MESSAGES[code], fatal: true });
      return;
    }
    // network and anything else: report, then let onend retry with backoff
    this._opts?.onError?.({
      code,
      message:
        code === "network"
          ? "The speech service could not be reached."
          : `Speech recognition error (${code}).`,
      fatal: false,
    });
  }

  _fail(err) {
    this._active = false;
    this._clearRestart();
    const opts = this._opts;
    opts?.onError?.(err);
    opts?.onStatus?.("stopped");
  }

  _handleEnd() {
    if (!this._active) {
      this._status("stopped");
      return;
    }
    const lifetime = this._now() - this._startedAt;
    if (lifetime >= this._healthySessionMs) {
      this._quickFailures = 0; // a normal end of a healthy session (silence timeout etc.)
    } else {
      this._quickFailures += 1;
    }
    this._scheduleRestart();
  }

  _scheduleRestart() {
    if (!this._active) return;
    if (this._quickFailures >= this._maxQuickFailures) {
      this._fail({
        code: "unstable",
        message: "Speech recognition keeps stopping. Check the microphone and connection.",
        fatal: true,
      });
      return;
    }
    const delay = Math.min(
      this._restartMaxMs,
      this._restartBaseMs * 2 ** Math.max(0, this._quickFailures - 1),
    );
    this._clearRestart();
    this._restartTimer = setTimeout(() => {
      this._restartTimer = null;
      this._begin();
    }, this._quickFailures === 0 ? 50 : delay);
  }
}