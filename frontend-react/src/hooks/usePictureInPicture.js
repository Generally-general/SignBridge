import { useEffect, useRef } from "react";

const getTarget = () =>
  document.querySelector('video[data-pip-target="true"]');

const svg = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const ICON = {
  hangup: svg(
    '<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.84.28 1.72.48 2.62.6a2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.6 2.62a2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" y1="2" x2="2" y2="22"/>',
  ),
  mic: svg(
    '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  ),
  micOff: svg(
    '<line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/>',
  ),
  cam: svg(
    '<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>',
  ),
  camOff: svg(
    '<path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><path d="m2 2 20 20"/>',
  ),
};

const BTN_CSS =
  "pointer-events:auto;width:44px;height:44px;border-radius:50%;border:0;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.5)";

// On = translucent dark button, off = white button (clear "muted" state).
const paintToggle = (btn, on, iconOn, iconOff, labelOn, labelOff) => {
  if (!btn) return;
  btn.innerHTML = on ? iconOn : iconOff;
  btn.title = on ? labelOn : labelOff;
  btn.setAttribute("aria-label", on ? labelOn : labelOff);
  btn.style.background = on ? "rgba(60,60,60,.9)" : "#fff";
  btn.style.color = on ? "#fff" : "#111";
};

export function usePictureInPicture({
  active,
  mainStream,
  localStream,
  cameraEnabled,
  micEnabled,
  toggleMic,
  toggleCamera,
  chatMessages,
  contactName,
  onEndCall,
}) {
  const mainRef = useRef(mainStream);
  const localRef = useRef(localStream);
  const camRef = useRef(cameraEnabled);
  const micRef = useRef(micEnabled);
  const micToggleRef = useRef(toggleMic);
  const camToggleRef = useRef(toggleCamera);
  const msgsRef = useRef(chatMessages);
  const nameRef = useRef(contactName);
  const endRef = useRef(onEndCall);
  const pipRef = useRef({
    win: null,
    localTile: null,
    micBtn: null,
    camBtn: null,
    toast: null,
    toastTimer: null,
    seen: 0,
  });
  mainRef.current = mainStream;
  localRef.current = localStream;
  camRef.current = cameraEnabled;
  micRef.current = micEnabled;
  micToggleRef.current = toggleMic;
  camToggleRef.current = toggleCamera;
  msgsRef.current = chatMessages;
  nameRef.current = contactName;
  endRef.current = onEndCall;

  // Keep the own-video tile and the two toggle buttons in step with the call state.
  useEffect(() => {
    const pip = pipRef.current;
    if (pip.localTile)
      pip.localTile.style.display = cameraEnabled ? "block" : "none";
    paintToggle(pip.camBtn, cameraEnabled, ICON.cam, ICON.camOff, "Turn camera off", "Turn camera on");
  }, [cameraEnabled]);

  useEffect(() => {
    const pip = pipRef.current;
    paintToggle(pip.micBtn, micEnabled, ICON.mic, ICON.micOff, "Mute", "Unmute");
  }, [micEnabled]);

  // Show a new message from the other person for a few seconds while the PiP window is open.
  useEffect(() => {
    const pip = pipRef.current;
    const total = chatMessages?.length || 0;
    if (!pip.win || !pip.toast) {
      pip.seen = total;
      return;
    }
    const fresh = (chatMessages || []).slice(pip.seen);
    pip.seen = total;
    const last = [...fresh].reverse().find((m) => !m.isOwn);
    if (!last) return;
    const t = pip.toast;
    t.textContent = "";
    const who = pip.win.document.createElement("b");
    who.textContent = (nameRef.current || "Message") + ": ";
    t.appendChild(who);
    t.appendChild(pip.win.document.createTextNode(String(last.message ?? "")));
    t.style.display = "block";
    clearTimeout(pip.toastTimer);
    pip.toastTimer = setTimeout(() => {
      if (pip.toast) pip.toast.style.display = "none";
    }, 6000);
  }, [chatMessages]);

  useEffect(() => {
    if (!active || !("mediaSession" in navigator)) return;
    const pip = pipRef.current;
    let autoEntered = false;

    const makeVideo = (win, stream, css) => {
      const v = win.document.createElement("video");
      v.autoplay = true;
      v.playsInline = true;
      v.muted = true; // the call tab keeps playing the audio; muting avoids doubling
      v.srcObject = stream;
      v.style.cssText = css;
      win.document.body.appendChild(v);
      v.play().catch(() => { });
      return v;
    };

    const makeButton = (win) => {
      const b = win.document.createElement("button");
      b.style.cssText = BTN_CSS;
      return b;
    };

    const enterDocumentPip = async () => {
      const main = mainRef.current;
      if (!main) return false;
      const win = await window.documentPictureInPicture.requestWindow({
        width: 480,
        height: 300,
      });
      win.document.body.style.cssText =
        "margin:0;background:#000;position:relative;overflow:hidden;width:100vw;height:100vh;font-family:system-ui,sans-serif";
      makeVideo(win, main, "width:100%;height:100%;object-fit:contain");

      if (localRef.current) {
        pip.localTile = makeVideo(
          win,
          localRef.current,
          "position:absolute;right:8px;bottom:64px;width:112px;aspect-ratio:4/3;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.35);transform:scaleX(-1)",
        );
        pip.localTile.style.display = camRef.current ? "block" : "none";
      }

      // Message toast (hidden until a message arrives).
      pip.toast = win.document.createElement("div");
      pip.toast.style.cssText =
        "display:none;position:absolute;left:8px;right:8px;top:8px;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.75);color:#fff;font-size:13px;line-height:1.3;max-height:72px;overflow:hidden;word-break:break-word";
      win.document.body.appendChild(pip.toast);
      pip.seen = msgsRef.current?.length || 0;

      // Control bar: mic, camera, hang up.
      const bar = win.document.createElement("div");
      bar.style.cssText =
        "position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:center;gap:12px;pointer-events:none";

      pip.micBtn = makeButton(win);
      pip.micBtn.onclick = () => micToggleRef.current?.();
      paintToggle(pip.micBtn, micRef.current, ICON.mic, ICON.micOff, "Mute", "Unmute");

      pip.camBtn = makeButton(win);
      pip.camBtn.onclick = () => camToggleRef.current?.();
      paintToggle(pip.camBtn, camRef.current, ICON.cam, ICON.camOff, "Turn camera off", "Turn camera on");

      const end = makeButton(win);
      end.title = "Hang up";
      end.setAttribute("aria-label", "Hang up");
      end.innerHTML = ICON.hangup;
      end.style.background = "#dc2626";
      end.style.color = "#fff";
      end.onclick = () => {
        win.close();
        endRef.current?.();
      };

      bar.append(pip.micBtn, pip.camBtn, end);
      win.document.body.appendChild(bar);

      pip.win = win;
      autoEntered = true;
      win.addEventListener(
        "pagehide",
        () => {
          clearTimeout(pip.toastTimer);
          pip.win = null;
          pip.localTile = null;
          pip.micBtn = null;
          pip.camBtn = null;
          pip.toast = null;
          autoEntered = false;
        },
        { once: true },
      );
      return true;
    };

    const enterVideoPip = async () => {
      const v = getTarget();
      if (!v || v.readyState < 2 || document.pictureInPictureElement) return;
      await v.requestPictureInPicture();
      autoEntered = true;
      v.addEventListener("leavepictureinpicture", () => (autoEntered = false), {
        once: true,
      });
    };

    const enter = async () => {
      if (pip.win || document.pictureInPictureElement) return;
      try {
        if (window.documentPictureInPicture && (await enterDocumentPip())) return;
        await enterVideoPip();
      } catch (e) {
        console.warn("Auto PiP failed:", e?.message);
        try { await enterVideoPip(); } catch {/* ignore */ }
      }
    };

    const onVisible = async () => {
      if (document.visibilityState !== "visible" || !autoEntered) return;
      autoEntered = false;
      if (pip.win) {
        pip.win.close();
      } else if (document.pictureInPictureElement) {
        try { await document.exitPictureInPicture(); } catch {/* ignore */ }
      }
    };

    try {
      navigator.mediaSession.setActionHandler("enterpictureinpicture", enter);
    } catch {
      return;
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      try { navigator.mediaSession.setActionHandler("enterpictureinpicture", null); } catch {/* ignore */ }
      pip.win?.close();
    };
  }, [active]);
}