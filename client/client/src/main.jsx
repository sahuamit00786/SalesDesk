import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { store } from '@/app/store'
import App from '@/App.jsx'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import 'react-phone-number-input/style.css'
import './index.css'
import {
  AUTH_STORAGE_KEY,
  readAuthFromStorage,
  setCredentials,
  logout,
} from '@/features/auth/authSlice'

window.addEventListener('storage', (e) => {
  if (e.key !== AUTH_STORAGE_KEY) return
  if (e.newValue == null) {
    store.dispatch(logout())
    return
  }
  const next = readAuthFromStorage()
  if (next.accessToken && next.refreshToken) {
    store.dispatch(
      setCredentials({
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        user: next.user,
      }),
    )
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ErrorBoundary fallbackMessage="The app hit an unexpected error. Refresh to continue; if it keeps happening, contact support.">
          <App />
        </ErrorBoundary>
        {/* aria-live region for screen-reader toast announcements */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" id="toast-announcer" />
        <Toaster
          position="top-right"
          toastOptions={{ duration: 4000 }}
          containerProps={{ 'aria-label': 'Notifications' }}
        />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
