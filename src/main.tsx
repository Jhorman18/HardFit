import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Service worker: al detectar una versión nueva se activa y recarga la app sola
// (evita seguir viendo el código viejo cacheado tras actualizar el APK).
// Al volver a primer plano revisa si hay actualización.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {})
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
