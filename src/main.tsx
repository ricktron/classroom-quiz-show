import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app/App'
import './styles/global.css'

// Register the service worker. `autoUpdate` means a new deployment activates on
// the next navigation/refresh; we also refresh once when a new SW takes control
// so the app shell never gets stuck indefinitely stale. See README (PWA).
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    // Periodically check for a newer app shell while the tab stays open.
    if (registration) {
      setInterval(
        () => {
          registration.update().catch(() => {
            /* offline / transient — ignore */
          })
        },
        60 * 60 * 1000,
      )
    }
  },
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
