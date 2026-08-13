import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app/App'
import { isDesktopRuntime } from './runtime/cqsRuntime'
import './styles/global.css'

// Register the service worker on the web/PWA build only. The desktop shell
// already ships local files over `cqs://app` and must not require a service
// worker or GitHub Pages. See ADR-021.
if (!isDesktopRuntime()) {
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
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
