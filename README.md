# SignBridge

Real-time video calling with live sign language translation, built for the Deaf and Hard-of-Hearing community. Two people video call like normal — one signs, MediaPipe hand landmarks stream out over a lightweight socket connection, an AI service classifies the gesture and corrects it into a natural sentence, and the translated text appears as a live overlay on the other person's screen.

## Why landmarks, not video, for translation

Instead of running gesture recognition on raw video frames, SignBridge extracts hand landmarks (21 points per hand) in the browser and streams only those — a few KB per gesture window instead of a second video stream. This keeps the AI pipeline usable on low-bandwidth connections where a video-analysis approach would struggle.

## Architecture

Four services, each in its own folder:

signer's browser (MediaPipe landmarks)
→ socket "metadata-stream" → signaling-node
→ buffers frames per call room, debounces on motion-stop
→ HTTP POST /predict → ai-engine-python
gesture.py → detected word (angle/normalized-distance based classification)
grammar.py → rule-based ISL-order correction, capped word history
llm.py → optional local LLM refinement (Ollama), silent fallback
emotion.py → emotion tag (stub)
← { word, sentence, emotion }
→ socket "translation-result" (to the other participant only)
→ socket "own-translation-result" (back to the signer, for their own history log)


- **`frontend-react/`** — React + Vite UI. Auth, contacts, call screen, WebRTC peer connection management, MediaPipe hand tracking, translation overlay, in-call chat, call history.
- **`signaling-node/`** — Node.js + Socket.IO. WebRTC offer/answer/ICE relay, call room management, landmark buffering + debounce, orchestrates calls to the AI service, relays chat and camera-status events.
- **`backend-java/`** — Spring Boot + JWT. User auth, contact listing, call history persistence (grouped per call, with peer name).
- **`ai-engine-python/`** — FastAPI. Gesture classification, grammar correction, optional LLM refinement, emotion stub.

## Features

- JWT-authenticated accounts, contact list (all registered users) with search.
- Peer-to-peer WebRTC video calling — mic/camera toggle, camera-off placeholder, secure/P2P status indicator.
- Real-time hand landmark streaming and AI gesture classification (16-gesture vocabulary currently).
- Rule-based ISL-order grammar correction, with optional local LLM (Ollama) refinement and automatic fallback if unavailable.
- Live translation overlay — shown only to the person *receiving* the sign, never echoed back to the signer.
- In-call text chat.
- Call history grouped per call (not per translated phrase), expandable to see each translated line from that call, with a Clear option.
- STUN + TURN (public fallback) ICE configuration for cross-network connectivity.
- Dark, GitHub-AMOLED-style design system across the app (see Design System section below).

## Design system

Single primary blue (`#2563EB`) with success/warning/danger semantic tokens, near-black AMOLED background/surface tokens, no gradients, no heavy shadows, solid-primary-only buttons. Tokens live in `frontend-react/src/index.css` (`:root` CSS variables) and `frontend-react/tailwind.config.js`. Shared primitives: `Button`, `Card`, `Input`, `Alert`, `Badge`, `Skeleton`, `Modal` in `frontend-react/src/components/ui/`.

## Prerequisites

- Node.js 18+ (required — `signaling-node` uses the global `fetch` API)
- Java 17+, Maven
- Python 3.11
- A relational database reachable by the backend (SQL Server/MySQL depending on your `application.properties`)
- (Optional) [Ollama](https://ollama.com) running locally with a `phi3` model pulled, for LLM-based grammar refinement — the app works without it, falling back to rule-based grammar correction only.

## Setup

### 1. AI Engine
```bash
cd ai-engine-python
pip install -r requirements.txt --break-system-packages
uvicorn app.main:app --reload --port 8000
```

### 2. Signaling Server
```bash
cd signaling-node
npm install
```
Create `signaling-node/.env`:

AI_SERVICE_URL=http://localhost:8000

```bash
npm run dev
```

### 3. Backend
Configure your database connection and JWT secret via environment variables (see `backend-java/src/main/resources/application.properties` — do not commit real secrets).
```bash
cd backend-java
./mvnw spring-boot:run
```

### 4. Frontend
```bash
cd frontend-react
npm install
```
Create `frontend-react/.env.local`:

VITE_API_BASE_URL=http://localhost:8080/api
VITE_SIGNALING_WS_URL=http://localhost:5000
VITE_ENABLE_TRANSLATION=true
VITE_ENABLE_HAND_TRACKING=true

```bash
npm run dev
```

## Running across two physical devices

Camera/mic access requires a secure context, so cross-device testing needs HTTPS on the frontend:

1. Find your machine's LAN IP (`ipconfig` / `ifconfig`).
2. Set `VITE_API_BASE_URL` and `VITE_SIGNALING_WS_URL` in `.env.local` to that LAN IP instead of `localhost`.
3. `vite.config.js` already has `host: true` and `https: true` (via `@vitejs/plugin-basic-ssl`) — run `npm run dev`, then open `https://<LAN_IP>:5173` on both devices, accepting the self-signed certificate warning on each.
4. Ensure `signaling-node`'s and `backend-java`'s CORS configs allow the LAN origin (already configured with wildcard LAN patterns for local development — see `signaling-node/src/index.js` and `backend-java/.../security/SecurityConfig.java`).
5. Both devices must be on the same network.

## Known limitations / open items

- Gesture vocabulary is currently 16 hardcoded gestures (`ai-engine-python/app/gesture.py`), classified via normalized joint-angle and distance thresholds rather than a trained model — accurate for a demo vocabulary, not a general ISL recognition system.
- Grammar correction (`grammar.py`) handles simple SOV-style reordering; it is not a full ISL grammar model.
- Emotion detection (`emotion.py`) is currently a stub.
- `wordSequence` used for sentence-building is capped per call room but shared across both participants if both sign in the same call — turns aren't currently separated by speaker in the sentence-building step itself (only in overlay delivery, which is correctly one-directional).
- LLM refinement depends on a locally running Ollama instance; the app degrades gracefully (rule-based grammar only) if it isn't available.
- TURN fallback uses a free public relay (Open Relay Project) — suitable for development/demo, not production-scale reliability.