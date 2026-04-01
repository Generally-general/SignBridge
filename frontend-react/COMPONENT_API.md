# SignBridge Component API Reference

## UI Components

### Button
```jsx
import { Button } from '../components/ui/Button';

// Variants: primary, secondary, danger
// Sizes: sm, md, lg
// States: loading, disabled

<Button 
  variant="primary" 
  size="md"
  isLoading={loading}
  disabled={false}
  onClick={handleClick}
>
  Click me
</Button>
```

### Card
```jsx
import { Card } from '../components/ui/Card';

<Card className="max-w-md">
  <h2>Title</h2>
  <p>Content</p>
</Card>
```

### Input
```jsx
import { Input } from '../components/ui/Input';

<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  placeholder="you@example.com"
/>
```

### Alert
```jsx
import { Alert } from '../components/ui/Alert';

// Types: info, success, error, warning

<Alert 
  type="error" 
  message="Something went wrong"
  onClose={() => setError(null)}
/>
```

### Badge
```jsx
import { Badge } from '../components/ui/Badge';

// Variants: default, success, warning, error

<Badge variant="success">
  Online
</Badge>
```

### Modal
```jsx
import { Modal } from '../components/ui/Modal';

<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
>
  Are you sure?
</Modal>
```

### Skeleton
```jsx
import { Skeleton, SkeletonText } from '../components/ui/Skeleton';

// Loading placeholder
<Skeleton className="h-10 w-full mb-4" />

// Loading text with multiple lines
<SkeletonText lines={3} />
```

## Video Components

### VideoFrame
```jsx
import { VideoFrame } from '../components/video/VideoFrame';

<VideoFrame 
  stream={mediaStream}
  isLocal={false}
  className="w-full h-full"
  objectFit="cover"
/>
```

### SpatialTouchLayer
```jsx
import { SpatialTouchLayer } from '../components/video/SpatialTouchLayer';

const canvasRef = useRef(null);

<SpatialTouchLayer canvasRef={canvasRef} />
```

### TranslationOverlay
```jsx
import { TranslationOverlay } from '../components/video/TranslationOverlay';

// Uses CallContext internally
<TranslationOverlay />
```

### ControlBar
```jsx
import { ControlBar } from '../components/video/ControlBar';

<ControlBar onEndCall={handleEndCall} />
```

## Layout Components

### Header
```jsx
import { Header } from '../components/layout/Header';

// Auto-generates navigation buttons
<Header />
```

### Sidebar
```jsx
import { Sidebar } from '../components/layout/Sidebar';

<Sidebar onInitiateCall={(contactId) => startCall(contactId)} />
```

### LocalVideoPiP
```jsx
import { LocalVideoPiP } from '../components/layout/LocalVideoPiP';

<LocalVideoPiP 
  stream={localStream}
  onEndCall={handleEndCall}
/>
```

## Hooks

### useAuth
```jsx
import { useAuth } from '../hooks/useAuth';

const {
  user,              // { id, name, email }
  loading,           // boolean
  error,             // string | null
  isAuthenticated,   // boolean
  login,             // (userData, token) => void
  logout,            // () => void
  setAuthError,      // (message) => void
  clearError,        // () => void
} = useAuth();
```

### useCall
```jsx
import { useCall } from '../hooks/useCall';

const {
  activeCall,           // { id, contactName, ... } | null
  startCall,            // (callData) => void
  endCall,              // () => void
  translationEnabled,   // boolean
  toggleTranslation,    // () => void
  translationText,      // string
  updateTranslation,    // (text) => void
  micEnabled,           // boolean
  toggleMic,            // () => void
  cameraEnabled,        // boolean
  toggleCamera,         // () => void
} = useCall();
```

### useDraggable
```jsx
import { useDraggable } from '../hooks/useDraggable';

const containerRef = useRef(null);
const {
  position,         // { x: number, y: number }
  isDragging,       // boolean
  handleMouseDown,  // (e, ref) => void
} = useDraggable({ x: 0, y: 0 });

<div
  ref={containerRef}
  style={{ left: position.x, top: position.y }}
  onMouseDown={(e) => handleMouseDown(e, containerRef)}
  draggable
>
  Draggable content
</div>
```

## Services

### authService
```jsx
import { authService } from '../services/authService';

// Register new user
const { user, token } = await authService.register(name, email, password);

// Login
const { user, token } = await authService.login(email, password);

// Get current user
const user = await authService.getCurrentUser();

// Logout
await authService.logout();
```

### callService
```jsx
import { callService } from '../services/callService';

// Initiate call
const call = await callService.initiate(contactId);

// Answer call
const call = await callService.answer(callId);

// Reject call
await callService.reject(callId);

// End call
await callService.end(callId);

// Get contacts
const contacts = await callService.getContacts();

// Get call history
const history = await callService.getCallHistory();

// Send translation
const translation = await callService.sendTranslation(callId, text);
```

## Utilities

### validators
```jsx
import { 
  validateEmail,
  validatePassword,
  validateName,
  getErrorMessage 
} from '../utils/validators';

validateEmail('user@example.com');      // true/false
validatePassword('password123');        // true/false
validateName('John Doe');               // true/false
getErrorMessage(error);                 // string
```

### formatters
```jsx
import {
  formatTime,
  formatDate,
  formatDateTime
} from '../utils/formatters';

formatTime(3661);           // "1:01:01"
formatDate('2024-01-15');   // "Jan 15, 2024"
formatDateTime('2024-01-15T14:30:00'); // "Jan 15, 2:30 PM"
```

### logger
```jsx
import log from '../utils/logger';

log.info('Message', data);
log.success('Operation completed');
log.warn('Warning message');
log.error('Error occurred', error);
```

### constants
```jsx
import { 
  API_BASE_URL,
  AUTH_TOKEN_KEY,
  CALL_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from '../utils/constants';
```

## Custom Hooks Usage Examples

### Example 1: Protected Dashboard
```jsx
export const DashboardPage = () => {
  const { user } = useAuth();
  const { activeCall, startCall } = useCall();

  if (!user) return <Redirect to="/login" />;

  return (
    <>
      <Header />
      <div>Welcome, {user.name}</div>
    </>
  );
};
```

### Example 2: Call Component
```jsx
export const CallPage = () => {
  const { activeCall, endCall } = useCall();
  const navigate = useNavigate();

  const handleEndCall = () => {
    endCall();
    navigate('/');
  };

  return (
    <div>
      <VideoFrame stream={remoteStream} />
      <LocalVideoPiP stream={localStream} onEndCall={handleEndCall} />
    </div>
  );
};
```

### Example 3: Draggable Element
```jsx
export const DraggableWidget = () => {
  const containerRef = useRef(null);
  const { position, handleMouseDown } = useDraggable({
    x: 100,
    y: 100,
  });

  return (
    <motion.div
      ref={containerRef}
      style={{ position: 'fixed', left: position.x, top: position.y }}
      onMouseDown={(e) => handleMouseDown(e, containerRef)}
    >
      Drag me!
    </motion.div>
  );
};
```

## Form Patterns

### Controlled Form
```jsx
const [formData, setFormData] = useState({
  email: '',
  password: '',
});
const [errors, setErrors] = useState({});
const [loading, setLoading] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate
  const newErrors = validateForm(formData);
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  // Submit
  setLoading(true);
  try {
    const result = await apiService.submit(formData);
    // Success
  } catch (error) {
    setErrors({ submit: getErrorMessage(error) });
  } finally {
    setLoading(false);
  }
};

return (
  <form onSubmit={handleSubmit}>
    <Input
      value={formData.email}
      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      error={errors.email}
    />
    <Button isLoading={loading} type="submit">
      Submit
    </Button>
  </form>
);
```

## Context Patterns

### Using Auth Context
```jsx
const MyComponent = () => {
  const { user, login, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### Using Call Context
```jsx
const CallInterface = () => {
  const {
    activeCall,
    translationEnabled,
    toggleTranslation,
    micEnabled,
    toggleMic,
    endCall,
  } = useCall();

  return (
    <div>
      <button onClick={toggleMic}>
        {micEnabled ? 'Mute' : 'Unmute'}
      </button>
      <button onClick={toggleTranslation}>
        {translationEnabled ? 'Hide Translation' : 'Show Translation'}
      </button>
      <button onClick={endCall}>End Call</button>
    </div>
  );
};
```

## Styling Patterns

### Glassmorphism
```jsx
<div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
  Glass effect content
</div>
```

### Dark Theme
```jsx
<div className="bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
  Dark themed content
</div>
```

### Responsive Layout
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>{item}</Card>)}
</div>
```

### Animations with Framer Motion
```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Animated content
</motion.div>
```

## Common Patterns

### Loading State
```jsx
{loading ? <Skeleton /> : <Content />}
```

### Error Handling
```jsx
{error && (
  <Alert type="error" message={error} onClose={() => setError(null)} />
)}
```

### Empty State
```jsx
{items.length === 0 ? (
  <p className="text-white/50">No items found</p>
) : (
  items.map(item => <Item key={item.id} {...item} />)
)}
```

### Loading with Skeleton
```jsx
{loading ? (
  <SkeletonText lines={3} />
) : (
  <p>{content}</p>
)}
```

---

For more details, see individual component files in `src/components/`
