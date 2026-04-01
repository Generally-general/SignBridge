# SignBridge Frontend

A production-grade real-time sign language video calling application built with React, Vite, and Tailwind CSS.

## Features

- 🎥 **HD Video Calling** - Crystal clear video for sign language communication
- 🤖 **AI Translation Overlay** - Real-time text display powered by AI
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🎨 **Modern UI** - Glassmorphism design with Framer Motion animations
- 🔐 **Secure Authentication** - Token-based user authentication
- 📞 **Contact Management** - Organize and manage your contacts
- 📊 **Call History** - Track all your calls
- ⚙️ **Settings Panel** - Customize your experience

## Tech Stack

- **React** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Router DOM** - Navigation
- **Lucide React** - Icons
- **Framer Motion** - Animations

## Project Structure

```
src/
├── assets/              # Static assets
├── components/
│   ├── ui/             # Reusable UI components
│   ├── layout/         # Layout components
│   └── video/          # Video-related components
├── context/            # React Context providers
├── pages/              # Page components
├── services/           # API services
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── App.jsx             # Main app component
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   ```
   VITE_API_BASE_URL=http://localhost:8080/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

## API Integration

The frontend connects to a backend API running at `http://localhost:8080/api`.

### Authentication Endpoints
- `POST /auth/register` - Create a new account
- `POST /auth/login` - Login to your account
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout

### Call Endpoints
- `POST /calls/initiate` - Start a new call
- `POST /calls/:id/answer` - Accept an incoming call
- `POST /calls/:id/reject` - Reject an incoming call
- `POST /calls/:id/end` - End an active call
- `GET /contacts` - Get list of contacts
- `GET /calls/history` - Get call history
- `POST /calls/:id/translation` - Send translation text

## Key Components

### Context Providers
- **AuthContext** - Manages user authentication state
- **CallContext** - Manages active call state and settings

### Custom Hooks
- **useAuth()** - Access authentication context
- **useCall()** - Access call context
- **useDraggable()** - Make elements draggable

### Pages
- **LoginPage** - User authentication
- **SignupPage** - New user registration
- **DashboardPage** - Main dashboard with contacts and call history
- **CallPage** - Active call interface
- **SettingsPage** - User settings

## Authentication Flow

1. User signs up or logs in
2. Credentials are sent to backend
3. Backend returns user data and token
4. Token and user data are stored in localStorage
5. Token is automatically added to all API requests
6. Session persists on page reload

## Development

### Code Standards
- Functional components only
- React Hooks for state management
- Tailwind CSS for styling (no inline styles)
- Meaningful component and variable names
- Small, reusable components

### Framer Motion Animations
- Fade-in animations on page load
- Scale animations on button hover/click
- Smooth transitions between states

### Local Video Features
- Draggable PiP (Picture-in-Picture) window
- Spatial touch layer (canvas) for future hand tracking
- Control bar with camera, mic, translation toggle
- Floating design for easy repositioning

## Ready for WebRTC Integration

The codebase is structured to easily integrate WebRTC for actual video calling:
- `VideoFrame` component is prepared for real streams
- `useCall()` hook manages call state
- Control bar supports mic/camera toggles
- API layer is ready for signaling

## Performance Optimizations

- Lazy loading of routes
- Memoized components where necessary
- Efficient state management with Context API
- Optimized re-renders

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

- WebRTC peer connection
- Three.js hand tracking integration
- Real-time translation API integration
- Group video calls
- Screen sharing
- Call recording
- End-to-end encryption

## License

MIT License - see LICENSE file for details

## Support

For issues, feature requests, or contributions, please open an issue on the GitHub repository.
