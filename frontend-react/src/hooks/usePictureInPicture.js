import { useEffect, useRef } from "react";

const getTarget = () =>
  document.querySelector('video[data-pip-target="true"]');

const HANGUP_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.84.28 1.72.48 2.62.6a2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.6 2.62a2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" y1="2" x2="2" y2="22"/></svg>';

export function usePictureInPicture(
  active,
  mainStream,
  localStream,
  cameraEnabled,
  onEndCall,
) {
  const mainRef = useRef(mainStream);
  const localRef = useRef(localStream);
  const camRef = useRef(cameraEnabled);
  const endRef = useRef(onEndCall);
  const pipRef = useRef({ win: null, localTile: null });
  mainRef.current = mainStream;
  localRef.current = localStream;
  camRef.current = cameraEnabled;
  endRef.current = onEndCall;

  // Show or hide your own tile while the PiP window is open.
  useEffect(() => {
    const tile = pipRef.current.localTile;
    if (tile) tile.style.display = cameraEnabled ? "block" : "none";
  }, [cameraEnabled]);

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
      v.play().catch(() => {});
      return v;
    };

    const enterDocumentPip = async () => {
      const main = mainRef.current;
      if (!main) return false;
      const win = await window.documentPictureInPicture.requestWindow({
        width: 480,
        height: 300,
      });
      win.document.body.style.cssText =
        "margin:0;background:#000;position:relative;overflow:hidden;width:100vw;height:100vh";
      makeVideo(win, main, "width:100%;height:100%;object-fit:contain");

      if (localRef.current) {
        pip.localTile = makeVideo(
          win,
          localRef.current,
          "position:absolute;right:8px;bottom:8px;width:112px;aspect-ratio:4/3;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.35);transform:scaleX(-1)",
        );
        pip.localTile.style.display = camRef.current ? "block" : "none";
      }

      const bar = win.document.createElement("div");
      bar.style.cssText =
        "position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:center;pointer-events:none";
      const btn = win.document.createElement("button");
      btn.title = "Hang up";
      btn.setAttribute("aria-label", "Hang up");
      btn.innerHTML = HANGUP_ICON;
      btn.style.cssText =
        "pointer-events:auto;width:44px;height:44px;border-radius:50%;border:0;background:#dc2626;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.5)";
      btn.onclick = () => {
        win.close();
        endRef.current?.();
      };
      bar.appendChild(btn);
      win.document.body.appendChild(bar);

      pip.win = win;
      autoEntered = true;
      win.addEventListener(
        "pagehide",
        () => {
          pip.win = null;
          pip.localTile = null;
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
        try { await enterVideoPip(); } catch {/* ignore */}
      }
    };

    const onVisible = async () => {
      if (document.visibilityState !== "visible" || !autoEntered) return;
      autoEntered = false;
      if (pip.win) {
        pip.win.close();
      } else if (document.pictureInPictureElement) {
        try { await document.exitPictureInPicture(); } catch {/* ignore */}
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
      try { navigator.mediaSession.setActionHandler("enterpictureinpicture", null); } catch {/* ignore */}
      pip.win?.close();
    };
  }, [active]);
}