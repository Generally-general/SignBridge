import React, { useEffect, useRef, useState } from "react";
import {
  P,
  FACE_PARTS,
  FACE_CHIN,
  FACE_SIDE_A,
  FACE_SIDE_B,
} from "../../utils/skeletonCodec";

const BONES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];
const HAND_COLORS = ["#38bdf8", "#c084fc"];
const BODY_COLOR = "#94a3b8";
const STALE_MS = 600; // hands vanish if no frame arrives for this long
const POSE_STALE_MS = 900; // the body is sent less often
const SMOOTH = 0.5; // 0 = frozen, 1 = no smoothing
const POSE_SMOOTH = 0.35; // body frames arrive about 9 times a second: smooth more
const FACE_STALE_MS = 900;
const FACE_SMOOTH = 0.5; // face frames arrive about 8 times a second; lips must stay responsive
const FACE_COLOR = "#e2e8f0";
const LIP_COLOR = "#fb7185";
const MIN_VISIBILITY = 0.4;

const cloneHands = (hands) => hands.map((h) => h.map((p) => [p[0], p[1]]));
const clonePose = (pose) => pose.map((p) => [p[0], p[1], p[2]]);
const seen = (p) => p && p[2] >= MIN_VISIBILITY;
const clonePts = (pts) => pts.map((p) => [p[0], p[1]]);

// Draws the other person's hands, and their head, shoulders and arms when a body pose was sent,
// from the data-channel frames in framesRef.
export const SkeletonCanvas = ({ framesRef, statsRef, showStats = true }) => {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [rate, setRate] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let shownHands = [];
    let shownPose = null;
    let shownFace = null;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(wrap.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const draw = () => {
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      const f = framesRef.current;
      const now = performance.now();
      const handsFresh = f && now - f.at < STALE_MS;
      const targetHands = handsFresh ? f.hands : [];
      const targetPose =
        f && f.pose && now - f.poseAt < POSE_STALE_MS ? f.pose : null;

      if (shownHands.length !== targetHands.length)
        shownHands = cloneHands(targetHands);
      else
        shownHands.forEach((hand, hi) =>
          hand.forEach((p, i) => {
            p[0] += (targetHands[hi][i][0] - p[0]) * SMOOTH;
            p[1] += (targetHands[hi][i][1] - p[1]) * SMOOTH;
          }),
        );

      const targetFace =
        f && f.face && now - f.faceAt < FACE_STALE_MS ? f.face : null;
      if (!targetFace) shownFace = null;
      else if (!shownFace) shownFace = clonePts(targetFace);
      else
        shownFace.forEach((p, i) => {
          p[0] += (targetFace[i][0] - p[0]) * FACE_SMOOTH;
          p[1] += (targetFace[i][1] - p[1]) * FACE_SMOOTH;
        });

      if (!targetPose) shownPose = null;
      else if (!shownPose) shownPose = clonePose(targetPose);
      else
        shownPose.forEach((p, i) => {
          p[0] += (targetPose[i][0] - p[0]) * POSE_SMOOTH;
          p[1] += (targetPose[i][1] - p[1]) * POSE_SMOOTH;
          p[2] = targetPose[i][2];
        });

      ctx.clearRect(0, 0, W, H);
      // Map the sender's frame (aspect ratio ar) into a letterboxed rectangle.
      const ar = f?.ar > 0 ? f.ar : 4 / 3;
      let bw = W;
      let bh = W / ar;
      if (bh > H) {
        bh = H;
        bw = H * ar;
      }
      const ox = (W - bw) / 2;
      const oy = (H - bh) / 2;
      const X = (p) => ox + p[0] * bw;
      const Y = (p) => oy + p[1] * bh;
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + 0.5, oy + 0.5, bw - 1, bh - 1);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // ---- body: head, neck, shoulders, arms ----
      if (shownPose) {
        const b = shownPose;
        const line = (a, c) => {
          if (!seen(b[a]) || !seen(b[c])) return;
          ctx.beginPath();
          ctx.moveTo(X(b[a]), Y(b[a]));
          ctx.lineTo(X(b[c]), Y(b[c]));
          ctx.stroke();
        };
        ctx.strokeStyle = BODY_COLOR;
        ctx.lineWidth = Math.max(3, bw / 110);
        line(P.L_SHOULDER, P.R_SHOULDER);
        line(P.L_SHOULDER, P.L_ELBOW);
        line(P.L_ELBOW, P.L_WRIST);
        line(P.R_SHOULDER, P.R_ELBOW);
        line(P.R_ELBOW, P.R_WRIST);

        // head: a circle sized from the ears, else from the shoulders
        const nose = shownFace ? null : seen(b[P.NOSE]) ? b[P.NOSE] : null;
        let cx = null;
        let cy = null;
        let r = 0;
        if (!shownFace && seen(b[P.L_EAR]) && seen(b[P.R_EAR])) {
          cx = (X(b[P.L_EAR]) + X(b[P.R_EAR])) / 2;
          cy = (Y(b[P.L_EAR]) + Y(b[P.R_EAR])) / 2;
          r =
            Math.hypot(
              X(b[P.L_EAR]) - X(b[P.R_EAR]),
              Y(b[P.L_EAR]) - Y(b[P.R_EAR]),
            ) * 0.62;
        } else if (nose) {
          cx = X(nose);
          cy = Y(nose);
          r =
            seen(b[P.L_SHOULDER]) && seen(b[P.R_SHOULDER])
              ? Math.hypot(
                  X(b[P.L_SHOULDER]) - X(b[P.R_SHOULDER]),
                  Y(b[P.L_SHOULDER]) - Y(b[P.R_SHOULDER]),
                ) * 0.3
              : bh * 0.07;
        }
        if (cx !== null && r > 2) {
          ctx.lineWidth = Math.max(2, bw / 200);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          // neck
          if (seen(b[P.L_SHOULDER]) && seen(b[P.R_SHOULDER])) {
            const mx = (X(b[P.L_SHOULDER]) + X(b[P.R_SHOULDER])) / 2;
            const my = (Y(b[P.L_SHOULDER]) + Y(b[P.R_SHOULDER])) / 2;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(cx, cy + r);
            ctx.stroke();
          }
          // eyes, nose and mouth
          ctx.fillStyle = "#e2e8f0";
          const dot = (p, size) => {
            if (!seen(p)) return;
            ctx.beginPath();
            ctx.arc(X(p), Y(p), size, 0, Math.PI * 2);
            ctx.fill();
          };
          const small = Math.max(2, r * 0.09);
          dot(b[P.L_EYE], small);
          dot(b[P.R_EYE], small);
          dot(b[P.NOSE], small * 1.2);
          if (seen(b[P.MOUTH_L]) && seen(b[P.MOUTH_R])) {
            ctx.lineWidth = Math.max(2, r * 0.07);
            ctx.beginPath();
            ctx.moveTo(X(b[P.MOUTH_L]), Y(b[P.MOUTH_L]));
            ctx.lineTo(X(b[P.MOUTH_R]), Y(b[P.MOUTH_R]));
            ctx.stroke();
          }
        }

        if (shownFace && seen(b[P.L_SHOULDER]) && seen(b[P.R_SHOULDER])) {
          const chin = shownFace[FACE_CHIN];
          ctx.lineWidth = Math.max(2, bw / 200);
          ctx.beginPath();
          ctx.moveTo(
            (X(b[P.L_SHOULDER]) + X(b[P.R_SHOULDER])) / 2,
            (Y(b[P.L_SHOULDER]) + Y(b[P.R_SHOULDER])) / 2,
          );
          ctx.lineTo(X(chin), Y(chin));
          ctx.stroke();
        }

        ctx.fillStyle = BODY_COLOR;
        [P.L_SHOULDER, P.R_SHOULDER, P.L_ELBOW, P.R_ELBOW].forEach((i) => {
          if (!seen(b[i])) return;
          ctx.beginPath();
          ctx.arc(X(b[i]), Y(b[i]), Math.max(3, bw / 110), 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // ---- face: smooth outline, eyes with pupils, brows, lips, nose ----
      if (shownFace) {
        const fc = shownFace;
        const faceW = Math.hypot(
          X(fc[FACE_SIDE_A]) - X(fc[FACE_SIDE_B]),
          Y(fc[FACE_SIDE_A]) - Y(fc[FACE_SIDE_B]),
        );
        // Joins a group of face points into one smooth curve (closed loops or open lines).
        const trace = ([from, to, closed]) => {
          const n = to - from;
          const pt = (i) => fc[from + (((i % n) + n) % n)];
          const mx = (a, b) => (X(a) + X(b)) / 2;
          const my = (a, b) => (Y(a) + Y(b)) / 2;
          ctx.beginPath();
          if (closed) {
            ctx.moveTo(mx(pt(0), pt(1)), my(pt(0), pt(1)));
            for (let i = 1; i <= n; i++)
              ctx.quadraticCurveTo(
                X(pt(i)),
                Y(pt(i)),
                mx(pt(i), pt(i + 1)),
                my(pt(i), pt(i + 1)),
              );
            ctx.closePath();
          } else {
            ctx.moveTo(X(pt(0)), Y(pt(0)));
            for (let i = 1; i < n - 1; i++)
              ctx.quadraticCurveTo(
                X(pt(i)),
                Y(pt(i)),
                mx(pt(i), pt(i + 1)),
                my(pt(i), pt(i + 1)),
              );
            ctx.lineTo(X(pt(n - 1)), Y(pt(n - 1)));
          }
        };
        const thin = Math.max(1.25, faceW / 80);
        const shape = (part, fill, stroke, width) => {
          trace(part);
          if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
          }
          if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = width;
            ctx.stroke();
          }
        };
        shape(
          FACE_PARTS.OVAL,
          "rgba(148,163,184,0.10)",
          BODY_COLOR,
          Math.max(2, faceW / 55),
        );
        shape(FACE_PARTS.NOSE_BRIDGE, null, "rgba(226,232,240,0.55)", thin);
        shape(FACE_PARTS.NOSE_BASE, null, FACE_COLOR, thin);
        shape(FACE_PARTS.BROW_A, FACE_COLOR, FACE_COLOR, thin * 0.6);
        shape(FACE_PARTS.BROW_B, FACE_COLOR, FACE_COLOR, thin * 0.6);
        // eyes: outline plus a pupil that disappears when the eye closes
        for (const eye of [FACE_PARTS.EYE_A, FACE_PARTS.EYE_B]) {
          shape(eye, "rgba(226,232,240,0.16)", FACE_COLOR, thin);
          let x0 = Infinity;
          let x1 = -Infinity;
          let y0 = Infinity;
          let y1 = -Infinity;
          for (let i = eye[0]; i < eye[1]; i++) {
            x0 = Math.min(x0, X(fc[i]));
            x1 = Math.max(x1, X(fc[i]));
            y0 = Math.min(y0, Y(fc[i]));
            y1 = Math.max(y1, Y(fc[i]));
          }
          const ew = x1 - x0;
          const eh = y1 - y0;
          if (eh > ew * 0.14) {
            ctx.fillStyle = FACE_COLOR;
            ctx.beginPath();
            ctx.arc(
              (x0 + x1) / 2,
              (y0 + y1) / 2,
              Math.min(eh * 0.5, ew * 0.21),
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        shape(
          FACE_PARTS.LIPS_OUTER,
          "rgba(251,113,133,0.35)",
          LIP_COLOR,
          thin * 1.3,
        );
        shape(FACE_PARTS.LIPS_INNER, "#0b1020", LIP_COLOR, thin);
      }

      // ---- hands, drawn over the body ----
      shownHands.forEach((hand, hi) => {
        ctx.strokeStyle = HAND_COLORS[hi % HAND_COLORS.length];
        ctx.lineWidth = Math.max(2, bw / 160);
        ctx.beginPath();
        for (const [a, c] of BONES) {
          ctx.moveTo(X(hand[a]), Y(hand[a]));
          ctx.lineTo(X(hand[c]), Y(hand[c]));
        }
        ctx.stroke();
        ctx.fillStyle = "#fff";
        const r = Math.max(2.5, bw / 150);
        for (const p of hand) {
          ctx.beginPath();
          ctx.arc(X(p), Y(p), r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // Received data rate, sampled once a second.
    let last = statsRef?.current ? { ...statsRef.current } : null;
    const timer = setInterval(() => {
      const s = statsRef?.current;
      if (!s || !last) return;
      setRate({
        kbps: ((s.recvBytes - last.recvBytes) / 1024).toFixed(1),
        fps: s.recvFrames - last.recvFrames,
      });
      last = { ...s };
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      ro.disconnect();
    };
  }, [framesRef, statsRef]);

  return (
    <div ref={wrapRef} className="absolute inset-0 bg-[#0b1020]">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-2 left-2 px-2 py-1 rounded-standard bg-black/50 text-[10px] uppercase tracking-widest text-white/80 pointer-events-none">
        Skeleton view
        {showStats && rate ? ` · ${rate.kbps} KB/s · ${rate.fps} fps` : ""}
      </div>
    </div>
  );
};
