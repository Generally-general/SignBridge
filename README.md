# SignBridge

Real-time video calling with live sign language translation, built for the Deaf and Hard-of-Hearing community. Two people video call like normal. One signs, MediaPipe hand landmarks are extracted in the browser, an AI service turns them into a sentence, and the translation appears as a live overlay on the other person's screen.

## Why landmarks, not video

Gesture recognition does not run on video frames. The browser extracts 21 landmarks per hand and sends only those, a few KB per gesture window, so translation stays usable on weak connections.

## Architecture

```
signer's browser (MediaPipe landmarks)
  -> socket "metadata-stream" -> signaling-node
     buffers frames per call room, debounces on motion-stop
  -> HTTP POST /predict -> ai-engine-python
       gesture.py  detected word (angle / normalised-distance rules)
       grammar.py  rule-based ISL-order correction
       llm.py      optional local LLM refinement (Ollama), silent fallback
       emotion.py  emotion tag (stub)
  <- { word, sentence, emotion }
  -> "translation-result"      (other participant only)
  -> "own-translation-result"  (back to the signer's own log)
```

| Folder | Role |
|---|---|
| `frontend-react/` | React + Vite UI: auth, contacts, call screen, WebRTC, MediaPipe tracking, overlays, chat, history, settings |
| `signaling-node/` | Node.js + Socket.IO: WebRTC offer/answer/ICE relay, ringing and presence, landmark buffering, AI orchestration, chat and camera events, TURN credential issuing |
| `backend-java/` | Spring Boot + JWT: accounts, contacts, call history, sign cards, password reset email |
| `ai-engine-python/` | FastAPI: gesture classification, grammar correction, optional LLM refinement, emotion stub |

## Features

**Accounts and contacts**
- JWT accounts with signup, login, forgot/reset password by email, and change password.
- Contact requests the other person approves, plus search and live presence.
- **Sign card**: a personal shareable link and QR code (`/c/:token`) with a generated hand badge. Opening it lets someone send you a contact request, and you still approve. You can set the link's expiry (day, week, month or never) and its maximum uses, and you can revoke it.

**Calling**
- Peer-to-peer WebRTC 1-to-1 video with mic and camera toggles, camera-off placeholder, camera switch, screen share and connection status.
- Ringing, busy, offline and missed-call handling.
- STUN plus TURN (Cloudflare TURN credentials issued by the signaling server).
- In-call chat with unread badge and toasts.
- Call history grouped per call, with translated lines and call-time transcript.
- Live captions from speech (Web Speech API, consent-gated).

**Translation**
- Hand landmark streaming and AI gesture classification (see limitations).
- Rule-based ISL grammar correction, optional local LLM refinement, automatic fallback.
- Translation overlay shown only to the person receiving the sign.
- **Skeleton mode**: sends body/hand/face keypoints instead of video and draws them as a skeleton on the other side, for very low bandwidth.
- Network-quality monitoring with automatic suggestions to switch modes.

**Spatial touch (computers only, off on mobile)**
- **Hand pointer**: press **P** to point with your index finger as the cursor. A quick pinch clicks, a pinch-and-move over a scrollable area scrolls it, and over the small self-view it drags it (a quick pinch swaps the two videos). Optional dwell-to-click. **Esc** or **P** returns to signing. Dwell never presses End call.
- **Reactions and attention wave**: 👍 ❤️ 👏 😂 🙏 float over the other person's screen. A wave (the ✋ button, or an open hand swung side to side in pointer mode) shows them a pulsing banner with a chime.
- Both ride a dedicated reliable WebRTC data channel, so they work without extra server load.
- Pointer and wave settings live under Settings.

## Design system

Single primary blue (`#2563EB`), semantic success/warning/danger tokens, near-black AMOLED surfaces, no gradients. Tokens are in `frontend-react/src/index.css` and `frontend-react/tailwind.config.js`; shared primitives are in `frontend-react/src/components/ui/`.

## Prerequisites

- Node.js 18+ (the signaling server uses global `fetch`)
- Java 17+ and Maven
- Python 3.11
- A SQL database for the backend (Azure SQL in production; see `application.properties`)
- Optional: [Ollama](https://ollama.com) with a `phi3` model for LLM grammar refinement

## Setup

### 1. AI engine
```bash
cd ai-engine-python
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Backend
Set the environment variables below, then:
```bash
cd backend-java
./mvnw spring-boot:run
```

### 3. Signaling server
```bash
cd signaling-node
npm install
npm run dev
```

### 4. Frontend
```bash
cd frontend-react
npm install
npm run dev
```

## Configuration

Never commit real secrets. If a secret has ever been committed or shared, rotate it.

**backend-java** (environment variables)

| Variable | Purpose |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Database connection |
| `JWT_SECRET` | Signs access tokens (must match the signaling server) |
| `INTERNAL_API_KEY` | Shared secret for signaling -> backend calls |
| `CORS_ORIGINS`, `FRONTEND_URL` | Allowed origins and the link base used in emails and cards |
| `MAIL_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME`, `MAIL_DAILY_CAP` | Transactional email (password reset) |
| `PORT`, `SSL_ENABLED` | Server port and TLS toggle |

**signaling-node** (`.env`)

| Variable | Purpose |
|---|---|
| `PORT`, `NODE_ENV`, `CORS_ORIGINS` | Server basics |
| `JWT_SECRET`, `INTERNAL_API_KEY`, `BACKEND_URL` | Auth and backend calls |
| `AI_SERVICE_URL` | e.g. `http://localhost:8000` |
| `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN` | Cloudflare TURN credential generation |
| `RING_TIMEOUT_MS`, `RING_GRACE_MS`, `CALL_CHECK_TIMEOUT_MS`, `DISCONNECT_GRACE_MS`, `GLARE_RESEND_MS` | Optional call-timing tuning |

**frontend-react** (`.env.local`, see `.env.example`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL, e.g. `http://localhost:8080/api` |
| `VITE_SIGNALING_WS_URL` | Signaling server URL, e.g. `http://localhost:5000` |
| `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` | Optional static TURN fallback |

## Running on two physical devices

Camera and mic need a secure context, so cross-device testing needs HTTPS:

1. Find your LAN IP (`ipconfig` / `ifconfig`).
2. Point `VITE_API_BASE_URL` and `VITE_SIGNALING_WS_URL` at that IP.
3. `vite.config.js` serves HTTPS (`@vitejs/plugin-basic-ssl`). Open `https://<LAN_IP>:5173` on both devices and accept the certificate warning.
4. Make sure the backend and signaling CORS settings allow that origin.
5. Both devices need to reach the LAN IP.

## Deployment (current setup)

- Frontend: Cloudflare Pages
- Backend (Spring Boot), signaling (Node), AI engine (FastAPI): Render, free tier. Services sleep when idle, so the first request after a pause can take about a minute.
- Database: Azure SQL (allow the hosting provider's outbound IPs through the firewall)
- Email: Brevo
- TURN: Cloudflare TURN

## Controls reference

| Action | How |
|---|---|
| Toggle hand pointer | **P** (computers only) |
| Leave pointer mode | **Esc** or **P** |
| Click (pointer) | Quick pinch on a control |
| Scroll (pointer) | Pinch and move over the chat |
| Move self-view (pointer) | Pinch and move over the small video |
| Swap videos | Tap, or quick pinch in pointer mode |
| Reaction / wave | 😊 tray at the bottom right, or wave an open hand in pointer mode |

## Known limitations

- The gesture vocabulary is a small hardcoded set (`ai-engine-python/app/gesture.py`) classified by joint-angle and distance rules, not a trained model. It is fine for a demo vocabulary, not a general ISL recogniser.
- Grammar correction handles simple SOV-style reordering only.
- Emotion detection is a stub.
- The word history used to build sentences is capped per room and shared between participants if both sign.
- LLM refinement needs a local Ollama instance and falls back to rules without it.
- Hand tracking runs on the browser's main thread, which is heavy on low-end machines.
- Pointer and wave thresholds are tuned by hand on a few devices, not measured across cameras and lighting.
- Spatial touch is disabled on mobile by design.
- Free-tier hosting cold starts make the first request slow.

