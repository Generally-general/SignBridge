# SignBridge Quick Reference Card

## 🚀 Quick Start (2 Minutes)

```bash
cd c:\Users\Hp\Desktop\signbridge
npm install
npm run dev
# Open http://localhost:5173
```

## 📁 Key Files to Know

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main app & routing |
| `src/context/AuthContext.jsx` | Authentication state |
| `src/context/CallContext.jsx` | Call state management |
| `src/pages/DashboardPage.jsx` | Main dashboard |
| `src/pages/CallPage.jsx` | Video call interface |
| `src/services/api.js` | Axios setup |
| `src/services/authService.js` | Auth API calls |
| `src/services/callService.js` | Call API calls |

## 🎨 Main Colors

```
Background:  slate-900   (#0f172a)
Secondary:   indigo-900  (#312e81)
Primary:     cyan-400    (#22d3ee)
Danger:      red-500     (#ef4444)
```

## 🧩 Most Used Hooks

```jsx
// Authentication
const { user, login, logout, isAuthenticated } = useAuth();

// Call state
const { activeCall, endCall, translationEnabled, toggleTranslation } = useCall();

// Dragging
const { position, handleMouseDown } = useDraggable({ x: 0, y: 0 });
```

## 🔧 Most Used Components

```jsx
<Button variant="primary|secondary|danger" size="sm|md|lg" />
<Card className="...">Content</Card>
<Input label="..." error={error} onChange={...} />
<Alert type="info|success|error|warning" message="..." />
<Modal isOpen={true} onClose={...} title="...">
<VideoFrame stream={mediaStream} isLocal={true} />
<LocalVideoPiP stream={localStream} onEndCall={...} />
```

## 🔌 API Base URL

```javascript
http://localhost:8080/api
```

## 📞 Key API Endpoints

```
POST /auth/register       - Sign up
POST /auth/login          - Sign in
POST /calls/initiate      - Start call
POST /calls/:id/answer    - Accept call
POST /calls/:id/end       - End call
GET  /contacts            - Get contacts
```

## 🎯 Page Routes

```
/login              - Login page
/signup             - Signup page
/                   - Dashboard (protected)
/call               - Call interface (protected)
/settings           - Settings (protected)
```

## 💾 localStorage Keys

```
signbridge_token    - Auth token
signbridge_user     - User data
```

## 🎬 Component Hierarchy

```
App
├─ LoginPage
├─ SignupPage
└─ ProtectedRoute
  ├─ DashboardPage
  │  ├─ Header
  │  └─ Sidebar
  ├─ CallPage
  │  ├─ VideoFrame (remote)
  │  └─ LocalVideoPiP
  │     ├─ VideoFrame (local)
  │     ├─ SpatialTouchLayer
  │     └─ ControlBar
  └─ SettingsPage
```

## 🔄 Data Flow

```
User Action
    ↓
Component (Hook/State)
    ↓
Service (API Call)
    ↓
Backend (Process)
    ↓
Response
    ↓
Update State/Context
    ↓
Re-render Component
```

## ✨ Styling Pattern

```jsx
// Button with Tailwind
<button className="bg-cyan-400 text-slate-900 px-4 py-2 rounded-lg hover:bg-cyan-300">
  Click me
</button>

// Glassmorphism Card
<div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
  Content
</div>

// Responsive Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card>{item}</Card>)}
</div>
```

## 🎬 Animation Pattern

```jsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  whileHover={{ scale: 1.05 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

## ✅ Form Validation Pattern

```jsx
const [email, setEmail] = useState('');
const [errors, setErrors] = useState({});

const validateForm = () => {
  const newErrors = {};
  if (!validateEmail(email)) {
    newErrors.email = 'Invalid email';
  }
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  
  try {
    const result = await authService.login(email, password);
    login(result.user, result.token);
  } catch (error) {
    setError(getErrorMessage(error));
  }
};
```

## 🐛 Debugging Tips

```javascript
// Check user auth
console.log(localStorage.getItem('signbridge_user'));

// Check token
console.log(localStorage.getItem('signbridge_token'));

// Clear auth (reset state)
localStorage.removeItem('signbridge_user');
localStorage.removeItem('signbridge_token');

// Monitor API calls
// Open DevTools → Network tab → filter "api"

// Check React state
// Install React DevTools browser extension
```

## 📦 npm Scripts

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

## 🎨 Adding New Page

1. Create component in `src/pages/NewPage.jsx`
2. Add route in `src/App.jsx`:
```jsx
<Route path="/newpage" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />
```
3. Add navigation link in Header/Sidebar

## 🔌 Adding New API Call

1. Add method to `src/services/callService.js`:
```javascript
export const myNewCall = async (data) => {
  const response = await api.post('/my/endpoint', data);
  return response.data;
};
```
2. Use in component:
```jsx
const result = await callService.myNewCall(data);
```

## 🎯 Adding New Component

1. Create in `src/components/ui/NewComponent.jsx`
2. Export component:
```jsx
export const NewComponent = ({ children, ...props }) => {
  return <div {...props}>{children}</div>;
};
```
3. Import and use in pages/components

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Check import path and file exists |
| Tailwind classes not working | Ensure file in `content` in `tailwind.config.js` |
| API 404 error | Check backend is running at `http://localhost:8080` |
| CORS error | Configure CORS in backend |
| Hot reload not working | Restart dev server (`Ctrl+C`, `npm run dev`) |
| Token keeps expiring | Check token expiry time in backend |

## 📚 Documentation Files

- `README.md` - Project overview
- `GETTING_STARTED.md` - Setup guide
- `DEVELOPMENT.md` - Detailed guide
- `COMPONENT_API.md` - Component reference
- `PROJECT_COMPLETION_SUMMARY.md` - What's included

## 🔑 Environment Variables

Create `.env.local`:
```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_ENABLE_TRANSLATION=true
```

## 📱 Responsive Breakpoints

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

## ⌨️ Keyboard Shortcuts

```
F12             - Open DevTools
Ctrl+Shift+K    - Open Console
Ctrl+Shift+I    - Inspect Element
Ctrl+Shift+E    - Switch to DevTools Inspector
```

## 🎓 Learning Resources

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion)
- [React Router](https://reactrouter.com)

## 💬 Getting Help

1. Check relevant `.md` documentation
2. Search in `DEVELOPMENT.md`
3. Look at similar component examples
4. Check browser console for errors
5. Check DevTools Network tab for API issues

## 🎯 Performance Tips

- Use React DevTools Profiler
- Check Lighthouse scores
- Monitor Network tab for large files
- Use lazy loading for routes
- Memoize expensive components
- Avoid unnecessary re-renders

## 🔐 Security Reminders

- Never commit `.env.local` to git
- Always validate inputs server-side
- Use HTTPS in production
- Keep dependencies updated
- Use secure password hashing
- Implement rate limiting
- Use CSRF protection

---

**Quick Tip:** Bookmark the docs files for quick reference! 📚

**Last Updated:** March 25, 2026
