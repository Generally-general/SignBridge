# SignBridge Project Report

## Executive Summary

SignBridge is currently a multi-module system with a fairly strong frontend shell, a working Java auth/history backend, a live Socket.IO signaling server, and an early-stage Python AI service. The product is not yet fully unified: the frontend, backend, signaling server, and AI engine are each partially complete, but some parts still behave like parallel prototypes rather than one integrated application.

The most mature user-facing part is the React frontend. The most complete service-side part is the Java backend for authentication, user listing, and gesture history. The real-time call path currently relies on the Node signaling server, while the Java backend also contains a separate STOMP/WebSocket signaling implementation that is not used by the React client. The Python AI engine is still prototype-grade.

## Current Architecture

### 1. Frontend React

The frontend is the main product shell. It includes login, signup, dashboard, call screen, settings, reusable UI components, WebRTC video UI, and MediaPipe-based hand detection hooks.

Main flow:

- `App.jsx` wraps the app in `AuthProvider` and `CallProvider`.
- Auth state is loaded from localStorage and controls protected routes.
- `DashboardPage` fetches contacts and history from the backend.
- `CallPage` renders the live call UI and starts sign detection.
- `CallContext` handles WebRTC peer setup and Socket.IO signaling.

Key files:

- [frontend-react/src/App.jsx](frontend-react/src/App.jsx)
- [frontend-react/src/context/AuthContext.jsx](frontend-react/src/context/AuthContext.jsx)
- [frontend-react/src/context/CallContext.jsx](frontend-react/src/context/CallContext.jsx)
- [frontend-react/src/pages/DashboardPage.jsx](frontend-react/src/pages/DashboardPage.jsx)
- [frontend-react/src/pages/CallPage.jsx](frontend-react/src/pages/CallPage.jsx)
- [frontend-react/src/hooks/useSignDetection.js](frontend-react/src/hooks/useSignDetection.js)

### 2. Java Backend

The Java backend provides user auth, JWT security, user search/listing, call history persistence, and a STOMP WebSocket signaling controller. It already has the core business data models and repositories, but it does not yet expose the full call REST surface expected by the frontend.

Main flow:

- Authentication is handled by `AuthController` and `AuthService`.
- JWT validation is enforced by `JwtAuthenticationFilter` and `SecurityConfig`.
- User search/listing is handled by `UserController` and `UserService`.
- Gesture history save/read is handled by `HistoryController` and `HistoryService`.
- A separate STOMP-based signaling path exists in `WebSocketConfig` and `SignalingController`.

Key files:

- [backend-java/src/main/java/com/signbridge/project/controller/AuthController.java](backend-java/src/main/java/com/signbridge/project/controller/AuthController.java)
- [backend-java/src/main/java/com/signbridge/project/controller/UserController.java](backend-java/src/main/java/com/signbridge/project/controller/UserController.java)
- [backend-java/src/main/java/com/signbridge/project/controller/HistoryController.java](backend-java/src/main/java/com/signbridge/project/controller/HistoryController.java)
- [backend-java/src/main/java/com/signbridge/project/controller/SignalingController.java](backend-java/src/main/java/com/signbridge/project/controller/SignalingController.java)
- [backend-java/src/main/java/com/signbridge/project/service/AuthService.java](backend-java/src/main/java/com/signbridge/project/service/AuthService.java)
- [backend-java/src/main/java/com/signbridge/project/service/UserService.java](backend-java/src/main/java/com/signbridge/project/service/UserService.java)
- [backend-java/src/main/java/com/signbridge/project/service/HistoryService.java](backend-java/src/main/java/com/signbridge/project/service/HistoryService.java)
- [backend-java/src/main/java/com/signbridge/project/security/SecurityConfig.java](backend-java/src/main/java/com/signbridge/project/security/SecurityConfig.java)

### 3. Node Signaling Server

This is the real-time layer the React client actually uses. It authenticates socket connections with JWT, joins each user to a personal room, and relays call setup messages, answers, ICE candidates, and metadata events.

Main flow:

- `index.js` creates the HTTP server and initializes Socket.IO.
- `authMiddleware.js` validates the JWT from the socket handshake.
- `roomHandler.js` routes `call-request`, `join-room`, `offer`, `answer`, `ice-candidate`, and `metadata-stream` events.

Key files:

- [signaling-node/src/index.js](signaling-node/src/index.js)
- [signaling-node/src/config/socket.js](signaling-node/src/config/socket.js)
- [signaling-node/src/middleware/authMiddleware.js](signaling-node/src/middleware/authMiddleware.js)
- [signaling-node/src/rooms/roomHandler.js](signaling-node/src/rooms/roomHandler.js)

### 4. Python AI Engine

This module is a separate FastAPI service intended for gesture classification, emotion detection, and text refinement through an LLM bridge. It has a working `/predict` endpoint, but it is still mostly a prototype and not yet fully integrated into the main app flow.

Main flow:

- `main.py` exposes `/` and `/predict`.
- `gesture.py` maps landmarks to simple gesture labels.
- `emotion.py` is a placeholder implementation.
- `llm.py` sends text refinement requests to a local LLM endpoint.

Key files:

- [ai-engine-python/app/main.py](ai-engine-python/app/main.py)
- [ai-engine-python/app/gesture.py](ai-engine-python/app/gesture.py)
- [ai-engine-python/app/emotion.py](ai-engine-python/app/emotion.py)
- [ai-engine-python/app/llm.py](ai-engine-python/app/llm.py)

## Module-by-Module Status

### Frontend React

Status: 80% complete

What is already built:

- Authentication UI and route protection.
- Dashboard with contacts and call history panels.
- Live call page with draggable local video PiP.
- Camera and mic toggles.
- Translation overlay shell.
- Incoming call modal.
- MediaPipe hands detection hook.

What is still incomplete:

- Session/token naming is inconsistent between auth storage and socket connection code.
- In-call chat is only UI shell.
- Settings page is static.
- Several labels and state names are inconsistent across components.
- The live call flow is not yet fully tied to backend call persistence.

### Java Backend

Status: 65% complete

What is already built:

- User registration and login.
- JWT generation and validation.
- Protected user listing.
- Gesture history save/read.
- Core entities and repositories.
- Security filters and CORS config.

What is still incomplete:

- Call REST endpoints expected by the frontend are not implemented.
- `CallService` is minimal and only persists an initiated call session.
- STOMP signaling exists but is not aligned with the Node socket client.
- Some implementation cleanup is needed, including deprecated usage and unused fields/imports.

### Node Signaling Server

Status: 85% complete

What is already built:

- Socket authentication.
- Personal rooms per user.
- Call request routing.
- Peer room join and WebRTC relay.
- Metadata broadcast for translation/landmark data.

What is still incomplete:

- No persistence layer for signaling/call lifecycle.
- No broader business logic beyond event forwarding.
- Needs to be clearly chosen as the single realtime path or replaced by the Java WebSocket layer.

### Python AI Engine

Status: 30% complete

What is already built:

- FastAPI app scaffold.
- Basic gesture detection utility.
- LLM text refinement wrapper.
- Predict endpoint returning word, sentence, and emotion fields.

What is still incomplete:

- Emotion detection is a placeholder.
- No production integration with frontend/backend.
- No clear runtime packaging, deployment, or orchestration with the rest of the system.

## Current Integration Problems

1. Auth token mismatch

   The auth context stores `signbridge_token`, but the socket layer reads `token`, and the login service also writes `token` and `user`. This can break both API requests and Socket.IO authentication.

2. Duplicate realtime systems

   The React client uses the Node Socket.IO server, while the Java backend also has a STOMP WebSocket signaling controller. Only one path should be the canonical realtime transport unless both are intentionally supported.

3. Call domain split

   The frontend expects call REST endpoints, but the backend mostly exposes auth, users, and history. The call lifecycle is only partially modeled.

4. UI data shape mismatch

   The frontend sometimes expects `user.name` or `activeCall.name`, while the backend returns `fullName`. This can lead to missing labels in the UI.

5. AI engine is not integrated

   The Python service exists, but the call UI currently does not consume `/predict` as part of the actual call workflow.

## What Is Left To Build For A Complete SignBridge

### Core Product Completion

- Unify auth token storage and reading.
- Make the frontend, backend, and signaling server use one consistent user/session model.
- Choose a single realtime architecture.
- Implement missing call REST endpoints or remove the unused frontend contract.
- Persist call sessions end-to-end.
- Wire translation history saving into live calls.

### AI Completion

- Replace the placeholder emotion detection.
- Connect gesture predictions to the live call flow.
- Decide whether the Python service is the source of truth for AI or only an auxiliary service.
- Add deployment/runtime wiring for the AI service.

### UX and Product Completion

- Implement real in-call chat.
- Implement real settings persistence.
- Add contact management actions.
- Add logout/session recovery consistency.
- Polish empty/error/loading states across the call flow.

### Reliability and Quality

- Fix backend deprecation warnings and cleanup issues.
- Add tests for auth, history, and call flows.
- Validate socket reconnect and room rejoin behavior.
- Ensure the app works with both page reload and call resume scenarios.

## Notable Current Issues

- `CallContext` reads `localStorage.getItem("token")`, while auth state is stored under `signbridge_token`.
- `Header` renders `user.name`, but the backend returns `fullName`.
- `DashboardPage` and `CallPage` use mixed naming for the call target and active call display fields.
- The backend `CallController` layer expected by the frontend is missing.
- The Python `EmotionDetector` is still a placeholder.

## Bottom Line

SignBridge is not a blank scaffold. It already has a substantial frontend, a functional authentication/data backend, a working Socket.IO signaling server, and a prototype AI service. The remaining work is mostly about integration, consistency, and finishing the business logic that connects those pieces into one production-ready app.