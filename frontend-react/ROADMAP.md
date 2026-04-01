# SignBridge Frontend Integration Roadmap

## Goal
Integrate this frontend module into your existing SignBridge system (Backend module + Signaling Node module + separate AI module) with minimal rework and clear handoff contracts.

This roadmap is based on a codebase skim of the current frontend implementation.

## Current State Snapshot
The frontend is visually complete and route-complete, but parts of the runtime flow are still scaffolded.

What is already wired:
- Auth pages and protected routes.
- API service layer (`axios`) with token interceptor.
- Sidebar data fetch from contacts/history APIs.
- Call UI shell (remote frame, local PiP, controls, translation overlay).

What is still placeholder/mock:
- Call initiation in dashboard is mocked (does not call backend).
- Call page creates a dummy `MediaStream` instead of real WebRTC stream.
- Remote stream is never set.
- Incoming call modal exists but is not mounted by app flow.
- Translation service call exists but is not connected to live events.
- Settings page controls are static (no persistence/device enumeration).

## Module Integration Map
Use this as your target architecture:

1. Frontend <-> Backend module (HTTP REST)
- Authentication
- Contacts
- Call lifecycle metadata
- Call history
- Optional translation persistence

2. Frontend <-> Signaling node module (WebSocket)
- Offer/answer exchange
- ICE candidates
- Incoming call events
- Call ended/failed events
- Presence (optional)

3. Frontend <-> AI module (through backend or direct gateway)
- Real-time translation text stream
- Optional historical translation POST

## Phase 1: Environment and Configuration

### 1.1 Create real env file
Use `.env.example` as baseline, then create `.env.local` (or environment-specific files).

Recommended keys:
- `VITE_API_BASE_URL=https://<backend-domain>/api`
- `VITE_SIGNALING_WS_URL=wss://<signaling-domain>/ws`
- `VITE_AI_BASE_URL=https://<ai-gateway-or-backend-proxy>`
- `VITE_ENABLE_TRANSLATION=true|false`
- `VITE_ENABLE_HAND_TRACKING=true|false`
- `VITE_ENV=development|staging|production`

Note:
- `VITE_ENABLE_TRANSLATION`, `VITE_ENABLE_HAND_TRACKING`, and `VITE_ENV` exist in `.env.example` but are currently unused in app code.

### 1.2 Remove base URL duplication
There is a config mismatch risk now:
- `src/utils/constants.js` defines `API_BASE_URL` using env.
- `src/services/api.js` hardcodes `http://localhost:8080/api`.

Action:
- Make `src/services/api.js` consume `API_BASE_URL` (or `import.meta.env.VITE_API_BASE_URL`) so all environments work without code edits.

## Phase 2: Backend API Contract Alignment

### 2.1 Confirm auth response schema
Frontend expects:
- Login/Register response containing `user` and `token`.

Needed endpoints:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

### 2.2 Confirm call and dashboard endpoints
Frontend already calls:
- `POST /calls/initiate`
- `POST /calls/:id/answer`
- `POST /calls/:id/reject`
- `POST /calls/:id/end`
- `GET /contacts`
- `GET /calls/history`
- `POST /calls/:id/translation`

Standardize response shapes for:
- Contact list items (`id`, `name`, `status` at minimum)
- Call history items (`id`, `contactName`, `date`, `duration`)
- Call initiate/answer payload (`callId`, peer/callee data as needed)

### 2.3 CORS and auth transport
Backend must allow the frontend origin(s):
- Local dev origin (Vite default)
- Staging/prod frontend domains

Include auth header support for:
- `Authorization: Bearer <token>`

## Phase 3: Replace Frontend Placeholders

### 3.1 Dashboard call initiation
Replace mock in `src/pages/DashboardPage.jsx`:
- Current behavior: local `startCall()` with fake data.
- Target behavior:
  - Call `callService.initiate(contactId)`.
  - Store backend response in `CallContext` (real `callId`, peer metadata).
  - Trigger signaling session start.
  - Navigate to call page only after successful initiation.

### 3.2 Call page media bootstrap
Replace mock in `src/pages/CallPage.jsx`:
- Current behavior: `new MediaStream()` placeholder.
- Target behavior:
  - `navigator.mediaDevices.getUserMedia({ video, audio })` for local stream.
  - Attach remote stream from RTCPeerConnection `ontrack`.
  - Stop tracks and close peer connection on unmount/end.

### 3.3 Control bar to real media tracks
In `src/components/video/ControlBar.jsx` + `CallContext`:
- Current behavior: toggles booleans only.
- Target behavior:
  - Toggle actual `MediaStreamTrack.enabled` for audio/video tracks.
  - Keep booleans as UI reflection of actual track state.

### 3.4 Incoming call flow
`src/pages/IncomingCallModal.jsx` exists but is not integrated.

Target:
- Mount incoming modal globally (App-level or dashboard-level).
- Open modal on signaling event (`incoming-call`).
- Accept path:
  - `callService.answer(callId)`
  - proceed with WebRTC answer + route to call page
- Reject path:
  - `callService.reject(callId)`

### 3.5 Translation data path
Current state:
- Overlay reads `translationText` from `CallContext`.
- `callService.sendTranslation` exists but unused.

Target options:
- Real-time: subscribe to AI stream event and call `updateTranslation(text)`.
- Persistence/audit: optional debounce and POST to `/calls/:id/translation`.

### 3.6 Settings persistence and device lists
`src/pages/SettingsPage.jsx` controls are static.

Target:
- Enumerate media devices (`enumerateDevices`).
- Save selected device IDs in user profile/settings endpoint.
- Apply selected devices in media constraints for future calls.

## Phase 4: Add Signaling Service Layer
Create a dedicated service (suggested `src/services/signalingService.js`).

Responsibilities:
- Connect/reconnect WebSocket using `VITE_SIGNALING_WS_URL`.
- Authenticate socket session (token or signed ticket).
- Emit/listen for events:
  - `offer`
  - `answer`
  - `ice-candidate`
  - `incoming-call`
  - `call-ended`
  - `user-joined` / `user-left` (optional)
- Expose clean methods used by `CallContext`.

Do not embed socket logic inside page components; keep it in service + context orchestration.

## Phase 5: Refactor CallContext into Orchestrator
Current `CallContext` is UI state only. Upgrade it to coordinate call runtime.

Add state:
- `callId`
- `localStream`
- `remoteStream`
- `connectionState`
- `incomingCall`
- `devicePrefs`

Add actions:
- `initiateCall(contactId)`
- `acceptIncomingCall(callId)`
- `rejectIncomingCall(callId)`
- `endActiveCall()`
- `setTranslationText(text)`
- `toggleMicTrack()` / `toggleCameraTrack()`

This keeps pages thin and makes integration testable.

## Phase 6: Security and Production Hardening

1. Token storage strategy
- Current: localStorage.
- If your system policy requires, migrate to secure httpOnly cookie flow.

2. Unauthorized handling
- Current `api.js` force redirects via `window.location.href = '/login'`.
- Keep or centralize through router-aware auth reset logic.

3. Rate limiting and abuse control
- Protect auth and call endpoints.
- Protect signaling connection spam.

4. Transport security
- Use HTTPS/WSS only outside local dev.

## Phase 7: Testing and Validation

### 7.1 Integration test matrix
- Signup/login/logout happy and failure paths.
- Contacts/history load with valid and expired token.
- Outgoing call flow end-to-end.
- Incoming call accept/reject flow.
- Media permission denied flow.
- Network disconnect/reconnect during active call.
- Translation enabled/disabled with AI stream.

### 7.2 Multi-environment smoke
- Local (all modules local)
- Staging (real domains + TLS)
- Production

### 7.3 Browser/device validation
- Desktop Chrome/Firefox/Edge/Safari.
- Mobile browsers for camera/mic + PiP behavior.

## Suggested Execution Order (Practical)

1. Env cleanup + API base URL fix.
2. Backend contract lock (payload schemas).
3. Signaling service skeleton + WebSocket auth.
4. Replace dashboard and call page mock flows.
5. Integrate incoming call modal and answer/reject.
6. Wire translation stream to overlay.
7. Persist settings/device preferences.
8. Full QA + staging rollout.

## Quick Checklist
- [ ] `.env.local` created with real URLs.
- [ ] `src/services/api.js` reads env base URL.
- [ ] `DashboardPage` uses `callService.initiate` (not mock).
- [ ] `CallPage` uses real `getUserMedia` + peer remote stream.
- [ ] WebSocket signaling service implemented and connected.
- [ ] `IncomingCallModal` mounted and event-driven.
- [ ] `CallContext` upgraded from UI-state to runtime orchestrator.
- [ ] Translation stream updates `translationText` in real time.
- [ ] Settings page persists device and translation prefs.
- [ ] End-to-end call flow verified across two clients.

## Known Integration Gaps Found During Skim
- API base URL duplication (`constants.js` vs `api.js` hardcoded).
- Feature flags in `.env.example` are not consumed.
- Incoming call modal not wired in route tree.
- Mock media/call setup still present in dashboard and call pages.
- Translation POST service exists but no caller path in UI.

## Done Definition
The frontend is considered fully integrated when:
- All API and signaling URLs are environment-driven.
- No mock call/media logic remains.
- Calls are established via signaling + WebRTC in both directions.
- Translation overlay receives live data from your AI pipeline.
- Settings and auth behavior match your backend policies.
- End-to-end tests pass in staging with real services.
