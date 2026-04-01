# Development Guide

## Project Overview

SignBridge is a production-grade real-time sign language video calling application. This guide covers development setup, architecture, and best practices.

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd signbridge

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Development Server

```bash
npm run dev
```

Features:
- Hot Module Replacement (HMR)
- Fast Vite build
- Tailwind CSS processing
- Auto-reload on file changes

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory, optimized for production.

## Project Architecture

### Directory Structure

```
src/
├── assets/                    # Static files, images, etc.
├── components/
│   ├── ui/                   # Reusable UI components (Button, Card, Input, etc.)
│   ├── layout/               # Layout components (Header, Sidebar, LocalVideoPiP)
│   └── video/                # Video components (VideoFrame, TranslationOverlay, etc.)
├── context/
│   ├── AuthContext.jsx       # Authentication state management
│   └── CallContext.jsx       # Call state management
├── pages/
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── DashboardPage.jsx
│   ├── CallPage.jsx
│   ├── SettingsPage.jsx
│   └── IncomingCallModal.jsx
├── services/
│   ├── api.js               # Axios instance with interceptors
│   ├── authService.js       # Auth API calls
│   └── callService.js       # Call API calls
├── hooks/
│   ├── useAuth.js           # Auth context hook
│   ├── useCall.js           # Call context hook
│   └── useDraggable.js      # Draggable element hook
├── utils/
│   ├── constants.js         # App-wide constants
│   ├── formatters.js        # Date/time formatters
│   ├── validators.js        # Input validation
│   └── logger.js            # Logging utility
├── App.jsx                  # Main app component
├── main.jsx                 # Entry point
└── index.css                # Global styles
```

## Core Concepts

### State Management

We use React Context API for global state:

**AuthContext:**
- Manages user authentication
- Stores user data and token
- Handles login/logout
- Persists session in localStorage

**CallContext:**
- Manages active call state
- Tracks translation settings
- Manages mic/camera toggles
- Stores call metadata

### Custom Hooks

```jsx
// useAuth - Access authentication
const { user, isAuthenticated, login, logout } = useAuth();

// useCall - Access call state
const { activeCall, translationEnabled, toggleTranslation } = useCall();

// useDraggable - Make elements draggable
const { position, isDragging, handleMouseDown } = useDraggable();
```

### Component Patterns

**UI Components:**
- Small, reusable, presentational components
- Accept props for customization
- Use Tailwind CSS only (no inline styles)
- Include Framer Motion animations

Example:
```jsx
export const Button = ({ children, variant = 'primary', ...props }) => {
  return (
    <motion.button
      className={`${variants[variant]} px-4 py-2 rounded`}
      whileHover={{ scale: 1.05 }}
      {...props}
    >
      {children}
    </motion.button>
  );
};
```

**Layout Components:**
- Combine UI components to build pages
- Handle layout logic
- Connect to context/hooks
- Manage data fetching

Example:
```jsx
export const Header = () => {
  const { user, logout } = useAuth();
  return (
    <header className="bg-slate-900 p-4">
      <div>{user.name}</div>
      <Button onClick={logout}>Logout</Button>
    </header>
  );
};
```

**Page Components:**
- Represent full routes
- Compose multiple layout components
- Handle page-specific logic
- Manage page-level state

## API Integration

### Axios Instance

Located in `src/services/api.js`:

```javascript
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});

// Automatically adds auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('signbridge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Service Layer

Never call APIs directly in components. Use service files:

```javascript
// ❌ WRONG - In a component
const response = await axios.post('/auth/login', data);

// ✅ CORRECT - Use service
import { authService } from '../services/authService';
const response = await authService.login(email, password);
```

## Authentication Flow

1. User navigates to `/signup` or `/login`
2. Form is submitted with credentials
3. Service layer calls backend API
4. On success:
   - User data is stored in context
   - Token is saved to localStorage
   - User is redirected to dashboard
5. On failure:
   - Error message is displayed
   - User can retry

## Protected Routes

Routes are protected with `ProtectedRoute` component:

```jsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

If user is not authenticated, they're redirected to login.

## Video Calling Setup

### LocalVideoPiP Component

Displays user's local camera in a draggable floating window:

```jsx
<LocalVideoPiP 
  stream={localStream}  // MediaStream object
  onEndCall={handleEndCall}
/>
```

Features:
- Draggable positioning
- Control bar with buttons
- Spatial touch layer (canvas)
- Ready for WebRTC integration

### VideoFrame Component

Displays video streams:

```jsx
<VideoFrame 
  stream={remoteStream}  // MediaStream object
  isLocal={false}
  className="w-full h-full"
/>
```

### TranslationOverlay

Displays AI-generated translation text:

```jsx
<TranslationOverlay />
```

Requires `translationText` and `translationEnabled` from CallContext.

## Styling with Tailwind CSS

All styling uses Tailwind CSS:

```jsx
// ✅ CORRECT
<div className="bg-slate-900 text-white p-4 rounded-lg">
  Content
</div>

// ❌ WRONG - No inline styles
<div style={{ backgroundColor: '#0f172a', color: 'white' }}>
  Content
</div>
```

### Glassmorphism Pattern

```jsx
<div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
  Content
</div>
```

## Animations with Framer Motion

For smooth, performant animations:

```jsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

Common animations:
- `initial` - Starting state
- `animate` - Final state
- `exit` - State when removed
- `whileHover` - State on hover
- `whileTap` - State on click
- `transition` - Animation timing

## Form Handling

### Controlled Inputs

Always use controlled inputs:

```jsx
const [email, setEmail] = useState('');

<Input
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  label="Email"
/>
```

### Validation

Use validators from `src/utils/validators.js`:

```jsx
import { validateEmail, validatePassword } from '../utils/validators';

const errors = {};
if (!validateEmail(email)) {
  errors.email = 'Invalid email format';
}
```

## Error Handling

### Service Layer

```javascript
try {
  const data = await authService.login(email, password);
  // Handle success
} catch (error) {
  const message = getErrorMessage(error);
  setError(message);
}
```

### UI Layer

```jsx
{error && (
  <Alert
    type="error"
    message={error}
    onClose={() => setError(null)}
  />
)}
```

## Performance Optimization

### Code Splitting

Routes are automatically code-split with Vite.

### Memoization

Use React.memo for expensive components:

```jsx
const VideoFrame = React.memo(({ stream }) => {
  return <video srcObject={stream} />;
});
```

### Lazy Loading

Images and non-critical components:

```jsx
const HeavyComponent = React.lazy(() => import('./Heavy'));
```

## Testing

(To be implemented)

```bash
npm test
```

## Debugging

### Console Logging

Use the logger utility:

```javascript
import log from '../utils/logger';

log.info('User logged in', { userId: 123 });
log.error('Failed to fetch contacts', error);
```

### React DevTools

Install React DevTools browser extension for debugging:
- Inspect component tree
- View/edit props and state
- Track re-renders

### Network Requests

Use browser DevTools Network tab to:
- Monitor API requests
- Check response payloads
- Debug authentication issues

## Best Practices

### Component Design

1. **Keep components small** - Single responsibility principle
2. **Use props effectively** - Make components reusable
3. **Avoid prop drilling** - Use context for global state
4. **Name components clearly** - `<ContactCard />` not `<Card />`

### State Management

1. **Use context for global state** - Auth, call state
2. **Use hooks for component state** - useState for local state
3. **Keep state close to where it's used**
4. **Minimize state updates** - Group related updates

### Performance

1. **Avoid unnecessary re-renders** - useCallback, useMemo
2. **Load images responsively** - Use appropriate sizes
3. **Lazy load routes** - Code splitting
4. **Debounce expensive operations** - Search, resize

### Code Quality

1. **Use meaningful names** - `isLoading` not `load`
2. **Add comments for complex logic**
3. **Follow ESLint rules** - Run `npm run lint`
4. **Keep functions pure** - No side effects
5. **Handle errors gracefully** - Show user-friendly messages

## Common Tasks

### Adding a New Page

1. Create component in `src/pages/`
2. Add route in `App.jsx`
3. Add navigation links if needed

### Adding a New API Call

1. Add method in `src/services/callService.js` or `authService.js`
2. Import service in component
3. Handle loading and error states
4. Use error utility `getErrorMessage()`

### Styling a Component

1. Use Tailwind classes
2. Follow naming conventions
3. Use Framer Motion for animations
4. Test on mobile and desktop

## Troubleshooting

### Hot Reload Not Working

```bash
# Restart dev server
npm run dev
```

### Tailwind Classes Not Applied

1. Check class names spelling
2. Ensure file is in `content` config in `tailwind.config.js`
3. Clear Vite cache: `rm -rf .vite`

### Authentication Fails

1. Check API is running at `http://localhost:8080`
2. Check token is stored in localStorage
3. Monitor network requests in DevTools
4. Check server error logs

### Video Not Displaying

1. Ensure stream is valid MediaStream object
2. Check browser permissions for camera/mic
3. Verify CORS settings on backend
4. Check browser console for errors

## Environment Variables

Create `.env.local` with:

```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_ENABLE_TRANSLATION=true
```

## Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion)
- [Axios Documentation](https://axios-http.com)

## Contributing

1. Create a feature branch
2. Make changes following best practices
3. Test thoroughly
4. Create pull request with description

## Support

For issues or questions, please open an issue on GitHub.
