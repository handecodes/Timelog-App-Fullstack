# Frontend to TimelogAPI Integration

This guide explains how the frontend connects to the TimelogAPI backend hosted on Azure.

## Setup

### 1. Configure API URL

The frontend uses environment variables to configure the API endpoint.

**Development (`.env.development`):**
```
VITE_API_URL=http://localhost:5000
```

**Production (`.env.production`):**
```
VITE_API_URL=https://your-azure-timelogapi-url.azurewebsites.net
```

Replace `your-azure-timelogapi-url` with your actual Azure TimelogAPI URL.

### 2. Install Dependencies

```bash
cd frontend
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` with the dev proxy routing `/api` calls to your local backend.

### 4. Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder that calls your Azure TimelogAPI endpoint.

## API Module

The `src/scripts/api.js` module provides a complete client for the TimelogAPI:

### Authentication
```javascript
import { login, register, logout, setAuthToken } from './api.js';

// Login
const response = await login('user@example.com', 'password');
setAuthToken(response.token);

// Register
await register('user@example.com', 'password', 'Display Name');

// Logout
await logout();
```

### TimeLogs
```javascript
import { 
  getTimeLogs, 
  getTimeLog, 
  createTimeLog, 
  updateTimeLog, 
  deleteTimeLog 
} from './api.js';

// Get all time logs (with optional pagination)
const logs = await getTimeLogs({ pageNumber: 1, pageSize: 10 });

// Get a specific time log
const log = await getTimeLog(123);

// Create a new time log
const newLog = await createTimeLog({
  name: 'Project Work',
  description: 'Worked on feature X',
  startTime: '2026-06-10T10:00:00Z',
  endTime: '2026-06-10T12:00:00Z'
});

// Update a time log
await updateTimeLog(123, {
  name: 'Updated Name',
  description: 'Updated description'
});

// Delete a time log
await deleteTimeLog(123);
```

### Categories
```javascript
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from './api.js';

// Get all categories
const categories = await getCategories();

// Create a category
await createCategory('Work', '#FF5733');

// Update a category
await updateCategory(1, 'Personal', '#3357FF');

// Delete a category
await deleteCategory(1);
```

### SavedContent
```javascript
import { 
  getSavedContent, 
  createSavedContent, 
  updateSavedContent, 
  deleteSavedContent 
} from './api.js';

// Get saved content
const content = await getSavedContent({ pageNumber: 1 });

// Create saved content
await createSavedContent({
  title: 'My Note',
  content: 'Note content here'
});

// Update saved content
await updateSavedContent(1, {
  title: 'Updated Title',
  content: 'Updated content'
});

// Delete saved content
await deleteSavedContent(1);
```

## LocalStorage Sync

The `src/scripts/localStorage.js` module now handles both local storage and backend synchronization:

```javascript
import { syncQueue } from './localStorage.js';

// When user logs in, sync any queued time logs
await syncQueue();
```

### How It Works

1. **Offline Support**: Time logs are always saved to localStorage first
2. **Auto-Sync**: If authenticated, new entries are automatically synced to the backend
3. **Sync Queue**: Failed syncs are stored in a queue for retry
4. **Manual Sync**: Call `syncQueue()` after login to push queued entries

## CORS Configuration

The backend CORS must allow your frontend origin. Update `Exstensions/CorsExstension.cs` in the TimelogAPI:

```csharp
// For development
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalhost", builder =>
    {
        builder.WithOrigins("http://localhost:5173", "http://localhost:5000")
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials();
    });
});

// For production
// Add your deployed frontend URL
```

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Base URL for TimelogAPI | `https://your-app.azurewebsites.net` |

These are automatically picked up from `.env.development` or `.env.production` based on the build mode.

## Troubleshooting

### 401 Unauthorized
- Check if your auth token is being set correctly after login
- Verify JWT configuration in TimelogAPI Program.cs

### CORS Errors
- Ensure backend CORS policy includes your frontend origin
- Check browser console for exact error message

### API Not Responding
- Verify `VITE_API_URL` is correct
- For development, ensure backend is running on `http://localhost:5000`
- Check network tab in browser DevTools

### Sync Queue Issues
- Check localStorage for `time_log_sync_queue` key
- Clear queue manually if stuck: `localStorage.removeItem('time_log_sync_queue')`

## Next Steps

1. Update frontend components to use API functions instead of localStorage-only
2. Implement login/register UI and call `login()` / `register()` APIs
3. Update timer.js to call `createTimeLog()` after stopping
4. Add sync UI feedback (loading spinners, success messages)
5. Test with your Azure TimelogAPI deployment
